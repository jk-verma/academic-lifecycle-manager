import { escapeHtml, slugLabel } from '../utils/html.js';
import { MASK } from '../utils/visibility.js';

export function pageHeader(title, subtitle, meta = '') {
  return `<section class="page-title">
    <p class="eyebrow">Academic Lifecycle Manager (ALM)</p>
    <h2>${escapeHtml(title)}</h2>
    <p>${escapeHtml(subtitle)}</p>
    ${meta ? `<p class="data-updated">${escapeHtml(meta)}</p>` : ''}
  </section>`;
}

export function statusBadge(status) {
  return `<span class="badge status-${escapeHtml(status)}">${escapeHtml(slugLabel(status))}</span>`;
}

export function visibilityBadge(visibility) {
  return `<span class="badge visibility">${escapeHtml(slugLabel(visibility))}</span>`;
}

export function maskedBlock(label = 'Restricted section') {
  return `<div class="masked-block"><strong>${escapeHtml(label)}</strong><p>${MASK}</p></div>`;
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

export function recordCard({ title, meta, body, badges = '', href = '' }) {
  const open = href ? `<a class="card-link" href="${escapeHtml(href)}">Open</a>` : '';
  return `<article class="card">
    <div class="card-head"><div>${badges}</div>${open}</div>
    <h3>${escapeHtml(title)}</h3>
    ${meta ? `<p class="muted">${escapeHtml(meta)}</p>` : ''}
    ${body ? `<p>${escapeHtml(body)}</p>` : ''}
  </article>`;
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
    <select id="filter-visibility"><option value="">Any visibility</option>${(options.visibilities || []).map((item) => `<option value="${escapeHtml(item)}" ${filters.visibility === item ? 'selected' : ''}>${escapeHtml(slugLabel(item))}</option>`).join('')}</select>
    <select id="filter-academicYear"><option value="">Any academic year</option>${(options.academicYears || []).map((item) => `<option value="${escapeHtml(item)}" ${filters.academicYear === item ? 'selected' : ''}>${escapeHtml(item)}</option>`).join('')}</select>
    <input id="filter-from" type="date" value="${escapeHtml(filters.from || '')}" />
    <input id="filter-to" type="date" value="${escapeHtml(filters.to || '')}" />
  </div>`;
}
