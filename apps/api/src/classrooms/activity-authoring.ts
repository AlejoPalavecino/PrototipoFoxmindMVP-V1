import { randomUUID } from 'node:crypto';
import { replaceActivityContent } from './activity-content.ts';
import type { ClassroomCore } from './core.ts';
import type { ClassroomFileOperations } from './classroom-file.ts';
import type { studentActivityView } from './activity-session.ts';
import { isVerifiedRead } from './context.ts';
import { revision } from './revision.ts';
import { fail, object, text, uuid } from './policy.ts';
import { activityOperation, activityPayload, activityType, exactActivityObject, type ActivityPayload, type ActivityType } from './activity-policy.ts';
import { deadlineChoices, resolveDeadline } from './activity-time.ts';
import { requireReady } from '../files/service.ts';
import type { Transaction } from './contracts.ts';
import { recordActivityEligibility } from './activity-eligibility.ts';
import { activityEvent, deadlineChanged } from './activity-events.ts';
import { activityTopics, validateActivityTopics, replaceActivityTopics, readActivityTopics } from './activity-topics.ts';
import type { EvaluationRubric } from '../../../../src/core/domain/evaluation-rubric.ts';

export interface ActivityRow {
  id: string; classroom_id: string; type: ActivityType; title: string | null; unit_id: string | null; topic_id: string | null;
  objective?: string | null; teacher_comment?: string | null; instructions_text: string | null; ai_grading_rubric?: string; evaluation_rubric?: EvaluationRubric; attachments_required: boolean; status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  published_at: Date | null; deadline_at: Date | null; allow_late_submissions: boolean; first_started_at: Date | null;
}
interface QuestionRow { id: string; type: string; prompt: string; points: string; scoringRule: string | null }
interface OptionRow { id: string; question_id: string; text: string; correct: boolean }

/** All authoring and future attempt-start operations serialize on the existing classroom lock. */
export class ActivityAuthoringService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly ports: ClassroomCore['ports'];
  private readonly readyClassroomFile: ClassroomFileOperations['readyClassroomFile'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  private readonly studentActivityView: (...args: Parameters<typeof studentActivityView> extends [unknown, ...infer Rest] ? Rest : never) => ReturnType<typeof studentActivityView>;
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>, dependencies: Pick<ClassroomFileOperations, 'readyClassroomFile' | 'advanceRevision'> & { studentActivityView: ActivityAuthoringService['studentActivityView'] }) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.readyClassroomFile = dependencies.readyClassroomFile; this.advanceRevision = dependencies.advanceRevision;
    this.studentActivityView = dependencies.studentActivityView;
  }
  async activity(tx: Transaction, classroomId: string, id: string): Promise<ActivityRow> {
    if (!uuid(id)) return fail('FORBIDDEN');
    const [row] = await tx.query<ActivityRow>(`SELECT * FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid FOR ${isVerifiedRead(tx) ? 'SHARE' : 'UPDATE'}`, id, classroomId);
    if (!row) return fail('FORBIDDEN');
    return row;
  }

  listActivities(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const teacher = room.teacher_id === actor.id;
      const rows = await tx.query<ActivityRow>(`SELECT * FROM activities WHERE classroom_id=$1::uuid
        AND ($2::boolean OR status='PUBLISHED') ORDER BY created_at DESC,id`, classroomId, teacher);
      return { revision: room.revision.toString(), activities: await Promise.all(rows.map(async row => ({ ...this.activitySummary(row, room.timezone),
        topicIds: await readActivityTopics(tx, row.id, row.topic_id) }))) };
    });
  }

  activityDetail(request: unknown, classroomId: string, id: string, preview = false) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, preview);
      const row = await this.activity(tx, classroomId, id), teacher = room.teacher_id === actor.id;
      if (!teacher && row.status !== 'PUBLISHED') return fail('FORBIDDEN');
      return { revision: room.revision.toString(), preview: teacher, activity: teacher
        ? await this.activityView(tx, row, room.timezone, true)
        : await this.studentActivityView(tx, row, room.timezone, actor.id, room.archived_at !== null) };
    });
  }

  activityDeadlineChoices(request: unknown, classroomId: string, input: unknown) {
    const body = exactActivityObject(input, ['local']);
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, false, true);
      return deadlineChoices(room.timezone, body.local);
    });
  }

  changeActivities(request: unknown, classroomId: string, input: unknown) {
    const body = exactActivityObject(input, ['revision', 'operation']), expected = revision(body.revision);
    const op = activityOperation(body.operation);
    return this.run(request, true, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId, true, true);
      if (room.revision.toString() !== expected) return fail('CONFLICT');
      let id: string;
      if (op.action === 'create') {
        id = randomUUID();
        await tx.query(`INSERT INTO activities(id,updated_at,classroom_id,type) VALUES($1::uuid,$2,$3::uuid,$4::"ActivityType") RETURNING id`,
          id, actor.now, classroomId, activityType(op.type));
      } else {
        id = op.id;
        const row = await this.activity(tx, classroomId, id);
        if (op.action === 'metadata') {
          const title = text(op.title, 200, row.status === 'PUBLISHED') || null;
          const selection = activityTopics(op, row.status === 'PUBLISHED');
          await validateActivityTopics(tx, classroomId, selection.unitId, selection.topicIds);
          await replaceActivityTopics(tx, id, classroomId, selection.unitId, []);
          await tx.query(`UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=$5 WHERE id=$1::uuid RETURNING id`,
            id, title, selection.unitId, selection.topicId, actor.now);
          await replaceActivityTopics(tx, id, classroomId, selection.unitId, selection.topicIds);
        } else if (op.action === 'deadline') {
          if (typeof op.allowLate !== 'boolean') return fail('INVALID_INPUT');
          const deadline = resolveDeadline(room.timezone, op.deadline);
          this.checkDeadlineChange(row, deadline, op.allowLate);
          await tx.query(`UPDATE activities SET deadline_at=$2,allow_late_submissions=$3,updated_at=$4 WHERE id=$1::uuid RETURNING id`,
            id, deadline, op.allowLate, actor.now);
          if (row.status === 'PUBLISHED' && deadlineChanged(row.deadline_at, deadline, row.allow_late_submissions, op.allowLate))
            await activityEvent(tx, classroomId, id, 'ACTIVITY_DEADLINE_CHANGED');
        } else if (op.action === 'save') {
          // Reject all content saves after participation, even an apparently identical payload.
          // Metadata and deadline have separate, narrower commands and never rebuild question identities.
          if (row.first_started_at) return fail('CONFLICT');
          const payload = activityPayload(op.payload, row.type, row.status === 'PUBLISHED');
          const deadline = resolveDeadline(room.timezone, payload.deadline);
          await validateActivityTopics(tx, classroomId, payload.unitId, payload.topicIds);
          await this.validateLinks(tx, request, row, payload);
          await replaceActivityTopics(tx, id, classroomId, payload.unitId, []);
          await tx.query(`UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,instructions_text=$5,
            attachments_required=$6,deadline_at=$7,allow_late_submissions=$8,updated_at=$9,
            ai_grading_rubric=COALESCE($10::text,ai_grading_rubric),evaluation_rubric=COALESCE($11::jsonb,evaluation_rubric),
            objective=CASE WHEN $12::boolean THEN $13::text ELSE objective END,
            teacher_comment=CASE WHEN $14::boolean THEN $15::text ELSE teacher_comment END WHERE id=$1::uuid RETURNING id`,
            id, payload.title, payload.unitId, payload.topicId, payload.instructions, payload.attachmentRequired, deadline, payload.allowLate, actor.now,
            Object.hasOwn(op.payload, 'aiGradingRubric') ? payload.aiGradingRubric : null,
            Object.hasOwn(op.payload, 'evaluationRubric') ? JSON.stringify(payload.evaluationRubric) : null,
            Object.hasOwn(op.payload, 'objective'), payload.objective ?? null, Object.hasOwn(op.payload, 'teacherComment'), payload.teacherComment ?? null);
          await replaceActivityTopics(tx, id, classroomId, payload.unitId, payload.topicIds);
          await replaceActivityContent(tx, row, payload);
          if (row.status === 'PUBLISHED' && deadlineChanged(row.deadline_at, deadline, row.allow_late_submissions, payload.allowLate))
            await activityEvent(tx, classroomId, id, 'ACTIVITY_DEADLINE_CHANGED');
        } else if (op.action === 'publish') {
          if (row.first_started_at || row.status === 'PUBLISHED') return fail('CONFLICT');
          const view = await this.activityView(tx, row, room.timezone, true);
          const payload = activityPayload({ title: view.title ?? '', unitId: view.unitId, topicIds: view.topicIds,
            instructions: view.instructions ?? '', attachmentRequired: view.attachmentRequired,
            instructionFileIds: view.instructionFiles.map(f => f.id), materialIds: view.materials.map(m => m.id),
            questions: view.questions.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, scoringRule: q.scoringRule,
              options: q.options.map(o => ({ text: o.text, correct: o.correct })) })),
            deadline: null, allowLate: view.allowLate, evaluationRubric: view.evaluationRubric }, row.type, true);
          await validateActivityTopics(tx, classroomId, payload.unitId, payload.topicIds);
          await this.validateLinks(tx, request, row, payload);
          await this.ports.validateActivityGeneration?.(tx, request, id);
          await tx.query(`UPDATE activities SET status='PUBLISHED',published_at=$2,updated_at=$2 WHERE id=$1::uuid RETURNING id`, id, actor.now);
          await recordActivityEligibility(tx, classroomId, { publication: id });
          await activityEvent(tx, classroomId, id, 'ACTIVITY_PUBLISHED');
        } else if (op.action === 'withdraw') {
          if (row.first_started_at || row.status !== 'PUBLISHED') return fail('CONFLICT');
          await tx.query(`UPDATE activities SET status='WITHDRAWN',updated_at=$2 WHERE id=$1::uuid RETURNING id`, id, actor.now);
        } else return fail('INVALID_INPUT');
      }
      return { ...await this.advanceRevision(tx, classroomId, room.revision), id };
    });
  }

  protected checkDeadlineChange(row: ActivityRow, deadline: Date | null, allowLate: boolean) {
    if (!row.first_started_at) return;
    if (row.deadline_at === null ? deadline !== null : deadline === null || deadline.getTime() < row.deadline_at.getTime()) return fail('CONFLICT');
    if (row.allow_late_submissions && !allowLate) return fail('CONFLICT');
  }

  private async validateLinks(tx: Transaction, request: unknown, row: ActivityRow, payload: ActivityPayload) {
    for (const id of payload.instructionFileIds) {
      const file = await this.ports.files.load(tx, id);
      if (file.classroom_id !== row.classroom_id || file.classroom_draft_id !== null || file.purpose !== 'instructions'
        || file.target_id !== row.id) return fail('FORBIDDEN');
      const current = await this.ports.files.loadAuthorized(tx, request, id, 'read');
      requireReady(current);
      if (!['pdf', 'docx'].includes(current.extension) || current.blob_deleted_at) return fail('CONFLICT');
    }
    for (const id of payload.materialIds) {
      const [material] = await tx.query<{ file_id: string; deleted_at: Date | null }>(
        'SELECT file_id,deleted_at FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', id, row.classroom_id);
      if (!material) return fail('FORBIDDEN');
      if (material.deleted_at) return fail('CONFLICT');
      await this.readyClassroomFile(tx, request, row.classroom_id, material.file_id, 'material');
    }
  }

  activitySummary(row: ActivityRow, zone: string) {
    return { id: row.id, type: row.type, title: row.title, unitId: row.unit_id, topicId: row.topic_id, topicIds: row.topic_id ? [row.topic_id] : [],
      status: row.status, publishedAt: row.published_at, deadlineAt: row.deadline_at, allowLate: row.allow_late_submissions,
      locked: row.first_started_at !== null, zone };
  }

  async activityView(tx: Transaction, row: ActivityRow, zone: string, teacher: boolean) {
    const questions = await tx.query<QuestionRow>(`SELECT id,type,prompt,available_points::text AS points,scoring_rule AS "scoringRule"
      FROM questions WHERE activity_id=$1::uuid ORDER BY position,id`, row.id);
    const options = await tx.query<OptionRow>(`SELECT o.id,o.question_id,o.text,o.is_correct AS correct FROM question_options o
      JOIN questions q ON q.id=o.question_id WHERE q.activity_id=$1::uuid ORDER BY o.position,o.id`, row.id);
    const instructionFiles = await tx.query<{ id: string; name: string; extension: string; ready: boolean }>(`SELECT f.id,f.original_name AS name,f.extension,
      (f.blob_deleted_at IS NULL AND c.phase='ready' AND u.status='COMPLETED' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
       AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready
      FROM activity_instruction_files a JOIN files f ON f.id=a.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
      WHERE a.activity_id=$1::uuid ORDER BY f.created_at,f.id`, row.id);
    const materials = await tx.query<{ id: string; title: string; fileId: string; extension: string }>(`SELECT m.id,m.title,m.file_id AS "fileId",f.extension
      FROM activity_materials a JOIN materials m ON m.id=a.material_id JOIN files f ON f.id=m.file_id WHERE a.activity_id=$1::uuid ORDER BY m.created_at,m.id`, row.id);
    // Explicit DTO construction: never spread SQL rows or expose answer keys/private grade/editor state to students.
    return { ...this.activitySummary(row, zone), evaluationRubric: row.evaluation_rubric ?? [], ...(teacher ? { aiGradingRubric: row.ai_grading_rubric ?? '' } : {}), topicIds: await readActivityTopics(tx, row.id, row.topic_id), objective: row.objective ?? null, teacherComment: row.teacher_comment ?? null, instructions: row.instructions_text, attachmentRequired: row.attachments_required,
      instructionFiles, materials, questions: questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, points: q.points,
        ...(teacher ? { scoringRule: q.scoringRule } : {}), options: options.filter(o => o.question_id === q.id)
          .map(o => ({ id: o.id, text: o.text, ...(teacher ? { correct: o.correct } : {}) })) })) };
  }
}
