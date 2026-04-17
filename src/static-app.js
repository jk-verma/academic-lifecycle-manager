import { filterBar } from './components/ui.js';
import { loadStore } from './data/load.js';
import { activitiesPage, activityDetailPage } from './pages/activities.js';
import { calendarDetailPage, calendarPage } from './pages/calendar.js';
import { candidateDetailPage, candidatePhasePage, candidatesListPage } from './pages/candidates.js';
import { dashboardPage } from './pages/dashboard.js';
import { dataPage } from './pages/data.js';
import { academicModuleDetailPage, academicModulePage, adminWorkPage, externalEngagementsPage, researchPage, projectsPage, supervisionPage, teachingPage } from './pages/academic-modules.js';
import { meetingDetailPage, meetingsListPage } from './pages/meetings.js';
import { reportsPage } from './pages/reports.js';
import { searchPage } from './pages/search.js';
import { settingsPage } from './pages/settings.js';
import { moduleLabels, workbenchDetailPage, workbenchHomePage, workbenchModulePage } from './pages/workbench.js';
import { yearDetailPage, yearsPage } from './pages/years.js';
import { academicYearForDate } from './utils/academic-year.js';
import { nowIso } from './utils/date.js';
import { diffSummary, downloadJson } from './utils/export.js';
import { escapeHtml, uid } from './utils/html.js';
import { flattenWorkbench } from './utils/search.js';
import { canArchive, canWrite, maskNotes, visibleByRole } from './utils/visibility.js';

const root = document.getElementById('root');

let store = null;
let role = 'ADMIN';
let filters = {};
let draft = null;
let diff = [];
let error = '';

function parseRoute() {
  return (location.hash.replace('#/', '') || 'dashboard').split('/').filter(Boolean);
}

function routeKey(parts = parseRoute()) {
  return parts.join('/');
}

function visibleCandidates() {
  return visibleByRole(store, role, store.candidates.records, ['topic', 'supervisor']);
}

function visibleMeetings() {
  return visibleByRole(store, role, store.meetings.records, ['agenda', 'discussion', 'decisions', 'venue_or_link', 'responsible_person']);
}

function visibleWorkbench() {
  return visibleByRole(store, role, flattenWorkbench(store.workbench), ['description_or_abstract', 'budget', 'honorarium', 'deliverables']);
}

function visibleActivities() {
  return visibleByRole(store, role, store.activities.records, ['short_notes']);
}

function visibleCalendar() {
  return visibleByRole(store, role, store.calendar.records, ['notes']);
}

function visibleAcademicLife() {
  return Object.entries(store.academicLife.modules).flatMap(([module, records]) =>
    visibleByRole(store, role, records.map((record) => ({ ...record, module })), ['notes', 'feedback', 'responsibility'])
  );
}

function allRecords() {
  return [
    ...visibleCandidates().map((item) => ({ ...item, route: `#/candidates/${item.id}` })),
    ...visibleMeetings().map((item) => ({ ...item, route: `#/meetings/${item.id}` })),
    ...visibleWorkbench().map((item) => ({ ...item, route: `#/workbench/${item.module}/${item.id}` })),
    ...visibleActivities().map((item) => ({ ...item, route: `#/activities/${item.id}` })),
    ...visibleCalendar().map((item) => ({ ...item, route: `#/calendar/${item.id}` })),
    ...visibleAcademicLife().map((item) => ({ ...item, route: `#/${academicRoute(item.module)}/${item.id}` }))
  ];
}

function renderFilters(options = {}) {
  return filterBar(filters, {
    programmes: [...new Set(store.candidates.records.map((item) => item.programme_type))],
    candidates: store.candidates.records,
    phases: [...new Set(store.meetings.records.map((item) => item.phase))],
    modules: Object.keys(moduleLabels),
    visibilities: store.permissions.visibility_levels,
    academicYears: [...new Set(allRecords().flatMap((item) => [item.academic_year_start, item.academic_year_current]).filter(Boolean))].sort().reverse(),
    ...options
  });
}

function appendNoteForm(kind, id, module = '') {
  return `<section class="append-panel">
    <h4>Append-only note</h4>
    <form class="record-form" data-append-note="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-module="${escapeHtml(module)}">
      <input name="text" required placeholder="Add note without deleting history" />
      <select name="visibility">${store.permissions.visibility_levels.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select>
      <button>Append note</button>
    </form>
  </section>`;
}

function ctx() {
  return {
    store,
    role,
    filters,
    draft,
    diff,
    visibleCandidates,
    visibleMeetings,
    visibleWorkbench,
    visibleActivities,
    visibleCalendar,
    visibleAcademicLife,
    allRecords,
    maskNotes: (notes) => maskNotes(store, role, notes),
    canWrite: () => canWrite(store, role),
    canArchive: () => canArchive(store, role),
    archiveRecord,
    renderFilters,
    appendNoteForm
  };
}

function shell(content) {
  const current = routeKey();
  const nav = [
    ['dashboard', 'Dashboard'],
    ['planner', 'Daily Planner'],
    ['calendar', 'Calendar & Deadlines'],
    ['research', 'Research'],
    ['teaching', 'Teaching'],
    ['supervision', 'Supervision'],
    ['projects', 'Projects & Sponsored Work'],
    ['admin-work', 'Admin Work'],
    ['external', 'External Engagements'],
    ['reports', 'Reports'],
    ['years', 'Academic Years'],
    ['search', 'Search'],
    ['data', 'Data / Import-Export'],
    ['settings', 'Settings']
  ].map(([id, label]) => `<a class="${current.startsWith(id) || (current === '' && id === 'dashboard') ? 'active' : ''}" href="#/${id}">${label}</a>`).join('');

  const roles = Object.keys(store.permissions.roles).map((item) => `<option ${item === role ? 'selected' : ''}>${item}</option>`).join('');
  root.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <div><p class="brand">Academic Lifecycle Manager (ALM)</p><nav>${nav}</nav></div>
      <p class="sidebar-note">Static GitHub Pages portal. Roles are logical views, not login sessions.</p>
    </aside>
    <main class="content">
      <header class="topbar">
        <div><p class="eyebrow">Faculty controlled static portal</p><h1>Academic operations portal</h1></div>
        <label class="role-picker">Logical role<select id="role-picker">${roles}</select></label>
      </header>
      ${error ? `<p class="notice">${escapeHtml(error)}</p>` : ''}
      ${content}
    </main>
  </div>`;
}

function render() {
  if (!store) return;
  const parts = parseRoute();
  const c = ctx();
  let content = '';
  if (!parts.length || parts[0] === 'dashboard') content = dashboardPage(c);
  else if (parts[0] === 'planner' && parts[1]) content = activityDetailPage(c, parts[1]);
  else if (parts[0] === 'planner') content = activitiesPage(c);
  else if (parts[0] === 'candidates' && parts[1] && parts[2] === 'phase') content = candidatePhasePage(c, parts[1], parts[3]);
  else if (parts[0] === 'candidates' && parts[1]) content = candidateDetailPage(c, parts[1]);
  else if (parts[0] === 'candidates') content = candidatesListPage(c);
  else if (parts[0] === 'meetings' && parts[1]) content = meetingDetailPage(c, parts[1]);
  else if (parts[0] === 'meetings') content = meetingsListPage(c);
  else if (parts[0] === 'workbench' && parts[1] && parts[2]) content = workbenchDetailPage(c, parts[1], parts[2]);
  else if (parts[0] === 'workbench' && parts[1]) content = workbenchModulePage(c, parts[1]);
  else if (parts[0] === 'workbench') content = workbenchHomePage(c);
  else if (parts[0] === 'research') content = researchPage(c);
  else if (parts[0] === 'teaching' && parts[1]) content = academicModuleDetailPage(c, 'teaching', parts[1]);
  else if (parts[0] === 'teaching') content = teachingPage(c);
  else if (parts[0] === 'supervision') content = supervisionPage(c);
  else if (parts[0] === 'projects') content = projectsPage(c);
  else if (parts[0] === 'admin-work' && parts[1]) content = academicModuleDetailPage(c, 'admin_work', parts[1]);
  else if (parts[0] === 'admin-work') content = adminWorkPage(c);
  else if (parts[0] === 'external' && parts[1]) content = academicModuleDetailPage(c, 'external_engagements', parts[1]);
  else if (parts[0] === 'external') content = externalEngagementsPage(c);
  else if (parts[0] === 'activities' && parts[1]) content = activityDetailPage(c, parts[1]);
  else if (parts[0] === 'activities') content = activitiesPage(c);
  else if (parts[0] === 'calendar' && parts[1]) content = calendarDetailPage(c, parts[1]);
  else if (parts[0] === 'calendar') content = calendarPage(c);
  else if (parts[0] === 'years' && parts[1]) content = yearDetailPage(c, parts[1]);
  else if (parts[0] === 'years') content = yearsPage(c);
  else if (parts[0] === 'reports') content = reportsPage(c);
  else if (parts[0] === 'search') content = searchPage(c);
  else if (parts[0] === 'data') content = dataPage(c);
  else if (parts[0] === 'settings') content = settingsPage(c);
  else content = dashboardPage(c);
  shell(content);
  bindEvents();
}

function bindEvents() {
  const rolePicker = document.getElementById('role-picker');
  if (rolePicker) {
    rolePicker.addEventListener('change', (event) => {
      role = event.target.value;
      render();
    });
  }

  ['q', 'programme', 'candidate', 'phase', 'module', 'status', 'visibility', 'academicYear', 'from', 'to'].forEach((key) => {
    const el = document.getElementById(`filter-${key}`);
    if (el) {
      el.addEventListener('input', (event) => {
        filters[key] = event.target.value;
        render();
      });
      el.addEventListener('change', (event) => {
        filters[key] = event.target.value;
        render();
      });
    }
  });

  document.querySelectorAll('[data-append-note]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      appendNote(form.dataset.appendNote, form.dataset.id, new FormData(form), form.dataset.module);
    });
  });

  const exportJson = document.getElementById('export-json');
  if (exportJson) exportJson.addEventListener('click', () => downloadJson('academic-lifecycle-manager-data-export.json', store));

  const exportDraft = document.getElementById('export-draft');
  if (exportDraft && draft) exportDraft.addEventListener('click', () => downloadJson(`${draft.id || 'draft'}.json`, draft));

  const importJson = document.getElementById('import-json');
  if (importJson) importJson.addEventListener('change', importBundle);

  const draftForm = document.getElementById('draft-form');
  if (draftForm) {
    draftForm.addEventListener('submit', (event) => {
      event.preventDefault();
      previewDraft(new FormData(draftForm));
    });
  }

  document.querySelectorAll('[data-archive-kind]').forEach((button) => {
    button.addEventListener('click', () => archiveRecord(button.dataset.archiveKind, button.dataset.archiveId, button.dataset.archiveModule || ''));
  });

  const activityForm = document.getElementById('activity-form');
  if (activityForm) activityForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addActivity(new FormData(activityForm));
  });

  const calendarForm = document.getElementById('calendar-form');
  if (calendarForm) calendarForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addCalendarItem(new FormData(calendarForm));
  });

  document.querySelectorAll('[data-academic-module]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addAcademicLifeRecord(form.dataset.academicModule, new FormData(form));
    });
  });
}

function appendNote(kind, id, formData, module) {
  if (!canWrite(store, role)) return;
  const note = {
    id: uid('note'),
    text: formData.get('text'),
    visibility: formData.get('visibility'),
    created_by: `local-${role.toLowerCase()}`,
    created_at: nowIso()
  };
  if (kind === 'meeting') {
    const meeting = store.meetings.records.find((item) => item.id === id);
    meeting.comments_append_only.push(note);
    meeting.revision_history.push({ version: meeting.revision_history.length + 1, summary: 'Append-only comment added locally', updated_by: note.created_by, updated_at: nowIso() });
  }
  if (kind === 'workbench') {
    const item = store.workbench.modules[module].find((record) => record.id === id);
    item.notes_append_only.push(note);
    item.revision_history.push({ version: item.revision_history.length + 1, summary: 'Append-only note added locally', updated_by: note.created_by, updated_at: nowIso() });
  }
  error = 'Local append-only note prepared. Export JSON to commit it.';
  render();
}

function archiveRecord(kind, id, module = '') {
  if (!canArchive(store, role)) return;
  let record = null;
  if (kind === 'candidate') record = store.candidates.records.find((item) => item.id === id);
  if (kind === 'meeting') record = store.meetings.records.find((item) => item.id === id);
  if (kind === 'workbench') record = store.workbench.modules[module]?.find((item) => item.id === id);
  if (!record) return;
  record.status = 'archived';
  record.updated_by = `local-${role.toLowerCase()}`;
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.revision_history = record.revision_history || [];
  record.revision_history.push({
    version: record.revision_history.length + 1,
    summary: 'Archived locally instead of deleted',
    updated_by: record.updated_by,
    updated_at: nowIso()
  });
  error = 'Record archived locally. Export JSON to commit it.';
  render();
}

function previewDraft(formData) {
  if (!canWrite(store, role)) return;
  const kind = formData.get('kind');
  draft = {
    id: uid(kind),
    title: formData.get('title'),
    name: formData.get('title'),
    description_or_abstract: formData.get('description'),
    topic: formData.get('description'),
    status: formData.get('status') || 'active',
    visibility: formData.get('visibility'),
    created_by: `local-${role.toLowerCase()}`,
    updated_by: `local-${role.toLowerCase()}`,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    notes_append_only: [],
    attachments: [],
    revision_history: [{ version: 1, summary: `Draft ${kind} record prepared locally`, updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }]
  };
  diff = diffSummary(null, draft);
  error = 'Draft preview created. Export this record or copy it into the correct JSON file.';
  location.hash = '#/data';
  render();
}

function addActivity(formData) {
  if (!canWrite(store, role)) return;
  const date = formData.get('date');
  store.activities.records.unshift({
    id: uid('act'),
    date,
    title: formData.get('title'),
    category: formData.get('category'),
    sub_type: formData.get('sub_type'),
    linked_record_id: formData.get('linked_record_id'),
    short_notes: formData.get('short_notes'),
    status: 'open',
    next_action_date: '',
    priority: formData.get('priority'),
    created_by: `local-${role.toLowerCase()}`,
    created_at: nowIso(),
    updated_at: nowIso(),
    visibility: formData.get('visibility'),
    academic_year_start: academicYearForDate(date),
    academic_year_current: academicYearForDate(date),
    carry_forward: true,
    history: [{ version: 1, summary: 'Daily activity created locally', updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }]
  });
  error = 'Daily activity added locally. Export JSON to commit it.';
  render();
}

function addCalendarItem(formData) {
  if (!canWrite(store, role)) return;
  const dueDate = formData.get('due_date');
  store.calendar.records.unshift({
    id: uid('cal'),
    title: formData.get('title'),
    linked_record_id: formData.get('linked_record_id'),
    category: formData.get('category'),
    sub_type: formData.get('sub_type'),
    due_date: dueDate,
    reminder_date: formData.get('reminder_date'),
    status: 'open',
    priority: formData.get('priority'),
    notes: '',
    created_by: `local-${role.toLowerCase()}`,
    academic_year_start: academicYearForDate(dueDate),
    academic_year_current: academicYearForDate(dueDate),
    carry_forward: true,
    visibility: formData.get('visibility'),
    history: [{ version: 1, summary: 'Calendar item created locally', updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }]
  });
  error = 'Calendar item added locally. Export JSON to commit it.';
  render();
}

function addAcademicLifeRecord(module, formData) {
  if (!canWrite(store, role)) return;
  const year = formData.get('academic_year_current') || academicYearForDate();
  const record = {
    id: uid(module),
    title: formData.get('title'),
    category: module,
    sub_type: formData.get('sub_type'),
    academic_year_start: year,
    academic_year_current: year,
    status: formData.get('status'),
    priority: formData.get('priority'),
    carry_forward: formData.get('status') !== 'completed',
    notes: formData.get('notes') ? [{
      id: uid('note'),
      text: formData.get('notes'),
      created_by: `local-${role.toLowerCase()}`,
      created_at: nowIso(),
      visibility: formData.get('visibility')
    }] : [],
    history: [{ version: 1, summary: `${module} record created locally`, updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }],
    created_by: `local-${role.toLowerCase()}`,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    visibility: formData.get('visibility')
  };
  store.academicLife.modules[module].unshift(record);
  error = 'Academic life record added locally. Export JSON to commit it.';
  render();
}

function academicRoute(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  return module;
}

function importBundle(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.candidates || !parsed.meetings || !parsed.workbench || !parsed.activities || !parsed.calendar || !parsed.academicLife) throw new Error('Bundle must include candidates, meetings, workbench, activities, calendar, and academicLife.');
      store = { ...store, ...parsed };
      error = 'JSON bundle imported into local browser state.';
      render();
    } catch (err) {
      error = err.message;
      render();
    }
  };
  reader.readAsText(file);
}

window.addEventListener('hashchange', render);

loadStore()
  .then((loaded) => {
    store = loaded;
    role = loaded.users.active_role || 'ADMIN';
    render();
  })
  .catch((err) => {
    root.innerHTML = `<main class="boot"><h1>Academic Lifecycle Manager (ALM)</h1><p>${escapeHtml(err.message)}</p></main>`;
  });
