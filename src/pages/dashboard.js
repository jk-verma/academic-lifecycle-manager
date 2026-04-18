import { formatDateTime, pageHeader, recordCard, statusBadge, taskCardBody, visibilityBadge } from '../components/ui.js';
import { isOverdue, todayIso } from '../utils/date.js';

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
  const manuscripts = workbench.filter((item) => ['journal_articles', 'authored_books', 'edited_books', 'book_chapters', 'conference_papers'].includes(item.module) && ['drafting', 'submitted', 'under_review', 'revision'].includes(item.status));
  const followups = workbench.filter((item) => JSON.stringify(item).toLowerCase().includes('follow'));
  const academic = ctx.visibleAcademicLife();
  const teaching = academic.filter((item) => item.module === 'teaching');
  const career = academic.filter((item) => item.module === 'career_mobility');
  const subtaskDeadlines = flattenSubtaskDeadlines([...workbench, ...academic, ...candidates]);
  const deadlineRecords = [...calendar, ...workbench, ...academic, ...candidates, ...subtaskDeadlines]
    .filter((item) => item.due_date || item.final_deadline || item.application_deadline || item.ending_date)
    .sort((a, b) => deadlineValue(a).localeCompare(deadlineValue(b)));
  const overdueDeadlines = deadlineRecords.filter((item) => isOverdue(deadlineValue(item), item.status));
  const weeklyTasks = deadlineRecords.filter((item) => withinDays(deadlineValue(item), 7));
  const bimonthlyTasks = deadlineRecords.filter((item) => withinDays(deadlineValue(item), 15));
  const monthlyTasks = deadlineRecords.filter((item) => withinDays(deadlineValue(item), 30));
  const recent = [...candidates, ...meetings, ...workbench, ...activities, ...calendar, ...academic]
    .sort((a, b) => recentValue(b).localeCompare(recentValue(a)))
    .slice(0, 6);

  return `${pageHeader('Home', "Today's priorities, deadlines, follow-ups, and academic work in one place.", `Data updated ${lastUpdated(store)}`)}
    <div class="metrics">
      ${metric('Total candidates', candidates.length)}
      ${metric('Masters / PhD / UG / Intern', `${masters} / ${phd} / ${ug} / ${interns}`)}
      ${metric('Upcoming meetings', upcomingMeetings.length)}
      ${metric('Today tasks', todaysTasks.length)}
      ${metric('Overdue deadlines', overdueDeadlines.length + overdueActions.length, overdueDeadlines.length + overdueActions.length ? 'danger' : '')}
      ${metric('Active projects', activeProjects.length)}
      ${metric('Manuscripts in progress', manuscripts.length)}
      ${metric('Teaching records', teaching.length)}
      ${metric('Needs follow-up', followups.length)}
    </div>
    <div class="grid two">
      <section class="panel"><h3>Today's tasks</h3>${todaysTasks.map((item) => recordCard({
        title: item.title,
        meta: item.date || item.due_date,
        body: item.short_notes || item.notes,
        badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
        href: item.due_date ? `#/calendar/${item.id}` : `#/planner/${item.id}`
      })).join('') || '<p class="muted">No tasks due today.</p>'}</section>
      ${deadlinePanel('Weekly Tasks', weeklyTasks)}
      ${deadlinePanel('Bimonthly Tasks', bimonthlyTasks)}
      ${deadlinePanel('Monthly Tasks', monthlyTasks)}
      <section class="panel"><h3>Overdue items</h3>${overdueDeadlines.map(deadlineCard).join('') || '<p class="muted">No overdue deadlines.</p>'}</section>
      <section class="panel"><h3>Upcoming meetings</h3>${upcomingMeetings.map((item) => recordCard({
        title: item.title,
        meta: `${item.next_meeting_date} | ${item.phase}`,
        body: item.discussion,
        badges: visibilityBadge(item.visibility),
        href: `#/meetings/${item.id}`
      })).join('') || '<p class="muted">No upcoming meetings.</p>'}</section>
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

function lastUpdated(store) {
  const values = [
    store.supervision?.updated_at,
    store.teaching?.updated_at,
    store.publications?.updated_at,
    store.projects?.updated_at,
    store.administration?.updated_at,
    store.careerMobility?.updated_at,
    store.miscellaneous?.updated_at,
    store.activities?.updated_at,
    store.calendar?.updated_at,
    store.mentors?.updated_at,
    store.workflowTemplates?.updated_at
  ].filter(Boolean).sort().reverse();
  return values[0]?.slice(0, 10) || 'not available';
}

function recentValue(item = {}) {
  return String(
    item.timestamps?.updated_at ||
    item.updated_at ||
    item.created_at ||
    item.date ||
    item.final_deadline_datetime ||
    item.final_deadline ||
    item.due_date ||
    item.course_end_date ||
    item.course_start_date ||
    ''
  );
}

function metric(label, value, tone = '') {
  return `<article class="metric ${tone}"><strong>${value}</strong><span>${label}</span></article>`;
}

function deadlinePanel(title, items) {
  return `<section class="panel"><h3>${title}</h3>${items.slice(0, 8).map(deadlineCard).join('') || '<p class="muted">No tasks in this period.</p>'}</section>`;
}

function deadlineCard(item) {
  const deadline = deadlineValue(item);
  return recordCard({
    title: item.name || item.title,
    meta: formatDateTime(deadline),
    body: taskCardBody(item, item.topic || item.description_or_abstract || item.notes || ''),
    badges: `${statusBadge(item.status || 'active')} ${isOverdue(deadline, item.status) ? statusBadge('overdue') : ''}`,
    href: item.route || recordRoute(item)
  });
}

function summaryCards(items, route) {
  return items.slice(0, 4).map((item) => recordCard({
    title: item.name || item.title,
    meta: `${item.category || item.programme_type || item.module || route} | ${item.priority || 'medium'}`,
    body: taskCardBody(item, item.topic || item.description_or_abstract || ''),
    badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility || 'open')}`,
    href: item.route || recordRoute(item, route)
  })).join('') || '<p class="muted">No visible records.</p>';
}

function recordRoute(item, route = '') {
  if (item.route) return item.route;
  if (item.programme_type && !item.candidate_id) return `#/students/${item.id}`;
  if (item.candidate_id) return `#/meetings/${item.id}`;
  if (item.module && ['journal_articles', 'authored_books', 'edited_books', 'book_chapters', 'conference_papers', 'projects', 'consultancy', 'moocs', 'custom_activities'].includes(item.module)) return `#/workbench/${item.module}/${item.id}`;
  if (item.module === 'career_mobility') return `#/career/${item.id}`;
  if (item.module === 'subscriptions') return `#/subscriptions/${item.id}`;
  if (item.module === 'teaching') return `#/teaching/${item.id}`;
  if (item.due_date) return `#/calendar/${item.id}`;
  if (item.date) return `#/planner/${item.id}`;
  return route ? `#/${route}` : '#/search';
}

function deadlineValue(item) {
  return String(item.due_date || item.final_deadline_datetime || item.final_deadline || item.application_deadline || item.ending_date || '');
}

function withinDays(value, days) {
  if (!value) return false;
  const target = new Date(value);
  const today = new Date(todayIso());
  if (Number.isNaN(target.getTime())) return false;
  const diff = (target - today) / 86400000;
  return diff >= 0 && diff <= days;
}

function flattenSubtaskDeadlines(records) {
  return records.flatMap((record) => (record.subtasks || [])
    .filter((subtask) => !['completed', 'cancelled'].includes(String(subtask.status).toLowerCase()) && (subtask.due_datetime || subtask.due_date))
    .map((subtask) => ({
      id: subtask.id,
      title: subtask.title,
      due_date: subtask.due_datetime || subtask.due_date,
      status: subtask.status,
      visibility: record.visibility,
      priority: record.priority,
      category: record.category || record.module || record.programme_type,
      module: record.module,
      route: recordRoute(record),
      notes: `Parent: ${record.name || record.title}. Responsible: ${subtask.responsible_person || 'not assigned'}.`,
      subtasks: []
    })));
}
