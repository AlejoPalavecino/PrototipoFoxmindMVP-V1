import { parseActivityProposal, type ActivityGenerationInput, type ActivitySourceGrant } from '../../../../../../../src/core/domain/index.ts';
import { bounded, errorCode } from '../../../../platform/ai/execution.ts';
import type { ActivityAiOptions, JobRow } from './contracts.ts';
export { bounded, errorCode };
export async function prepare(options: ActivityAiOptions, row: JobRow, grants: ActivitySourceGrant[], signal: AbortSignal) {
  const sources = [];
  for (const grant of grants) sources.push(await bounded(() => options.reader.read(grant, signal), signal));
  if (sources.some((s, i) => s.sourceId !== row.source_snapshot[i]?.sourceId)
    || sources.reduce((sum, s) => sum + (s.pageCount ?? 0), 0) > 100
    || sources.reduce((sum, s) => sum + (s.document.kind === 'text' ? s.document.text.length : 0), 0) > 200000)
    throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
  const payload = row.input_payload;
  const input: ActivityGenerationInput = { schemaVersion: 'activity-proposal-v1', type: row.type,
    unit: row.curriculum_snapshot.unit, topics: row.curriculum_snapshot.topics, objective: payload.objective,
    ...(row.curriculum_snapshot.units ? { units: row.curriculum_snapshot.units } : {}),
    ...(payload.teacherBrief ? { teacherBrief: payload.teacherBrief } : {}),
    groupLevel: payload.groupLevel, difficulty: payload.difficulty, durationMinutes: payload.durationMinutes,
    context: payload.context, counts: payload.counts, sources, signal };
  const count = await bounded(() => options.provider.countActivityTokens(input), signal);
  if (!Number.isSafeInteger(count) || count < 1 || count > options.configuration.maxInputTokens)
    throw Object.assign(new Error('AI_INPUT_LIMIT'), { code: 'AI_INPUT_LIMIT' });
  return { count, input };
}
export function proposal(json: unknown, input: ActivityGenerationInput) {
  try {
    if (!json || typeof json !== 'object' || Array.isArray(json)) throw new Error();
    const value = json as Record<string, unknown>;
    if (value.status === 'INSUFFICIENT_CONTENT' && Object.keys(value).length === 2
      && Array.isArray(value.missingInformation) && value.missingInformation.length > 0 && value.missingInformation.length <= 10
      && value.missingInformation.every(x => typeof x === 'string' && x.trim().length > 0 && x.length <= 500))
      return { missing: value.missingInformation as string[] };
    if (value.status !== 'READY' || Object.keys(value).length !== 2) throw new Error();
    const proposal = parseActivityProposal(value.proposal, { type: input.type, counts: input.counts,
      context: input.context.trim() ? input.context : input.teacherBrief ?? '', sourceIds: input.sources.map(s => s.sourceId),
      pdfPageCounts: Object.fromEntries(input.sources.filter(s => s.pageCount !== null).map(s => [s.sourceId, s.pageCount!])) });
    for (const source of input.sources) for (const warning of source.warnings)
      if (!proposal.warnings.includes(warning)) proposal.warnings.push(warning);
    return { proposal };
  } catch { throw Object.assign(new Error('INVALID_AI_OUTPUT'), { code: 'INVALID_AI_OUTPUT' }); }
}
