import { escapeHtml, slugLabel } from '../utils/html.js';
import { isOverdue } from '../utils/date.js';

export function pageHeader(title, subtitle, meta = '') {
  return `<section class="page-title">
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(subtitle)}</p>
    ${meta ? `<p class="data-updated">${escapeHtml(meta)}</p>` : ''}
  </section>`;
}

export function statusBadge(status) {
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(slugLabel(status))}</span>`;
}

export function visibilityBadge() {
  return '';
}

export function maskedBlock(label = 'Restricted section') {
  return '';
}

export function emptyState(title, body) {
  return `<section class="empty-state"><h3>${escapeHtml(title)}</h3><p>${escapeHtml(body)}</p></section>`;
}

export function printActionBar(extra = '') {
  return `<div class="action-bar"><button class="icon-button" onclick="window.print()">Print</button>${extra}</div>`;
}

export function detailSection(title, body) {
  return `<section class="detail-section"><h4>${escapeHtml(title)}</h4>${body}</section>`;
}

export function recordCard({ title, meta, body, badges = '', href = '', actions = '' }) {
  const open = href ? `<a class="card-link" href="${escapeHtml(href)}">Open</a>` : '';
  return `<article class="card">
    <div class="card-head"><div>${badges}</div>${open}</div>
    <h3>${escapeHtml(title)}</h3>
    ${meta ? `<p class="muted">${escapeHtml(meta)}</p>` : ''}
    ${body ? `<p>${escapeHtml(body)}</p>` : ''}
    ${actions ? `<div class="card-actions">${actions}</div>` : ''}
  </article>`;
}

export function taskProgress(record = {}) {
  const subtasks = record.subtasks || [];
  const completed = subtasks.filter((item) => item.status === 'completed').length;
  const total = subtasks.length;
  return {
    completed,
    total,
    label: `${completed}/${total} subtasks completed`
  };
}

export function nextPendingSubtask(record = {}) {
  return [...(record.subtasks || [])]
    .filter((item) => !['completed', 'cancelled'].includes(String(item.status).toLowerCase()))
    .sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0))[0];
}

export function taskSummary(record = {}) {
  const progress = taskProgress(record);
  const deadline = record.final_deadline_datetime || record.final_deadline || record.application_deadline || record.due_datetime || record.due_date || '';
  const overdue = isOverdue(deadline, record.status);
  return `<div class="task-summary">
    <span class="${overdue ? 'overdue' : ''}"><strong>Final deadline:</strong> ${escapeHtml(formatDateTime(deadline) || 'not set')}</span>
    <span><strong>Progress:</strong> ${escapeHtml(progress.label)}</span>
  </div>`;
}

export function taskCardBody(record = {}, fallback = '') {
  const progress = taskProgress(record);
  const next = nextPendingSubtask(record);
  const deadline = record.final_deadline_datetime || record.final_deadline || record.application_deadline || record.due_datetime || record.due_date || 'not set';
  const overdue = isOverdue(deadline, record.status);
  const nextText = next ? `${next.title} (${formatDateTime(next.due_datetime || next.due_date) || 'no due date'})` : 'No pending subtask';
  return `Deadline: ${formatDateTime(deadline)} | ${progress.label} | Next: ${nextText}${overdue ? ' | Overdue' : ''}${fallback ? ` | ${fallback}` : ''}`;
}

export function subtaskTimeline(record = {}, options = {}) {
  const subtasks = [...(record.subtasks || [])].sort((a, b) => Number(a.sequence_order || 0) - Number(b.sequence_order || 0));
  if (!subtasks.length) return emptyState('No subtasks', 'Subtasks can be added over time without deleting earlier work.');
  return `<div class="subtask-timeline">${subtasks.map((subtask) => {
    const due = subtask.due_datetime || subtask.due_date;
    const completed = subtask.completed_datetime || subtask.completed_date;
    const overdue = isOverdue(due, subtask.status);
    const contact = subtask.responsible_contact || subtask.contact_number || subtask.mobile_extension;
    const notes = (subtask.notes || []).filter((note) => note?.text);
    const hierarchyLevel = Math.max(0, Math.min(2, Number(subtask.hierarchy_level || 0)));
    const hierarchyLabel = hierarchyLevel === 2 ? 'Sub-sub-activity' : hierarchyLevel === 1 ? 'Sub-activity' : 'Activity';
    const dragAttrs = options.kind ? `draggable="true" data-reorder-subtask="true" data-kind="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}" data-subtask-id="${escapeHtml(subtask.id)}"` : '';
    const actions = options.kind ? `<div class="subtask-actions">
          <button class="secondary compact" data-edit-subtask="true" data-kind="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}" data-subtask-id="${escapeHtml(subtask.id)}">Edit</button>
          <button class="secondary compact danger-action" data-delete-subtask="true" data-kind="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}" data-subtask-id="${escapeHtml(subtask.id)}">Delete</button>
        </div>` : '';
    return `<article class="${overdue ? 'overdue-card' : ''} ${options.kind ? 'draggable-subtask' : ''} hierarchy-level-${hierarchyLevel}" ${dragAttrs}>
      <div class="subtask-marker">${escapeHtml(subtask.sequence_order || '')}</div>
      <div class="subtask-body">
        <div class="card-head"><strong>${escapeHtml(subtask.title)}</strong><span>${statusBadge(subtask.status)}${overdue ? statusBadge('overdue') : ''}</span></div>
        <div class="subtask-meta">
          <span>${escapeHtml(hierarchyLabel)}</span>
          <span>${escapeHtml(slugLabel(subtask.subtask_type || 'subtask'))}</span>
          <span>Due: ${escapeHtml(formatDateTime(due) || 'not set')}</span>
          ${completed ? `<span>Completed: ${escapeHtml(formatDateTime(completed))}</span>` : ''}
          <span>Responsible: ${escapeHtml(subtask.responsible_person || 'not assigned')}</span>
          ${contact ? `<span>Mobile / extension: ${escapeHtml(contact)}</span>` : ''}
        </div>
        ${notes.length ? `<div class="subtask-notes">${notes.map((note) => `<p>${escapeHtml(note.text)}</p>`).join('')}</div>` : ''}
        ${actions}
      </div>
    </article>`;
  }).join('')}</div>`;
}

export function subtaskForm(kind, id, module = '') {
  return `<section class="append-panel">
    <h4>Add activity / sub-activity</h4>
    <form class="record-form" data-add-subtask="${escapeHtml(kind)}" data-id="${escapeHtml(id)}" data-module="${escapeHtml(module)}">
      <input name="subtask_id" type="hidden" />
      <input name="title" required placeholder="Activity or sub-activity title" />
      <input name="subtask_type" placeholder="Activity type" />
      <input name="due_datetime" type="datetime-local" required />
      <input name="completed_datetime" type="datetime-local" />
      <input name="responsible_person" placeholder="Responsible person" />
      <input name="responsible_contact" placeholder="Mobile or extension number" />
      <input name="insert_after_order" type="number" min="0" step="1" placeholder="Insert after sequence no." />
      <select name="status"><option>pending</option><option>completed</option><option>deferred</option><option>cancelled</option></select>
      <input name="notes" placeholder="Append-only note" />
      <button>Add local subtask</button>
    </form>
  </section>`;
}

export function formatDateTime(value = '') {
  if (!value) return '';
  return String(value).replace('T', ' T ');
}

export function notesPanel(notes = []) {
  if (!notes.length) return emptyState('No notes', 'No append-only notes are present for this record.');
  return `<div class="notes">${notes.map((note) => {
    const cls = note.masked ? ' class="masked"' : '';
    return `<p${cls}><span>${escapeHtml(note.created_at || '')}</span>${escapeHtml(note.text)}</p>`;
  }).join('')}</div>`;
}

export function timelinePanel(items = []) {
  if (!items.length) return emptyState('No timeline entries', 'No revision or phase entries are available.');
  return `<div class="timeline">${items.map((item) => `
    <article>
      <span>${escapeHtml(item.updated_at || item.created_at || item.date || '')}</span>
      <strong>${escapeHtml(item.summary || item.phase || item.title || 'Timeline entry')}</strong>
      <p>${escapeHtml(item.status || item.updated_by || '')}</p>
    </article>`).join('')}</div>`;
}

export function filterBar(filters, options = {}) {
  return `<div class="filters">
    <input id="filter-q" value="${escapeHtml(filters.q || '')}" placeholder="Search text" />
    <select id="filter-programme"><option value="">Any programme</option>${(options.programmes || []).map((item) => `<option value="${escapeHtml(item)}" ${filters.programme === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
    <select id="filter-candidate"><option value="">Any candidate</option>${(options.candidates || []).map((item) => `<option value="${escapeHtml(item.id)}" ${filters.candidate === item.id ? 'selected' : ''}>${escapeHtml(item.name)}</option>`).join('')}</select>
    <select id="filter-phase"><option value="">Any phase</option>${(options.phases || []).map((item) => `<option value="${escapeHtml(item)}" ${filters.phase === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
    <select id="filter-module" ${options.moduleLocked ? 'disabled' : ''}><option value="">Any module</option>${(options.modules || []).map((item) => `<option value="${escapeHtml(item)}" ${(filters.module || options.moduleLocked) === item ? 'selected' : ''}>${escapeHtml(slugLabel(item))}</option>`).join('')}</select>
    <input id="filter-status" value="${escapeHtml(filters.status || '')}" placeholder="Status" />
    <select id="filter-priority"><option value="">Any priority</option>${(options.priorities || []).map((item) => `<option value="${escapeHtml(item)}" ${filters.priority === item ? 'selected' : ''}>${escapeHtml(slugLabel(item))}</option>`).join('')}</select>
    <select id="filter-overdue"><option value="">Any deadline state</option><option value="yes" ${filters.overdue === 'yes' ? 'selected' : ''}>Overdue only</option><option value="no" ${filters.overdue === 'no' ? 'selected' : ''}>Not overdue</option></select>
    <input id="filter-institution" value="${escapeHtml(filters.institution || '')}" placeholder="Institution or agency" />
    <select id="filter-academicYear"><option value="">Any academic year</option>${(options.academicYears || []).map((item) => `<option value="${escapeHtml(item)}" ${filters.academicYear === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
    <input id="filter-from" type="date" value="${escapeHtml(filters.from || '')}" />
    <input id="filter-to" type="date" value="${escapeHtml(filters.to || '')}" />
  </div>`;
}
