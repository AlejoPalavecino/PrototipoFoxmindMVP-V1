import type { ActivityProposal } from '../../../../../../src/core/domain/activities/activity-generation.ts';
import type { GenerationFormValue } from './generation-form.ts';

/** Idempotency keys identify an explicit generation/apply intent, including retries. */
export function createGenerationRequests(nextId: () => string) {
  const requests = new Map<string, string>();
  function requestId(key: string) {
    if (!requests.has(key)) requests.set(key, nextId());
    return requests.get(key)!;
  }
  return {
    clear: () => requests.clear(),
    generation(value: GenerationFormValue, revision: string, predecessorId?: string) {
      const total = value.counts.development + value.counts.singleChoice + value.counts.multipleChoice;
      if (value.type !== 'ASSIGNMENT' && (!Number.isInteger(total) || total < 1 || total > 30))
        throw new Error('Seleccioná entre 1 y 30 preguntas en total, sumando los tres tipos.');
      const body = { ...value, revision };
      return { ...body, requestId: requestId(JSON.stringify([predecessorId ?? 'start', body])) };
    },
    application: (jobId: string, revision: string, proposal: ActivityProposal) =>
      requestId(JSON.stringify(['apply', jobId, revision, proposal])),
  };
}
