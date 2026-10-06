import { Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Song from '../models/Song.js';
import { COVER_DIR } from '../config/env.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { libraryCounts } from '../utils/counts.js';
import { SONG_POPULATE } from './songs.js';

const router = Router();
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: COVER_DIR,
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${path.extname(file.originalname) || '.jpg'}`),
  }),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter: (req, file, cb) => cb(null, file.mimetype.startsWith('image/')),
});

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [artists, counts] = await Promise.all([
      Artist.find({ owner: req.user._id }).sort({ name: 1 }).lean(),
      libraryCounts(req.user._id),
    ]);
    res.json(
      artists.map((a) => {
        const c = counts.artists.get(String(a._id));
        return { ...a, songCount: c?.songs || 0, albumCount: c?.albums.size || 0, duration: c?.duration || 0 };
      })
    );
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const artist = await Artist.findOne({ _id: req.params.id, owner: req.user._id }).lean();
    if (!artist) throw new HttpError(404, 'Artist not found');
    const [albums, songs] = await Promise.all([
      Album.find({ owner: req.user._id, artist: artist._id }).sort({ year: -1, title: 1 }).lean(),
      Song.find({ owner: req.user._id, artist: artist._id }).sort({ playCount: -1, title: 1 }).populate(SONG_POPULATE),
    ]);
    const perAlbum = new Map();
    songs.forEach((s) => perAlbum.set(String(s.album?._id), (perAlbum.get(String(s.album?._id)) || 0) + 1));
    res.json({
      ...artist,
      albums: albums.map((a) => ({ ...a, songCount: perAlbum.get(String(a._id)) || 0 })),
      songs,
    });
  })
);

router.patch(
  '/:id',
  imageUpload.single('image'),
  asyncHandler(async (req, res) => {
    const update = {};
    if (req.body.name) update.name = req.body.name.trim();
    if (req.body.bio !== undefined) update.bio = req.body.bio;
    if (req.file) update.image = `/media/covers/${req.file.filename}`;
    const artist = await Artist.findOneAndUpdate({ _id: req.params.id, owner: req.user._id }, update, { new: true });
    if (!artist) throw new HttpError(404, 'Artist not found');
    res.json(artist);
  })
);

export default router;
