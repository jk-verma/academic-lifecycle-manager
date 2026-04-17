import { detailSection, emptyState, notesPanel, pageHeader, recordCard, statusBadge, timelinePanel, visibilityBadge } from '../components/ui.js';
import { escapeHtml } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export function activitiesPage(ctx) {
  const activities = structuredFilter(ctx.visibleActivities(), ctx.filters);
  return `${pageHeader('Daily Planner', 'Daily academic, research, supervision, administration, and engagement logs.')}
    ${ctx.renderFilters()}
    ${ctx.canWrite() ? activityForm(ctx) : '<p class="notice">Daily activity writing is available only to ADMIN and ASSISTANT roles.</p>'}
    <div class="grid">${activities.map((activity) => recordCard({
      title: activity.title,
      meta: `${activity.date} | ${activity.category} | ${activity.priority}`,
      body: activity.short_notes,
      badges: `${statusBadge(activity.status)} ${visibilityBadge(activity.visibility)}`,
      href: `#/activities/${activity.id}`
    })).join('') || emptyState('No activities', 'No daily activity records match the current filters.')}</div>`;
}

export function activityDetailPage(ctx, id) {
  const activity = ctx.visibleActivities().find((item) => item.id === id);
  if (!activity) return emptyState('Activity not found', 'This daily activity is unavailable for the selected role.');
  return `${pageHeader(activity.title, `${activity.date} | ${activity.category}`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(activity.status)} ${visibilityBadge(activity.visibility)} ${statusBadge(activity.priority)}</div>
      ${detailSection('Activity details', `<p><strong>Subtype:</strong> ${escapeHtml(activity.sub_type)}</p><p><strong>Linked record:</strong> ${escapeHtml(activity.linked_record_id)}</p><p><strong>Next action:</strong> ${escapeHtml(activity.next_action_date)}</p><p>${escapeHtml(activity.short_notes)}</p>`)}
      ${detailSection('Academic year', `<p>Start: ${escapeHtml(activity.academic_year_start)} | Current: ${escapeHtml(activity.academic_year_current)} | Carry forward: ${escapeHtml(activity.carry_forward)}</p>`)}
      ${detailSection('History', timelinePanel(activity.history))}
    </section>`;
}

function activityForm(ctx) {
  return `<section class="panel">
    <h3>Assistant/Admin daily log</h3>
    <form class="record-form" id="activity-form">
      <input name="title" required placeholder="Activity title" />
      <input name="date" type="date" required />
      <select name="category"><option>teaching</option><option>research</option><option>supervision</option><option>projects</option><option>academic_administration</option><option>external_engagements</option><option>custom_work</option></select>
      <input name="sub_type" placeholder="Subtype" />
      <input name="linked_record_id" placeholder="Linked record ID" />
      <input name="short_notes" placeholder="Short notes" />
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <select name="visibility">${ctx.store.permissions.visibility_levels.map((item) => `<option>${escapeHtml(item)}</option>`).join('')}</select>
      <button>Add local activity</button>
    </form>
  </section>`;
}
