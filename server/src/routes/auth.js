import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { signToken, requireAuth } from '../middleware/auth.js';
import { asyncHandler, HttpError } from '../middleware/error.js';

const router = Router();
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 50, standardHeaders: true, legacyHeaders: false });

router.post(
  '/register',
  limiter,
  asyncHandler(async (req, res) => {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) throw new HttpError(400, 'Name, email and password are required');
    if (password.length < 6) throw new HttpError(400, 'Password must be at least 6 characters');
    if (await User.exists({ email: email.toLowerCase() })) throw new HttpError(409, 'Email is already registered');
    const user = await User.create({ name, email, password });
    res.status(201).json({ token: signToken(user), user });
  })
);

router.post(
  '/login',
  limiter,
  asyncHandler(async (req, res) => {
    const { email, password } = req.body || {};
    const user = await User.findOne({ email: (email || '').toLowerCase() }).select('+password');
    if (!user || !(await user.comparePassword(password || ''))) throw new HttpError(401, 'Wrong email or password');
    res.json({ token: signToken(user), user });
  })
);

router.get('/me', requireAuth, (req, res) => res.json({ user: req.user }));

router.patch(
  '/me',
  requireAuth,
  asyncHandler(async (req, res) => {
    const { name, settings } = req.body || {};
    if (name) req.user.name = name;
    if (settings) req.user.settings = { ...req.user.settings.toObject?.(), ...settings };
    await req.user.save();
    res.json({ user: req.user });
  })
);

export default router;
