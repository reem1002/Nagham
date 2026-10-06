import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import crypto from 'node:crypto';
import path from 'node:path';
import { parseFile, selectCover } from 'music-metadata';
import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import { AUDIO_DIR, COVER_DIR } from '../config/env.js';
import { findOrCreateArtist, findOrCreateAlbum } from './library.js';

function sha1File(file) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    createReadStream(file)
      .on('data', (d) => hash.update(d))
      // 'close' (not 'end'): on Windows the file stays locked until the handle closes
      .on('close', () => resolve(hash.digest('hex')))
      .on('error', reject);
  });
}

/** Browsers send multipart filenames as latin1; recover UTF-8 (Arabic names). */
export function fixFilename(name = '') {
  try {
    const decoded = Buffer.from(name, 'latin1').toString('utf8');
    return decoded.includes('�') ? name : decoded;
  } catch {
    return name;
  }
}

/** "Fairuz - Nassam Alayna El Hawa.mp3" -> { artist: 'Fairuz', title: 'Nassam Alayna El Hawa' } */
export function guessFromFilename(filename) {
  const base = path.parse(filename).name.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  const stripped = base.replace(/^\d{1,3}[\s.\-_)]+/, ''); // leading track number
  const parts = stripped.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  return { artist: '', title: stripped || base };
}

/**
 * Many Arabic files carry UTF-8 tags that were read as Latin-1 ("ÙÙØ±ÙØ²").
 * If re-decoding gives clean UTF-8, use that.
 */
export function fixMojibake(text) {
  if (!text || typeof text !== 'string' || !/[\u00C0-\u00FF]/.test(text)) return text;
  if (/[^\u0000-\u00FF]/.test(text)) return text; // already has real non-latin chars
  const decoded = Buffer.from(text, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? text : decoded;
}

function lyricsToText(lyrics) {
  if (!lyrics?.length) return '';
  return lyrics
    .map((l) => (typeof l === 'string' ? l : l?.text || (l?.syncText || []).map((s) => s.text).join('\n')))
    .filter(Boolean)
    .join('\n');
}

/**
 * Takes a file multer already wrote into uploads/audio, reads its tags,
 * creates Artist/Album as needed and returns { song, duplicate }.
 * `overrides` lets the user force an artist/album (e.g. "import all into Fairuz").
 */
export async function importAudioFile(owner, file, overrides = {}) {
  const absPath = file.path;
  const originalName = fixFilename(file.originalname);
  const hash = await sha1File(absPath);

  const existing = await Song.findOne({ owner, 'file.hash': hash });
  if (existing) {
    await fs.unlink(absPath).catch(() => {});
    return { song: existing, duplicate: true };
  }

  let common = {};
  let format = {};
  try {
    ({ common, format } = await parseFile(absPath, { duration: true, skipCovers: false }));
  } catch (e) {
    console.warn(`Could not read tags for ${originalName}: ${e.message}`);
  }

  const guess = guessFromFilename(originalName);
  const title = (overrides.title || fixMojibake(common.title) || guess.title || 'Untitled').trim();
  const artistName = overrides.artist || fixMojibake(common.albumartist || common.artist) || guess.artist;
  const albumTitle = overrides.album || fixMojibake(common.album);

  let cover = '';
  const picture = selectCover(common.picture);
  if (picture?.data) {
    const ext = picture.format?.includes('png') ? 'png' : 'jpg';
    const coverName = `${hash}.${ext}`;
    await fs.writeFile(path.join(COVER_DIR, coverName), picture.data);
    cover = `/media/covers/${coverName}`;
  }

  const artist = await findOrCreateArtist(owner, artistName);
  if (!artist.image && cover) {
    await Artist.updateOne({ _id: artist._id }, { image: cover });
  }
  const album = await findOrCreateAlbum(owner, artist._id, albumTitle, { year: common.year, cover });

  // Keep a stable, readable file name on disk
  const ext = path.extname(originalName) || path.extname(absPath) || '.mp3';
  const finalName = `${hash}${ext.toLowerCase()}`;
  const finalPath = path.join(AUDIO_DIR, finalName);
  await moveFile(absPath, finalPath);

  const song = await Song.create({
    owner,
    title,
    artist: artist._id,
    album: album._id,
    genre: overrides.genre || fixMojibake(common.genre?.[0]) || '',
    year: common.year,
    trackNo: common.track?.no || undefined,
    duration: Math.round(format.duration || 0),
    lyrics: lyricsToText(common.lyrics),
    cover: cover || album.cover || '',
    file: {
      path: finalName,
      mime: file.mimetype && file.mimetype !== 'application/octet-stream' ? file.mimetype : mimeFromExt(ext),
      size: file.size,
      hash,
      originalName,
    },
  });

  return { song, duplicate: false };
}

/** rename() can fail on Windows (EPERM/EBUSY) while antivirus or another handle holds the file. */
async function moveFile(from, to) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (e) {
      if (e.code === 'EXDEV') break;
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code) || attempt === 4) {
        // last resort: copy, then try to remove the temp file
        await fs.copyFile(from, to);
        await fs.unlink(from).catch(() => {});
        return;
      }
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  await fs.copyFile(from, to);
  await fs.unlink(from).catch(() => {});
}

export function mimeFromExt(ext = '') {
  return (
    {
      '.mp3': 'audio/mpeg',
      '.m4a': 'audio/mp4',
      '.aac': 'audio/aac',
      '.ogg': 'audio/ogg',
      '.opus': 'audio/ogg',
      '.wav': 'audio/wav',
      '.flac': 'audio/flac',
      '.webm': 'audio/webm',
    }[ext.toLowerCase()] || 'audio/mpeg'
  );
}
