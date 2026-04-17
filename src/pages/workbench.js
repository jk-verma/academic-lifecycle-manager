import { detailSection, emptyState, formatDateTime, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskCardBody, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml, slugLabel } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export const moduleLabels = {
  journal_articles: 'Journal Articles',
  authored_books: 'Authored Books',
  book_chapters: 'Book Chapters',
  conference_papers: 'Conference Papers',
  projects: 'Projects and Sponsored Activities',
  consultancy: 'Consultancy / Visiting Faculty / MOOC Course Development',
  custom_activities: 'Custom Academic Activities'
};

export function workbenchHomePage(ctx) {
  const items = ctx.visibleWorkbench();
  return `${pageHeader('Faculty Academic Workbench', 'Module-specific academic work lifecycle tracking.')}
    <div class="grid">${Object.entries(moduleLabels).map(([module, label]) => {
      const count = items.filter((item) => item.module === module).length;
      return recordCard({ title: label, meta: `${count} visible records`, body: 'Open module list and detail pages.', badges: statusBadge('module'), href: `#/workbench/${module}` });
    }).join('')}</div>`;
}

export function workbenchModulePage(ctx, module) {
  const items = structuredFilter(ctx.visibleWorkbench().filter((item) => item.module === module), ctx.filters);
  return `${pageHeader(moduleLabels[module] || slugLabel(module), 'Filtered module list with status and detail drill-down.')}
    ${ctx.renderFilters({ moduleLocked: module })}
    ${ctx.canWrite() ? workbenchRecordForm(module, moduleLabels[module] || slugLabel(module), ctx) : '<p class="notice">Adding records is currently unavailable in this view.</p>'}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${slugLabel(item.module)} | ${item.status} | final deadline: ${formatDateTime(item.final_deadline_datetime || item.final_deadline) || 'not set'}`,
      body: taskCardBody(item, item.description_or_abstract || ''),
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
      href: `#/workbench/${item.module}/${item.id}`,
      actions: ctx.cardActions('workbench', item.id, item.module)
    })).join('') || emptyState('No records', 'No workbench records match this module and filter set.')}</div>`;
}

export function workbenchDetailPage(ctx, module, id) {
  const item = ctx.visibleWorkbench().find((record) => record.module === module && record.id === id);
  if (!item) return emptyState('Workbench item not found', 'This item is unavailable or hidden for the selected role.');
  const projectBody = module === 'projects' ? projectDetails(item) : genericDetails(item);
  const attachments = item.attachments || [];
  return `${pageHeader(item.title, moduleLabels[module] || slugLabel(module))}
    ${printActionBar(`<a class="card-link" href="#/workbench/${module}">Back to module</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${module === 'projects' && hasOverdueReporting(item) ? statusBadge('overdue_reporting') : ''}</div>
      ${detailSection('Overall task', taskSummary(item))}
      ${detailSection('Activity / sub-activity timeline', subtaskTimeline(item, { kind: 'workbench', id: item.id, module }))}
      ${projectBody}
      ${(item.notes_append_only || []).length ? detailSection('Append-only notes', notesPanel(ctx.maskNotes(item.notes_append_only))) : ''}
      ${detailSection('Timeline / history', timelinePanel(item.revision_history))}
      ${attachments.length ? detailSection('Attachments / references', attachments.map((attachment) => `<p>${escapeHtml(attachment.label)} | ${escapeHtml(attachment.url)}</p>`).join('')) : ''}
      ${ctx.canWrite() ? ctx.subtaskForm('workbench', item.id, module) : ''}
      ${ctx.canWrite() ? ctx.appendNoteForm('workbench', item.id, module) : ''}
      ${ctx.canArchive() && item.status !== 'archived' ? `<button class="secondary" data-archive-kind="workbench" data-archive-module="${escapeHtml(module)}" data-archive-id="${escapeHtml(item.id)}">Archive record</button>` : ''}
    </section>`;
}

function workbenchRecordForm(module, title, ctx) {
  const actionLabel = module === 'projects'
    ? 'Add Project'
    : ['journal_articles', 'conference_papers', 'authored_books', 'book_chapters'].includes(module)
      ? 'Add Publication'
      : `Add ${title} activity`;
  return `<section class="panel">
    <h3>${escapeHtml(actionLabel)}</h3>
    <form class="record-form" data-workbench-module="${escapeHtml(module)}">
      <input name="title" required placeholder="Title" />
      <input name="description_or_abstract" placeholder="Description / abstract / purpose" />
      ${workbenchSpecificFields(module)}
      <input name="final_deadline_datetime" type="datetime-local" />
      <input name="academic_year_current" placeholder="Academic year" value="2025-2026" />
      <select name="status"><option>idea</option><option>drafting</option><option>proposal</option><option>submitted</option><option>under_review</option><option>revision</option><option>followup</option><option>execution</option><option>completed</option></select>
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <input name="note" placeholder="Initial append-only note" />
      <button>${escapeHtml(actionLabel)}</button>
    </form>
  </section>`;
}

function workbenchSpecificFields(module) {
  if (module === 'projects') {
    return `<select name="type"><option>sponsored_project</option><option>research_project</option><option>consultancy_project</option><option>grant_in_aid_project</option><option>collaborative_project</option><option>institutional_project</option><option>minor_project</option><option>major_project</option><option>industry_project</option><option>internal_seed_project</option><option>custom</option></select>
      <input name="funding_agency" placeholder="Funding agency" />
      <input name="PI" placeholder="PI" />
      <input name="budget" placeholder="Budget" />`;
  }
  if (module === 'journal_articles') return '<input name="journal" placeholder="Journal" />';
  if (module === 'conference_papers') return '<input name="conference_name" placeholder="Conference name" />';
  if (module === 'authored_books') return '<input name="publisher" placeholder="Publisher" />';
  if (module === 'book_chapters') return '<input name="book_title" placeholder="Book title" />';
  if (module === 'consultancy') return '<input name="organization" placeholder="Organization" />';
  if (module === 'moocs') return '<input name="platform" placeholder="Platform" />';
  return '<input name="sub_type" placeholder="Subtype" />';
}

function genericDetails(item) {
  const fields = [
    ['Category', item.category || item.module],
    ['Subtype', item.sub_type || item.assignment_type],
    ['Type', item.type || item.assignment_type],
    ['Organization', item.organization || item.organization_or_publisher || item.platform],
    ['Academic year', item.academic_year_current],
    ['Final deadline', item.final_deadline_datetime || item.final_deadline],
    ['Priority', item.priority],
    ['Platform', item.platform],
    ['Launch term', item.launch_term],
    ['Proposal status', item.proposal_status],
    ['NOC status', item.noc_status || item.office_noc],
    ['Content status', item.content_status],
    ['Recording status', item.recording_status],
    ['Upload status', item.upload_status],
    ['Billing status', item.billing_status],
    ['Honorarium', item.honorarium],
    ['Engagement dates', (item.engagement_dates || []).join(', ')],
    ['Collaborators', (item.collaborators || []).join(', ')],
    ['Deliverables', (item.deliverables || []).join(', ')]
  ].filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== '');
  const description = item.description_or_abstract ? `<p>${escapeHtml(item.description_or_abstract)}</p>` : '';
  return detailSection('Record summary', `${description}<div class="summary-grid">${fields.map(([label, value]) => `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`).join('')}</div>`);
}

function projectDetails(item) {
  const lifecycle = ['proposal_status', 'office_noc', 'submission_status', 'followup_status', 'sanction_status', 'execution_status'];
  return `
    <div class="project-progress">${lifecycle.map((key) => `<article><strong>${escapeHtml(slugLabel(key))}</strong><span>${escapeHtml(item[key] || 'not set')}</span></article>`).join('')}</div>
    <div class="grid two">
      ${detailSection('Funding and team', `<p><strong>Type:</strong> ${escapeHtml(item.type)}</p><p><strong>Agency:</strong> ${escapeHtml(item.funding_agency)}</p><p><strong>PI:</strong> ${escapeHtml(item.PI)}</p><p><strong>Co-investigators:</strong> ${(item.co_investigators || []).map(escapeHtml).join(', ')}</p><p><strong>Team:</strong> ${(item.team || []).map(escapeHtml).join(', ')}</p><p><strong>Budget:</strong> ${escapeHtml(item.budget)}</p>`)}
      ${detailSection('Reporting and deliverables', `<p><strong>Reporting deadlines:</strong> ${(item.reporting_deadlines || []).map((date) => `<span class="${isOverdue(date, item.status) ? 'overdue' : ''}">${escapeHtml(date)}</span>`).join(', ')}</p><p><strong>Deliverables:</strong> ${(item.deliverables || []).map(escapeHtml).join(', ')}</p>`)}
    </div>`;
}

function hasOverdueReporting(item) {
  return (item.reporting_deadlines || []).some((date) => isOverdue(date, item.status));
}
