export const DATA_PATHS = {
  users: 'config/users.json',
  permissions: 'config/permissions.json',
  supervision: 'data/supervision/supervision.json',
  mentors: 'data/mentors/mentors.json',
  teaching: 'data/teaching/teaching.json',
  publications: 'data/publications/publications.json',
  projects: 'data/projects/projects.json',
  administration: 'data/administration/administration.json',
  careerMobility: 'data/career-mobility/career-mobility.json',
  miscellaneous: 'data/miscellaneous/miscellaneous.json',
  activities: 'data/daily-activities/daily-activities.json',
  calendar: 'data/calendar/calendar.json',
  workflowTemplates: 'config/workflow-templates.json'
};

function dataUrls(path) {
  const base = import.meta.env?.BASE_URL || './';
  const baseUrl = base.endsWith('/') ? base : `${base}/`;
  return [
    `${baseUrl}${path}`,
    `./${path}`,
    `./public/${path}`,
    `https://raw.githubusercontent.com/jk-verma/academic-lifecycle-manager/main/public/${path}`
  ];
}

async function loadJson(path) {
  const urls = dataUrls(path);
  const failures = [];
  for (const url of urls) {
    try {
      const response = await fetch(url, { cache: 'no-cache' });
      if (response.ok) return response.json();
      failures.push(`${url} (${response.status})`);
    } catch (err) {
      failures.push(`${url} (${err.message})`);
    }
  }
  throw new Error(`Could not load ${failures.join(' or ')}`);
}

function validateStore(store) {
  const errors = [];
  if (!Array.isArray(store.candidates?.records)) errors.push('Candidate records are missing.');
  if (!Array.isArray(store.mentors?.records)) errors.push('Mentor records are missing.');
  if (!Array.isArray(store.meetings?.records)) errors.push('Meeting records are missing.');
  if (!store.workbench?.modules) errors.push('Workbench modules are missing.');
  if (!Array.isArray(store.activities?.records)) errors.push('Daily activity records are missing.');
  if (!Array.isArray(store.calendar?.records)) errors.push('Calendar records are missing.');
  if (!store.academicLife?.modules) errors.push('Academic life modules are missing.');
  if (!store.permissions?.roles) errors.push('Permission roles are missing.');
  if (!Array.isArray(store.workflowTemplates?.templates)) errors.push('Workflow templates are missing.');
  return errors;
}

export function composeStore(raw) {
  const publications = raw.publications?.modules || {};
  const projects = raw.projects?.modules || {};
  const miscellaneous = raw.miscellaneous?.modules || {};
  const updatedAt = raw.teaching?.updated_at || raw.publications?.updated_at || raw.projects?.updated_at || '';

  return {
    ...raw,
    candidates: raw.supervision?.candidates || { records: [] },
    meetings: raw.supervision?.meetings || { records: [] },
    workbench: {
      schema: 'academic-lifecycle-manager.workbench.composed.v1',
      updated_at: raw.publications?.updated_at || raw.projects?.updated_at || raw.miscellaneous?.updated_at || '',
      modules: {
        journal_articles: publications.journal_articles || [],
        conference_papers: publications.conference_papers || [],
        authored_books: publications.authored_books || [],
        edited_books: publications.edited_books || [],
        book_chapters: publications.book_chapters || [],
        projects: projects.projects || [],
        consultancy: projects.consultancy || [],
        custom_activities: miscellaneous.custom_activities || []
      }
    },
    academicLife: {
      schema: 'academic-lifecycle-manager.academic-life.composed.v1',
      updated_at: updatedAt,
      modules: {
        teaching: raw.teaching?.records || [],
        admin_work: raw.administration?.records || [],
        external_engagements: miscellaneous.external_engagements || [],
        career_mobility: raw.careerMobility?.records || [],
        subscriptions: miscellaneous.subscriptions || []
      }
    }
  };
}

export async function loadStore() {
  const entries = await Promise.all(Object.entries(DATA_PATHS).map(async ([key, path]) => [key, await loadJson(path)]));
  const store = composeStore(Object.fromEntries(entries));
  const errors = validateStore(store);
  if (errors.length) throw new Error(errors.join(' '));
  return store;
}
