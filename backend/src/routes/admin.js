import express from 'express';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { db } from '../db.js';
import { requirePermission, requireRole } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeAudit } from '../services/audit.js';

const router = express.Router();

const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  roles: z.array(z.enum(['ADMIN', 'WRITER', 'VIEWER', 'RESTRICTED_EXTERNAL'])).min(1)
});

const roleSchema = z.object({
  roles: z.array(z.enum(['ADMIN', 'WRITER', 'VIEWER', 'RESTRICTED_EXTERNAL'])).min(1)
});

const resetSchema = z.object({
  password: z.string().min(8)
});

router.use(requireRole('ADMIN'));

router.get('/users', requirePermission('users:manage'), (_req, res) => {
  const users = db.prepare(`SELECT id, name, email, status, created_at, updated_at, deleted_at
    FROM users ORDER BY created_at DESC`).all();
  const roleStmt = db.prepare(`SELECT roles.name FROM roles
    JOIN user_roles ON user_roles.role_id = roles.id
    WHERE user_roles.user_id = ?`);
  res.json({ users: users.map((user) => ({ ...user, roles: roleStmt.all(user.id).map((row) => row.name) })) });
});

router.post('/users', requirePermission('users:manage'), validate(userSchema), (req, res) => {
  const { name, email, password, roles } = req.body;
  const result = db.prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
    .run(name, email, bcrypt.hashSync(password, 12));
  const roleId = db.prepare('SELECT id FROM roles WHERE name = ?');
  const assign = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
  roles.forEach((role) => assign.run(result.lastInsertRowid, roleId.get(role).id));
  writeAudit({ req, action: 'create_user', entityType: 'user', entityId: result.lastInsertRowid, metadata: { roles } });
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/users/:id/roles', requirePermission('users:manage'), validate(roleSchema), (req, res) => {
  const userId = Number(req.params.id);
  db.prepare('DELETE FROM user_roles WHERE user_id = ?').run(userId);
  const roleId = db.prepare('SELECT id FROM roles WHERE name = ?');
  const assign = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
  req.body.roles.forEach((role) => assign.run(userId, roleId.get(role).id));
  writeAudit({ req, action: 'rotate_roles', entityType: 'user', entityId: userId, metadata: { roles: req.body.roles } });
  res.json({ ok: true });
});

router.post('/users/:id/reset-password', requirePermission('users:manage'), validate(resetSchema), (req, res) => {
  const userId = Number(req.params.id);
  db.prepare('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
    .run(bcrypt.hashSync(req.body.password, 12), userId);
  db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  writeAudit({ req, action: 'reset_password', entityType: 'user', entityId: userId });
  res.json({ ok: true });
});

router.post('/archive/:entity/:id', requirePermission('records:archive'), (req, res) => {
  const allowed = ['users', 'candidates', 'meetings', 'projects', 'publications', 'books', 'conferences', 'consultancy', 'moocs', 'custom_activities', 'notes'];
  if (!allowed.includes(req.params.entity)) return res.status(400).json({ error: 'Unsupported entity' });
  db.prepare(`UPDATE ${req.params.entity} SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`).run(Number(req.params.id));
  writeAudit({ req, action: 'soft_delete', entityType: req.params.entity, entityId: Number(req.params.id) });
  res.json({ ok: true });
});

export default router;
