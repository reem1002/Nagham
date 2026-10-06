/**
 * Where audio files and cover images live.
 *   STORAGE=local       -> server/uploads (default, good for a laptop / VPS)
 *   STORAGE=cloudinary  -> Cloudinary (free tier, needed on hosts without a
 *                          persistent disk such as Render's free plan)
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { v2 as cloudinary } from 'cloudinary';
import { AUDIO_DIR, COVER_DIR } from '../config/env.js';

export const STORAGE = (process.env.STORAGE || 'local').toLowerCase();
export const useCloud = STORAGE === 'cloudinary';

if (useCloud) {
  if (!process.env.CLOUDINARY_URL) throw new Error('STORAGE=cloudinary needs CLOUDINARY_URL in .env');
  cloudinary.config({ secure: true }); // reads CLOUDINARY_URL
}

/** Moves a finished temp audio file to its final home. Returns the `file` fields to store on the Song. */
export async function storeAudio(tempPath, hash, ext) {
  if (useCloud) {
    const res = await cloudinary.uploader.upload(tempPath, {
      resource_type: 'video', // Cloudinary stores audio under "video"
      folder: 'nagham/audio',
      public_id: hash,
      overwrite: false,
      unique_filename: false,
    });
    await fs.unlink(tempPath).catch(() => {});
    return { path: `${hash}${ext}`, url: res.secure_url, publicId: res.public_id, storage: 'cloudinary' };
  }
  const finalName = `${hash}${ext}`;
  await moveFile(tempPath, path.join(AUDIO_DIR, finalName));
  return { path: finalName, storage: 'local' };
}

/** Saves cover bytes (or an already-written temp image) and returns the URL to store. */
export async function storeCover({ data, tempPath, name }) {
  if (useCloud) {
    const src = tempPath || `data:image/jpeg;base64,${Buffer.from(data).toString('base64')}`;
    const res = await cloudinary.uploader.upload(src, {
      resource_type: 'image',
      folder: 'nagham/covers',
      public_id: path.parse(name).name,
      overwrite: true,
      transformation: [{ width: 800, height: 800, crop: 'limit', quality: 'auto' }],
    });
    if (tempPath) await fs.unlink(tempPath).catch(() => {});
    return res.secure_url;
  }
  if (data) await fs.writeFile(path.join(COVER_DIR, name), data);
  return `/media/covers/${name}`;
}

export async function removeAudio(file) {
  if (!file) return;
  if (file.storage === 'cloudinary' && file.publicId) {
    await cloudinary.uploader.destroy(file.publicId, { resource_type: 'video' }).catch(() => {});
  } else if (file.path) {
    await fs.unlink(path.join(AUDIO_DIR, file.path)).catch(() => {});
  }
}

/** rename() can fail on Windows (EPERM/EBUSY) while antivirus or another handle holds the file. */
export async function moveFile(from, to) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await fs.rename(from, to);
      return;
    } catch (e) {
      if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) break;
      await new Promise((r) => setTimeout(r, 150 * (attempt + 1)));
    }
  }
  await fs.copyFile(from, to);
  await fs.unlink(from).catch(() => {});
}
