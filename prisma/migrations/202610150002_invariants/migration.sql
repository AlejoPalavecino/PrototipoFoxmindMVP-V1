-- PostgreSQL invariants that cannot be represented completely in Prisma Schema Language.
-- Application permissions and multi-record business transitions are intentionally not implemented here.
BEGIN;

ALTER TABLE users
  ADD CONSTRAINT users_first_name_check CHECK (char_length(btrim(first_name)) BETWEEN 1 AND 80),
  ADD CONSTRAINT users_last_name_check CHECK (char_length(btrim(last_name)) BETWEEN 1 AND 80),
  ADD CONSTRAINT users_email_check CHECK (btrim(email) <> '' AND btrim(email_normalized) <> ''),
  ADD CONSTRAINT users_password_hash_check CHECK (btrim(password_hash) <> '');
ALTER TABLE sessions ADD CONSTRAINT sessions_expiry_check CHECK (expires_at > created_at);
ALTER TABLE account_tokens
  ADD CONSTRAINT account_tokens_expiry_check CHECK (expires_at > created_at),
  ADD CONSTRAINT account_tokens_terminal_check CHECK (consumed_at IS NULL OR invalidated_at IS NULL);
ALTER TABLE account_action_controls ADD CONSTRAINT account_action_count_check CHECK (request_count >= 0);
ALTER TABLE classroom_drafts
  ADD CONSTRAINT classroom_draft_payload_check CHECK (jsonb_typeof(payload) = 'object'),
  ADD CONSTRAINT classroom_draft_revision_check CHECK (revision >= 0);
ALTER TABLE classrooms
  ADD CONSTRAINT classroom_name_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  ADD CONSTRAINT classroom_subject_check CHECK (char_length(btrim(subject)) BETWEEN 1 AND 120),
  ADD CONSTRAINT classroom_division_check CHECK (char_length(btrim(division)) BETWEEN 1 AND 60),
  ADD CONSTRAINT classroom_quota_check CHECK (storage_quota_bytes >= 0),
  ADD CONSTRAINT classroom_identity_check CHECK (academic_year > 0 AND btrim(timezone) <> '' AND btrim(cover_key) <> '');
CREATE UNIQUE INDEX classroom_codes_one_live ON classroom_codes (classroom_id) WHERE revoked_at IS NULL;
CREATE UNIQUE INDEX invitations_one_pending ON invitations (classroom_id, recipient_email_normalized)
  WHERE accepted_at IS NULL AND revoked_at IS NULL;
ALTER TABLE invitations
  ADD CONSTRAINT invitation_lifecycle_check CHECK (
    expires_at > issued_at AND generation > 0
    AND (accepted_at IS NULL) = (accepted_by_id IS NULL)
    AND NOT (accepted_at IS NOT NULL AND revoked_at IS NOT NULL)
    AND btrim(recipient_email_normalized) <> ''
  );
CREATE UNIQUE INDEX membership_periods_one_open ON membership_periods (enrollment_id) WHERE ended_at IS NULL;
ALTER TABLE membership_periods
  ADD CONSTRAINT membership_end_check CHECK (
    (ended_at IS NULL AND end_reason IS NULL AND ended_by_id IS NULL)
    OR (ended_at IS NOT NULL AND end_reason IS NOT NULL AND ended_by_id IS NOT NULL AND ended_at >= joined_at)
  ),
  ADD CONSTRAINT membership_entry_check CHECK ((entry_method = 'INVITATION') = (invitation_id IS NOT NULL));
ALTER TABLE units ADD CONSTRAINT unit_fields_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120 AND position >= 0);
ALTER TABLE topics ADD CONSTRAINT topic_fields_check CHECK (char_length(btrim(name)) BETWEEN 1 AND 120 AND position >= 0);
CREATE UNIQUE INDEX topics_one_next ON topics (classroom_id) WHERE status = 'NEXT';
ALTER TABLE study_plan_versions ADD CONSTRAINT plan_version_positive CHECK (version_number > 0);
ALTER TABLE materials
  ADD CONSTRAINT material_title_check CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  ADD CONSTRAINT material_topic_requires_unit CHECK (topic_id IS NULL OR unit_id IS NOT NULL);
ALTER TABLE files
  ADD CONSTRAINT file_owner_check CHECK (num_nonnulls(classroom_id, classroom_draft_id) = 1),
  ADD CONSTRAINT file_fields_check CHECK (size_bytes >= 0 AND btrim(storage_key) <> '' AND btrim(original_name) <> ''),
  ADD CONSTRAINT file_extension_check CHECK (extension IN ('pdf', 'docx', 'pptx', 'xlsx', 'jpg', 'jpeg', 'png', 'zip')),
  ADD CONSTRAINT file_validated_check CHECK (validation_status <> 'APPROVED' OR validated_at IS NOT NULL),
  ADD CONSTRAINT file_scanned_check CHECK (scan_status <> 'CLEAN' OR scanned_at IS NOT NULL);
ALTER TABLE uploads
  ADD CONSTRAINT upload_reserved_check CHECK (reserved_bytes >= 0),
  ADD CONSTRAINT upload_complete_check CHECK (status <> 'COMPLETED' OR completed_at IS NOT NULL);
ALTER TABLE activities
  ADD CONSTRAINT activity_title_check CHECK (title IS NULL OR char_length(btrim(title)) BETWEEN 1 AND 200),
  ADD CONSTRAINT activity_instructions_check CHECK (instructions_text IS NULL OR char_length(instructions_text) <= 5000),
  ADD CONSTRAINT activity_topic_requires_unit CHECK (topic_id IS NULL OR unit_id IS NOT NULL),
  ADD CONSTRAINT activity_publication_check CHECK (
    status <> 'PUBLISHED' OR (title IS NOT NULL AND unit_id IS NOT NULL AND topic_id IS NOT NULL AND published_at IS NOT NULL)
  ),
  ADD CONSTRAINT activity_participation_check CHECK (first_started_at IS NULL OR published_at IS NOT NULL);
ALTER TABLE questions
  ADD CONSTRAINT question_points_check CHECK (
    available_points > 0 AND available_points NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    AND available_points = round(available_points, 2)
  ),
  ADD CONSTRAINT question_fields_check CHECK (position >= 0 AND btrim(prompt) <> ''),
  ADD CONSTRAINT question_scoring_check CHECK (
    (type = 'DEVELOPMENT' AND scoring_rule IS NULL)
    OR (type = 'SINGLE_CHOICE' AND scoring_rule IS NOT NULL AND scoring_rule = 'EXACT')
    OR (type = 'MULTIPLE_CHOICE' AND scoring_rule IS NOT NULL)
  );
ALTER TABLE question_options ADD CONSTRAINT option_fields_check CHECK (position >= 0 AND btrim(text) <> '');
ALTER TABLE student_activities ADD CONSTRAINT effective_grade_marker_check CHECK (effective_grade_published = true);
CREATE UNIQUE INDEX attempts_one_draft ON attempts (student_activity_id) WHERE status = 'DRAFT';
ALTER TABLE attempts
  ADD CONSTRAINT attempt_counters_check CHECK (attempt_number > 0 AND editor_epoch >= 0 AND revision >= 0),
  ADD CONSTRAINT attempt_submission_check CHECK (
    (status = 'DRAFT' AND submitted_at IS NULL AND submitted_late IS NULL AND applied_deadline_at IS NULL)
    OR (status = 'SUBMITTED' AND submitted_at IS NOT NULL AND submitted_late IS NOT NULL
      AND submitted_at >= opened_at
      AND ((applied_deadline_at IS NULL AND submitted_late = false)
        OR (applied_deadline_at IS NOT NULL AND submitted_late = (submitted_at >= applied_deadline_at))))
  );
ALTER TABLE answers ADD CONSTRAINT answer_text_check CHECK (development_text IS NULL OR char_length(development_text) <= 20000);
ALTER TABLE attempt_attachments ADD CONSTRAINT attachment_position_check CHECK (position >= 0);
-- Unbounded NUMERIC is deliberate: NUMERIC(4,2) would silently round an input such as 8.345 before CHECK evaluation.
ALTER TABLE attempt_grades
  ADD CONSTRAINT final_grade_check CHECK (final_grade IS NULL OR (final_grade BETWEEN 0 AND 10 AND final_grade = round(final_grade, 2))),
  ADD CONSTRAINT final_feedback_check CHECK (overall_feedback IS NULL OR char_length(overall_feedback) <= 5000),
  ADD CONSTRAINT grade_publication_check CHECK (is_published = (published_at IS NOT NULL) AND (NOT is_published OR final_grade IS NOT NULL));
ALTER TABLE question_grades
  ADD CONSTRAINT rational_score_check CHECK (
    earned_numerator >= 0 AND earned_numerator = trunc(earned_numerator)
    AND earned_numerator NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
    AND earned_denominator > 0 AND earned_denominator = trunc(earned_denominator)
    AND earned_denominator NOT IN ('NaN'::numeric, 'Infinity'::numeric, '-Infinity'::numeric)
  ),
  ADD CONSTRAINT question_feedback_check CHECK (feedback IS NULL OR char_length(feedback) <= 5000);
ALTER TABLE grade_corrections
  ADD CONSTRAINT correction_marker_check CHECK (published_marker = true),
  ADD CONSTRAINT correction_reason_check CHECK (char_length(btrim(reason)) BETWEEN 1 AND 5000),
  ADD CONSTRAINT correction_grades_check CHECK (
    previous_grade BETWEEN 0 AND 10 AND previous_grade = round(previous_grade, 2)
    AND new_grade BETWEEN 0 AND 10 AND new_grade = round(new_grade, 2)
  );
ALTER TABLE wall_posts
  ADD CONSTRAINT post_body_check CHECK (
    (removed_at IS NULL AND body IS NOT NULL AND char_length(btrim(body)) BETWEEN 1 AND 5000 AND removed_by_id IS NULL)
    OR (removed_at IS NOT NULL AND removed_by_id IS NOT NULL AND (body IS NULL OR char_length(body) <= 5000))
  );
ALTER TABLE wall_replies
  ADD CONSTRAINT reply_body_check CHECK (
    (removed_at IS NULL AND body IS NOT NULL AND char_length(btrim(body)) BETWEEN 1 AND 5000 AND removed_by_id IS NULL)
    OR (removed_at IS NOT NULL AND removed_by_id IS NOT NULL AND (body IS NULL OR char_length(body) <= 5000))
  );
ALTER TABLE notifications
  ADD CONSTRAINT notification_event_check CHECK (btrim(event_type) <> ''),
  ADD CONSTRAINT notification_parent_check CHECK ((attempt_id IS NULL AND attempt_grade_id IS NULL) OR activity_id IS NOT NULL);
ALTER TABLE background_jobs
  ADD CONSTRAINT job_payload_check CHECK (jsonb_typeof(payload) = 'object'),
  ADD CONSTRAINT job_count_check CHECK (attempt_count >= 0),
  ADD CONSTRAINT job_claim_check CHECK (
    (status = 'RUNNING' AND claimed_until IS NOT NULL AND claim_token IS NOT NULL)
    OR (status <> 'RUNNING' AND claimed_until IS NULL AND claim_token IS NULL)
  ),
  ADD CONSTRAINT job_completed_check CHECK ((status = 'COMPLETED') = (completed_at IS NOT NULL));

-- A teacher cannot also be enrolled as a student in their own classroom.
CREATE FUNCTION prevent_teacher_enrollment() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM classrooms WHERE id = NEW.classroom_id AND teacher_id = NEW.student_id) THEN
    RAISE EXCEPTION 'Classroom teacher cannot enroll as a student' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER enrollment_teacher_guard BEFORE INSERT OR UPDATE ON enrollments
  FOR EACH ROW EXECUTE FUNCTION prevent_teacher_enrollment();

-- Publication must refer to a submitted attempt, not merely an opened draft.
CREATE FUNCTION check_grade_submission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.is_published AND NOT EXISTS (
    SELECT 1 FROM attempts WHERE id = NEW.attempt_id AND status = 'SUBMITTED'
  ) THEN
    RAISE EXCEPTION 'Grade publication requires a submitted attempt' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER grade_submission_guard BEFORE INSERT OR UPDATE ON attempt_grades
  FOR EACH ROW EXECUTE FUNCTION check_grade_submission();

COMMIT;
