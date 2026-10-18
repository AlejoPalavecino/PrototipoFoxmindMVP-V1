import { randomBytes, randomUUID } from 'node:crypto';
import { ClassroomCore } from './core.ts';
import { draftPayload, fail, object, digest, uuid } from './policy.ts';
import { promoteDraftPlan } from '../files/promotion.ts';
import type { Actor, Transaction } from './contracts.ts';

interface DraftRow {
  id: string;
  owner_id: string;
  revision: bigint;
  payload: unknown;
  published_classroom_id: string | null;
}
export function revision(value: unknown): string {
  if (typeof value !== 'string' || !/^(0|[1-9]\d{0,17})$/.test(value))
    return fail('INVALID_INPUT');
  return value;
}
export class DraftService extends ClassroomCore {
  protected async draft(
    tx: Transaction,
    actor: Actor,
    id: string,
  ): Promise<DraftRow> {
    if (!uuid(id)) return fail('FORBIDDEN');
    const [row] = await tx.query<DraftRow>(
      'SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid FOR UPDATE',
      id,
      actor.id,
    );
    if (!row) return fail('FORBIDDEN');
    return row;
  }
  private draftView(row: DraftRow) {
    return {
      id: row.id,
      revision: row.revision.toString(),
      payload: row.payload,
      publishedClassroomId: row.published_classroom_id,
    };
  }
  createDraft(request: unknown) {
    return this.run(request, true, async (tx, actor) => {
      const [row] = await tx.query<DraftRow>(
        `INSERT INTO classroom_drafts(id,owner_id,updated_at)
        VALUES($1::uuid,$2::uuid,clock_timestamp()) RETURNING *`,
        randomUUID(),
        actor.id,
      );
      return this.draftView(row);
    });
  }
  listDrafts(request: unknown) {
    return this.run(request, false, async (tx, actor) =>
      (
        await tx.query<DraftRow>(
          `SELECT * FROM classroom_drafts
      WHERE owner_id=$1::uuid AND published_classroom_id IS NULL ORDER BY updated_at DESC,id`,
          actor.id,
        )
      ).map((row) => this.draftView(row)),
    );
  }
  getDraft(request: unknown, id: string) {
    return this.run(request, false, async (tx, actor) =>
      this.draftView(await this.draft(tx, actor, id)),
    );
  }
  async saveDraft(request: unknown, id: string, input: unknown) {
    const body = object(input, ['revision', 'payload']),
      expected = revision(body.revision),
      payload = draftPayload(body.payload, false);
    return this.run(request, true, async (tx, actor) => {
      const draft = await this.draft(tx, actor, id);
      if (
        draft.published_classroom_id ||
        draft.revision.toString() !== expected
      )
        return fail('CONFLICT');
      const [row] = await tx.query<DraftRow>(
        `UPDATE classroom_drafts SET payload=$2::jsonb,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING *`,
        id,
        JSON.stringify(payload),
      );
      return this.draftView(row);
    });
  }
  protected async newCode(tx: Transaction, classroomId: string) {
    const code = randomBytes(18).toString('base64url');
    await tx.query(
      'UPDATE classroom_codes SET revoked_at=clock_timestamp(),updated_at=clock_timestamp() WHERE classroom_id=$1::uuid AND revoked_at IS NULL RETURNING id',
      classroomId,
    );
    await tx.query(
      `INSERT INTO classroom_codes(id,updated_at,classroom_id,code_digest)
      VALUES($1::uuid,clock_timestamp(),$2::uuid,$3) RETURNING id`,
      randomUUID(),
      classroomId,
      digest(code),
    );
    return code;
  }
  async publishDraft(request: unknown, id: string, input: unknown) {
    const expected = revision(object(input, ['revision']).revision);
    return this.run(request, true, async (tx, actor) => {
      if (!uuid(id)) return fail('FORBIDDEN');
      const [snapshot] = await tx.query<DraftRow>(
        'SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid',
        id,
        actor.id,
      );
      if (!snapshot) return fail('FORBIDDEN');
      if (snapshot.published_classroom_id)
        return { id: snapshot.published_classroom_id, code: null };
      const payload = draftPayload(snapshot.payload, true),
        classroomId = randomUUID();
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
        this.ports.classroomQuotaBytes,
      );
      const current = await this.draft(tx, actor, id);
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
      await promoteDraftPlan(
        this.ports.files,
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
      return { id: classroomId, code: await this.newCode(tx, classroomId) };
    });
  }
  async updateSettings(request: unknown, id: string, input: unknown) {
    const body = object(input, [
      'revision',
      'name',
      'subject',
      'division',
      'academicYear',
    ]);
    const expected = revision(body.revision),
      { revision: _, ...fields } = body;
    const payload = draftPayload(fields, false);
    if (
      ['name', 'subject', 'division', 'academicYear'].some(
        (k) => !(k in payload),
      )
    )
      return fail('INVALID_INPUT');
    if (!payload.name || !payload.subject || !payload.division)
      return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const row = await this.classroom(tx, actor, id, true, true);
      if (row.revision.toString() !== expected) return fail('CONFLICT');
      await tx.query(
        `UPDATE classrooms SET name=$2,subject=$3,division=$4,academic_year=$5,
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`,
        id,
        payload.name,
        payload.subject,
        payload.division,
        payload.academicYear,
      );
      return { revision: (row.revision + 1n).toString() };
    });
  }
}
