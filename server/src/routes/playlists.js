import { Router } from 'express';
import Playlist from '../models/Playlist.js';
import Song from '../models/Song.js';
import { asyncHandler, HttpError } from '../middleware/error.js';
import { SONG_POPULATE } from './songs.js';

const router = Router();

async function own(req) {
  const p = await Playlist.findOne({ _id: req.params.id, owner: req.user._id });
  if (!p) throw new HttpError(404, 'Playlist not found');
  return p;
}

async function withSongs(playlist) {
  await playlist.populate({ path: 'songs', populate: SONG_POPULATE });
  const obj = playlist.toObject();
  obj.songs = playlist.songs.filter(Boolean).map((s) => s.toJSON());
  obj.duration = obj.songs.reduce((t, s) => t + (s.duration || 0), 0);
  return obj;
}

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const lists = await Playlist.find({ owner: req.user._id })
      .sort({ pinned: -1, updatedAt: -1 })
      .populate({ path: 'songs', select: 'cover', options: { limit: 4 } })
      .lean();
    res.json(
      lists.map((p) => ({
        ...p,
        songCount: p.songs.length,
        covers: p.songs.map((s) => s?.cover).filter(Boolean).slice(0, 4),
        songs: undefined,
      }))
    );
  })
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const { name, description, songs = [] } = req.body || {};
    if (!name?.trim()) throw new HttpError(400, 'Playlist name is required');
    const valid = await Song.find({ _id: { $in: songs }, owner: req.user._id }).distinct('_id');
    const p = await Playlist.create({ owner: req.user._id, name, description, songs: valid });
    res.status(201).json(await withSongs(p));
  })
);

router.get('/:id', asyncHandler(async (req, res) => res.json(await withSongs(await own(req)))));

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const p = await own(req);
    const { name, description, pinned } = req.body || {};
    if (name !== undefined) p.name = name;
    if (description !== undefined) p.description = description;
    if (pinned !== undefined) p.pinned = !!pinned;
    await p.save();
    res.json(await withSongs(p));
  })
);

// Replace song order: { songs: [id, id, ...] }
router.put(
  '/:id/songs',
  asyncHandler(async (req, res) => {
    const p = await own(req);
    const ids = Array.isArray(req.body?.songs) ? req.body.songs : [];
    const valid = new Set((await Song.find({ _id: { $in: ids }, owner: req.user._id }).distinct('_id')).map(String));
    p.songs = ids.filter((id) => valid.has(String(id)));
    await p.save();
    res.json(await withSongs(p));
  })
);

router.post(
  '/:id/songs',
  asyncHandler(async (req, res) => {
    const p = await own(req);
    const ids = [].concat(req.body?.songId || req.body?.songIds || []);
    const valid = await Song.find({ _id: { $in: ids }, owner: req.user._id }).distinct('_id');
    const existing = new Set(p.songs.map(String));
    valid.forEach((id) => !existing.has(String(id)) && p.songs.push(id));
    await p.save();
    res.json(await withSongs(p));
  })
);

router.delete(
  '/:id/songs/:songId',
  asyncHandler(async (req, res) => {
    const p = await own(req);
    p.songs = p.songs.filter((s) => String(s) !== req.params.songId);
    await p.save();
    res.json(await withSongs(p));
  })
);

router.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const p = await own(req);
    await p.deleteOne();
    res.json({ ok: true });
  })
);

export default router;
