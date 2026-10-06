/**
 * The music player engine – a single <audio> element driven by a queue.
 * Lives outside React so playback never restarts when screens change.
 *
 *  playerStore: queue, index, playing, shuffle, repeat, volume…
 *  timeStore:   currentTime, duration, buffered (updates ~4×/sec)
 */
import { createStore } from '../lib/store.js';
import { streamUrl, getToken } from '../api/client.js';
import { isDownloaded, getOfflineRecord, coverFor } from '../lib/downloads.js';
import { isAccount } from '../lib/session.js';
import { pushRecent } from '../lib/local.js';
import { recordPlay } from '../lib/outbox.js';
import { mediaSession, artworkFor } from '../lib/native.js';
import { toast } from '../components/Toast.jsx';

const PERSIST_KEY = 'nagham.player';

export const playerStore = createStore({
  queue: [], // songs in play order
  original: null, // un-shuffled order (when shuffle is on)
  index: -1,
  playing: false,
  loading: false,
  shuffle: false,
  repeat: 'off', // 'off' | 'all' | 'one'
  volume: 1,
  muted: false,
  sleepAt: null, // timestamp, or 'end' = stop after current song
});

export const timeStore = createStore({ currentTime: 0, duration: 0, buffered: 0 });

const audio = typeof Audio !== 'undefined' ? new Audio() : null;
if (audio) {
  audio.preload = 'auto';
}

let objectUrl = null;
let loadToken = 0;
let listened = 0; // seconds actually heard of the current song
let lastTick = 0;
let currentId = null;
let sleepTimer = null;

const get = () => playerStore.get();
const set = (patch) => playerStore.set((s) => ({ ...s, ...patch }));
export const currentSong = () => {
  const s = get();
  return s.queue[s.index] || null;
};

/* ---------------- availability ---------------- */

export function canPlay(song) {
  if (!song) return false;
  if (isDownloaded(song._id)) return true;
  if (song._id.startsWith('local-')) return false;
  return isAccount() && navigator.onLine !== false;
}

async function sourceFor(song) {
  if (isDownloaded(song._id)) {
    const rec = await getOfflineRecord(song._id);
    if (rec?.audio) return { url: URL.createObjectURL(rec.audio), blob: true };
  }
  if (!song._id.startsWith('local-') && isAccount() && getToken()) return { url: streamUrl(song._id), blob: false };
  return null;
}

/* ---------------- history ---------------- */

function flushListen(completed = false) {
  if (currentId && (listened >= 30 || completed)) recordPlay(currentId, listened, completed);
  listened = 0;
}

/* ---------------- loading ---------------- */

async function load(autoplay, startAt = 0, skipsLeft = null) {
  const s = get();
  const song = s.queue[s.index];
  if (!song || !audio) return;
  const token = ++loadToken;
  flushListen(false);
  currentId = song._id;
  set({ loading: true });
  timeStore.set({ currentTime: startAt, duration: song.duration || 0, buffered: 0 });

  const src = await sourceFor(song);
  if (token !== loadToken) return;
  if (!src) {
    // Not downloaded and we're offline – skip ahead to something playable
    const remaining = skipsLeft ?? s.queue.length - 1;
    if (remaining > 0 && s.queue.some((x, i) => i !== s.index && canPlay(x))) {
      toast(`“${song.title}” isn't downloaded — skipped`);
      set({ index: (s.index + 1) % s.queue.length });
      return load(autoplay, 0, remaining - 1);
    }
    set({ loading: false, playing: false });
    toast('Nothing playable offline. Download songs while connected.');
    return;
  }

  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = src.blob ? src.url : null;
  audio.src = src.url;
  if (startAt) {
    const seekOnce = () => {
      audio.currentTime = Math.min(startAt, (audio.duration || startAt) - 0.5);
      audio.removeEventListener('loadedmetadata', seekOnce);
    };
    audio.addEventListener('loadedmetadata', seekOnce);
  }
  pushRecent(song);
  updateMediaSession(song);
  persist();
  if (autoplay) {
    try {
      await audio.play();
    } catch (e) {
      if (e.name !== 'AbortError') set({ playing: false, loading: false });
    }
  } else {
    set({ loading: false });
  }
}

/* ---------------- public controls ---------------- */

function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Replace the queue with `songs` and start at `start`. */
export function playSongs(songs, start = 0, { shuffle } = {}) {
  const list = songs.filter(Boolean);
  if (!list.length) return;
  const useShuffle = shuffle ?? get().shuffle;
  if (useShuffle) {
    const first = shuffle ? list[Math.floor(Math.random() * list.length)] : list[start];
    const rest = shuffled(list.filter((s) => s !== first));
    set({ queue: [first, ...rest], original: list, index: 0, shuffle: true });
  } else {
    set({ queue: list, original: null, index: Math.min(start, list.length - 1), shuffle: false });
  }
  load(true);
}

export function playSong(song, context) {
  if (!context?.length) return playSongs([song], 0);
  const i = context.findIndex((s) => s._id === song._id);
  playSongs(context, Math.max(i, 0));
}

export function toggle() {
  if (!audio) return;
  const s = get();
  if (s.index < 0) return;
  if (!audio.src) return load(true, timeStore.get().currentTime);
  audio.paused ? audio.play().catch(() => {}) : audio.pause();
}

export const play = () => audio?.paused && toggle();
export const pause = () => audio && !audio.paused && audio.pause();

export function next(auto = false) {
  const s = get();
  if (!s.queue.length) return;
  if (auto) flushListen(true);
  if (s.index < s.queue.length - 1) {
    set({ index: s.index + 1 });
    return load(true);
  }
  if (s.repeat === 'all' || !auto) {
    set({ index: 0 });
    return load(s.repeat === 'all' || !auto);
  }
  // End of queue
  audio.pause();
  audio.currentTime = 0;
  set({ playing: false });
}

export function prev() {
  const s = get();
  if (!s.queue.length) return;
  if (audio.currentTime > 3 || s.index === 0) {
    audio.currentTime = 0;
    return;
  }
  set({ index: s.index - 1 });
  load(true);
}

export function jumpTo(i) {
  const s = get();
  if (i < 0 || i >= s.queue.length) return;
  set({ index: i });
  load(true);
}

export function seek(seconds) {
  if (!audio || !Number.isFinite(seconds)) return;
  audio.currentTime = Math.max(0, Math.min(seconds, audio.duration || seconds));
  timeStore.set((t) => ({ ...t, currentTime: audio.currentTime }));
}

export function seekBy(delta) {
  seek((audio?.currentTime || 0) + delta);
}

export function setVolume(v) {
  const vol = Math.max(0, Math.min(1, v));
  if (audio) audio.volume = vol;
  set({ volume: vol, muted: vol === 0 });
  persist();
}

export function toggleMute() {
  const m = !get().muted;
  if (audio) audio.muted = m;
  set({ muted: m });
}

export function toggleShuffle() {
  const s = get();
  const cur = s.queue[s.index];
  if (!s.shuffle) {
    const rest = shuffled(s.queue.filter((_, i) => i !== s.index));
    set({ shuffle: true, original: s.queue, queue: cur ? [cur, ...rest] : rest, index: cur ? 0 : -1 });
  } else {
    const original = s.original || s.queue;
    set({ shuffle: false, original: null, queue: original, index: Math.max(0, original.findIndex((x) => x._id === cur?._id)) });
  }
  persist();
}

export function cycleRepeat() {
  const order = { off: 'all', all: 'one', one: 'off' };
  set({ repeat: order[get().repeat] });
  persist();
}

/** Insert right after the current song. */
export function playNext(songs) {
  const list = [].concat(songs);
  const s = get();
  if (s.index < 0) return playSongs(list, 0);
  const queue = [...s.queue];
  queue.splice(s.index + 1, 0, ...list);
  const original = s.original ? [...s.original, ...list] : null;
  set({ queue, original });
  persist();
  toast(list.length > 1 ? `${list.length} songs will play next` : `“${list[0].title}” will play next`);
}

export function addToQueue(songs) {
  const list = [].concat(songs);
  const s = get();
  if (s.index < 0) return playSongs(list, 0);
  set({ queue: [...s.queue, ...list], original: s.original ? [...s.original, ...list] : null });
  persist();
  toast(list.length > 1 ? `Added ${list.length} songs to queue` : 'Added to queue');
}

export function removeFromQueue(i) {
  const s = get();
  if (i === s.index) return;
  const removed = s.queue[i];
  const queue = s.queue.filter((_, k) => k !== i);
  set({
    queue,
    index: i < s.index ? s.index - 1 : s.index,
    original: s.original ? s.original.filter((x) => x !== removed) : null,
  });
  persist();
}

export function moveInQueue(from, to) {
  const s = get();
  if (from === to) return;
  const queue = [...s.queue];
  const [item] = queue.splice(from, 1);
  queue.splice(to, 0, item);
  let index = s.index;
  if (from === s.index) index = to;
  else if (from < s.index && to >= s.index) index--;
  else if (from > s.index && to <= s.index) index++;
  set({ queue, index });
  persist();
}

export function clearUpcoming() {
  const s = get();
  set({ queue: s.queue.slice(0, s.index + 1), original: null, shuffle: false });
  persist();
}

/** Update a song's metadata everywhere in the queue (after editing). */
export function refreshSongInQueue(song) {
  const s = get();
  const swap = (arr) => arr?.map((x) => (x._id === song._id ? { ...x, ...song } : x));
  set({ queue: swap(s.queue), original: swap(s.original) });
  if (currentSong()?._id === song._id) updateMediaSession(currentSong());
}

export function setSleepTimer(minutes) {
  clearTimeout(sleepTimer);
  if (minutes === 'end') return set({ sleepAt: 'end' });
  if (!minutes) return set({ sleepAt: null });
  const at = Date.now() + minutes * 60000;
  set({ sleepAt: at });
  sleepTimer = setTimeout(() => {
    pause();
    set({ sleepAt: null });
    toast('Sleep timer — paused');
  }, minutes * 60000);
}

/* ---------------- media session (lock screen / notification) ---------------- */

async function updateMediaSession(song) {
  if (!song) return;
  const art = coverFor(song);
  await mediaSession.setMetadata({
    title: song.title,
    artist: song.artist?.name || '',
    album: song.album?.title || '',
    artwork: await artworkFor(art).catch(() => []),
  });
}

function wireMediaSession() {
  mediaSession.setActionHandler('play', () => play());
  mediaSession.setActionHandler('pause', () => pause());
  mediaSession.setActionHandler('stop', () => pause());
  mediaSession.setActionHandler('nexttrack', () => next());
  mediaSession.setActionHandler('previoustrack', () => prev());
  mediaSession.setActionHandler('seekto', (d) => d?.seekTime != null && seek(d.seekTime));
  mediaSession.setActionHandler('seekforward', (d) => seekBy(d?.seekOffset || 10));
  mediaSession.setActionHandler('seekbackward', (d) => seekBy(-(d?.seekOffset || 10)));
}

/* ---------------- persistence ---------------- */

let persistTimer = null;
function persist() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(() => {
    const s = get();
    const slim = (x) => x && { _id: x._id, title: x.title, artist: x.artist, album: x.album, cover: x.cover, duration: x.duration, lyrics: x.lyrics, local: x.local };
    try {
      localStorage.setItem(
        PERSIST_KEY,
        JSON.stringify({
          queue: s.queue.slice(0, 500).map(slim),
          original: s.original?.slice(0, 500).map(slim) || null,
          index: s.index,
          shuffle: s.shuffle,
          repeat: s.repeat,
          volume: s.volume,
          position: audio?.currentTime || timeStore.get().currentTime || 0,
        })
      );
    } catch {
      /* quota – ignore */
    }
  }, 300);
}

function restore() {
  try {
    const saved = JSON.parse(localStorage.getItem(PERSIST_KEY) || 'null');
    if (!saved?.queue?.length) return;
    set({
      queue: saved.queue,
      original: saved.original,
      index: Math.min(saved.index, saved.queue.length - 1),
      shuffle: saved.shuffle,
      repeat: saved.repeat || 'off',
      volume: saved.volume ?? 1,
    });
    if (audio) audio.volume = saved.volume ?? 1;
    const song = saved.queue[saved.index];
    timeStore.set({ currentTime: saved.position || 0, duration: song?.duration || 0, buffered: 0 });
    pendingResume = saved.position || 0;
  } catch {
    /* ignore corrupt state */
  }
}

let pendingResume = 0;

/** Called once the library/session is ready, so the restored song can be resolved. */
export function primeRestoredSong() {
  if (get().index >= 0 && audio && !audio.src) {
    load(false, pendingResume).catch(() => {});
  }
}

/* ---------------- audio element events ---------------- */

export function initPlayer() {
  if (!audio) return;
  restore();
  wireMediaSession();

  audio.addEventListener('play', () => {
    set({ playing: true });
    lastTick = audio.currentTime;
    mediaSession.setPlaybackState('playing');
  });
  audio.addEventListener('playing', () => set({ loading: false, playing: true }));
  audio.addEventListener('pause', () => {
    set({ playing: false });
    mediaSession.setPlaybackState('paused');
    persist();
  });
  audio.addEventListener('waiting', () => set({ loading: true }));
  audio.addEventListener('canplay', () => set({ loading: false }));
  audio.addEventListener('loadedmetadata', () => {
    timeStore.set((t) => ({ ...t, duration: audio.duration || t.duration }));
  });

  let lastPos = 0;
  audio.addEventListener('timeupdate', () => {
    const t = audio.currentTime;
    const delta = t - lastTick;
    if (delta > 0 && delta < 2) listened += delta;
    lastTick = t;
    let buffered = 0;
    try {
      if (audio.buffered.length) buffered = audio.buffered.end(audio.buffered.length - 1);
    } catch {
      /* ignore */
    }
    timeStore.set({ currentTime: t, duration: audio.duration || timeStore.get().duration, buffered });
    if (Math.abs(t - lastPos) > 5) {
      lastPos = t;
      persist();
      mediaSession.setPositionState({ duration: audio.duration, position: t, playbackRate: audio.playbackRate });
    }
  });
  audio.addEventListener('seeked', () => {
    lastTick = audio.currentTime;
    mediaSession.setPositionState({ duration: audio.duration, position: audio.currentTime, playbackRate: audio.playbackRate });
  });

  audio.addEventListener('ended', () => {
    if (get().sleepAt === 'end') {
      flushListen(true);
      set({ sleepAt: null, playing: false });
      return;
    }
    if (get().repeat === 'one') {
      flushListen(true);
      audio.currentTime = 0;
      audio.play().catch(() => {});
      return;
    }
    next(true);
  });

  audio.addEventListener('error', () => {
    if (!audio.src || audio.src === window.location.href) return;
    const song = currentSong();
    set({ loading: false, playing: false });
    toast(`Couldn't play “${song?.title || 'this song'}”`);
  });

  document.addEventListener('visibilitychange', () => document.hidden && persist());
  window.addEventListener('pagehide', persist);

  // Hardware / keyboard shortcuts on desktop
  window.addEventListener('keydown', (e) => {
    if (e.target.closest?.('input, textarea, [contenteditable]')) return;
    if (e.code === 'Space') {
      e.preventDefault();
      toggle();
    } else if (e.code === 'ArrowRight' && e.shiftKey) next();
    else if (e.code === 'ArrowLeft' && e.shiftKey) prev();
  });
}
