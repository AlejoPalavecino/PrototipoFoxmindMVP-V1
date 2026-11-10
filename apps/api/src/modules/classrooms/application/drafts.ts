import type { DraftOperations, DraftRow } from './management-operations.ts';
import type { DraftsRepository } from './drafts-repository.ts';
import type { ClassroomAccess } from './ports.ts';
import { draftPayload, fail, object, uuid } from '../domain/policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import { revision } from '../domain/revision.ts';
export { revision } from '../domain/revision.ts';
export class DraftService {
  readonly run: ClassroomAccess['run'];
  readonly classroom: ClassroomAccess['classroom'];
  constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'>, private readonly repository: DraftsRepository, private readonly operations: DraftOperations) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
  }
  async draft(
    tx: Transaction,
    actor: Actor,
    id: string,
  ): Promise<DraftRow> {
    if (actor.account_role !== 'teacher' || !uuid(id)) return fail('FORBIDDEN');
    const [row] = await this.repository.readClassroomDrafts01<DraftRow>(tx, id, actor.id);
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
      const [row] = await this.repository.insertClassroomDrafts02<DraftRow>(tx, this.operations.randomUUID(), actor.id);
      return this.draftView(row);
    });
  }
  listDrafts(request: unknown) {
    return this.run(request, false, async (tx, actor) =>
      actor.account_role !== 'teacher' ? [] : (
        await this.repository.readClassroomDrafts03<DraftRow>(tx, actor.id)
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
      const [row] = await this.repository.updateClassroomDrafts04<DraftRow>(tx, id, JSON.stringify(payload));
      return this.draftView(row);
    });
  }
  async deleteDraft(request: unknown, id: string, input: unknown) {
    const body = object(input, ['revision', 'confirm']), expected = revision(body.revision);
    if (body.confirm !== true) return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const current = await this.draft(tx, actor, id);
      if (current.published_classroom_id || current.revision.toString() !== expected) return fail('CONFLICT');
      await this.repository.updateClassroomDrafts05(tx, id);
      return { deleted: true };
    });
  }
  async publishDraft(request: unknown, id: string, input: unknown) { return this.operations.publishDraft(this, request, id, input); }
  async updateSettings(request: unknown, id: string, input: unknown) { return this.operations.updateSettings(this, request, id, input); }
}
