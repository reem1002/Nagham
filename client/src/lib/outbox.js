import { dbPromise } from './db.js';
import { api } from '../api/client.js';
import { isAccount } from './session.js';

/** Actions done while offline, replayed against the server when back online. */
export async function queueOutbox(item) {
  (await dbPromise).add('outbox', { ...item, at: Date.now() });
}

let flushing = false;
export async function flushOutbox() {
  if (flushing || !isAccount() || !navigator.onLine) return;
  flushing = true;
  try {
    const db = await dbPromise;
    const items = await db.getAll('outbox');
    if (!items.length) return;
    const plays = items.filter((i) => i.type === 'play');
    if (plays.length) {
      await api('/me/history', {
        method: 'POST',
        body: { events: plays.map((p) => ({ songId: p.songId, secondsListened: p.seconds, completed: p.completed, playedAt: p.at })) },
      });
    }
    for (const f of items.filter((i) => i.type === 'favorite')) {
      await api(`/me/favorites/${f.songId}`, { method: f.on ? 'POST' : 'DELETE' }).catch(() => {});
    }
    const tx = db.transaction('outbox', 'readwrite');
    await Promise.all(items.map((i) => tx.store.delete(i.id)));
    await tx.done;
  } catch {
    /* try again later */
  } finally {
    flushing = false;
  }
}

export async function recordPlay(songId, seconds, completed) {
  if (songId.startsWith('local-') || !isAccount()) return;
  try {
    await api('/me/history', { method: 'POST', body: { songId, secondsListened: Math.round(seconds), completed } });
  } catch (e) {
    if (e.offline) queueOutbox({ type: 'play', songId, seconds: Math.round(seconds), completed });
  }
}
