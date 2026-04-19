import { detailSection, emptyState, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, timelinePanel, visibilityBadge } from '../components/ui.js';
import { mentorGroups, optionList } from '../data/structure.js';
import { escapeHtml, slugLabel } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export function mentorsPage(ctx) {
  const selectedMentor = ctx.filters.mentor || '';
  const selectedCandidate = ctx.filters.mentorCandidate || '';
  const mentors = structuredFilter(ctx.visibleMentors(), { ...ctx.filters, module: '', candidate: '' })
    .filter((mentor) => !selectedMentor || mentor.id === selectedMentor)
    .filter((mentor) => !selectedCandidate || (mentor.assigned_candidate_ids || []).includes(selectedCandidate));
  return `${pageHeader('Mentors', 'Senior students, junior faculty members, and external collaborators who guide selected students.')}
    ${mentorRibbon(ctx, mentors, selectedMentor, selectedCandidate)}
    ${ctx.canWrite() ? ctx.dataTools('mentors', 'public/data/mentors/mentors.json') : ''}
    <div class="structure-grid">${mentorGroups.map((group) => `<section class="structure-panel"><h3>${escapeHtml(group.title)}</h3><div class="chip-list">${group.items.map(([, label]) => `<span class="chip">${escapeHtml(label)}</span>`).join('')}</div></section>`).join('')}</div>
    ${ctx.canWrite() ? mentorForm(ctx) : '<p class="notice">Adding mentors is currently unavailable in this view.</p>'}
    <div class="grid">${mentors.map((mentor) => recordCard({
      title: mentor.name,
      meta: `${slugLabel(mentor.mentor_type)} | ${mentor.status} | ${mentor.academic_year_current}`,
      body: `${assignedCandidateNames(ctx, mentor).join(', ') || 'No assigned students yet'} | ${mentor.specialization || ''}`,
      badges: `${statusBadge(mentor.status)} ${visibilityBadge(mentor.visibility)}`,
      href: `#/mentors/${mentor.id}`,
      actions: ctx.cardActions('mentor', mentor.id)
    })).join('') || emptyState('No mentors', 'No mentor records are visible.')}</div>`;
}

function mentorRibbon(ctx, visibleMentors = [], selectedMentor = '', selectedCandidate = '') {
  const mentors = ctx.visibleMentors();
  const candidates = ctx.visibleCandidates();
  return `<div class="structure-grid">
    <section class="structure-panel teaching-ribbon">
      <div class="ribbon-head">
        <h3>Mentor Filters</h3>
        <div class="ribbon-actions">
          <label class="ribbon-filter"><span>Mentor</span>
            <select id="filter-mentor">
              <option value="">All mentors</option>
              ${mentors.map((mentor) => `<option value="${escapeHtml(mentor.id)}" ${selectedMentor === mentor.id ? 'selected' : ''}>${escapeHtml(mentor.name)}</option>`).join('')}
            </select>
          </label>
          <label class="ribbon-filter"><span>Supervising Candidate</span>
            <select id="filter-mentorCandidate">
              <option value="">All candidates</option>
              ${candidates.map((candidate) => `<option value="${escapeHtml(candidate.id)}" ${selectedCandidate === candidate.id ? 'selected' : ''}>${escapeHtml(candidate.name)}</option>`).join('')}
            </select>
          </label>
          <span class="meta-badge"><strong>Visible:</strong> ${escapeHtml(String(visibleMentors.length))}</span>
        </div>
      </div>
    </section>
  </div>`;
}

export function mentorDetailPage(ctx, id) {
  const mentor = ctx.visibleMentors().find((item) => item.id === id);
  if (!mentor) return emptyState('Mentor not found', 'This mentor record is unavailable for the selected role.');
  const candidates = assignedCandidates(ctx, mentor);
  return `${pageHeader(mentor.name, `${slugLabel(mentor.mentor_type)} | ${mentor.designation || 'Mentor'}`)}
    ${printActionBar('<a class="card-link" href="#/mentors">Back to Mentors</a>')}
    <section class="detail printable">
      <div class="metadata">${statusBadge(mentor.status)} ${statusBadge(mentor.priority)} ${visibilityBadge(mentor.visibility)}</div>
      ${detailSection('Mentor profile', `<div class="summary-grid">
        ${summaryItem('Type', slugLabel(mentor.mentor_type))}
        ${summaryItem('Designation', mentor.designation)}
        ${summaryItem('Organization', mentor.organization)}
        ${summaryItem('Email', mentor.email)}
        ${summaryItem('Mobile / Extension', mentor.mobile_or_extension)}
        ${summaryItem('Academic year', mentor.academic_year_current)}
      </div><p>${escapeHtml(mentor.role_description || '')}</p>`)}
      ${detailSection('Assigned students', candidates.map((candidate) => recordCard({
        title: candidate.name,
        meta: `${candidate.programme_type} | ${candidate.status}`,
        body: candidate.topic,
        badges: `${statusBadge(candidate.status)} ${visibilityBadge(candidate.visibility)}`,
        href: `#/candidates/${candidate.id}`
      })).join('') || '<p class="muted">No students assigned.</p>')}
      ${mentor.specialization ? detailSection('Specialization', `<p>${escapeHtml(mentor.specialization)}</p>`) : ''}
      ${(mentor.notes_append_only || []).length ? detailSection('Append-only notes', notesPanel(ctx.maskNotes(mentor.notes_append_only))) : ''}
      ${detailSection('History', timelinePanel(mentor.history || []))}
    </section>`;
}

function mentorForm(ctx) {
  return `<section class="panel">
    <h3>Add Mentor</h3>
    <form class="record-form" id="mentor-form">
      <input name="name" required placeholder="Mentor name" />
      <select name="mentor_type">${optionList(mentorGroups).map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('')}</select>
      <input name="designation" placeholder="Designation" />
      <input name="organization" placeholder="Organization" />
      <input name="email" type="email" placeholder="Email" />
      <input name="mobile_or_extension" placeholder="Mobile / Extension" />
      <input name="specialization" placeholder="Specialization / support area" />
      <input name="assigned_candidate_ids" placeholder="Candidate IDs, comma separated" />
      <input name="role_description" placeholder="Mentor role description" />
      <input name="academic_year_current" placeholder="Academic year" value="2025-2026" />
      <select name="status"><option>active</option><option>planned</option><option>inactive</option><option>archived</option></select>
      <select name="priority"><option>medium</option><option>high</option><option>low</option></select>
      <input name="note" placeholder="Initial append-only note" />
      <button>Add Mentor</button>
    </form>
  </section>`;
}

function assignedCandidates(ctx, mentor) {
  const ids = mentor.assigned_candidate_ids || [];
  return ctx.visibleCandidates().filter((candidate) => ids.includes(candidate.id));
}

function assignedCandidateNames(ctx, mentor) {
  return assignedCandidates(ctx, mentor).map((candidate) => candidate.name);
}

function summaryItem(label, value) {
  if (!value) return '';
  return `<article><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></article>`;
}
