import { api } from '../api/client.js';
import { createStore } from './store.js';
import { isAccount } from './session.js';
import { queueOutbox } from './outbox.js';

const KEY = 'nagham.favorites';
export const favoritesStore = createStore(new Set(JSON.parse(localStorage.getItem(KEY) || '[]')));

function persist(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export async function loadFavorites() {
  if (!isAccount()) return;
  try {
    const songs = await api('/me/favorites');
    const set = new Set(songs.map((s) => s._id));
    // keep local-only favourites too
    favoritesStore.get().forEach((id) => id.startsWith('local-') && set.add(id));
    favoritesStore.set(set);
    persist(set);
  } catch {
    /* offline: keep cached set */
  }
}

export async function toggleFavorite(song) {
  const set = new Set(favoritesStore.get());
  const on = !set.has(song._id);
  on ? set.add(song._id) : set.delete(song._id);
  favoritesStore.set(set);
  persist(set);
  if (isAccount() && !song._id.startsWith('local-')) {
    try {
      await api(`/me/favorites/${song._id}`, { method: on ? 'POST' : 'DELETE' });
    } catch (e) {
      if (e.offline) queueOutbox({ type: 'favorite', songId: song._id, on });
    }
  }
  return on;
}
