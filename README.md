# research-lifecycle-manager

research-lifecycle-manager is a full-stack academic research lifecycle and supervision management system for faculty supervisors. It manages Masters, Ph.D., and intern supervision alongside a faculty academic workbench for publications, books, conference papers, sponsored projects, consultancy, MOOCs, and custom academic activities.

## Architecture

- Frontend: React + Vite static app in `frontend/`
- Backend: Node.js + Express REST API in `backend/`
- Database: SQLite schema in `database/schema.sql`
- Auth: password login with bcrypt-compatible hashing and secure HTTP-only cookie sessions
- Authorization: backend roles, permissions, and visibility masking
- Deployment: frontend can be hosted on GitHub Pages; backend runs separately as a Node.js service

The frontend does not implement fake authentication. It calls the backend for login, current user, records, exports, and permissions-sensitive data.

## Setup

1. Install dependencies:

```bash
npm run install:all
```

2. Create `.env` from `.env.example` and change `SESSION_SECRET`.

3. Initialize the database:

```bash
npm run db:init
```

4. Start the backend:

```bash
npm run dev:backend
```

5. Start the frontend:

```bash
npm run dev:frontend
```

Open `http://localhost:5173`.

## Admin Login

Seed credentials:

- Email: `admin@research-lifecycle-manager.local`
- Password: `Admin@12345`

Additional seed users:

- Writer: `writer@research-lifecycle-manager.local` / `Writer@12345`
- Restricted external intern: `intern@research-lifecycle-manager.local` / `Intern@12345`

Change all seed passwords before any real deployment.

## Environment Variables

Backend:

- `NODE_ENV`: `development` or `production`
- `PORT`: backend port, default `4000`
- `DB_PATH`: SQLite database path
- `SESSION_SECRET`: long random value used to sign session cookies
- `SESSION_COOKIE_NAME`: session cookie name
- `SESSION_DAYS`: session lifetime
- `FRONTEND_ORIGIN`: allowed browser origin for CORS
- `SECURE_COOKIES`: set `true` for HTTPS cross-site deployment

Frontend:

- `VITE_API_BASE_URL`: public backend URL, for example `https://api.example.edu`

## GitHub Pages Deployment

1. Create a repository variable named `VITE_API_BASE_URL` with the deployed backend URL.
2. Build the frontend:

```bash
npm --prefix frontend run build
```

3. Publish `frontend/dist` to GitHub Pages.

This repository includes `.github/workflows/pages.yml`, which builds `frontend/` and deploys to GitHub Pages from the `main` branch. The workflow sets `VITE_BASE_PATH=/research-life-cycle-manager/` for the requested repository name.

## Backend Deployment

1. Deploy `backend/` to a Node.js host.
2. Provide production environment variables.
3. Use HTTPS.
4. Set `SECURE_COOKIES=true`.
5. Set `FRONTEND_ORIGIN` to the GitHub Pages origin.
6. Persist the SQLite database file from `DB_PATH`.
7. Run:

```bash
npm --prefix backend install --omit=dev
npm --prefix backend run db:init
npm --prefix backend start
```

## Database

The schema includes:

- users, roles, permissions, user_roles
- candidates, programmes, phases
- meetings, attendance, notes, action_items, compliance_items
- projects, publications, books, conferences, consultancy, moocs, custom_activities
- attachments, audit_logs, visibility_rules, sessions

Records use soft deletion through `deleted_at`. Meeting edits create `meeting_versions`. Notes are append-only for writers.

## Main Features

- Login and logout with backend sessions
- Role-based access control
- Candidate dashboards for Masters, Ph.D., and interns
- Meeting minutes with agenda, decisions, action items, attendance, satisfaction, and PDF-friendly print view
- Append-only notes
- Confidentiality masking with `Confidential content hidden`
- Faculty workbench dashboard
- Project and publication tracking with kanban lifecycle views
- Global search and filters
- Audit logs
- JSON exports for meetings, candidates, and projects
- Admin APIs for user creation, password reset, role rotation, and soft archive

## Security Notes

- Replace seed passwords immediately.
- Use a strong `SESSION_SECRET`.
- Use HTTPS in production.
- Keep `SECURE_COOKIES=true` for deployed cross-origin frontend/backend.
- Do not place secrets in the frontend.
- Use backend exports and print views only over authenticated sessions.
- Soft delete keeps history for auditability.

## Future Improvements

- Add file upload storage for attachments.
- Add PostgreSQL adapter and migrations.
- Add richer admin UI forms for user and archive management.
- Add email reminders for deadlines.
- Add automated backups.
- Add fine-grained candidate workspace sharing.
- Add Playwright end-to-end tests and API contract tests.
