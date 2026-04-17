# research-lifecycle-manager

research-lifecycle-manager is a GitHub Pages-friendly academic research lifecycle portal for a faculty supervisor. It is designed as a static React + Vite application using repository JSON files as the data source.

The app supports two working areas:

- Research Supervision for Masters, PhD, and interns
- Faculty Academic Workbench for publications, books, chapters, conference papers, projects, consultancy, MOOCs, and custom academic activities

## GitHub Pages Architecture

- App: React + Vite
- Hosting: GitHub Pages
- Routing: hash routing, for example `#/candidates`
- Data: static JSON files under `public/config` and `public/data`
- Deployment: GitHub Actions workflow in `.github/workflows/pages.yml`
- Runtime backend: none required for core functionality

This version intentionally does not implement custom password login. GitHub Pages cannot securely enforce app-level password authentication by itself. Access is expected to be handled by repository/page visibility and trusted-user sharing.

## Static Role Model

Roles are logical UI modes loaded from `public/config/users.json` and `public/config/permissions.json`.

- `ADMIN`: full UI access, can archive records in local browser state, can manage visibility labels by editing config files
- `WRITER`: can append notes and prepare exportable JSON changes, but deletion is disabled
- `VIEWER`: read-only mode
- `RESTRICTED_EXTERNAL`: sees only sanitized content

Writing rights in the static UI are available only to `ADMIN` and `WRITER`. `VIEWER` and `RESTRICTED_EXTERNAL` do not receive local editor/export controls for prepared writing changes.

These roles are not secure authentication. They are data and UI policies for a static trusted-user portal. The code is structured so these roles can later map to real backend auth.

## Data Files

Main files:

- `public/config/users.json`
- `public/config/permissions.json`
- `public/data/candidates/candidates.json`
- `public/data/meetings/meetings.json`
- `public/data/workbench/workbench.json`

Records are Git-friendly and human-readable. Normal editing uses append-only arrays:

- `notes_append_only`
- `comments_append_only`
- `revision_history`

Normal UI flows never delete historical entries. Admin archive changes update status and append a revision entry.

## Confidentiality

Visibility levels:

- `admin_only`
- `supervisor_only`
- `internal`
- `candidate_visible`
- `sanitized_external`

Restricted external users see:

```text
Confidential content hidden
```

Masking happens in the React UI based on the selected logical role and visibility metadata.

## Local Development

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Build production static site:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## Editing JSON Data

For simple edits:

1. Open the relevant JSON file under `public/data` or `public/config`.
2. Add new records or append to `notes_append_only`, `comments_append_only`, or `revision_history`.
3. Commit and push changes to GitHub.

For UI-assisted edits:

1. Open the app.
2. Choose `ADMIN` or `WRITER` logical role.
3. Append notes or archive records in local browser state.
4. Use the Data page to export a JSON bundle.
5. Copy the changed sections into the repository JSON files.
6. Commit and push.

The browser cannot directly commit to GitHub Pages. This is intentional for low-maintenance static hosting.

## GitHub Pages Deployment

The workflow `.github/workflows/pages.yml` builds and deploys the site from `main`.

Repository name expected by default:

```text
research-lifecycle-manager
```

Expected Pages URL:

```text
https://<username>.github.io/research-lifecycle-manager/
```

The workflow sets the Vite base path from the actual GitHub repository name:

```text
VITE_BASE_PATH=/${{ github.event.repository.name }}/
```

For local production builds, `vite.config.js` defaults to `/research-lifecycle-manager/`. If your repository name differs and you are building locally, set `VITE_BASE_PATH` before running `npm run build`.

In GitHub:

1. Open repository Settings.
2. Go to Pages.
3. Select GitHub Actions as the build and deployment source.
4. Push to `main`.

## Import and Export

The Data page supports:

- JSON bundle export
- JSON bundle import into local browser state

Exports are useful for preparing Git commits. Imports are useful for review, testing, or restoring a local browser state.

## Print Support

Candidate summaries, meetings, and project/workbench detail panels are print-friendly. Use the Print buttons or browser print dialog to save PDFs.

## Future Backend Upgrade Path

The static data model already includes:

- role names
- visibility metadata
- timestamps
- created_by and updated_by
- append-only notes
- revision_history arrays

A later backend can map these fields to:

- Node.js + Express APIs
- real password login
- secure cookie sessions
- database persistence
- server-side authorization
- user management

Do not treat the static role picker as security. True authentication and authorization require a backend or a protected hosting layer.
