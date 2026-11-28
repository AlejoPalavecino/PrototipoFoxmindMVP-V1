import { createCatalogRoutes } from '../modules/classrooms/catalog/presentation/academic-routes.ts';
import type { CatalogHttpOperations } from '../modules/classrooms/catalog/application/http-operations.ts';
import { createPlanRoutes } from '../modules/curriculum/plan/presentation/academic-routes.ts';
import type { PlanHttpOperations } from '../modules/curriculum/plan/application/http-operations.ts';
import { createLibraryRoutes } from '../modules/materials/library/presentation/academic-routes.ts';
import type { LibraryHttpOperations } from '../modules/materials/library/application/http-operations.ts';
import { createWallRoutes } from '../modules/communication/wall/presentation/academic-routes.ts';
import type { WallHttpOperations } from '../modules/communication/wall/application/http-operations.ts';
import { createAuthoringRoutes } from '../modules/activities/authoring/presentation/academic-routes.ts';
import type { AuthoringHttpOperations } from '../modules/activities/authoring/application/http-operations.ts';
import { createAttemptsRoutes } from '../modules/participation/attempts/presentation/academic-routes.ts';
import type { AttemptsHttpOperations } from '../modules/participation/attempts/application/http-operations.ts';
import { createReviewRoutes } from '../modules/grading/review/presentation/academic-routes.ts';
import type { ReviewHttpOperations } from '../modules/grading/review/application/http-operations.ts';
import { createTeacherSupportRoute, type TeacherSupportHttpOperations } from '../modules/grading/progress/presentation/teacher-support-routes.ts';
import { createTeacherWritingRoute, type TeacherWritingHttpOperations } from '../modules/grading/student-analysis/presentation/teacher-writing-routes.ts';
import { createNotificationsRoutes } from '../modules/home/notifications/presentation/academic-routes.ts';
import type { NotificationsHttpOperations } from '../modules/home/notifications/application/http-operations.ts';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { ClassroomError, fail, object } from '../modules/classrooms/access/infrastructure/policy.ts';
import { ClassroomIdentityError } from '../modules/classrooms/access/infrastructure/errors.ts';
import { captureSubmissionReceipt } from '../modules/participation/attempts/infrastructure/submission-receipt.ts';
import { extractionRoute, extractionHttpError } from '../modules/curriculum/generation/presentation/ai/http.ts';
import type { ClassroomAiService } from '../modules/curriculum/generation/infrastructure/ai/service.ts';

import { activityGenerationRoute } from '../modules/activities/generation/presentation/activity-ai/http.ts';
import type { ActivityAiService } from '../modules/activities/generation/infrastructure/activity-ai/service.ts';
import { sendJson } from '../platform/http/json-response.ts';

interface Admission {
  admit(request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void>;
  ai?: ClassroomAiService;
  activityAi?: ActivityAiService;
}

export type ClassroomsHttpOperations =
  CatalogHttpOperations &
  PlanHttpOperations &
  LibraryHttpOperations &
  WallHttpOperations &
  AuthoringHttpOperations &
  AttemptsHttpOperations &
  ReviewHttpOperations & TeacherSupportHttpOperations & TeacherWritingHttpOperations &
  NotificationsHttpOperations;
export interface AcademicHttpServices {
  catalog: CatalogHttpOperations;
  plan: PlanHttpOperations;
  library: LibraryHttpOperations;
  wall: WallHttpOperations;
  authoring: AuthoringHttpOperations;
  attempts: AttemptsHttpOperations;
  review: ReviewHttpOperations & TeacherSupportHttpOperations & TeacherWritingHttpOperations;
  notifications: NotificationsHttpOperations;
}
const statuses = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  INVITATION_BATCH_NOT_FOUND: 404,
  CONFLICT: 409,
  ENROLLMENT_UNAVAILABLE: 409,
  RATE_LIMITED: 429,
  SERVICE_UNAVAILABLE: 503,
};
const json = (res: ServerResponse, status: number, value: unknown) => sendJson(res, status, value);
function readBody(req: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:;|$)/i.test(req.headers['content-type'] ?? ''))
    return Promise.reject(new ClassroomError('INVALID_INPUT'));
  return new Promise((resolve, reject) => {
    let size = 0,
      settled = false;
    const chunks: Buffer[] = [];
    const finish = (error?: ClassroomError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      req.off('data', data);
      req.off('end', end);
      req.off('aborted', abort);
      req.off('error', abort);
      if (error) {
        req.pause();
        reject(error);
      } else {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(new ClassroomError('INVALID_INPUT'));
        }
      }
    };
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 512 * 1024) finish(new ClassroomError('INVALID_INPUT'));
      else chunks.push(chunk);
    };
    const end = () => { captureSubmissionReceipt(req); finish(); },
      abort = () => finish(new ClassroomError('INVALID_INPUT'));
    const timer = setTimeout(
      () => finish(new ClassroomError('SERVICE_UNAVAILABLE')),
      10000,
    );
    req.on('data', data);
    req.once('end', end);
    req.once('aborted', abort);
    req.once('error', abort);
  });
}
/** Explicit installation only. The host owns real P3 admission; no permissive default exists. */
export function createClassroomsHandler(
  input: AcademicHttpServices | ClassroomsHttpOperations,
  options: Admission,
) {
  if (typeof options?.admit !== 'function') return fail('SERVICE_UNAVAILABLE');
  // Flat inputs remain supported for existing transport fixtures only.
  const services: AcademicHttpServices = 'catalog' in input ? input : {
    catalog: input, plan: input, library: input, wall: input,
    authoring: input, attempts: input, review: input, notifications: input,
  };
  const routes = [
    ...createCatalogRoutes(services.catalog),
    ...createPlanRoutes(services.plan),
    ...createLibraryRoutes(services.library),
    ...createWallRoutes(services.wall),
    ...createAuthoringRoutes(services.authoring),
    ...createAttemptsRoutes(services.attempts),
    ...createReviewRoutes(services.review),
    createTeacherSupportRoute(services.review),
    createTeacherWritingRoute(services.review),
    ...createNotificationsRoutes(services.notifications)
  ].sort((a, b) => a.order - b.order);
  let active = 0;
  return (req: IncomingMessage, res: ServerResponse, next: () => void) => {
    let url: URL;
    try {
      url = new URL(req.url ?? '/', 'http://p5.invalid');
    } catch {
      json(res, 400, { error: { code: 'INVALID_INPUT' } });
      return;
    }
    if (
      url.pathname !== '/classrooms' &&
      !url.pathname.startsWith('/classrooms/')
    ) {
      next();
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    if (active >= 16) {
      json(res, 503, { error: { code: 'SERVICE_UNAVAILABLE' } });
      return;
    }
    active++;
    void (async () => {
      const method = req.method ?? '',
        write = method !== 'GET';
      if (!['GET', 'POST', 'PATCH'].includes(method) && !(method === 'DELETE' && /^\/classrooms\/drafts\/[^/]+$/.test(url.pathname))) {
        json(res, 405, { error: { code: 'INVALID_INPUT' } });
        return;
      }
      if (
        (url.search && !(method === 'GET' && (url.pathname === '/classrooms/search' || url.pathname === '/classrooms/notifications/page' ||
          url.pathname === '/classrooms/teacher-support' || /^\/classrooms\/[^/]+\/wall(?:\/[^/]+(?:\/replies)?)?$/.test(url.pathname)))) ||
        (!write &&
          (req.headers['transfer-encoding'] ||
            Number(req.headers['content-length'] ?? 0) > 0))
      )
        return fail('INVALID_INPUT');
      try {
        await options.admit(req, write, res);
      } catch (error) {
        if (error instanceof ClassroomIdentityError) throw error;
        return fail('FORBIDDEN');
      }
      const body = write ? await readBody(req) : undefined,
        path = url.pathname.split('/').slice(2);
      const exact = (keys: string[], optional: string[] = []) => {
        const b = object(body, [...keys, ...optional]);
        if (keys.some((k) => !Object.hasOwn(b, k)))
          return fail('INVALID_INPUT');
        return b;
      };
      const generation = await activityGenerationRoute(options.activityAi, req, path, method, body);
      if (generation) { json(res, generation.status, generation.value); return; }
      const extraction = await extractionRoute(options.ai, req, path, method, body);
      if (extraction) { json(res, extraction.status, extraction.value); return; }
      for (const route of routes) {
        const result = await route.handle({ request: req, method, path, body, search: url.searchParams, headers: req.headers, exact });
        if (result.handled) { json(res, 200, result.value); return; }
      }
      json(res, 404, { error: { code: 'INVALID_INPUT' } });
      return;
    })()
      .catch((e) => {
        const extractionError = extractionHttpError(e);
        if (extractionError) { json(res, extractionError.status, { error: { code: extractionError.code } }); return; }
        if (e instanceof ClassroomIdentityError) {
          if (e.retryAfter) res.setHeader('Retry-After', String(e.retryAfter));
          if (!req.complete) {
            res.setHeader('Connection', 'close');
            res.once('finish', () => req.destroy());
          }
          json(res, e.status, { error: { code: e.code, requestId: res.getHeader('X-Request-Id') } });
          return;
        }
        // Only ClassroomError codes are public here; any other error, even one carrying a known code, is 503.
        const code =
          e instanceof ClassroomError ? e.code : 'SERVICE_UNAVAILABLE';
        if (e instanceof ClassroomError && e.retryAfter) res.setHeader('Retry-After', String(e.retryAfter));
        json(res, statuses[code], { error: { code } });
      })
      .finally(() => {
        active--;
      });
  };
}
