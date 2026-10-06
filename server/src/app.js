import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import fs from 'node:fs';
import { env, AUDIO_DIR, COVER_DIR } from './config/env.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error.js';
import authRoutes from './routes/auth.js';
import songRoutes from './routes/songs.js';
import artistRoutes from './routes/artists.js';
import albumRoutes from './routes/albums.js';
import playlistRoutes from './routes/playlists.js';
import meRoutes from './routes/me.js';
import searchRoutes from './routes/search.js';

[AUDIO_DIR, COVER_DIR].forEach((d) => fs.mkdirSync(d, { recursive: true }));

export function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(
    cors({
      origin(origin, cb) {
        // Same-origin / curl (no origin), configured origins, localhost on any port,
        // the Capacitor app, and LAN addresses (phone testing against a laptop)
        const allowed =
          !origin ||
          env.clientOrigins.includes(origin) ||
          /^(https?|capacitor):\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin) ||
          /^https?:\/\/(192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(origin);
        cb(null, allowed);
      },
      exposedHeaders: ['Content-Length', 'Content-Range', 'Accept-Ranges', 'Content-Disposition'],
    })
  );
  app.use(express.json({ limit: '1mb' }));
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.get('/api/health', (req, res) => res.json({ ok: true, time: new Date().toISOString() }));

  // Cover images are content-addressed and public; audio always goes through auth.
  app.use('/media/covers', express.static(COVER_DIR, { maxAge: '365d', immutable: true }));

  app.use('/api/auth', authRoutes);
  app.use('/api/songs', requireAuth, songRoutes);
  app.use('/api/artists', requireAuth, artistRoutes);
  app.use('/api/albums', requireAuth, albumRoutes);
  app.use('/api/playlists', requireAuth, playlistRoutes);
  app.use('/api/me', requireAuth, meRoutes);
  app.use('/api/search', requireAuth, searchRoutes);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
