import 'dotenv/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const ROOT = path.resolve(__dirname, '../..');
export const UPLOAD_DIR = path.join(ROOT, 'uploads');
export const AUDIO_DIR = path.join(UPLOAD_DIR, 'audio');
export const COVER_DIR = path.join(UPLOAD_DIR, 'covers');

export const env = {
  port: Number(process.env.PORT) || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/nagham',
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '30d',
  clientOrigins: (process.env.CLIENT_ORIGINS || 'http://localhost:5173')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB) || 60,
};

if (env.jwtSecret === 'dev-secret-change-me' && process.env.NODE_ENV === 'production') {
  throw new Error('JWT_SECRET must be set in production');
}
