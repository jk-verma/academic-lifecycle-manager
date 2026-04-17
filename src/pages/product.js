import { detailSection, emptyState, pageHeader, recordCard, statusBadge, subtaskTimeline, taskCardBody, visibilityBadge } from '../components/ui.js';
import { shouldCarryForward } from '../utils/academic-year.js';
import { escapeHtml } from '../utils/html.js';

export function myWorkPage(ctx) {
  const carryForward = ctx.allRecords().filter(shouldCarryForward);
  const adminWork = ctx.visibleAcademicLife().filter((item) => item.module === 'admin_work');
  const external = ctx.visibleAcademicLife().filter((item) => item.module === 'external_engagements');
  const planner = ctx.visibleActivities().slice(0, 6);
  return `${pageHeader('Work', 'Daily planner, academic administration, external engagements, and carry-forward work.')}
    <div class="quick-actions">
      ${quickAction('Daily Planner', '#/planner')}
      ${quickAction('Academic Administration', '#/admin-work')}
      ${quickAction('External Engagements', '#/external')}
      ${quickAction('Carry Forward Items', '#/years')}
    </div>
    <div class="grid two">
      ${panel('Daily planner', planner.map((item) => recordCard({ title: item.title, meta: `${item.date} | ${item.priority}`, body: item.short_notes, badges: statusBadge(item.status), href: `#/planner/${item.id}` })).join('') || emptyState('No planner items', 'Add daily work from the planner page.'))}
      ${panel('Academic administration', adminWork.map((item) => workCard(item, `#/admin-work/${item.id}`)).join('') || emptyState('No administration records', 'No academic administration records are visible.'))}
      ${panel('External engagements', external.map((item) => workCard(item, `#/external/${item.id}`)).join('') || emptyState('No external engagements', 'No external engagement records are visible.'))}
      ${panel('Carry-forward items', carryForward.slice(0, 8).map((item) => recordCard({ title: item.name || item.title, meta: `${item.academic_year_current || 'no year'} | ${item.status}`, body: taskCardBody(item, item.topic || item.description_or_abstract || ''), badges: `${statusBadge(item.status || 'active')} ${visibilityBadge(item.visibility || 'open')}`, href: item.route || '#/years' })).join('') || emptyState('No carry-forward items', 'Visible records are completed or closed.'))}
    </div>`;
}

export function setupHomePage(ctx) {
  return `${pageHeader('Setup', 'Start here, workflow templates, data import/export, and deployment notes.')}
    <div class="grid">
      ${recordCard({ title: 'Start Here', meta: 'Onboarding', body: 'Understand modules, academic years, carry-forward, and daily use.', badges: statusBadge('guide'), href: '#/start-here' })}
      ${recordCard({ title: 'Workflow Templates', meta: `${ctx.store.workflowTemplates.templates.length} templates`, body: 'Reusable subtask templates for common academic workflows.', badges: statusBadge('templates'), href: '#/templates' })}
      ${recordCard({ title: 'Data / Import-Export', meta: 'Static JSON', body: 'Export browser edits and import JSON bundles.', badges: statusBadge('json'), href: '#/data' })}
    </div>`;
}

export function startHerePage(ctx) {
  return `${pageHeader('Start Here', 'A quick operating guide for Academic Lifecycle Manager.')}
    <div class="grid two">
      ${detailSection('Daily workflow', '<p>Start from Home, review overdue work, today tasks, upcoming meetings, and carry-forward items. Use quick actions to add tasks, deadlines, candidates, publications, and projects.</p>')}
      ${detailSection('Academic year workflow', '<p>Each major record stores academic year start/current fields. Incomplete records with carry_forward stay visible in future-year views without duplicating history.</p>')}
      ${detailSection('Subtasks', '<p>Use subtasks for the real work inside a record: DAC preparation, journal revision, proposal NOC, course feedback, or job-application steps. Subtasks stay inside the parent record as a vertical timeline.</p>')}
      ${detailSection('Static editing', '<p>Prepare local browser edits, export JSON, commit changes to the repository, and GitHub Pages updates the portal.</p>')}
      ${detailSection('Modules', '<p>Use Teaching for courses, Research for publications and projects, Administration for institutional responsibilities, Students for supervision, Work for daily planning, and Reports for summaries.</p>')}
    </div>`;
}

export function templatesPage(ctx) {
  const templates = ctx.store.workflowTemplates.templates;
  return `${pageHeader('Workflow Templates', 'Ready-made academic subtask patterns for common workflows.')}
    <div class="grid">${templates.map((template) => recordCard({
      title: template.title,
      meta: `${template.category} | ${template.subtasks.length} subtasks`,
      body: template.description,
      badges: statusBadge('template'),
      href: `#/templates/${template.id}`
    })).join('')}</div>`;
}

export function templateDetailPage(ctx, id) {
  const template = ctx.store.workflowTemplates.templates.find((item) => item.id === id);
  if (!template) return emptyState('Template not found', 'This workflow template is unavailable.');
  const synthetic = {
    subtasks: template.subtasks.map((item) => ({
      ...item,
      id: `${template.id}-${item.sequence_order}`,
      parent_record_id: template.id,
      due_date: '',
      due_datetime: '',
      completed_date: '',
      completed_datetime: '',
      status: 'pending',
      responsible_person: 'Assign when used',
      responsible_contact: 'Add mobile or extension when used',
      hierarchy_level: 0,
      parent_subtask_id: '',
      notes: [],
      history: [{ version: 1, summary: 'Template step', updated_by: 'template', updated_at: '' }]
    }))
  };
  return `${pageHeader(template.title, template.description)}
    <section class="detail printable">
      ${detailSection('Template subtasks', subtaskTimeline(synthetic))}
      ${detailSection('JSON starter', `<pre>${escapeHtml(JSON.stringify(synthetic.subtasks, null, 2))}</pre>`)}
      <p class="notice">Use this starter structure when adding subtasks to a parent record JSON file or through local exported edits.</p>
    </section>`;
}

function workCard(item, href) {
  return recordCard({
    title: item.title,
    meta: `${item.category} | ${item.priority || 'medium'}`,
    body: taskCardBody(item, firstNote(item)),
    badges: `${statusBadge(item.status)} ${visibilityBadge(item.visibility)}`,
    href
  });
}

function firstNote(item) {
  return (item.notes || [])[0]?.text || item.responsibility || item.organization || '';
}

function panel(title, body) {
  return `<section class="panel"><h3>${escapeHtml(title)}</h3>${body}</section>`;
}

function quickAction(title, href) {
  return `<a class="quick-action" href="${escapeHtml(href)}">${escapeHtml(title)}</a>`;
}
