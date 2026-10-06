import { Router } from 'express';
import Song from '../models/Song.js';
import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import Playlist from '../models/Playlist.js';
import { asyncHandler } from '../middleware/error.js';
import { looseRegex } from '../utils/text.js';
import { SONG_POPULATE } from './songs.js';

const router = Router();

// GET /api/search?q=نسم
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const q = (req.query.q || '').trim();
    if (!q) return res.json({ songs: [], artists: [], albums: [], playlists: [] });
    const rx = looseRegex(q);
    const owner = req.user._id;
    const [artists, albums, playlists] = await Promise.all([
      Artist.find({ owner, $or: [{ name: rx }, { aliases: rx }] }).limit(10).lean(),
      Album.find({ owner, title: rx }).limit(10).populate('artist', 'name').lean(),
      Playlist.find({ owner, name: rx }).limit(10).lean(),
    ]);
    // Songs match on their own title OR their artist/album name
    const songs = await Song.find({
      owner,
      $or: [{ title: rx }, { artist: { $in: artists.map((a) => a._id) } }, { album: { $in: albums.map((a) => a._id) } }, { lyrics: rx }],
    })
      .limit(50)
      .populate(SONG_POPULATE);
    res.json({ songs, artists, albums, playlists: playlists.map((p) => ({ ...p, songCount: p.songs.length, songs: undefined })) });
  })
);

export default router;
