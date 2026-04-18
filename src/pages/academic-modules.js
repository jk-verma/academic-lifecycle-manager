import { detailSection, emptyState, nextPendingSubtask, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskProgress, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { administrationGroups, careerGroups, mentorGroups, optionList, projectGroups, researchGroups, subscriptionGroups, supervisionGroups, teachingGroups } from '../data/structure.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml, slugLabel } from '../utils/html.js';

const researchModules = ['journal_articles', 'conference_papers', 'authored_books', 'edited_books', 'book_chapters'];
const projectModules = ['projects', 'consultancy'];

export function researchPage(ctx) {
  const items = ctx.visibleWorkbench().filter((item) => researchModules.includes(item.module));
  return `${pageHeader('Research', 'Publications: journal articles, conference papers, books, edited books, and book chapters.')}
    ${structureOverview(researchGroups, (value) => `#/workbench/${value}`)}
    <div class="quick-actions">${actionLink('Add Publication', '#/workbench/journal_articles')}</div>
    ${moduleListContent(items, (item) => `#/workbench/${item.module}/${item.id}`, (item) => ctx.cardActions('workbench', item.id, item.module))}`;
}

export function teachingPage(ctx) {
  const items = ctx.visibleAcademicLife().filter((item) => item.module === 'teaching');
  const form = ctx.canWrite() ? academicRecordForm('teaching', 'Teaching', ctx, { hidden: true }) : '<p class="notice">Local data entry is currently unavailable in this view.</p>';
  return `${pageHeader('Teaching', 'Direct teaching: course outlines, lectures, quizzes, examinations, invigilation, and evaluation.')}
    ${teachingRibbon(ctx)}
    ${form}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: teachingCardMeta(item),
      body: `Feedback Score: ${item.feedback_score || 'not set'}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
      href: `#/teaching/${item.id}`,
      actions: ctx.cardActions('academic', item.id, 'teaching')
    })).join('') || emptyState('No records', 'No teaching records are available yet.')}</div>`;
}

export function supervisionPage(ctx) {
  const candidates = ctx.visibleCandidates();
  return `${pageHeader('Supervision', 'PhD, Masters, UG, and intern supervision records.')}
    ${structureOverview(supervisionGroups, () => '#/students')}
    <div class="grid">${candidates.map((candidate) => recordCard({
      title: candidate.name,
      meta: `${candidate.programme_type} | ${candidate.status}`,
      body: `${candidate.topic} | current phase: ${candidate.phase_progress?.find((phase) => ['active', 'scheduled'].includes(phase.status))?.phase || 'not set'}`,
      badges: `${statusBadge(candidate.status)} ${visibilityBadge(candidate.visibility)}`,
      href: `#/candidates/${candidate.id}`,
      actions: ctx.cardActions('candidate', candidate.id)
    })).join('') || emptyState('No supervision records', 'No supervision records are visible.')}</div>`;
}

export function projectsPage(ctx) {
  const items = ctx.visibleWorkbench().filter((item) => projectModules.includes(item.module));
  return `${pageHeader('Projects', 'Consultancy projects, sponsored projects, and research projects.')}
    ${structureOverview(projectGroups, () => '#/workbench/projects')}
    <div class="quick-actions">${actionLink('Add Project', '#/workbench/projects')}</div>
    ${moduleListContent(items, (item) => `#/workbench/${item.module}/${item.id}`, (item) => ctx.cardActions('workbench', item.id, item.module))}`;
}

export function adminWorkPage(ctx) {
  return academicModulePage(ctx, 'admin_work', 'Administration', 'Co-curricular, corporate academic administration, and professional development responsibilities.', administrationGroups);
}

export function externalEngagementsPage(ctx) {
  return academicModulePage(ctx, 'external_engagements', 'External Engagements', 'Visiting faculty, talks, workshops, and consultancy engagements.');
}

export function careerMobilityPage(ctx) {
  return academicModulePage(ctx, 'career_mobility', 'Career Mobility', 'Visiting faculty, adjunct faculty, teaching applications, and miscellaneous opportunities.', careerGroups);
}

export function subscriptionPage(ctx) {
  return academicModulePage(ctx, 'subscriptions', 'Subscription', 'Track starting date, ending date, payment, renewal, and access status.', subscriptionGroups);
}

export function miscellaneousPage(ctx) {
  const career = ctx.visibleAcademicLife().filter((item) => item.module === 'career_mobility');
  const subscriptions = ctx.visibleAcademicLife().filter((item) => item.module === 'subscriptions');
  return `${pageHeader('Miscellaneous', 'Career mobility and subscriptions in one place.')}
    <div class="grid two">
      <section class="panel">
        <h3>Career Mobility</h3>
        ${structureOverview(careerGroups, () => '#/career')}
        ${career.map((item) => recordCard({
          title: item.title,
          meta: `${item.sub_type} | ${item.status} | deadline: ${item.application_deadline || item.final_deadline || 'not set'}`,
          body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
          badges: `${statusBadge(item.status)} ${statusBadge(item.priority || 'medium')}`,
          href: `#/career/${item.id}`,
          actions: ctx.cardActions('academic', item.id, 'career_mobility')
        })).join('') || emptyState('No career records', 'No career mobility records are present yet.')}
      </section>
      <section class="panel">
        <h3>Subscription</h3>
        ${structureOverview(subscriptionGroups, () => '#/subscriptions')}
        ${subscriptions.map((item) => recordCard({
          title: item.title,
          meta: `${item.starting_date || 'no start'} to ${item.ending_date || 'no end'} | ${item.payment_status || item.status}`,
          body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
          badges: `${statusBadge(item.status)} ${statusBadge(item.priority || 'medium')}`,
          href: `#/subscriptions/${item.id}`,
          actions: ctx.cardActions('academic', item.id, 'subscriptions')
        })).join('') || emptyState('No subscriptions', 'No subscriptions are present yet.')}
      </section>
    </div>`;
}

export function academicModulePage(ctx, module, title, subtitle, groups = []) {
  const items = ctx.visibleAcademicLife().filter((item) => item.module === module);
  const form = ctx.canWrite() ? academicRecordForm(module, title, ctx) : '<p class="notice">Local data entry is currently unavailable in this view.</p>';
  return `${pageHeader(title, subtitle)}
    ${groups.length ? structureOverview(groups) : ''}
    ${form}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${item.academic_year_current} | ${item.category} | ${item.priority} | final deadline: ${item.final_deadline || item.application_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
      href: `#/${routeName(module)}/${item.id}`,
      actions: ctx.cardActions('academic', item.id, module)
    })).join('') || emptyState('No records', 'No records are available in this module yet.')}</div>`;
}

export function academicModuleDetailPage(ctx, module, id) {
  const item = ctx.visibleAcademicLife().find((record) => record.module === module && record.id === id);
  if (!item) return emptyState('Record not found', 'This academic life record is unavailable for the selected role.');
  if (module === 'teaching') return teachingDetailPage(ctx, item);
  return `${pageHeader(item.title, `${item.category} | ${item.sub_type}`)}
    ${printActionBar(`<a class="card-link" href="#/${routeName(module)}">Back</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${statusBadge(item.priority)} ${visibilityBadge(item.visibility)}</div>
      ${detailSection('Overall task', `${taskSummary(item)}<p><strong>Academic year:</strong> ${escapeHtml(item.academic_year_current)}</p><p><strong>Created by:</strong> ${escapeHtml(item.created_by)}</p>`)}
      ${detailSection('Record summary', recordSummary(item))}
      ${detailSection('Activity / sub-activity timeline', subtaskTimeline(item, { kind: 'academic', id: item.id, module }))}
      ${detailSection('Append-only notes', notesPanel(ctx.maskNotes(item.notes || [])))}
      ${detailSection('History', timelinePanel(item.history || []))}
      ${ctx.canWrite() ? ctx.subtaskForm('academic', item.id, module) : ''}
    </section>`;
}

function moduleList(title, subtitle, items, hrefFor) {
  return `${pageHeader(title, subtitle)}
    ${moduleListContent(items, hrefFor)}`;
}

function moduleListContent(items, hrefFor, actionsFor = () => '') {
  return `
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${item.module} | ${item.status} | final deadline: ${item.final_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${item.description_or_abstract || firstVisibleNote(item)}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
      href: hrefFor(item),
      actions: actionsFor(item)
    })).join('') || emptyState('No records', 'No records are visible.')}</div>`;
}

function actionLink(label, href) {
  return `<a class="quick-action" href="${escapeHtml(href)}">${escapeHtml(label)}</a>`;
}

function academicRecordForm(module, title, ctx, options = {}) {
  const actionLabel = module === 'teaching' ? 'Update Course' : 'Add local record';
  const heading = module === 'teaching' ? 'Course details' : `Add ${title} record`;
  const panelAttrs = options.hidden ? ` id="teaching-course-form" hidden` : '';
  const panelClass = options.hidden ? 'panel collapsible-panel' : 'panel';
  return `<section class="${panelClass}"${panelAttrs}>
    <h3>${escapeHtml(heading)}</h3>
    <form class="record-form" data-academic-module="${escapeHtml(module)}">
      ${module === 'teaching' ? '<input name="record_id" type="hidden" />' : ''}
      <input name="title" required placeholder="${module === 'teaching' ? 'Course Title' : 'Title'}" />
      ${hasStructuredSubtype(module) ? '' : '<input name="sub_type" placeholder="Subtype" />'}
      ${moduleSpecificFields(module)}
      ${module === 'teaching' ? '' : '<input name="final_deadline" type="date" />'}
      ${module === 'teaching' ? '' : '<input name="notes" placeholder="Initial append-only note" />'}
      ${module === 'teaching' ? academicYearSelect() : '<input name="academic_year_current" placeholder="Academic year" value="2025-2026" />'}
      ${module === 'teaching' ? '<input name="feedback_score" placeholder="Feedback Score" />' : ''}
      ${module === 'teaching' ? '' : `<select name="status">${statusOptions(module)}</select>`}
      ${module === 'teaching' ? '' : '<select name="priority"><option>low</option><option>medium</option><option>high</option></select>'}
      <button>${escapeHtml(actionLabel)}</button>
    </form>
  </section>`;
}

function moduleSpecificFields(module) {
  if (module === 'teaching') return courseFields();
  if (module === 'admin_work') return subtypeSelect(administrationGroups);
  if (module === 'career_mobility') return `${subtypeSelect(careerGroups)}
      <input name="institution_name" placeholder="Institution name" />
      <input name="role_title" placeholder="Role title" />
      <select name="opportunity_type">
        <option>job_application</option>
        <option>deputation</option>
        <option>lien</option>
        <option>extraordinary_leave</option>
        <option>contractual_role</option>
        <option>visiting_position</option>
        <option>other</option>
      </select>
      <input name="employment_basis" placeholder="Employment basis" />
      <input name="place_city" placeholder="City" />
      <input name="place_country" placeholder="Country" />
      <input name="application_deadline" type="date" />
      <input name="application_date" type="date" />`;
  if (module === 'subscriptions') return `${subtypeSelect(subscriptionGroups)}
      <input name="starting_date" type="date" />
      <input name="ending_date" type="date" />
      <input name="payment" placeholder="Payment / amount" />
      <select name="payment_status"><option>planned</option><option>paid</option><option>due</option><option>reimbursed</option><option>cancelled</option></select>`;
  return '';
}

function hasStructuredSubtype(module) {
  return ['teaching', 'admin_work', 'career_mobility', 'subscriptions'].includes(module);
}

function firstVisibleNote(item) {
  const note = (item.notes || item.notes_append_only || [])[0];
  return note?.text || item.feedback || item.responsibility || item.organization || '';
}

function routeName(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  if (module === 'career_mobility') return 'career-mobility';
  if (module === 'subscriptions') return 'subscriptions';
  return module;
}

function statusOptions(module) {
  const statuses = module === 'teaching'
    ? ['pending', 'completed']
    : module === 'career_mobility'
    ? ['planned', 'applied', 'no_shortlisting', 'shortlisted', 'noc_required', 'noc_from_employer', 'interview', 'no_selection', 'selected', 'technical_resignation', 'joined', 'closed']
    : ['active', 'in_progress', 'planned', 'completed'];
  return statuses.map((status) => `<option>${escapeHtml(status)}</option>`).join('');
}

function teachingRibbon(ctx) {
  const group = teachingGroups[0];
  return `<div class="structure-grid">
    <section class="structure-panel teaching-ribbon">
      <div class="ribbon-head">
        <h3>${escapeHtml(group.title)}</h3>
        ${ctx.canWrite() ? '<button data-new-course="true">Add Course</button>' : ''}
      </div>
      <div class="chip-list">${group.items.map(([, label]) => `<span class="chip">${escapeHtml(label)}</span>`).join('')}</div>
    </section>
  </div>`;
}

function teachingCardMeta(item) {
  const progress = taskProgress(item);
  const upcoming = nextPendingSubtask(item);
  return `${item.academic_year_current || 'no year'} | ${item.course_type || 'course'} | Participants: ${item.total_participants || 'not set'} | Duration: ${item.total_hours || item.hours || 'not set'} | ${progress.completed}/${progress.total} activities completed | Upcoming: ${upcoming?.title || 'none'}`;
}

function structureOverview(groups, hrefFor = () => '') {
  return `<div class="structure-grid">${groups.map((group) => `<section class="structure-panel">
    <h3>${escapeHtml(group.title)}</h3>
    <div class="chip-list">${group.items.map(([value, label]) => {
      const href = hrefFor(value);
      return href ? `<a class="chip" href="${escapeHtml(href)}">${escapeHtml(label)}</a>` : `<span class="chip">${escapeHtml(label)}</span>`;
    }).join('')}</div>
  </section>`).join('')}</div>`;
}

function subtypeSelect(groups) {
  return `<select name="sub_type">${optionList(groups).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select>`;
}

function recordSummary(item) {
  const fields = [
    ['Category', item.category],
    ['Subtype', slugLabel(item.sub_type || '')],
    ['Programme', item.programme],
    ['Hours', item.hours],
    ['Feedback / next review', item.feedback],
    ['Responsibility', item.responsibility],
    ['Organization', item.organization],
    ['Institution', item.institution_name],
    ['Role', item.role_title],
    ['Application deadline', item.application_deadline],
    ['Starting date', item.starting_date],
    ['Ending date', item.ending_date],
    ['Payment', item.payment],
    ['Payment status', item.payment_status],
    ['Updated', item.timestamps?.updated_at]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');

  if (!fields.length) return '<p class="muted">No additional record details are available.</p>';
  return `<div class="summary-grid">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`;
}

function teachingDetailPage(ctx, item) {
  return `${pageHeader(item.title, 'Teaching | Course planner')}
    ${printActionBar('<a class="card-link" href="#/teaching">Back</a>')}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${statusBadge(item.priority)}</div>
      ${detailSection('Course details', `${courseSummary(item)}${ctx.canWrite() ? `<button class="secondary compact" data-toggle-panel="course-edit-${escapeHtml(item.id)}">Edit</button>` : ''}`)}
      ${ctx.canWrite() ? courseEditForm(item) : ''}
      ${detailSection('Assessment structure', assessmentSummary(item))}
      ${detailSection('Course plan', subtaskTimeline(item, { kind: 'academic', id: item.id, module: 'teaching' }))}
      ${ctx.canWrite() ? coursePlanAddForm(item) : ''}
    </section>`;
}

function courseSummary(item) {
  const fields = [
    ['Total participants', item.total_participants],
    ['Course type', item.course_type],
    ['Total hours', item.total_hours || item.hours],
    ['Total lectures', item.total_lectures],
    ['Lecture Hour', item.lecture_duration],
    ['Total marks', item.total_marks],
    ['Internal marks', item.internal_component_marks],
    ['External marks', item.external_component_marks],
    ['Course start date', item.course_start_date],
    ['Course end date', item.course_end_date],
    ['Academic year', item.academic_year_current],
    ['Feedback score', item.feedback_score]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  return `<div class="inline-summary">${fields.map(([label, value]) => `<span><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</span>`).join('')}</div>`;
}

function assessmentSummary(item) {
  const custom = Array.isArray(item.assessment_components) ? item.assessment_components : [];
  if (custom.length) {
    return `<div class="summary-grid">${custom.map((value, index) => `<article><span>Component ${index + 1}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`;
  }
  const internal = item.internal_components || {};
  const fields = [
    ['Internal component marks', item.internal_component_marks],
    ['Quiz-1', internal.quiz_1],
    ['Quiz-2', internal.quiz_2],
    ['Class participation', internal.class_participation],
    ['Assignment(s)', internal.assignments],
    ['Project(s)', internal.projects],
    ['External Marks', item.external_component_marks]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  return `<div class="summary-grid">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`;
}

function courseEditForm(item) {
  return `<section class="append-panel collapsible-panel" id="course-edit-${escapeHtml(item.id)}" hidden>
    <h4>Edit course details</h4>
    <form class="record-form" data-update-course="${escapeHtml(item.id)}">
      <input name="title" required placeholder="Course Title" value="${escapeHtml(item.title || '')}" />
      ${courseTypeSelect(item.course_type)}
      <input name="total_participants" type="number" min="0" placeholder="Total Participants" value="${escapeHtml(item.total_participants || '')}" />
      <input name="total_hours" placeholder="Total Hours" value="${escapeHtml(item.total_hours || item.hours || '')}" />
      <input name="lecture_duration" type="number" min="0.1" step="0.1" placeholder="Lecture Hour" value="${escapeHtml(item.lecture_duration || '')}" />
      <input name="total_lectures" type="number" min="1" placeholder="Total lectures" value="${escapeHtml(item.total_lectures || '')}" readonly />
      <textarea name="assessment_components" placeholder="Assessment components, one per line">${escapeHtml(assessmentLines(item))}</textarea>
      <input name="internal_component_marks" type="number" min="0" placeholder="Internal marks" value="${escapeHtml(item.internal_component_marks || '')}" readonly />
      <input name="external_component_marks" type="number" min="0" placeholder="External Marks" value="${escapeHtml(item.external_component_marks || '')}" />
      <input name="total_marks" type="number" min="0" placeholder="Total marks" value="${escapeHtml(item.total_marks || '')}" readonly />
      <input name="course_start_date" type="date" value="${escapeHtml(item.course_start_date || '')}" />
      <input name="course_end_date" type="date" value="${escapeHtml(item.course_end_date || '')}" />
      ${academicYearSelect(item.academic_year_current)}
      <input name="feedback_score" placeholder="Feedback Score" value="${escapeHtml(item.feedback_score || '')}" />
      <button>Update Course</button>
    </form>
  </section>`;
}

function courseFields() {
  return `<input name="sub_type" type="hidden" value="course" />
      ${courseTypeSelect()}
      <input name="total_participants" type="number" min="0" placeholder="Total Participants" />
      <input name="total_hours" placeholder="Total Hours" />
      <input name="lecture_duration" type="number" min="0.1" step="0.1" placeholder="Lecture Hour" />
      <input name="total_lectures" type="number" min="1" placeholder="Total lectures" readonly />
      <textarea name="assessment_components" placeholder="Assessment components, one per line. Example: Quiz-1: 5"></textarea>
      <input name="internal_component_marks" type="number" min="0" placeholder="Internal marks" readonly />
      <input name="external_component_marks" type="number" min="0" placeholder="External Marks" />
      <input name="total_marks" type="number" min="0" placeholder="Total marks" readonly />
      <input name="course_start_date" type="date" />
      <input name="course_end_date" type="date" />`;
}

function courseTypeSelect(selected = '') {
  const types = ['UG Course', 'PG Course', 'Doctorate Course', 'FDP Course', 'MDP Course', 'Certificate Course'];
  return `<select name="course_type"><option value="">Course Type</option>${types.map((type) => `<option value="${escapeHtml(type)}" ${selected === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select>`;
}

function assessmentLines(item = {}) {
  if (Array.isArray(item.assessment_components) && item.assessment_components.length) return item.assessment_components.join('\n');
  const internal = item.internal_components || {};
  return [
    internal.quiz_1 ? `Quiz-1: ${internal.quiz_1}` : '',
    internal.quiz_2 ? `Quiz-2: ${internal.quiz_2}` : '',
    internal.class_participation ? `Class Participation: ${internal.class_participation}` : '',
    internal.assignments ? `Assignment(s): ${internal.assignments}` : '',
    internal.projects ? `Project(s): ${internal.projects}` : ''
  ].filter(Boolean).join('\n');
}

function academicYearSelect(selected = '') {
  const currentYear = academicYearStartForToday();
  const years = [];
  for (let year = 2011; year <= currentYear + 5; year += 1) years.push(`${year}-${year + 1}`);
  const active = selected || `${currentYear}-${currentYear + 1}`;
  return `<select name="academic_year_current">${years.map((year) => `<option value="${escapeHtml(year)}" ${year === active ? 'selected' : ''}>${escapeHtml(year)}</option>`).join('')}</select>`;
}

function academicYearStartForToday() {
  const date = new Date();
  const year = date.getFullYear();
  return date.getMonth() + 1 >= 7 ? year : year - 1;
}

function coursePlanAddForm(item) {
  const parents = (item.subtasks || [])
    .filter((subtask) => Number(subtask.hierarchy_level || 0) < 2)
    .sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0));
  const typeOptions = [
    'course_outline',
    'lecture',
    'pre_process',
    'mid_term_process',
    'exam',
    'answer_script_collection',
    'evaluation',
    'assignment',
    'project',
    'quiz',
    'question_paper_setting',
    'note'
  ];
  return `<section class="append-panel">
    <h4>Add activity / sub-activity</h4>
    <form class="record-form" data-add-subtask="academic" data-id="${escapeHtml(item.id)}" data-module="teaching">
      <input name="subtask_id" type="hidden" />
      <input name="title" required placeholder="Activity or sub-activity title" />
      <select name="subtask_type">${typeOptions.map((type) => `<option value="${escapeHtml(type)}">${escapeHtml(slugLabel(type))}</option>`).join('')}</select>
      <input name="due_datetime" type="datetime-local" />
      <input name="completed_datetime" type="datetime-local" />
      <input name="responsible_person" placeholder="Responsible person" value="${escapeHtml(item.supervisor || 'Dr. Jitendra Kumar Verma')}" />
      <input name="responsible_contact" placeholder="Mobile or extension number" />
      <input name="insert_after_order" type="number" min="0" step="1" placeholder="Insert after sequence no." />
      <select name="parent_subtask_id">
        <option value="">Main activity with fresh numbering</option>
        ${parents.map((parent) => `<option value="${escapeHtml(parent.id)}">${escapeHtml(parent.display_order || parent.sequence_order || '')}. ${escapeHtml(parent.title)}</option>`).join('')}
      </select>
      <select name="hierarchy_level"><option value="0">Activity</option><option value="1">Sub-activity</option><option value="2">Sub-sub-activity</option></select>
      <select name="status"><option>pending</option><option>completed</option><option>deferred</option><option>cancelled</option></select>
      <input name="notes" placeholder="Details / append-only note" />
      <button>Add course plan item</button>
    </form>
  </section>`;
}
