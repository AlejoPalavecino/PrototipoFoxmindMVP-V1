import type { IncomingMessage, ServerResponse } from 'node:http';
import type { ClassroomService as InvitationService } from './service.ts';
import { ClassroomError, fail, object } from './policy.ts';
import { ClassroomIdentityError } from './errors.ts';
import { wallOperation } from './wall-policy.ts';
import { activityOperation } from './activity-policy.ts';
import { editorCapability } from './attempt-policy.ts';
import { uuid } from './policy.ts';
import { captureSubmissionReceipt } from './submission-receipt.ts';
import { privateGradingInput } from './grading-policy.ts';
import { publicationInput } from './grade-publication.ts';
import { gradeCorrectionInput } from './grade-corrections.ts';
import { extractionRoute, extractionHttpError } from './ai/http.ts';
import type { ClassroomAiService } from './ai/index.ts';

import { activityGenerationRoute } from './activity-ai/http.ts';
import type { ActivityAiService } from './activity-ai/index.ts';

interface Admission {
  admit(request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void>;
  ai?: ClassroomAiService;
  activityAi?: ActivityAiService;
}
const statuses = {
  INVALID_INPUT: 400,
  FORBIDDEN: 403,
  CONFLICT: 409,
  ENROLLMENT_UNAVAILABLE: 409,
  SERVICE_UNAVAILABLE: 503,
};
function json(res: ServerResponse, status: number, value: unknown) {
  if (res.destroyed || res.writableEnded) return;
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(
    JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)),
  );
}
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
  service: InvitationService,
  options: Admission,
) {
  if (typeof options?.admit !== 'function') return fail('SERVICE_UNAVAILABLE');
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
      if (!['GET', 'POST', 'PATCH'].includes(method)) {
        json(res, 405, { error: { code: 'INVALID_INPUT' } });
        return;
      }
      if (
        url.search ||
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
      let value: unknown;
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
      if (!path.length && method === 'GET') value = await service.mine(req);
      else if (path.join('/') === 'drafts' && method === 'GET')
        value = await service.listDrafts(req);
      else if (path.join('/') === 'drafts' && method === 'POST') {
        exact([]);
        value = await service.createDraft(req);
      } else if (path[0] === 'drafts' && path.length === 2 && method === 'GET')
        value = await service.getDraft(req, path[1]);
      else if (path[0] === 'drafts' && path.length === 2 && method === 'PATCH')
        value = await service.saveDraft(
          req,
          path[1],
          exact(['revision', 'payload']),
        );
      else if (
        path[0] === 'drafts' &&
        path[2] === 'publish' &&
        path.length === 3 &&
        method === 'POST'
      )
        value = await service.publishDraft(req, path[1], exact(['revision']));
      else if (path.join('/') === 'codes/preview' && method === 'POST')
        value = await service.previewCode(req, exact(['code']).code);
      else if (path.join('/') === 'codes/confirm' && method === 'POST')
        value = await service.confirmCode(
          req,
          exact(['confirmation']).confirmation,
        );
      else if (path.join('/') === 'invitations' && method === 'GET')
        value = await service.pendingInvitations(req);
      else if (
        path[0] === 'invitations' &&
        path[2] === 'accept' &&
        path.length === 3 &&
        method === 'POST'
      ) {
        exact([]);
        value = await service.acceptInvitation(req, path[1]);
      } else if (path.join('/') === 'notifications' && method === 'GET')
        value = await service.listNotifications(req);
      else if (path.length === 3 && path[0] === 'notifications' && ['read', 'open'].includes(path[2]) && method === 'POST') {
        exact([]);
        value = path[2] === 'open' ? await service.openNotification(req, path[1]) : await service.readNotification(req, path[1]);
      } else if (path.length === 1 && method === 'GET')
        value = await service.detail(req, path[0]);
      else if (path.length === 2 && path[1] === 'plan' && method === 'POST')
        value = await service.changePlan(req, path[0], exact(['revision', 'operation']));
      else if (path.length === 2 && path[1] === 'library' && method === 'GET')
        value = await service.listMaterials(req, path[0]);
      else if (path.length === 2 && path[1] === 'library' && method === 'POST')
        value = await service.changeLibrary(req, path[0], exact(['revision', 'operation']));
      else if (path.length === 2 && path[1] === 'activities' && method === 'GET')
        value = await service.listActivities(req, path[0]);
      else if (path.length === 2 && path[1] === 'activities' && method === 'POST') {
        const data = exact(['revision', 'operation']);
        activityOperation(data.operation);
        value = await service.changeActivities(req, path[0], data);
      } else if (path.length === 3 && path[1] === 'activities' && path[2] === 'deadline' && method === 'POST')
        value = await service.activityDeadlineChoices(req, path[0], exact(['local']));
      else if (path.length === 3 && path[1] === 'activities' && method === 'GET')
        value = await service.activityDetail(req, path[0], path[2]);
      else if (path.length === 4 && path[1] === 'activities' && ['history', 'history-submissions', 'reopen'].includes(path[3])) {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        if (path[3] === 'history' && method === 'GET') value = await service.activityHistory(req, path[0], path[2]);
        else if (path[3] === 'history-submissions' && method === 'GET') value = await service.activitySubmissions(req, path[0], path[2]);
        else if (path[3] === 'reopen' && method === 'POST') value = await service.reopenActivity(req, path[0], path[2], exact(['revision', 'studentId', 'deadline', 'confirm']));
        else return fail('INVALID_INPUT');
      } else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'history' && method === 'GET') {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        value = await service.activityAttempt(req, path[0], path[2]);
      }
      else if (path.length === 4 && path[1] === 'attempts' && ['publish-grade', 'result'].includes(path[3])) {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        if (path[3] === 'result' && method === 'GET') value = await service.getAttemptResult(req, path[0], path[2]);
        else if (path[3] === 'publish-grade' && method === 'POST') value = await service.publishAttemptGrade(req, path[0], path[2], publicationInput(body));
        else return fail('INVALID_INPUT');
      }
      else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'grade-corrections') {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        if (method === 'GET') value = await service.getGradeCorrections(req, path[0], path[2]);
        else if (method === 'POST') value = await service.correctPublishedGrade(req, path[0], path[2], gradeCorrectionInput(body));
        else return fail('INVALID_INPUT');
      }
      else if (path[1] === 'attempts' && path[3] === 'grading-ai' && (path.length === 4 || path.length === 6)) {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        if (path.length === 4 && method === 'GET') value = await service.getGradingAi(req, path[0], path[2]);
        else if (path.length === 6 && method === 'POST' && path[5] === 'apply') value = await service.applyGradingAi(req, path[0], path[2], path[4], body);
        else if (path.length === 6 && method === 'POST' && path[5] === 'discard') value = await service.discardGradingAi(req, path[0], path[2], path[4], body);
        else return fail('INVALID_INPUT');
      }
      else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'grading') {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        if (method === 'GET') value = await service.getAttemptGrading(req, path[0], path[2]);
        else if (method === 'POST') value = await service.saveAttemptGrading(req, path[0], path[2], privateGradingInput(body));
        else return fail('INVALID_INPUT');
      }
      else if (path.length === 4 && path[1] === 'activities' && ['session', 'start', 'eligibility', 'authorize-first'].includes(path[3])) {
        if (!uuid(path[0]) || !uuid(path[2])) return fail('INVALID_INPUT');
        if (req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        if (path[3] === 'session' && method === 'GET') value = await service.activitySession(req, path[0], path[2]);
        else if (path[3] === 'eligibility' && method === 'GET') value = await service.activityEligibility(req, path[0], path[2]);
        else if (path[3] === 'start' && method === 'POST') value = await service.startActivity(req, path[0], path[2], exact([]));
        else if (path[3] === 'authorize-first' && method === 'POST')
          value = await service.authorizeFirstSubmission(req, path[0], path[2], exact(['revision', 'studentId', 'deadline']));
        else return fail('INVALID_INPUT');
      } else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'transfer' && method === 'POST') {
        if (!uuid(path[0]) || !uuid(path[2])) return fail('INVALID_INPUT');
        if (req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          editorCapability(req.headers['x-attempt-editor'], req.headers['x-attempt-epoch']);
        value = await service.transferAttemptEditor(req, path[0], path[2], exact(['revision']));
      }
      else if (path.length === 4 && path[1] === 'attempts' && ['answer', 'submit-answers'].includes(path[3]) && method === 'POST') {
        if (!uuid(path[0]) || !uuid(path[2])) return fail('INVALID_INPUT');
        editorCapability(req.headers['x-attempt-editor'], req.headers['x-attempt-epoch']);
        value = path[3] === 'answer'
          ? await service.saveAttemptAnswer(req, path[0], path[2], exact(['revision', 'questionId', 'text', 'optionIds']))
          : await service.submitQuestionnaireAttempt(req, path[0], path[2], exact(['revision', 'confirm', 'confirmIncomplete']));
      }
      else if (path.length === 4 && path[1] === 'attempts' && ['attachments-remove', 'submit-practical'].includes(path[3]) && method === 'POST') {
        if (!uuid(path[0]) || !uuid(path[2])) return fail('INVALID_INPUT');
        editorCapability(req.headers['x-attempt-editor'], req.headers['x-attempt-epoch']);
        value = path[3] === 'attachments-remove'
          ? await service.removeAttemptAttachment(req, path[0], path[2], exact(['revision', 'fileId']))
          : await service.submitPracticalAttempt(req, path[0], path[2], exact(['revision', 'confirm']));
      } else if (path.length === 4 && path[1] === 'activities' && path[3] === 'submissions' && method === 'GET') {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        value = await service.assignmentSubmissions(req, path[0], path[2]);
      } else if (path.length === 4 && path[1] === 'attempts' && path[3] === 'receipt' && method === 'GET') {
        if (!uuid(path[0]) || !uuid(path[2]) || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined)
          return fail('INVALID_INPUT');
        value = await service.assignmentSubmission(req, path[0], path[2]);
      }
      else if (path.length === 4 && path[1] === 'activities' && path[3] === 'preview' && method === 'GET')
        value = await service.activityDetail(req, path[0], path[2], true);
      else if (path.length === 2 && path[1] === 'wall' && method === 'GET')
        value = await service.listWall(req, path[0]);
      else if (path.length === 2 && path[1] === 'wall' && method === 'POST') {
        const data = exact(['revision', 'operation']);
        wallOperation(data.operation);
        value = await service.changeWall(req, path[0], data);
      }
      else if (
        path.length === 2 &&
        path[1] === 'settings' &&
        method === 'PATCH'
      )
        value = await service.updateSettings(
          req,
          path[0],
          exact(['revision', 'name', 'subject', 'division', 'academicYear'], ['aiGradingEnabled']),
        );
      else if (path.length === 2 && path[1] === 'archive' && method === 'POST')
        value = await service.setArchive(
          req,
          path[0],
          exact(['archived', 'revision']),
        );
      else if (path.length === 2 && path[1] === 'code' && method === 'POST') {
        exact([]);
        value = await service.rotateCode(req, path[0]);
      } else if (
        path.length === 2 &&
        ['members', 'history'].includes(path[1]) &&
        method === 'GET'
      )
        value = await service.members(req, path[0], path[1] === 'history');
      else if (path.length === 4 && path[1] === 'members' && path[3] === 'ai-summary') {
        if (method !== 'GET' || !uuid(path[0]) || !uuid(path[2])) return fail('INVALID_INPUT');
        value = await service.getStudentAiReport(req, path[0], path[2]);
      }
      else if ((path.length === 2 && path[1] === 'progress')
        || (path.length === 4 && path[1] === 'members' && path[3] === 'progress')) {
        if (method !== 'GET' || !uuid(path[0]) || (path.length === 4 && !uuid(path[2]))
          || req.headers['x-attempt-editor'] !== undefined || req.headers['x-attempt-epoch'] !== undefined) return fail('INVALID_INPUT');
        value = path.length === 2 ? await service.getProgress(req, path[0]) : await service.getStudentProgress(req, path[0], path[2]);
      }
      else if (path.length === 3 && path[1] === 'members' && method === 'GET')
        value = await service.studentSummary(req, path[0], path[2]);
      else if (
        path.length === 2 &&
        path[1] === 'invitations' &&
        method === 'GET'
      )
        value = await service.listInvitations(req, path[0]);
      else if (
        path.length === 2 &&
        path[1] === 'invitations' &&
        method === 'POST'
      )
        value = await service.invite(req, path[0], exact(['email']).email);
      else if (
        path.length === 4 &&
        path[1] === 'invitations' &&
        path[3] === 'revoke' &&
        method === 'POST'
      ) {
        exact([]);
        value = await service.revokeInvitation(req, path[0], path[2]);
      } else if (
        path.length === 2 &&
        path[1] === 'leave' &&
        method === 'POST'
      ) {
        exact([]);
        value = await service.leave(req, path[0]);
      } else if (
        path.length === 4 &&
        path[1] === 'members' &&
        path[3] === 'remove' &&
        method === 'POST'
      ) {
        exact([]);
        value = await service.remove(req, path[0], path[2]);
      } else {
        json(res, 404, { error: { code: 'INVALID_INPUT' } });
        return;
      }
      json(res, 200, value);
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
        const code =
          e instanceof ClassroomError ? e.code : 'SERVICE_UNAVAILABLE';
        json(res, statuses[code], { error: { code } });
      })
      .finally(() => {
        active--;
      });
  };
}
