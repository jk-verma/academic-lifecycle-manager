import { filterBar, subtaskForm } from './components/ui.js';
import { loadStore } from './data/load.js';
import { activitiesPage, activityDetailPage } from './pages/activities.js';
import { calendarDetailPage, calendarPage } from './pages/calendar.js';
import { candidateDetailPage, candidatePhasePage, candidatesListPage } from './pages/candidates.js';
import { dashboardPage } from './pages/dashboard.js';
import { dataPage } from './pages/data.js';
import { academicModuleDetailPage, academicModulePage, adminWorkPage, careerMobilityPage, externalEngagementsPage, miscellaneousPage, projectsPage, researchPage, subscriptionPage, supervisionPage, teachingPage } from './pages/academic-modules.js';
import { meetingDetailPage, meetingsListPage } from './pages/meetings.js';
import { mentorDetailPage, mentorsPage } from './pages/mentors.js';
import { myWorkPage, setupHomePage, startHerePage, templateDetailPage, templatesPage } from './pages/product.js';
import { reportsPage } from './pages/reports.js';
import { searchPage } from './pages/search.js';
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
let draggedSubtask = null;

function parseRoute() {
  return (location.hash.replace('#/', '') || 'dashboard').split('/').filter(Boolean);
}

function routeKey(parts = parseRoute()) {
  return parts.join('/');
}

function visibleCandidates() {
  return visibleByRole(store, role, store.candidates.records, ['topic', 'supervisor']);
}

function visibleMentors() {
  return visibleByRole(store, role, store.mentors.records, ['email', 'mobile_or_extension', 'role_description', 'specialization']);
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
    ...visibleMentors().map((item) => ({ ...item, title: item.name, route: `#/mentors/${item.id}` })),
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
    modules: [...new Set([...Object.keys(moduleLabels), ...Object.keys(store.academicLife.modules)])],
    priorities: [...new Set(allRecords().map((item) => item.priority).filter(Boolean))],
    academicYears: [...new Set(allRecords().flatMap((item) => [item.academic_year_start, item.academic_year_current]).filter(Boolean))].sort().reverse(),
    ...options
  });
}

function appendNoteForm(kind, id, module = '') {
  return `<section class="append-panel">
    <h4>Append-only note</h4>
    <form class="record-form" data-append-note="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-module="${escapeHtml(module)}">
      <input name="text" required placeholder="Add note without deleting history" />
      <button>Append note</button>
    </form>
  </section>`;
}

function cardActions(kind, id, module = '') {
  if (role !== 'ADMIN') return '';
  return `<button class="secondary compact" data-edit-kind="${escapeHtml(kind)}" data-edit-id="${escapeHtml(id)}" data-edit-module="${escapeHtml(module)}">Edit</button>
    <button class="secondary compact danger-action" data-archive-kind="${escapeHtml(kind)}" data-archive-id="${escapeHtml(id)}" data-archive-module="${escapeHtml(module)}">Delete</button>`;
}

function ctx() {
  return {
    store,
    role,
    filters,
    draft,
    diff,
    visibleCandidates,
    visibleMentors,
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
    cardActions,
    renderFilters,
    appendNoteForm,
    subtaskForm
  };
}

function shell(content) {
  const current = routeKey();
  const nav = [
    ['dashboard', 'Home'],
    ['teaching', 'Teaching'],
    ['research', 'Research', [
      ['research', 'Publications'],
      ['projects', 'Projects'],
      ['supervision', 'Supervision'],
      ['mentors', 'Mentors']
    ]],
    ['admin-work', 'Administration'],
    ['miscellaneous', 'Miscellaneous'],
    ['calendar', 'Calendar'],
    ['reports', 'Reports'],
    ['setup', 'Setup']
  ].map(([id, label, children]) => {
    const active = current.startsWith(id) || (current === '' && id === 'dashboard') || (children || []).some(([childId]) => current.startsWith(childId));
    const link = `<a class="${active ? 'active' : ''}" href="#/${id}">${label}</a>`;
    const childLinks = children ? `<div class="nav-sublist">${children.map(([childId, childLabel]) => `<a class="${current.startsWith(childId) ? 'active' : ''}" href="#/${childId}">${childLabel}</a>`).join('')}</div>` : '';
    return `<div class="${children ? 'nav-group' : ''}">${link}${childLinks}</div>`;
  }).join('');

  root.innerHTML = `<div class="app-shell">
    <aside class="sidebar">
      <div><p class="brand">Academic Lifecycle Manager</p><nav>${nav}</nav></div>
    </aside>
    <main class="content">
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
  else if (parts[0] === 'home') content = dashboardPage(c);
  else if (parts[0] === 'my-work') content = myWorkPage(c);
  else if (parts[0] === 'students' && parts[1] && parts[2] === 'phase') content = candidatePhasePage(c, parts[1], parts[3]);
  else if (parts[0] === 'students' && parts[1]) content = candidateDetailPage(c, parts[1]);
  else if (parts[0] === 'students') content = candidatesListPage(c);
  else if (parts[0] === 'mentors' && parts[1]) content = mentorDetailPage(c, parts[1]);
  else if (parts[0] === 'mentors') content = mentorsPage(c);
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
  else if (parts[0] === 'supervision' && parts[1] && parts[2] === 'phase') content = candidatePhasePage(c, parts[1], parts[3]);
  else if (parts[0] === 'supervision' && parts[1]) content = candidateDetailPage(c, parts[1]);
  else if (parts[0] === 'supervision') content = supervisionPage(c);
  else if (parts[0] === 'projects') content = projectsPage(c);
  else if (parts[0] === 'admin-work' && parts[1]) content = academicModuleDetailPage(c, 'admin_work', parts[1]);
  else if (parts[0] === 'admin-work') content = adminWorkPage(c);
  else if (parts[0] === 'miscellaneous') content = miscellaneousPage(c);
  else if (parts[0] === 'subscriptions' && parts[1]) content = academicModuleDetailPage(c, 'subscriptions', parts[1]);
  else if (parts[0] === 'subscriptions') content = subscriptionPage(c);
  else if (parts[0] === 'external' && parts[1]) content = academicModuleDetailPage(c, 'external_engagements', parts[1]);
  else if (parts[0] === 'external') content = externalEngagementsPage(c);
  else if (parts[0] === 'career-mobility' && parts[1]) content = academicModuleDetailPage(c, 'career_mobility', parts[1]);
  else if (parts[0] === 'career-mobility') content = careerMobilityPage(c);
  else if (parts[0] === 'career' && parts[1]) content = academicModuleDetailPage(c, 'career_mobility', parts[1]);
  else if (parts[0] === 'career') content = careerMobilityPage(c);
  else if (parts[0] === 'activities' && parts[1]) content = activityDetailPage(c, parts[1]);
  else if (parts[0] === 'activities') content = activitiesPage(c);
  else if (parts[0] === 'calendar' && parts[1]) content = calendarDetailPage(c, parts[1]);
  else if (parts[0] === 'calendar') content = calendarPage(c);
  else if (parts[0] === 'years' && parts[1]) content = yearDetailPage(c, parts[1]);
  else if (parts[0] === 'years') content = yearsPage(c);
  else if (parts[0] === 'reports') content = reportsPage(c);
  else if (parts[0] === 'search') content = searchPage(c);
  else if (parts[0] === 'data') content = dataPage(c);
  else if (parts[0] === 'setup') content = setupHomePage(c);
  else if (parts[0] === 'start-here') content = startHerePage(c);
  else if (parts[0] === 'templates' && parts[1]) content = templateDetailPage(c, parts[1]);
  else if (parts[0] === 'templates') content = templatesPage(c);
  else content = dashboardPage(c);
  shell(content);
  bindEvents();
}

function bindEvents() {
  ['q', 'programme', 'candidate', 'phase', 'module', 'status', 'priority', 'overdue', 'institution', 'academicYear', 'from', 'to'].forEach((key) => {
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

  document.querySelectorAll('[data-add-subtask]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addSubtask(form.dataset.addSubtask, form.dataset.id, new FormData(form), form.dataset.module || '');
    });
  });

  document.querySelectorAll('[data-reorder-subtask]').forEach((item) => {
    item.addEventListener('dragstart', () => {
      draggedSubtask = { kind: item.dataset.kind, id: item.dataset.id, module: item.dataset.module || '', subtaskId: item.dataset.subtaskId };
    });
    item.addEventListener('dragover', (event) => {
      event.preventDefault();
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', (event) => {
      event.preventDefault();
      item.classList.remove('drag-over');
      if (draggedSubtask) {
        const rect = item.getBoundingClientRect();
        const dragOffset = Math.max(0, event.clientX - rect.left);
        const hierarchyLevel = dragOffset >= 160 ? 2 : dragOffset >= 80 ? 1 : 0;
        reorderSubtask(draggedSubtask, item.dataset.subtaskId, hierarchyLevel);
      }
      draggedSubtask = null;
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
    button.addEventListener('click', () => {
      if (button.classList.contains('danger-action') && !confirm('Archive this record locally? This does not hard-delete history.')) return;
      archiveRecord(button.dataset.archiveKind, button.dataset.archiveId, button.dataset.archiveModule || '');
    });
  });

  document.querySelectorAll('[data-edit-kind]').forEach((button) => {
    button.addEventListener('click', () => editRecord(button.dataset.editKind, button.dataset.editId, button.dataset.editModule || ''));
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

  document.querySelectorAll('[data-update-course]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateCourseDetails(form.dataset.updateCourse, new FormData(form));
    });
  });

  document.querySelectorAll('[data-update-course-item]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateCourseItem(form.dataset.updateCourseItem, new FormData(form));
    });
  });

  const candidateForm = document.getElementById('candidate-form');
  if (candidateForm) candidateForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addCandidate(new FormData(candidateForm));
  });

  const mentorForm = document.getElementById('mentor-form');
  if (mentorForm) mentorForm.addEventListener('submit', (event) => {
    event.preventDefault();
    addMentor(new FormData(mentorForm));
  });

  document.querySelectorAll('[data-workbench-module]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addWorkbenchRecord(form.dataset.workbenchModule, new FormData(form));
    });
  });
}

function appendNote(kind, id, formData, module) {
  if (!canWrite(store, role)) return;
  const note = {
    id: uid('note'),
    text: formData.get('text'),
    visibility: 'open',
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

function findTaskRecord(kind, id, module = '') {
  if (kind === 'candidate') return store.candidates.records.find((item) => item.id === id);
  if (kind === 'workbench') return store.workbench.modules[module]?.find((item) => item.id === id);
  if (kind === 'academic') return store.academicLife.modules[module]?.find((item) => item.id === id);
  return null;
}

function addSubtask(kind, id, formData, module = '') {
  if (!canWrite(store, role)) return;
  const record = findTaskRecord(kind, id, module);
  if (!record) return;
  record.subtasks = record.subtasks || [];
  const actor = `local-${role.toLowerCase()}`;
  const insertAfter = Number(formData.get('insert_after_order') || record.subtasks.length);
  const dueDatetime = formData.get('due_datetime');
  const completedDatetime = formData.get('completed_datetime') || (formData.get('status') === 'completed' ? nowIso().slice(0, 16) : '');
  const subtask = {
    id: uid('subtask'),
    parent_record_id: id,
    title: formData.get('title'),
    subtask_type: formData.get('subtask_type'),
    due_datetime: dueDatetime,
    due_date: dueDatetime ? dueDatetime.slice(0, 10) : '',
    completed_datetime: completedDatetime,
    completed_date: completedDatetime ? completedDatetime.slice(0, 10) : '',
    status: formData.get('status'),
    responsible_person: formData.get('responsible_person'),
    responsible_contact: formData.get('responsible_contact'),
    hierarchy_level: 0,
    parent_subtask_id: '',
    notes: formData.get('notes') ? [{
      id: uid('note'),
      text: formData.get('notes'),
      created_by: actor,
      created_at: nowIso(),
      visibility: record.visibility || 'open'
    }] : [],
    history: [{
      version: 1,
      summary: 'Subtask added locally',
      updated_by: actor,
      updated_at: nowIso()
    }],
    sequence_order: insertAfter + 1
  };
  record.subtasks.push(subtask);
  record.subtasks = record.subtasks
    .sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0))
    .map((item, index) => ({ ...item, sequence_order: index + 1 }));
  record.history = record.history || record.revision_history || [];
  record.history.push({
    version: record.history.length + 1,
    summary: `Subtask added: ${formData.get('title')}`,
    updated_by: actor,
    updated_at: nowIso()
  });
  if (record.revision_history && record.revision_history !== record.history) {
    record.revision_history.push({
      version: record.revision_history.length + 1,
      summary: `Subtask added: ${formData.get('title')}`,
      updated_by: actor,
      updated_at: nowIso()
    });
  }
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.updated_by = actor;
  error = 'Subtask added locally. Export JSON to commit it.';
  render();
}

function reorderSubtask(source, targetSubtaskId, hierarchyLevel = 0) {
  if (!canWrite(store, role)) return;
  const record = findTaskRecord(source.kind, source.id, source.module);
  if (!record || source.subtaskId === targetSubtaskId) return;
  const subtasks = [...(record.subtasks || [])].sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0));
  const movingIndex = subtasks.findIndex((item) => item.id === source.subtaskId);
  const targetIndex = subtasks.findIndex((item) => item.id === targetSubtaskId);
  if (movingIndex < 0 || targetIndex < 0) return;
  const [moving] = subtasks.splice(movingIndex, 1);
  const adjustedTargetIndex = subtasks.findIndex((item) => item.id === targetSubtaskId);
  const insertIndex = hierarchyLevel > 0 ? adjustedTargetIndex + 1 : adjustedTargetIndex;
  subtasks.splice(insertIndex, 0, moving);
  const clampedLevel = Math.max(0, Math.min(2, Number(hierarchyLevel || 0)));
  const movingPosition = subtasks.findIndex((item) => item.id === moving.id);
  const parent = findHierarchyParent(subtasks, movingPosition, clampedLevel);
  record.subtasks = subtasks.map((item, index) => {
    if (item.id !== moving.id) return { ...item, sequence_order: index + 1 };
    return {
      ...item,
      sequence_order: index + 1,
      hierarchy_level: clampedLevel,
      parent_subtask_id: parent?.id || ''
    };
  });
  const actor = `local-${role.toLowerCase()}`;
  const hierarchyLabel = clampedLevel === 2 ? 'sub-sub-activity' : clampedLevel === 1 ? 'sub-activity' : 'activity';
  const summary = `Subtask reordered as ${hierarchyLabel}: ${moving.title}`;
  record.history = record.history || record.revision_history || [];
  record.history.push({ version: record.history.length + 1, summary, updated_by: actor, updated_at: nowIso() });
  if (record.revision_history && record.revision_history !== record.history) {
    record.revision_history.push({ version: record.revision_history.length + 1, summary, updated_by: actor, updated_at: nowIso() });
  }
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.updated_by = actor;
  error = 'Subtask order changed locally. Export JSON to commit it.';
  render();
}

function findHierarchyParent(subtasks, movingPosition, hierarchyLevel) {
  if (hierarchyLevel <= 0) return null;
  for (let index = movingPosition - 1; index >= 0; index -= 1) {
    const candidateLevel = Number(subtasks[index].hierarchy_level || 0);
    if (hierarchyLevel === 1 && candidateLevel === 0) return subtasks[index];
    if (hierarchyLevel === 2 && candidateLevel === 1) return subtasks[index];
  }
  return hierarchyLevel === 1 ? subtasks[movingPosition - 1] : findHierarchyParent(subtasks, movingPosition, 1);
}

function archiveRecord(kind, id, module = '') {
  if (!canArchive(store, role)) return;
  const record = findEditableRecord(kind, id, module);
  if (!record) return;
  record.status = 'archived';
  record.updated_by = `local-${role.toLowerCase()}`;
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.revision_history = record.revision_history || [];
  record.revision_history.push({
    version: record.revision_history.length + 1,
    summary: 'Delete action archived this record locally instead of hard deletion',
    updated_by: record.updated_by,
    updated_at: nowIso()
  });
  record.history = record.history || [];
  record.history.push({
    version: record.history.length + 1,
    summary: 'Delete action archived this record locally instead of hard deletion',
    updated_by: record.updated_by,
    updated_at: nowIso()
  });
  error = 'Record archived locally. Export JSON to commit it.';
  render();
}

function editRecord(kind, id, module = '') {
  if (role !== 'ADMIN') return;
  const record = findEditableRecord(kind, id, module);
  if (!record) return;
  draft = structuredClone(record);
  draft.updated_by = `local-${role.toLowerCase()}`;
  draft.timestamps = { ...(draft.timestamps || {}), updated_at: nowIso() };
  diff = diffSummary(record, draft);
  error = 'Editable local JSON draft prepared. Adjust/export from Data, then commit the JSON update.';
  location.hash = '#/data';
  render();
}

function findEditableRecord(kind, id, module = '') {
  if (kind === 'candidate') return store.candidates.records.find((item) => item.id === id);
  if (kind === 'mentor') return store.mentors.records.find((item) => item.id === id);
  if (kind === 'meeting') return store.meetings.records.find((item) => item.id === id);
  if (kind === 'activity') return store.activities.records.find((item) => item.id === id);
  if (kind === 'calendar') return store.calendar.records.find((item) => item.id === id);
  if (kind === 'workbench') return store.workbench.modules[module]?.find((item) => item.id === id);
  if (kind === 'academic') return store.academicLife.modules[module]?.find((item) => item.id === id);
  return null;
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
    visibility: 'open',
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
    visibility: 'open',
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
    visibility: 'open',
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
    final_deadline: formData.get('final_deadline'),
    status: formData.get('status'),
    priority: formData.get('priority'),
    carry_forward: formData.get('status') !== 'completed',
    notes: formData.get('notes') ? [{
      id: uid('note'),
      text: formData.get('notes'),
      created_by: `local-${role.toLowerCase()}`,
      created_at: nowIso(),
      visibility: 'open'
    }] : [],
    subtasks: [],
    history: [{ version: 1, summary: `${module} record created locally`, updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }],
    created_by: `local-${role.toLowerCase()}`,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    visibility: 'open'
  };
  if (module === 'teaching') {
    applyCourseFields(record, formData);
    record.subtasks = defaultCourseSubtasks(record.id);
  }
  ['institution_name', 'role_title', 'opportunity_type', 'employment_basis', 'place_city', 'place_country', 'application_deadline', 'application_date', 'starting_date', 'ending_date', 'payment', 'payment_status'].forEach((field) => {
    if (formData.has(field) && formData.get(field)) record[field] = formData.get(field);
  });
  store.academicLife.modules[module].unshift(record);
  error = 'Academic life record added locally. Export JSON to commit it.';
  render();
}

function updateCourseDetails(id, formData) {
  if (!canWrite(store, role)) return;
  const course = store.academicLife.modules.teaching?.find((item) => item.id === id);
  if (!course) return;
  applyCourseFields(course, formData);
  const actor = `local-${role.toLowerCase()}`;
  course.updated_by = actor;
  course.timestamps = { ...(course.timestamps || {}), updated_at: nowIso() };
  course.history = course.history || [];
  course.history.push({ version: course.history.length + 1, summary: 'Course details updated locally', updated_by: actor, updated_at: nowIso() });
  const note = formData.get('note');
  if (note) {
    course.notes = course.notes || [];
    course.notes.push({ id: uid('note'), text: note, created_by: actor, created_at: nowIso(), visibility: 'open' });
  }
  error = 'Course details updated locally. Export JSON to commit it.';
  render();
}

function updateCourseItem(id, formData) {
  if (!canWrite(store, role)) return;
  const course = store.academicLife.modules.teaching?.find((item) => item.id === id);
  if (!course) return;
  course.subtasks = course.subtasks || [];
  const actor = `local-${role.toLowerCase()}`;
  const subtaskId = formData.get('subtask_id');
  let subtask = course.subtasks.find((item) => item.id === subtaskId);
  const created = !subtask;
  if (!subtask) {
    subtask = { id: uid('course-item'), parent_record_id: course.id, sequence_order: course.subtasks.length + 1, notes: [], history: [] };
    course.subtasks.push(subtask);
  }
  subtask.title = formData.get('title');
  subtask.subtask_type = formData.get('subtask_type');
  subtask.due_datetime = formData.get('due_datetime');
  subtask.due_date = subtask.due_datetime ? subtask.due_datetime.slice(0, 10) : subtask.due_date || '';
  subtask.completed_datetime = formData.get('completed_datetime');
  subtask.completed_date = subtask.completed_datetime ? subtask.completed_datetime.slice(0, 10) : subtask.completed_date || '';
  subtask.status = formData.get('status');
  subtask.responsible_person = formData.get('responsible_person') || subtask.responsible_person || 'Dr. Jitendra Kumar Verma';
  const note = formData.get('notes');
  if (note) {
    subtask.notes = subtask.notes || [];
    subtask.notes.push({ id: uid('note'), text: note, created_by: actor, created_at: nowIso(), visibility: 'open' });
  }
  subtask.history = subtask.history || [];
  subtask.history.push({ version: subtask.history.length + 1, summary: created ? 'Course inner item created locally' : 'Course inner item updated locally', updated_by: actor, updated_at: nowIso() });
  course.history = course.history || [];
  course.history.push({ version: course.history.length + 1, summary: `Course item updated: ${subtask.title}`, updated_by: actor, updated_at: nowIso() });
  course.updated_by = actor;
  course.timestamps = { ...(course.timestamps || {}), updated_at: nowIso() };
  error = 'Course lecture/task item updated locally. Export JSON to commit it.';
  render();
}

function applyCourseFields(course, formData) {
  course.course_outline_circulation_date = formData.get('course_outline_circulation_date') || course.course_outline_circulation_date || '';
  course.course_type = formData.get('course_type') || course.course_type || 'UG';
  course.total_hours = formData.get('total_hours') || course.total_hours || course.hours || '30 Hours';
  course.hours = Number.parseFloat(String(course.total_hours).replace(/[^\d.]/g, '')) || course.hours || 30;
  course.total_lectures = Number(formData.get('total_lectures') || course.total_lectures || 20);
  course.lecture_duration = formData.get('lecture_duration') || course.lecture_duration || '1.5 Hour';
  course.total_marks = Number(formData.get('total_marks') || course.total_marks || 100);
  course.internal_component_marks = Number(formData.get('internal_component_marks') || course.internal_component_marks || 50);
  course.external_component_marks = Number(formData.get('external_component_marks') || course.external_component_marks || 50);
  course.internal_components = {
    quiz_1: Number(formData.get('quiz_1') || course.internal_components?.quiz_1 || 5),
    quiz_2: Number(formData.get('quiz_2') || course.internal_components?.quiz_2 || 5),
    class_participation: Number(formData.get('class_participation') || course.internal_components?.class_participation || 5),
    assignments: Number(formData.get('assignments') || course.internal_components?.assignments || 10),
    projects: Number(formData.get('projects') || course.internal_components?.projects || 10)
  };
}

function defaultCourseSubtasks(parentId) {
  const now = nowIso();
  const base = Array.from({ length: 20 }, (_, index) => ({
    id: `sub-${parentId}-lecture-${index + 1}`,
    parent_record_id: parentId,
    title: `Lecture-${index + 1}: Lecture on pre-defined topics`,
    subtask_type: 'lecture',
    due_date: '',
    completed_date: '',
    status: 'pending',
    responsible_person: 'Dr. Jitendra Kumar Verma',
    notes: [],
    history: [{ version: 1, summary: 'Course lecture item created', updated_by: 'local-admin', updated_at: now }],
    sequence_order: index + 1
  }));
  const inserts = [
    [7.1, 'Assignment-1 questions', 'assignment'],
    [7.2, 'Project title set-1 + sample report (Ranchoddas Shamaldas Chanchad Alias Rancho)', 'project'],
    [7.3, 'Quiz-1 questions', 'quiz'],
    [7.4, 'Question paper setting if UG course', 'question_paper_setting'],
    [10.1, 'In-class Quiz-1', 'quiz'],
    [10.2, 'Mid Term Exam: held on date', 'mid_term_exam'],
    [10.3, 'Answer script collection: collection date', 'answer_script_collection'],
    [10.4, 'Evaluation target completion and display date', 'evaluation'],
    [17.1, 'Assignment-2 questions', 'assignment'],
    [17.2, 'Project title set-2 + sample report (Chatur Ramalingam Alias Silencer)', 'project'],
    [17.3, 'Quiz-2 questions if needed paper + OMR based', 'quiz'],
    [17.4, 'Question paper setting', 'question_paper_setting'],
    [20.1, 'End-Term Exam: held on date', 'end_term_exam'],
    [20.2, 'Answer script collection: collection date', 'answer_script_collection'],
    [20.3, 'Evaluation target completion and display date', 'evaluation'],
    [20.4, 'Append notes: exceptional students, undisciplined students, difficult question paper if needed', 'discipline_note']
  ].map(([order, title, type]) => ({
    id: `sub-${parentId}-${String(order).replace('.', '-')}`,
    parent_record_id: parentId,
    title,
    subtask_type: type,
    due_date: '',
    completed_date: '',
    status: 'pending',
    responsible_person: 'Dr. Jitendra Kumar Verma',
    notes: [],
    history: [{ version: 1, summary: 'Course task item created', updated_by: 'local-admin', updated_at: now }],
    sequence_order: order
  }));
  return [...base, ...inserts].sort((a, b) => Number(a.sequence_order) - Number(b.sequence_order)).map((item, index) => ({ ...item, sequence_order: index + 1 }));
}

function phaseTemplate(programmeType) {
  if (programmeType === 'PhD') return ['Synopsis', 'Progress Reports', 'DAC-1', 'DAC-2', 'DAC-3', 'Pre-submission Viva'];
  if (programmeType === 'Masters') return ['Synopsis', 'Interim Report', 'Final Report'];
  if (programmeType === 'Intern') return ['Orientation', 'Weekly Review', 'Final Review'];
  return ['Planning', 'Progress Review', 'Final Review'];
}

function addCandidate(formData) {
  if (!canWrite(store, role)) return;
  const programmeType = formData.get('programme_type');
  const startDate = formData.get('start_date');
  const deadline = formData.get('final_deadline_datetime');
  const actor = `local-${role.toLowerCase()}`;
  const year = formData.get('academic_year_current') || academicYearForDate(startDate);
  const visibility = 'open';
  const candidate = {
    id: uid('cand'),
    title: formData.get('name'),
    name: formData.get('name'),
    category: 'supervision',
    sub_type: programmeType,
    programme_type: programmeType,
    topic: formData.get('topic'),
    phase_progress: phaseTemplate(programmeType).map((phase, index) => ({
      phase,
      status: index === 0 ? 'active' : 'not_started',
      updated_at: nowIso().slice(0, 10)
    })),
    supervisor: formData.get('supervisor') || 'Dr. Jitendra Kumar Verma',
    start_date: startDate,
    final_deadline_datetime: deadline,
    final_deadline: deadline ? deadline.slice(0, 10) : '',
    academic_year_start: academicYearForDate(startDate),
    academic_year_current: year,
    priority: formData.get('priority'),
    visibility,
    status: formData.get('status'),
    carry_forward: formData.get('status') !== 'completed',
    created_by: actor,
    updated_by: actor,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    notes_append_only: formData.get('note') ? [{ id: uid('note'), text: formData.get('note'), visibility, created_by: actor, created_at: nowIso() }] : [],
    notes: [],
    attachments: [],
    revision_history: [{ version: 1, summary: 'Candidate workspace created locally', updated_by: actor, updated_at: nowIso() }],
    history: [{ version: 1, summary: 'Candidate workspace created locally', updated_by: actor, updated_at: nowIso() }],
    subtasks: []
  };
  store.candidates.records.unshift(candidate);
  error = 'Candidate added locally. Export JSON to commit it.';
  render();
}

function addMentor(formData) {
  if (!canWrite(store, role)) return;
  const actor = `local-${role.toLowerCase()}`;
  const year = formData.get('academic_year_current') || academicYearForDate();
  const visibility = 'open';
  const noteText = formData.get('note');
  const mentor = {
    id: uid('mentor'),
    name: formData.get('name'),
    title: formData.get('name'),
    mentor_type: formData.get('mentor_type'),
    designation: formData.get('designation'),
    organization: formData.get('organization'),
    email: formData.get('email'),
    mobile_or_extension: formData.get('mobile_or_extension'),
    specialization: formData.get('specialization'),
    assigned_candidate_ids: String(formData.get('assigned_candidate_ids') || '').split(',').map((item) => item.trim()).filter(Boolean),
    role_description: formData.get('role_description'),
    academic_year_start: year,
    academic_year_current: year,
    status: formData.get('status'),
    priority: formData.get('priority'),
    carry_forward: formData.get('status') !== 'inactive' && formData.get('status') !== 'archived',
    visibility,
    created_by: actor,
    updated_by: actor,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    notes_append_only: noteText ? [{ id: uid('note'), text: noteText, visibility, created_by: actor, created_at: nowIso() }] : [],
    history: [{ version: 1, summary: 'Mentor record created locally', updated_by: actor, updated_at: nowIso() }]
  };
  store.mentors.records.unshift(mentor);
  error = 'Mentor added locally. Export JSON to commit it.';
  render();
}

function addWorkbenchRecord(module, formData) {
  if (!canWrite(store, role)) return;
  const deadline = formData.get('final_deadline_datetime');
  const year = formData.get('academic_year_current') || academicYearForDate(deadline ? deadline.slice(0, 10) : undefined);
  const actor = `local-${role.toLowerCase()}`;
  const record = {
    id: uid(module),
    title: formData.get('title'),
    category: module,
    sub_type: formData.get('sub_type') || formData.get('type') || module,
    collaborators: [],
    organization_or_publisher: formData.get('funding_agency') || formData.get('organization') || formData.get('publisher') || formData.get('journal') || formData.get('conference_name') || formData.get('platform') || '',
    description_or_abstract: formData.get('description_or_abstract'),
    final_deadline_datetime: deadline,
    final_deadline: deadline ? deadline.slice(0, 10) : '',
    academic_year_start: year,
    academic_year_current: year,
    status: formData.get('status'),
    priority: formData.get('priority'),
    carry_forward: formData.get('status') !== 'completed',
    visibility: 'open',
    created_by: actor,
    updated_by: actor,
    timestamps: { created_at: nowIso(), updated_at: nowIso() },
    notes_append_only: formData.get('note') ? [{ id: uid('note'), text: formData.get('note'), visibility: 'open', created_by: actor, created_at: nowIso() }] : [],
    attachments: [],
    revision_history: [{ version: 1, summary: `${module} activity created locally`, updated_by: actor, updated_at: nowIso() }],
    notes: [],
    history: [{ version: 1, summary: `${module} activity created locally`, updated_by: actor, updated_at: nowIso() }],
    subtasks: []
  };
  ['type', 'funding_agency', 'PI', 'budget', 'journal', 'conference_name', 'publisher', 'book_title', 'organization', 'platform'].forEach((field) => {
    if (formData.has(field) && formData.get(field)) record[field] = formData.get(field);
  });
  record.co_investigators = [];
  record.team = [];
  record.reporting_deadlines = [];
  record.deliverables = [];
  store.workbench.modules[module] = store.workbench.modules[module] || [];
  store.workbench.modules[module].unshift(record);
  error = 'Workbench activity added locally. Export JSON to commit it.';
  render();
}

function academicRoute(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  if (module === 'career_mobility') return 'career-mobility';
  if (module === 'subscriptions') return 'subscriptions';
  return module;
}

function importBundle(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.candidates || !parsed.meetings || !parsed.workbench || !parsed.activities || !parsed.calendar || !parsed.academicLife || !parsed.workflowTemplates) throw new Error('Bundle must include candidates, meetings, workbench, activities, calendar, academicLife, and workflowTemplates.');
      parsed.mentors = parsed.mentors || { schema: 'academic-lifecycle-manager.mentors.v1', updated_at: nowIso(), records: [] };
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
    root.innerHTML = `<main class="boot"><h1>Academic Lifecycle Manager</h1><p>${escapeHtml(err.message)}</p></main>`;
  });
