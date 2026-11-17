import type { ClassroomGenerationPorts } from './generation-ports.ts';
import { parseStartExtraction, parseRetryExtraction, parseApplyExtraction } from '../../../../../../../src/core/domain/curriculum/ai.ts';
import { fail } from '../../../classrooms/public.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import { version, type ClassroomAiOptions, type DraftRow, type JobRow, type QueueResult } from './ai-contracts.ts';

export class ClassroomAiService {
  readonly options: ClassroomAiOptions;
  private readonly ports: ClassroomGenerationPorts;
  constructor(options: ClassroomAiOptions, ports: ClassroomGenerationPorts) { this.options = options; this.ports = ports; }
  start(request: unknown, draftId: string, input: unknown): Promise<QueueResult> {
    const body = parseStartExtraction(input);
    return this.ports.authorized(this.options, request, draftId, true, async (tx, current) => {
      const source = await this.ports.snapshot(this.options, tx, request, current, body.planFileId);
      const [existing] = await this.ports.findLatest(tx, { draftId: draftId, fileId: source.fileId, digest: source.digest, version: version });
      if (existing) return { created: false, view: this.ports.view(existing) };
      if (String(current.revision) !== body.revision) return fail('CONFLICT');
      return { created: true, view: this.ports.view(await this.insert(tx, current, source.fileId, source.digest)) };
    });
  }
  get(request: unknown, draftId: string, id: string) {
    return this.ports.authorized(this.options, request, draftId, false, async (tx, current) =>
      this.ports.view(await this.ports.revalidate(this.options, tx, request, current, await this.ports.job(tx, draftId, id))));
  }
  retry(request: unknown, draftId: string, id: string, input: unknown): Promise<QueueResult> {
    const body = parseRetryExtraction(input), hash = this.ports.inputHash('retry', draftId, id, body);
    return this.ports.authorized(this.options, request, draftId, true, async (tx, current) => {
      const previous = await this.ports.revalidate(this.options, tx, request, current, await this.ports.job(tx, draftId, id));
      if (previous.state === 'STALE') return fail('CONFLICT');
      const repeated = await this.ports.replay(tx, current.owner_id, body.requestId, hash);
      if (repeated) return { created: false, view: this.ports.view(await this.ports.job(tx, draftId, repeated)) };
      const [successor] = await this.ports.findSuccessor(tx, { extractionId: id });
      if (successor) {
        await this.ports.recordRequest(tx, current.owner_id, body.requestId, 'retry', hash, successor.id);
        return { created: false, view: this.ports.view(successor) };
      }
      if (!this.ports.view(previous).retryable || String(current.revision) !== body.revision) return fail('CONFLICT');
      const row = await this.insert(tx, current, previous.file_id, previous.source_digest, previous);
      await this.ports.recordRequest(tx, current.owner_id, body.requestId, 'retry', hash, row.id);
      return { created: true, view: this.ports.view(row) };
    });
  }
  apply(request: unknown, draftId: string, id: string, input: unknown) {
    const body = parseApplyExtraction(input), hash = this.ports.inputHash('apply', draftId, id, body);
    return this.ports.authorized(this.options, request, draftId, true, async (tx, current) => {
      const row = await this.ports.revalidate(this.options, tx, request, current, await this.ports.job(tx, draftId, id));
      if (row.state === 'STALE') return fail('CONFLICT');
      const repeated = await this.ports.replay(tx, current.owner_id, body.requestId, hash);
      if (repeated) return this.applied(row, current);
      if (row.state !== 'READY' || String(current.revision) !== body.revision) return fail('CONFLICT');
      const [updated] = await this.ports.updateDraft(tx, { draftId: draftId, payload: JSON.stringify({ ...current.payload, units: body.units }) });
      const [applied] = await this.ports.markApplied(tx, { extractionId: id, requestId: body.requestId, hash: hash, revision: String(updated!.revision) });
      await this.ports.recordRequest(tx, current.owner_id, body.requestId, 'apply', hash, id);
      return this.applied(applied!, updated!);
    });
  }
  private applied(row: JobRow, current: DraftRow) {
    return { extractionId: row.id, appliedRevision: String(row.applied_revision), draft: this.ports.draftView(current) };
  }
  private async insert(tx: Transaction, current: DraftRow, fileId: string, digest: string, previous?: JobRow) {
    const [row] = await this.ports.insert(tx, {
      id: this.ports.newId(),
      ownerId: current.owner_id,
      draftId: current.id,
      fileId: fileId,
      digest: digest,
      revision: String(current.revision),
      version: version,
      model: this.options.configuration.model,
      generation: previous ? previous.generation + 1 : 0,
      previousId: previous?.id ?? null
    });
    return row!;
  }
}
