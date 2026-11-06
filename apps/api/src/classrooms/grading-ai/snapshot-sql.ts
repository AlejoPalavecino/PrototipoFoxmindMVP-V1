import { createHash } from 'node:crypto';
import type { Transaction } from '../contracts.ts';
import type { GradingAiLease } from './sql-queue.ts';
import { createGradingAiSnapshot, type GradingAiSnapshotInput } from './snapshot.ts';

type Activity = { id: string; type: GradingAiSnapshotInput['activity']['type']; title: string | null; instructions: string | null; epoch: string; rubric: string; practicalResponse:string };
type Question = { id: string; type: 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'; prompt: string; points: string; text: string | null };
type Option = { id: string; question_id: string; text: string; correct: boolean };
type Selection = { question_id: string; option_id: string };
/** Read a stable academic snapshot under the classroom lock; file content is not read in this transaction. */
export async function gradingAiSnapshotFromSql(tx: Transaction, job: GradingAiLease, texts: Record<string, string> = {}, listOnly = false, fenceOnly = false) {
  const [activity] = await tx.query<Activity>(`SELECT a.id,a.type,a.title,a.instructions_text AS instructions,
    j.epoch::text AS epoch,j.rubric_snapshot AS rubric,attempt.practical_response AS "practicalResponse" FROM grading_ai_jobs j JOIN activities a ON a.id=j.activity_id JOIN attempts attempt ON attempt.id=j.attempt_id
    WHERE j.id=$1::uuid AND j.attempt_id=$2::uuid`, job.id, job.attemptId);
  if (!activity) throw new Error('SOURCE_UNAVAILABLE');
  const readFiles = () => tx.query<{ id: string; digest: string | null; ready: boolean; kind: string }>(`SELECT f.id,c.digest,
    (f.blob_deleted_at IS NULL AND f.classroom_id=$2::uuid AND c.phase='ready' AND u.status='COMPLETED'
      AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND c.digest IS NOT NULL
      AND c.digest=c.validated_digest AND c.digest=c.scanned_digest AND f.size_bytes<=20000000
      AND ((x.kind='attachment' AND c.purpose='attachment' AND EXISTS (
        SELECT 1 FROM attempts cur JOIN attempts old ON old.id=c.target_id AND old.activity_id=cur.activity_id
          AND old.student_activity_id=cur.student_activity_id AND old.status='SUBMITTED'
        JOIN student_activities sa ON sa.id=cur.student_activity_id JOIN enrollments e ON e.id=sa.enrollment_id
        WHERE cur.id=$1::uuid AND f.uploaded_by_id=e.student_id))
        OR (x.kind='instruction' AND c.purpose='instructions' AND c.target_id=$3::uuid AND f.uploaded_by_id=$4::uuid))) AS ready,
    x.kind FROM (SELECT file_id,'attachment'::text AS kind,position AS ord FROM attempt_attachments WHERE attempt_id=$1::uuid
      UNION ALL SELECT file_id,'instruction'::text,0 FROM activity_instruction_files WHERE activity_id=$3::uuid) x
    JOIN files f ON f.id=x.file_id LEFT JOIN file_custodies c ON c.file_id=f.id LEFT JOIN uploads u ON u.file_id=f.id
    ORDER BY x.kind,x.ord,f.id`, job.attemptId, job.classroomId, job.activityId, job.ownerId);
  let files = await readFiles();
  for (const file of files) {
    await tx.query('SELECT id FROM files WHERE id=$1::uuid FOR SHARE', file.id);
    await tx.query('SELECT file_id FROM file_custodies WHERE file_id=$1::uuid FOR SHARE', file.id);
    await tx.query('SELECT id FROM uploads WHERE file_id=$1::uuid FOR SHARE', file.id);
  }
  files = await readFiles();
  if (files.some(f => !f.ready || !f.digest)) throw new Error('SOURCE_UNAVAILABLE');
  if (listOnly) {
    if (files.some(f => !f.ready || !f.digest)) throw new Error('SOURCE_UNAVAILABLE');
    return { files };
  }
  const questions = await tx.query<Question>(`SELECT q.id,q.type,q.prompt,q.available_points::text AS points,a.development_text AS text
    FROM questions q LEFT JOIN answers a ON a.question_id=q.id AND a.attempt_id=$2::uuid
    WHERE q.activity_id=$1::uuid ORDER BY q.position,q.id`, job.activityId, job.attemptId);
  const options = await tx.query<Option>(`SELECT o.id,o.question_id,o.text,o.is_correct AS correct FROM question_options o
    JOIN questions q ON q.id=o.question_id WHERE q.activity_id=$1::uuid ORDER BY q.position,q.id,o.position,o.id`, job.activityId);
  const selections = await tx.query<Selection>(`SELECT a.question_id,s.option_id FROM answers a JOIN answer_selections s ON s.answer_id=a.id
    WHERE a.attempt_id=$1::uuid ORDER BY a.question_id,s.option_id`, job.attemptId);
  const grades = await tx.query(`SELECT g.id,g.final_grade::text,g.overall_feedback,g.is_published,g.updated_at,
    COALESCE((SELECT jsonb_agg(jsonb_build_object('questionId',q.question_id,'n',q.earned_numerator::text,
    'd',q.earned_denominator::text,'feedback',q.feedback) ORDER BY q.question_id) FROM question_grades q WHERE q.attempt_grade_id=g.id),'[]') AS questions
    FROM attempt_grades g WHERE g.attempt_id=$1::uuid`, job.attemptId);
  const fingerprint = createHash('sha256').update(JSON.stringify({ activity, attemptId: job.attemptId, files, questions, options, selections, grades })).digest('hex');
  const textFor = (id: string) => fenceOnly ? 'contenido validado por digest' : texts[id];
  return { files, fingerprint, snapshot: createGradingAiSnapshot({ epoch: activity.epoch, rubricSnapshot: activity.rubric,
    activity: { id: activity.id, type: activity.type, title: activity.title, instructions: activity.instructions,
      questions: questions.map(q => ({ ...q, manual: q.type === 'DEVELOPMENT' && !!q.text?.trim(),
        options: options.filter(o => o.question_id === q.id).map(o => ({ id: o.id, text: o.text, correct: o.correct })),
        answer: { text: q.text, optionIds: selections.filter(s => s.question_id === q.id).map(s => s.option_id) } })) },
    attempt: { id: job.attemptId,...(activity.type==='ASSIGNMENT'?{practicalResponse:activity.practicalResponse}:{}), attachments: files.filter(f => f.kind === 'attachment').map(f => ({ id: f.id, digest: f.digest ?? '', ready: f.ready, text: textFor(f.id) })) },
    instructionFiles: files.filter(f => f.kind === 'instruction').map(f => ({ id: f.id, digest: f.digest ?? '', ready: f.ready, text: textFor(f.id) })), grade: grades[0] ?? null }) };
}
