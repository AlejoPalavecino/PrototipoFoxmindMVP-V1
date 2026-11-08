import { publishDraftOperation, updateSettingsOperation, type DraftRow } from './drafts-operations.ts';
import { randomUUID } from 'node:crypto';
import type { ClassroomCore } from './core.ts';
import { draftPayload, fail, object, uuid } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import { revision } from './revision.ts';
export { revision } from './revision.ts';
export class DraftService {
  readonly run: ClassroomCore['run'];
  readonly classroom: ClassroomCore['classroom'];
  readonly ports: ClassroomCore['ports'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.ports = context.ports;
  }
  async draft(
    tx: Transaction,
    actor: Actor,
    id: string,
  ): Promise<DraftRow> {
    if (actor.account_role !== 'teacher' || !uuid(id)) return fail('FORBIDDEN');
    const [row] = await tx.query<DraftRow>(
      'SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE',
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
      if (actor.account_role !== 'teacher') return fail('FORBIDDEN');
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
      actor.account_role !== 'teacher' ? [] : (
        await tx.query<DraftRow>(
          `SELECT * FROM classroom_drafts
      WHERE owner_id=$1::uuid AND published_classroom_id IS NULL AND deleted_at IS NULL ORDER BY updated_at DESC,id`,
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
  async deleteDraft(request: unknown, id: string, input: unknown) {
    const body = object(input, ['revision', 'confirm']), expected = revision(body.revision);
    if (body.confirm !== true) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const current = await this.draft(tx, actor, id);
      if (current.published_classroom_id || current.revision.toString() !== expected) return fail('CONFLICT');
      await tx.query(`UPDATE classroom_drafts SET deleted_at=clock_timestamp(),
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, id);
      return { deleted: true };
    });
  }
  async publishDraft(request: unknown, id: string, input: unknown) { return publishDraftOperation(this, request, id, input); }
  async updateSettings(request: unknown, id: string, input: unknown) { return updateSettingsOperation(this, request, id, input); }
}
