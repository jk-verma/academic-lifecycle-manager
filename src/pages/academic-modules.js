import { detailSection, emptyState, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskProgress, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml } from '../utils/html.js';

const researchModules = ['journal_articles', 'conference_papers', 'authored_books', 'book_chapters'];
const projectModules = ['projects', 'consultancy'];

export function researchPage(ctx) {
  const items = ctx.visibleWorkbench().filter((item) => researchModules.includes(item.module));
  return moduleList('Research', 'Journal articles, conference papers, books, and book chapters.', items, (item) => `#/workbench/${item.module}/${item.id}`);
}

export function teachingPage(ctx) {
  return academicModulePage(ctx, 'teaching', 'Teaching', 'Courses, programme, hours, notes, and feedback.');
}

export function supervisionPage(ctx) {
  const candidates = ctx.visibleCandidates();
  return `${pageHeader('Supervision', 'PhD, Masters, UG, and intern supervision records.')}
    <div class="grid">${candidates.map((candidate) => recordCard({
      title: candidate.name,
      meta: `${candidate.programme_type} | ${candidate.status}`,
      body: `${candidate.topic} | current phase: ${candidate.phase_progress?.find((phase) => ['active', 'scheduled'].includes(phase.status))?.phase || 'not set'}`,
      badges: `${statusBadge(candidate.status)} ${visibilityBadge(candidate.visibility)}`,
      href: `#/candidates/${candidate.id}`
    })).join('') || emptyState('No supervision records', 'No supervision records are visible for this role.')}</div>`;
}

export function projectsPage(ctx) {
  const items = ctx.visibleWorkbench().filter((item) => projectModules.includes(item.module));
  return moduleList('Projects & Sponsored Work', 'Sponsored projects, consultancy, and research projects.', items, (item) => `#/workbench/${item.module}/${item.id}`);
}

export function adminWorkPage(ctx) {
  return academicModulePage(ctx, 'admin_work', 'Admin Work', 'Committees, reports, responsibilities, and compliance work.');
}

export function externalEngagementsPage(ctx) {
  return academicModulePage(ctx, 'external_engagements', 'External Engagements', 'Visiting faculty, talks, workshops, and consultancy engagements.');
}

export function careerMobilityPage(ctx) {
  return academicModulePage(ctx, 'career_mobility', 'Career Mobility', 'Job applications, deputation, lien, extraordinary leave movement, and contractual opportunities.');
}

export function academicModulePage(ctx, module, title, subtitle) {
  const items = ctx.visibleAcademicLife().filter((item) => item.module === module);
  const form = ctx.canWrite() ? academicRecordForm(module, title, ctx) : '<p class="notice">This role is read-only for local data entry.</p>';
  return `${pageHeader(title, subtitle)}
    ${form}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${item.academic_year_current} | ${item.category} | ${item.priority} | final deadline: ${item.final_deadline || item.application_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${firstVisibleNote(item)}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${item.carry_forward ? statusBadge('carry_forward') : ''}`,
      href: `#/${routeName(module)}/${item.id}`
    })).join('') || emptyState('No records', 'No records are available in this module yet.')}</div>`;
}

export function academicModuleDetailPage(ctx, module, id) {
  const item = ctx.visibleAcademicLife().find((record) => record.module === module && record.id === id);
  if (!item) return emptyState('Record not found', 'This academic life record is unavailable for the selected role.');
  return `${pageHeader(item.title, `${item.category} | ${item.sub_type}`)}
    ${printActionBar(`<a class="card-link" href="#/${routeName(module)}">Back</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${statusBadge(item.priority)} ${visibilityBadge(item.visibility)} ${item.carry_forward ? statusBadge('carry_forward') : ''}</div>
      ${detailSection('Overall task', `${taskSummary(item)}<p><strong>Academic year:</strong> ${escapeHtml(item.academic_year_current)}</p><p><strong>Carry forward:</strong> ${escapeHtml(item.carry_forward)}</p><p><strong>Created by:</strong> ${escapeHtml(item.created_by)}</p>`)}
      ${detailSection('Subtask timeline', subtaskTimeline(item))}
      ${ctx.canWrite() ? ctx.subtaskForm('academic', item.id, module) : ''}
      ${detailSection('Details', `<pre>${escapeHtml(JSON.stringify(stripLargeArrays(item), null, 2))}</pre>`)}
      ${detailSection('Append-only notes', notesPanel(ctx.maskNotes(item.notes || [])))}
      ${detailSection('History', timelinePanel(item.history || []))}
    </section>`;
}

function moduleList(title, subtitle, items, hrefFor) {
  return `${pageHeader(title, subtitle)}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${item.module} | ${item.status} | final deadline: ${item.final_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${item.description_or_abstract || firstVisibleNote(item)}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${item.carry_forward ? statusBadge('carry_forward') : ''}`,
      href: hrefFor(item)
    })).join('') || emptyState('No records', 'No records are visible for this role.')}</div>`;
}

function academicRecordForm(module, title, ctx) {
  return `<section class="panel">
    <h3>Add ${escapeHtml(title)} record</h3>
    <form class="record-form" data-academic-module="${escapeHtml(module)}">
      <input name="title" required placeholder="Title" />
      <input name="sub_type" placeholder="Subtype" />
      ${moduleSpecificFields(module)}
      <input name="final_deadline" type="date" />
      <input name="notes" placeholder="Initial append-only note" />
      <input name="academic_year_current" placeholder="Academic year" value="2025-2026" />
      <select name="status">${statusOptions(module)}</select>
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <select name="visibility">${ctx.store.permissions.visibility_levels.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select>
      <button>Add local record</button>
    </form>
  </section>`;
}

function moduleSpecificFields(module) {
  if (module !== 'career_mobility') return '';
  return `<input name="institution_name" placeholder="Institution name" />
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
}

function firstVisibleNote(item) {
  const note = (item.notes || item.notes_append_only || [])[0];
  return note?.text || item.feedback || item.responsibility || item.organization || '';
}

function stripLargeArrays(item) {
  const { notes, history, subtasks, ...rest } = item;
  return rest;
}

function routeName(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  if (module === 'career_mobility') return 'career-mobility';
  return module;
}

function statusOptions(module) {
  const statuses = module === 'career_mobility'
    ? ['planned', 'applied', 'no_shortlisting', 'shortlisted', 'noc_required', 'noc_from_employer', 'interview', 'no_selection', 'selected', 'technical_resignation', 'joined', 'closed']
    : ['active', 'in_progress', 'planned', 'completed'];
  return statuses.map((status) => `<option>${escapeHtml(status)}</option>`).join('');
}
