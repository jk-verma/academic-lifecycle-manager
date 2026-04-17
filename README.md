# Academic Lifecycle Manager

Academic Lifecycle Manager is a GitHub Pages-friendly academic life management portal for Dr. Jitendra Kumar Verma and trusted assistants. It is designed as a static React + Vite application using repository JSON files as the data source.

The app supports two working areas:

- Research Supervision for Masters, PhD, and interns
- Faculty Academic Workbench for publications, books, chapters, conference papers, projects, consultancy, MOOCs, and custom academic activities
- Daily Planner for teaching, research, supervision, projects, administration, external engagements, and custom work
- Deadline Calendar for submissions, revisions, follow-ups, project reports, meetings, milestones, teaching deliverables, consultancy, and MOOC milestones
- Teaching, Admin Work, External Engagements, Career Mobility, Projects & Sponsored Work, Research, and Reports pages
- Academic Year views for past-year tracking and carry-forward work

## GitHub Pages Architecture

- App: React + Vite
- Hosting: GitHub Pages
- Routing: hash routing, for example `#/candidates`
- Data: static JSON files under `public/config` and `public/data`
- Deployment: GitHub Actions workflow in `.github/workflows/pages.yml`
- Runtime backend: none required for core functionality

The deployed site also includes a no-build static entrypoint so it still works when GitHub Pages is configured to serve `main` from the repository root. GitHub Actions deployment remains supported for normal Vite builds.

This version intentionally does not implement custom password login. GitHub Pages cannot securely enforce app-level password authentication by itself. Access is expected to be handled by repository/page visibility and trusted-user sharing.

## Static Role Model

Roles are logical UI modes loaded from `public/config/users.json` and `public/config/permissions.json`.

- `ADMIN`: full UI access, can archive records in local browser state, can manage visibility labels by editing config files
- `ASSISTANT`: can create entries, update permitted records, add daily logs, deadlines, follow-up notes, meeting details, attendees, and action items
- `VIEWER`: read-only mode
- `RESTRICTED_EXTERNAL`: sanitized preview mode with confidential content masked

Writing rights in the static UI are available to `ADMIN` and `ASSISTANT` only. `VIEWER` and `RESTRICTED_EXTERNAL` do not receive local editor/export controls for prepared writing changes. Archive/correction/close controls remain admin-oriented.

These roles are not secure authentication. They are data and UI policies for a static trusted-user portal. The code is structured so these roles can later map to real backend auth.

The primary admin profile is Dr. Jitendra Kumar Verma. Assistant entries are tracked through `created_by`, `updated_by`, timestamps, and append-only history arrays.

## Data Files

Main files:

- `public/config/users.json`
- `public/config/permissions.json`
- `public/config/workflow-templates.json`
- `public/data/candidates/candidates.json`
- `public/data/meetings/meetings.json`
- `public/data/workbench/workbench.json`
- `public/data/daily-activities/daily-activities.json`
- `public/data/calendar/calendar.json`
- `public/data/academic-life/academic-life.json`

Records are Git-friendly and human-readable. Normal editing uses append-only arrays:

- `notes_append_only`
- `comments_append_only`
- `revision_history`

Normal UI flows never delete historical entries. Admin archive changes update status and append a revision entry.

## Academic Year Logic

All core records include:

- `academic_year_start`
- `academic_year_current`
- `carry_forward`
- `status`

Incomplete records with `carry_forward: true` appear in the Academic Years view without duplicating original history. Past academic year records remain editable through the static JSON workflow by appending history entries rather than deleting older data.

## Task and Subtask Model

Main records can carry one overall task deadline plus an append-only subtask timeline:

- `final_deadline`
- `status`
- `priority`
- `notes`
- `history`
- `subtasks`

Each subtask belongs to its parent record through `parent_record_id` and includes `title`, `subtask_type`, `due_datetime`, `due_date`, `completed_datetime`, `completed_date`, `status`, `responsible_person`, append-only `notes`, append-only `history`, and `sequence_order`.

Cards show the final deadline and completed-subtasks summary. Detail pages show subtasks as a vertical timeline with overdue highlighting and an ADMIN/ASSISTANT-only local form for adding new subtasks. The form supports exact due date/time, optional completed date/time, pending/ongoing/completed/deferred/cancelled status, responsible person, and insertion after an existing sequence number. Timeline items can also be drag-dropped to reorder them locally; the reordered sequence is saved as an append-only history update when exported. Existing subtasks are not deleted by the UI; updates should append history entries and be exported as JSON for commit.

## Workflow Templates

Ready-made workflow templates live in `public/config/workflow-templates.json` and are visible at `#/templates`.

Included templates:

- PhD DAC workflow
- Master's synopsis workflow
- Journal submission workflow
- Sponsored project workflow
- Call for Project Proposals workflow
- Course delivery workflow
- Job application workflow

Templates provide starter subtask structures that can be copied into parent records or used while preparing exported JSON updates.

Project proposal templates include date-time aware milestones such as call deadline, proposal preparation, Co-PI amendment discussion, submission, presentation, updated proposal submission, result, employer document submission, grant sanction, commencement, progress reports, utilization certificates, and completion. Extra steps can be inserted between existing sequence numbers from the parent record detail page.

## Folder Structure

```text
src/
  components/     reusable HTML UI fragments
  data/           static JSON loader and validation
  hooks/          reserved for future React/Vite hooks
  pages/          dashboard, candidate, meeting, workbench, search, data, settings pages
  utils/          visibility, search, export, date, and HTML helpers
public/
  config/         role and permission JSON
  data/           candidate, meeting, and workbench JSON
.github/workflows/pages.yml
```

## Routes

Hash routes are GitHub Pages safe. Product navigation uses:

- `#/dashboard` or `#/home`
- `#/my-work`
- `#/students`
- `#/teaching`
- `#/research`
- `#/projects`
- `#/career`
- `#/calendar`
- `#/reports`
- `#/setup`

Compatibility and detail routes include:

- `#/dashboard`
- `#/candidates`
- `#/candidates/<candidate_id>`
- `#/candidates/<candidate_id>/phase/<phase>`
- `#/meetings`
- `#/meetings/<meeting_id>`
- `#/workbench`
- `#/workbench/<module>`
- `#/workbench/<module>/<record_id>`
- `#/planner`
- `#/planner/<activity_id>`
- `#/research`
- `#/teaching`
- `#/teaching/<record_id>`
- `#/supervision`
- `#/projects`
- `#/admin-work`
- `#/admin-work/<record_id>`
- `#/external`
- `#/external/<record_id>`
- `#/career-mobility`
- `#/career-mobility/<record_id>`
- `#/career`
- `#/career/<record_id>`
- `#/reports`
- `#/activities`
- `#/activities/<activity_id>`
- `#/calendar`
- `#/calendar/<calendar_id>`
- `#/years`
- `#/years/<academic_year>`
- `#/search`
- `#/data`
- `#/settings`
- `#/start-here`
- `#/templates`
- `#/templates/<template_id>`

## Access Model

The current GitHub Pages version keeps access control out of the visible product surface. Records are maintained as static JSON and can later be connected to a backend role model when the application view is finalized.

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
2. Choose `ADMIN` or `ASSISTANT` logical role.
3. Append notes from meeting or workbench detail pages, or prepare a structured draft on the Data page.
4. Preview the local draft and JSON diff-style summary.
5. Export a record-specific JSON draft or full JSON bundle.
6. Copy the changed sections into the repository JSON files.
7. Commit and push.

The browser cannot directly commit to GitHub Pages. This is intentional for low-maintenance static hosting.

## GitHub Pages Deployment

The workflow `.github/workflows/pages.yml` builds and deploys the site from `main`.

Repository name expected by default:

```text
academic-lifecycle-manager
```

Expected Pages URL:

```text
https://<username>.github.io/academic-lifecycle-manager/
```

The workflow sets the Vite base path from the actual GitHub repository name:

```text
VITE_BASE_PATH=/${{ github.event.repository.name }}/
```

For local production builds, `vite.config.js` defaults to `/academic-lifecycle-manager/`. If your repository name differs and you are building locally, set `VITE_BASE_PATH` before running `npm run build`.

In GitHub:

1. Open repository Settings.
2. Go to Pages.
3. Select GitHub Actions as the build and deployment source.
4. Push to `main`.

## Import and Export

The Data page supports:

- JSON bundle export
- JSON bundle import into local browser state
- record-specific draft export
- local preview before export

The Daily Activity and Calendar pages include assistant/admin local entry forms. Export the JSON bundle after local entry, then commit the updated JSON files.

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
