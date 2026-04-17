import { inDateRange } from './date.js';
import { isOverdue } from './date.js';

export function flattenWorkbench(workbench) {
  return Object.entries(workbench?.modules || {}).flatMap(([module, records]) =>
    records.map((record) => ({ ...record, module }))
  );
}

export function structuredFilter(records, filters) {
  return records.filter((record) => {
    const text = JSON.stringify(record).toLowerCase();
    if (filters.q && !text.includes(filters.q.toLowerCase())) return false;
    if (filters.programme && record.programme_type !== filters.programme) return false;
    if (filters.candidate && record.candidate_id !== filters.candidate && record.id !== filters.candidate) return false;
    if (filters.phase && record.phase !== filters.phase) return false;
    if (filters.module && record.module !== filters.module) return false;
    if (filters.status && record.status !== filters.status) return false;
    if (filters.priority && record.priority !== filters.priority) return false;
    if (filters.institution) {
      const institutionText = [record.institution_name, record.organization_or_publisher, record.funding_agency, record.organization].filter(Boolean).join(' ').toLowerCase();
      if (!institutionText.includes(filters.institution.toLowerCase())) return false;
    }
    if (filters.academicYear && record.academic_year_current !== filters.academicYear && record.academic_year_start !== filters.academicYear) return false;
    const date = record.date || record.final_deadline_datetime || record.final_deadline || record.due_datetime || record.submission_date || record.timestamps?.updated_at?.slice(0, 10);
    if (filters.overdue === 'yes' && !isOverdue(date, record.status)) return false;
    if (filters.overdue === 'no' && isOverdue(date, record.status)) return false;
    return inDateRange(date, filters.from, filters.to);
  });
}
