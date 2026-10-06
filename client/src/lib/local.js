// Device-only data: playlists & favorites for guest mode, recently played for everyone.
import { createStore } from './store.js';

const read = (k, d) => {
  try {
    return JSON.parse(localStorage.getItem(k)) ?? d;
  } catch {
    return d;
  }
};
const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));

/* ---------- Recently played (song snapshots, newest first) ---------- */
export const recentStore = createStore(read('nagham.recent', []));

export function pushRecent(song) {
  if (!song) return;
  const next = [song, ...recentStore.get().filter((s) => s._id !== song._id)].slice(0, 40);
  recentStore.set(next);
  write('nagham.recent', next);
}

/* ---------- Local playlists ---------- */
export function localPlaylists() {
  return read('nagham.playlists', []);
}

export function saveLocalPlaylists(list) {
  write('nagham.playlists', list);
}

export function createLocalPlaylist(name, description = '', songs = []) {
  const p = { _id: `local-pl-${crypto.randomUUID()}`, name, description, songs, pinned: false, local: true, createdAt: Date.now() };
  saveLocalPlaylists([p, ...localPlaylists()]);
  return p;
}

export function updateLocalPlaylist(id, fn) {
  const list = localPlaylists().map((p) => (p._id === id ? { ...p, ...fn(p), updatedAt: Date.now() } : p));
  saveLocalPlaylists(list);
  return list.find((p) => p._id === id);
}

export function deleteLocalPlaylist(id) {
  saveLocalPlaylists(localPlaylists().filter((p) => p._id !== id));
}
