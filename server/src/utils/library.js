import Artist from '../models/Artist.js';
import Album from '../models/Album.js';
import { normalizeKey } from './text.js';

export const UNKNOWN_ARTIST = 'Unknown Artist';
export const SINGLES = 'Singles';

export async function findOrCreateArtist(owner, name) {
  const clean = (name || '').trim() || UNKNOWN_ARTIST;
  const key = normalizeKey(clean);
  const known = await Artist.findOne({ owner, $or: [{ key }, { aliases: key }] });
  if (known) return known;
  return Artist.findOneAndUpdate(
    { owner, key },
    { $setOnInsert: { owner, key, name: clean } },
    { upsert: true, new: true }
  );
}

export async function findOrCreateAlbum(owner, artistId, title, extra = {}) {
  const clean = (title || '').trim() || SINGLES;
  const key = normalizeKey(clean);
  const album = await Album.findOneAndUpdate(
    { owner, artist: artistId, key },
    { $setOnInsert: { owner, artist: artistId, key, title: clean, year: extra.year } },
    { upsert: true, new: true }
  );
  if (!album.cover && extra.cover) {
    album.cover = extra.cover;
    await album.save();
  }
  return album;
}
