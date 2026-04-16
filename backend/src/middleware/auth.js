import { createHmac, timingSafeEqual } from 'node:crypto';
import { nanoid } from 'nanoid';
import { db } from '../db.js';
import { config } from '../config.js';

function sign(value) {
  return createHmac('sha256', config.sessionSecret).update(value).digest('hex');
}

export function encodeSessionCookie(sessionId) {
  return `${sessionId}.${sign(sessionId)}`;
}

function decodeSessionCookie(cookieValue) {
  if (!cookieValue || !cookieValue.includes('.')) return null;
  const [sessionId, signature] = cookieValue.split('.');
  const expected = sign(sessionId);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (actualBuffer.length !== expectedBuffer.length) return null;
  return timingSafeEqual(actualBuffer, expectedBuffer) ? sessionId : null;
}

export function createSession({ userId, req }) {
  const sessionId = nanoid(48);
  const expiresAt = new Date(Date.now() + config.sessionDays * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO sessions (id, user_id, expires_at, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?)`)
    .run(sessionId, userId, expiresAt, req.ip, req.get('user-agent') || null);
  return { sessionId, expiresAt };
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: config.secureCookies ? 'none' : 'lax',
    secure: config.secureCookies,
    maxAge: config.sessionDays * 24 * 60 * 60 * 1000,
    path: '/'
  };
}

export function loadUser(req, _res, next) {
  const cookieValue = req.cookies?.[config.sessionCookieName];
  const sessionId = decodeSessionCookie(cookieValue);
  if (!sessionId) return next();

  const session = db.prepare(`SELECT sessions.*, users.name, users.email, users.status
    FROM sessions JOIN users ON users.id = sessions.user_id
    WHERE sessions.id = ? AND sessions.expires_at > CURRENT_TIMESTAMP AND users.deleted_at IS NULL`)
    .get(sessionId);
  if (!session || session.status !== 'active') return next();

  const roles = db.prepare(`SELECT roles.name FROM roles
    JOIN user_roles ON user_roles.role_id = roles.id
    WHERE user_roles.user_id = ?`).all(session.user_id).map((row) => row.name);
  const permissions = db.prepare(`SELECT permissions.name FROM permissions
    JOIN role_permissions ON role_permissions.permission_id = permissions.id
    JOIN user_roles ON user_roles.role_id = role_permissions.role_id
    WHERE user_roles.user_id = ?`).all(session.user_id).map((row) => row.name);

  req.sessionId = sessionId;
  req.user = {
    id: session.user_id,
    name: session.name,
    email: session.email,
    roles,
    permissions: [...new Set(permissions)]
  };
  next();
}

export function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!roles.some((role) => req.user.roles.includes(role))) {
      return res.status(403).json({ error: 'Insufficient role' });
    }
    next();
  };
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (!req.user.permissions.includes(permission)) {
      return res.status(403).json({ error: 'Missing permission' });
    }
    next();
  };
}
