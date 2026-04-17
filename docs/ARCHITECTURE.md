# Static Architecture

research-lifecycle-manager is currently a static GitHub Pages application.

## Runtime

- `index.html` loads the React app.
- Vite builds static assets into `dist/`.
- GitHub Pages serves the files.
- Hash routing keeps navigation compatible with static hosting.

## Data

All core data is stored as JSON under `public/`.

- Config files define roles, logical users, visibility levels, and masking text.
- Candidate, meeting, and workbench files define records.
- Daily activity and calendar files define operational logs and deadlines.
- Append-only arrays and Git history provide auditability.

## Academic Years

Records include `academic_year_start`, `academic_year_current`, `status`, and `carry_forward`. Carry-forward is represented as metadata on the original record so incomplete work appears in later-year views without duplicating history.

## Security Boundary

Static GitHub Pages cannot enforce app-level password security. The app provides role-aware views for trusted users and masks content based on JSON metadata. Real enforcement belongs in a future backend.

## Upgrade Path

The UI masking, role names, record IDs, timestamps, and revision arrays are intentionally shaped so a Node.js API and database can replace static JSON later without redesigning the records.
