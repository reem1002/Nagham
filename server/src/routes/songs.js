import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import multer from 'multer';
import Song from '../models/Song.js';
import Playlist from '../models/Playlist.js';
import User from '../models/User.js';
import { AUDIO_DIR, COVER_DIR, env } from '../config/env.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { importAudioFile } from '../utils/importAudio.js';
import { findOrCreateArtist, findOrCreateAlbum } from '../utils/library.js';
import { looseRegex } from '../utils/text.js';
import { cleanupOrphans } from '../utils/cleanup.js';
import { removeAudio, storeCover } from '../utils/storage.js';

const router = Router();

const AUDIO_EXT = /\.(mp3|m4a|aac|ogg|opus|wav|flac|webm)$/i;

const audioUpload = multer({
  storage: multer.diskStorage({
    destination: AUDIO_DIR,
    filename: (req, file, cb) => cb(null, `tmp-${crypto.randomUUID()}${path.extname(file.originalname) || ''}`),
  }),
  limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 100 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype.startsWith('audio/') || AUDIO_EXT.test(file.originalname);
    cb(ok ? null : new HttpError(400, `Not an audio file: ${file.originalname}`), ok);
  },
});

const coverUpload = multer({
  storage: multer.diskStorage({
    destination: COVER_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

export const SONG_POPULATE = [
  { path: 'artist', select: 'name image' },
  { path: 'album', select: 'title cover year' },
];

const SORTS = {
  recent: { createdAt: -1 },
  title: { title: 1 },
  plays: { playCount: -1, lastPlayedAt: -1 },
  played: { lastPlayedAt: -1 },
  album: { album: 1, trackNo: 1, title: 1 },
};

// GET /api/songs?q=&artist=&album=&sort=recent|title|plays&page=&limit=
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { q, artist, album, genre, sort = 'recent' } = req.query;
    const limit = Math.min(Number(req.query.limit) || 500, 1000);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const filter = { owner: req.user._id };
    if (artist) filter.artist = artist;
    if (album) filter.album = album;
    if (genre) filter.genre = genre;
    if (q) filter.title = looseRegex(q);
    const [items, total] = await Promise.all([
      Song.find(filter)
        .sort(SORTS[sort] || SORTS.recent)
        .skip((page - 1) * limit)
        .limit(limit)
        .populate(SONG_POPULATE),
      Song.countDocuments(filter),
    ]);
    res.json({ items, total, page, limit });
  })
);

// POST /api/songs/upload  (multipart: files[]; optional artist, album, genre overrides)
router.post(
  '/upload',
  audioUpload.array('files', 100),
  asyncHandler(async (req, res) => {
    if (!req.files?.length) throw new HttpError(400, 'No audio files received');
    const overrides = {
      artist: req.body.artist?.trim(),
      album: req.body.album?.trim(),
      genre: req.body.genre?.trim(),
    };
    const results = [];
    for (const file of req.files) {
      try {
        const { song, duplicate } = await importAudioFile(req.user._id, file, overrides);
        await song.populate(SONG_POPULATE);
        results.push({ ok: true, duplicate, song });
      } catch (e) {
        fs.promises.unlink(file.path).catch(() => {});
        results.push({ ok: false, name: file.originalname, error: e.message });
      }
    }
    res.status(201).json({
      imported: results.filter((r) => r.ok && !r.duplicate).length,
      duplicates: results.filter((r) => r.duplicate).length,
      failed: results.filter((r) => !r.ok).length,
      results,
    });
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const song = await Song.findOne({ _id: req.params.id, owner: req.user._id }).populate(SONG_POPULATE);
    if (!song) throw new HttpError(404, 'Song not found');
    res.json(song);
  })
);

/** Streams with HTTP Range support so seeking works. ?download=1 forces a file download. */
router.get(
  '/:id/stream',
  asyncHandler(async (req, res) => {
    const song = await Song.findOne({ _id: req.params.id, owner: req.user._id }).populate('artist', 'name');
    if (!song) throw new HttpError(404, 'Song not found');
    if (song.file.storage === 'cloudinary' && song.file.url) {
      // Cloudinary serves the bytes (with Range + CORS); we only check ownership here
      const url = req.query.download ? song.file.url.replace('/upload/', '/upload/fl_attachment/') : song.file.url;
      return res.redirect(302, url);
    }
    const filePath = path.join(AUDIO_DIR, song.file.path);
    if (!fs.existsSync(filePath)) throw new HttpError(410, 'Audio file is missing on the server');
    if (req.query.download) {
      const ext = path.extname(song.file.path);
      const nice = `${song.artist?.name ? `${song.artist.name} - ` : ''}${song.title}${ext}`.replace(/[\\/:*?"<>|]/g, '');
      res.attachment(nice);
    }
    res.type(song.file.mime || 'audio/mpeg');
    res.set('Cache-Control', 'private, max-age=31536000, immutable');
    res.sendFile(filePath, { acceptRanges: true });
  })
);

// PATCH /api/songs/:id  { title, artist (name), album (title), genre, lyrics, year, trackNo }
router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const song = await Song.findOne({ _id: req.params.id, owner: req.user._id });
    if (!song) throw new HttpError(404, 'Song not found');
    const { title, artist, album, genre, lyrics, year, trackNo } = req.body || {};
    if (title !== undefined) song.title = title;
    if (genre !== undefined) song.genre = genre;
    if (lyrics !== undefined) song.lyrics = lyrics;
    if (year !== undefined) song.year = year || undefined;
    if (trackNo !== undefined) song.trackNo = trackNo || undefined;
    if (artist !== undefined || album !== undefined) {
      const artistDoc = artist !== undefined ? await findOrCreateArtist(req.user._id, artist) : { _id: song.artist };
      const currentAlbum = await song.populate('album', 'title');
      const albumDoc = await findOrCreateAlbum(
        req.user._id,
        artistDoc._id,
        album !== undefined ? album : currentAlbum.album?.title,
        { cover: song.cover }
      );
      song.artist = artistDoc._id;
      song.album = albumDoc._id;
    }
    await song.save();
    await cleanupOrphans(req.user._id);
    await song.populate(SONG_POPULATE);
    res.json(song);
  })
);

router.post(
  '/:id/cover',
  coverUpload.single('cover'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Send an image in the "cover" field');
    const cover = await storeCover({ tempPath: req.file.path, name: req.file.filename });
    const song = await Song.findOneAndUpdate(
      { _id: req.params.id, owner: req.user._id },
      { cover },
      { new: true }
    ).populate(SONG_POPULATE);
    if (!song) throw new HttpError(404, 'Song not found');
    res.json(song);
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const song = await Song.findOneAndDelete({ _id: req.params.id, owner: req.user._id });
    if (!song) throw new HttpError(404, 'Song not found');
    await removeAudio(song.file);
    await Playlist.updateMany({ owner: req.user._id }, { $pull: { songs: song._id } });
    await User.updateOne({ _id: req.user._id }, { $pull: { favorites: song._id } });
    await cleanupOrphans(req.user._id);
    res.json({ ok: true });
  })
);

export default router;
