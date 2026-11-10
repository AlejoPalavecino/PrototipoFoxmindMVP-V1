import { AiError } from '../../../../../../../src/core/contracts/ai-error.ts';
import { fail } from '../../../classrooms/public.ts';
import type { ActivityAiServicePort } from '../../application/ai-service-port.ts';
async function generationOperation(service: ActivityAiServicePort | undefined, request: unknown,
  path: string[], method: string, body: unknown) {
  if (path[1] !== 'activity-generations') return null;
  if (!service) throw new AiError('AI_UNAVAILABLE');
  if (path.length === 3 && path[2] === 'sources' && method === 'GET')
    return { status: 200, value: await service.sources(request, path[0]!) };
  if (path.length === 2 && method === 'GET') return { status: 200, value: await service.list(request, path[0]!) };
  if (path.length === 2 && method === 'POST') {
    const queued = await service.start(request, path[0]!, body);
    return { status: queued.created ? 202 : 200, value: queued.view };
  }
  if (path.length === 3 && method === 'GET') return { status: 200, value: await service.get(request, path[0]!, path[2]!) };
  if (path.length === 4 && path[3] === 'regenerate' && method === 'POST') {
    const queued = await service.regenerate(request, path[0]!, path[2]!, body);
    return { status: queued.created ? 202 : 200, value: queued.view };
  }
  if (path.length === 4 && path[3] === 'apply' && method === 'POST')
    return { status: 200, value: await service.apply(request, path[0]!, path[2]!, body) };
  return fail('INVALID_INPUT');
}
export async function activityGenerationRoute(service: ActivityAiServicePort | undefined, request: unknown,
  path: string[], method: string, body: unknown) {
  try { return await generationOperation(service, request, path, method, body); }
  catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    const status = code === 'AI_INPUT_LIMIT' ? 400 : code === 'PROVIDER_OUTCOME_UNKNOWN' ? 409 : null;
    if (status) return { status, value: { error: { code } } };
    throw error;
  }
}
