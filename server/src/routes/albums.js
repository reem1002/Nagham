import { Router } from 'express';
import Album from '../models/Album.js';
import Song from '../models/Song.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { libraryCounts } from '../utils/counts.js';
import { SONG_POPULATE } from './songs.js';

const router = Router();

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const [albums, counts] = await Promise.all([
      Album.find({ owner: req.user._id }).sort({ title: 1 }).populate('artist', 'name').lean(),
      libraryCounts(req.user._id),
    ]);
    res.json(
      albums.map((a) => {
        const c = counts.albums.get(String(a._id));
        return { ...a, songCount: c?.songs || 0, duration: c?.duration || 0 };
      })
    );
  })
);

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const album = await Album.findOne({ _id: req.params.id, owner: req.user._id }).populate('artist', 'name image').lean();
    if (!album) throw new HttpError(404, 'Album not found');
    const songs = await Song.find({ owner: req.user._id, album: album._id })
      .sort({ trackNo: 1, title: 1 })
      .populate(SONG_POPULATE);
    res.json({ ...album, songs });
  })
);

export default router;
