import { randomUUID } from 'node:crypto';
import { parseStartActivityGeneration, parseRegenerateActivityGeneration, parseApplyActivityGeneration } from '../../../../../../../src/core/domain/index.ts';
import type { ActivityGenerationCatalog, StartActivityGeneration } from '../../../../../../../src/core/domain/index.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import { fail } from '../../../classrooms/public.ts';
import { authorized, job, view } from './database.ts';
import { curriculum, snapshots } from './source.ts';
import { inputHash, replay, recordRequest } from './requests.ts';
import { candidates } from './candidates.ts';
import { applyProposal } from './apply.ts';
import { generationVersion, type ActivityAiOptions, type JobRow } from './contracts.ts';
import { currentView } from './current-view.ts';
import { requireUnknownAcknowledgement } from './unknown-start.ts';

export class ActivityAiService {
  readonly options: ActivityAiOptions;
  constructor(options: ActivityAiOptions) { this.options = options; }
  sources(request: unknown, classroomId: string): Promise<ActivityGenerationCatalog> {
    return authorized(this.options, request, classroomId, false, async (tx, room) =>
      ({ revision: String(room.revision), sources: await candidates(tx, classroomId) }));
  }
  list(request: unknown, classroomId: string) {
    return authorized(this.options, request, classroomId, false, async (tx, _room, actor) => {
      const rows = await tx.query<JobRow>(`SELECT * FROM activity_ai_generations WHERE classroom_id=$1::uuid AND owner_id=$2::uuid
        ORDER BY created_at DESC,id DESC LIMIT 20`, classroomId, actor.id);
      const jobs = [];
      for (const row of rows) jobs.push(await currentView(this.options, tx, request, row));
      return { jobs };
    }, 'write');
  }
  start(request: unknown, classroomId: string, input: unknown) {
    const body = parseStartActivityGeneration(input), hash = inputHash('start', classroomId, null, body);
    return authorized(this.options, request, classroomId, true, async (tx, room, actor) => {
      const repeated = await replay(tx, actor.id, body.requestId, hash);
      if (repeated) return { created: false, view: await currentView(this.options, tx, request, await job(tx, classroomId, repeated)) };
      if (String(room.revision) !== body.revision) return fail('CONFLICT');
      await requireUnknownAcknowledgement(tx, actor.id, classroomId, body);
      const row = await this.insert(tx, request, classroomId, actor.id, body, hash);
      await recordRequest(tx, actor.id, body.requestId, 'start', hash, row.id);
      return { created: true, view: view(row) };
    });
  }
  get(request: unknown, classroomId: string, id: string) {
    return authorized(this.options, request, classroomId, false, async tx =>
      currentView(this.options, tx, request, await job(tx, classroomId, id)), 'write');
  }
  regenerate(request: unknown, classroomId: string, id: string, input: unknown) {
    const { body, raw, acknowledgePossibleCharge } = parseRegenerateActivityGeneration(input);
    const hash = inputHash('regenerate', classroomId, id, raw);
    return authorized(this.options, request, classroomId, true, async (tx, room, actor) => {
      const previous = await job(tx, classroomId, id), repeated = await replay(tx, actor.id, body.requestId, hash);
      if (repeated) return { created: false, view: await currentView(this.options, tx, request, await job(tx, classroomId, repeated)) };
      if (!['READY', 'FAILED', 'STALE'].includes(previous.state) || String(room.revision) !== body.revision
        || (previous.error_code === 'PROVIDER_OUTCOME_UNKNOWN' && !acknowledgePossibleCharge)) return fail('CONFLICT');
      await requireUnknownAcknowledgement(tx, actor.id, classroomId, body,
        { predecessorId: previous.id, possibleCharge: acknowledgePossibleCharge });
      const row = await this.insert(tx, request, classroomId, actor.id, body, hash, previous);
      await recordRequest(tx, actor.id, body.requestId, 'regenerate', hash, row.id);
      return { created: true, view: view(row) };
    });
  }
  apply(request: unknown, classroomId: string, id: string, input: unknown) {
    const body = parseApplyActivityGeneration(input), hash = inputHash('apply', classroomId, id, body);
    return authorized(this.options, request, classroomId, true, async (tx, room, actor) =>
      applyProposal(this.options, tx, request, await job(tx, classroomId, id), actor, room.revision, body, hash));
  }
  private async insert(tx: Transaction, request: unknown, classroomId: string, ownerId: string, body: StartActivityGeneration, hash: string, previous?: JobRow) {
    if (!body.teacherBrief) return fail('INVALID_INPUT');
    const current = await curriculum(tx, classroomId, body), selected = await snapshots(this.options, tx, request, classroomId, body);
    const [row] = await tx.query<JobRow>(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,
      request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model,generation,predecessor_id,execution_profile)
      VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5::"ActivityType",$6::bigint,$7,$8::jsonb,$9::jsonb,$10::jsonb,$11,$11,
        COALESCE((SELECT active_profiles->'activities'->>'model' FROM ai_execution_policy WHERE singleton),$12),$13,$14::uuid,
        (SELECT active_profiles->'activities' FROM ai_execution_policy WHERE singleton)) RETURNING *`,
      randomUUID(), ownerId, classroomId, current.unit.id, body.type, body.revision, hash, JSON.stringify(body), JSON.stringify(current),
      JSON.stringify(selected), generationVersion, this.options.configuration.model, previous ? previous.generation + 1 : 0, previous?.id ?? null);
    return row!;
  }
}
