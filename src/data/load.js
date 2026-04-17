export const DATA_PATHS = {
  users: './public/config/users.json',
  permissions: './public/config/permissions.json',
  candidates: './public/data/candidates/candidates.json',
  meetings: './public/data/meetings/meetings.json',
  workbench: './public/data/workbench/workbench.json',
  activities: './public/data/daily-activities/daily-activities.json',
  calendar: './public/data/calendar/calendar.json'
};

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function validateStore(store) {
  const errors = [];
  if (!Array.isArray(store.candidates?.records)) errors.push('Candidate records are missing.');
  if (!Array.isArray(store.meetings?.records)) errors.push('Meeting records are missing.');
  if (!store.workbench?.modules) errors.push('Workbench modules are missing.');
  if (!Array.isArray(store.activities?.records)) errors.push('Daily activity records are missing.');
  if (!Array.isArray(store.calendar?.records)) errors.push('Calendar records are missing.');
  if (!store.permissions?.roles) errors.push('Permission roles are missing.');
  return errors;
}

export async function loadStore() {
  const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await loadJson(path)]));
  const store = Object.fromEntries(entries);
  const errors = validateStore(store);
  if (errors.length) throw new Error(errors.join(' '));
  return store;
}
