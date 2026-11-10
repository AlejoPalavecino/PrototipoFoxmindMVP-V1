import { randomUUID } from 'node:crypto';
import type { ClassroomRuntimeAccess } from './access.ts';
import { draftPayload, fail, object, uuid } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import { newClassroomCode } from './classroom-codes.ts';
import { revision } from './revision.ts';

export interface DraftRow {
  id: string;
  owner_id: string;
  revision: bigint;
  payload: unknown;
  published_classroom_id: string | null;
}

type DraftPublicationAccess = Pick<ClassroomRuntimeAccess, 'run' | 'classroom'> & {
  ports: Pick<ClassroomRuntimeAccess['ports'], 'files' | 'classroomQuotaBytes' | 'gradingAiAvailable' | 'deliveryKey'>;
  draft(tx: Transaction, actor: Actor, id: string): Promise<DraftRow>;
};

export async function publishDraftOperation(capability: DraftPublicationAccess, request: unknown, id: string, input: unknown) {
    const expected = revision(object(input, ['revision']).revision);
    return capability.run(request, true, async (tx, actor) => {
      if (!uuid(id)) return fail('FORBIDDEN');
      const [snapshot] = await tx.query<DraftRow>(
        'SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL',
        id,
        actor.id,
      );
      if (!snapshot) return fail('FORBIDDEN');
      if (snapshot.published_classroom_id)
        return { id: snapshot.published_classroom_id, code: null };
      const payload = draftPayload(snapshot.payload, true),
        classroomId = randomUUID();
      await createClassroom(tx, capability, classroomId, actor, payload);
      const current = await capability.draft(tx, actor, id);
      if (
        current.published_classroom_id ||
        current.revision.toString() !== expected ||
        snapshot.revision !== current.revision
      )
        return fail('CONFLICT');
      await tx.query(
        'UPDATE classroom_drafts SET published_classroom_id=$2::uuid,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',
        id,
        classroomId,
      );
      await populateClassroom(tx, capability, request, classroomId, actor, payload);
      return { id: classroomId, code: await newClassroomCode(tx, classroomId,capability.ports.deliveryKey) };
    });
  }

export async function updateSettingsOperation(capability: DraftPublicationAccess, request: unknown, id: string, input: unknown) {
    const { expected, payload, aiGradingEnabled } = settingsInput(input);
    return capability.run(request, true, async (tx, actor) => {
      const row = await capability.classroom(tx, actor, id, true, true);
      if (row.revision.toString() !== expected) return fail('CONFLICT');
      if (aiGradingEnabled === true && !row.ai_grading_enabled && capability.ports.gradingAiAvailable !== true)
        return fail('SERVICE_UNAVAILABLE');
      await tx.query(
        `UPDATE classrooms SET name=$2,subject=$3,division=$4,academic_year=$5,
        ai_grading_epoch=ai_grading_epoch+CASE WHEN ai_grading_enabled AND $6::boolean IS FALSE THEN 1 ELSE 0 END,
        ai_grading_enabled=COALESCE($6::boolean,ai_grading_enabled),cover_key=COALESCE($7,cover_key),
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`,
        id,
        payload.name,
        payload.subject,
        payload.division,
        payload.academicYear,
        aiGradingEnabled ?? null,
        payload.coverKey ?? null,
      );
      return { revision: (row.revision + 1n).toString() };
    });
  }


async function createClassroom(tx: Transaction, capability: DraftPublicationAccess, classroomId: string, actor: Actor, payload: ReturnType<typeof draftPayload>) {
      // A new, invisible destination is created/locked before the source draft, matching P4 order.
      await tx.query(
        `INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4,$5,$6,$7,$8,$9) RETURNING id`,
        classroomId,
        actor.id,
        payload.name,
        payload.subject,
        payload.division,
        payload.academicYear,
        payload.timezone,
        payload.coverKey,
        capability.ports.classroomQuotaBytes,
      );

}
async function populateClassroom(tx: Transaction, capability: DraftPublicationAccess, request: unknown, classroomId: string, actor: Actor, payload: ReturnType<typeof draftPayload>) {
    if (payload.planFileId) {
      await capability.ports.files.promoteDraftPlanInTransaction(
        tx,
        request,
        payload.planFileId!,
        classroomId,
      );
      await tx.query(
        `INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,1,$3::uuid,$4::uuid) RETURNING id`,
        randomUUID(),
        classroomId,
        payload.planFileId,
        actor.id,
      );
    }
      await populateUnits(tx, classroomId, payload);

}

async function populateUnits(tx: Transaction, classroomId: string, payload: ReturnType<typeof draftPayload>) {
      for (const [position, unit] of payload.units!.entries()) {
        const unitId = randomUUID();
        await tx.query(
          'INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4) RETURNING id',
          unitId,
          classroomId,
          unit.name,
          position,
        );
        for (const [index, topic] of unit.topics.entries())
          await tx.query(
            `INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4,$5) RETURNING id`,
            randomUUID(),
            classroomId,
            unitId,
            topic.name,
            index,
          );
      }
}

function settingsInput(input: unknown) {
    const body = object(input, [
      'revision',
      'name',
      'subject',
      'division',
      'academicYear',
      'aiGradingEnabled',
      'coverKey',
    ]);
    if (Object.hasOwn(body, 'aiGradingEnabled') && typeof body.aiGradingEnabled !== 'boolean') return fail('INVALID_INPUT');
    const expected = revision(body.revision),
      { revision: _, aiGradingEnabled, ...fields } = body;
    const payload = draftPayload(fields, false);
    if (
      ['name', 'subject', 'division', 'academicYear'].some(
        (k) => !(k in payload),
      )
    )
      return fail('INVALID_INPUT');
    if (!payload.name || !payload.subject || !payload.division)
      return fail('INVALID_INPUT');

    return { expected, payload, aiGradingEnabled };
}
