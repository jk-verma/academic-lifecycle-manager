import { detailSection, emptyState, notesPanel, pageHeader, recordCard, statusBadge, timelinePanel, visibilityBadge } from '../components/ui.js';
import { administrationGroups, optionList, teachingGroups } from '../data/structure.js';
import { escapeHtml } from '../utils/html.js';
import { structuredFilter } from '../utils/search.js';

export function activitiesPage(ctx) {
  const activities = structuredFilter(ctx.visibleActivities(), { ...ctx.filters, module: '' });
  return `${pageHeader('Daily Planner', 'Daily teaching, research, and academic administration activity logs.')}
    ${ctx.renderFilters()}
    ${ctx.canWrite() ? ctx.dataTools('activities', 'public/data/daily-activities/daily-activities.json') : ''}
    ${ctx.canWrite() ? activityForm(ctx) : '<p class="notice">Daily activity writing is currently unavailable in this view.</p>'}
    <div class="grid">${activities.map((activity) => recordCard({
      title: activity.title,
      meta: `${activity.date} | ${activity.category} | ${activity.priority}`,
      body: activity.short_notes,
      badges: `${statusBadge(activity.status)} ${visibilityBadge(activity.visibility)}`,
      href: `#/activities/${activity.id}`,
      actions: ctx.cardActions('activity', activity.id)
    })).join('') || emptyState('No activities', 'No daily activity records match the current filters.')}</div>`;
}

export function activityDetailPage(ctx, id) {
  const activity = ctx.visibleActivities().find((item) => item.id === id);
  if (!activity) return emptyState('Activity not found', 'This daily activity is unavailable for the selected role.');
  return `${pageHeader(activity.title, `${activity.date} | ${activity.category}`)}
    <section class="detail printable">
      <div class="metadata">${statusBadge(activity.status)} ${visibilityBadge(activity.visibility)} ${statusBadge(activity.priority)}</div>
      ${detailSection('Activity details', `<p><strong>Subtype:</strong> ${escapeHtml(activity.sub_type)}</p><p><strong>Linked record:</strong> ${escapeHtml(activity.linked_record_id)}</p><p><strong>Next action:</strong> ${escapeHtml(activity.next_action_date)}</p><p>${escapeHtml(activity.short_notes)}</p>`)}
      ${detailSection('Academic year', `<p>Start: ${escapeHtml(activity.academic_year_start)} | Current: ${escapeHtml(activity.academic_year_current)}</p>`)}
      ${detailSection('History', timelinePanel(activity.history))}
    </section>`;
}

function activityForm(ctx) {
  return `<section class="panel">
    <h3>Add Task</h3>
    <form class="record-form" id="activity-form">
      <input name="title" required placeholder="Activity title" />
      <input name="date" type="date" required />
      <select name="category"><option>teaching</option><option>research</option><option>projects</option><option>supervision</option><option>academic_administration</option><option>miscellaneous</option></select>
      <select name="sub_type">${academicActivityOptions()}</select>
      <input name="linked_record_id" placeholder="Linked record ID" />
      <input name="short_notes" placeholder="Short notes" />
      <select name="priority"><option>low</option><option>medium</option><option>high</option></select>
      <button>Add Task</button>
    </form>
  </section>`;
}

function academicActivityOptions() {
  return [
    ...optionList(teachingGroups).map(([value, label]) => [`teaching_${value}`, `Teaching: ${label}`]),
    ...optionList(administrationGroups).map(([value, label]) => [`administration_${value}`, `Administration: ${label}`]),
    ['administration_nss_ncc', 'Academic administration: NSS / NCC'],
    ['administration_workshop', 'Academic administration: workshop organization'],
    ['administration_counselling', 'Academic administration: counselling'],
    ['administration_sports_study_tour_exhibition_competition', 'Academic administration: sports / study tour / exhibition / competition'],
    ['administration_cultural_department', 'Academic administration: departmental cultural activity'],
    ['administration_cultural_institutional', 'Academic administration: institutional cultural activity'],
    ['administration_port_visit', 'Academic administration: port / industrial / field visit'],
    ['administration_ngo_community', 'Academic administration: NGO / community work'],
    ['administration_chairperson_head', 'Academic administration: chairperson / head responsibility'],
    ['administration_programme_director_fulltime', 'Academic administration: programme director full-time'],
    ['administration_programme_director_certificate_phd', 'Academic administration: programme director certificate / PhD'],
    ['administration_board_committee', 'Academic administration: board / committee work'],
    ['professional_seminar_workshop_symposia', 'Professional development: seminar / workshop / symposia'],
    ['professional_conference', 'Professional development: conference'],
    ['professional_fdp', 'Professional development: faculty development course'],
    ['professional_sttc', 'Professional development: short-term training course'],
    ['professional_association_membership_national', 'Professional development: national association membership'],
    ['professional_association_membership_state', 'Professional development: state association membership'],
    ['professional_general_article', 'Professional development: general article publication'],
    ['professional_awareness_activity', 'Professional development: general awareness activity'],
    ['professional_editorial', 'Professional development: editorial work'],
    ['professional_committee_member', 'Professional development: committee member'],
    ['professional_committee_chair', 'Professional development: committee chair'],
    ['research_journal_abdc_a', 'Research: journal paper ABDC A / A*'],
    ['research_journal_abdc_b', 'Research: journal paper ABDC B'],
    ['research_journal_abdc_c_scopus_ugc', 'Research: journal paper ABDC C / Scopus / UGC'],
    ['research_journal_other_impact', 'Research: other journal / impact factor less than 1'],
    ['research_refereed_journal', 'Research: refereed journal paper'],
    ['research_non_refereed_journal', 'Research: reputed non-refereed journal paper'],
    ['research_book_international', 'Research: international text/reference book'],
    ['research_book_national', 'Research: national/state subject book'],
    ['research_book_local', 'Research: local subject book'],
    ['research_book_chapter_international', 'Research: international book chapter'],
    ['research_book_chapter_national', 'Research: national book chapter'],
    ['research_sponsored_major', 'Research: major sponsored project'],
    ['research_sponsored_minor', 'Research: minor sponsored project'],
    ['research_consultancy_project', 'Research: consultancy project'],
    ['research_patent_technology_product', 'Research: patent / technology transfer / product / process'],
    ['research_policy_document', 'Research: policy document'],
    ['research_guidance_mphil', 'Research guidance: MPhil'],
    ['research_guidance_phd_awarded', 'Research guidance: PhD awarded'],
    ['research_guidance_phd_submitted', 'Research guidance: PhD thesis submitted'],
    ['research_guidance_mba_executive', 'Research guidance: MBA / executive MBA / part-time / weekend'],
    ['research_award_fellowship_international', 'Research: international award / fellowship'],
    ['research_award_fellowship_national', 'Research: national award / fellowship'],
    ['research_award_fellowship_state', 'Research: state / university award / fellowship'],
    ['research_conference_paper_international', 'Research: paper presented international'],
    ['research_conference_paper_national', 'Research: paper presented national'],
    ['research_conference_paper_regional', 'Research: paper presented regional / state'],
    ['research_invited_lecture_international', 'Research: invited lecture international'],
    ['research_invited_lecture_national', 'Research: invited lecture national'],
    ['research_invited_lecture_regional', 'Research: invited lecture regional / local']
  ].map(([value, label]) => `<option value="${escapeHtml(value)}">${escapeHtml(label)}</option>`).join('');
}
