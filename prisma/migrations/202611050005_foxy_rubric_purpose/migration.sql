ALTER TABLE foxy_turns DROP CONSTRAINT foxy_turns_purpose_check;
ALTER TABLE foxy_turns ADD CONSTRAINT foxy_turns_purpose_check
  CHECK (purpose IN ('CHAT','STUDY_MATERIAL','REVIEW','SUMMARY','ACTIVITY_IDEAS','LESSON_PLAN','RUBRIC'));
