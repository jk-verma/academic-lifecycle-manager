const MASK = 'Confidential content hidden';
const paths = {
  users: './public/config/users.json',
  permissions: './public/config/permissions.json',
  candidates: './public/data/candidates/candidates.json',
  meetings: './public/data/meetings/meetings.json',
  workbench: './public/data/workbench/workbench.json'
};

let store = null;
let role = 'ADMIN';
let route = location.hash.replace('#/', '') || 'dashboard';
let query = '';

const root = document.getElementById('root');

async function loadJson(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function canSee(visibility) {
  return store.permissions.roles[role].visible_levels.includes(visibility);
}

function mask(value, visibility) {
  return canSee(visibility) ? value : (store.permissions.masked_text || MASK);
}

function flattenWorkbench() {
  return Object.entries(store.workbench.modules).flatMap(([module, records]) =>
    records.map((record) => ({ ...record, module }))
  );
}

function visibleCandidates() {
  return store.candidates.records
    .filter((record) => role !== 'RESTRICTED_EXTERNAL' || canSee(record.visibility))
    .map((record) => ({
      ...record,
      topic: mask(record.topic, record.visibility),
      supervisor: mask(record.supervisor, record.visibility)
    }));
}

function visibleMeetings() {
  return store.meetings.records
    .filter((record) => role !== 'RESTRICTED_EXTERNAL' || canSee(record.visibility))
    .map((record) => ({
      ...record,
      agenda: mask(record.agenda, record.visibility),
      discussion: mask(record.discussion, record.visibility),
      decisions: mask(record.decisions, record.visibility)
    }));
}

function visibleWorkbench() {
  return flattenWorkbench()
    .filter((record) => role !== 'RESTRICTED_EXTERNAL' || canSee(record.visibility))
    .map((record) => ({
      ...record,
      description_or_abstract: mask(record.description_or_abstract, record.visibility)
    }));
}

function badge(text) {
  return `<span class="badge">${escapeHtml(text)}</span>`;
}

function pageTitle(title, subtitle) {
  return `<section class="page-title"><p class="eyebrow">research-lifecycle-manager</p><h2>${escapeHtml(title)}</h2><p>${escapeHtml(subtitle)}</p></section>`;
}

function recordLine(title, meta, visibility) {
  return `<article class="record-line"><div><strong>${escapeHtml(title)}</strong><span>${escapeHtml(meta)}</span></div>${badge(visibility)}</article>`;
}

function notes(items = []) {
  if (!items.length) return '<p class="muted">No notes yet.</p>';
  return `<div class="notes">${items.map((note) => {
    const text = canSee(note.visibility) ? note.text : MASK;
    const cls = canSee(note.visibility) ? '' : ' class="masked"';
    return `<p${cls}>${escapeHtml(text)}</p>`;
  }).join('')}</div>`;
}

function shell(content) {
  const nav = [
    ['dashboard', 'Dashboard'],
    ['candidates', 'Candidates'],
    ['meetings', 'Meetings'],
    ['workbench', 'Workbench'],
    ['search', 'Search'],
    ['data', 'Data']
  ].map(([id, label]) => `<button class="${route === id ? 'active' : ''}" data-route="${id}">${label}</button>`).join('');

  const roles = Object.keys(store.permissions.roles)
    .map((item) => `<option ${item === role ? 'selected' : ''}>${item}</option>`)
    .join('');

  root.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <div><p class="brand">research-lifecycle-manager</p><nav>${nav}</nav></div>
        <p class="sidebar-note">Static GitHub Pages portal. Roles are logical views, not login sessions.</p>
      </aside>
      <main class="content">
        <header class="topbar">
          <div><p class="eyebrow">Faculty controlled static portal</p><h1>Academic research lifecycle system</h1></div>
          <label class="role-picker">Logical role<select id="role-picker">${roles}</select></label>
        </header>
        ${content}
      </main>
    </div>`;

  document.querySelectorAll('[data-route]').forEach((button) => {
    button.addEventListener('click', () => {
      location.hash = `#/${button.dataset.route}`;
    });
  });
  document.getElementById('role-picker').addEventListener('change', (event) => {
    role = event.target.value;
    render();
  });
}

function dashboard() {
  const candidates = visibleCandidates();
  const meetings = visibleMeetings();
  const workbench = visibleWorkbench();
  return `
    ${pageTitle('Dashboard', 'Supervision and academic work in one static, Git-friendly workspace.')}
    <div class="metrics">
      <article class="metric"><strong>${candidates.length}</strong><span>Candidates</span></article>
      <article class="metric"><strong>${meetings.length}</strong><span>Meetings</span></article>
      <article class="metric"><strong>${workbench.length}</strong><span>Workbench items</span></article>
      <article class="metric"><strong>${meetings.filter((item) => item.next_meeting_date).length}</strong><span>Upcoming reviews</span></article>
    </div>
    <div class="grid two">
      <section class="panel"><h3>Active supervision</h3>${candidates.map((item) => recordLine(item.name, `${item.programme_type} | ${item.topic}`, item.visibility)).join('')}</section>
      <section class="panel"><h3>Faculty workbench</h3>${workbench.slice(0, 8).map((item) => recordLine(item.title, `${item.module} | ${item.status}`, item.visibility)).join('')}</section>
    </div>`;
}

function candidatesPage() {
  return `
    ${pageTitle('Candidate Workspaces', 'Masters, PhD, and intern lifecycle records with visibility-aware notes.')}
    <div class="grid">
      ${visibleCandidates().map((candidate) => `
        <article class="card printable">
          <div class="card-head">${badge(candidate.visibility)}<button class="icon-button" onclick="window.print()">Print</button></div>
          <h3>${escapeHtml(candidate.name)}</h3>
          <p>${escapeHtml(candidate.programme_type)} | ${escapeHtml(candidate.status)}</p>
          <p>${escapeHtml(candidate.topic)}</p>
          <h4>Phase progress</h4>
          <div class="phase-grid">${candidate.phase_progress.map((phase) => `<article><strong>${escapeHtml(phase.phase)}</strong><span>${escapeHtml(phase.status)}</span></article>`).join('')}</div>
          <h4>Append-only notes</h4>${notes(candidate.notes_append_only)}
        </article>`).join('')}
    </div>`;
}

function meetingsPage() {
  return `
    ${pageTitle('Meeting Records', 'Append-only comments, action tracking, attendance, and print-friendly minutes.')}
    <div class="grid">
      ${visibleMeetings().map((meeting) => `
        <article class="card printable">
          <div class="card-head">${badge(meeting.visibility)}<button class="icon-button" onclick="window.print()">Print</button></div>
          <h3>${escapeHtml(meeting.title)}</h3>
          <p>${escapeHtml(meeting.date)} | ${escapeHtml(meeting.phase)} | ${escapeHtml(meeting.mode)}</p>
          <p><strong>Agenda:</strong> ${escapeHtml(meeting.agenda)}</p>
          <p><strong>Discussion:</strong> ${escapeHtml(meeting.discussion)}</p>
          <p><strong>Decisions:</strong> ${escapeHtml(meeting.decisions)}</p>
          <h4>Actions</h4>
          ${(meeting.action_items || []).map((item) => `<p>${escapeHtml(item.text)} - ${escapeHtml(item.responsible_person)} - ${escapeHtml(item.due_date)}</p>`).join('')}
          <h4>Append-only comments</h4>${notes(meeting.comments_append_only)}
        </article>`).join('')}
    </div>`;
}

function workbenchPage() {
  return `
    ${pageTitle('Faculty Academic Workbench', 'Publications, books, projects, consultancy, MOOCs, and custom academic activities.')}
    <div class="grid">
      ${visibleWorkbench().map((item) => `
        <article class="card printable">
          <div class="card-head">${badge(item.visibility)}<button class="icon-button" onclick="window.print()">Print</button></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.module)} | ${escapeHtml(item.status)}</p>
          <p>${escapeHtml(item.description_or_abstract)}</p>
          <h4>Append-only notes</h4>${notes(item.notes_append_only)}
        </article>`).join('')}
    </div>`;
}

function searchPage() {
  const all = [
    ...visibleCandidates().map((item) => ({ ...item, kind: 'candidate', title: item.name, body: item.topic })),
    ...visibleMeetings().map((item) => ({ ...item, kind: 'meeting', body: item.discussion })),
    ...visibleWorkbench().map((item) => ({ ...item, kind: item.module, body: item.description_or_abstract }))
  ];
  const results = all.filter((item) => JSON.stringify(item).toLowerCase().includes(query.toLowerCase()));
  return `
    ${pageTitle('Search and Filters', 'Client-side search across candidates, meetings, projects, and publications.')}
    <div class="searchbar"><input id="search-input" value="${escapeHtml(query)}" placeholder="Search records" /></div>
    <div class="grid">${results.map((item) => `<article class="card">${badge(item.kind)}<h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.body || item.status)}</p></article>`).join('')}</div>`;
}

function dataPage() {
  return `
    ${pageTitle('JSON Import and Export', 'Prepare Git-friendly JSON changes locally, then commit them to the repository.')}
    <div class="grid two">
      <section class="panel"><h3>Export</h3><p>Download the current static data bundle.</p><button id="export-json">Export JSON bundle</button></section>
      <section class="panel"><h3>Static role model</h3><p>Current role: <strong>${escapeHtml(role)}</strong></p><p>This is not authentication. True passwords require a future backend or protected hosting layer.</p></section>
    </div>`;
}

function render() {
  const pages = {
    dashboard,
    candidates: candidatesPage,
    meetings: meetingsPage,
    workbench: workbenchPage,
    search: searchPage,
    data: dataPage
  };
  shell((pages[route] || dashboard)());
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (event) => {
      query = event.target.value;
      render();
    });
    searchInput.focus();
  }
  const exportButton = document.getElementById('export-json');
  if (exportButton) {
    exportButton.addEventListener('click', () => {
      const blob = new Blob([JSON.stringify(store, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'research-lifecycle-manager-data-export.json';
      link.click();
      URL.revokeObjectURL(url);
    });
  }
}

window.addEventListener('hashchange', () => {
  route = location.hash.replace('#/', '') || 'dashboard';
  render();
});

Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await loadJson(path)]))
  .then((entries) => {
    store = Object.fromEntries(entries);
    role = store.users.active_role || 'ADMIN';
    render();
  })
  .catch((error) => {
    root.innerHTML = `<main class="boot"><h1>research-lifecycle-manager</h1><p>${escapeHtml(error.message)}</p></main>`;
  });
