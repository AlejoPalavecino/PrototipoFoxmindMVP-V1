import test from 'node:test';
import assert from 'node:assert/strict';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';

// B6: a foreign key counts as indexed when a non-partial index starts with its first column.
// These columns are read by file-reference checks and grading lookups, or scanned when the parent row is deleted.
const indexed = [
  'activity_instruction_files(file_id,classroom_id)', 'answer_selections(option_id,question_id)', 'answers(question_id,activity_id)',
  'grading_ai_jobs(attempt_id,activity_id)', 'materials(file_id,classroom_id)', 'question_grades(question_id,activity_id)',
  'study_plan_versions(file_id,classroom_id)', 'study_review_sessions(agenda_event_id)',
];
// Reviewed 2026-11-26 against the runtime SQL: no query filters by these columns and their parents are never
// hard-deleted (users, classrooms, activities, attempts, posts, Foxy rows and folders use logical deletion or none).
// A new foreign key without an index must be added here on purpose, with the same reasoning.
const unindexed = [
  'activities(topic_id,unit_id,classroom_id)', 'activity_ai_generations(classroom_id)', 'activity_ai_requests(generation_id)',
  'attempt_attachments(activity_id,classroom_id)', 'attempt_grades(graded_by_id)', 'attempts(enabled_by_id)', 'chat_attachments(folder_id)',
  'classroom_ai_requests(extraction_id)', 'classroom_curriculum_extractions(file_id)', 'classroom_drafts(published_classroom_id)',
  'files(uploaded_by_id)', 'foxy_chat_attachment_links(attachment_id,owner_id)', 'foxy_conversation_requests(conversation_id,owner_id)',
  'foxy_conversations(classroom_id)', 'foxy_private_asset_commands(asset_id,owner_id)',
  'foxy_publication_command_requests(publication_id,owner_id)', 'foxy_publication_confirm_requests(material_id)',
  'foxy_publications(classroom_id)', 'foxy_publications(resource_id,owner_id)', 'foxy_publications(source_asset_id,owner_id)',
  'foxy_resource_requests(resource_id,owner_id)', 'foxy_visual_assets(conversation_id,owner_id)', 'grade_corrections(actor_id)',
  'grading_ai_jobs(activity_id,classroom_id)', 'grading_ai_jobs(classroom_id)', 'grading_ai_jobs(owner_id)',
  'invitations(accepted_by_id)', 'invitations(classroom_id)', 'invitations(declined_by_id)', 'invitations(invited_by_id)',
  'materials(created_by_id)', 'materials(topic_id,unit_id,classroom_id)', 'materials(unit_id,classroom_id)',
  'membership_periods(ended_by_id)', 'membership_periods(invitation_id,classroom_id)',
  'notifications(activity_id,classroom_id)', 'notifications(attempt_grade_id,activity_id)', 'notifications(attempt_id,activity_id)',
  'notifications(classroom_id)', 'notifications(post_id,classroom_id)', 'notifications(reply_id,classroom_id)',
  'student_activities(authorized_by_id)', 'student_activities(effective_grade_id,id,effective_grade_published)',
  'student_ai_reports(classroom_id)', 'student_ai_reports(owner_id)', 'study_folder_uploads(folder_id)', 'study_image_assets(folder_id)',
  'study_plan_versions(uploaded_by_id)', 'study_review_sessions(folder_id)', 'teacher_writing_reports(classroom_id)',
  'teacher_writing_reports(enrollment_id)', 'teacher_writing_reports(membership_period_id)',
  'wall_posts(author_id)', 'wall_posts(removed_by_id)', 'wall_replies(author_id)', 'wall_replies(removed_by_id)',
];

test('PostgreSQL: foreign keys used by queries or parent deletes are indexed; the rest are an explicit list (B6)', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { rows } = await pool.query(`SELECT format('%s(%s)', c.conrelid::regclass::text,
        string_agg(a.attname::text, ',' ORDER BY k.ord)) AS fk
      FROM pg_constraint c CROSS JOIN LATERAL unnest(c.conkey) WITH ORDINALITY k(attnum, ord)
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=k.attnum
      WHERE c.contype='f' AND c.connamespace='public'::regnamespace AND NOT EXISTS (SELECT 1 FROM pg_index i
        WHERE i.indrelid=c.conrelid AND i.indkey[0]=c.conkey[1] AND i.indpred IS NULL)
      GROUP BY c.oid, c.conrelid ORDER BY 1`);
    const missing = rows.map(row => row.fk);
    assert.deepEqual(indexed.filter(fk => missing.includes(fk)), [], 'foreign keys that still need an index');
    assert.deepEqual(missing, [...unindexed].sort(), 'unindexed foreign keys must match the reviewed list');
  });
});
