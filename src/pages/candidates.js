import { detailSection, emptyState, notesPanel, pageHeader, printActionBar, recordCard, statusBadge, subtaskTimeline, taskProgress, taskSummary, timelinePanel, visibilityBadge } from '../components/ui.js';
import { isOverdue } from '../utils/date.js';
import { escapeHtml } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

const templates = {
  Masters: ['Synopsis', 'Interim Report', 'Final Report'],
  PhD: ['Synopsis', 'Progress Reports', 'DAC-1', 'DAC-2', 'DAC-3', 'Pre-submission Viva'],
  Intern: ['Orientation', 'Weekly Review', 'Final Review']
};

export function candidatesListPage(ctx) {
  const candidates = structuredFilter(ctx.visibleCandidates(), { ...ctx.filters, module: '' });
  return `${pageHeader('Candidates', 'Research supervision workspaces by programme and phase.')}
    ${ctx.renderFilters()}
    ${ctx.canWrite() ? ctx.dataTools('supervision', 'public/data/supervision/supervision.json') : ''}
    ${ctx.canWrite() ? candidateForm(ctx) : '<p class="notice">Adding candidates is currently unavailable in this view.</p>'}
    <div class="grid">${candidates.map((candidate) => recordCard({
      title: candidate.name,
      meta: `${candidate.programme_type} | ${candidate.status} | final deadline: ${candidate.final_deadline || 'not set'}`,
      body: `${taskProgress(candidate).label} | ${candidate.topic}`,
      badges: `${statusBadge(candidate.status)} ${visibilityBadge(candidate.visibility)}`,
      href: `#/candidates/${candidate.id}`,
      actions: ctx.cardActions('candidate', candidate.id)
    })).join('') || emptyState('No candidates', 'No candidates are visible.')}</div>`;
}

function candidateForm(ctx) {
  return `<section class="panel">
    <h3>Add Candidate</h3>
    <form class="record-form" id="candidate-form">
      <input name="name" required placeholder="Candidate name" />
      <select name="programme_type"><option>PhD</option><option>Masters</option><option>Intern</option><option>UG</option></select>
      <input name="topic" required placeholder="Research topic / work title" />
      <input name="supervisor" placeholder="Supervisor" value="Dr. Jitendra Kumar Verma" />
      <input name="start_date" type="date" required />
      <input name="final_deadline_datetime" type="datetime-local" />
      <input name="academic_year_current" placeholder="Academic year" value="2025-2026" />
      <select name="status"><option>active</option><option>planned</option><option>completed</option><option>archived</option></select>
      <select name="priority"><option>medium</option><option>high</option><option>low</option></select>
      <input name="note" placeholder="Initial append-only note" />
      <button>Add Candidate</button>
    </form>
  </section>`;
}

export function candidateDetailPage(ctx, id) {
  const candidate = ctx.visibleCandidates().find((item) => item.id === id);
  if (!candidate) return emptyState('Candidate not found', 'This candidate is unavailable or hidden for the selected role.');
  const meetings = ctx.visibleMeetings().filter((item) => item.candidate_id === id);
  const actions = meetings.flatMap((meeting) => (meeting.action_items || []).map((action) => ({ ...action, meeting })));
  const attendancePresent = meetings.filter((item) => item.attendance_status === 'present').length;
  const phaseList = templates[candidate.programme_type] || candidate.phase_progress.map((item) => item.phase);

  return `${pageHeader(candidate.name, candidate.topic)}
    ${printActionBar(`<a class="card-link" href="#/supervision">Back to Supervision</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(candidate.status)} ${visibilityBadge(candidate.visibility)} <span class="programme-badge">${escapeHtml(candidate.programme_type)}</span></div>
      ${detailSection('Overall task', taskSummary(candidate))}
      ${detailSection('Activity / sub-activity timeline', subtaskTimeline(candidate, { kind: 'candidate', id: candidate.id }))}
      ${ctx.canWrite() ? ctx.subtaskForm('candidate', candidate.id) : ''}
      <div class="grid two">
        ${detailSection('Profile summary', `<p><strong>Supervisor:</strong> ${escapeHtml(candidate.supervisor)}</p><p><strong>Start date:</strong> ${escapeHtml(candidate.start_date)}</p>`)}
        ${detailSection('Attendance summary', `<p>${attendancePresent}/${meetings.length} meetings marked present.</p>`)}
      </div>
      ${detailSection('Phase timeline', `<div class="phase-grid">${phaseList.map((phase) => {
        const progress = candidate.phase_progress.find((item) => item.phase === phase) || { phase, status: 'not_started' };
        return `<a class="phase-tile" href="#/candidates/${candidate.id}/phase/${encodeURIComponent(phase)}"><strong>${escapeHtml(phase)}</strong><span>${escapeHtml(progress.status)}</span></a>`;
      }).join('')}</div>`)}
      ${detailSection('Pending action items', actions.filter((item) => item.status !== 'done').map((item) => `<p class="${isOverdue(item.due_date, item.status) ? 'overdue' : ''}">${escapeHtml(item.text)} | ${escapeHtml(item.due_date)} | ${escapeHtml(item.meeting.title)}</p>`).join('') || '<p class="muted">No pending action items.</p>')}
      ${detailSection('Meeting history', meetings.map((meeting) => recordCard({ title: meeting.title, meta: `${meeting.date} | ${meeting.phase}`, body: meeting.discussion, badges: visibilityBadge(meeting.visibility), href: `#/meetings/${meeting.id}` })).join(''))}
      ${detailSection('Append-only notes', notesPanel(ctx.maskNotes(candidate.notes_append_only)))}
      ${detailSection('Revision history', timelinePanel(candidate.revision_history))}
      ${ctx.canArchive() && candidate.status !== 'archived' ? `<button class="secondary" data-archive-kind="candidate" data-archive-id="${escapeHtml(candidate.id)}">Archive candidate</button>` : ''}
    </section>`;
}

export function candidatePhasePage(ctx, id, encodedPhase) {
  const phase = decodeURIComponent(encodedPhase || '');
  const candidate = ctx.visibleCandidates().find((item) => item.id === id);
  if (!candidate) return emptyState('Phase not found', 'The candidate or phase is unavailable.');
  const meetings = ctx.visibleMeetings().filter((item) => item.candidate_id === id && item.phase === phase);
  const progress = candidate.phase_progress.find((item) => item.phase === phase) || { phase, status: 'not_started' };
  return `${pageHeader(`${candidate.name}: ${phase}`, 'Phase-level view of meetings, actions, notes, and progress.')}
    ${printActionBar(`<a class="card-link" href="#/candidates/${candidate.id}">Back to Supervision</a>`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(progress.status)} ${visibilityBadge(candidate.visibility)}</div>
      ${detailSection('Phase progress', `<p>Status: <strong>${escapeHtml(progress.status)}</strong></p><p>Updated: ${escapeHtml(progress.updated_at || '')}</p>`)}
      ${detailSection('Phase meetings', meetings.map((meeting) => recordCard({ title: meeting.title, meta: `${meeting.date} | ${meeting.attendance_status}`, body: meeting.discussion, badges: visibilityBadge(meeting.visibility), href: `#/meetings/${meeting.id}` })).join('') || '<p class="muted">No meetings for this phase yet.</p>')}
    </section>`;
}
