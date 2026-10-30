import { publishDraftOperation, updateSettingsOperation } from './drafts-operations.ts';
import { randomBytes, randomUUID } from 'node:crypto';
import { ClassroomCore } from './core.ts';
import { draftPayload, fail, object, digest, uuid } from './policy.ts';
import { promoteDraftPlan } from '../files/promotion.ts';
import type { Actor, Transaction } from './contracts.ts';

export interface DraftRow {
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
  async newCode(tx: Transaction, classroomId: string) {
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
  async publishDraft(request: unknown, id: string, input: unknown) { return publishDraftOperation(this, request, id, input); }
  async updateSettings(request: unknown, id: string, input: unknown) { return updateSettingsOperation(this, request, id, input); }
}
