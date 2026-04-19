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

export function recordCard({ title, meta, metaHtml = '', body, bodyHtml = '', badges = '', href = '', actions = '', inlineEditor = '', className = '' }) {
  const open = href ? `<a class="card-link" href="${escapeHtml(href)}">Open</a>` : '';
  const actionRow = [open, actions].filter(Boolean).join('');
  return `<article class="card ${escapeHtml(className)}">
    <div class="card-head"><div>${badges}</div></div>
    <h3>${escapeHtml(title)}</h3>
    ${metaHtml || (meta ? `<p class="muted">${escapeHtml(meta)}</p>` : '')}
    ${bodyHtml || (body ? `<p>${escapeHtml(body)}</p>` : '')}
    ${actionRow ? `<div class="card-actions">${actionRow}</div>` : ''}
    ${inlineEditor || ''}
  </article>`;
}

export function taskProgress(record = {}) {
  const subtasks = record.subtasks || [];
  const completed = subtasks.filter((item) => ['completed', 'finished'].includes(String(item.status || '').toLowerCase())).length;
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
    const displayStatus = explicitActivityStatus(subtask.status);
    const overdue = displayStatus === 'overdue';
    const contact = subtask.responsible_contact || subtask.contact_number || subtask.mobile_extension;
    const email = subtask.responsible_email || subtask.email;
    const notes = (subtask.notes || []).filter((note) => note?.text);
    const remark = notes.map((note) => note.text).join('\n');
    const hierarchyLevel = Math.max(0, Math.min(2, Number(subtask.hierarchy_level || 0)));
    const isNote = subtask.subtask_type === 'note';
    const dragAttrs = options.kind ? `draggable="true" data-reorder-subtask="true" data-kind="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}" data-subtask-id="${escapeHtml(subtask.id)}"` : '';
    const actions = options.kind ? `<div class="subtask-actions">
          <button class="secondary compact" data-edit-subtask="true" data-kind="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}" data-subtask-id="${escapeHtml(subtask.id)}">Edit</button>
          <button class="secondary compact danger-action" data-delete-subtask="true" data-kind="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}" data-subtask-id="${escapeHtml(subtask.id)}">Delete</button>
        </div>` : '';
    const inlineEditor = options.kind ? `<form class="record-form inline-subtask-editor" data-inline-subtask-editor hidden data-add-subtask="${escapeHtml(options.kind)}" data-id="${escapeHtml(options.id || record.id || '')}" data-module="${escapeHtml(options.module || record.module || '')}">
          <input name="subtask_id" type="hidden" value="${escapeHtml(subtask.id)}" />
          <input name="subtask_type" type="hidden" value="${escapeHtml(subtask.subtask_type || 'activity')}" />
          <input name="parent_subtask_id" type="hidden" value="${escapeHtml(subtask.parent_subtask_id || '')}" />
          <input name="hierarchy_level" type="hidden" value="${escapeHtml(String(subtask.hierarchy_level || 0))}" />
          <input name="sequence_order" type="number" min="1" step="1" placeholder="Sequence Number" value="${escapeHtml(String(subtask.sequence_order || ''))}" />
          <input name="title" required placeholder="Activity Name" value="${escapeHtml(subtask.title || '')}" />
          ${isNote ? '' : `<input name="due_datetime" type="date" value="${escapeHtml(dateOnly(due))}" />
          ${subtaskStatusSelect(subtask.status)}
          <input name="responsible_person" placeholder="Responsible" value="${escapeHtml(subtask.responsible_person || '')}" />
          <input name="responsible_contact" placeholder="Responsible Contact" value="${escapeHtml(contact || '')}" />
          <input name="responsible_email" type="email" placeholder="Responsible Email" value="${escapeHtml(email || '')}" />`}
          <textarea name="notes" placeholder="Topic / Notes / Remark">${escapeHtml(remark)}</textarea>
          <button>${isNote ? 'Update Notes' : 'Update Activity'}</button>
        </form>` : '';
    const displayOrder = subtask.display_order || subtask.sequence_order || '';
    return `<article class="${overdue ? 'overdue-card' : ''} ${options.kind ? 'draggable-subtask' : ''} hierarchy-level-${hierarchyLevel}" ${dragAttrs}>
      <div class="subtask-marker">${escapeHtml(displayOrder)}</div>
      <div class="subtask-body">
        <div class="card-head"><strong>${escapeHtml(subtask.title)}</strong><span>${isNote ? statusBadge('note') : statusBadge(displayStatus)}</span></div>
        ${isNote ? '' : `<div class="subtask-meta">
          <span class="meta-badge due-date-badge"><strong>Due Date:</strong> ${escapeHtml(formatDateTime(due) || 'not set')}</span>
          ${completed ? `<span class="meta-badge"><strong>Completed:</strong> ${escapeHtml(formatDateTime(completed))}</span>` : ''}
          <span class="meta-badge responsible-badge"><strong>Responsible:</strong> ${escapeHtml(subtask.responsible_person || 'not assigned')}</span>
          ${contact ? `<span class="meta-badge"><strong>Mobile / Extension:</strong> ${escapeHtml(contact)}</span>` : ''}
          ${email ? `<span class="meta-badge"><strong>Email:</strong> ${escapeHtml(email)}</span>` : ''}
        </div>`}
        ${notes.length ? `<div class="subtask-notes">${notes.map((note) => `<p>${escapeHtml(note.text)}</p>`).join('')}</div>` : ''}
        ${actions}
        ${inlineEditor}
      </div>
    </article>`;
  }).join('')}</div>`;
}

function dateOnly(value = '') {
  return value ? String(value).slice(0, 10) : '';
}

function explicitActivityStatus(status = '') {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'overdue') return 'overdue';
  if (['completed', 'finished'].includes(normalized)) return 'finished';
  return 'pending';
}

function activityDateStatus(subtask = {}, record = {}) {
  return explicitActivityStatus(subtask.status);
}

function subtaskStatusSelect(selected = 'pending') {
  const normalized = String(selected || 'pending').toLowerCase();
  const active = normalized === 'completed' ? 'finished' : normalized;
  return `<select name="status">
    <option value="pending" ${active === 'pending' ? 'selected' : ''}>Pending</option>
    <option value="overdue" ${active === 'overdue' ? 'selected' : ''}>Overdue</option>
    <option value="finished" ${active === 'finished' ? 'selected' : ''}>Finished</option>
  </select>`;
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
      <input name="responsible_person" placeholder="Responsible Person" />
      <input name="responsible_contact" placeholder="Mobile / Extension" />
      <input name="insert_after_order" type="number" min="0" step="1" placeholder="Insert after sequence no." />
      <input name="parent_subtask_id" placeholder="Parent activity id for sub-activity" />
      <select name="hierarchy_level"><option value="0">Activity</option><option value="1">Sub-activity</option><option value="2">Sub-sub-activity</option></select>
      ${subtaskStatusSelect('pending')}
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
