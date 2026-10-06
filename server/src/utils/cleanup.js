import Song from '../models/Song.js';
import Album from '../models/Album.js';
import Artist from '../models/Artist.js';

/** Removes albums/artists that no longer have any songs. */
export async function cleanupOrphans(owner) {
  const [usedAlbums, usedArtists] = await Promise.all([
    Song.distinct('album', { owner }),
    Song.distinct('artist', { owner }),
  ]);
  await Album.deleteMany({ owner, _id: { $nin: usedAlbums } });
  // Keep artists that have a bio (e.g. the seeded Fairuz page) even when empty
  await Artist.deleteMany({ owner, _id: { $nin: usedArtists }, bio: { $in: ['', null] } });
}
