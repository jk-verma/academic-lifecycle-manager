# research-lifecycle-manager Architecture

research-lifecycle-manager is a split full-stack application:

- `frontend/`: React + Vite static client for GitHub Pages.
- `backend/`: Node.js + Express REST API with cookie sessions.
- `database/`: SQLite schema and local database file location.

The frontend never stores secrets and never grants permissions locally. It renders what the backend returns after authentication, authorization, and confidentiality masking.

## Security Model

- Passwords are hashed with bcrypt-compatible `bcryptjs`.
- Sessions are opaque random IDs stored in SQLite and signed in an HTTP-only cookie.
- Authorization is enforced through backend role and permission middleware.
- Records carry a `visibility` value. The backend masks sensitive fields with `Confidential content hidden` for users who may know a record exists but cannot read its confidential content.
- Writers can create records and append notes. Meeting revisions are admin-only and create a version snapshot.
- Admin archive actions are soft deletes and emit audit records.

## Role Summary

- `ADMIN`: full control, confidential reads, audit logs, archiving, user management.
- `WRITER`: create permitted records and append notes.
- `VIEWER`: read permitted records.
- `RESTRICTED_EXTERNAL`: limited sanitized reads.

## Future PostgreSQL Path

The database access is isolated in backend modules and SQL statements. Moving to PostgreSQL later should start by replacing `better-sqlite3` setup, parameter syntax where needed, and timestamp defaults.
