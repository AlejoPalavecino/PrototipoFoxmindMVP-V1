// Canonical complete ordered migration inventory for the committed 2026-10-30 baseline.
// New migrations must update this list deliberately; filesystem discovery is never the expectation.
export const migrationInventory = Object.freeze([
  '202610150001_initial', '202610150002_invariants', '202610150003_guard_regressions',
  '202610160001_file_custody', '202610160002_custody_proof_guards', '202610160003_draft_plan_promotion',
  '202610170001_p5_classroom_revision', '202610180001_p6_library_lifecycle', '202610180002_p8_pending_question_scores',
  '202610230001_agenda_events', '202610230001_classroom_ai', '202610240001_agenda_event_color',
  '202610250001_activity_topics', '202610250002_activity_ai', '202610280001_agenda_recurrence',
  '202610280001_student_ai', '202610280002_student_ai_references', '202610290001_grading_ai', '202610290002_grading_ai_apply',
]);
