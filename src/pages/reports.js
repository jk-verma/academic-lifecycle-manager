import { emptyState, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { shouldCarryForward } from '../utils/academic-year.js';
import { isOverdue } from '../utils/date.js';

export function reportsPage(ctx) {
  const records = ctx.allRecords();
  const completed = records.filter((item) => ['completed', 'published', 'accepted', 'closed'].includes(String(item.status).toLowerCase()));
  const pending = records.filter((item) => !['completed', 'published', 'accepted', 'closed', 'archived'].includes(String(item.status).toLowerCase()));
  const overdue = records.filter((item) => isOverdue(item.due_date || item.final_deadline || item.application_deadline || item.next_action_date || item.next_meeting_date, item.status));
  const carryForward = records.filter(shouldCarryForward);
  const years = [...new Set(records.flatMap((item) => [item.academic_year_current, item.academic_year_start]).filter(Boolean))].sort().reverse();
  const research = records.filter((item) => ['journal_articles', 'authored_books', 'book_chapters', 'conference_papers'].includes(item.module));
  const teaching = records.filter((item) => item.module === 'teaching');
  const supervision = records.filter((item) => item.programme_type && !item.candidate_id);
  const mentors = records.filter((item) => item.mentor_type);
  const projects = records.filter((item) => item.module === 'projects' || item.module === 'consultancy');
  const career = records.filter((item) => item.module === 'career_mobility');
  return `${pageHeader('Reports', 'Completed vs pending, overdue items, and academic-year summaries.')}
    <div class="metrics">
      ${metric('Completed', completed.length)}
      ${metric('Pending', pending.length)}
      ${metric('Overdue', overdue.length, overdue.length ? 'danger' : '')}
      ${metric('Carry-forward', carryForward.length)}
      ${metric('Research', research.length)}
      ${metric('Teaching', teaching.length)}
      ${metric('Supervision', supervision.length)}
      ${metric('Mentors', mentors.length)}
      ${metric('Projects', projects.length)}
      ${metric('Career', career.length)}
    </div>
    <div class="grid two">
      <section class="panel"><h3>Overdue items</h3>${overdue.map((item) => reportCard(item)).join('') || emptyState('No overdue items', 'No overdue records are visible.')}</section>
      <section class="panel"><h3>Carry-forward items</h3>${carryForward.map((item) => reportCard(item)).join('') || emptyState('No carry-forward work', 'Everything visible is completed or closed.')}</section>
      <section class="panel"><h3>Research summary</h3>${research.map((item) => reportCard(item)).join('') || emptyState('No research records', 'No research records are visible.')}</section>
      <section class="panel"><h3>Teaching summary</h3>${teaching.map((item) => reportCard(item)).join('') || emptyState('No teaching records', 'No teaching records are visible.')}</section>
      <section class="panel"><h3>Supervision summary</h3>${supervision.map((item) => reportCard(item)).join('') || emptyState('No supervision records', 'No supervision records are visible.')}</section>
      <section class="panel"><h3>Mentor summary</h3>${mentors.map((item) => reportCard(item)).join('') || emptyState('No mentor records', 'No mentor records are visible.')}</section>
      <section class="panel"><h3>Project summary</h3>${projects.map((item) => reportCard(item)).join('') || emptyState('No project records', 'No project records are visible.')}</section>
      <section class="panel"><h3>Career mobility summary</h3>${career.map((item) => reportCard(item)).join('') || emptyState('No career records', 'No career mobility records are visible.')}</section>
      <section class="panel"><h3>Yearly summary</h3>${years.map((year) => {
        const inYear = records.filter((item) => item.academic_year_current === year || item.academic_year_start === year);
        return recordCard({
          title: year,
          meta: `${inYear.length} records`,
          body: `${inYear.filter(shouldCarryForward).length} carry-forward | ${inYear.filter((item) => completed.includes(item)).length} completed`,
          badges: statusBadge('year_summary'),
          href: `#/years/${year}`
        });
      }).join('')}</section>
    </div>`;
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
