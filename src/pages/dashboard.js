import { pageHeader, recordCard, statusBadge, taskCardBody, visibilityBadge } from '../components/ui.js';
import { isOverdue, todayIso } from '../utils/date.js';
import { shouldCarryForward } from '../utils/academic-year.js';

export function dashboardPage(ctx) {
  const { store, visibleCandidates, visibleMeetings, visibleWorkbench } = ctx;
  const candidates = visibleCandidates();
  const meetings = visibleMeetings();
  const workbench = visibleWorkbench();
  const activities = ctx.visibleActivities();
  const calendar = ctx.visibleCalendar();
  const today = todayIso();
  const todaysTasks = [
    ...activities.filter((item) => item.date === today || item.next_action_date === today),
    ...calendar.filter((item) => item.due_date === today || item.reminder_date === today)
  ];
  const masters = candidates.filter((item) => item.programme_type === 'Masters').length;
  const phd = candidates.filter((item) => item.programme_type === 'PhD').length;
  const ug = candidates.filter((item) => item.programme_type === 'UG').length;
  const interns = candidates.filter((item) => item.programme_type === 'Intern').length;
  const upcomingMeetings = meetings.filter((item) => item.next_meeting_date && item.status !== 'archived');
  const overdueActions = meetings.flatMap((meeting) => (meeting.action_items || []).map((action) => ({ ...action, meeting }))).filter((item) => isOverdue(item.due_date, item.status));
  const overdueCalendar = calendar.filter((item) => isOverdue(item.due_date, item.status));
  const activeProjects = workbench.filter((item) => ['projects', 'consultancy'].includes(item.module) && !['completed', 'archived'].includes(item.status));
  const manuscripts = workbench.filter((item) => ['journal_articles', 'authored_books', 'book_chapters', 'conference_papers'].includes(item.module) && ['drafting', 'submitted', 'under_review', 'revision'].includes(item.status));
  const followups = workbench.filter((item) => JSON.stringify(item).toLowerCase().includes('follow'));
  const carryForward = ctx.allRecords().filter(shouldCarryForward);
  const academic = ctx.visibleAcademicLife();
  const teaching = academic.filter((item) => item.module === 'teaching');
  const career = academic.filter((item) => item.module === 'career_mobility');
  const upcomingDeadlines = [...calendar, ...workbench, ...academic, ...candidates]
    .filter((item) => item.due_date || item.final_deadline || item.application_deadline)
    .sort((a, b) => String(a.due_date || a.final_deadline || a.application_deadline).localeCompare(String(b.due_date || b.final_deadline || b.application_deadline)))
    .slice(0, 6);
  const recent = [...candidates, ...meetings, ...workbench, ...activities, ...calendar]
    .sort((a, b) => String(b.timestamps?.updated_at || '').localeCompare(String(a.timestamps?.updated_at || '')))
    .slice(0, 6);

  return `${pageHeader('Home', 'Your academic command center for today, this week, and the current academic year.', `Data updated ${store.candidates.updated_at?.slice(0, 10) || 'unknown'}`)}
    <div class="metrics">
      ${metric('Total candidates', candidates.length)}
      ${metric('Masters / PhD / UG / Intern', `${masters} / ${phd} / ${ug} / ${interns}`)}
      ${metric('Upcoming meetings', upcomingMeetings.length)}
      ${metric('Today tasks', todaysTasks.length)}
      ${metric('Overdue actions', overdueActions.length + overdueCalendar.length, overdueActions.length + overdueCalendar.length ? 'danger' : '')}
      ${metric('Active projects', activeProjects.length)}
      ${metric('Manuscripts in progress', manuscripts.length)}
      ${metric('Teaching records', teaching.length)}
      ${metric('Needs follow-up', followups.length)}
      ${metric('Carry-forward', carryForward.length)}
    </div>
    <div class="grid two">
      <section class="panel"><h3>Today's tasks</h3>${todaysTasks.map((item) => recordCard({
        title: item.title,
        meta: item.date || item.due_date,
        body: item.short_notes || item.notes,
        badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
        href: item.due_date ? `#/calendar/${item.id}` : `#/planner/${item.id}`
      })).join('') || '<p class="muted">No tasks due today.</p>'}</section>
      <section class="panel"><h3>Upcoming deadlines</h3>${upcomingDeadlines.map((item) => recordCard({
        title: item.name || item.title,
        meta: item.due_date || item.final_deadline || item.application_deadline,
        body: taskCardBody(item, item.topic || item.description_or_abstract || item.notes || ''),
        badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility || 'internal')}`,
        href: item.route || recordRoute(item)
      })).join('') || '<p class="muted">No upcoming deadlines.</p>'}</section>
      <section class="panel"><h3>Upcoming meetings</h3>${upcomingMeetings.map((item) => recordCard({
        title: item.title,
        meta: `${item.next_meeting_date} | ${item.phase}`,
        body: item.discussion,
        badges: visibilityBadge(item.visibility),
        href: `#/meetings/${item.id}`
      })).join('')}</section>
      <section class="panel"><h3>Research summary</h3>${summaryCards(manuscripts, 'research')}</section>
      <section class="panel"><h3>Teaching summary</h3>${summaryCards(teaching, 'teaching')}</section>
      <section class="panel"><h3>Supervision summary</h3>${summaryCards(candidates, 'students')}</section>
      <section class="panel"><h3>Career mobility</h3>${summaryCards(career, 'career')}</section>
      <section class="panel"><h3>Recently updated</h3>${recent.map((item) => recordCard({
        title: item.name || item.title,
        meta: item.programme_type || item.module || item.phase || item.category,
        body: item.topic || item.description_or_abstract || item.discussion || item.short_notes || item.notes,
        badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
        href: item.programme_type && !item.candidate_id ? `#/candidates/${item.id}` : item.candidate_id ? `#/meetings/${item.id}` : item.module ? `#/workbench/${item.module}/${item.id}` : item.due_date ? `#/calendar/${item.id}` : item.date ? `#/activities/${item.id}` : '#/dashboard'
      })).join('')}</section>
    </div>`;
}

function metric(label, value, tone = '') {
  return `<article class="metric ${tone}"><strong>${value}</strong><span>${label}</span></article>`;
}

function summaryCards(items, route) {
  return items.slice(0, 4).map((item) => recordCard({
    title: item.name || item.title,
    meta: `${item.category || item.programme_type || item.module || route} | ${item.priority || 'medium'}`,
    body: taskCardBody(item, item.topic || item.description_or_abstract || ''),
    badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility || 'internal')}`,
    href: item.route || recordRoute(item, route)
  })).join('') || '<p class="muted">No visible records.</p>';
}

function recordRoute(item, route = '') {
  if (item.programme_type && !item.candidate_id) return `#/students/${item.id}`;
  if (item.candidate_id) return `#/meetings/${item.id}`;
  if (item.module && ['journal_articles', 'authored_books', 'book_chapters', 'conference_papers', 'projects', 'consultancy', 'moocs', 'custom_activities'].includes(item.module)) return `#/workbench/${item.module}/${item.id}`;
  if (item.module === 'career_mobility') return `#/career/${item.id}`;
  if (item.module === 'teaching') return `#/teaching/${item.id}`;
  if (item.due_date) return `#/calendar/${item.id}`;
  if (item.date) return `#/planner/${item.id}`;
  return route ? `#/${route}` : '#/search';
}
