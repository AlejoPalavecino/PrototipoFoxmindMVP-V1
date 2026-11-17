import type { ActivityGenerationPorts } from './generation-ports.ts';
import { parseStartActivityGeneration, parseRegenerateActivityGeneration, parseApplyActivityGeneration } from '../../../../../../../src/core/domain/activities/activity-generation-request.ts';
import type { ActivityGenerationCatalog, StartActivityGeneration } from '../../../../../../../src/core/domain/activities/activity-generation.ts';
import type { Transaction } from '../../../classrooms/public.ts';
import { fail } from '../../../classrooms/public.ts';
import { generationVersion, type ActivityAiOptions, type JobRow } from './ai-contracts.ts';

export class ActivityAiService {
  readonly options: ActivityAiOptions;
  private readonly ports: ActivityGenerationPorts;
  constructor(options: ActivityAiOptions, ports: ActivityGenerationPorts) { this.options = options; this.ports = ports; }
  sources(request: unknown, classroomId: string): Promise<ActivityGenerationCatalog> {
    return this.ports.authorized(this.options, request, classroomId, false, async (tx, room) =>
      ({ revision: String(room.revision), sources: await this.ports.candidates(tx, classroomId) }));
  }
  list(request: unknown, classroomId: string) {
    return this.ports.authorized(this.options, request, classroomId, false, async (tx, _room, actor) => {
      const rows = await this.ports.listJobs(tx, { classroomId: classroomId, ownerId: actor.id });
      const jobs = [];
      for (const row of rows) jobs.push(await this.ports.currentView(this.options, tx, request, row));
      return { jobs };
    }, 'write');
  }
  start(request: unknown, classroomId: string, input: unknown) {
    const body = parseStartActivityGeneration(input), hash = this.ports.inputHash('start', classroomId, null, body);
    return this.ports.authorized(this.options, request, classroomId, true, async (tx, room, actor) => {
      const repeated = await this.ports.replay(tx, actor.id, body.requestId, hash);
      if (repeated) return { created: false, view: await this.ports.currentView(this.options, tx, request, await this.ports.job(tx, classroomId, repeated)) };
      if (String(room.revision) !== body.revision) return fail('CONFLICT');
      await this.ports.requireUnknownAcknowledgement(tx, actor.id, classroomId, body);
      const row = await this.insert(tx, request, classroomId, actor.id, body, hash);
      await this.ports.recordRequest(tx, actor.id, body.requestId, 'start', hash, row.id);
      return { created: true, view: this.ports.view(row) };
    });
  }
  get(request: unknown, classroomId: string, id: string) {
    return this.ports.authorized(this.options, request, classroomId, false, async tx =>
      this.ports.currentView(this.options, tx, request, await this.ports.job(tx, classroomId, id)), 'write');
  }
  regenerate(request: unknown, classroomId: string, id: string, input: unknown) {
    const { body, raw, acknowledgePossibleCharge } = parseRegenerateActivityGeneration(input);
    const hash = this.ports.inputHash('regenerate', classroomId, id, raw);
    return this.ports.authorized(this.options, request, classroomId, true, async (tx, room, actor) => {
      const previous = await this.ports.job(tx, classroomId, id), repeated = await this.ports.replay(tx, actor.id, body.requestId, hash);
      if (repeated) return { created: false, view: await this.ports.currentView(this.options, tx, request, await this.ports.job(tx, classroomId, repeated)) };
      if (!['READY', 'FAILED', 'STALE'].includes(previous.state) || String(room.revision) !== body.revision
        || (previous.error_code === 'PROVIDER_OUTCOME_UNKNOWN' && !acknowledgePossibleCharge)) return fail('CONFLICT');
      await this.ports.requireUnknownAcknowledgement(tx, actor.id, classroomId, body,
        { predecessorId: previous.id, possibleCharge: acknowledgePossibleCharge });
      const row = await this.insert(tx, request, classroomId, actor.id, body, hash, previous);
      await this.ports.recordRequest(tx, actor.id, body.requestId, 'regenerate', hash, row.id);
      return { created: true, view: this.ports.view(row) };
    });
  }
  apply(request: unknown, classroomId: string, id: string, input: unknown) {
    const body = parseApplyActivityGeneration(input), hash = this.ports.inputHash('apply', classroomId, id, body);
    return this.ports.authorized(this.options, request, classroomId, true, async (tx, room, actor) =>
      this.ports.applyProposal(this.options, tx, request, await this.ports.job(tx, classroomId, id), actor, room.revision, body, hash));
  }
  private async insert(tx: Transaction, request: unknown, classroomId: string, ownerId: string, body: StartActivityGeneration, hash: string, previous?: JobRow) {
    if (!body.teacherBrief) return fail('INVALID_INPUT');
    const current = await this.ports.curriculum(tx, classroomId, body), selected = await this.ports.snapshots(this.options, tx, request, classroomId, body);
    const [row] = await this.ports.insert(tx, {
      id: this.ports.newId(),
      ownerId: ownerId,
      classroomId: classroomId,
      unitId: current.unit.id,
      type: body.type,
      revision: body.revision,
      hash: hash,
      body: JSON.stringify(body),
      curriculum: JSON.stringify(current),
      sources: JSON.stringify(selected),
      version: generationVersion,
      model: this.options.configuration.model,
      generation: previous ? previous.generation + 1 : 0,
      predecessorId: previous?.id ?? null
    });
    return row!;
  }
}
