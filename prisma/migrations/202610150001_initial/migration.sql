-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TokenPurpose" AS ENUM ('EMAIL_VERIFICATION', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "EntryMethod" AS ENUM ('CODE', 'INVITATION');

-- CreateEnum
CREATE TYPE "EndReason" AS ENUM ('LEFT', 'REMOVED');

-- CreateEnum
CREATE TYPE "TopicStatus" AS ENUM ('PENDING', 'NEXT', 'TAUGHT');

-- CreateEnum
CREATE TYPE "ValidationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('PENDING', 'RUNNING', 'CLEAN', 'REJECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "UploadStatus" AS ENUM ('STARTED', 'UPLOADING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION');

-- CreateEnum
CREATE TYPE "ActivityStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('DEVELOPMENT', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "ScoringRule" AS ENUM ('EXACT', 'PARTIAL');

-- CreateEnum
CREATE TYPE "EligibilityReason" AS ENUM ('INITIAL_ENROLLMENT', 'REENTRY', 'TEACHER_AUTHORIZATION');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('DRAFT', 'SUBMITTED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('NOTICE', 'QUERY');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "email_normalized" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "email_verified_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_tokens" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_id" UUID NOT NULL,
    "purpose" "TokenPurpose" NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "invalidated_at" TIMESTAMPTZ(6),

    CONSTRAINT "account_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account_action_controls" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "subject_key" TEXT NOT NULL,
    "last_requested_at" TIMESTAMPTZ(6) NOT NULL,
    "window_started_at" TIMESTAMPTZ(6) NOT NULL,
    "request_count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "account_action_controls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_drafts" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "owner_id" UUID NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}',
    "revision" BIGINT NOT NULL DEFAULT 0,
    "published_classroom_id" UUID,

    CONSTRAINT "classroom_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "teacher_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "division" TEXT NOT NULL,
    "academic_year" INTEGER NOT NULL,
    "timezone" TEXT NOT NULL,
    "cover_key" TEXT NOT NULL,
    "storage_quota_bytes" BIGINT NOT NULL,
    "archived_at" TIMESTAMPTZ(6),

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classroom_codes" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "code_digest" TEXT NOT NULL,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "classroom_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enrollments" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "student_id" UUID NOT NULL,
    "first_joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enrollments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "membership_periods" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enrollment_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "joined_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMPTZ(6),
    "end_reason" "EndReason",
    "ended_by_id" UUID,
    "entry_method" "EntryMethod" NOT NULL,
    "invitation_id" UUID,

    CONSTRAINT "membership_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "recipient_email_normalized" TEXT NOT NULL,
    "invited_by_id" UUID NOT NULL,
    "generation" BIGINT NOT NULL DEFAULT 1,
    "issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "accepted_at" TIMESTAMPTZ(6),
    "accepted_by_id" UUID,
    "revoked_at" TIMESTAMPTZ(6),

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "unit_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "status" "TopicStatus" NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "study_plan_versions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "version_number" INTEGER NOT NULL,
    "file_id" UUID NOT NULL,
    "uploaded_by_id" UUID NOT NULL,

    CONSTRAINT "study_plan_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "file_id" UUID NOT NULL,
    "unit_id" UUID,
    "topic_id" UUID,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "files" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID,
    "classroom_draft_id" UUID,
    "uploaded_by_id" UUID NOT NULL,
    "storage_key" TEXT NOT NULL,
    "original_name" TEXT NOT NULL,
    "extension" TEXT NOT NULL,
    "detected_mime_type" TEXT,
    "size_bytes" BIGINT NOT NULL,
    "validation_status" "ValidationStatus" NOT NULL DEFAULT 'PENDING',
    "scan_status" "ScanStatus" NOT NULL DEFAULT 'PENDING',
    "validated_at" TIMESTAMPTZ(6),
    "scanned_at" TIMESTAMPTZ(6),
    "rejection_code" TEXT,

    CONSTRAINT "files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "file_id" UUID NOT NULL,
    "status" "UploadStatus" NOT NULL DEFAULT 'STARTED',
    "reserved_bytes" BIGINT NOT NULL,
    "last_activity_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ(6),
    "reservation_released_at" TIMESTAMPTZ(6),

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activities" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "unit_id" UUID,
    "topic_id" UUID,
    "type" "ActivityType" NOT NULL,
    "title" TEXT,
    "instructions_text" TEXT,
    "attachments_required" BOOLEAN NOT NULL DEFAULT false,
    "status" "ActivityStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(6),
    "deadline_at" TIMESTAMPTZ(6),
    "allow_late_submissions" BOOLEAN NOT NULL DEFAULT false,
    "first_started_at" TIMESTAMPTZ(6),

    CONSTRAINT "activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_instruction_files" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,

    CONSTRAINT "activity_instruction_files_pkey" PRIMARY KEY ("activity_id","file_id")
);

-- CreateTable
CREATE TABLE "activity_materials" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "material_id" UUID NOT NULL,

    CONSTRAINT "activity_materials_pkey" PRIMARY KEY ("activity_id","material_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activity_id" UUID NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "available_points" DECIMAL NOT NULL,
    "scoring_rule" "ScoringRule",

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_options" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "question_id" UUID NOT NULL,
    "text" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_activities" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "enrollment_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "is_expected" BOOLEAN NOT NULL,
    "eligibility_reason" "EligibilityReason" NOT NULL,
    "eligible_at" TIMESTAMPTZ(6),
    "authorized_by_id" UUID,
    "first_submission_deadline_at" TIMESTAMPTZ(6),
    "effective_grade_id" UUID,
    "effective_grade_published" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "student_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attempts" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "student_activity_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'DRAFT',
    "opened_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "enabled_by_id" UUID,
    "individual_deadline_at" TIMESTAMPTZ(6),
    "submitted_at" TIMESTAMPTZ(6),
    "applied_deadline_at" TIMESTAMPTZ(6),
    "submitted_late" BOOLEAN,
    "editor_token_hash" TEXT,
    "editor_epoch" BIGINT NOT NULL DEFAULT 0,
    "revision" BIGINT NOT NULL DEFAULT 0,

    CONSTRAINT "attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answers" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "development_text" TEXT,
    "saved_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "answer_selections" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answer_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,

    CONSTRAINT "answer_selections_pkey" PRIMARY KEY ("answer_id","option_id")
);

-- CreateTable
CREATE TABLE "attempt_attachments" (
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "file_id" UUID NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "attempt_attachments_pkey" PRIMARY KEY ("attempt_id","file_id")
);

-- CreateTable
CREATE TABLE "attempt_grades" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_id" UUID NOT NULL,
    "student_activity_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "final_grade" DECIMAL,
    "overall_feedback" TEXT,
    "graded_by_id" UUID NOT NULL,
    "published_at" TIMESTAMPTZ(6),
    "is_published" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "attempt_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_grades" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_grade_id" UUID NOT NULL,
    "activity_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "earned_numerator" DECIMAL NOT NULL,
    "earned_denominator" DECIMAL NOT NULL,
    "feedback" TEXT,

    CONSTRAINT "question_grades_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "grade_corrections" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "attempt_grade_id" UUID NOT NULL,
    "published_marker" BOOLEAN NOT NULL DEFAULT true,
    "previous_grade" DECIMAL NOT NULL,
    "new_grade" DECIMAL NOT NULL,
    "reason" TEXT NOT NULL,
    "actor_id" UUID NOT NULL,
    "corrected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "grade_corrections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wall_posts" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "classroom_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "type" "PostType" NOT NULL,
    "body" TEXT,
    "edited_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "removed_by_id" UUID,

    CONSTRAINT "wall_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wall_replies" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "body" TEXT,
    "edited_at" TIMESTAMPTZ(6),
    "removed_at" TIMESTAMPTZ(6),
    "removed_by_id" UUID,

    CONSTRAINT "wall_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "recipient_id" UUID NOT NULL,
    "classroom_id" UUID NOT NULL,
    "event_type" TEXT NOT NULL,
    "activity_id" UUID,
    "attempt_id" UUID,
    "attempt_grade_id" UUID,
    "post_id" UUID,
    "reply_id" UUID,
    "read_at" TIMESTAMPTZ(6),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "background_jobs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "available_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimed_until" TIMESTAMPTZ(6),
    "claim_token" UUID,
    "completed_at" TIMESTAMPTZ(6),
    "last_error_code" TEXT,
    "deduplication_key" TEXT,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_normalized_key" ON "users"("email_normalized");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_hash_key" ON "sessions"("token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE UNIQUE INDEX "account_tokens_token_hash_key" ON "account_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "account_tokens_user_id_purpose_idx" ON "account_tokens"("user_id", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "account_action_controls_action_subject_key_key" ON "account_action_controls"("action", "subject_key");

-- CreateIndex
CREATE INDEX "classroom_drafts_owner_id_idx" ON "classroom_drafts"("owner_id");

-- CreateIndex
CREATE INDEX "classrooms_teacher_id_idx" ON "classrooms"("teacher_id");

-- CreateIndex
CREATE UNIQUE INDEX "classroom_codes_code_digest_key" ON "classroom_codes"("code_digest");

-- CreateIndex
CREATE INDEX "classroom_codes_classroom_id_idx" ON "classroom_codes"("classroom_id");

-- CreateIndex
CREATE INDEX "enrollments_student_id_idx" ON "enrollments"("student_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_classroom_id_student_id_key" ON "enrollments"("classroom_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "enrollments_id_classroom_id_key" ON "enrollments"("id", "classroom_id");

-- CreateIndex
CREATE INDEX "membership_periods_enrollment_id_joined_at_idx" ON "membership_periods"("enrollment_id", "joined_at");

-- CreateIndex
CREATE INDEX "invitations_recipient_email_normalized_expires_at_idx" ON "invitations"("recipient_email_normalized", "expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_id_classroom_id_key" ON "invitations"("id", "classroom_id");

-- CreateIndex
CREATE INDEX "units_classroom_id_position_idx" ON "units"("classroom_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "units_id_classroom_id_key" ON "units"("id", "classroom_id");

-- CreateIndex
CREATE INDEX "topics_unit_id_position_idx" ON "topics"("unit_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "topics_id_unit_id_classroom_id_key" ON "topics"("id", "unit_id", "classroom_id");

-- CreateIndex
CREATE UNIQUE INDEX "study_plan_versions_classroom_id_version_number_key" ON "study_plan_versions"("classroom_id", "version_number");

-- CreateIndex
CREATE INDEX "materials_classroom_id_unit_id_topic_id_idx" ON "materials"("classroom_id", "unit_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "materials_id_classroom_id_key" ON "materials"("id", "classroom_id");

-- CreateIndex
CREATE UNIQUE INDEX "files_storage_key_key" ON "files"("storage_key");

-- CreateIndex
CREATE INDEX "files_classroom_id_idx" ON "files"("classroom_id");

-- CreateIndex
CREATE INDEX "files_classroom_draft_id_idx" ON "files"("classroom_draft_id");

-- CreateIndex
CREATE INDEX "files_scan_status_created_at_idx" ON "files"("scan_status", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "files_id_classroom_id_key" ON "files"("id", "classroom_id");

-- CreateIndex
CREATE UNIQUE INDEX "uploads_file_id_key" ON "uploads"("file_id");

-- CreateIndex
CREATE INDEX "uploads_status_last_activity_at_idx" ON "uploads"("status", "last_activity_at");

-- CreateIndex
CREATE INDEX "activities_classroom_id_status_published_at_idx" ON "activities"("classroom_id", "status", "published_at");

-- CreateIndex
CREATE INDEX "activities_unit_id_topic_id_idx" ON "activities"("unit_id", "topic_id");

-- CreateIndex
CREATE UNIQUE INDEX "activities_id_classroom_id_key" ON "activities"("id", "classroom_id");

-- CreateIndex
CREATE INDEX "activity_materials_material_id_idx" ON "activity_materials"("material_id");

-- CreateIndex
CREATE INDEX "questions_activity_id_position_idx" ON "questions"("activity_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "questions_id_activity_id_key" ON "questions"("id", "activity_id");

-- CreateIndex
CREATE INDEX "question_options_question_id_position_idx" ON "question_options"("question_id", "position");

-- CreateIndex
CREATE UNIQUE INDEX "question_options_id_question_id_key" ON "question_options"("id", "question_id");

-- CreateIndex
CREATE INDEX "student_activities_activity_id_idx" ON "student_activities"("activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_activities_enrollment_id_activity_id_key" ON "student_activities"("enrollment_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "student_activities_id_activity_id_key" ON "student_activities"("id", "activity_id");

-- CreateIndex
CREATE INDEX "attempts_activity_id_submitted_at_idx" ON "attempts"("activity_id", "submitted_at");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_student_activity_id_attempt_number_key" ON "attempts"("student_activity_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_id_activity_id_key" ON "attempts"("id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempts_id_student_activity_id_activity_id_key" ON "attempts"("id", "student_activity_id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_attempt_id_question_id_key" ON "answers"("attempt_id", "question_id");

-- CreateIndex
CREATE UNIQUE INDEX "answers_id_question_id_key" ON "answers"("id", "question_id");

-- CreateIndex
CREATE INDEX "attempt_attachments_file_id_idx" ON "attempt_attachments"("file_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_grades_attempt_id_key" ON "attempt_grades"("attempt_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_grades_id_student_activity_id_is_published_key" ON "attempt_grades"("id", "student_activity_id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_grades_id_activity_id_key" ON "attempt_grades"("id", "activity_id");

-- CreateIndex
CREATE UNIQUE INDEX "attempt_grades_id_is_published_key" ON "attempt_grades"("id", "is_published");

-- CreateIndex
CREATE UNIQUE INDEX "question_grades_attempt_grade_id_question_id_key" ON "question_grades"("attempt_grade_id", "question_id");

-- CreateIndex
CREATE INDEX "grade_corrections_attempt_grade_id_corrected_at_idx" ON "grade_corrections"("attempt_grade_id", "corrected_at");

-- CreateIndex
CREATE INDEX "wall_posts_classroom_id_created_at_idx" ON "wall_posts"("classroom_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wall_posts_id_classroom_id_key" ON "wall_posts"("id", "classroom_id");

-- CreateIndex
CREATE INDEX "wall_replies_post_id_created_at_idx" ON "wall_replies"("post_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "wall_replies_id_classroom_id_key" ON "wall_replies"("id", "classroom_id");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_created_at_idx" ON "notifications"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "notifications_recipient_id_read_at_idx" ON "notifications"("recipient_id", "read_at");

-- CreateIndex
CREATE UNIQUE INDEX "background_jobs_deduplication_key_key" ON "background_jobs"("deduplication_key");

-- CreateIndex
CREATE INDEX "background_jobs_status_available_at_idx" ON "background_jobs"("status", "available_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "account_tokens" ADD CONSTRAINT "account_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "classroom_drafts" ADD CONSTRAINT "classroom_drafts_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "classroom_drafts" ADD CONSTRAINT "classroom_drafts_published_classroom_id_fkey" FOREIGN KEY ("published_classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "classroom_codes" ADD CONSTRAINT "classroom_codes_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "enrollments" ADD CONSTRAINT "enrollments_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_ended_by_id_fkey" FOREIGN KEY ("ended_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_enrollment_id_classroom_id_fkey" FOREIGN KEY ("enrollment_id", "classroom_id") REFERENCES "enrollments"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "membership_periods" ADD CONSTRAINT "membership_periods_invitation_id_classroom_id_fkey" FOREIGN KEY ("invitation_id", "classroom_id") REFERENCES "invitations"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey" FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_id_fkey" FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "invitations" ADD CONSTRAINT "invitations_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "units" ADD CONSTRAINT "units_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_unit_id_classroom_id_fkey" FOREIGN KEY ("unit_id", "classroom_id") REFERENCES "units"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_plan_versions" ADD CONSTRAINT "study_plan_versions_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_plan_versions" ADD CONSTRAINT "study_plan_versions_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "study_plan_versions" ADD CONSTRAINT "study_plan_versions_file_id_classroom_id_fkey" FOREIGN KEY ("file_id", "classroom_id") REFERENCES "files"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_file_id_classroom_id_fkey" FOREIGN KEY ("file_id", "classroom_id") REFERENCES "files"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_unit_id_classroom_id_fkey" FOREIGN KEY ("unit_id", "classroom_id") REFERENCES "units"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_topic_id_unit_id_classroom_id_fkey" FOREIGN KEY ("topic_id", "unit_id", "classroom_id") REFERENCES "topics"("id", "unit_id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "files" ADD CONSTRAINT "files_classroom_draft_id_fkey" FOREIGN KEY ("classroom_draft_id") REFERENCES "classroom_drafts"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "files"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_unit_id_classroom_id_fkey" FOREIGN KEY ("unit_id", "classroom_id") REFERENCES "units"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activities" ADD CONSTRAINT "activities_topic_id_unit_id_classroom_id_fkey" FOREIGN KEY ("topic_id", "unit_id", "classroom_id") REFERENCES "topics"("id", "unit_id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_instruction_files" ADD CONSTRAINT "activity_instruction_files_activity_id_classroom_id_fkey" FOREIGN KEY ("activity_id", "classroom_id") REFERENCES "activities"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_instruction_files" ADD CONSTRAINT "activity_instruction_files_file_id_classroom_id_fkey" FOREIGN KEY ("file_id", "classroom_id") REFERENCES "files"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_materials" ADD CONSTRAINT "activity_materials_activity_id_classroom_id_fkey" FOREIGN KEY ("activity_id", "classroom_id") REFERENCES "activities"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "activity_materials" ADD CONSTRAINT "activity_materials_material_id_classroom_id_fkey" FOREIGN KEY ("material_id", "classroom_id") REFERENCES "materials"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_activity_id_fkey" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_authorized_by_id_fkey" FOREIGN KEY ("authorized_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_enrollment_id_classroom_id_fkey" FOREIGN KEY ("enrollment_id", "classroom_id") REFERENCES "enrollments"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_activity_id_classroom_id_fkey" FOREIGN KEY ("activity_id", "classroom_id") REFERENCES "activities"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "student_activities" ADD CONSTRAINT "student_activities_effective_grade_id_id_effective_grade_p_fkey" FOREIGN KEY ("effective_grade_id", "id", "effective_grade_published") REFERENCES "attempt_grades"("id", "student_activity_id", "is_published") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_enabled_by_id_fkey" FOREIGN KEY ("enabled_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempts" ADD CONSTRAINT "attempts_student_activity_id_activity_id_fkey" FOREIGN KEY ("student_activity_id", "activity_id") REFERENCES "student_activities"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_attempt_id_activity_id_fkey" FOREIGN KEY ("attempt_id", "activity_id") REFERENCES "attempts"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_activity_id_fkey" FOREIGN KEY ("question_id", "activity_id") REFERENCES "questions"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_selections" ADD CONSTRAINT "answer_selections_answer_id_question_id_fkey" FOREIGN KEY ("answer_id", "question_id") REFERENCES "answers"("id", "question_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "answer_selections" ADD CONSTRAINT "answer_selections_option_id_question_id_fkey" FOREIGN KEY ("option_id", "question_id") REFERENCES "question_options"("id", "question_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_attachments" ADD CONSTRAINT "attempt_attachments_attempt_id_activity_id_fkey" FOREIGN KEY ("attempt_id", "activity_id") REFERENCES "attempts"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_attachments" ADD CONSTRAINT "attempt_attachments_activity_id_classroom_id_fkey" FOREIGN KEY ("activity_id", "classroom_id") REFERENCES "activities"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_attachments" ADD CONSTRAINT "attempt_attachments_file_id_classroom_id_fkey" FOREIGN KEY ("file_id", "classroom_id") REFERENCES "files"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_grades" ADD CONSTRAINT "attempt_grades_graded_by_id_fkey" FOREIGN KEY ("graded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attempt_grades" ADD CONSTRAINT "attempt_grades_attempt_id_student_activity_id_activity_id_fkey" FOREIGN KEY ("attempt_id", "student_activity_id", "activity_id") REFERENCES "attempts"("id", "student_activity_id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_grades" ADD CONSTRAINT "question_grades_attempt_grade_id_activity_id_fkey" FOREIGN KEY ("attempt_grade_id", "activity_id") REFERENCES "attempt_grades"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_grades" ADD CONSTRAINT "question_grades_question_id_activity_id_fkey" FOREIGN KEY ("question_id", "activity_id") REFERENCES "questions"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "grade_corrections" ADD CONSTRAINT "grade_corrections_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "grade_corrections" ADD CONSTRAINT "grade_corrections_attempt_grade_id_published_marker_fkey" FOREIGN KEY ("attempt_grade_id", "published_marker") REFERENCES "attempt_grades"("id", "is_published") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_removed_by_id_fkey" FOREIGN KEY ("removed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wall_posts" ADD CONSTRAINT "wall_posts_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wall_replies" ADD CONSTRAINT "wall_replies_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wall_replies" ADD CONSTRAINT "wall_replies_removed_by_id_fkey" FOREIGN KEY ("removed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wall_replies" ADD CONSTRAINT "wall_replies_post_id_classroom_id_fkey" FOREIGN KEY ("post_id", "classroom_id") REFERENCES "wall_posts"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_classroom_id_fkey" FOREIGN KEY ("classroom_id") REFERENCES "classrooms"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_activity_id_classroom_id_fkey" FOREIGN KEY ("activity_id", "classroom_id") REFERENCES "activities"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_attempt_id_activity_id_fkey" FOREIGN KEY ("attempt_id", "activity_id") REFERENCES "attempts"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_attempt_grade_id_activity_id_fkey" FOREIGN KEY ("attempt_grade_id", "activity_id") REFERENCES "attempt_grades"("id", "activity_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_post_id_classroom_id_fkey" FOREIGN KEY ("post_id", "classroom_id") REFERENCES "wall_posts"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_reply_id_classroom_id_fkey" FOREIGN KEY ("reply_id", "classroom_id") REFERENCES "wall_replies"("id", "classroom_id") ON DELETE RESTRICT ON UPDATE NO ACTION;
