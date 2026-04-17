import { emptyState, pageHeader, recordCard, statusBadge, visibilityBadge } from '../components/ui.js';
import { allAcademicYears, shouldCarryForward } from '../utils/academic-year.js';

export function yearsPage(ctx) {
  const records = ctx.allRecords();
  const years = allAcademicYears(records);
  return `${pageHeader('Academic Years', 'Past year records, current year work, and carry-forward items.')}
    <div class="grid">${years.map((year) => recordCard({
      title: year,
      meta: `${records.filter((item) => item.academic_year_current === year || item.academic_year_start === year).length} records`,
      body: `${records.filter((item) => item.academic_year_current === year && shouldCarryForward(item)).length} carry-forward items`,
      badges: statusBadge('academic_year'),
      href: `#/years/${year}`
    })).join('') || emptyState('No academic years', 'No academic-year metadata is present.')}</div>`;
}

export function yearDetailPage(ctx, year) {
  const records = ctx.allRecords().filter((item) => item.academic_year_current === year || item.academic_year_start === year);
  const carryForward = records.filter(shouldCarryForward);
  return `${pageHeader(`Academic Year ${year}`, 'View and update past-year records without duplicating history.')}
    <section class="panel"><h3>Carry-forward items</h3>${carryForward.map((item) => recordCard({
      title: item.name || item.title,
      meta: item.programme_type || item.module || item.category,
      body: item.topic || item.description_or_abstract || item.notes || item.short_notes,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility || 'internal')}`,
      href: item.route || '#/years'
    })).join('') || emptyState('No carry-forward items', 'All visible work is completed or closed.')}</section>
    <section class="panel"><h3>All records in year</h3>${records.map((item) => recordCard({
      title: item.name || item.title,
      meta: item.programme_type || item.module || item.category,
      body: item.topic || item.description_or_abstract || item.notes || item.short_notes,
      badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility || 'internal')}`,
      href: item.route || '#/years'
    })).join('')}</section>`;
}
