import Song from '../models/Song.js';

/**
 * Per-artist / per-album song counts and total duration.
 * Done in JS (not $group) — a personal library is small and this keeps
 * the queries portable across MongoDB-compatible databases.
 */
export async function libraryCounts(owner) {
  const songs = await Song.find({ owner }).select('artist album duration').lean();
  const artists = new Map();
  const albums = new Map();
  for (const s of songs) {
    const a = artists.get(String(s.artist)) || { songs: 0, duration: 0, albums: new Set() };
    a.songs += 1;
    a.duration += s.duration || 0;
    if (s.album) a.albums.add(String(s.album));
    artists.set(String(s.artist), a);
    if (s.album) {
      const al = albums.get(String(s.album)) || { songs: 0, duration: 0 };
      al.songs += 1;
      al.duration += s.duration || 0;
      albums.set(String(s.album), al);
    }
  }
  return { artists, albums, totalSongs: songs.length, totalDuration: songs.reduce((t, s) => t + (s.duration || 0), 0) };
}
