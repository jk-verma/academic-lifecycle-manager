import { emptyState, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { structuredFilter } from '../utils/search.js';

export function searchPage(ctx) {
  const records = [
    ...ctx.visibleCandidates().map((item) => ({ ...item, kind: 'candidate', title: item.name, href: `#/candidates/${item.id}`, body: item.topic })),
    ...ctx.visibleMeetings().map((item) => ({ ...item, kind: 'meeting', href: `#/meetings/${item.id}`, body: item.discussion })),
    ...ctx.visibleWorkbench().map((item) => ({ ...item, kind: item.module, href: `#/workbench/${item.module}/${item.id}`, body: item.description_or_abstract })),
    ...ctx.visibleActivities().map((item) => ({ ...item, kind: 'daily_activity', href: `#/activities/${item.id}`, body: item.short_notes })),
    ...ctx.visibleCalendar().map((item) => ({ ...item, kind: 'calendar', href: `#/calendar/${item.id}`, body: item.notes })),
    ...ctx.visibleAcademicLife().map((item) => ({ ...item, kind: item.module, href: `#/${routeName(item.module)}/${item.id}`, body: (item.notes || [])[0]?.text || item.feedback || item.responsibility || item.organization }))
  ];
  const results = structuredFilter(records, ctx.filters);
  return `${pageHeader('Search', 'Structured search across candidates, meetings, modules, projects, and publications.')}
    ${ctx.renderFilters()}
    <div class="grid">${results.map((item) => recordCard({
      title: item.title,
      meta: item.kind,
      body: item.body,
      badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility)}`,
      href: item.href
    })).join('') || emptyState('No matches', 'Adjust the filters and try again.')}</div>`;
}

function routeName(module) {
  if (module === 'admin_work') return 'admin-work';
  if (module === 'external_engagements') return 'external';
  if (module === 'career_mobility') return 'career-mobility';
  return module;
}
