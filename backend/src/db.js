import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { config } from './config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const schemaPath = path.join(rootDir, 'database', 'schema.sql');
const dbFile = path.resolve(rootDir, config.dbPath);

fs.mkdirSync(path.dirname(dbFile), { recursive: true });

export const db = new Database(dbFile);
db.pragma('foreign_keys = ON');

export function runSchema() {
  db.exec(fs.readFileSync(schemaPath, 'utf8'));
}

function insertRole(name, description) {
  db.prepare('INSERT OR IGNORE INTO roles (name, description) VALUES (?, ?)').run(name, description);
}

function insertPermission(name, description) {
  db.prepare('INSERT OR IGNORE INTO permissions (name, description) VALUES (?, ?)').run(name, description);
}

function roleId(name) {
  return db.prepare('SELECT id FROM roles WHERE name = ?').get(name).id;
}

function permissionId(name) {
  return db.prepare('SELECT id FROM permissions WHERE name = ?').get(name).id;
}

function grant(roleName, permissionName) {
  db.prepare('INSERT OR IGNORE INTO role_permissions (role_id, permission_id) VALUES (?, ?)')
    .run(roleId(roleName), permissionId(permissionName));
}

function createUser({ name, email, password, roles }) {
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  const userId = existing?.id || db.prepare(
    'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
  ).run(name, email, bcrypt.hashSync(password, 12)).lastInsertRowid;

  for (const role of roles) {
    db.prepare('INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)').run(userId, roleId(role));
  }

  return userId;
}

function seedStaticData() {
  const roles = [
    ['ADMIN', 'Full system control'],
    ['WRITER', 'Can add records and append notes'],
    ['VIEWER', 'Read-only access'],
    ['RESTRICTED_EXTERNAL', 'Limited sanitized access for interns and external users']
  ];
  roles.forEach(([name, description]) => insertRole(name, description));

  [
    ['users:manage', 'Create, edit, rotate roles, reset passwords'],
    ['records:write', 'Create and update permitted records'],
    ['records:read', 'Read permitted records'],
    ['records:archive', 'Soft-delete and archive data'],
    ['confidential:read', 'Read admin-only and confidential records'],
    ['audit:read', 'View audit logs'],
    ['exports:read', 'Export summaries and JSON']
  ].forEach(([name, description]) => insertPermission(name, description));

  ['users:manage', 'records:write', 'records:read', 'records:archive', 'confidential:read', 'audit:read', 'exports:read']
    .forEach((permission) => grant('ADMIN', permission));
  ['records:write', 'records:read', 'exports:read'].forEach((permission) => grant('WRITER', permission));
  ['records:read', 'exports:read'].forEach((permission) => grant('VIEWER', permission));
  grant('RESTRICTED_EXTERNAL', 'records:read');

  const programmes = [
    ['masters', 'Masters supervision'],
    ['phd', 'Ph.D. supervision'],
    ['intern', 'Intern supervision']
  ];
  const programmeStmt = db.prepare('INSERT OR IGNORE INTO programmes (programme_type, description) VALUES (?, ?)');
  programmes.forEach((programme) => programmeStmt.run(...programme));

  const phases = {
    masters: ['Synopsis', 'Interim Report', 'Final Report'],
    phd: ['Synopsis Phase', 'Progress Reports + DAC 1', 'Progress Reports + DAC 2', 'Progress Reports + DAC 3', 'Pre-submission Viva'],
    intern: ['Orientation', 'Weekly Review', 'Final Review']
  };
  const phaseStmt = db.prepare('INSERT OR IGNORE INTO phases (programme_id, name, sort_order) VALUES (?, ?, ?)');
  Object.entries(phases).forEach(([programme, names]) => {
    const id = db.prepare('SELECT id FROM programmes WHERE programme_type = ?').get(programme).id;
    names.forEach((name, index) => phaseStmt.run(id, name, index + 1));
  });

  const visibilities = ['admin-only', 'supervisor-only', 'internal-team', 'candidate-visible', 'sanitized-external'];
  const rules = {
    ADMIN: ['admin-only', 'supervisor-only', 'internal-team', 'candidate-visible', 'sanitized-external'],
    WRITER: ['supervisor-only', 'internal-team', 'candidate-visible', 'sanitized-external'],
    VIEWER: ['internal-team', 'candidate-visible', 'sanitized-external'],
    RESTRICTED_EXTERNAL: ['sanitized-external']
  };
  const ruleStmt = db.prepare(
    'INSERT OR IGNORE INTO visibility_rules (visibility, role_name, can_read, can_write) VALUES (?, ?, ?, ?)'
  );
  for (const visibility of visibilities) {
    for (const role of Object.keys(rules)) {
      const canRead = rules[role].includes(visibility) ? 1 : 0;
      const canWrite = ['ADMIN', 'WRITER'].includes(role) && canRead ? 1 : 0;
      ruleStmt.run(visibility, role, canRead, canWrite);
    }
  }
}

function seedRecords() {
  const adminId = createUser({
    name: 'System Admin',
    email: 'admin@research-lifecycle-manager.local',
    password: 'Admin@12345',
    roles: ['ADMIN']
  });
  createUser({ name: 'Research Writer', email: 'writer@research-lifecycle-manager.local', password: 'Writer@12345', roles: ['WRITER'] });
  createUser({ name: 'External Intern', email: 'intern@research-lifecycle-manager.local', password: 'Intern@12345', roles: ['RESTRICTED_EXTERNAL'] });

  if (db.prepare('SELECT COUNT(*) AS count FROM candidates').get().count === 0) {
    const candidateStmt = db.prepare(`INSERT INTO candidates
      (name, email, programme_type, topic, supervisor, start_date, visibility, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
    [
      ['Asha Menon', 'asha@example.edu', 'masters', 'Explainable AI for clinical decision support', 'Dr. Supervisor', '2025-08-01', 'candidate-visible'],
      ['Rahul Nair', 'rahul@example.edu', 'masters', 'IoT-assisted campus energy analytics', 'Dr. Supervisor', '2025-08-01', 'internal-team'],
      ['Meera Iyer', 'meera@example.edu', 'phd', 'Federated learning for biomedical data', 'Dr. Supervisor', '2024-01-10', 'internal-team'],
      ['Kabir Shah', 'kabir@example.edu', 'phd', 'Responsible recommender systems', 'Dr. Supervisor', '2023-07-15', 'supervisor-only'],
      ['Nina Das', 'nina@example.edu', 'intern', 'Literature map for learning analytics', 'Dr. Supervisor', '2026-01-05', 'sanitized-external']
    ].forEach((row) => candidateStmt.run(...row, adminId));
  }

  if (db.prepare('SELECT COUNT(*) AS count FROM meetings').get().count === 0) {
    const meetingStmt = db.prepare(`INSERT INTO meetings
      (candidate_id, programme_type, phase, sub_phase, title, scheduled_at, mode, venue_link, attendees,
       attendance_status, agenda, discussion, decisions, responsible_person, deadlines, satisfaction_status,
       next_meeting_date, visibility, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    meetingStmt.run(1, 'masters', 'Synopsis', null, 'Synopsis framing discussion', '2026-02-12T10:00:00.000Z', 'offline', 'Department room 204', JSON.stringify(['Supervisor', 'Asha Menon']), 'present', 'Scope review and methodology plan', 'Candidate refined the problem statement and dataset criteria.', 'Proceed with literature matrix and ethics checklist.', 'Asha Menon', '2026-02-25', 'satisfied', '2026-03-01', 'candidate-visible', adminId);
    meetingStmt.run(3, 'phd', 'Progress Reports + DAC 1', 'DAC 1', 'DAC suggestion review', '2026-03-05T09:30:00.000Z', 'online', 'https://meet.example.edu/dac1', JSON.stringify(['Supervisor', 'DAC Member 1', 'Meera Iyer']), 'present', 'Track DAC suggestions and compliance plan', 'Methodology comments need confidential internal handling.', 'Create compliance items before next DAC.', 'Meera Iyer', '2026-04-15', 'partially_satisfied', '2026-04-20', 'internal-team', adminId);
    meetingStmt.run(5, 'intern', 'Weekly Review', null, 'Intern weekly checkpoint', '2026-03-20T14:00:00.000Z', 'online', 'https://meet.example.edu/intern', JSON.stringify(['Supervisor', 'Nina Das']), 'present', 'Review literature map', 'Progress is on track; sensitive project details withheld.', 'Share sanitized reading list.', 'Nina Das', '2026-03-27', 'satisfied', '2026-03-27', 'sanitized-external', adminId);
  }

  if (db.prepare('SELECT COUNT(*) AS count FROM notes').get().count === 0) {
    db.prepare('INSERT INTO notes (parent_type, parent_id, note_type, body, visibility, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run('meeting', 2, 'confidential', 'Confidential content hidden from candidate and external viewers until DAC minutes are finalized.', 'admin-only', adminId);
    db.prepare('INSERT INTO notes (parent_type, parent_id, note_type, body, visibility, created_by) VALUES (?, ?, ?, ?, ?, ?)')
      .run('meeting', 1, 'comment', 'Student-visible summary added after meeting.', 'candidate-visible', adminId);
  }

  if (db.prepare('SELECT COUNT(*) AS count FROM compliance_items').get().count === 0) {
    db.prepare(`INSERT INTO compliance_items
      (candidate_id, phase, suggestion, compliance_status, evidence, visibility, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(3, 'Progress Reports + DAC 1', 'Add ablation study for privacy-preserving model comparison.', 'pending', 'Draft experiment plan', 'internal-team', adminId);
  }

  if (db.prepare('SELECT COUNT(*) AS count FROM projects').get().count === 0) {
    db.prepare(`INSERT INTO projects
      (title, type, funding_agency, pi, co_pi, team, budget, proposal_status, office_noc, submission_date,
       reporting_deadline, deliverables, status, visibility, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('AI-enabled rural health decision support', 'sponsored_project', 'DST', 'Dr. Supervisor', 'Dr. Collaborator', 'Research group', 2400000, 'submitted', 'approved', '2026-01-20', '2026-06-30', 'Prototype, report, workshop', 'follow-up', 'admin-only', adminId);
  }

  if (db.prepare('SELECT COUNT(*) AS count FROM publications').get().count === 0) {
    db.prepare(`INSERT INTO publications
      (title, co_authors, journal, indexing, quartile, submission_date, revision_cycle, reviewer_comments,
       doi, apc, notes, status, visibility, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .run('Trust-aware federated learning for clinical analytics', 'M. Iyer; R. Nair', 'Journal of Biomedical Informatics', 'Scopus, SCI', 'Q1', '2026-02-01', 'R1', 'Minor revision requested', null, 0, 'Respond before deadline', 'revision', 'admin-only', adminId);
  }
}

export function initializeDatabase() {
  runSchema();
  seedStaticData();
  seedRecords();
}

initializeDatabase();

if (process.argv.includes('--init')) {
  console.log(`Initialized research-lifecycle-manager database at ${dbFile}`);
}
