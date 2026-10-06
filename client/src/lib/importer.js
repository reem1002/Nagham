import { uploadWithProgress } from '../api/client.js';
import { saveLocalSong, storeDownloadFromFile } from './downloads.js';
import { normalizeKey } from './format.js';
import { dbPromise } from './db.js';

export const AUDIO_RE = /\.(mp3|m4a|aac|ogg|oga|opus|wav|flac|webm|wma|amr|3gp)$/i;
export const isAudioFile = (f) => f && (f.type?.startsWith('audio/') || AUDIO_RE.test(f.name || ''));

/** "03 - Fairuz - نسم علينا الهوى.mp3" -> { artist: 'Fairuz', title: 'نسم علينا الهوى' } */
export function guessFromName(name = '') {
  const base = name.replace(/\.[^.]+$/, '').replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  const stripped = base.replace(/^\d{1,3}[\s.\-_)]+/, '');
  const parts = stripped.split(/\s+[-–—]\s+/);
  if (parts.length >= 2) return { artist: parts[0].trim(), title: parts.slice(1).join(' - ').trim() };
  return { artist: '', title: stripped || base };
}

function durationViaAudio(file) {
  return new Promise((resolve) => {
    const a = new Audio();
    const url = URL.createObjectURL(file);
    const done = (d) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) ? Math.round(d) : 0);
    };
    a.preload = 'metadata';
    a.onloadedmetadata = () => done(a.duration);
    a.onerror = () => done(0);
    setTimeout(() => done(0), 8000);
    a.src = url;
  });
}

const fixMojibake = (t) => {
  if (!t || !/[À-ÿ]/.test(t) || /[^\u0000-ÿ]/.test(t)) return t;
  try {
    const bytes = Uint8Array.from(t, (c) => c.charCodeAt(0));
    const d = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return d;
  } catch {
    return t;
  }
};

/** Read tags in the browser (used for device-only imports). */
export async function readTags(file) {
  let common = {};
  let format = {};
  try {
    const mm = await import('music-metadata');
    ({ common, format } = await mm.parseBlob(file, { duration: true }));
  } catch (e) {
    console.warn('tag read failed', file.name, e);
  }
  const guess = guessFromName(file.name);
  const pic = common.picture?.find((p) => /front/i.test(p.type || '')) || common.picture?.[0];
  const lyrics = (common.lyrics || []).map((l) => (typeof l === 'string' ? l : l?.text || '')).filter(Boolean).join('\n');
  return {
    title: fixMojibake(common.title) || guess.title || 'Untitled',
    artist: fixMojibake(common.albumartist || common.artist) || guess.artist || 'Unknown Artist',
    album: fixMojibake(common.album) || 'Singles',
    year: common.year,
    trackNo: common.track?.no || undefined,
    genre: fixMojibake(common.genre?.[0]) || '',
    lyrics,
    duration: Math.round(format.duration || 0) || (await durationViaAudio(file)),
    cover: pic ? new Blob([pic.data], { type: pic.format || 'image/jpeg' }) : null,
  };
}

// Common alternate spellings that should land on one artist page (mirrors the server's aliases)
const ARTIST_ALIASES = {
  'فيروز': ['fairuz', 'fairouz', 'fayrouz', 'feiruz', 'fayruz', 'فيروز'],
};
function canonicalArtist(name) {
  const key = normalizeKey(name);
  for (const [canonical, keys] of Object.entries(ARTIST_ALIASES)) if (keys.includes(key)) return canonical;
  return name;
}

/** Save a file to this device only (guest mode, or when the server is unreachable). */
export async function importLocally(file, overrides = {}) {
  const tags = await readTags(file);
  const artist = canonicalArtist(overrides.artist || tags.artist);
  const album = overrides.album || tags.album;
  const aKey = normalizeKey(artist);
  const song = {
    _id: `local-${crypto.randomUUID()}`,
    local: true,
    title: tags.title,
    artist: { _id: `local-artist-${aKey}`, name: artist },
    album: { _id: `local-album-${aKey}-${normalizeKey(album)}`, title: album },
    year: tags.year,
    trackNo: tags.trackNo,
    genre: overrides.genre || tags.genre,
    lyrics: tags.lyrics,
    duration: tags.duration,
    cover: '',
    createdAt: new Date().toISOString(),
    file: { originalName: file.name, size: file.size, mime: file.type },
  };
  await saveLocalSong(song, file, tags.cover);
  return song;
}

/**
 * Upload files to the server in small batches.
 * onFile(index, patch) reports per-file progress/status.
 */
export async function uploadFiles(files, { overrides = {}, keepOnDevice = true, onFile }) {
  const BATCH = 4;
  for (let start = 0; start < files.length; start += BATCH) {
    const batch = files.slice(start, start + BATCH);
    const fd = new FormData();
    batch.forEach((f) => fd.append('files', f, f.name));
    Object.entries(overrides).forEach(([k, v]) => v && fd.append(k, v));
    batch.forEach((_, i) => onFile(start + i, { status: 'uploading', progress: 0 }));
    const res = await uploadWithProgress('/songs/upload', fd, (p) => batch.forEach((_, i) => onFile(start + i, { progress: p })));
    for (const [i, r] of res.results.entries()) {
      const idx = start + i;
      if (!r.ok) {
        onFile(idx, { status: 'error', error: r.error });
        continue;
      }
      if (keepOnDevice) await storeDownloadFromFile(r.song, batch[i]).catch(() => {});
      await onFile(idx, { status: r.duplicate ? 'duplicate' : 'done', song: r.song });
    }
  }
}

/** Files waiting in IndexedDB from the Share menu (service worker or native intent). */
export async function takeSharedFiles() {
  const db = await dbPromise;
  const all = await db.getAll('shares');
  if (all.length) await db.clear('shares');
  return all.map((r) => r.file).filter(Boolean);
}

export async function stashSharedFiles(files) {
  const db = await dbPromise;
  for (const file of files) await db.add('shares', { file, at: Date.now() });
}
