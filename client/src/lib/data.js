/**
 * Library facade used by every screen.
 *
 * - Signed in + online  -> server data (cached in IndexedDB on every success)
 * - Signed in + offline -> last cached server data; if nothing cached, what's downloaded
 * - Guest               -> only songs stored on this device
 *
 * Songs that only live on the device ("local-…" ids) are merged in everywhere.
 */
import { api, cachedGet } from '../api/client.js';
import { getAllOfflineRecords, isDownloaded } from './downloads.js';
import { isAccount } from './session.js';
import { normalizeKey, matches } from './format.js';
import { favoritesStore } from './favorites.js';
import { recentStore, localPlaylists, createLocalPlaylist, updateLocalPlaylist, deleteLocalPlaylist } from './local.js';

/* ---------- helpers ---------- */

async function offlineSongs({ localOnly = false } = {}) {
  const recs = await getAllOfflineRecords();
  return recs
    .filter((r) => (localOnly ? r.local : true))
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((r) => ({ ...r.song, createdAt: r.song.createdAt || r.savedAt }));
}

/** Build artists/albums from a flat list of songs (used offline & for local files). */
export function deriveLibrary(songs) {
  const artists = new Map();
  const albums = new Map();
  for (const s of songs) {
    const aKey = s.artist?._id || 'unknown';
    const a = artists.get(aKey) || { _id: aKey, name: s.artist?.name || 'Unknown Artist', image: s.artist?.image || '', songCount: 0, duration: 0, albums: new Set(), cover: '', sample: s };
    a.songCount++;
    a.duration += s.duration || 0;
    if (s.album?._id) a.albums.add(s.album._id);
    artists.set(aKey, a);
    if (s.album?._id) {
      const al = albums.get(s.album._id) || { _id: s.album._id, title: s.album.title, cover: s.album.cover || s.cover || '', artist: s.artist, songCount: 0, duration: 0, sample: s };
      al.songCount++;
      al.duration += s.duration || 0;
      albums.set(s.album._id, al);
    }
  }
  return {
    artists: [...artists.values()].map((a) => ({ ...a, albumCount: a.albums.size, albums: undefined })).sort((x, y) => x.name.localeCompare(y.name)),
    albums: [...albums.values()].sort((x, y) => x.title.localeCompare(y.title)),
  };
}

const byTrack = (a, b) => (a.trackNo || 999) - (b.trackNo || 999) || a.title.localeCompare(b.title);

/* ---------- Songs ---------- */

export async function loadSongs() {
  const local = await offlineSongs({ localOnly: true });
  if (!isAccount()) return { songs: local, stale: false };
  try {
    const { data, stale } = await cachedGet('/songs?sort=recent&limit=1000');
    return { songs: [...local, ...data.items], stale };
  } catch (e) {
    if (!e.offline) throw e;
    return { songs: await offlineSongs(), stale: true };
  }
}

export async function loadDownloads() {
  return offlineSongs();
}

/* ---------- Home ---------- */

export async function loadHome() {
  const local = await offlineSongs({ localOnly: true });
  const recent = recentStore.get();
  if (isAccount()) {
    try {
      const { data, stale } = await cachedGet('/me/home');
      const lib = deriveLibrary(local);
      return {
        stale,
        recent: recent.length ? recent : data.recent,
        added: [...local, ...data.added].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 12),
        mostPlayed: data.mostPlayed,
        playlists: data.playlists,
        artists: mergeArtists(data.artists, lib.artists),
        totals: { ...data.totals, songs: data.totals.songs + local.length },
      };
    } catch (e) {
      if (!e.offline) throw e;
    }
  }
  const songs = isAccount() ? await offlineSongs() : local;
  const lib = deriveLibrary(songs);
  return {
    stale: isAccount(),
    recent,
    added: songs.slice(0, 12),
    mostPlayed: [],
    playlists: isAccount() ? [] : decorateLocalPlaylists(songs),
    artists: lib.artists.sort((a, b) => b.songCount - a.songCount).slice(0, 12),
    totals: { songs: songs.length, minutes: Math.round(songs.reduce((t, s) => t + (s.duration || 0), 0) / 60), favorites: favoritesStore.get().size },
  };
}

function mergeArtists(server, local) {
  const keys = new Set(server.map((a) => normalizeKey(a.name)));
  return [...server, ...local.filter((a) => !keys.has(normalizeKey(a.name)))];
}

/* ---------- Artists / Albums ---------- */

export async function loadArtists() {
  const local = await offlineSongs({ localOnly: true });
  const localLib = deriveLibrary(local);
  if (isAccount()) {
    try {
      const { data, stale } = await cachedGet('/artists');
      return { artists: mergeArtists(data, localLib.artists), stale };
    } catch (e) {
      if (!e.offline) throw e;
      return { artists: deriveLibrary(await offlineSongs()).artists, stale: true };
    }
  }
  return { artists: localLib.artists, stale: false };
}

export async function loadArtist(id) {
  if (!id.startsWith('local-') && isAccount()) {
    try {
      const { data, stale } = await cachedGet(`/artists/${id}`);
      // Device-only songs by the same artist show up on the same page
      const keys = new Set([normalizeKey(data.name), ...(data.aliases || [])]);
      const extra = (await offlineSongs({ localOnly: true })).filter((s) => keys.has(normalizeKey(s.artist?.name)));
      return { artist: { ...data, songs: [...data.songs, ...extra] }, stale };
    } catch (e) {
      if (!e.offline) throw e;
    }
  }
  const songs = (await offlineSongs()).filter((s) => s.artist?._id === id);
  if (!songs.length) throw new Error('This artist is not available offline');
  const lib = deriveLibrary(songs);
  return { artist: { ...lib.artists[0], albums: lib.albums, songs, bio: '' }, stale: !id.startsWith('local-') };
}

export async function loadAlbums() {
  const local = await offlineSongs({ localOnly: true });
  const localLib = deriveLibrary(local);
  if (isAccount()) {
    try {
      const { data, stale } = await cachedGet('/albums');
      return { albums: [...data, ...localLib.albums], stale };
    } catch (e) {
      if (!e.offline) throw e;
      return { albums: deriveLibrary(await offlineSongs()).albums, stale: true };
    }
  }
  return { albums: localLib.albums, stale: false };
}

export async function loadAlbum(id) {
  if (!id.startsWith('local-') && isAccount()) {
    try {
      const { data, stale } = await cachedGet(`/albums/${id}`);
      return { album: data, stale };
    } catch (e) {
      if (!e.offline) throw e;
    }
  }
  const songs = (await offlineSongs()).filter((s) => s.album?._id === id).sort(byTrack);
  if (!songs.length) throw new Error('This album is not available offline');
  const lib = deriveLibrary(songs);
  return { album: { ...lib.albums[0], songs }, stale: !id.startsWith('local-') };
}

/* ---------- Playlists ---------- */

function decorateLocalPlaylists(allSongs) {
  const byId = new Map(allSongs.map((s) => [s._id, s]));
  return localPlaylists().map((p) => {
    const songs = p.songs.map((id) => byId.get(id)).filter(Boolean);
    return { ...p, songCount: songs.length, covers: [], coverSongs: songs.slice(0, 4) };
  });
}

export async function loadPlaylists() {
  if (isAccount()) {
    try {
      const { data, stale } = await cachedGet('/playlists');
      return { playlists: data, stale };
    } catch (e) {
      if (!e.offline) throw e;
      return { playlists: [], stale: true };
    }
  }
  return { playlists: decorateLocalPlaylists(await offlineSongs()), stale: false };
}

export async function loadPlaylist(id) {
  if (!id.startsWith('local-pl-')) {
    const { data, stale } = await cachedGet(`/playlists/${id}`);
    return { playlist: data, stale };
  }
  const p = localPlaylists().find((x) => x._id === id);
  if (!p) throw new Error('Playlist not found');
  const byId = new Map((await offlineSongs()).map((s) => [s._id, s]));
  const songs = p.songs.map((sid) => byId.get(sid)).filter(Boolean);
  return { playlist: { ...p, songs, duration: songs.reduce((t, s) => t + (s.duration || 0), 0) }, stale: false };
}

export async function createPlaylist(name, description = '', songs = []) {
  if (isAccount()) return api('/playlists', { method: 'POST', body: { name, description, songs: songs.filter((s) => !s.startsWith('local-')) } });
  return createLocalPlaylist(name, description, songs);
}

export async function addToPlaylist(playlistId, songIds) {
  if (playlistId.startsWith('local-pl-')) {
    return updateLocalPlaylist(playlistId, (p) => ({ songs: [...p.songs, ...songIds.filter((id) => !p.songs.includes(id))] }));
  }
  return api(`/playlists/${playlistId}/songs`, { method: 'POST', body: { songIds: songIds.filter((s) => !s.startsWith('local-')) } });
}

export async function removeFromPlaylist(playlistId, songId) {
  if (playlistId.startsWith('local-pl-')) return updateLocalPlaylist(playlistId, (p) => ({ songs: p.songs.filter((s) => s !== songId) }));
  return api(`/playlists/${playlistId}/songs/${songId}`, { method: 'DELETE' });
}

export async function reorderPlaylist(playlistId, songIds) {
  if (playlistId.startsWith('local-pl-')) return updateLocalPlaylist(playlistId, () => ({ songs: songIds }));
  return api(`/playlists/${playlistId}/songs`, { method: 'PUT', body: { songs: songIds } });
}

export async function updatePlaylist(playlistId, changes) {
  if (playlistId.startsWith('local-pl-')) return updateLocalPlaylist(playlistId, () => changes);
  return api(`/playlists/${playlistId}`, { method: 'PATCH', body: changes });
}

export async function deletePlaylist(playlistId) {
  if (playlistId.startsWith('local-pl-')) return deleteLocalPlaylist(playlistId);
  return api(`/playlists/${playlistId}`, { method: 'DELETE' });
}

/* ---------- Favorites ---------- */

export async function loadFavorites() {
  const ids = favoritesStore.get();
  const { songs, stale } = await loadSongs();
  const byId = new Map(songs.map((s) => [s._id, s]));
  return { songs: [...ids].reverse().map((id) => byId.get(id)).filter(Boolean), stale };
}

/* ---------- Search ---------- */

export async function search(q) {
  const local = await offlineSongs({ localOnly: true });
  const localHits = local.filter((s) => matches(s.title, q) || matches(s.artist?.name, q) || matches(s.album?.title, q));
  if (isAccount()) {
    try {
      const res = await api(`/search?q=${encodeURIComponent(q)}`);
      const localLib = deriveLibrary(localHits);
      return { ...res, songs: [...localHits, ...res.songs], artists: mergeArtists(res.artists, localLib.artists), albums: [...res.albums, ...localLib.albums], stale: false };
    } catch (e) {
      if (!e.offline) throw e;
    }
  }
  const { songs } = await loadSongs();
  const hits = songs.filter((s) => matches(s.title, q) || matches(s.artist?.name, q) || matches(s.album?.title, q));
  const lib = deriveLibrary(hits);
  return {
    songs: hits.slice(0, 50),
    artists: lib.artists.filter((a) => matches(a.name, q)),
    albums: lib.albums.filter((a) => matches(a.title, q)),
    playlists: isAccount() ? [] : localPlaylists().filter((p) => matches(p.name, q)).map((p) => ({ ...p, songCount: p.songs.length })),
    stale: isAccount(),
  };
}

/* ---------- Song editing ---------- */

export async function updateSong(song, changes) {
  if (song._id.startsWith('local-')) {
    const { updateLocalSong } = await import('./downloads.js');
    const next = { ...changes };
    if (changes.artist !== undefined) {
      const key = normalizeKey(changes.artist || 'Unknown Artist');
      next.artist = { _id: `local-artist-${key}`, name: changes.artist || 'Unknown Artist' };
    }
    if (changes.album !== undefined) {
      const aKey = normalizeKey(next.artist?.name || song.artist?.name);
      next.album = { _id: `local-album-${aKey}-${normalizeKey(changes.album || 'Singles')}`, title: changes.album || 'Singles' };
    }
    return updateLocalSong(song._id, next);
  }
  const updated = await api(`/songs/${song._id}`, { method: 'PATCH', body: changes });
  const { refreshDownloadedMeta } = await import('./downloads.js');
  await refreshDownloadedMeta(updated);
  return updated;
}

export async function deleteSong(song) {
  const { deleteLocalSong, removeDownload } = await import('./downloads.js');
  if (song._id.startsWith('local-')) return deleteLocalSong(song._id);
  await api(`/songs/${song._id}`, { method: 'DELETE' });
  if (isDownloaded(song._id)) await removeDownload(song._id);
}

export async function loadStats() {
  return cachedGet('/me/stats');
}
