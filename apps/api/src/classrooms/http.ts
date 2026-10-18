import type { IncomingMessage, ServerResponse } from 'node:http';
import type { InvitationService } from './invitations.ts';
import { ClassroomError, fail, object } from './policy.ts';
import { ClassroomIdentityError } from './errors.ts';

interface Admission {
  admit(request: IncomingMessage, write: boolean, response: ServerResponse): Promise<void>;
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
    const end = () => finish(),
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
      const exact = (keys: string[]) => {
        const b = object(body, keys);
        if (keys.some((k) => !Object.hasOwn(b, k)))
          return fail('INVALID_INPUT');
        return b;
      };
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
      } else if (path.length === 1 && method === 'GET')
        value = await service.detail(req, path[0]);
      else if (
        path.length === 2 &&
        path[1] === 'settings' &&
        method === 'PATCH'
      )
        value = await service.updateSettings(
          req,
          path[0],
          exact(['revision', 'name', 'subject', 'division', 'academicYear']),
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
