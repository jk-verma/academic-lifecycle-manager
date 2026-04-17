export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function nowIso() {
  return new Date().toISOString();
}

export function isOverdue(date, status = '') {
  if (!date) return false;
  return String(date) < todayIso() && !['done', 'closed', 'completed', 'published', 'accepted', 'cancelled', 'canceled'].includes(String(status).toLowerCase());
}

export function inDateRange(date, from, to) {
  if (!date) return !from && !to;
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}
