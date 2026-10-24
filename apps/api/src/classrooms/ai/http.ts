import { AiError } from '../../ai/index.ts';
import { fail } from '../policy.ts';
import type { ClassroomAiService } from './service.ts';

export async function extractionRoute(service: ClassroomAiService | undefined, request: unknown,
  path: string[], method: string, body: unknown) {
  if (path[0] !== 'drafts' || path[2] !== 'curriculum-extractions') return null;
  if (!service) throw new AiError('AI_UNAVAILABLE');
  if (path.length === 3 && method === 'POST') {
    const queued = await service.start(request, path[1]!, body);
    return { status: queued.created ? 202 : 200, value: queued.view };
  }
  if (path.length === 4 && method === 'GET')
    return { status: 200, value: await service.get(request, path[1]!, path[3]!) };
  if (path.length === 5 && method === 'POST' && path[4] === 'retry') {
    const queued = await service.retry(request, path[1]!, path[3]!, body);
    return { status: queued.created ? 202 : 200, value: queued.view };
  }
  if (path.length === 5 && method === 'POST' && path[4] === 'apply')
    return { status: 200, value: await service.apply(request, path[1]!, path[3]!, body) };
  return fail('INVALID_INPUT');
}
export function extractionHttpError(error: unknown): { status: number; code: string } | null {
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code === 'AI_UNAVAILABLE') return { status: 503, code };
  if (code === 'FILE_NOT_READY') return { status: 409, code };
  if (code === 'INVALID_INPUT') return { status: 400, code };
  return null;
}
