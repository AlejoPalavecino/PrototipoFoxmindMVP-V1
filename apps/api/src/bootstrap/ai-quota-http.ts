import type { IncomingMessage, ServerResponse } from 'node:http';
import { randomUUID } from 'node:crypto';
import { IdentityHttpError, publicIdentityError } from '../modules/identity/domain/errors.ts';
import { aiQuotaEventsPath, aiQuotaPath, type AiQuotaSnapshot } from '../../../../src/core/contracts/ai-quota.ts';
import { sendJson } from '../platform/http/json-response.ts';

interface QuotaPorts {
  admit(request: IncomingMessage, response: ServerResponse): Promise<string>;
  read(request: IncomingMessage, sessionId: string, previous?: QuotaCursor): Promise<AiQuotaSnapshot | null>;
}

type QuotaCursor = Pick<AiQuotaSnapshot, 'periodStart' | 'version'>;

const json = (response: ServerResponse, status: number, data: unknown) => sendJson(response, status, data);

const sampleMs = 900;
const heartbeatMs = 15_000;
const maxSessionStreams = 6;

/** Each stream checks for changes in a short transaction and releases the connection between samples. */
export function createAiQuotaHandler(ports: QuotaPorts) {
  const streams = new Map<string, number>();
  return function handle(request: IncomingMessage, response: ServerResponse, next = () => { response.writeHead(404).end(); }) {
    const target = request.url?.split('?')[0];
    if (target !== aiQuotaPath && target !== aiQuotaEventsPath) { next(); return; }
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    response.setHeader('X-Request-Id', randomUUID());
    if (request.method !== 'GET') {
      response.setHeader('Allow', 'GET');
      json(response, 405, { error: { code: 'METHOD_NOT_ALLOWED' } });
      return;
    }
    if (request.url !== target || Number(request.headers['content-length']) || request.headers['transfer-encoding']) {
      json(response, 400, { error: { code: 'INVALID_INPUT' } });
      return;
    }
    if (['cross-site', 'same-site'].includes(request.headers['sec-fetch-site'] ?? '')) {
      json(response, 403, { error: { code: 'ORIGIN_NOT_ALLOWED' } });
      return;
    }

    void (async () => {
      const sessionId = await ports.admit(request, response);
      if (response.destroyed) return;
      if (target === aiQuotaPath) {
        const value = await ports.read(request, sessionId);
        if (!value) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
        if (!response.destroyed) json(response, 200, value);
        return;
      }
      const active = streams.get(sessionId) ?? 0;
      if (active >= maxSessionStreams) throw new IdentityHttpError('RATE_LIMITED', 15);
      streams.set(sessionId, active + 1);
      let timer: NodeJS.Timeout | undefined;
      let previous: QuotaCursor | undefined;
      let sentAt = 0;
      response.once('close', () => {
        clearTimeout(timer);
        const left = (streams.get(sessionId) ?? 1) - 1;
        if (left) streams.set(sessionId, left);
        else streams.delete(sessionId);
      });

      const publish = async () => {
        const snapshot = await ports.read(request, sessionId, previous);
        if (response.destroyed || response.writableEnded) return;
        if (!previous) {
          if (!snapshot) throw new IdentityHttpError('SERVICE_UNAVAILABLE');
          response.writeHead(200, {
            'Content-Type': 'text/event-stream; charset=utf-8',
            'X-Accel-Buffering': 'no',
          });
        }
        let writable = true;
        if (snapshot && (!previous || snapshot.version !== previous.version || snapshot.periodStart !== previous.periodStart)) {
          previous = { version: snapshot.version, periodStart: snapshot.periodStart };
          sentAt = Date.now();
          writable = response.write(`id: ${snapshot.version}\ndata: ${JSON.stringify(snapshot)}\n\n`);
        } else if (Date.now() - sentAt >= heartbeatMs) {
          sentAt = Date.now();
          writable = response.write(': cuota\n\n');
        }
        if (!writable) { response.end(); return; }
        timer = setTimeout(() => { void publish().catch(() => response.end()); }, sampleMs);
        timer.unref();
      };
      await publish();
    })().catch(error => {
      if (response.destroyed || response.writableEnded) return;
      if (response.headersSent) { response.end(); return; }
      const failure = publicIdentityError(error);
      if (failure.retryAfter) response.setHeader('Retry-After', failure.retryAfter);
      json(response, failure.status, { error: { code: failure.code } });
    });
  };
}
