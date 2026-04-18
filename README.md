# Academic Lifecycle Manager

Academic Lifecycle Manager is a GitHub Pages-friendly academic life management portal for Dr. Jitendra Kumar Verma and trusted assistants. It is designed as a static React + Vite application using repository JSON files as the data source.

- Home command center for today, weekly, bimonthly, monthly, and overdue deadlines across all recorded work
- Teaching for direct teaching, course outlines, lectures, quizzes, examinations, invigilation, and evaluation
- Research for publications: journal articles, conference papers, books, edited books, and book chapters
- Projects for consultancy projects, sponsored projects, and research projects
- Supervision for Ph.D., Masters, UG, external, and intern work
- Mentors for internal collaborators, external collaborators, and student group leaders
- Administration for co-curricular work, corporate/academic administration, and professional development
- Miscellaneous for career mobility and subscriptions
- Academic Year views for past-year tracking

## GitHub Pages Architecture

- App: React + Vite
- Hosting: GitHub Pages
- Routing: hash routing, for example `#/candidates`
- Data: static JSON files under `public/config` and `public/data`
- Deployment: GitHub Actions workflow in `.github/workflows/pages.yml`
- Runtime backend: none required for core functionality

The deployed site also includes a no-build static entrypoint so it still works when GitHub Pages is configured to serve `main` from the repository root. GitHub Actions deployment remains supported for normal Vite builds.

This version intentionally does not implement custom password login. GitHub Pages cannot securely enforce app-level password authentication by itself. Access is expected to be handled by repository/page visibility and trusted-user sharing.

## Access Model

The current GitHub Pages version keeps access control out of the visible product surface. Records are maintained as static JSON and can later be connected to a backend role model when the application view is finalized.

Prepared entries are tracked through `created_by`, `updated_by`, timestamps, and append-only history arrays.

## Data Files

Main files:

- `public/config/users.json`
- `public/config/permissions.json`
- `public/config/workflow-templates.json`
- `public/data/teaching/teaching.json`
- `public/data/publications/publications.json`
- `public/data/projects/projects.json`
- `public/data/supervision/supervision.json`
- `public/data/mentors/mentors.json`
- `public/data/administration/administration.json`
- `public/data/career-mobility/career-mobility.json`
- `public/data/miscellaneous/miscellaneous.json`
- `public/data/daily-activities/daily-activities.json`
- `public/data/calendar/calendar.json`

Records are Git-friendly and human-readable. Normal editing uses append-only arrays:

- `notes_append_only`
- `comments_append_only`
- `revision_history`

Normal UI flows never delete historical entries. Admin archive changes update status and append a revision entry.

## Academic Year Logic

All core records include:

- `academic_year_start`
- `academic_year_current`
- `status`

Past academic year records remain editable through the static JSON workflow by appending history entries rather than deleting older data.

## Task and Subtask Model

Main records can carry one overall task deadline plus an append-only subtask timeline:

- `final_deadline`
- `status`
- `priority`
- `notes`
- `history`
- `subtasks`

Each subtask belongs to its parent record through `parent_record_id` and includes `title`, `subtask_type`, `due_datetime`, `due_date`, `completed_datetime`, `completed_date`, `status`, `responsible_person`, append-only `notes`, append-only `history`, and `sequence_order`.

Cards show the final deadline and completed-subtasks summary. Detail pages show subtasks as a vertical timeline with overdue highlighting and a local form for adding new subtasks. The form supports exact due date/time, optional completed date/time, pending/ongoing/completed/deferred/cancelled status, responsible person, and insertion after an existing sequence number. Timeline items can also be drag-dropped to reorder them locally; the reordered sequence is saved as an append-only history update when exported. Existing subtasks are not deleted by the UI; updates should append history entries and be exported as JSON for commit.

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
  data/structure  academic activity taxonomy used by forms and pages
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
- `#/teaching`
- `#/research`
- `#/projects`
- `#/supervision`
- `#/mentors`
- `#/admin-work`
- `#/miscellaneous`
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
- `#/supervision/<candidate_id>`
- `#/projects`
- `#/admin-work`
- `#/admin-work/<record_id>`
- `#/miscellaneous`
- `#/subscriptions`
- `#/subscriptions/<record_id>`
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
2. Append notes from meeting or workbench detail pages, or prepare a structured draft on the Data page.
3. Preview the local draft and JSON diff-style summary.
4. Export a record-specific JSON draft or full JSON bundle.
5. Copy the changed sections into the repository JSON files.
6. Commit and push.

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

The Daily Activity and Calendar pages include local entry forms. Export the JSON bundle after local entry, then commit the updated JSON files.

Exports are useful for preparing Git commits. Imports are useful for review, testing, or restoring a local browser state.

## Print Support

Candidate summaries, meetings, and project/workbench detail panels are print-friendly. Use the Print buttons or browser print dialog to save PDFs.

## Future Backend Upgrade Path

The static data model already includes timestamps, `created_by` / `updated_by`, append-only notes, and `revision_history` arrays.

A later backend can map these fields to:

- Node.js + Express APIs
- real password login
- secure cookie sessions
- database persistence
- server-side authorization
- user management

True authentication and authorization should be added through a backend or protected hosting layer when the product view is complete.
