import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { config } from '../config.js';
import { createSession, encodeSessionCookie, requireAuth, sessionCookieOptions } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

router.post('/login', validate(loginSchema), (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT * FROM users WHERE email = ? AND deleted_at IS NULL').get(email);
  if (!user || user.status !== 'active' || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const { sessionId } = createSession({ userId: user.id, req });
  res.cookie(config.sessionCookieName, encodeSessionCookie(sessionId), sessionCookieOptions());
  req.user = { id: user.id };
  writeAudit({ req, action: 'login', entityType: 'user', entityId: user.id });
  res.json({ ok: true });
});

router.post('/logout', requireAuth, (req, res) => {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId);
  writeAudit({ req, action: 'logout', entityType: 'session', entityId: null });
  res.clearCookie(config.sessionCookieName, { path: '/' });
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
