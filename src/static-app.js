import { filterBar, subtaskForm } from './components/ui.js';
import { composeStore, loadStore } from './data/load.js';
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
  return visibleByRole(store, role, store.candidates.records, ['topic', 'supervisor']).filter(notArchived);
}

function visibleMentors() {
  return visibleByRole(store, role, store.mentors.records, ['email', 'mobile_or_extension', 'role_description', 'specialization']).filter(notArchived);
}

function visibleMeetings() {
  return visibleByRole(store, role, store.meetings.records, ['agenda', 'discussion', 'decisions', 'venue_or_link', 'responsible_person']).filter(notArchived);
}

function visibleWorkbench() {
  return visibleByRole(store, role, flattenWorkbench(store.workbench), ['description_or_abstract', 'budget', 'honorarium', 'deliverables']).filter(notArchived);
}

function visibleActivities() {
  return visibleByRole(store, role, store.activities.records, ['short_notes']).filter(notArchived);
}

function visibleCalendar() {
  return visibleByRole(store, role, store.calendar.records, ['notes']).filter(notArchived);
}

function visibleAcademicLife() {
  return Object.entries(store.academicLife.modules).flatMap(([module, records]) =>
    visibleByRole(store, role, records.map((record) => ({ ...record, module })), ['notes', 'feedback', 'responsibility'])
  ).filter(notArchived);
}

function notArchived(record = {}) {
  return String(record.status || '').toLowerCase() !== 'archived';
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
  ['q', 'programme', 'candidate', 'phase', 'module', 'status', 'priority', 'overdue', 'institution', 'academicYear', 'teachingYear', 'teachingCampus', 'teachingCourseType', 'from', 'to'].forEach((key) => {
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

  document.querySelectorAll('[data-edit-subtask]').forEach((button) => {
    button.addEventListener('click', () => fillSubtaskEditForm(button.dataset.kind, button.dataset.id, button.dataset.module || '', button.dataset.subtaskId));
  });

  document.querySelectorAll('[data-delete-subtask]').forEach((button) => {
    button.addEventListener('click', () => {
      if (!confirm('Mark this activity as cancelled locally? History will be preserved.')) return;
      cancelSubtask(button.dataset.kind, button.dataset.id, button.dataset.module || '', button.dataset.subtaskId);
    });
  });

  const exportJson = document.getElementById('export-json');
  if (exportJson) exportJson.addEventListener('click', () => downloadJson('academic-lifecycle-manager-data-export.json', sourceDataBundle()));

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
    button.addEventListener('click', () => editRecord(button.dataset.editKind, button.dataset.editId, button.dataset.editModule || '', button));
  });

  document.querySelectorAll('[data-new-course]').forEach((button) => {
    button.addEventListener('click', () => prepareTeachingCourseForm());
  });

  document.querySelectorAll('[data-reset-teaching-filters]').forEach((button) => {
    button.addEventListener('click', () => {
      delete filters.teachingCampus;
      delete filters.teachingCourseType;
      delete filters.teachingYear;
      render();
    });
  });

  document.querySelectorAll('[data-copy-json]').forEach((button) => {
    button.addEventListener('click', () => copyJsonSection(button.dataset.copyJson));
  });

  document.querySelectorAll('[data-inline-json-edit]').forEach((form) => {
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateRecordFromInlineJson(form.dataset.inlineJsonEdit, form.dataset.id, form.dataset.module || '', new FormData(form));
    });
  });

  document.querySelectorAll('[data-toggle-panel]').forEach((button) => {
    button.addEventListener('click', () => {
      const panel = document.getElementById(button.dataset.togglePanel);
      if (!panel) return;
      panel.hidden = !panel.hidden;
      if (!panel.hidden) panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
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
    if (form.dataset.academicModule === 'teaching') bindCourseCalculations(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      addAcademicLifeRecord(form.dataset.academicModule, new FormData(form));
    });
  });

  document.querySelectorAll('[data-update-course]').forEach((form) => {
    bindCourseCalculations(form);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateCourseDetails(form.dataset.updateCourse, new FormData(form));
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
  const editingId = formData.get('subtask_id');
  const existing = editingId ? record.subtasks.find((item) => item.id === editingId) : null;
  const insertAfterRaw = formData.get('insert_after_order');
  const parentSubtaskId = formData.get('parent_subtask_id') || '';
  const hierarchyLevelRaw = formData.get('hierarchy_level');
  const hierarchyLevelValue = Number(hierarchyLevelRaw === null || hierarchyLevelRaw === '' ? (parentSubtaskId ? 1 : 0) : hierarchyLevelRaw);
  const hierarchyLevel = parentSubtaskId && hierarchyLevelValue === 0 ? 1 : Math.max(0, Math.min(2, hierarchyLevelValue));
  const insertAfter = insertAfterRaw === null || insertAfterRaw === ''
    ? nextSubtaskInsertOrder(record.subtasks, parentSubtaskId)
    : Number(insertAfterRaw);
  const dueDatetime = formData.get('due_datetime');
  const completedDatetime = formData.get('completed_datetime') || (formData.get('status') === 'completed' ? nowIso().slice(0, 16) : '');
  const subtask = existing || {
    id: uid('subtask'),
    parent_record_id: id,
    hierarchy_level: hierarchyLevel,
    parent_subtask_id: parentSubtaskId,
    notes: [],
    history: [],
    sequence_order: insertAfter + 1
  };
  Object.assign(subtask, {
    title: formData.get('title'),
    subtask_type: formData.get('subtask_type'),
    due_datetime: dueDatetime,
    due_date: dueDatetime ? dueDatetime.slice(0, 10) : '',
    completed_datetime: completedDatetime,
    completed_date: completedDatetime ? completedDatetime.slice(0, 10) : '',
    status: formData.get('status'),
    responsible_person: formData.get('responsible_person'),
    responsible_contact: formData.get('responsible_contact'),
    hierarchy_level: hierarchyLevel,
    parent_subtask_id: hierarchyLevel > 0 ? parentSubtaskId : ''
  });
  if (formData.get('notes')) {
    subtask.notes = subtask.notes || [];
    subtask.notes.push({ id: uid('note'), text: formData.get('notes'), created_by: actor, created_at: nowIso(), visibility: record.visibility || 'open' });
  }
  subtask.history = subtask.history || [];
  subtask.history.push({ version: subtask.history.length + 1, summary: existing ? 'Subtask updated locally' : 'Subtask added locally', updated_by: actor, updated_at: nowIso() });
  if (!existing) {
    record.subtasks = record.subtasks.map((item) => Number(item.sequence_order || 0) > insertAfter ? { ...item, sequence_order: Number(item.sequence_order || 0) + 1 } : item);
    record.subtasks.push(subtask);
  }
  record.subtasks = renumberSubtasks(record.subtasks);
  record.history = record.history || record.revision_history || [];
  record.history.push({
    version: record.history.length + 1,
    summary: `${existing ? 'Subtask updated' : 'Subtask added'}: ${formData.get('title')}`,
    updated_by: actor,
    updated_at: nowIso()
  });
  if (record.revision_history && record.revision_history !== record.history) {
    record.revision_history.push({
      version: record.revision_history.length + 1,
      summary: `${existing ? 'Subtask updated' : 'Subtask added'}: ${formData.get('title')}`,
      updated_by: actor,
      updated_at: nowIso()
    });
  }
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.updated_by = actor;
  error = `${existing ? 'Subtask updated' : 'Subtask added'} locally. Export JSON to commit it.`;
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
  record.subtasks = renumberSubtasks(subtasks.map((item, index) => {
    if (item.id !== moving.id) return { ...item, sequence_order: index + 1 };
    return {
      ...item,
      sequence_order: index + 1,
      hierarchy_level: clampedLevel,
      parent_subtask_id: parent?.id || ''
    };
  }));
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

function fillSubtaskEditForm(kind, id, module, subtaskId) {
  const record = findTaskRecord(kind, id, module);
  const subtask = record?.subtasks?.find((item) => item.id === subtaskId);
  if (!subtask) return;
  const form = document.querySelector(`[data-add-subtask="${CSS.escape(kind)}"][data-id="${CSS.escape(id)}"]`);
  if (!form) {
    promptSubtaskEdit(record, subtask);
    return;
  }
  if (!form) return;
  if (form.elements.subtask_id) form.elements.subtask_id.value = subtask.id;
  if (form.elements.title) form.elements.title.value = subtask.title || '';
  if (form.elements.subtask_type) form.elements.subtask_type.value = subtask.subtask_type || '';
  if (form.elements.due_datetime) form.elements.due_datetime.value = subtask.due_datetime || '';
  if (form.elements.completed_datetime) form.elements.completed_datetime.value = subtask.completed_datetime || '';
  if (form.elements.status) form.elements.status.value = subtask.status === 'ongoing' ? 'pending' : (subtask.status || 'pending');
  if (form.elements.responsible_person) form.elements.responsible_person.value = subtask.responsible_person || '';
  if (form.elements.responsible_contact) form.elements.responsible_contact.value = subtask.responsible_contact || '';
  if (form.elements.parent_subtask_id) form.elements.parent_subtask_id.value = subtask.parent_subtask_id || '';
  if (form.elements.hierarchy_level) form.elements.hierarchy_level.value = String(subtask.hierarchy_level || 0);
  if (form.elements.notes) form.elements.notes.value = '';
  form.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function promptSubtaskEdit(record, subtask) {
  if (!canWrite(store, role)) return;
  const title = prompt('Activity title', subtask.title || '');
  if (title === null) return;
  const status = prompt('Status: pending, completed, deferred, cancelled', subtask.status === 'ongoing' ? 'pending' : (subtask.status || 'pending'));
  if (status === null) return;
  const normalized = ['pending', 'completed', 'deferred', 'cancelled'].includes(status.trim()) ? status.trim() : 'pending';
  const actor = `local-${role.toLowerCase()}`;
  subtask.title = title.trim() || subtask.title;
  subtask.status = normalized;
  subtask.history = subtask.history || [];
  subtask.history.push({ version: subtask.history.length + 1, summary: 'Activity edited locally', updated_by: actor, updated_at: nowIso() });
  record.history = record.history || record.revision_history || [];
  record.history.push({ version: record.history.length + 1, summary: `Activity edited locally: ${subtask.title}`, updated_by: actor, updated_at: nowIso() });
  if (record.revision_history && record.revision_history !== record.history) {
    record.revision_history.push({ version: record.revision_history.length + 1, summary: `Activity edited locally: ${subtask.title}`, updated_by: actor, updated_at: nowIso() });
  }
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.updated_by = actor;
  error = 'Activity edited locally. Export JSON to commit it.';
  render();
}

function cancelSubtask(kind, id, module, subtaskId) {
  if (!canWrite(store, role)) return;
  const record = findTaskRecord(kind, id, module);
  const subtask = record?.subtasks?.find((item) => item.id === subtaskId);
  if (!subtask) return;
  const actor = `local-${role.toLowerCase()}`;
  subtask.status = 'cancelled';
  subtask.history = subtask.history || [];
  subtask.history.push({ version: subtask.history.length + 1, summary: 'Delete action marked this activity as cancelled locally', updated_by: actor, updated_at: nowIso() });
  record.history = record.history || record.revision_history || [];
  record.history.push({ version: record.history.length + 1, summary: `Activity cancelled locally: ${subtask.title}`, updated_by: actor, updated_at: nowIso() });
  if (record.revision_history && record.revision_history !== record.history) {
    record.revision_history.push({ version: record.revision_history.length + 1, summary: `Activity cancelled locally: ${subtask.title}`, updated_by: actor, updated_at: nowIso() });
  }
  record.timestamps = record.timestamps || {};
  record.timestamps.updated_at = nowIso();
  record.updated_by = actor;
  error = 'Activity marked cancelled locally. Export JSON to commit it.';
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

function nextSubtaskInsertOrder(subtasks = [], parentSubtaskId = '') {
  const sorted = [...subtasks].sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0));
  if (!parentSubtaskId) return sorted.length;
  const parentIndex = sorted.findIndex((item) => item.id === parentSubtaskId);
  if (parentIndex < 0) return sorted.length;
  const parentLevel = Number(sorted[parentIndex].hierarchy_level || 0);
  let insertIndex = parentIndex;
  for (let index = parentIndex + 1; index < sorted.length; index += 1) {
    if (Number(sorted[index].hierarchy_level || 0) <= parentLevel) break;
    insertIndex = index;
  }
  return insertIndex + 1;
}

function renumberSubtasks(subtasks = []) {
  const sorted = [...subtasks].sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0));
  const byId = new Map();
  const childCounts = new Map();
  let topCount = 0;
  return sorted.map((item, index) => {
    const level = Math.max(0, Math.min(2, Number(item.hierarchy_level || 0)));
    let displayOrder = '';
    if (level === 0 || !item.parent_subtask_id || !byId.has(item.parent_subtask_id)) {
      topCount += 1;
      displayOrder = String(topCount);
    } else {
      const parent = byId.get(item.parent_subtask_id);
      const nextChild = (childCounts.get(parent.id) || 0) + 1;
      childCounts.set(parent.id, nextChild);
      displayOrder = `${parent.display_order || parent.sequence_order}.${nextChild}`;
    }
    const normalized = {
      ...item,
      hierarchy_level: level,
      parent_subtask_id: level === 0 ? '' : item.parent_subtask_id,
      sequence_order: index + 1,
      display_order: displayOrder
    };
    byId.set(normalized.id, normalized);
    return normalized;
  });
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

function editRecord(kind, id, module = '', button = null) {
  if (role !== 'ADMIN') return;
  const record = findEditableRecord(kind, id, module);
  if (!record) return;

  const card = button?.closest?.('.card');
  const existingEditor = card?.querySelector?.('[data-inline-editor]');
  if (existingEditor) {
    existingEditor.hidden = !existingEditor.hidden;
    if (!existingEditor.hidden) existingEditor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  if (card) {
    const editor = document.createElement('section');
    editor.className = 'inline-editor';
    editor.setAttribute('data-inline-editor', 'true');
    editor.innerHTML = `<h4>Edit record JSON locally</h4>
      <form class="record-form inline-record-form" data-inline-json-edit="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-module="${escapeHtml(module)}">
        <textarea name="json" rows="10">${escapeHtml(JSON.stringify(record, null, 2))}</textarea>
        <button>Update record locally</button>
      </form>`;
    card.appendChild(editor);
    const form = editor.querySelector('form');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      updateRecordFromInlineJson(kind, id, module, new FormData(form));
    });
    editor.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    return;
  }

  draft = structuredClone(record);
  draft.updated_by = `local-${role.toLowerCase()}`;
  draft.timestamps = { ...(draft.timestamps || {}), updated_at: nowIso() };
  diff = diffSummary(record, draft);
  error = 'Editable local JSON draft prepared. Adjust/export from Data, then commit the JSON update.';
  location.hash = '#/data';
  render();
}

function updateRecordFromInlineJson(kind, id, module, formData) {
  if (!canWrite(store, role)) return;
  const record = findEditableRecord(kind, id, module);
  if (!record) return;
  try {
    const parsed = JSON.parse(formData.get('json'));
    Object.keys(record).forEach((key) => delete record[key]);
    Object.assign(record, parsed, {
      updated_by: `local-${role.toLowerCase()}`,
      timestamps: { ...(parsed.timestamps || {}), updated_at: nowIso() }
    });
    record.history = Array.isArray(record.history) ? record.history : [];
    record.history.push({ version: record.history.length + 1, summary: 'Record updated from same-card JSON editor', updated_by: record.updated_by, updated_at: nowIso() });
    error = 'Record updated locally from the same card. Export JSON to commit it.';
    render();
  } catch (err) {
    error = `Inline JSON update failed: ${err.message}`;
    render();
  }
}

function copyJsonSection(section) {
  const bundle = sourceDataBundle();
  const payload = bundle[section] || bundle;
  const text = JSON.stringify(payload, null, 2);
  const done = () => {
    error = `${section || 'Data'} JSON copied to clipboard.`;
    render();
  };
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(text).then(done).catch(() => fallbackCopy(text, done));
  } else {
    fallbackCopy(text, done);
  }
}

function fallbackCopy(text, done) {
  const area = document.createElement('textarea');
  area.value = text;
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
  done();
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
    visibility: 'open',
    history: [{ version: 1, summary: 'Calendar item created locally', updated_by: `local-${role.toLowerCase()}`, updated_at: nowIso() }]
  });
  error = 'Calendar item added locally. Export JSON to commit it.';
  render();
}

function addAcademicLifeRecord(module, formData) {
  if (!canWrite(store, role)) return;
  if (module === 'teaching' && formData.get('record_id')) {
    updateCourseDetails(formData.get('record_id'), formData);
    return;
  }
  const year = module === 'teaching'
    ? academicYearForDate(formData.get('course_start_date') || formData.get('course_end_date') || undefined)
    : (formData.get('academic_year_current') || academicYearForDate());
  const record = {
    id: uid(module),
    title: formData.get('title'),
    category: module,
    sub_type: formData.get('sub_type'),
    academic_year_start: year,
    academic_year_current: year,
    final_deadline: formData.get('course_end_date') || formData.get('final_deadline') || '',
    status: module === 'teaching' ? courseStatusFromDates(formData) : (formData.get('status') || 'pending'),
    priority: formData.get('priority') || 'medium',
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
    record.subtasks = defaultCourseSubtasks(record.id, record.total_lectures);
    delete record.priority;
  }
  ['institution_name', 'role_title', 'opportunity_type', 'employment_basis', 'place_city', 'place_country', 'application_deadline', 'application_date', 'starting_date', 'ending_date', 'payment', 'payment_status'].forEach((field) => {
    if (formData.has(field) && formData.get(field)) record[field] = formData.get(field);
  });
  store.academicLife.modules[module].unshift(record);
  error = 'Academic life record added locally. Export JSON to commit it.';
  render();
}

function bindCourseCalculations(form) {
  const update = () => {
    const totalHours = parseNumber(form.elements.total_hours?.value);
    const lectureDuration = parseNumber(form.elements.lecture_duration?.value);
    const internalMarks = sumAssessmentMarks(form.elements.assessment_components?.value || '');
    const externalMarks = parseNumber(form.elements.external_component_marks?.value);
    if (form.elements.total_lectures) {
      form.elements.total_lectures.value = totalHours && lectureDuration ? String(Math.ceil(totalHours / lectureDuration)) : '';
    }
    if (form.elements.internal_component_marks) {
      form.elements.internal_component_marks.value = internalMarks ? String(internalMarks) : '';
    }
    if (form.elements.total_marks) {
      form.elements.total_marks.value = internalMarks || externalMarks ? String(internalMarks + externalMarks) : '';
    }
  };
  ['total_hours', 'lecture_duration', 'assessment_components', 'external_component_marks'].forEach((name) => {
    if (form.elements[name]) form.elements[name].addEventListener('input', update);
  });
  update();
}

function prepareTeachingCourseForm(course = null) {
  const panel = document.getElementById('teaching-course-form');
  const form = panel?.querySelector('form[data-academic-module="teaching"]');
  if (!panel || !form) return;
  if (!course && !panel.hidden) {
    panel.hidden = true;
    return;
  }
  panel.hidden = false;
  form.reset();
  const heading = panel.querySelector('h3');
  if (heading) heading.textContent = course ? 'Edit course details' : 'Course details';
  const submit = form.querySelector('button');
  if (submit) submit.textContent = course ? 'Update Course' : 'Add Course';
  if (!course) {
    if (form.elements.record_id) form.elements.record_id.value = '';
    panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }
  const internal = course.internal_components || {};
  const assessmentComponents = Array.isArray(course.assessment_components) && course.assessment_components.length
    ? course.assessment_components.join('\n')
    : [
      internal.quiz_1 ? `Quiz-1: ${internal.quiz_1}` : '',
      internal.quiz_2 ? `Quiz-2: ${internal.quiz_2}` : '',
      internal.class_participation ? `Class Participation: ${internal.class_participation}` : '',
      internal.assignments ? `Assignment(s): ${internal.assignments}` : '',
      internal.projects ? `Project(s): ${internal.projects}` : ''
    ].filter(Boolean).join('\n');
  const values = {
    record_id: course.id,
    title: course.title,
    course_type: course.course_type,
    programme: course.programme,
    batch: course.batch,
    section: course.section,
    campus: course.campus,
    total_hours: course.total_hours || course.hours,
    lecture_duration: course.lecture_duration,
    total_lectures: course.total_lectures,
    total_marks: course.total_marks,
    internal_component_marks: course.internal_component_marks,
    assessment_components: assessmentComponents,
    external_component_marks: course.external_component_marks,
    course_start_date: course.course_start_date,
    course_end_date: course.course_end_date,
    feedback_score: course.feedback_score
  };
  Object.entries(values).forEach(([key, value]) => {
    if (form.elements[key]) form.elements[key].value = value || '';
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function updateCourseDetails(id, formData) {
  if (!canWrite(store, role)) return;
  const course = store.academicLife.modules.teaching?.find((item) => item.id === id);
  if (!course) return;
  applyCourseFields(course, formData);
  const year = academicYearForDate(course.course_start_date || course.course_end_date || undefined);
  course.academic_year_start = year;
  course.academic_year_current = year;
  course.status = courseStatusFromDates(formData);
  const actor = `local-${role.toLowerCase()}`;
  course.updated_by = actor;
  course.timestamps = { ...(course.timestamps || {}), updated_at: nowIso() };
  course.history = course.history || [];
  course.history.push({ version: course.history.length + 1, summary: 'Course details updated locally', updated_by: actor, updated_at: nowIso() });
  error = 'Course details updated locally. Export JSON to commit it.';
  render();
}

function applyCourseFields(course, formData) {
  course.title = formData.get('title') || course.title || '';
  course.course_type = formData.get('course_type') || course.course_type || '';
  course.programme = formData.get('programme') || course.programme || '';
  course.batch = formData.get('batch') || course.batch || '';
  course.section = formData.get('section') || course.section || '';
  course.campus = formData.get('campus') || course.campus || '';
  course.total_hours = parseNumber(formData.get('total_hours')) || parseNumber(course.total_hours);
  delete course.hours;
  course.total_participants = formData.get('total_participants') || course.total_participants || '';
  course.lecture_duration = parseNumber(formData.get('lecture_duration')) || parseNumber(course.lecture_duration);
  course.total_lectures = calculateCourseLectureCount(course.total_hours, course.lecture_duration);
  course.internal_component_marks = sumAssessmentMarks(formData.get('assessment_components')) || 0;
  course.external_component_marks = parseNumber(formData.get('external_component_marks')) || parseNumber(course.external_component_marks);
  course.total_marks = course.internal_component_marks + course.external_component_marks;
  course.course_start_date = formData.get('course_start_date') || course.course_start_date || '';
  course.course_end_date = formData.get('course_end_date') || course.course_end_date || '';
  course.final_deadline = course.course_end_date || course.final_deadline || '';
  course.feedback_score = formData.get('feedback_score') || course.feedback_score || '';
  course.assessment_components = parseAssessmentComponents(formData.get('assessment_components'));
  delete course.internal_components;
}

function courseStatusFromDates(formData) {
  const startDate = formData.get('course_start_date');
  const endDate = formData.get('course_end_date');
  const today = localDateIso();
  if (startDate && today < startDate) return 'about_to_start';
  if (endDate && today > endDate) return 'finished';
  if (startDate && today >= startDate && (!endDate || today <= endDate)) return 'on_going';
  return 'pending';
}

function localDateIso() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function calculateCourseLectureCount(totalHours, lectureDuration) {
  const hours = parseNumber(totalHours);
  const duration = parseNumber(lectureDuration);
  if (!hours || !duration) return 0;
  return Math.max(1, Math.ceil(hours / duration));
}

function parseNumber(value = '') {
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function sumAssessmentMarks(value = '') {
  return parseAssessmentComponents(value).reduce((sum, item) => {
    const match = item.match(/(-?\d+(?:\.\d+)?)\s*$/);
    return sum + (match ? Number(match[1]) : 0);
  }, 0);
}

function parseAssessmentComponents(value = '') {
  return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
}

function defaultCourseSubtasks(parentId, totalLectures = 20) {
  const now = nowIso();
  const items = [];
  const add = (id, title, type, parentSubtaskId = '', note = '') => {
    const parent = items.find((item) => item.id === parentSubtaskId);
    items.push({
      id: `sub-${parentId}-${id}`,
      parent_record_id: parentId,
      title,
      subtask_type: type,
      due_date: '',
      completed_date: '',
      status: 'pending',
      responsible_person: 'Dr. Jitendra Kumar Verma',
      parent_subtask_id: parentSubtaskId,
      hierarchy_level: parent ? Number(parent.hierarchy_level || 0) + 1 : 0,
      notes: note ? [{ id: uid('note'), text: note, created_by: 'local-admin', created_at: now, visibility: 'open' }] : [],
      history: [{ version: 1, summary: 'Course plan item created', updated_by: 'local-admin', updated_at: now }],
      sequence_order: items.length + 1
    });
  };
  add('outline-dg', 'Course Outline Circulation DG', 'course_outline');
  add('outline-pd-students', 'Course Outline Circulation PD/Students', 'course_outline');
  const count = Math.max(1, Number(totalLectures || 20));
  const midPrepAt = Math.max(1, Math.min(count, Math.ceil(count * 0.35)));
  const midProcessAt = Math.max(midPrepAt, Math.min(count, Math.ceil(count * 0.5)));
  const endPrepAt = Math.min(count, Math.max(midProcessAt + 1, Math.ceil(count * 0.85)));
  for (let lecture = 1; lecture <= count; lecture += 1) {
    add(`lecture-${lecture}`, `Lecture-${lecture}: Lecture on pre-defined topics`, 'lecture', '', 'Details can be added here.');
    if (lecture === midPrepAt) add('mid-term-pre-process', 'Mid Term Pre Process Activities', 'pre_process', '', `Activity group before mid term. Due date should match Lecture-${midPrepAt} due date.`);
    if (lecture === midProcessAt) add('mid-term-process', 'Mid Term Process (If UG Course)', 'mid_term_process');
    if (lecture === endPrepAt) add('end-term-pre-process', 'End Term Pre Process Activities', 'pre_process', '', `Activity group before end term. Due date should match Lecture-${endPrepAt} due date.`);
  }
  add('assignment-1', 'Assignment-1 Questions', 'assignment', `sub-${parentId}-mid-term-pre-process`);
  add('project-set-1', 'Project Title Set-1 + Sample Report (Ranchoddas Shamaldas Chanchad Alias Rancho)', 'project', `sub-${parentId}-mid-term-pre-process`);
  add('quiz-1', 'Quiz-1 Questions', 'quiz', `sub-${parentId}-mid-term-pre-process`, 'Details can be added here.');
  add('question-paper-ug', 'Question Paper Setting (If UG Course)', 'question_paper_setting', `sub-${parentId}-mid-term-pre-process`, 'Details can be added here.');
  add('in-class-quiz-1', 'In-Class Quiz-1', 'quiz', `sub-${parentId}-lecture-${midProcessAt}`, 'Details can be added here.');
  add('mid-term-exam', 'Mid Term Exam: Held on Date', 'mid_term_exam', `sub-${parentId}-mid-term-process`);
  add('mid-term-answer-script', 'Answer Script Collection: Collection Date', 'answer_script_collection', `sub-${parentId}-mid-term-process`);
  add('mid-term-evaluation', 'Evaluation: Target Completion and Display Date (Maximum 20 days)', 'evaluation', `sub-${parentId}-mid-term-process`);
  add('assignment-2', 'Assignment-2 Questions', 'assignment', `sub-${parentId}-end-term-pre-process`);
  add('project-set-2', 'Project Title Set-2 + Sample Report (Chatur Ramalingam Alias Silencer)', 'project', `sub-${parentId}-end-term-pre-process`);
  add('quiz-2', 'Quiz-2 Questions (If needed paper + OMR based)', 'quiz', `sub-${parentId}-end-term-pre-process`);
  add('end-term-question-paper', 'Question Paper Setting', 'question_paper_setting', `sub-${parentId}-end-term-pre-process`);
  add('end-term-exam', 'End-Term Exam: Held on', 'end_term_exam');
  add('end-term-answer-script', 'Answer Script Collection: Collection Date', 'answer_script_collection');
  add('end-term-evaluation', 'Evaluation: Target Completion and Display Date (Maximum 20 days)', 'evaluation');
  add('course-notes', 'Notes: Exceptional Students, Undisciplined Students, Majority of Batch is Undisciplined then Difficult Question Paper', 'note');
  return renumberSubtasks(items);
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
      const nextStore = parsed.teaching && parsed.publications && parsed.projects && parsed.supervision
        ? composeStore(parsed)
        : parsed;
      if (!nextStore.candidates || !nextStore.meetings || !nextStore.workbench || !nextStore.activities || !nextStore.calendar || !nextStore.academicLife || !nextStore.workflowTemplates) throw new Error('Bundle must include separated module JSON data or the composed app data objects.');
      nextStore.mentors = nextStore.mentors || { schema: 'academic-lifecycle-manager.mentors.v1', updated_at: nowIso(), records: [] };
      store = { ...store, ...nextStore };
      error = 'JSON bundle imported into local browser state.';
      render();
    } catch (err) {
      error = err.message;
      render();
    }
  };
  reader.readAsText(file);
}

function sourceDataBundle() {
  const workbenchModules = store.workbench?.modules || {};
  const academicModules = store.academicLife?.modules || {};
  return {
    users: store.users,
    permissions: store.permissions,
    workflowTemplates: store.workflowTemplates,
    teaching: { ...(store.teaching || {}), records: academicModules.teaching || [] },
    publications: {
      ...(store.publications || {}),
      modules: {
        journal_articles: workbenchModules.journal_articles || [],
        conference_papers: workbenchModules.conference_papers || [],
        authored_books: workbenchModules.authored_books || [],
        edited_books: workbenchModules.edited_books || [],
        book_chapters: workbenchModules.book_chapters || []
      }
    },
    projects: {
      ...(store.projects || {}),
      modules: {
        projects: workbenchModules.projects || [],
        consultancy: workbenchModules.consultancy || []
      }
    },
    supervision: {
      ...(store.supervision || {}),
      candidates: store.candidates || { records: [] },
      meetings: store.meetings || { records: [] }
    },
    mentors: store.mentors,
    administration: { ...(store.administration || {}), records: academicModules.admin_work || [] },
    careerMobility: { ...(store.careerMobility || {}), records: academicModules.career_mobility || [] },
    miscellaneous: {
      ...(store.miscellaneous || {}),
      modules: {
        external_engagements: academicModules.external_engagements || [],
        subscriptions: academicModules.subscriptions || [],
        custom_activities: workbenchModules.custom_activities || []
      }
    },
    activities: store.activities,
    calendar: store.calendar
  };
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
