import { detailSection, pageHeader, recordCard, visibilityBadge } from '../components/ui.js';
import { escapeHtml } from '../utils/html.js';

export function settingsPage(ctx) {
  const roles = Object.entries(ctx.store.permissions.roles);
  return `${pageHeader('Settings / Role Preview', 'Logical static roles, visibility levels, and masking behavior.')}
    <div class="grid">${roles.map(([role, rules]) => recordCard({
      title: role,
      meta: rules.can_edit_local ? 'Writing tools enabled' : 'Read-only',
      body: `Visible levels: ${rules.visible_levels.join(', ')}`,
      badges: rules.can_archive ? visibilityBadge('archive_enabled') : visibilityBadge('no_archive')
    })).join('')}</div>
    ${detailSection('Visibility levels', ctx.store.permissions.visibility_levels.map((item) => `${visibilityBadge(item)} `).join(''))}
    ${detailSection('Masking text', `<p>${escapeHtml(ctx.store.permissions.masked_text)}</p>`)}
    ${detailSection('Admin and assistant model', '<p>Dr. Jitendra Kumar Verma is the primary ADMIN. ASSISTANT may create entries, update permitted records, add daily logs, deadlines, meeting details, attendees, follow-up notes, and action items. ASSISTANT cannot archive, delete, erase history, or modify protected role settings.</p>')}
    ${detailSection('Static hosting reminder', '<p>These are logical preview roles, not secure authentication. Keep private data in private repositories or add a real backend later.</p>')}`;
}
