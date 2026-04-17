# Union Superprompt: Academic Lifecycle Manager Product Upgrade

Improve the existing `academic-lifecycle-manager` repository without rebuilding it from scratch. Keep the app static, GitHub Pages compatible, React + Vite compatible, JSON-driven, and deployable at `/academic-lifecycle-manager/`.

## Product Goal

Transform Academic Lifecycle Manager into a polished academic productivity product for academicians, especially Dr. Jitendra Kumar Verma, to manage daily academic work, teaching, research, supervision, administration, projects, external engagements, career mobility, deadlines, subtasks, and academic-year carry-forward work.

## Non-Negotiables

- Do not add a required backend.
- Do not add fake password authentication.
- Keep hash routing and GitHub Pages compatibility.
- Keep JSON files as the data source.
- Keep append-only history and no hard-delete UI behavior.
- Preserve existing data import/export workflow.
- Use display name `Academic Lifecycle Manager` everywhere.

## Access Model

Keep access control out of the visible product surface for now. The app should remain usable as a static academic productivity portal, with backend roles and authentication deferred until the whole product view is complete.

## Core Data Rules

Every major record should support:

- `id`
- `title`
- `category`
- `sub_type`
- `academic_year_start`
- `academic_year_current`
- `final_deadline`
- `status`
- `priority`
- `notes`
- `history`
- `subtasks`
- `carry_forward`

Each subtask belongs to the same parent record and includes:

- `id`
- `parent_record_id`
- `title`
- `subtask_type`
- `due_date`
- `completed_date`
- `status`
- `responsible_person`
- `notes`
- `history`
- `sequence_order`

Subtask statuses are `pending`, `ongoing`, `completed`, `deferred`, and `cancelled`.

## Navigation Target

Use product-oriented navigation:

- Home
- My Work
- Students
- Teaching
- Research
- Projects
- Career
- Calendar
- Reports
- Setup

`My Work` should expose Daily Planner, Admin Work, External Engagements, and Carry Forward Items. `Setup` should expose Start Here, workflow templates, JSON import/export, role preview, and deployment guidance.

## Product Upgrades To Execute

1. Upgrade Home into a command center with today tasks, deadlines, overdue work, follow-up items, meetings, carry-forward, research/teaching/supervision/project summaries, recent activity, and quick actions.
2. Improve major record cards with category, final deadline, priority, status, progress, next pending subtask, and overdue indicator.
3. Display subtasks inside parent detail pages as vertical timelines.
4. Add workflow templates for PhD DAC, Master’s synopsis, journal submission, sponsored project, course delivery, and job application workflows.
5. Improve search with filters for academic year, category/module, status, priority, date/deadline, overdue, candidate, and institution.
6. Improve reports with yearly summary, completed vs pending, overdue, research, teaching, supervision, project, and career summaries.
7. Add onboarding/start-here content explaining modules, academic-year tracking, carry-forward, static JSON editing, and GitHub Pages deployment.
8. Keep UI clean, professional, responsive, print-friendly, and easy to scan.

## Execution Strategy

Layer the product improvements onto the current modular static app. Retain existing routes for compatibility while adding product-friendly aliases such as `#/students`, `#/career`, `#/my-work`, `#/setup`, `#/start-here`, and `#/templates`.
