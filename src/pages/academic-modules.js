import { detailSection, emptyState, nextPendingSubtask, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskProgress, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { administrationGroups, careerGroups, mentorGroups, optionList, projectGroups, researchGroups, subscriptionGroups, supervisionGroups, teachingGroups } from '../data/structure.js';
import { academicYearForDate } from '../utils/academic-year.js';
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
  const allItems = ctx.visibleAcademicLife().filter((item) => item.module === 'teaching');
  const selectedYear = ctx.filters.teachingYear || currentAcademicYear();
  const selectedCampus = teachingCampusOptions(allItems).includes(ctx.filters.teachingCampus) ? ctx.filters.teachingCampus : '';
  const selectedCourseType = teachingCourseTypeOptions(allItems).includes(ctx.filters.teachingCourseType) ? ctx.filters.teachingCourseType : '';
  const filteredItems = allItems
    .filter((item) => !selectedCampus || (item.campus || '') === selectedCampus)
    .filter((item) => !selectedCourseType || (item.course_type || '') === selectedCourseType);
  const items = selectedYear === 'all'
    ? sortTeachingItems(filteredItems)
    : sortTeachingItems(filteredItems.filter((item) => courseAcademicYear(item) === selectedYear));
  const form = ctx.canWrite() ? academicRecordForm('teaching', 'Teaching', ctx, { hidden: true }) : '';
  return `${pageHeader('Teaching', 'Manage course plans, activities, assessments, and teaching deadlines.')}
    ${teachingRibbon(ctx, allItems, selectedYear, selectedCampus, selectedCourseType)}
    ${form ? `<div class="grid teaching-grid course-form-wrap">${form}</div>` : '<p class="notice">Local data entry is currently unavailable in this view.</p>'}
    ${selectedYear === 'all'
      ? teachingYearSections(items, ctx)
      : teachingYearSection(selectedYear, items, ctx, { hideWhenEmpty: false })}`;
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
  const actionLabel = module === 'teaching' ? 'Add Course' : 'Add local record';
  const heading = module === 'teaching' ? 'Course details' : `Add ${title} record`;
  const panelAttrs = options.hidden ? ` id="teaching-course-form" hidden` : '';
  const panelClass = module === 'teaching'
    ? 'card course-form-card collapsible-panel'
    : (options.hidden ? 'panel collapsible-panel' : 'panel');
  return `<section class="${panelClass}"${panelAttrs}>
    <h3>${escapeHtml(heading)}</h3>
    <form class="record-form" data-academic-module="${escapeHtml(module)}">
      ${module === 'teaching' ? '<input name="record_id" type="hidden" />' : ''}
      <input name="title" required placeholder="${module === 'teaching' ? 'Course Title' : 'Title'}" />
      ${hasStructuredSubtype(module) ? '' : '<input name="sub_type" placeholder="Subtype" />'}
      ${moduleSpecificFields(module)}
      ${module === 'teaching' ? '' : '<input name="final_deadline" type="date" />'}
      ${module === 'teaching' ? '' : '<input name="notes" placeholder="Initial append-only note" />'}
      ${module === 'teaching' ? '' : '<input name="academic_year_current" placeholder="Academic year" value="2025-2026" />'}
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

function teachingRibbon(ctx, records = [], selectedYear = currentAcademicYear(), selectedCampus = '', selectedCourseType = '') {
  const group = teachingGroups[0];
  return `<div class="structure-grid">
    <section class="structure-panel teaching-ribbon">
      <div class="ribbon-head">
        <h3>${escapeHtml(group.title)}</h3>
        <div class="ribbon-actions">
          <label class="ribbon-filter"><span>Academic Year</span>${teachingYearSelect(records, selectedYear)}</label>
          <label class="ribbon-filter"><span>Campus Wise Teaching</span>${teachingCampusSelect(records, selectedCampus)}</label>
          <label class="ribbon-filter"><span>Course Types</span>${teachingCourseTypeSelect(records, selectedCourseType)}</label>
          <button class="secondary" data-reset-teaching-filters="true">Reset Filters</button>
          ${ctx.canWrite() ? '<button data-new-course="true">Add Course</button>' : ''}
          <button class="secondary" data-copy-json="teaching">Copy JSON</button>
          <a class="button-link" href="https://github.com/jk-verma/academic-lifecycle-manager/edit/main/public/data/teaching/teaching.json" target="_blank" rel="noreferrer">Open GitHub Editor</a>
        </div>
      </div>
    </section>
  </div>`;
}

function teachingGrid(items, ctx) {
  return `<div class="grid teaching-grid">${items.map((item) => teachingCard(item, ctx)).join('') || emptyState('No records', 'No teaching records are available for the selected filters.')}</div>`;
}

function teachingYearSections(items, ctx) {
  const groups = items.reduce((acc, item) => {
    const year = courseAcademicYear(item);
    acc[year] = acc[year] || [];
    acc[year].push(item);
    return acc;
  }, {});
  const years = Object.keys(groups).sort().reverse();
  if (!years.length) return emptyState('No records', 'No teaching records are available yet.');
  return years.map((year) => teachingYearSection(year, groups[year], ctx)).join('');
}

function teachingYearSection(year, items, ctx, options = {}) {
  if (!items.length && options.hideWhenEmpty) return '';
  const totalHours = totalTeachingHours(items);
  return `<section class="year-section">
    <h3>${escapeHtml(year)} <span>Total Teaching Hours: ${escapeHtml(formatHours(totalHours))}</span></h3>
    ${teachingGrid(items, ctx)}
  </section>`;
}

function teachingCard(item, ctx) {
  return recordCard({
    title: item.title,
    metaHtml: teachingCardMeta(item),
    bodyHtml: teachingCardBody(item),
    badges: statusBadge(courseDateStatus(item)),
    href: `#/teaching/${item.id}`,
    actions: ctx.cardActions('academic', item.id, 'teaching'),
    inlineEditor: ctx.canWrite() ? teachingInlineEditor(item) : '',
    className: 'teaching-card'
  });
}

function teachingCardMeta(item) {
  const progress = activityProgress(item);
  const upcoming = nextPendingActivity(item);
  return `<p class="muted teaching-card-meta">
    <span>${escapeHtml(courseAcademicYear(item))}</span>
    <span>${escapeHtml(item.course_type || 'course')}</span>
    <span>Programme: ${escapeHtml(item.programme || 'not set')}</span>
    <span>Batch: ${escapeHtml(item.batch || 'not set')}</span>
    <span>Section: ${escapeHtml(item.section || 'not set')}</span>
    <span>Campus: ${escapeHtml(item.campus || 'not set')}</span>
    <span>Total Particpants: ${escapeHtml(item.total_participants || 'not set')}</span>
    <span>Duration: ${escapeHtml(item.total_hours || item.hours || 'not set')}</span>
    <span>${escapeHtml(`${progress.completed}/${progress.total} activities completed`)}</span>
    <span class="upcoming-highlight">Upcoming: ${escapeHtml(upcoming?.title || 'none')}</span>
  </p>`;
}

function teachingCardBody(item) {
  return `<p class="teaching-feedback">Feedback Score: ${escapeHtml(item.feedback_score || 'not set')}</p>`;
}

function teachingInlineEditor(item) {
  return `<section class="inline-editor" data-inline-editor hidden>
    <h4>Edit course details</h4>
    <form class="record-form inline-record-form" data-academic-module="teaching">
      <input name="record_id" type="hidden" value="${escapeHtml(item.id)}" />
      <input name="title" required placeholder="Course Title" value="${escapeHtml(item.title || '')}" />
      <input name="sub_type" type="hidden" value="course" />
      ${courseTypeSelect(item.course_type || '')}
      <input name="programme" placeholder="Programme" value="${escapeHtml(item.programme || '')}" />
      <input name="batch" placeholder="Batch, e.g. 2025-30" value="${escapeHtml(item.batch || '')}" />
      <input name="section" placeholder="Section" value="${escapeHtml(item.section || '')}" />
      <input name="campus" placeholder="Campus" value="${escapeHtml(item.campus || '')}" />
      <input name="total_participants" type="number" min="0" placeholder="Total Particpants" value="${escapeHtml(item.total_participants || '')}" />
      <input name="total_hours" type="number" min="0" step="0.25" placeholder="Total Hours" value="${escapeHtml(item.total_hours || item.hours || '')}" />
      <input name="lecture_duration" type="number" min="0.1" step="0.1" placeholder="Lecture Duration" value="${escapeHtml(item.lecture_duration || '')}" />
      <input name="total_lectures" type="number" min="1" placeholder="Lecture Count" value="${escapeHtml(calculatedLectureCount(item) || '')}" readonly />
      <textarea name="assessment_components" placeholder="Assessment components, one per line. Example: Quiz-1: 5">${escapeHtml(assessmentLines(item))}</textarea>
      <input name="internal_component_marks" type="number" min="0" placeholder="Internal Marks" value="${escapeHtml(calculatedInternalMarks(item) || '')}" readonly />
      <input name="external_component_marks" type="number" min="0" placeholder="External Marks" value="${escapeHtml(calculatedExternalMarks(item) || '')}" />
      <input name="total_marks" type="number" min="0" placeholder="Total Marks" value="${escapeHtml((calculatedInternalMarks(item) + calculatedExternalMarks(item)) || '')}" readonly />
      <input name="course_start_date" type="date" title="Start Date" value="${escapeHtml(item.course_start_date || '')}" />
      <input name="course_end_date" type="date" title="End Date" value="${escapeHtml(item.course_end_date || '')}" />
      <input name="feedback_score" placeholder="Feedback Score" value="${escapeHtml(item.feedback_score || '')}" />
      <button>Update Course</button>
    </form>
  </section>`;
}

function teachingYearSelect(records = [], selected = currentAcademicYear()) {
  const years = new Set(records.map(courseAcademicYear));
  for (let year = 2011; year <= academicYearStartForToday() + 5; year += 1) years.add(`${year}-${year + 1}`);
  const options = [...years].filter(Boolean).sort().reverse();
  return `<select id="filter-teachingYear"><option value="all" ${selected === 'all' ? 'selected' : ''}>All years / All Courses</option>${options.map((year) => `<option value="${escapeHtml(year)}" ${selected === year ? 'selected' : ''}>${escapeHtml(year)}</option>`).join('')}</select>`;
}

function teachingCampusSelect(records = [], selected = '') {
  const campuses = teachingCampusOptions(records);
  return `<select id="filter-teachingCampus"><option value="">All campuses</option>${campuses.map((campus) => `<option value="${escapeHtml(campus)}" ${selected === campus ? 'selected' : ''}>${escapeHtml(campus)}</option>`).join('')}</select>`;
}

function teachingCourseTypeSelect(records = [], selected = '') {
  const types = teachingCourseTypeOptions(records);
  return `<select id="filter-teachingCourseType"><option value="">All Course Types</option>${types.map((type) => `<option value="${escapeHtml(type)}" ${selected === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select>`;
}

function teachingCampusOptions(records = []) {
  return [...new Set(records.map((item) => item.campus).filter(Boolean))].sort();
}

function teachingCourseTypeOptions(records = []) {
  return [...new Set(records.map((item) => item.course_type).filter(Boolean))].sort();
}

function sortTeachingItems(items = []) {
  return [...items].sort((a, b) => courseAcademicYear(b).localeCompare(courseAcademicYear(a)) || String(a.title || '').localeCompare(String(b.title || '')));
}

function courseAcademicYear(item = {}) {
  return academicYearForDate(item.course_start_date || item.course_end_date || item.final_deadline || undefined);
}

function totalTeachingHours(items = []) {
  return items.reduce((sum, item) => sum + parseCourseNumber(item.total_hours || item.hours), 0);
}

function formatHours(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, '');
}

function currentAcademicYear() {
  return academicYearForDate();
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
    ${printActionBar('<button class="secondary" data-copy-json="teaching">Copy JSON</button><a class="button-link" href="https://github.com/jk-verma/academic-lifecycle-manager/edit/main/public/data/teaching/teaching.json" target="_blank" rel="noreferrer">Open GitHub Editor</a><a class="card-link" href="#/teaching">Back</a>')}
    <section class="detail printable">
      <div class="metadata">${statusBadge(courseDateStatus(item))}</div>
      ${detailSection('Course details', courseSummary(item))}
      ${detailSection('Assessment structure', assessmentSummary(item))}
      ${detailSection('Course plan', `${ctx.canWrite() ? `<div class="action-bar"><button class="secondary" data-toggle-panel="course-activity-form">Add Activity</button></div>${coursePlanAddForm(item)}` : ''}${subtaskTimeline(item, { kind: 'academic', id: item.id, module: 'teaching' })}`)}
    </section>`;
}

function courseDateStatus(item = {}) {
  const today = localDateIso();
  const start = item.course_start_date || '';
  const end = item.course_end_date || item.final_deadline || '';
  if (start && today < start) return 'about_to_start';
  if (end && today > end) return 'finished';
  if (start && today >= start && (!end || today <= end)) return 'on_going';
  return item.status || 'pending';
}

function localDateIso() {
  const date = new Date();
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 10);
}

function courseSummary(item) {
  const internalMarks = calculatedInternalMarks(item);
  const externalMarks = calculatedExternalMarks(item);
  const fields = [
    ['Total Particpants', item.total_participants],
    ['Course Types', item.course_type],
    ['Programme', item.programme],
    ['Batch', item.batch],
    ['Section', item.section],
    ['Campus', item.campus],
    ['Total Hours', item.total_hours || item.hours],
    ['Lecture Count', calculatedLectureCount(item)],
    ['Lecture Duration', item.lecture_duration],
    ['Total Marks', internalMarks + externalMarks],
    ['Internal Marks', internalMarks],
    ['External Marks', externalMarks],
    ['Start Date', item.course_start_date],
    ['End Date', item.course_end_date],
    ['Feedback Score', item.feedback_score]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  return `<div class="summary-grid single-row-summary">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`;
}

function assessmentSummary(item) {
  const custom = Array.isArray(item.assessment_components) ? item.assessment_components : [];
  if (custom.length) {
    const fields = [
      ...custom.map((value, index) => [`Component ${index + 1}`, value]),
      ['Internal Marks', calculatedInternalMarks(item)],
      ['External Marks', calculatedExternalMarks(item)]
    ];
    return `<div class="summary-grid single-row-summary">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`;
  }
  const internal = item.internal_components || {};
  const fields = [
    ['Internal Marks', item.internal_component_marks],
    ['Quiz-1', internal.quiz_1],
    ['Quiz-2', internal.quiz_2],
    ['Class participation', internal.class_participation],
    ['Assignment(s)', internal.assignments],
    ['Project(s)', internal.projects],
    ['External Marks', item.external_component_marks]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  return `<div class="summary-grid single-row-summary">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`;
}

function calculatedLectureCount(item = {}) {
  const hours = parseCourseNumber(item.total_hours || item.hours);
  const lectureHour = parseCourseNumber(item.lecture_duration);
  if (!hours || !lectureHour) return item.total_lectures || '';
  return Math.ceil(hours / lectureHour);
}

function calculatedInternalMarks(item = {}) {
  if (Array.isArray(item.assessment_components) && item.assessment_components.length) {
    return item.assessment_components.reduce((sum, value) => {
      const match = String(value).match(/(-?\d+(?:\.\d+)?)\s*$/);
      return sum + (match ? Number(match[1]) : 0);
    }, 0);
  }
  return Number(item.internal_component_marks || 0);
}

function calculatedExternalMarks(item = {}) {
  return Number(item.external_component_marks || 0);
}

function parseCourseNumber(value = '') {
  const parsed = Number.parseFloat(String(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function courseFields() {
  return `<input name="sub_type" type="hidden" value="course" />
      ${courseTypeSelect()}
      <input name="programme" placeholder="Programme" />
      <input name="batch" placeholder="Batch, e.g. 2025-30" />
      <input name="section" placeholder="Section" />
      <input name="campus" placeholder="Campus" />
      <input name="total_participants" type="number" min="0" placeholder="Total Particpants" />
      <input name="total_hours" type="number" min="0" step="0.25" placeholder="Total Hours" />
      <input name="lecture_duration" type="number" min="0.1" step="0.1" placeholder="Lecture Duration" />
      <input name="total_lectures" type="number" min="1" placeholder="Lecture Count" readonly />
      <textarea name="assessment_components" placeholder="Assessment components, one per line. Example: Quiz-1: 5"></textarea>
      <input name="internal_component_marks" type="number" min="0" placeholder="Internal Marks" readonly />
      <input name="external_component_marks" type="number" min="0" placeholder="External Marks" />
      <input name="total_marks" type="number" min="0" placeholder="Total Marks" readonly />
      <input name="course_start_date" type="date" title="Start Date" />
      <input name="course_end_date" type="date" title="End Date" />`;
}

function courseTypeSelect(selected = '') {
  return `<select name="course_type"><option value="">Course Types</option>${courseTypes().map((type) => `<option value="${escapeHtml(type)}" ${selected === type ? 'selected' : ''}>${escapeHtml(type)}</option>`).join('')}</select>`;
}

function courseTypes() {
  return ['UG Course', 'PG Course', 'Doctorate Course', 'Executive Course (Week Days)', 'Executive Course (Weekends)', 'FDP Course', 'MDP Course', 'Certificate Course'];
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
  return `<section class="append-panel" id="course-activity-form" hidden>
    <h4>Add Activity</h4>
    <form class="record-form" data-add-subtask="academic" data-id="${escapeHtml(item.id)}" data-module="teaching">
      <input name="subtask_id" type="hidden" />
      <input name="subtask_type" type="hidden" value="activity" />
      <input name="status" type="hidden" value="pending" />
      <input name="hierarchy_level" type="hidden" value="0" />
      <input name="parent_subtask_id" type="hidden" value="" />
      <input name="sequence_order" type="number" min="1" step="1" placeholder="Sequence Number" />
      <input name="title" required placeholder="Activity Name" />
      <input name="due_datetime" type="date" />
      <input name="responsible_person" placeholder="Responsible" value="${escapeHtml(item.supervisor || 'Dr. Jitendra Kumar Verma')}" />
      <input name="responsible_contact" placeholder="Responsible Contact" />
      <input name="responsible_email" type="email" placeholder="Responsible Email" />
      <input name="notes" placeholder="Topic / Notes / Remark" />
      <button>Add Activity</button>
    </form>
  </section>`;
}

function activityProgress(item = {}) {
  const activities = topLevelActivities(item);
  return {
    completed: activities.filter((activity) => activity.status === 'completed').length,
    total: activities.length
  };
}

function nextPendingActivity(item = {}) {
  return topLevelActivities(item)
    .filter((activity) => !['completed', 'cancelled'].includes(String(activity.status).toLowerCase()))
    .sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0))[0];
}

function topLevelActivities(item = {}) {
  return [...(item.subtasks || [])].filter((activity) => Number(activity.hierarchy_level || 0) === 0 && !activity.parent_subtask_id);
}
