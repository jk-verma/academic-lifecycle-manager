import express from 'express';
import { z } from 'zod';
import { db } from '../db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { writeAudit } from '../services/audit.js';
import { filterOrMask, isWriter } from '../services/visibility.js';

const router = express.Router();
const visibilityEnum = z.enum(['admin-only', 'supervisor-only', 'internal-team', 'candidate-visible', 'sanitized-external']);

const projectSchema = z.object({
  title: z.string().min(2),
  type: z.string().min(2),
  funding_agency: z.string().optional().nullable(),
  pi: z.string().optional().nullable(),
  co_pi: z.string().optional().nullable(),
  team: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  proposal_status: z.string().optional().nullable(),
  office_noc: z.string().optional().nullable(),
  submission_date: z.string().optional().nullable(),
  sanction_date: z.string().optional().nullable(),
  execution_status: z.string().optional().nullable(),
  reporting_deadline: z.string().optional().nullable(),
  deliverables: z.string().optional().nullable(),
  utilization: z.string().optional().nullable(),
  status: z.string().default('idea'),
  visibility: visibilityEnum.default('admin-only')
});

const publicationSchema = z.object({
  title: z.string().min(2),
  co_authors: z.string().optional().nullable(),
  journal: z.string().optional().nullable(),
  indexing: z.string().optional().nullable(),
  quartile: z.string().optional().nullable(),
  submission_date: z.string().optional().nullable(),
  revision_cycle: z.string().optional().nullable(),
  reviewer_comments: z.string().optional().nullable(),
  accepted_at: z.string().optional().nullable(),
  published_at: z.string().optional().nullable(),
  doi: z.string().optional().nullable(),
  apc: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
  status: z.string().default('idea'),
  visibility: visibilityEnum.default('admin-only')
});

const bookSchema = z.object({
  kind: z.string().default('authored_book'),
  title: z.string().min(2),
  publisher: z.string().optional().nullable(),
  proposal: z.string().optional().nullable(),
  contract: z.string().optional().nullable(),
  manuscript_progress: z.number().int().min(0).max(100).default(0),
  submission_date: z.string().optional().nullable(),
  revision_notes: z.string().optional().nullable(),
  proof_status: z.string().optional().nullable(),
  isbn: z.string().optional().nullable(),
  published_at: z.string().optional().nullable(),
  status: z.string().default('idea'),
  visibility: visibilityEnum.default('admin-only')
});

const consultancySchema = z.object({
  organization: z.string().min(2),
  engagement_type: z.string().min(2),
  noc_status: z.string().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  honorarium: z.number().optional().nullable(),
  billing_status: z.string().optional().nullable(),
  deliverables: z.string().optional().nullable(),
  status: z.string().default('idea'),
  visibility: visibilityEnum.default('admin-only')
});

const conferenceSchema = z.object({
  title: z.string().min(2),
  conference_name: z.string().min(2),
  venue: z.string().optional().nullable(),
  deadline: z.string().optional().nullable(),
  submission_date: z.string().optional().nullable(),
  review_status: z.string().optional().nullable(),
  presentation_date: z.string().optional().nullable(),
  publication_status: z.string().optional().nullable(),
  doi_isbn: z.string().optional().nullable(),
  status: z.string().default('idea'),
  visibility: visibilityEnum.default('admin-only')
});

const moocSchema = z.object({
  course_title: z.string().min(2),
  platform: z.string().optional().nullable(),
  proposal: z.string().optional().nullable(),
  noc_status: z.string().optional().nullable(),
  content_progress: z.number().int().min(0).max(100).default(0),
  recording_status: z.string().optional().nullable(),
  upload_status: z.string().optional().nullable(),
  launch_date: z.string().optional().nullable(),
  status: z.string().default('idea'),
  visibility: visibilityEnum.default('admin-only')
});

const customActivitySchema = z.object({
  activity_type: z.string().min(2),
  title: z.string().min(2),
  description: z.string().optional().nullable(),
  due_date: z.string().optional().nullable(),
  status: z.string().default('active'),
  visibility: visibilityEnum.default('admin-only')
});

function listTable(req, table, sensitiveFields, orderBy = 'updated_at DESC') {
  const { status, type, visibility } = req.query;
  const clauses = ['deleted_at IS NULL'];
  const params = [];
  if (status) {
    clauses.push('status = ?');
    params.push(status);
  }
  if (type && ['projects', 'custom_activities'].includes(table)) {
    clauses.push(table === 'projects' ? 'type = ?' : 'activity_type = ?');
    params.push(type);
  }
  if (visibility) {
    clauses.push('visibility = ?');
    params.push(visibility);
  }
  const rows = db.prepare(`SELECT * FROM ${table} WHERE ${clauses.join(' AND ')} ORDER BY ${orderBy}`).all(...params);
  return filterOrMask(rows, req.user, sensitiveFields);
}

function insertRecord(req, res, table, data, fields) {
  if (!isWriter(req.user)) return res.status(403).json({ error: 'Writers or admins only' });
  const columns = [...fields, 'created_by'];
  const placeholders = columns.map(() => '?').join(', ');
  const values = fields.map((field) => data[field] ?? null);
  const result = db.prepare(`INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`)
    .run(...values, req.user.id);
  writeAudit({ req, action: `create_${table}`, entityType: table, entityId: result.lastInsertRowid });
  res.status(201).json({ id: result.lastInsertRowid });
}

router.use(requireAuth);

router.get('/dashboard', requirePermission('records:read'), (req, res) => {
  const publications = listTable(req, 'publications', ['reviewer_comments', 'notes']);
  const projects = listTable(req, 'projects', ['budget', 'deliverables', 'utilization']);
  const consultancy = listTable(req, 'consultancy', ['honorarium', 'deliverables']);
  const moocs = listTable(req, 'moocs', ['proposal']);
  const today = new Date().toISOString().slice(0, 10);
  res.json({
    active_manuscripts: publications.filter((item) => ['drafting', 'submitted', 'under_review', 'revision'].includes(item.status)),
    pending_submissions: publications.filter((item) => ['idea', 'drafting'].includes(item.status)),
    projects_under_follow_up: projects.filter((item) => ['submission', 'follow-up', 'sanctioned'].includes(item.status)),
    consultancy_engagements: consultancy.filter((item) => item.status !== 'completed'),
    moocs_in_progress: moocs.filter((item) => item.status !== 'launched'),
    overdue_items: [
      ...projects.filter((item) => item.reporting_deadline && item.reporting_deadline < today),
      ...consultancy.filter((item) => item.end_date && item.end_date < today && item.status !== 'completed'),
      ...moocs.filter((item) => item.launch_date && item.launch_date < today && item.status !== 'launched')
    ]
  });
});

router.get('/projects', requirePermission('records:read'), (req, res) => {
  res.json({ projects: listTable(req, 'projects', ['budget', 'deliverables', 'utilization']) });
});

router.post('/projects', requirePermission('records:write'), validate(projectSchema), (req, res) => {
  insertRecord(req, res, 'projects', req.body, Object.keys(projectSchema.shape));
});

router.get('/publications', requirePermission('records:read'), (req, res) => {
  res.json({ publications: listTable(req, 'publications', ['reviewer_comments', 'notes', 'apc']) });
});

router.post('/publications', requirePermission('records:write'), validate(publicationSchema), (req, res) => {
  insertRecord(req, res, 'publications', req.body, Object.keys(publicationSchema.shape));
});

router.get('/books', requirePermission('records:read'), (req, res) => {
  res.json({ books: listTable(req, 'books', ['proposal', 'contract', 'revision_notes']) });
});

router.post('/books', requirePermission('records:write'), validate(bookSchema), (req, res) => {
  insertRecord(req, res, 'books', req.body, Object.keys(bookSchema.shape));
});

router.get('/conferences', requirePermission('records:read'), (req, res) => {
  res.json({ conferences: listTable(req, 'conferences', ['review_status', 'doi_isbn']) });
});

router.post('/conferences', requirePermission('records:write'), validate(conferenceSchema), (req, res) => {
  insertRecord(req, res, 'conferences', req.body, Object.keys(conferenceSchema.shape));
});

router.get('/consultancy', requirePermission('records:read'), (req, res) => {
  res.json({ consultancy: listTable(req, 'consultancy', ['honorarium', 'deliverables']) });
});

router.post('/consultancy', requirePermission('records:write'), validate(consultancySchema), (req, res) => {
  insertRecord(req, res, 'consultancy', req.body, Object.keys(consultancySchema.shape));
});

router.get('/moocs', requirePermission('records:read'), (req, res) => {
  res.json({ moocs: listTable(req, 'moocs', ['proposal']) });
});

router.post('/moocs', requirePermission('records:write'), validate(moocSchema), (req, res) => {
  insertRecord(req, res, 'moocs', req.body, Object.keys(moocSchema.shape));
});

router.get('/custom-activities', requirePermission('records:read'), (req, res) => {
  res.json({ custom_activities: listTable(req, 'custom_activities', ['description']) });
});

router.post('/custom-activities', requirePermission('records:write'), validate(customActivitySchema), (req, res) => {
  insertRecord(req, res, 'custom_activities', req.body, Object.keys(customActivitySchema.shape));
});

export default router;
