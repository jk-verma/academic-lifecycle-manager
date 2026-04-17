import { detailSection, emptyState, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { isOverdue, todayIso } from '../utils/date.js';
import { escapeHtml } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export function calendarPage(ctx) {
  const items = structuredFilter(ctx.visibleCalendar(), ctx.filters).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const today = todayIso();
  const plus7 = offsetDate(7);
  const plus30 = offsetDate(30);
  const overdue = items.filter((item) => isOverdue(item.due_date, item.status));
  const upcoming7 = items.filter((item) => item.due_date >= today && item.due_date <= plus7);
  const upcoming30 = items.filter((item) => item.due_date >= today && item.due_date <= plus30);
  return `${pageHeader('Deadline Calendar', 'Monthly, weekly, overdue, and upcoming deadline management.')}
    ${ctx.renderFilters()}
    ${ctx.canWrite() ? calendarForm(ctx) : '<p class="notice">Calendar writing is available only to ADMIN, ASSISTANT, and WRITER roles.</p>'}
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
    meta: `${item.due_date} | ${item.category} | ${item.priority}`,
    body: item.notes,
    badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)} ${isOverdue(item.due_date, item.status) ? statusBadge('overdue') : ''}`,
    href: `#/calendar/${item.id}`
  })).join('') || emptyState('Nothing here', 'No calendar items in this view.')}</section>`;
}

function calendarForm(ctx) {
  return `<section class="panel">
    <h3>Assistant/Admin calendar entry</h3>
    <form class="record-form" id="calendar-form">
      <input name="title" required placeholder="Deadline title" />
      <input name="due_date" type="date" required />
      <input name="reminder_date" type="date" />
      <select name="category"><option>submission</option><option>revision</option><option>follow_up</option><option>project_reporting</option><option>meeting</option><option>supervision_milestone</option><option>teaching</option><option>administration</option><option>consultancy</option><option>mooc</option></select>
      <input name="sub_type" placeholder="Subtype" />
      <input name="linked_record_id" placeholder="Linked record ID" />
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <select name="visibility">${ctx.store.permissions.visibility_levels.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select>
      <button>Add local deadline</button>
    </form>
  </section>`;
}

function offsetDate(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}
