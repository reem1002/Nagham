import { Router } from 'express';
import Song from '../models/Song.js';
import User from '../models/User.js';
import PlayEvent from '../models/PlayEvent.js';
import Playlist from '../models/Playlist.js';
import Artist from '../models/Artist.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { SONG_POPULATE } from './songs.js';
import { libraryCounts } from '../utils/counts.js';

const router = Router();

/* ---------- Favorites ---------- */
router.get(
  '/favorites',
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user._id).populate({ path: 'favorites', populate: SONG_POPULATE });
    res.json(user.favorites.filter(Boolean).reverse());
  })
);

router.post(
  '/favorites/:songId',
  asyncHandler(async (req, res) => {
    const ok = await Song.exists({ _id: req.params.songId, owner: req.user._id });
    if (!ok) throw new HttpError(404, 'Song not found');
    await User.updateOne({ _id: req.user._id }, { $addToSet: { favorites: req.params.songId } });
    res.json({ ok: true });
  })
);

router.delete(
  '/favorites/:songId',
  asyncHandler(async (req, res) => {
    await User.updateOne({ _id: req.user._id }, { $pull: { favorites: req.params.songId } });
    res.json({ ok: true });
  })
);

/* ---------- Listening history ---------- */

// Accepts a single event or a batch (the app queues plays while offline and syncs later)
router.post(
  '/history',
  asyncHandler(async (req, res) => {
    const events = Array.isArray(req.body?.events) ? req.body.events : [req.body];
    const ids = events.map((e) => e?.songId).filter(Boolean);
    const valid = new Set((await Song.find({ _id: { $in: ids }, owner: req.user._id }).distinct('_id')).map(String));
    const docs = events
      .filter((e) => valid.has(String(e.songId)))
      .map((e) => ({
        user: req.user._id,
        song: e.songId,
        playedAt: e.playedAt ? new Date(e.playedAt) : new Date(),
        secondsListened: Math.max(0, Number(e.secondsListened) || 0),
        completed: !!e.completed,
      }));
    if (docs.length) {
      await PlayEvent.insertMany(docs);
      for (const d of docs) {
        await Song.updateOne(
          { _id: d.song },
          { $inc: { playCount: 1 }, $max: { lastPlayedAt: d.playedAt } }
        );
      }
    }
    res.status(201).json({ saved: docs.length });
  })
);

// Distinct recently played songs
router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const songs = await Song.find({ owner: req.user._id, lastPlayedAt: { $ne: null } })
      .sort({ lastPlayedAt: -1 })
      .limit(limit)
      .populate(SONG_POPULATE);
    res.json(songs);
  })
);

router.get(
  '/history',
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 100, 500);
    const events = await PlayEvent.find({ user: req.user._id })
      .sort({ playedAt: -1 })
      .limit(limit)
      .populate({ path: 'song', populate: SONG_POPULATE });
    res.json(events.filter((e) => e.song));
  })
);

router.get(
  '/stats',
  asyncHandler(async (req, res) => {
    const since = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const [events, counts] = await Promise.all([
      PlayEvent.find({ user: req.user._id, playedAt: { $gte: since } }).select('song secondsListened playedAt').lean(),
      libraryCounts(req.user._id),
    ]);
    const perSong = new Map();
    const perDay = new Map();
    let seconds = 0;
    for (const e of events) {
      seconds += e.secondsListened || 0;
      perSong.set(String(e.song), (perSong.get(String(e.song)) || 0) + 1);
      const day = e.playedAt.toISOString().slice(0, 10);
      perDay.set(day, (perDay.get(day) || 0) + (e.secondsListened || 0));
    }
    const topIds = [...perSong.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
    const topSongs = await Song.find({ _id: { $in: topIds.map(([id]) => id) } }).populate(SONG_POPULATE);
    const byId = new Map(topSongs.map((s) => [String(s._id), s]));
    const artistSeconds = new Map();
    topSongs.forEach((s) => {
      const k = String(s.artist?._id);
      artistSeconds.set(k, (artistSeconds.get(k) || 0) + perSong.get(String(s._id)));
    });
    const topArtistIds = [...artistSeconds.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const artists = await Artist.find({ _id: { $in: topArtistIds.map(([id]) => id) } }).lean();
    const artistById = new Map(artists.map((a) => [String(a._id), a]));
    res.json({
      minutesLast30Days: Math.round(seconds / 60),
      playsLast30Days: events.length,
      librarySongs: counts.totalSongs,
      libraryMinutes: Math.round(counts.totalDuration / 60),
      topSongs: topIds.map(([id, plays]) => ({ song: byId.get(id), plays })).filter((x) => x.song),
      topArtists: topArtistIds.map(([id, plays]) => ({ artist: artistById.get(id), plays })).filter((x) => x.artist),
      daily: [...perDay.entries()].sort().map(([day, s]) => ({ day, minutes: Math.round(s / 60) })),
    });
  })
);

/* ---------- Home feed ---------- */
router.get(
  '/home',
  asyncHandler(async (req, res) => {
    const owner = req.user._id;
    const [recent, added, mostPlayed, playlists, artists, counts, user] = await Promise.all([
      Song.find({ owner, lastPlayedAt: { $ne: null } }).sort({ lastPlayedAt: -1 }).limit(12).populate(SONG_POPULATE),
      Song.find({ owner }).sort({ createdAt: -1 }).limit(12).populate(SONG_POPULATE),
      Song.find({ owner, playCount: { $gt: 0 } }).sort({ playCount: -1 }).limit(12).populate(SONG_POPULATE),
      Playlist.find({ owner }).sort({ pinned: -1, updatedAt: -1 }).limit(10).populate({ path: 'songs', select: 'cover' }).lean(),
      Artist.find({ owner }).lean(),
      libraryCounts(owner),
      User.findById(owner).select('favorites').lean(),
    ]);
    res.json({
      recent,
      added,
      mostPlayed,
      playlists: playlists.map((p) => ({
        ...p,
        songCount: p.songs.length,
        covers: p.songs.map((s) => s?.cover).filter(Boolean).slice(0, 4),
        songs: undefined,
      })),
      artists: artists
        .map((a) => ({ ...a, songCount: counts.artists.get(String(a._id))?.songs || 0 }))
        .sort((a, b) => b.songCount - a.songCount)
        .slice(0, 12),
      totals: { songs: counts.totalSongs, minutes: Math.round(counts.totalDuration / 60), favorites: user?.favorites?.length || 0 },
    });
  })
);

export default router;
