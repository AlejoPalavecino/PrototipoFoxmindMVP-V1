import type { IncomingMessage } from 'node:http';
import { AgendaError, agendaObject } from '../../../../../../../src/core/domain/agenda/index.ts';

export function agendaQuery(url: URL, allowed: string[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of url.searchParams) {
    if (Object.hasOwn(result, key)) throw new AgendaError('INVALID_INPUT');
    result[key] = value;
  }
  agendaObject(result, allowed);
  return result;
}
export function readAgendaBody(request: IncomingMessage): Promise<unknown> {
  if (!/^application\/json(?:\s*;\s*charset=utf-8)?$/i.test(request.headers['content-type'] ?? '')
    || request.headers['content-encoding'] !== undefined) return Promise.reject(new AgendaError('INVALID_INPUT'));
  return new Promise((resolve, reject) => {
    let size = 0, settled = false;
    const chunks: Buffer[] = [];
    const finish = (error?: AgendaError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      request.off('data', data); request.off('end', end);
      request.off('aborted', abort); request.off('error', abort);
      if (error) { request.resume(); reject(error); return; }
      try { resolve(JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)))); }
      catch { reject(new AgendaError('INVALID_INPUT')); }
    };
    const data = (chunk: Buffer) => {
      size += chunk.length;
      if (size > 32768) finish(new AgendaError('INVALID_INPUT'));
      else chunks.push(chunk);
    };
    const end = () => finish(), abort = () => finish(new AgendaError('INVALID_INPUT'));
    const timer = setTimeout(() => finish(new AgendaError('SERVICE_UNAVAILABLE')), 10000);
    request.on('data', data); request.once('end', end);
    request.once('aborted', abort); request.once('error', abort);
  });
}
