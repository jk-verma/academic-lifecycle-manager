import { detailSection, emptyState, formatDateTime, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { isOverdue, todayIso } from '../utils/date.js';
import { escapeHtml } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export function calendarPage(ctx) {
  const calendarRecords = ctx.visibleCalendar().map((item) => ({ ...item, card_actions: ctx.cardActions('calendar', item.id) }));
  const derivedSubtasks = subtaskDeadlineItems([
    ...ctx.visibleWorkbench(),
    ...ctx.visibleAcademicLife(),
    ...ctx.visibleCandidates()
  ]);
  const items = structuredFilter([...calendarRecords, ...derivedSubtasks], ctx.filters).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const today = todayIso();
  const plus7 = offsetDate(7);
  const plus30 = offsetDate(30);
  const overdue = items.filter((item) => isOverdue(item.due_date, item.status));
  const upcoming7 = items.filter((item) => item.due_date >= today && item.due_date <= plus7);
  const upcoming30 = items.filter((item) => item.due_date >= today && item.due_date <= plus30);
  return `${pageHeader('Deadline Calendar', 'Monthly, weekly, overdue, and upcoming deadline management.')}
    ${ctx.renderFilters()}
    ${ctx.canWrite() ? calendarForm(ctx) : '<p class="notice">Calendar writing is currently unavailable in this view.</p>'}
    <div class="grid">
      ${calendarSection('Overdue', overdue)}
      ${calendarSection('Upcoming 7 days', upcoming7)}
      ${calendarSection('Upcoming 30 days', upcoming30)}
      ${calendarSection('Monthly calendar', items)}
      ${calendarSection('Weekly agenda', upcoming7)}
    </div>`;
}

export function calendarDetailPage(ctx, id) {
  const item = ctx.visibleCalendar().find((record) => record.id === id);
  if (!item) return emptyState('Calendar item not found', 'This deadline is unavailable for the selected role.');
  return `${pageHeader(item.title, `${item.category} | due ${item.due_date}`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(item.status)} ${statusBadge(item.priority)} ${visibilityBadge(item.visibility)} ${isOverdue(item.due_date, item.status) ? statusBadge('overdue') : ''}</div>
      ${detailSection('Deadline details', `<p><strong>Linked record:</strong> ${escapeHtml(item.linked_record_id)}</p><p><strong>Subtype:</strong> ${escapeHtml(item.sub_type)}</p><p><strong>Reminder:</strong> ${escapeHtml(item.reminder_date)}</p><p>${escapeHtml(item.notes)}</p>`)}
      ${detailSection('Academic year', `<p>Start: ${escapeHtml(item.academic_year_start)} | Current: ${escapeHtml(item.academic_year_current)} | Carry forward: ${escapeHtml(item.carry_forward)}</p>`)}
    </section>`;
}

function calendarSection(title, items) {
  return `<section class="panel"><h3>${escapeHtml(title)}</h3>${items.map((item) => recordCard({
    title: item.title,
    meta: `${formatDateTime(item.due_date)} | ${item.category} | ${item.priority}`,
    body: item.notes,
    badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${isOverdue(item.due_date, item.status) ? statusBadge('overdue') : ''}`,
    href: item.route || `#/calendar/${item.id}`,
    actions: item.route ? '' : ctxCardActions(item)
  })).join('') || emptyState('Nothing here', 'No calendar items in this view.')}</section>`;
}

function ctxCardActions(item) {
  return item.card_actions || '';
}

function calendarForm(ctx) {
  return `<section class="panel">
    <h3>Add Deadline</h3>
    <form class="record-form" id="calendar-form">
      <input name="title" required placeholder="Deadline title" />
      <input name="due_date" type="date" required />
      <input name="reminder_date" type="date" />
      <select name="category"><option>teaching</option><option>research</option><option>academic_administration</option></select>
      <input name="sub_type" placeholder="Subtype" />
      <input name="linked_record_id" placeholder="Linked record ID" />
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <button>Add Deadline</button>
    </form>
  </section>`;
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function subtaskDeadlineItems(records) {
  return records.flatMap((record) => (record.subtasks || [])
    .filter((subtask) => !['completed', 'cancelled'].includes(String(subtask.status).toLowerCase()) && (subtask.due_datetime || subtask.due_date))
    .map((subtask) => {
      const due = subtask.due_datetime || subtask.due_date;
      return {
        id: subtask.id,
        title: subtask.title,
        linked_record_id: record.id,
        category: record.category || record.module || record.programme_type || 'subtask',
        sub_type: subtask.subtask_type,
        due_date: due.slice(0, 10),
        reminder_date: '',
        status: subtask.status,
        priority: record.priority || 'medium',
        visibility: record.visibility || 'open',
        notes: `Parent: ${record.name || record.title}. Responsible: ${subtask.responsible_person || 'not assigned'}.`,
        academic_year_start: record.academic_year_start,
        academic_year_current: record.academic_year_current,
        carry_forward: record.carry_forward,
        route: routeForParent(record)
      };
    }));
}

function routeForParent(record) {
  if (record.programme_type && !record.candidate_id) return `#/candidates/${record.id}`;
  if (record.module && ['journal_articles', 'authored_books', 'book_chapters', 'conference_papers', 'projects', 'consultancy', 'custom_activities'].includes(record.module)) return `#/workbench/${record.module}/${record.id}`;
  if (record.module === 'teaching') return `#/teaching/${record.id}`;
  if (record.module === 'admin_work') return `#/admin-work/${record.id}`;
  if (record.module === 'external_engagements') return `#/external/${record.id}`;
  if (record.module === 'career_mobility') return `#/career-mobility/${record.id}`;
  return '#/calendar';
}
