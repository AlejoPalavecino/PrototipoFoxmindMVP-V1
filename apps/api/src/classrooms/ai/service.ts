import { randomUUID } from 'node:crypto';
import { parseStartExtraction, parseRetryExtraction, parseApplyExtraction } from '../../../../../src/core/domain/index.ts';
import { fail } from '../policy.ts';
import type { Transaction } from '../contracts.ts';
import { authorized, job, draftView } from './database.ts';
import { snapshot, revalidate, view } from './source.ts';
import { inputHash, replay, recordRequest } from './requests.ts';
import { version, type ClassroomAiOptions, type DraftRow, type JobRow, type QueueResult } from './contracts.ts';

export class ClassroomAiService {
  readonly options: ClassroomAiOptions;
  constructor(options: ClassroomAiOptions) { this.options = options; }
  start(request: unknown, draftId: string, input: unknown): Promise<QueueResult> {
    const body = parseStartExtraction(input);
    return authorized(this.options, request, draftId, true, async (tx, current) => {
      const source = await snapshot(this.options, tx, request, current, body.planFileId);
      const [existing] = await tx.query<JobRow>(`SELECT * FROM classroom_curriculum_extractions
        WHERE draft_id=$1::uuid AND file_id=$2::uuid AND source_digest=$3 AND schema_version=$4 AND prompt_version=$4
        ORDER BY generation DESC LIMIT 1`, draftId, source.fileId, source.digest, version);
      if (existing) return { created: false, view: view(existing) };
      if (String(current.revision) !== body.revision) return fail('CONFLICT');
      return { created: true, view: view(await this.insert(tx, current, source.fileId, source.digest)) };
    });
  }
  get(request: unknown, draftId: string, id: string) {
    return authorized(this.options, request, draftId, false, async (tx, current) =>
      view(await revalidate(this.options, tx, request, current, await job(tx, draftId, id))));
  }
  retry(request: unknown, draftId: string, id: string, input: unknown): Promise<QueueResult> {
    const body = parseRetryExtraction(input), hash = inputHash('retry', draftId, id, body);
    return authorized(this.options, request, draftId, true, async (tx, current) => {
      const previous = await revalidate(this.options, tx, request, current, await job(tx, draftId, id));
      if (previous.state === 'STALE') return fail('CONFLICT');
      const repeated = await replay(tx, current.owner_id, body.requestId, hash);
      if (repeated) return { created: false, view: view(await job(tx, draftId, repeated)) };
      const [successor] = await tx.query<JobRow>('SELECT * FROM classroom_curriculum_extractions WHERE retry_of=$1::uuid', id);
      if (successor) {
        await recordRequest(tx, current.owner_id, body.requestId, 'retry', hash, successor.id);
        return { created: false, view: view(successor) };
      }
      if (!view(previous).retryable || String(current.revision) !== body.revision) return fail('CONFLICT');
      const row = await this.insert(tx, current, previous.file_id, previous.source_digest, previous);
      await recordRequest(tx, current.owner_id, body.requestId, 'retry', hash, row.id);
      return { created: true, view: view(row) };
    });
  }
  apply(request: unknown, draftId: string, id: string, input: unknown) {
    const body = parseApplyExtraction(input), hash = inputHash('apply', draftId, id, body);
    return authorized(this.options, request, draftId, true, async (tx, current) => {
      const row = await revalidate(this.options, tx, request, current, await job(tx, draftId, id));
      if (row.state === 'STALE') return fail('CONFLICT');
      const repeated = await replay(tx, current.owner_id, body.requestId, hash);
      if (repeated) return this.applied(row, current);
      if (row.state !== 'READY' || String(current.revision) !== body.revision) return fail('CONFLICT');
      const [updated] = await tx.query<DraftRow>(`UPDATE classroom_drafts SET payload=$2::jsonb,
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING *`, draftId,
      JSON.stringify({ ...current.payload, units: body.units }));
      const [applied] = await tx.query<JobRow>(`UPDATE classroom_curriculum_extractions SET state='APPLIED',
        apply_request_id=$2::uuid,apply_input_hash=$3,applied_revision=$4::bigint,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING *`, id, body.requestId, hash, String(updated!.revision));
      await recordRequest(tx, current.owner_id, body.requestId, 'apply', hash, id);
      return this.applied(applied!, updated!);
    });
  }
  private applied(row: JobRow, current: DraftRow) {
    return { extractionId: row.id, appliedRevision: String(row.applied_revision), draft: draftView(current) };
  }
  private async insert(tx: Transaction, current: DraftRow, fileId: string, digest: string, previous?: JobRow) {
    const [row] = await tx.query<JobRow>(`INSERT INTO classroom_curriculum_extractions
      (id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model,generation,retry_of)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5,$6::bigint,$7,$7,$8,$9,$10::uuid) RETURNING *`,
    randomUUID(), current.owner_id, current.id, fileId, digest, String(current.revision), version,
    this.options.configuration.model, previous ? previous.generation + 1 : 0, previous?.id ?? null);
    return row!;
  }
}
