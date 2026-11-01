import type { IncomingMessage } from 'node:http';
import { agendaId, agendaRevision, parseCreateFoxyConversation, parseSendFoxyMessage, parseStartFoxyVisual, strictObject } from '../../../../src/core/domain/index.ts';
function invalid(): never { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); }
export function query(url: URL, allowed: string[]): Record<string, string> {
  const result: Record<string, string> = Object.create(null);
  for (const [key, value] of url.searchParams) {
    if (!allowed.includes(key) || Object.hasOwn(result, key)) return invalid();
    result[key] = value;
  }
  return result;
}
export function integer(value: string | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined) return fallback;
  if (!/^(?:0|[1-9][0-9]*)$/u.test(value)) return invalid();
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < min || number > max) return invalid();
  return number;
}
export function cursor(value: string | undefined): unknown {
  if (value === undefined) return null;
  if (!/^[A-Za-z0-9_-]{1,4096}$/u.test(value)) return invalid();
  try {
    const raw = Buffer.from(value, 'base64url');
    if (raw.toString('base64url') !== value) return invalid();
    return JSON.parse(raw.toString('utf8'));
  } catch { return invalid(); }
}
export function body(request: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?\s*$/iu.test(request.headers['content-type'] ?? '')
    || request.headers['content-encoding'] !== undefined) return Promise.reject(Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }));
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = []; let size = 0, settled = false;
    const finish = (code?: string) => {
      if (settled) return;
      settled = true; clearTimeout(timer);
      request.off('data', data); request.off('end', end); request.off('aborted', abort); request.off('error', abort);
      if (code) { request.resume(); reject(Object.assign(new Error(code), { code })); return; }
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { reject(Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' })); }
    };
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1048576) finish('PAYLOAD_TOO_LARGE'); else chunks.push(chunk);
    };
    const end = () => finish(), abort = () => finish('INVALID_INPUT');
    const timer = setTimeout(() => finish('SERVICE_UNAVAILABLE'), 10000);
    request.on('data', data); request.once('end', end); request.once('aborted', abort); request.once('error', abort);
  });
}
export const id = agendaId;
export function create(value: unknown) { return parseCreateFoxyConversation(value); }
export function rename(value: unknown) {
  const v = strictObject(value, ['revision', 'title']);
  return { revision: agendaRevision(v.revision), title: parseCreateFoxyConversation({ requestId: '00000000-0000-0000-0000-000000000000',
    title: v.title, context: { kind: 'GENERAL' } }).title };
}
export function remove(value: unknown) {
  const v = strictObject(value, ['revision', 'confirm']);
  if (v.confirm !== true) return invalid();
  return { revision: agendaRevision(v.revision), confirm: true };
}
export function message(value: unknown) {
  return parseSendFoxyMessage(value, { kind: 'CLASSROOM', classroomId: '00000000-0000-0000-0000-000000000000' });
}

export function visual(value: unknown) {
  return parseStartFoxyVisual(value, { kind: 'CLASSROOM', classroomId: '00000000-0000-0000-0000-000000000000' });
}
