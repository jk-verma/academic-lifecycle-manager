import express from 'express';
import { db } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { canReadVisibility, filterOrMask, MASK } from '../services/visibility.js';

const router = express.Router();

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

router.use(requireAuth);

router.get('/audit-logs', requirePermission('audit:read'), (req, res) => {
  const logs = db.prepare(`SELECT audit_logs.*, users.name AS actor_name
    FROM audit_logs LEFT JOIN users ON users.id = audit_logs.actor_user_id
    ORDER BY audit_logs.created_at DESC LIMIT 250`).all();
  res.json({ audit_logs: logs });
});

router.get('/search', requirePermission('records:read'), (req, res) => {
  const q = `%${String(req.query.q || '').trim()}%`;
  if (q === '%%') return res.json({ results: [] });
  const results = [];
  const searches = [
    ['candidate', 'candidates', 'name', ['topic', 'email']],
    ['meeting', 'meetings', 'title', ['agenda', 'discussion', 'decisions']],
    ['publication', 'publications', 'title', ['reviewer_comments', 'notes']],
    ['project', 'projects', 'title', ['budget', 'deliverables', 'utilization']],
    ['consultancy', 'consultancy', 'organization', ['honorarium', 'deliverables']],
    ['mooc', 'moocs', 'course_title', ['proposal']]
  ];

  for (const [type, table, titleField, sensitiveFields] of searches) {
    const rows = db.prepare(`SELECT *, '${type}' AS result_type, ${titleField} AS result_title
      FROM ${table}
      WHERE deleted_at IS NULL AND (${titleField} LIKE ? OR status LIKE ? OR visibility LIKE ?)
      LIMIT 20`).all(q, q, q);
    results.push(...filterOrMask(rows, req.user, sensitiveFields));
  }
  res.json({ results });
});

router.get('/export/:type/:id/json', requirePermission('exports:read'), (req, res) => {
  const id = Number(req.params.id);
  const type = req.params.type;
  if (type === 'candidate') {
    const candidate = db.prepare('SELECT * FROM candidates WHERE id = ? AND deleted_at IS NULL').get(id);
    const meetings = db.prepare('SELECT * FROM meetings WHERE candidate_id = ? AND deleted_at IS NULL').all(id);
    return res.json({ candidate, meetings });
  }
  if (type === 'meeting') {
    const meeting = db.prepare('SELECT * FROM meetings WHERE id = ? AND deleted_at IS NULL').get(id);
    const notes = db.prepare('SELECT * FROM notes WHERE parent_type = ? AND parent_id = ? AND deleted_at IS NULL').all('meeting', id);
    const action_items = db.prepare('SELECT * FROM action_items WHERE meeting_id = ? AND deleted_at IS NULL').all(id);
    return res.json({ meeting, notes, action_items });
  }
  if (type === 'project') {
    return res.json({ project: db.prepare('SELECT * FROM projects WHERE id = ? AND deleted_at IS NULL').get(id) });
  }
  return res.status(400).json({ error: 'Unsupported export type' });
});

router.get('/print/meeting/:id', requirePermission('exports:read'), (req, res) => {
  const meeting = db.prepare(`SELECT meetings.*, candidates.name AS candidate_name
    FROM meetings JOIN candidates ON candidates.id = meetings.candidate_id
    WHERE meetings.id = ? AND meetings.deleted_at IS NULL`).get(Number(req.params.id));
  if (!meeting) return res.status(404).send('Meeting not found');
  const notes = db.prepare('SELECT * FROM notes WHERE parent_type = ? AND parent_id = ? AND deleted_at IS NULL ORDER BY created_at ASC')
    .all('meeting', meeting.id);
  const canReadMeeting = canReadVisibility(req.user, meeting.visibility);
  const printableMeeting = canReadMeeting
    ? meeting
    : { ...meeting, agenda: MASK, discussion: MASK, decisions: MASK };
  const printableNotes = notes.map((note) => canReadVisibility(req.user, note.visibility) ? note : { ...note, body: MASK });
  res.type('html').send(`<!doctype html>
    <html><head><title>${escapeHtml(printableMeeting.title)}</title><style>
      body{font-family:Arial,sans-serif;line-height:1.5;margin:32px;color:#17202a}
      h1{font-size:24px}.meta{color:#566573}.box{border:1px solid #ccd1d1;padding:16px;margin:12px 0}
      @media print{button{display:none}}
    </style></head><body>
      <button onclick="window.print()">Print / Save PDF</button>
      <h1>${escapeHtml(printableMeeting.title)}</h1>
      <p class="meta">${escapeHtml(printableMeeting.candidate_name)} | ${escapeHtml(printableMeeting.programme_type)} | ${escapeHtml(printableMeeting.phase)} | ${escapeHtml(printableMeeting.scheduled_at)}</p>
      <div class="box"><strong>Agenda</strong><p>${escapeHtml(printableMeeting.agenda)}</p></div>
      <div class="box"><strong>Discussion</strong><p>${escapeHtml(printableMeeting.discussion)}</p></div>
      <div class="box"><strong>Decisions</strong><p>${escapeHtml(printableMeeting.decisions)}</p></div>
      <h2>Append-only Comments</h2>
      ${printableNotes.map((note) => `<div class="box"><strong>${escapeHtml(note.note_type)}</strong><p>${escapeHtml(note.body)}</p></div>`).join('')}
    </body></html>`);
});

export default router;
