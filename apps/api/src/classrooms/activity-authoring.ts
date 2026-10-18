import { randomUUID } from 'node:crypto';
import { WallService } from './wall.ts';
import { revision } from './drafts.ts';
import { fail, object, text, uuid } from './policy.ts';
import { activityOperation, activityPayload, activityType, exactActivityObject, type ActivityPayload, type ActivityType } from './activity-policy.ts';
import { deadlineChoices, resolveDeadline } from './activity-time.ts';
import { requireReady } from '../files/service.ts';
import type { Transaction } from './contracts.ts';
import { recordActivityEligibility } from './activity-eligibility.ts';
import { activityEvent, deadlineChanged } from './activity-events.ts';

export interface ActivityRow {
  id: string; classroom_id: string; type: ActivityType; title: string | null; unit_id: string | null; topic_id: string | null;
  instructions_text: string | null; attachments_required: boolean; status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  published_at: Date | null; deadline_at: Date | null; allow_late_submissions: boolean; first_started_at: Date | null;
}
interface QuestionRow { id: string; type: string; prompt: string; points: string; scoringRule: string | null }
interface OptionRow { id: string; question_id: string; text: string; correct: boolean }

/** All authoring and future attempt-start operations serialize on the existing classroom lock. */
export class ActivityAuthoringService extends WallService {
  protected async activity(tx: Transaction, classroomId: string, id: string): Promise<ActivityRow> {
    if (!uuid(id)) return fail('FORBIDDEN');
    const [row] = await tx.query<ActivityRow>('SELECT * FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE', id, classroomId);
    if (!row) return fail('FORBIDDEN');
    return row;
  }

  listActivities(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, classroomId);
      const teacher = room.teacher_id === actor.id;
      const rows = await tx.query<ActivityRow>(`SELECT * FROM activities WHERE classroom_id=$1::uuid
        AND ($2::boolean OR status='PUBLISHED') ORDER BY created_at DESC,id`, classroomId, teacher);
      return { revision: room.revision.toString(), activities: rows.map(row => this.activitySummary(row, room.timezone)) };
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
          await this.activityAssociation(tx, classroomId, op.unitId, op.topicId, row.status === 'PUBLISHED');
          await tx.query(`UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=$5 WHERE id=$1::uuid RETURNING id`,
            id, title, op.unitId, op.topicId, actor.now);
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
          await this.activityAssociation(tx, classroomId, payload.unitId, payload.topicId, row.status === 'PUBLISHED');
          await this.validateLinks(tx, request, row, payload);
          await tx.query(`UPDATE activities SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,instructions_text=$5,
            attachments_required=$6,deadline_at=$7,allow_late_submissions=$8,updated_at=$9 WHERE id=$1::uuid RETURNING id`,
            id, payload.title, payload.unitId, payload.topicId, payload.instructions, payload.attachmentRequired, deadline, payload.allowLate, actor.now);
          await this.replaceContent(tx, row, payload);
          if (row.status === 'PUBLISHED' && deadlineChanged(row.deadline_at, deadline, row.allow_late_submissions, payload.allowLate))
            await activityEvent(tx, classroomId, id, 'ACTIVITY_DEADLINE_CHANGED');
        } else if (op.action === 'publish') {
          if (row.first_started_at || row.status === 'PUBLISHED') return fail('CONFLICT');
          const view = await this.activityView(tx, row, room.timezone, true);
          const payload = activityPayload({ title: view.title ?? '', unitId: view.unitId, topicId: view.topicId,
            instructions: view.instructions ?? '', attachmentRequired: view.attachmentRequired,
            instructionFileIds: view.instructionFiles.map(f => f.id), materialIds: view.materials.map(m => m.id),
            questions: view.questions.map(q => ({ type: q.type, prompt: q.prompt, points: q.points, scoringRule: q.scoringRule,
              options: q.options.map(o => ({ text: o.text, correct: o.correct })) })),
            deadline: null, allowLate: view.allowLate }, row.type, true);
          await this.activityAssociation(tx, classroomId, payload.unitId, payload.topicId, true);
          await this.validateLinks(tx, request, row, payload);
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

  private async activityAssociation(tx: Transaction, classroomId: string, unitId: unknown, topicId: unknown, required: boolean) {
    if ((unitId !== null && !uuid(unitId)) || (topicId !== null && !uuid(topicId))
      || (topicId !== null && unitId === null) || (required && (unitId === null || topicId === null))) return fail('INVALID_INPUT');
    if (unitId !== null) {
      const [unit] = await tx.query('SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', unitId, classroomId);
      if (!unit) return fail('FORBIDDEN');
    }
    if (topicId !== null) {
      const [topic] = await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE', topicId, unitId, classroomId);
      if (!topic) return fail('FORBIDDEN');
    }
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

  private async replaceContent(tx: Transaction, row: ActivityRow, payload: ActivityPayload) {
    // Reachable only before first participation, under the same classroom lock used by starts.
    await tx.query('DELETE FROM question_options WHERE question_id IN (SELECT id FROM questions WHERE activity_id=$1::uuid) RETURNING id', row.id);
    await tx.query('DELETE FROM questions WHERE activity_id=$1::uuid RETURNING id', row.id);
    await tx.query('DELETE FROM activity_instruction_files WHERE activity_id=$1::uuid RETURNING file_id', row.id);
    await tx.query('DELETE FROM activity_materials WHERE activity_id=$1::uuid RETURNING material_id', row.id);
    for (const file of payload.instructionFileIds) await tx.query(`INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id)
      VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING file_id`, row.id, row.classroom_id, file);
    for (const material of payload.materialIds) await tx.query(`INSERT INTO activity_materials(activity_id,classroom_id,material_id)
      VALUES($1::uuid,$2::uuid,$3::uuid) RETURNING material_id`, row.id, row.classroom_id, material);
    for (const [position, q] of payload.questions.entries()) {
      const id = randomUUID();
      await tx.query(`INSERT INTO questions(id,updated_at,activity_id,type,prompt,position,available_points,scoring_rule)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::"QuestionType",$4,$5,$6::numeric,$7::"ScoringRule") RETURNING id`,
        id, row.id, q.type, q.prompt, position, q.points, q.scoringRule);
      for (const [optionPosition, option] of q.options.entries()) await tx.query(`INSERT INTO question_options(id,updated_at,question_id,text,position,is_correct)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4,$5) RETURNING id`, randomUUID(), id, option.text, optionPosition, option.correct);
    }
  }

  protected activitySummary(row: ActivityRow, zone: string) {
    return { id: row.id, type: row.type, title: row.title, unitId: row.unit_id, topicId: row.topic_id,
      status: row.status, publishedAt: row.published_at, deadlineAt: row.deadline_at, allowLate: row.allow_late_submissions,
      locked: row.first_started_at !== null, zone };
  }

  protected studentActivityView(tx: Transaction, row: ActivityRow, zone: string, _studentId: string, _archived = false) {
    return this.activityView(tx, row, zone, false);
  }

  protected async activityView(tx: Transaction, row: ActivityRow, zone: string, teacher: boolean) {
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
    return { ...this.activitySummary(row, zone), instructions: row.instructions_text, attachmentRequired: row.attachments_required,
      instructionFiles, materials, questions: questions.map(q => ({ id: q.id, type: q.type, prompt: q.prompt, points: q.points,
        ...(teacher ? { scoringRule: q.scoringRule } : {}), options: options.filter(o => o.question_id === q.id)
          .map(o => ({ id: o.id, text: o.text, ...(teacher ? { correct: o.correct } : {}) })) })) };
  }
}
