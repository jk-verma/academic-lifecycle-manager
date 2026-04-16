import express from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeAudit } from '../services/audit.js';
import { filterOrMask, isAdmin, isWriter, maskRecordForUser } from '../services/visibility.js';

const router = express.Router();
const visibilityEnum = z.enum(['admin-only', 'supervisor-only', 'internal-team', 'candidate-visible', 'sanitized-external']);

const candidateSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().nullable(),
  programme_type: z.enum(['masters', 'phd', 'intern']),
  topic: z.string().optional().nullable(),
  supervisor: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  visibility: visibilityEnum.default('internal-team')
});

const meetingSchema = z.object({
  candidate_id: z.number().int().positive(),
  programme_type: z.enum(['masters', 'phd', 'intern']),
  phase: z.string().min(2),
  sub_phase: z.string().optional().nullable(),
  title: z.string().min(2),
  scheduled_at: z.string().min(8),
  mode: z.string().min(2),
  venue_link: z.string().optional().nullable(),
  attendees: z.array(z.string()).default([]),
  attendance_status: z.string().default('pending'),
  agenda: z.string().optional().nullable(),
  discussion: z.string().optional().nullable(),
  decisions: z.string().optional().nullable(),
  action_items: z.array(z.object({
    title: z.string().min(2),
    responsible_person: z.string().optional().nullable(),
    deadline: z.string().optional().nullable(),
    visibility: visibilityEnum.default('internal-team')
  })).default([]),
  responsible_person: z.string().optional().nullable(),
  deadlines: z.string().optional().nullable(),
  satisfaction_status: z.string().default('pending'),
  next_meeting_date: z.string().optional().nullable(),
  visibility: visibilityEnum.default('internal-team'),
  status: z.string().default('active')
});

const noteSchema = z.object({
  parent_type: z.enum(['meeting', 'candidate', 'project', 'publication', 'book', 'conference', 'consultancy', 'mooc', 'custom_activity']),
  parent_id: z.number().int().positive(),
  note_type: z.string().default('comment'),
  body: z.string().min(1),
  visibility: visibilityEnum.default('internal-team')
});

const complianceSchema = z.object({
  candidate_id: z.number().int().positive(),
  phase: z.string().min(2),
  suggestion: z.string().min(2),
  compliance_status: z.string().default('pending'),
  evidence: z.string().optional().nullable(),
  visibility: visibilityEnum.default('internal-team')
});

router.use(requireAuth);

router.get('/programmes', (_req, res) => {
  const programmes = db.prepare('SELECT * FROM programmes ORDER BY programme_type').all();
  const phases = db.prepare('SELECT phases.*, programmes.programme_type FROM phases JOIN programmes ON programmes.id = phases.programme_id ORDER BY sort_order').all();
  res.json({ programmes, phases });
});

router.get('/candidates', requirePermission('records:read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM candidates WHERE deleted_at IS NULL ORDER BY updated_at DESC').all();
  res.json({
    candidates: filterOrMask(rows, req.user, ['topic', 'supervisor', 'email'])
  });
});

router.post('/candidates', requirePermission('records:write'), validate(candidateSchema), (req, res) => {
  if (!isWriter(req.user)) return res.status(403).json({ error: 'Writers or admins only' });
  const data = req.body;
  const result = db.prepare(`INSERT INTO candidates
    (name, email, programme_type, topic, supervisor, start_date, visibility, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(data.name, data.email, data.programme_type, data.topic, data.supervisor, data.start_date, data.visibility, req.user.id);
  writeAudit({ req, action: 'create_candidate', entityType: 'candidate', entityId: result.lastInsertRowid });
  res.status(201).json({ id: result.lastInsertRowid });
});

router.get('/candidates/:id', requirePermission('records:read'), (req, res) => {
  const candidate = db.prepare('SELECT * FROM candidates WHERE id = ? AND deleted_at IS NULL').get(Number(req.params.id));
  if (!candidate) return res.status(404).json({ error: 'Candidate not found' });

  const maskedCandidate = maskRecordForUser(candidate, req.user, ['topic', 'supervisor', 'email']);
  const meetings = db.prepare('SELECT * FROM meetings WHERE candidate_id = ? AND deleted_at IS NULL ORDER BY scheduled_at DESC')
    .all(candidate.id)
    .map((meeting) => ({ ...meeting, attendees: JSON.parse(meeting.attendees || '[]') }));
  const compliance = db.prepare('SELECT * FROM compliance_items WHERE candidate_id = ? AND deleted_at IS NULL ORDER BY created_at DESC')
    .all(candidate.id);
  res.json({
    candidate: maskedCandidate,
    meetings: filterOrMask(meetings, req.user, ['agenda', 'discussion', 'decisions', 'responsible_person', 'deadlines']),
    compliance: filterOrMask(compliance, req.user, ['suggestion', 'evidence'])
  });
});

router.get('/meetings', requirePermission('records:read'), (req, res) => {
  const { status, visibility, candidate_id } = req.query;
  const clauses = ['meetings.deleted_at IS NULL'];
  const params = [];
  if (status) {
    clauses.push('meetings.status = ?');
    params.push(status);
  }
  if (visibility) {
    clauses.push('meetings.visibility = ?');
    params.push(visibility);
  }
  if (candidate_id) {
    clauses.push('meetings.candidate_id = ?');
    params.push(Number(candidate_id));
  }
  const rows = db.prepare(`SELECT meetings.*, candidates.name AS candidate_name
    FROM meetings JOIN candidates ON candidates.id = meetings.candidate_id
    WHERE ${clauses.join(' AND ')} ORDER BY scheduled_at DESC`).all(...params)
    .map((meeting) => ({ ...meeting, attendees: JSON.parse(meeting.attendees || '[]') }));
  res.json({ meetings: filterOrMask(rows, req.user, ['agenda', 'discussion', 'decisions', 'responsible_person', 'deadlines']) });
});

router.post('/meetings', requirePermission('records:write'), validate(meetingSchema), (req, res) => {
  if (!isWriter(req.user)) return res.status(403).json({ error: 'Writers or admins only' });
  const data = req.body;
  const result = db.prepare(`INSERT INTO meetings
    (candidate_id, programme_type, phase, sub_phase, title, scheduled_at, mode, venue_link, attendees,
     attendance_status, agenda, discussion, decisions, responsible_person, deadlines, satisfaction_status,
     next_meeting_date, visibility, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(data.candidate_id, data.programme_type, data.phase, data.sub_phase, data.title, data.scheduled_at,
      data.mode, data.venue_link, JSON.stringify(data.attendees), data.attendance_status, data.agenda,
      data.discussion, data.decisions, data.responsible_person, data.deadlines, data.satisfaction_status,
      data.next_meeting_date, data.visibility, data.status, req.user.id);

  const itemStmt = db.prepare(`INSERT INTO action_items
    (meeting_id, parent_type, parent_id, title, responsible_person, deadline, visibility, created_by)
    VALUES (?, 'meeting', ?, ?, ?, ?, ?, ?)`);
  data.action_items.forEach((item) => {
    itemStmt.run(result.lastInsertRowid, result.lastInsertRowid, item.title, item.responsible_person, item.deadline, item.visibility, req.user.id);
  });
  db.prepare(`INSERT INTO meeting_versions (meeting_id, version_number, snapshot_json, changed_by)
    VALUES (?, 1, ?, ?)`).run(result.lastInsertRowid, JSON.stringify(data), req.user.id);
  writeAudit({ req, action: 'create_meeting', entityType: 'meeting', entityId: result.lastInsertRowid });
  res.status(201).json({ id: result.lastInsertRowid });
});

router.put('/meetings/:id', requirePermission('records:write'), validate(meetingSchema.omit({ candidate_id: true, programme_type: true }).partial()), (req, res) => {
  if (!isAdmin(req.user)) return res.status(403).json({ error: 'Only admins may revise existing meeting records; writers append comments instead' });
  const meetingId = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL').get(meetingId);
  if (!existing) return res.status(404).json({ error: 'Meeting not found' });

  const updated = { ...existing, ...req.body, attendees: req.body.attendees ? JSON.stringify(req.body.attendees) : existing.attendees };
  db.prepare(`UPDATE meetings SET
    phase = ?, sub_phase = ?, title = ?, scheduled_at = ?, mode = ?, venue_link = ?, attendees = ?,
    attendance_status = ?, agenda = ?, discussion = ?, decisions = ?, responsible_person = ?, deadlines = ?,
    satisfaction_status = ?, next_meeting_date = ?, visibility = ?, status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?`)
    .run(updated.phase, updated.sub_phase, updated.title, updated.scheduled_at, updated.mode, updated.venue_link,
      updated.attendees, updated.attendance_status, updated.agenda, updated.discussion, updated.decisions,
      updated.responsible_person, updated.deadlines, updated.satisfaction_status, updated.next_meeting_date,
      updated.visibility, updated.status, meetingId);
  const nextVersion = db.prepare('SELECT COALESCE(MAX(version_number), 0) + 1 AS next FROM meeting_versions WHERE meeting_id = ?').get(meetingId).next;
  db.prepare('INSERT INTO meeting_versions (meeting_id, version_number, snapshot_json, changed_by) VALUES (?, ?, ?, ?)')
    .run(meetingId, nextVersion, JSON.stringify(updated), req.user.id);
  writeAudit({ req, action: 'revise_meeting', entityType: 'meeting', entityId: meetingId, metadata: { version: nextVersion } });
  res.json({ ok: true, version: nextVersion });
});

router.get('/meetings/:id', requirePermission('records:read'), (req, res) => {
  const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL').get(Number(req.params.id));
  if (!meeting) return res.status(404).json({ error: 'Meeting not found' });
  const notes = db.prepare('SELECT notes.*, users.name AS author FROM notes JOIN users ON users.id = notes.created_by WHERE parent_type = ? AND parent_id = ? AND notes.deleted_at IS NULL ORDER BY notes.created_at ASC')
    .all('meeting', meeting.id);
  const actions = db.prepare('SELECT * FROM action_items WHERE meeting_id = ? AND deleted_at IS NULL ORDER BY deadline ASC').all(meeting.id);
  const versions = isAdmin(req.user)
    ? db.prepare('SELECT id, version_number, changed_by, changed_at FROM meeting_versions WHERE meeting_id = ? ORDER BY version_number DESC').all(meeting.id)
    : [];
  res.json({
    meeting: maskRecordForUser({ ...meeting, attendees: JSON.parse(meeting.attendees || '[]') }, req.user, ['agenda', 'discussion', 'decisions', 'responsible_person', 'deadlines']),
    notes: filterOrMask(notes, req.user, ['body']),
    action_items: filterOrMask(actions, req.user, ['title', 'responsible_person']),
    versions
  });
});

router.post('/notes', requirePermission('records:write'), validate(noteSchema), (req, res) => {
  if (!isWriter(req.user)) return res.status(403).json({ error: 'Writers or admins only' });
  const data = req.body;
  const result = db.prepare(`INSERT INTO notes
    (parent_type, parent_id, note_type, body, visibility, created_by)
    VALUES (?, ?, ?, ?, ?, ?)`)
    .run(data.parent_type, data.parent_id, data.note_type, data.body, data.visibility, req.user.id);
  writeAudit({ req, action: 'append_note', entityType: data.parent_type, entityId: data.parent_id, metadata: { note_id: result.lastInsertRowid } });
  res.status(201).json({ id: result.lastInsertRowid });
});

router.post('/compliance', requirePermission('records:write'), validate(complianceSchema), (req, res) => {
  if (!isWriter(req.user)) return res.status(403).json({ error: 'Writers or admins only' });
  const data = req.body;
  const result = db.prepare(`INSERT INTO compliance_items
    (candidate_id, phase, suggestion, compliance_status, evidence, visibility, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(data.candidate_id, data.phase, data.suggestion, data.compliance_status, data.evidence, data.visibility, req.user.id);
  writeAudit({ req, action: 'create_compliance_item', entityType: 'compliance_item', entityId: result.lastInsertRowid });
  res.status(201).json({ id: result.lastInsertRowid });
});

export default router;
