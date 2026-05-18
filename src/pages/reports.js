import { emptyState, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { inDateRange, isOverdue } from '../utils/date.js';

export function reportsPage(ctx) {
  const from = ctx.filters.from || '';
  const to = ctx.filters.to || '';
  const records = ctx.allRecords().filter((item) => inDateRange(reportDate(item), from, to));
  const completed = records.filter((item) => ['completed', 'finished', 'published', 'accepted', 'closed'].includes(String(item.status).toLowerCase()));
  const pending = records.filter((item) => !['completed', 'finished', 'published', 'accepted', 'closed', 'archived'].includes(String(item.status).toLowerCase()));
  const overdue = records.filter((item) => isOverdue(item.due_date || item.final_deadline || item.application_deadline || item.ending_date || item.next_action_date || item.next_meeting_date, item.status));
  const years = [...new Set(records.flatMap((item) => [item.academic_year_current, item.academic_year_start]).filter(Boolean))].sort().reverse();
  const research = records.filter((item) => ['journal_articles', 'authored_books', 'edited_books', 'book_chapters', 'conference_papers'].includes(item.module));
  const teaching = records.filter((item) => item.module === 'teaching');
  const supervision = records.filter((item) => item.programme_type && !item.candidate_id);
  const mentors = records.filter((item) => item.mentor_type);
  const projects = records.filter((item) => item.module === 'projects' || item.module === 'consultancy');
  const career = records.filter((item) => item.module === 'career_mobility');
  const subscriptions = records.filter((item) => item.module === 'subscriptions');
  return `${pageHeader('Reports', 'Completed vs pending, overdue items, and academic-year summaries.')}
    ${reportWindowBar(from, to)}
    <p class="muted">Window: ${from || 'start'} to ${to || 'end'} | Records in window: ${records.length}</p>
    <div class="metrics report-metrics">
      ${metric('Completed', completed.length)}
      ${metric('Pending', pending.length)}
      ${metric('Overdue', overdue.length, overdue.length ? 'danger' : '')}
      ${metric('Research', research.length)}
      ${metric('Teaching', teaching.length)}
      ${metric('Supervision', supervision.length)}
      ${metric('Mentors', mentors.length)}
      ${metric('Projects', projects.length)}
      ${metric('Career', career.length)}
      ${metric('Subscriptions', subscriptions.length)}
    </div>
    <div class="grid comfort-grid report-grid">
      <section class="panel"><h3>Overdue items</h3>${overdue.map((item) => reportCard(item)).join('') || emptyState('No overdue items', 'No overdue records are visible.')}</section>
      <section class="panel"><h3>Research summary</h3>${research.map((item) => reportCard(item)).join('') || emptyState('No research records', 'No research records are visible.')}</section>
      <section class="panel"><h3>Teaching summary</h3>${teaching.map((item) => reportCard(item)).join('') || emptyState('No teaching records', 'No teaching records are visible.')}</section>
      <section class="panel"><h3>Supervision summary</h3>${supervision.map((item) => reportCard(item)).join('') || emptyState('No supervision records', 'No supervision records are visible.')}</section>
      <section class="panel"><h3>Mentor summary</h3>${mentors.map((item) => reportCard(item)).join('') || emptyState('No mentor records', 'No mentor records are visible.')}</section>
      <section class="panel"><h3>Project summary</h3>${projects.map((item) => reportCard(item)).join('') || emptyState('No project records', 'No project records are visible.')}</section>
      <section class="panel"><h3>Career mobility summary</h3>${career.map((item) => reportCard(item)).join('') || emptyState('No career records', 'No career mobility records are visible.')}</section>
      <section class="panel"><h3>Subscription summary</h3>${subscriptions.map((item) => reportCard(item)).join('') || emptyState('No subscriptions', 'No subscription records are visible.')}</section>
      <section class="panel"><h3>Yearly summary</h3>${years.map((year) => {
        const inYear = records.filter((item) => item.academic_year_current === year || item.academic_year_start === year);
        return recordCard({
          title: year,
          meta: `${inYear.length} records`,
          body: `${inYear.filter((item) => completed.includes(item)).length} completed | ${inYear.length - inYear.filter((item) => completed.includes(item)).length} pending`,
          badges: statusBadge('year_summary'),
          href: `#/years/${year}`
        });
      }).join('')}</section>
    </div>`;
}

function reportWindowBar(from, to) {
  return `<section class="panel">
    <h3>Report Window</h3>
    <div class="filters">
      <input id="filter-from" type="date" value="${from}" />
      <input id="filter-to" type="date" value="${to}" />
      <button class="secondary" data-reset-report-window="true">Reset Window</button>
    </div>
  </section>`;
}

function reportDate(item) {
  return item.date
    || item.due_date
    || item.final_deadline
    || item.application_deadline
    || item.ending_date
    || item.next_action_date
    || item.next_meeting_date
    || item.course_end_date
    || item.course_start_date
    || item.timestamps?.updated_at?.slice(0, 10)
    || '';
}

function reportCard(item) {
  return recordCard({
    title: item.name || item.title,
    meta: `${item.academic_year_current || 'no year'} | ${item.status}`,
    body: item.topic || item.description_or_abstract || firstNote(item) || item.short_notes,
    badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility || 'open')}`,
    href: item.route || '#/reports'
  });
}

function firstNote(item) {
  return Array.isArray(item.notes) ? item.notes[0]?.text : item.notes;
}

function metric(label, value, tone = '') {
  return `<article class="metric ${tone}"><strong>${value}</strong><span>${label}</span></article>`;
}
