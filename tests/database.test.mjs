import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";
import pg from "pg";

if (process.env.FOXMIND_TEST_DATABASE !== "isolated-container") throw new Error("Use npm test: direct tests require an explicitly isolated database");
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
after(() => db.end());
const tables = [
  "users", "sessions", "account_tokens", "account_action_controls", "classroom_drafts",
  "classrooms", "classroom_codes", "enrollments", "membership_periods", "invitations",
  "units", "topics", "study_plan_versions", "materials", "files", "uploads", "activities",
  "activity_instruction_files", "activity_materials", "questions", "question_options",
  "student_activities", "attempts", "answers", "answer_selections", "attempt_attachments",
  "attempt_grades", "question_grades", "grade_corrections", "wall_posts", "wall_replies",
  "notifications", "background_jobs",
];

async function insert(table, values) {
  const keys = Object.keys(values);
  const sql = `INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(", ")}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING *`;
  // pg treats JavaScript arrays as PostgreSQL arrays, not JSON arrays.
  const parameters = keys.map(key => key === "payload" ? JSON.stringify(values[key]) : values[key]);
  return (await db.query(sql, parameters)).rows[0];
}
async function user(account_role) {
  return insert("users", { id: randomUUID(), email: `${randomUUID()}@example.test`, email_normalized: `${randomUUID()}@example.test`, first_name: "Test", last_name: "User", password_hash: "fixture-not-a-real-password-hash", account_role });
}
async function classroom(teacher) {
  return insert("classrooms", { id: randomUUID(), teacher_id: teacher.id, name: "Photography", subject: "Light", division: "A", academic_year: 2026, timezone: "America/Argentina/Buenos_Aires", cover_key: "fox", storage_quota_bytes: "1000000000" });
}
async function fixture() {
  const teacher = await user("teacher");
  const student = await user("student");
  const room = await classroom(teacher);
  const enrollment = await insert("enrollments", { id: randomUUID(), classroom_id: room.id, student_id: student.id });
  const unit = await insert("units", { id: randomUUID(), classroom_id: room.id, name: "Unit", position: 0 });
  const topic = await insert("topics", { id: randomUUID(), classroom_id: room.id, unit_id: unit.id, name: "Topic", position: 0 });
  const activity = await insert("activities", { id: randomUUID(), classroom_id: room.id, unit_id: unit.id, topic_id: topic.id, type: "QUESTIONNAIRE", title: "Exposure", status: "DRAFT" });
  const obligation = await insert("student_activities", { id: randomUUID(), classroom_id: room.id, enrollment_id: enrollment.id, activity_id: activity.id, is_expected: true, eligibility_reason: "INITIAL_ENROLLMENT" });
  const attempt = await insert("attempts", { id: randomUUID(), student_activity_id: obligation.id, activity_id: activity.id, attempt_number: 1 });
  const question = await insert("questions", { id: randomUUID(), activity_id: activity.id, type: "MULTIPLE_CHOICE", prompt: "Select", position: 0, available_points: "6.00", scoring_rule: "PARTIAL" });
  return { teacher, student, room, enrollment, unit, topic, activity, obligation, attempt, question };
}
async function snapshot() {
  const result = {};
  for (const table of tables) result[table] = (await db.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY to_jsonb(t)::text), '[]') AS rows FROM "${table}" t`)).rows[0].rows;
  return result;
}
async function rejected(fn, code) {
  const before = await snapshot();
  await db.query("SAVEPOINT rejected_operation");
  let caught;
  try { await fn(); } catch (error) { caught = error; }
  await db.query("ROLLBACK TO SAVEPOINT rejected_operation");
  assert.ok(caught, "operation must be rejected by PostgreSQL");
  assert.equal(caught.code, code);
  assert.deepEqual(await snapshot(), before, "rejection must leave all stored records and counters unchanged");
}
function contract(name, fn) {
  test(name, async () => {
    await db.query("BEGIN");
    try { await fn(await fixture()); } finally { await db.query("ROLLBACK"); }
  });
}

test("approved entity families exist in PostgreSQL", async () => {
  const rows = (await db.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'")).rows.map(r => r.table_name);
  for (const table of tables) assert.ok(rows.includes(table), `missing table ${table}`);
});
contract("account email is unique and names respect approved text bounds", async f => {
  await rejected(() => insert("users", { ...f.student, id: randomUUID() }), "23505");
  await rejected(() => db.query("UPDATE users SET first_name = $1 WHERE id = $2", ["x".repeat(81), f.student.id]), "23514");
  await rejected(() => db.query("UPDATE users SET last_name = '   ' WHERE id = $1", [f.student.id]), "23514");
});
contract("sessions and action tokens retain lifecycle without plaintext secrets", async f => {
  const session = await insert("sessions", { id: randomUUID(), user_id: f.student.id, token_hash: randomUUID(), expires_at: new Date(Date.now() + 3600000) });
  await rejected(() => insert("sessions", { ...session, id: randomUUID() }), "23505");
  await rejected(() => insert("account_tokens", { id: randomUUID(), user_id: f.student.id, purpose: "PASSWORD_RESET", token_hash: randomUUID(), expires_at: new Date(0) }), "23514");
  await db.query("UPDATE sessions SET revoked_at = now() WHERE id = $1", [session.id]);
  assert.ok((await db.query("SELECT revoked_at FROM sessions WHERE id=$1", [session.id])).rows[0].revoked_at);
});
contract("private classroom draft accepts incomplete wizard data", async f => {
  const draft = await insert("classroom_drafts", { id: randomUUID(), owner_id: f.teacher.id, payload: { name: "Incomplete" } });
  assert.equal(draft.payload.name, "Incomplete");
  await rejected(() => insert("classroom_drafts", { id: randomUUID(), owner_id: f.teacher.id, payload: [] }), "23514");
});
contract("published classroom metadata is nonblank and quota is nonnegative", async f => {
  await rejected(() => db.query("UPDATE classrooms SET name=' ' WHERE id=$1", [f.room.id]), "23514");
  await rejected(() => db.query("UPDATE classrooms SET storage_quota_bytes=-1 WHERE id=$1", [f.room.id]), "23514");
});
contract("one stable enrollment per student/classroom survives departure", async f => {
  await rejected(() => insert("enrollments", { id: randomUUID(), classroom_id: f.room.id, student_id: f.student.id }), "23505");
  const period = await insert("membership_periods", { id: randomUUID(), enrollment_id: f.enrollment.id, classroom_id: f.room.id, entry_method: "CODE" });
  await rejected(() => insert("membership_periods", { id: randomUUID(), enrollment_id: f.enrollment.id, classroom_id: f.room.id, entry_method: "CODE" }), "23505");
  await db.query("UPDATE membership_periods SET ended_at=now(), end_reason='LEFT', ended_by_id=$1 WHERE id=$2", [f.student.id, period.id]);
  assert.equal((await db.query("SELECT count(*) FROM enrollments WHERE id=$1", [f.enrollment.id])).rows[0].count, "1");
});
contract("classroom invitation reentry links must match the membership classroom", async f => {
  const other = await classroom(f.teacher);
  const invitation = await insert("invitations", { id: randomUUID(), classroom_id: other.id, recipient_email_normalized: f.student.email_normalized, invited_by_id: f.teacher.id, expires_at: new Date(Date.now() + 604800000) });
  await rejected(() => insert("membership_periods", { id: randomUUID(), enrollment_id: f.enrollment.id, classroom_id: f.room.id, invitation_id: invitation.id, entry_method: "INVITATION" }), "23503");
});
contract("only one live classroom code and pending invitation are allowed", async f => {
  await insert("classroom_codes", { id: randomUUID(), classroom_id: f.room.id, code_digest: randomUUID() });
  await rejected(() => insert("classroom_codes", { id: randomUUID(), classroom_id: f.room.id, code_digest: randomUUID() }), "23505");
  const values = { classroom_id: f.room.id, recipient_email_normalized: f.student.email_normalized, invited_by_id: f.teacher.id, expires_at: new Date(Date.now() + 604800000) };
  await insert("invitations", { id: randomUUID(), ...values });
  await rejected(() => insert("invitations", { id: randomUUID(), ...values }), "23505");
});
contract("topics cannot cross classroom/unit boundaries", async f => {
  const other = await classroom(f.teacher);
  await rejected(() => insert("topics", { id: randomUUID(), classroom_id: other.id, unit_id: f.unit.id, name: "Wrong classroom", position: 1 }), "23503");
});
contract("at most one next topic per classroom, including across units", async f => {
  await db.query("UPDATE topics SET status='NEXT' WHERE id=$1", [f.topic.id]);
  const unit = await insert("units", { id: randomUUID(), classroom_id: f.room.id, name: "Second", position: 1 });
  await rejected(() => insert("topics", { id: randomUUID(), classroom_id: f.room.id, unit_id: unit.id, name: "Second", position: 0, status: "NEXT" }), "23505");
});
contract("files belong to exactly one classroom or creation draft", async f => {
  const base = { id: randomUUID(), uploaded_by_id: f.teacher.id, storage_key: randomUUID(), original_name: "plan.pdf", extension: "pdf", size_bytes: "12" };
  await rejected(() => insert("files", base), "23514");
  const draft = await insert("classroom_drafts", { id: randomUUID(), owner_id: f.teacher.id, payload: {} });
  await rejected(() => insert("files", { ...base, classroom_id: f.room.id, classroom_draft_id: draft.id }), "23514");
  const file = await insert("files", { ...base, classroom_draft_id: draft.id });
  assert.equal(file.scan_status, "PENDING");
  assert.equal(file.validation_status, "PENDING");
});
contract("plan versions preserve files and reject cross-classroom references", async f => {
  const file = await insert("files", { id: randomUUID(), classroom_id: f.room.id, uploaded_by_id: f.teacher.id, storage_key: randomUUID(), original_name: "plan.pdf", extension: "pdf", size_bytes: "12" });
  await insert("study_plan_versions", { id: randomUUID(), classroom_id: f.room.id, version_number: 1, file_id: file.id, uploaded_by_id: f.teacher.id });
  await rejected(() => db.query("DELETE FROM files WHERE id=$1", [file.id]), "23503");
  const other = await classroom(f.teacher);
  await rejected(() => insert("study_plan_versions", { id: randomUUID(), classroom_id: other.id, version_number: 1, file_id: file.id, uploaded_by_id: f.teacher.id }), "23503");
});
contract("upload reservations are nonnegative and completion has a timestamp", async f => {
  const file = await insert("files", { id: randomUUID(), classroom_id: f.room.id, uploaded_by_id: f.student.id, storage_key: randomUUID(), original_name: "work.pdf", extension: "pdf", size_bytes: "12" });
  await rejected(() => insert("uploads", { id: randomUUID(), file_id: file.id, reserved_bytes: "-1" }), "23514");
  await rejected(() => insert("uploads", { id: randomUUID(), file_id: file.id, reserved_bytes: "12", status: "COMPLETED" }), "23514");
});
contract("material topic requires the matching unit", async f => {
  const file = await insert("files", { id: randomUUID(), classroom_id: f.room.id, uploaded_by_id: f.teacher.id, storage_key: randomUUID(), original_name: "book.pdf", extension: "pdf", size_bytes: "12" });
  await rejected(() => insert("materials", { id: randomUUID(), classroom_id: f.room.id, title: "Book", file_id: file.id, topic_id: f.topic.id, created_by_id: f.teacher.id }), "23514");
});
contract("activity drafts may be incomplete but published metadata must be complete", async f => {
  await insert("activities", { id: randomUUID(), classroom_id: f.room.id, type: "ASSIGNMENT", status: "DRAFT" });
  await rejected(() => insert("activities", { id: randomUUID(), classroom_id: f.room.id, type: "ASSIGNMENT", status: "PUBLISHED", published_at: new Date() }), "23514");
  await rejected(() => db.query("UPDATE activities SET title=$1 WHERE id=$2", ["x".repeat(201), f.activity.id]), "23514");
});
contract("available question points are positive with at most two decimals", async f => {
  for (const value of ["0", "-1", "1.001", "NaN", "Infinity"]) await rejected(() => db.query("UPDATE questions SET available_points=$1 WHERE id=$2", [value, f.question.id]), "23514");
  await db.query("UPDATE questions SET available_points=0.01 WHERE id=$1", [f.question.id]);
});
contract("obligations cannot join enrollment and activity from different classrooms", async f => {
  const other = await classroom(f.teacher);
  const student = await user("student");
  const enrollment = await insert("enrollments", { id: randomUUID(), classroom_id: f.room.id, student_id: student.id });
  // A fresh pair isolates the classroom FK from the separate unique-pair rule.
  await rejected(() => insert("student_activities", { id: randomUUID(), classroom_id: other.id, enrollment_id: enrollment.id, activity_id: f.activity.id, is_expected: true, eligibility_reason: "TEACHER_AUTHORIZATION" }), "23503");
});
contract("one open draft attempt and positive unique attempt numbers", async f => {
  const values = { student_activity_id: f.obligation.id, activity_id: f.activity.id, attempt_number: 2 };
  await rejected(() => insert("attempts", { id: randomUUID(), ...values }), "23505");
  await rejected(() => db.query("UPDATE attempts SET attempt_number=0 WHERE id=$1", [f.attempt.id]), "23514");
});
contract("submitted attempts capture receipt and timeliness together", async f => {
  await rejected(() => db.query("UPDATE attempts SET status='SUBMITTED' WHERE id=$1", [f.attempt.id]), "23514");
  await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1", [f.attempt.id]);
  const second = await insert("attempts", { id: randomUUID(), student_activity_id: f.obligation.id, activity_id: f.activity.id, attempt_number: 2, enabled_by_id: f.teacher.id });
  assert.equal(second.status, "DRAFT");
  assert.equal((await db.query("SELECT count(*) FROM attempts WHERE student_activity_id=$1", [f.obligation.id])).rows[0].count, "2");
});
contract("editor epoch and revision reject stale writes through compare-and-swap", async f => {
  await db.query("UPDATE attempts SET editor_epoch=editor_epoch+1,revision=revision+1 WHERE id=$1", [f.attempt.id]);
  const oldWrite = await db.query("UPDATE attempts SET revision=revision+1 WHERE id=$1 AND editor_epoch=0 AND revision=0 RETURNING id", [f.attempt.id]);
  assert.equal(oldWrite.rowCount, 0);
  assert.equal((await db.query("SELECT editor_epoch,revision FROM attempts WHERE id=$1", [f.attempt.id])).rows[0].revision, "1");
});
contract("answers cannot target a question from another activity", async f => {
  const activity = await insert("activities", { id: randomUUID(), classroom_id: f.room.id, type: "QUESTIONNAIRE", status: "DRAFT" });
  const question = await insert("questions", { id: randomUUID(), activity_id: activity.id, type: "DEVELOPMENT", prompt: "Other", position: 0, available_points: "1" });
  await rejected(() => insert("answers", { id: randomUUID(), attempt_id: f.attempt.id, activity_id: f.activity.id, question_id: question.id }), "23503");
});
contract("answer selections belong to their question and cannot duplicate", async f => {
  const answer = await insert("answers", { id: randomUUID(), attempt_id: f.attempt.id, activity_id: f.activity.id, question_id: f.question.id });
  const option = await insert("question_options", { id: randomUUID(), question_id: f.question.id, text: "Correct", position: 0, is_correct: true });
  await insert("answer_selections", { answer_id: answer.id, question_id: f.question.id, option_id: option.id });
  await rejected(() => insert("answer_selections", { answer_id: answer.id, question_id: f.question.id, option_id: option.id }), "23505");
  const otherQuestion = await insert("questions", { id: randomUUID(), activity_id: f.activity.id, type: "SINGLE_CHOICE", prompt: "Other", position: 1, available_points: "1", scoring_rule: "EXACT" });
  const otherOption = await insert("question_options", { id: randomUUID(), question_id: otherQuestion.id, text: "Other", position: 0, is_correct: true });
  await rejected(() => insert("answer_selections", { answer_id: answer.id, question_id: f.question.id, option_id: otherOption.id }), "23503");
});
contract("grade publication requires a valid submitted attempt and two-decimal grade", async f => {
  const grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id });
  await rejected(() => db.query("UPDATE attempt_grades SET published_at=now() WHERE id=$1", [grade.id]), "23514");
  for (const value of ["-0.01", "10.01", "8.345"]) await rejected(() => db.query("UPDATE attempt_grades SET final_grade=$1 WHERE id=$2", [value, grade.id]), "23514");
  await db.query("UPDATE attempt_grades SET final_grade=0 WHERE id=$1", [grade.id]);
});
contract("effective grade belongs to its student/activity and must be published", async f => {
  const grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "8.00" });
  await rejected(() => db.query("UPDATE student_activities SET effective_grade_id=$1 WHERE id=$2", [grade.id, f.obligation.id]), "23503");
});
contract("exact rational question scores are preserved without binary float", async f => {
  const grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id });
  const row = await insert("question_grades", { id: randomUUID(), attempt_grade_id: grade.id, activity_id: f.activity.id, question_id: f.question.id, earned_numerator: "4", earned_denominator: "3" });
  assert.equal(row.earned_numerator, "4"); assert.equal(row.earned_denominator, "3");
  await rejected(() => db.query("UPDATE question_grades SET earned_denominator=0 WHERE id=$1", [row.id]), "23514");
  await rejected(() => db.query("UPDATE question_grades SET earned_numerator=-1 WHERE id=$1", [row.id]), "23514");
});
contract("published grade corrections require nonblank reason and retain audit", async f => {
  await db.query("UPDATE attempts SET status=\'SUBMITTED\',submitted_at=now(),submitted_late=false WHERE id=$1", [f.attempt.id]);
  const grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "8", published_at: new Date(), is_published: true });
  const values = { attempt_grade_id: grade.id, previous_grade: "8", new_grade: "6", actor_id: f.teacher.id };
  await rejected(() => insert("grade_corrections", { id: randomUUID(), ...values, reason: " " }), "23514");
  await insert("grade_corrections", { id: randomUUID(), ...values, reason: "Scoring correction" });
  assert.equal((await db.query("SELECT count(*) FROM grade_corrections WHERE attempt_grade_id=$1", [grade.id])).rows[0].count, "1");
});
contract("wall tombstones preserve replies and prevent dangling authors", async f => {
  const post = await insert("wall_posts", { id: randomUUID(), classroom_id: f.room.id, author_id: f.student.id, type: "QUERY", body: "Question" });
  const reply = await insert("wall_replies", { id: randomUUID(), post_id: post.id, classroom_id: f.room.id, author_id: f.teacher.id, body: "Reply" });
  await db.query("UPDATE wall_posts SET body=NULL,removed_at=now(),removed_by_id=$1 WHERE id=$2", [f.student.id, post.id]);
  assert.equal((await db.query("SELECT body FROM wall_replies WHERE id=$1", [reply.id])).rows[0].body, "Reply");
  await rejected(() => db.query("DELETE FROM wall_posts WHERE id=$1", [post.id]), "23503");
});
contract("notification targets remain in their classroom", async f => {
  const other = await classroom(f.teacher);
  await rejected(() => insert("notifications", { id: randomUUID(), recipient_id: f.student.id, classroom_id: other.id, event_type: "NEW_ACTIVITY", activity_id: f.activity.id }), "23503");
});
contract("teacher cannot enroll as student in their own classroom", async f => {
  await rejected(() => insert("enrollments", { id: randomUUID(), classroom_id: f.room.id, student_id: f.teacher.id }), "23514");
});
contract("effective grade replacement preserves prior results until publication", async f => {
  await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1", [f.attempt.id]);
  const first = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "8", published_at: new Date(), is_published: true });
  await db.query("UPDATE student_activities SET effective_grade_id=$1 WHERE id=$2", [first.id, f.obligation.id]);
  const secondAttempt = await insert("attempts", { id: randomUUID(), student_activity_id: f.obligation.id, activity_id: f.activity.id, attempt_number: 2, enabled_by_id: f.teacher.id });
  const second = await insert("attempt_grades", { id: randomUUID(), attempt_id: secondAttempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "6" });
  const effective = async () => (await db.query("SELECT g.final_grade FROM student_activities s JOIN attempt_grades g ON g.id=s.effective_grade_id WHERE s.id=$1", [f.obligation.id])).rows[0].final_grade;
  assert.equal(await effective(), "8");
  await rejected(() => db.query("UPDATE attempt_grades SET is_published=true,published_at=now() WHERE id=$1", [second.id]), "23514");
  await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1", [secondAttempt.id]);
  await db.query("UPDATE attempt_grades SET is_published=true,published_at=now() WHERE id=$1", [second.id]);
  await db.query("UPDATE student_activities SET effective_grade_id=$1 WHERE id=$2", [second.id, f.obligation.id]);
  assert.equal(await effective(), "6");
  await insert("grade_corrections", { id: randomUUID(), attempt_grade_id: first.id, previous_grade: "8", new_grade: "9", reason: "Historical correction", actor_id: f.teacher.id });
  await db.query("UPDATE attempt_grades SET final_grade=9 WHERE id=$1", [first.id]);
  assert.equal(await effective(), "6", "historical correction must not select the old attempt");
  const student = await user("student");
  const enrollment = await insert("enrollments", { id: randomUUID(), classroom_id: f.room.id, student_id: student.id });
  const other = await insert("student_activities", { id: randomUUID(), classroom_id: f.room.id, enrollment_id: enrollment.id, activity_id: f.activity.id, is_expected: true, eligibility_reason: "INITIAL_ENROLLMENT" });
  await rejected(() => db.query("UPDATE student_activities SET effective_grade_id=$1 WHERE id=$2", [second.id, other.id]), "23503");
});
contract("attempt attachments cannot cross classroom boundaries", async f => {
  const other = await classroom(f.teacher);
  const file = await insert("files", { id: randomUUID(), classroom_id: other.id, uploaded_by_id: f.student.id, storage_key: randomUUID(), original_name: "work.pdf", extension: "pdf", size_bytes: "12" });
  await rejected(() => insert("attempt_attachments", { attempt_id: f.attempt.id, activity_id: f.activity.id, classroom_id: f.room.id, file_id: file.id, position: 0 }), "23503");
});
contract("deadline snapshots distinguish receipt before, at and after the deadline", async f => {
  const deadline = new Date(Date.now() + 3600000);
  for (const offset of [-1000, 0, 1000]) {
    const received = new Date(deadline.getTime() + offset);
    const late = offset >= 0;
    await db.query("SAVEPOINT deadline_case");
    await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=$1,applied_deadline_at=$2,submitted_late=$3 WHERE id=$4", [received, deadline, late, f.attempt.id]);
    const row = (await db.query("SELECT submitted_late FROM attempts WHERE id=$1", [f.attempt.id])).rows[0];
    assert.equal(row.submitted_late, late);
    await db.query("ROLLBACK TO SAVEPOINT deadline_case");
    await rejected(() => db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=$1,applied_deadline_at=$2,submitted_late=$3 WHERE id=$4", [received, deadline, !late, f.attempt.id]), "23514");
  }
});
contract("academic history restricts enrollment and question deletion", async f => {
  await rejected(() => db.query("DELETE FROM enrollments WHERE id=$1", [f.enrollment.id]), "23503");
  await insert("answers", { id: randomUUID(), attempt_id: f.attempt.id, activity_id: f.activity.id, question_id: f.question.id });
  await rejected(() => db.query("DELETE FROM questions WHERE id=$1", [f.question.id]), "23503");
});
contract("development answers preserve the 20000-character boundary", async f => {
  const answer = await insert("answers", { id: randomUUID(), attempt_id: f.attempt.id, activity_id: f.activity.id, question_id: f.question.id, development_text: "x".repeat(20000) });
  await rejected(() => db.query("UPDATE answers SET development_text=$1 WHERE id=$2", ["x".repeat(20001), answer.id]), "23514");
});
contract("raw text bounds reject surrounding-space overflow without trimming", async f => {
  const file = await insert("files", { id: randomUUID(), classroom_id: f.room.id, uploaded_by_id: f.teacher.id, storage_key: randomUUID(), original_name: "material.pdf", extension: "pdf", size_bytes: "12" });
  const material = await insert("materials", { id: randomUUID(), classroom_id: f.room.id, title: "Material", file_id: file.id, created_by_id: f.teacher.id });
  const post = await insert("wall_posts", { id: randomUUID(), classroom_id: f.room.id, author_id: f.student.id, type: "QUERY", body: "Question" });
  const reply = await insert("wall_replies", { id: randomUUID(), post_id: post.id, classroom_id: f.room.id, author_id: f.teacher.id, body: "Reply" });
  await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1", [f.attempt.id]);
  const grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "8", published_at: new Date(), is_published: true });
  const correction = await insert("grade_corrections", { id: randomUUID(), attempt_grade_id: grade.id, previous_grade: "8", new_grade: "6", reason: "Correction", actor_id: f.teacher.id });
  const cases = [
    ["users", "first_name", f.student.id, 80], ["users", "last_name", f.student.id, 80],
    ["classrooms", "name", f.room.id, 120], ["classrooms", "subject", f.room.id, 120], ["classrooms", "division", f.room.id, 60],
    ["units", "name", f.unit.id, 120], ["topics", "name", f.topic.id, 120],
    ["materials", "title", material.id, 200], ["activities", "title", f.activity.id, 200],
    ["wall_posts", "body", post.id, 5000], ["wall_replies", "body", reply.id, 5000],
    ["grade_corrections", "reason", correction.id, 5000],
  ];
  for (const [table, column, id, maximum] of cases) {
    const update = value => db.query(`UPDATE "${table}" SET "${column}"=$1 WHERE id=$2 RETURNING "${column}"`, [value, id]);
    const boundary = ` ${"x".repeat(maximum - 2)} `;
    assert.equal((await update(boundary)).rows[0][column], boundary, `${table}.${column} preserves valid input`);
    await rejected(() => update(` ${"x".repeat(maximum)} `), "23514");
    await rejected(() => update("   "), "23514");
  }
});
contract("published grade prevents its submitted attempt from reverting to draft", async f => {
  await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1", [f.attempt.id]);
  const grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "8", published_at: new Date(), is_published: true });
  await db.query("UPDATE student_activities SET effective_grade_id=$1 WHERE id=$2", [grade.id, f.obligation.id]);
  await rejected(() => db.query("UPDATE attempts SET status='DRAFT',submitted_at=NULL,submitted_late=NULL,applied_deadline_at=NULL WHERE id=$1", [f.attempt.id]), "23514");
  assert.equal((await db.query("SELECT status FROM attempts WHERE id=$1", [f.attempt.id])).rows[0].status, "SUBMITTED");
});
test("published grade interlock serializes publication and draft reversion", async () => {
  const publisher = new pg.Client({ connectionString: process.env.DATABASE_URL });
  const editor = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await publisher.connect(); await editor.connect();
  let f;
  let grade;
  try {
    await db.query("BEGIN"); f = await fixture();
    await db.query("UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1", [f.attempt.id]);
    grade = await insert("attempt_grades", { id: randomUUID(), attempt_id: f.attempt.id, student_activity_id: f.obligation.id, activity_id: f.activity.id, graded_by_id: f.teacher.id, final_grade: "8" });
    await db.query("COMMIT");
    await publisher.query("BEGIN");
    await publisher.query("UPDATE attempt_grades SET is_published=true,published_at=now() WHERE id=$1", [grade.id]);
    await editor.query("BEGIN; SET LOCAL lock_timeout='100ms'");
    await assert.rejects(editor.query("UPDATE attempts SET status='DRAFT',submitted_at=NULL,submitted_late=NULL WHERE id=$1", [f.attempt.id]), e => e.code === "55P03");
    await editor.query("ROLLBACK"); await publisher.query("COMMIT");
    await assert.rejects(editor.query("UPDATE attempts SET status='DRAFT',submitted_at=NULL,submitted_late=NULL WHERE id=$1", [f.attempt.id]), e => e.code === "23514");
    await db.query("UPDATE attempt_grades SET is_published=false,published_at=NULL WHERE id=$1", [grade.id]);
    await editor.query("BEGIN");
    await editor.query("UPDATE attempts SET status='DRAFT',submitted_at=NULL,submitted_late=NULL WHERE id=$1", [f.attempt.id]);
    await publisher.query("BEGIN; SET LOCAL lock_timeout='100ms'");
    await assert.rejects(publisher.query("UPDATE attempt_grades SET is_published=true,published_at=now() WHERE id=$1", [grade.id]), e => e.code === "55P03");
    await publisher.query("ROLLBACK"); await editor.query("COMMIT");
    await assert.rejects(publisher.query("UPDATE attempt_grades SET is_published=true,published_at=now() WHERE id=$1", [grade.id]), e => e.code === "23514");
    assert.equal((await db.query("SELECT status FROM attempts WHERE id=$1", [f.attempt.id])).rows[0].status, "DRAFT");
    assert.equal((await db.query("SELECT is_published FROM attempt_grades WHERE id=$1", [grade.id])).rows[0].is_published, false);
  } finally {
    await publisher.query("ROLLBACK"); await editor.query("ROLLBACK"); await db.query("ROLLBACK");
    if (f && grade) {
      await db.query("DELETE FROM attempt_grades WHERE id=$1", [grade.id]);
      await db.query("DELETE FROM questions WHERE id=$1", [f.question.id]);
      await db.query("DELETE FROM attempts WHERE id=$1", [f.attempt.id]);
      await db.query("DELETE FROM student_activities WHERE id=$1", [f.obligation.id]);
      await db.query("DELETE FROM activities WHERE id=$1", [f.activity.id]);
      await db.query("DELETE FROM topics WHERE id=$1", [f.topic.id]);
      await db.query("DELETE FROM units WHERE id=$1", [f.unit.id]);
      await db.query("DELETE FROM enrollments WHERE id=$1", [f.enrollment.id]);
      await db.query("DELETE FROM classrooms WHERE id=$1", [f.room.id]);
      await db.query("DELETE FROM users WHERE id=ANY($1::uuid[])", [[f.teacher.id, f.student.id]]);
    }
    await publisher.end(); await editor.end();
  }
});
contract("durable job deduplication and claim fields are consistent", async () => {
  const row = await insert("background_jobs", { id: randomUUID(), type: "SCAN_FILE", payload: { fileId: randomUUID() }, deduplication_key: randomUUID() });
  await rejected(() => insert("background_jobs", { ...row, id: randomUUID() }), "23505");
  await rejected(() => db.query("UPDATE background_jobs SET attempt_count=-1 WHERE id=$1", [row.id]), "23514");
  await rejected(() => db.query("UPDATE background_jobs SET status='RUNNING' WHERE id=$1", [row.id]), "23514");
});
