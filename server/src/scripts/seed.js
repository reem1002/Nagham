/**
 * npm run seed        -> creates a demo account + an (empty) Fairuz artist page
 * npm run seed:demo   -> same, plus a few synthesized demo tracks so you can test the player
 *
 * No copyrighted audio is included. Add your own Fairuz files from the app's Import screen
 * and they will be grouped under the Fairuz artist automatically.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { AUDIO_DIR, COVER_DIR } from '../config/env.js';
import User from '../models/User.js';
import Artist from '../models/Artist.js';
import Playlist from '../models/Playlist.js';
import Song from '../models/Song.js';
import { normalizeKey } from '../utils/text.js';
import { importAudioFile } from '../utils/importAudio.js';
import { synthWav } from './wav.js';

const DEMO_EMAIL = process.env.SEED_EMAIL || 'demo@nagham.app';
const DEMO_PASSWORD = process.env.SEED_PASSWORD || 'nagham123';

const FAIRUZ_BIO = [
  'فيروز (نهاد وديع حداد) مطربة لبنانية وُلدت عام 1934، وارتبط اسمها بالأخوين رحباني وبابنها زياد الرحباني.',
  'Fairuz is a Lebanese singer whose work with the Rahbani Brothers shaped modern Arabic song. Import your own Fairuz files and they will appear here.',
].join('\n');

const DEMO_TRACKS = [
  { title: 'Morning in Beirut', album: 'Demo Sketches', melody: 'E G A G E D C D E E D', bpm: 92 },
  { title: 'Sea Breeze', album: 'Demo Sketches', melody: 'A c d c A G E G A A', bpm: 84 },
  { title: 'Old Stone Stairs', album: 'Demo Sketches', melody: 'C E G c G E F A c A', bpm: 100 },
  { title: 'نسيم المساء', album: 'مقاطع تجريبية', melody: 'D F A d A F E G B G', bpm: 76 },
  { title: 'قمر الحارة', album: 'مقاطع تجريبية', melody: 'G B d B G A c e c A', bpm: 88 },
  { title: 'Lanterns', album: 'Night Tones', melody: 'e d c A G A c d e', bpm: 70 },
];

async function main() {
  const withDemo = process.argv.includes('--demo');
  await connectDB();
  await fs.mkdir(AUDIO_DIR, { recursive: true });
  await fs.mkdir(COVER_DIR, { recursive: true });

  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({ name: 'Reem', email: DEMO_EMAIL, password: DEMO_PASSWORD });
    console.log(`Created user ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  } else {
    console.log(`User ${DEMO_EMAIL} already exists`);
  }

  const aliases = ['Fairuz', 'فيروز', 'Fairouz', 'Fayrouz', 'Feiruz', 'Fayruz'].map(normalizeKey);
  await Artist.findOneAndUpdate(
    { owner: user._id, key: normalizeKey('Fairuz') },
    {
      $setOnInsert: { owner: user._id, key: normalizeKey('Fairuz') },
      $set: { name: 'فيروز', bio: FAIRUZ_BIO, aliases },
    },
    { upsert: true }
  );
  console.log('Fairuz artist page ready (files tagged Fairuz / فيروز / Fairouz all land here)');

  if (withDemo) {
    const ids = [];
    for (const [i, t] of DEMO_TRACKS.entries()) {
      const buf = synthWav({
        melody: t.melody,
        bpm: t.bpm,
        seconds: 35 + i * 5,
        tags: { INAM: t.title, IART: 'Nagham Demo', IPRD: t.album, IGNR: 'Demo', ITRK: String(i + 1) },
      });
      const tmp = path.join(AUDIO_DIR, `tmp-seed-${i}.wav`);
      await fs.writeFile(tmp, buf);
      try {
        const { song, duplicate } = await importAudioFile(user._id, {
          path: tmp,
          originalname: `${t.title}.wav`,
          mimetype: 'audio/wav',
          size: buf.length,
        });
        ids.push(song._id);
        console.log(`${duplicate ? 'exists ' : 'added  '} ${song.title}`);
      } catch (e) {
        console.error(`failed  ${t.title}: ${e.message}`);
      }
    }
    const exists = await Playlist.exists({ owner: user._id, name: 'Night Drive' });
    if (!exists) {
      await Playlist.create({ owner: user._id, name: 'Night Drive', description: 'Demo playlist', songs: ids.slice(2), pinned: true });
      await Playlist.create({ owner: user._id, name: 'Morning Coffee', description: 'هادئة للصبح', songs: ids.slice(0, 3) });
    }
    user.favorites = ids.slice(0, 2);
    await user.save();
    console.log(`Library has ${await Song.countDocuments({ owner: user._id })} songs`);
  }
  console.log(`\n✓ Done. Sign in with ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error('\nSeed failed:', e.message);
  if (/ECONNREFUSED|ServerSelection/i.test(e.message)) console.error('→ MongoDB is not reachable. Check MONGO_URI in server/.env');
  if (/auth/i.test(e.message)) console.error('→ Wrong MongoDB username/password in MONGO_URI');
  await mongoose.disconnect();
  process.exit(1);
});
