PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS roles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS permissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS user_roles (
  user_id INTEGER NOT NULL REFERENCES users(id),
  role_id INTEGER NOT NULL REFERENCES roles(id),
  assigned_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id INTEGER NOT NULL REFERENCES roles(id),
  permission_id INTEGER NOT NULL REFERENCES permissions(id),
  PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS programmes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_type TEXT NOT NULL UNIQUE,
  description TEXT
);

CREATE TABLE IF NOT EXISTS phases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  programme_id INTEGER NOT NULL REFERENCES programmes(id),
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE(programme_id, name)
);

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  programme_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  topic TEXT,
  supervisor TEXT,
  start_date TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal-team',
  created_by INTEGER REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS meetings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  programme_type TEXT NOT NULL,
  phase TEXT NOT NULL,
  sub_phase TEXT,
  title TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  mode TEXT NOT NULL,
  venue_link TEXT,
  attendees TEXT NOT NULL DEFAULT '[]',
  attendance_status TEXT NOT NULL DEFAULT 'pending',
  agenda TEXT,
  discussion TEXT,
  decisions TEXT,
  responsible_person TEXT,
  deadlines TEXT,
  satisfaction_status TEXT NOT NULL DEFAULT 'pending',
  next_meeting_date TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal-team',
  status TEXT NOT NULL DEFAULT 'active',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS meeting_versions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id),
  version_number INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  changed_by INTEGER NOT NULL REFERENCES users(id),
  changed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS attendance (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER NOT NULL REFERENCES meetings(id),
  attendee_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_type TEXT NOT NULL,
  parent_id INTEGER NOT NULL,
  note_type TEXT NOT NULL DEFAULT 'comment',
  body TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'internal-team',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS action_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meeting_id INTEGER REFERENCES meetings(id),
  parent_type TEXT NOT NULL DEFAULT 'meeting',
  parent_id INTEGER,
  title TEXT NOT NULL,
  responsible_person TEXT,
  deadline TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  visibility TEXT NOT NULL DEFAULT 'internal-team',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS compliance_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  phase TEXT NOT NULL,
  suggestion TEXT NOT NULL,
  compliance_status TEXT NOT NULL DEFAULT 'pending',
  evidence TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal-team',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  funding_agency TEXT,
  pi TEXT,
  co_pi TEXT,
  team TEXT,
  budget REAL,
  proposal_status TEXT,
  office_noc TEXT,
  submission_date TEXT,
  sanction_date TEXT,
  execution_status TEXT,
  reporting_deadline TEXT,
  deliverables TEXT,
  utilization TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS publications (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  co_authors TEXT,
  journal TEXT,
  indexing TEXT,
  quartile TEXT,
  submission_date TEXT,
  revision_cycle TEXT,
  reviewer_comments TEXT,
  accepted_at TEXT,
  published_at TEXT,
  doi TEXT,
  apc REAL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL DEFAULT 'authored_book',
  title TEXT NOT NULL,
  publisher TEXT,
  proposal TEXT,
  contract TEXT,
  manuscript_progress INTEGER DEFAULT 0,
  submission_date TEXT,
  revision_notes TEXT,
  proof_status TEXT,
  isbn TEXT,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS conferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  conference_name TEXT NOT NULL,
  venue TEXT,
  deadline TEXT,
  submission_date TEXT,
  review_status TEXT,
  presentation_date TEXT,
  publication_status TEXT,
  doi_isbn TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS consultancy (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  organization TEXT NOT NULL,
  engagement_type TEXT NOT NULL,
  noc_status TEXT,
  start_date TEXT,
  end_date TEXT,
  honorarium REAL,
  billing_status TEXT,
  deliverables TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS moocs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  course_title TEXT NOT NULL,
  platform TEXT,
  proposal TEXT,
  noc_status TEXT,
  content_progress INTEGER DEFAULT 0,
  recording_status TEXT,
  upload_status TEXT,
  launch_date TEXT,
  status TEXT NOT NULL DEFAULT 'idea',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS custom_activities (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  activity_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  visibility TEXT NOT NULL DEFAULT 'admin-only',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS attachments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_type TEXT NOT NULL,
  parent_id INTEGER NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  mime_type TEXT,
  visibility TEXT NOT NULL DEFAULT 'internal-team',
  created_by INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_user_id INTEGER REFERENCES users(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id INTEGER,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS visibility_rules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  visibility TEXT NOT NULL,
  role_name TEXT NOT NULL,
  can_read INTEGER NOT NULL DEFAULT 0,
  can_write INTEGER NOT NULL DEFAULT 0,
  UNIQUE(visibility, role_name)
);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meetings_candidate ON meetings(candidate_id);
CREATE INDEX IF NOT EXISTS idx_notes_parent ON notes(parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
