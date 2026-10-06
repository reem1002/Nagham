import { dbPromise } from './db.js';
import { createStore } from './store.js';
import { streamUrl, mediaUrl } from '../api/client.js';

/**
 * Offline library.
 * downloadsStore: { ready, items: { [songId]: { status, progress, size, local } } }
 * Each IndexedDB record: { id, song, audio: Blob, cover: Blob|null, savedAt, size, local }
 */
export const downloadsStore = createStore({ ready: false, items: {} });

const coverUrls = new Map(); // songId -> blob: URL
const queue = [];
let active = 0;
const MAX_PARALLEL = 2;
const controllers = new Map();

function patch(id, value) {
  downloadsStore.set((s) => {
    const items = { ...s.items };
    if (value === null) delete items[id];
    else items[id] = { ...items[id], ...value };
    return { ...s, items };
  });
}

export async function initDownloads() {
  const db = await dbPromise;
  const records = await db.getAll('downloads');
  const items = {};
  for (const r of records) {
    items[r.id] = { status: 'done', progress: 1, size: r.size, local: !!r.local };
    if (r.cover) coverUrls.set(r.id, URL.createObjectURL(r.cover));
  }
  downloadsStore.set({ ready: true, items });
  // Ask the browser not to evict the offline library under storage pressure
  navigator.storage?.persist?.().catch(() => {});
}

export const isDownloaded = (id) => downloadsStore.get().items[id]?.status === 'done';

export function offlineCover(id) {
  return coverUrls.get(id) || '';
}

/** Best artwork URL for a song: local blob first, then server URL. */
export function coverFor(song) {
  if (!song) return '';
  return offlineCover(song._id) || mediaUrl(song.cover || song.album?.cover || '');
}

export async function getOfflineRecord(id) {
  return (await dbPromise).get('downloads', id);
}

export async function getAllOfflineRecords() {
  return (await dbPromise).getAll('downloads');
}

async function fetchWithProgress(url, onProgress, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const total = Number(res.headers.get('Content-Length')) || 0;
  if (!res.body || !total) return res.blob();
  const reader = res.body.getReader();
  const chunks = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    received += value.length;
    onProgress(received / total);
  }
  return new Blob(chunks, { type: res.headers.get('Content-Type') || 'audio/mpeg' });
}

async function runDownload(song) {
  const id = song._id;
  const ctrl = new AbortController();
  controllers.set(id, ctrl);
  patch(id, { status: 'downloading', progress: 0 });
  try {
    let last = 0;
    const audio = await fetchWithProgress(
      streamUrl(id),
      (p) => {
        if (p - last > 0.02 || p === 1) {
          last = p;
          patch(id, { progress: p });
        }
      },
      ctrl.signal
    );
    let cover = null;
    const coverPath = song.cover || song.album?.cover;
    if (coverPath) {
      cover = await fetch(mediaUrl(coverPath), { signal: ctrl.signal })
        .then((r) => (r.ok ? r.blob() : null))
        .catch(() => null);
    }
    const db = await dbPromise;
    await db.put('downloads', { id, song, audio, cover, savedAt: Date.now(), size: audio.size, local: false });
    if (cover) coverUrls.set(id, URL.createObjectURL(cover));
    patch(id, { status: 'done', progress: 1, size: audio.size });
  } catch (e) {
    patch(id, e.name === 'AbortError' ? null : { status: 'error', error: e.message });
  } finally {
    controllers.delete(id);
  }
}

function pump() {
  while (active < MAX_PARALLEL && queue.length) {
    const song = queue.shift();
    active++;
    runDownload(song).finally(() => {
      active--;
      pump();
    });
  }
}

export function downloadSongs(songs) {
  const list = songs.filter((s) => s && !s.local && !['done', 'downloading', 'queued'].includes(downloadsStore.get().items[s._id]?.status));
  list.forEach((s) => {
    patch(s._id, { status: 'queued', progress: 0 });
    queue.push(s);
  });
  pump();
  return list.length;
}

export const downloadSong = (song) => downloadSongs([song]);

export async function removeDownload(id) {
  const qi = queue.findIndex((s) => s._id === id);
  if (qi >= 0) queue.splice(qi, 1);
  controllers.get(id)?.abort();
  const db = await dbPromise;
  const rec = await db.get('downloads', id);
  if (rec?.local) return false; // local-only songs are deleted via deleteLocalSong
  await db.delete('downloads', id);
  const url = coverUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  coverUrls.delete(id);
  patch(id, null);
  return true;
}

/** Store a file that only lives on this device (guest mode / imported offline). */
export async function saveLocalSong(song, audio, cover) {
  const db = await dbPromise;
  await db.put('downloads', { id: song._id, song, audio, cover: cover || null, savedAt: Date.now(), size: audio.size, local: true });
  if (cover) coverUrls.set(song._id, URL.createObjectURL(cover));
  patch(song._id, { status: 'done', progress: 1, size: audio.size, local: true });
}

export async function updateLocalSong(id, changes) {
  const db = await dbPromise;
  const rec = await db.get('downloads', id);
  if (!rec) return null;
  rec.song = { ...rec.song, ...changes };
  await db.put('downloads', rec);
  return rec.song;
}

/** Keep downloaded metadata (title edits, lyrics…) in sync with the server copy. */
export async function refreshDownloadedMeta(song) {
  if (!isDownloaded(song._id)) return;
  const db = await dbPromise;
  const rec = await db.get('downloads', song._id);
  if (rec && !rec.local) {
    rec.song = song;
    await db.put('downloads', rec);
  }
}

export async function deleteLocalSong(id) {
  const db = await dbPromise;
  await db.delete('downloads', id);
  const url = coverUrls.get(id);
  if (url) URL.revokeObjectURL(url);
  coverUrls.delete(id);
  patch(id, null);
}

export async function storageEstimate() {
  const est = (await navigator.storage?.estimate?.()) || {};
  const items = Object.values(downloadsStore.get().items);
  return {
    used: items.reduce((t, i) => t + (i.size || 0), 0),
    quota: est.quota || 0,
    count: items.filter((i) => i.status === 'done').length,
  };
}

/** After uploading a file we already have its bytes – store them instead of re-downloading. */
export async function storeDownloadFromFile(song, audio) {
  let cover = null;
  const coverPath = song.cover || song.album?.cover;
  if (coverPath) cover = await fetch(mediaUrl(coverPath)).then((r) => (r.ok ? r.blob() : null)).catch(() => null);
  const db = await dbPromise;
  await db.put('downloads', { id: song._id, song, audio, cover, savedAt: Date.now(), size: audio.size, local: false });
  if (cover) coverUrls.set(song._id, URL.createObjectURL(cover));
  patch(song._id, { status: 'done', progress: 1, size: audio.size });
}
