import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { createHomeHandler } from '../apps/api/src/modules/home/dashboard/presentation/http.ts';
import { createFilesHandler } from '../apps/api/src/modules/files/uploads/presentation/http.ts';
import { installStudyUploads } from '../apps/api/src/modules/study/folders/presentation/uploads/http.ts';
import { installStudyReminders } from '../apps/api/src/modules/study/folders/presentation/reminders/http.ts';
import { installChatAttachmentTransport } from '../apps/api/src/bootstrap/chat-attachment-transport.ts';

// D3 (TASK-001): pins the error responses each API host produces today (status, code, headers, body shape),
// so extracting a shared transport into platform/http can prove it changed none of them. Identity is
// characterized by tests/p33-identity-http.test.mjs (wrappers). Cases already pinned elsewhere are not repeated.
const id = 'a1111111-1111-4111-8111-111111111111', other = 'b2222222-2222-4222-8222-222222222222';

async function serve(handler) {
  const server = createServer((req, res) => handler(req, res, () => { res.writeHead(404, { 'content-type': 'text/plain' }); res.end('next'); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const call = async (path, init = {}) => {
    const response = await fetch(origin + path, init);
    const text = await response.text();
    return { status: response.status, headers: response.headers, text, json: text ? JSON.parse(text) : undefined };
  };
  return { call, close: () => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }) };
}
// Collects the handler an installer registers with `app.use(prefix, handler)`; the host strips `/api/v1`.
function installed(install) {
  const handlers = [];
  install({ use: (_prefix, handler) => handlers.push(handler) });
  return (req, res, next) => { req.url = req.url.replace(/^\/api\/v1/, ''); handlers[0](req, res, next); };
}
function standardHeaders(result, label) {
  assert.equal(result.headers.get('cache-control'), 'no-store', label);
  assert.equal(result.headers.get('x-content-type-options'), 'nosniff', label);
  assert.match(result.headers.get('content-type') ?? '', /^application\/json/, label);
}
const throwing = code => async () => { throw Object.assign(new Error(code), { code }); };

test('home: 404 and 405 before admission, admission codes mapped, unknown codes masked as 503', async () => {
  let admitted = 0, admit = async () => { admitted++; };
  const server = await serve(createHomeHandler({ read: async () => ({}), page: async () => ({}) }, { admit: (...args) => admit(...args) }));
  try {
    const missing = await server.call('/home/unknown');
    assert.equal(missing.status, 404); assert.deepEqual(missing.json, { error: { code: 'NOT_FOUND' } }); standardHeaders(missing, '404');
    const method = await server.call('/home', { method: 'POST' });
    assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), 'GET');
    assert.deepEqual(method.json, { error: { code: 'METHOD_NOT_ALLOWED' } }); standardHeaders(method, '405');
    assert.equal(admitted, 0);
    const encoded = await server.call('/home', { headers: { 'content-encoding': 'gzip' } });
    assert.equal(encoded.status, 400); assert.deepEqual(encoded.json, { error: { code: 'INVALID_INPUT' } });
    admit = throwing('RATE_LIMITED');
    const limited = await server.call('/home');
    assert.equal(limited.status, 429); assert.deepEqual(limited.json, { error: { code: 'RATE_LIMITED' } }); assert.equal(limited.headers.get('retry-after'), null);
    admit = throwing('SOMETHING_ELSE');
    const unknown = await server.call('/home');
    assert.equal(unknown.status, 503); assert.deepEqual(unknown.json, { error: { code: 'SERVICE_UNAVAILABLE' } }); standardHeaders(unknown, '503');
  } finally { await server.close(); }
});

test('agenda: unknown path and wrong method are 404 NOT_FOUND after admission; oversized body 400; unknown codes 503', async () => {
  const { createAgendaHandler } = loadTsModule('apps/api/src/modules/agenda/events/presentation/http.ts');
  let admitted = 0, upcoming = async () => ({ items: [] });
  const service = { put: async () => ({}), get: async () => ({}), replace: async () => ({}), remove: async () => {},
    list: async () => ({}), upcoming: (...args) => upcoming(...args), open: async () => ({}) };
  const server = await serve(createAgendaHandler(service, { admit: async () => { admitted++; } }));
  try {
    for (const [path, method] of [['/agenda/unknown', 'GET'], [`/agenda/events/${id}`, 'POST']]) {
      const result = await server.call(path, { method, headers: { 'content-type': 'application/json' }, body: method === 'GET' ? undefined : '{}' });
      assert.equal(result.status, 404, `${method} ${path}`); assert.deepEqual(result.json, { error: { code: 'NOT_FOUND' } }); standardHeaders(result, path);
    }
    assert.equal(admitted, 2);
    const large = await server.call(`/agenda/events/${id}`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(32_768) }) });
    assert.equal(large.status, 400); assert.deepEqual(large.json, { error: { code: 'INVALID_INPUT' } });
    upcoming = throwing('SOMETHING_ELSE');
    const unknown = await server.call('/agenda/upcoming');
    assert.equal(unknown.status, 503); assert.deepEqual(unknown.json, { error: { code: 'SERVICE_UNAVAILABLE' } });
  } finally { await server.close(); }
});

test('ai quota: 405 with Allow, its own headers, empty read 503 and unknown admission errors 500', async () => {
  const { createAiQuotaHandler } = loadTsModule('apps/api/src/bootstrap/ai-quota-http.ts');
  let admit = async () => 'session', read = async () => null;
  const server = await serve(createAiQuotaHandler({ admit: (...args) => admit(...args), read: (...args) => read(...args) }));
  try {
    const method = await server.call('/api/v1/ai-quota', { method: 'POST' });
    assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), 'GET');
    assert.deepEqual(method.json, { error: { code: 'METHOD_NOT_ALLOWED' } }); standardHeaders(method, '405');
    assert.equal(method.headers.get('cross-origin-resource-policy'), 'same-origin');
    assert.match(method.headers.get('x-request-id') ?? '', /^[0-9a-f-]{36}$/);
    const empty = await server.call('/api/v1/ai-quota');
    assert.equal(empty.status, 503); assert.deepEqual(empty.json, { error: { code: 'SERVICE_UNAVAILABLE' } });
    admit = async () => { throw new Error('unexpected'); };
    const unknown = await server.call('/api/v1/ai-quota');
    assert.equal(unknown.status, 500); assert.deepEqual(unknown.json, { error: { code: 'INTERNAL_ERROR' } });
  } finally { await server.close(); }
});

test('files: 404 NOT_FOUND with requestId, JSON intent too large 413, encoding 400, unknown errors 503 with Retry-After 3', async () => {
  let status = async () => ({});
  const server = await serve(createFilesHandler({ status: (...args) => status(...args) }));
  try {
    const missing = await server.call(`/files/${id}`, { method: 'DELETE' });
    assert.equal(missing.status, 404); assert.equal(missing.json.error.code, 'NOT_FOUND');
    assert.equal(missing.json.error.requestId, missing.headers.get('x-request-id')); standardHeaders(missing, '404');
    const large = await server.call('/files', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(16_384) }) });
    assert.equal(large.status, 413); assert.equal(large.json.error.code, 'FILE_TOO_LARGE');
    const encoded = await server.call(`/files/${id}`, { headers: { 'content-encoding': 'gzip' } });
    assert.equal(encoded.status, 400); assert.equal(encoded.json.error.code, 'INVALID_UPLOAD');
    status = async () => { throw new Error('unexpected'); };
    const unknown = await server.call(`/files/${id}`);
    assert.equal(unknown.status, 503); assert.equal(unknown.json.error.code, 'SERVICE_UNAVAILABLE');
    assert.equal(unknown.headers.get('retry-after'), '3'); assert.equal(unknown.json.error.requestId, unknown.headers.get('x-request-id'));
  } finally { await server.close(); }
});

test('study uploads and reminders: 405 without Allow, oversized intent 400, query 400, unknown errors 503', async () => {
  let begin = async () => ({});
  const uploads = await serve(installed(app => installStudyUploads(app, { begin: (...args) => begin(...args) }, async () => 'owner')));
  const reminders = await serve(installed(app => installStudyReminders(app, { list: async () => [], read: async () => ({}) }, async () => {})));
  try {
    const method = await uploads.call(`/api/v1/study-folders/${id}/uploads/${other}`, { method: 'DELETE' });
    assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), null);
    assert.deepEqual(method.json, { error: { code: 'METHOD_NOT_ALLOWED' } }); standardHeaders(method, '405');
    const large = await uploads.call(`/api/v1/study-folders/${id}/uploads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(4096) }) });
    assert.equal(large.status, 400); assert.deepEqual(large.json, { error: { code: 'INVALID_INPUT' } });
    begin = async () => { throw new Error('unexpected'); };
    const unknown = await uploads.call(`/api/v1/study-folders/${id}/uploads`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(unknown.status, 503); assert.deepEqual(unknown.json, { error: { code: 'SERVICE_UNAVAILABLE' } });
    const remindersMethod = await reminders.call('/api/v1/study-folders/reminders', { method: 'PUT' });
    assert.equal(remindersMethod.status, 405); assert.deepEqual(remindersMethod.json, { error: { code: 'METHOD_NOT_ALLOWED' } });
    const query = await reminders.call('/api/v1/study-folders/reminders?x=1');
    assert.equal(query.status, 400); assert.deepEqual(query.json, { error: { code: 'INVALID_INPUT' } });
  } finally { await uploads.close(); await reminders.close(); }
});

test('chat attachments: 404 NOT_FOUND and 405 before admission, wrong content type 400 INVALID_UPLOAD', async () => {
  let admitted = 0;
  const server = await serve(installed(app => installChatAttachmentTransport(app,
    { list: async () => [], authorize: async () => {}, upload: async () => ({}) }, async () => { admitted++; return 'owner'; })));
  try {
    const missing = await server.call(`/api/v1/chat-attachments/other/${id}`);
    assert.equal(missing.status, 404); assert.deepEqual(missing.json, { error: { code: 'NOT_FOUND' } }); standardHeaders(missing, '404');
    const method = await server.call(`/api/v1/chat-attachments/teacher/${id}`, { method: 'POST' });
    assert.equal(method.status, 405); assert.equal(method.headers.get('allow'), null);
    assert.deepEqual(method.json, { error: { code: 'METHOD_NOT_ALLOWED' } });
    assert.equal(admitted, 0);
    const type = await server.call(`/api/v1/chat-attachments/teacher/${id}/${other}?name=guia.pdf`, { method: 'PUT', headers: { 'content-type': 'text/plain' }, body: 'x' });
    assert.equal(type.status, 400); assert.deepEqual(type.json, { error: { code: 'INVALID_UPLOAD' } });
  } finally { await server.close(); }
});

test('foxy: unknown route 404 NOT_FOUND after admission, admission codes mapped, unknown codes 503', async () => {
  const { createFoxyHandler } = loadTsModule('apps/api/src/modules/foxy/presentation/http.ts');
  let admitted = 0, admit = async () => { admitted++; };
  const server = await serve(createFoxyHandler({}, { admit: (...args) => admit(...args) }));
  try {
    const missing = await server.call('/api/v1/foxy-ai/unknown');
    assert.equal(missing.status, 404); assert.deepEqual(missing.json, { error: { code: 'NOT_FOUND' } }); standardHeaders(missing, '404');
    assert.equal(admitted, 1);
    admit = throwing('RATE_LIMITED');
    const limited = await server.call('/api/v1/foxy-ai/unknown');
    assert.equal(limited.status, 429); assert.deepEqual(limited.json, { error: { code: 'RATE_LIMITED' } });
    admit = throwing('SOMETHING_ELSE');
    const unknown = await server.call('/api/v1/foxy-ai/unknown');
    assert.equal(unknown.status, 503); assert.deepEqual(unknown.json, { error: { code: 'SERVICE_UNAVAILABLE' } });
  } finally { await server.close(); }
});

test('classrooms: unmatched route 404 with code INVALID_INPUT after admission, unknown errors 503 without requestId', async () => {
  const { createClassroomsHandler } = loadTsModule('apps/api/src/bootstrap/academic-http.ts');
  let admitted = 0, mine = async () => [];
  const server = await serve(createClassroomsHandler({ mine: (...args) => mine(...args) }, { admit: async () => { admitted++; } }));
  try {
    const missing = await server.call(`/classrooms/drafts/${id}/unknown`);
    assert.equal(missing.status, 404); assert.deepEqual(missing.json, { error: { code: 'INVALID_INPUT' } }); standardHeaders(missing, '404');
    assert.equal(admitted, 1);
    mine = async () => { throw new Error('unexpected'); };
    const unknown = await server.call('/classrooms');
    assert.equal(unknown.status, 503); assert.deepEqual(unknown.json, { error: { code: 'SERVICE_UNAVAILABLE' } }); standardHeaders(unknown, '503');
  } finally { await server.close(); }
});

test('study folders: unmatched method 400 INVALID_INPUT, oversized body 413, quota code mapped, unknown codes 503', async () => {
  const { createStudyHandler } = loadTsModule('apps/api/src/modules/study/folders/presentation/http.ts');
  let create = async () => ({});
  const server = await serve(createStudyHandler({ list: async () => [], create: (...args) => create(...args), sharedStrategy: {} }, async () => {}));
  try {
    const method = await server.call('/api/v1/study-folders', { method: 'DELETE' });
    assert.equal(method.status, 400); assert.deepEqual(method.json, { error: { code: 'INVALID_INPUT' } }); standardHeaders(method, '400');
    const large = await server.call('/api/v1/study-folders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text: 'x'.repeat(512 * 1024) }) });
    assert.equal(large.status, 413); assert.deepEqual(large.json, { error: { code: 'PAYLOAD_TOO_LARGE' } });
    create = throwing('AI_TIMEOUT');
    const timeout = await server.call('/api/v1/study-folders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(timeout.status, 504); assert.deepEqual(timeout.json, { error: { code: 'AI_TIMEOUT' } });
    create = async () => { throw new Error('unexpected'); };
    const unknown = await server.call('/api/v1/study-folders', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.equal(unknown.status, 503); assert.deepEqual(unknown.json, { error: { code: 'SERVICE_UNAVAILABLE' } });
  } finally { await server.close(); }
});
