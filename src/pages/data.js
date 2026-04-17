import { detailSection, pageHeader, recordCard } from '../components/ui.js';
import { escapeHtml } from '../utils/html.js';

export function dataPage(ctx) {
  const draft = ctx.canWrite() && ctx.draft ? `<section class="panel"><h3>Local draft preview</h3><pre>${escapeHtml(JSON.stringify(ctx.draft, null, 2))}</pre><p class="muted">${escapeHtml((ctx.diff || []).join('; ') || 'No diff yet')}</p><button id="export-draft">Export draft record</button></section>` : '';
  const editor = ctx.canWrite() ? `<section class="panel">
      <h3>Structured local editor</h3>
      <p>Creates local draft JSON only. It does not commit to GitHub.</p>
      <form class="record-form" id="draft-form">
        <select name="kind"><option value="candidate">Candidate</option><option value="meeting">Meeting</option><option value="workbench">Workbench item</option></select>
        <input name="title" required placeholder="Title or name" />
        <input name="description" required placeholder="Description, topic, or agenda" />
        <input name="status" placeholder="Status" value="active" />
        <select name="visibility">${ctx.store.permissions.visibility_levels.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select>
        <button>Preview draft</button>
      </form>
    </section>` : `<section class="panel"><h3>Read-only role</h3><p>Writing tools are available only to ADMIN and WRITER.</p></section>`;
  const exchange = ctx.canWrite() ? `
      <section class="panel"><h3>Export current data</h3><p>Download all loaded JSON data for review or backup.</p><button id="export-json">Export JSON bundle</button></section>
      <section class="panel"><h3>Import JSON bundle</h3><p>Load a previously exported bundle into local browser state.</p><label class="upload">Import JSON<input id="import-json" type="file" accept="application/json" /></label></section>` : `
      <section class="panel"><h3>Import/export unavailable</h3><p>Import and export writing tools are available only to ADMIN and WRITER.</p></section>`;
  return `${pageHeader('Data / Import-Export', 'Static JSON authoring workflow with preview before export.')}
    <div class="grid two">
      ${editor}
      ${exchange}
      ${draft}
    </div>
    ${detailSection('Repository files', ['public/config/users.json', 'public/config/permissions.json', 'public/data/candidates/candidates.json', 'public/data/meetings/meetings.json', 'public/data/workbench/workbench.json', 'public/data/daily-activities/daily-activities.json', 'public/data/calendar/calendar.json'].map((file) => recordCard({ title: file, meta: 'Git-friendly JSON', body: 'Edit, commit, and push to update the portal.' })).join(''))}`;
}
