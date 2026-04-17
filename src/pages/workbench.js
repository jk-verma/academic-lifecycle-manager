import { detailSection, emptyState, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskProgress, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml, slugLabel } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export const moduleLabels = {
  journal_articles: 'Journal Articles',
  authored_books: 'Authored Books',
  book_chapters: 'Book Chapters',
  conference_papers: 'Conference Papers',
  projects: 'Projects and Sponsored Activities',
  consultancy: 'Consultancy / Visiting Faculty',
  moocs: 'MOOC / Course Development',
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
  return `${pageHeader(moduleLabels[module] || slugLabel(module), 'Filtered module list with status, visibility, and detail drill-down.')}
    ${ctx.renderFilters({ moduleLocked: module })}
    <div class="grid">${items.map((item) => recordCard({
      title: item.title,
      meta: `${slugLabel(item.module)} | ${item.status} | final deadline: ${item.final_deadline || 'not set'}`,
      body: `${taskProgress(item).label} | ${item.description_or_abstract || ''}`,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
      href: `#/workbench/${item.module}/${item.id}`
    })).join('') || emptyState('No records', 'No workbench records match this module and filter set.')}</div>`;
}

export function workbenchDetailPage(ctx, module, id) {
  const item = ctx.visibleWorkbench().find((record) => record.module === module && record.id === id);
  if (!item) return emptyState('Workbench item not found', 'This item is unavailable or hidden for the selected role.');
  const projectBody = module === 'projects' ? projectDetails(item) : genericDetails(item);
  return `${pageHeader(item.title, moduleLabels[module] || slugLabel(module))}
    ${printActionBar(`<a class="card-link" href="#/workbench/${module}">Back to module</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${module === 'projects' && hasOverdueReporting(item) ? statusBadge('overdue_reporting') : ''}</div>
      ${detailSection('Overall task', taskSummary(item))}
      ${detailSection('Subtask timeline', subtaskTimeline(item))}
      ${projectBody}
      ${detailSection('Append-only notes', notesPanel(ctx.maskNotes(item.notes_append_only)))}
      ${detailSection('Timeline / history', timelinePanel(item.revision_history))}
      ${detailSection('Attachments / references', (item.attachments || []).map((attachment) => `<p>${escapeHtml(attachment.label)} | ${escapeHtml(attachment.url)}</p>`).join('') || '<p class="muted">No attachments.</p>')}
      ${ctx.canWrite() ? ctx.subtaskForm('workbench', item.id, module) : ''}
      ${ctx.canWrite() ? ctx.appendNoteForm('workbench', item.id, module) : ''}
      ${ctx.canArchive() && item.status !== 'archived' ? `<button class="secondary" data-archive-kind="workbench" data-archive-module="${escapeHtml(module)}" data-archive-id="${escapeHtml(item.id)}">Archive record</button>` : ''}
    </section>`;
}

function genericDetails(item) {
  return detailSection('Record details', `<pre>${escapeHtml(JSON.stringify(item, null, 2))}</pre>`);
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
