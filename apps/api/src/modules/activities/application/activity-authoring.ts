import type { AuthoringRepository } from './authoring-repository.ts';
import type { AuthoringOperations } from './authoring-operations.ts';
import type { AcademicFeatureContext } from '../../classrooms/public.ts';
import type { ClassroomFileOperations } from '../../materials/public.ts';
import { isVerifiedRead } from '../../classrooms/public.ts';
import { revision } from '../../classrooms/public.ts';
import { fail, object, text, uuid } from '../../classrooms/public.ts';
import { activityOperation, activityPayload, activityType, exactActivityObject, type ActivityPayload, type ActivityType } from '../domain/activity-policy.ts';
import { deadlineChoices, resolveDeadline } from '../domain/activity-time.ts';
import { requireReady } from '../../files/public.ts';
import type { Transaction } from '../../classrooms/public.ts';
import { activityTopics } from '../domain/topic-selection.ts';
import type { EvaluationRubric } from '../../../../../../src/core/domain/grading/evaluation-rubric.ts';
import {studentActivityState,type StudentActivityListRow} from '../domain/activity-list-state.ts';

export interface ActivityRow {
  id: string; classroom_id: string; type: ActivityType; title: string | null; unit_id: string | null; topic_id: string | null;
  objective?: string | null; teacher_comment?: string | null; instructions_text: string | null; ai_grading_rubric?: string; evaluation_rubric?: EvaluationRubric; attachments_required: boolean; status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  published_at: Date | null; deadline_at: Date | null; allow_late_submissions: boolean; first_started_at: Date | null;
}
interface QuestionRow { id: string; type: string; prompt: string; points: string; scoringRule: string | null }
interface OptionRow { id: string; question_id: string; text: string; correct: boolean }

/** All authoring and future attempt-start operations serialize on the existing classroom lock. */
export class ActivityAuthoringService {
  private readonly run: AcademicFeatureContext['run'];
  private readonly classroom: AcademicFeatureContext['classroom'];
  private readonly ports: AcademicFeatureContext['ports'];
  private readonly readyClassroomFile: ClassroomFileOperations['readyClassroomFile'];
  private readonly advanceRevision: ClassroomFileOperations['advanceRevision'];
  private readonly studentActivityView: (tx: Transaction, row: ActivityRow, zone: string, studentId: string, archived?: boolean) => ReturnType<ActivityAuthoringService['activityView']>;
  constructor(context: Pick<AcademicFeatureContext, 'run' | 'classroom' | 'ports'>, dependencies: Pick<ClassroomFileOperations, 'readyClassroomFile' | 'advanceRevision'> & { studentActivityView: ActivityAuthoringService['studentActivityView'] }, private readonly repository: AuthoringRepository, private readonly operations: AuthoringOperations) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.ports = context.ports;
    this.readyClassroomFile = dependencies.readyClassroomFile; this.advanceRevision = dependencies.advanceRevision;
    this.studentActivityView = dependencies.studentActivityView;
  }
  async activity(tx: Transaction, classroomId: string, id: string): Promise<ActivityRow> {
    if (!uuid(id)) return fail('FORBIDDEN');
    const [row] = await this.repository.readActivities01<ActivityRow>(tx, isVerifiedRead(tx) ? 'SHARE' : 'UPDATE', id, classroomId);
    if (!row) return fail('FORBIDDEN');
    return row;
  }

  listActivities(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const teacher = room.teacher_id === actor.id;
      const rows = await this.repository.readActivities02<ActivityRow>(tx, classroomId, teacher);
      const pending = teacher ? await this.repository.readAttempts03<{activity_id:string;count:number}>(tx, classroomId) : [];
      const pendingByActivity = new Map(pending.map(item => [item.activity_id,item.count]));
      const own = teacher ? [] : await this.repository.readStudentActivities04<StudentActivityListRow>(tx, classroomId, actor.id);
      const ownByActivity=new Map(own.map(item=>[item.activity_id,item]));
      return { revision: room.revision.toString(), activities: await Promise.all(rows.map(async row => ({ ...this.activitySummary(row, room.timezone),
        ...(teacher ? {pendingReviewCount:pendingByActivity.get(row.id) ?? 0} : {}),
        ...(!teacher ? {studentState:studentActivityState(row,ownByActivity.get(row.id),actor.now)} : {}),
        topicIds: await this.operations.readActivityTopics(tx, row.id, row.topic_id) }))) };
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
        id = this.operations.randomUUID();
        await this.repository.insertActivities05(tx, id, actor.now, classroomId, activityType(op.type));
      } else {
        id = op.id;
        const row = await this.activity(tx, classroomId, id);
        if (op.action === 'metadata') {
          const title = text(op.title, 200, row.status === 'PUBLISHED') || null;
          const selection = activityTopics(op, row.status === 'PUBLISHED');
          await this.operations.validateActivityTopics(tx, classroomId, selection.unitId, selection.topicIds);
          await this.operations.replaceActivityTopics(tx, id, classroomId, selection.unitId, []);
          await this.repository.updateActivities06(tx, id, title, selection.unitId, selection.topicId, actor.now);
          await this.operations.replaceActivityTopics(tx, id, classroomId, selection.unitId, selection.topicIds);
        } else if (op.action === 'deadline') {
          if (typeof op.allowLate !== 'boolean') return fail('INVALID_INPUT');
          const deadline = resolveDeadline(room.timezone, op.deadline);
          this.checkDeadlineChange(row, deadline, op.allowLate);
          await this.repository.updateActivities07(tx, id, deadline, op.allowLate, actor.now);
          if (row.status === 'PUBLISHED' && this.operations.deadlineChanged(row.deadline_at, deadline, row.allow_late_submissions, op.allowLate))
            await this.operations.activityEvent(tx, classroomId, id, 'ACTIVITY_DEADLINE_CHANGED');
        } else if (op.action === 'save') {
          // Reject all content saves after participation, even an apparently identical payload.
          // Metadata and deadline have separate, narrower commands and never rebuild question identities.
          if (row.first_started_at) return fail('CONFLICT');
          const payload = activityPayload(op.payload, row.type, row.status === 'PUBLISHED');
          const deadline = resolveDeadline(room.timezone, payload.deadline);
          await this.operations.validateActivityTopics(tx, classroomId, payload.unitId, payload.topicIds);
          await this.validateLinks(tx, request, row, payload);
          await this.operations.replaceActivityTopics(tx, id, classroomId, payload.unitId, []);
          await this.repository.updateActivities08(tx, id, payload.title, payload.unitId, payload.topicId, payload.instructions, payload.attachmentRequired, deadline, payload.allowLate, actor.now, Object.hasOwn(op.payload, 'aiGradingRubric') ? payload.aiGradingRubric : null, Object.hasOwn(op.payload, 'evaluationRubric') ? JSON.stringify(payload.evaluationRubric) : null, Object.hasOwn(op.payload, 'objective'), payload.objective ?? null, Object.hasOwn(op.payload, 'teacherComment'), payload.teacherComment ?? null);
          await this.operations.replaceActivityTopics(tx, id, classroomId, payload.unitId, payload.topicIds);
          await this.operations.replaceActivityContent(tx, row, payload);
          if (row.status === 'PUBLISHED' && this.operations.deadlineChanged(row.deadline_at, deadline, row.allow_late_submissions, payload.allowLate))
            await this.operations.activityEvent(tx, classroomId, id, 'ACTIVITY_DEADLINE_CHANGED');
        } else if (op.action === 'publish') {
          if (row.first_started_at || row.status === 'PUBLISHED') return fail('CONFLICT');
          const view = await this.activityView(tx, row, room.timezone, true);
          const payload = activityPayload({ title: view.title ?? '', unitId: view.unitId, topicIds: view.topicIds,
            instructions: view.instructions ?? '', attachmentRequired: view.attachmentRequired,
            instructionFileIds: view.instructionFiles.map(f => f.id), materialIds: view.materials.map(m => m.id),
            questions: view.questions.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, scoringRule: q.scoringRule,
              options: q.options.map(o => ({ text: o.text, correct: o.correct })) })),
            deadline: null, allowLate: view.allowLate, evaluationRubric: view.evaluationRubric }, row.type, true);
          await this.operations.validateActivityTopics(tx, classroomId, payload.unitId, payload.topicIds);
          await this.validateLinks(tx, request, row, payload);
          await this.ports.validateActivityGeneration?.(tx, request, id);
          await this.repository.updateActivities09(tx, id, actor.now);
          await this.operations.recordActivityEligibility(tx, classroomId, { publication: id });
          await this.operations.activityEvent(tx, classroomId, id, 'ACTIVITY_PUBLISHED');
        } else if (op.action === 'withdraw') {
          if (row.first_started_at || row.status !== 'PUBLISHED') return fail('CONFLICT');
          await this.repository.updateActivities10(tx, id, actor.now);
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
      const [material] = await this.repository.readMaterials11<{ file_id: string; deleted_at: Date | null }>(tx, id, row.classroom_id);
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
    const questions = await this.repository.readQuestions12<QuestionRow>(tx, row.id);
    const options = await this.repository.readQuestionOptions13<OptionRow>(tx, row.id);
    const instructionFiles = await this.repository.readActivityInstructionFiles14<{ id: string; name: string; extension: string; ready: boolean }>(tx, row.id);
    const materials = await this.repository.readActivityMaterials15<{ id: string; title: string; fileId: string; extension: string }>(tx, row.id);
    // Explicit DTO construction: never spread SQL rows or expose answer keys/private grade/editor state to students.
    return { ...this.activitySummary(row, zone), evaluationRubric: row.evaluation_rubric ?? [], ...(teacher ? { aiGradingRubric: row.ai_grading_rubric ?? '' } : {}), topicIds: await this.operations.readActivityTopics(tx, row.id, row.topic_id), objective: row.objective ?? null, teacherComment: row.teacher_comment ?? null, instructions: row.instructions_text, attachmentRequired: row.attachments_required,
      instructionFiles, materials, questions: questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, points: q.points,
        ...(teacher ? { scoringRule: q.scoringRule } : {}), options: options.filter(o => o.question_id === q.id)
          .map(o => ({ id: o.id, text: o.text, ...(teacher ? { correct: o.correct } : {}) })) })) };
  }
}
