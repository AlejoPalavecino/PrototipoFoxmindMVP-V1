import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

// D3 (TASK-005): pins where every Foxy route dispatches (service, method, arguments) and with which status,
// before foxyRoute is split. Body parsers are replaced by tagging stubs, so each row checks routing and
// argument plumbing without building valid domain bodies; query and id parsers stay real, so their key
// lists stay pinned.
const realInput = loadTsModule('apps/api/src/modules/foxy/presentation/http-input.ts');
const tag = name => value => ({ [name]: value });
const { foxyRoute } = loadTsModule('apps/api/src/modules/foxy/presentation/http-routes.ts', { stubs: {
  './http-input.ts': { ...realInput, body: async request => request.testBody,
    create: tag('create'), rename: tag('rename'), remove: tag('remove'), message: tag('message'), visual: tag('visual') },
  '../../../../../../src/core/domain/foxy/resource-validation.ts': Object.fromEntries(['parseEditFoxyResource', 'parsePrepareFoxyPublication',
    'parsePrepareFoxyVisualPublication', 'parseConfirmFoxyPublication', 'parseRetryFoxyPublication', 'parseDiscardFoxyPublication'].map(name => [name, tag(name)])),
  '../../../../../../src/core/domain/foxy/source-query.ts': { parseFoxySourceQuery: tag('source') },
} });

const A = 'a1111111-1111-4111-8111-111111111111', B = 'b2222222-2222-4222-8222-222222222222';
const file = { bytes: new Uint8Array([1, 2, 3]), headers: { 'Content-Type': 'application/pdf' } };
const optional = ['privateAssetEditorial', 'creations', 'visuals', 'privateAssetReader', 'privateAssetReadService'];

function fixture({ created = true, without = [] } = {}) {
  const calls = [];
  const service = name => new Proxy({}, { get: (_target, method) => async (_request, ...args) => {
    calls.push([name, method, ...args]);
    return method === 'readFile' ? file : { created, from: `${name}.${String(method)}` };
  } });
  const services = Object.fromEntries(['conversations', 'turns', 'catalog', 'citations', 'resources', 'publications',
    'publicationFiles', 'publicationManagement', ...optional].filter(name => !without.includes(name)).map(name => [name, service(name)]));
  services.capabilities = async () => { calls.push(['capabilities']); return { from: 'capabilities' }; };
  const signal = new AbortController().signal;
  const route = (method, path, body) => foxyRoute(services, { method, headers: {}, testBody: body },
    new URL(`http://foxy.invalid/api/v1/foxy-ai${path}`), signal);
  return { calls, route, signal };
}

test('every Foxy route dispatches to its service method with its arguments and status', async () => {
  const payload = { any: 'body' };
  const rows = [
    ['PATCH', `/assets/${A}/editorial`, payload, ['privateAssetEditorial', 'edit', A, payload], 200],
    ['GET', `/assets/${A}`, undefined, ['privateAssetReadService', 'inspect', A], 200],
    ['GET', `/assets/${A}/file?mode=preview`, undefined, ['privateAssetReader', 'readFile', A, 'preview', 'SIGNAL'], 200, 'binary'],
    ['GET', `/assets/${A}/file`, undefined, ['privateAssetReader', 'readFile', A, 'download', 'SIGNAL'], 200, 'binary'],
    ['GET', '/capabilities', undefined, ['capabilities'], 200],
    ['GET', '/creations?limit=5&q=guia&type=QUIZ', undefined, ['creations', 'list', { limit: 5, after: null, q: 'guia', context: undefined, type: 'QUIZ', status: undefined }], 200],
    ['POST', '/conversations', payload, ['conversations', 'create', { create: payload }], 201],
    ['GET', '/conversations?limit=3&q=x', undefined, ['conversations', 'list', { limit: 3, after: null, q: 'x', context: undefined }], 200],
    ['POST', `/conversations/${A}/visuals/${B}/cancel`, {}, ['visuals', 'cancel', A, B], 200],
    ['POST', `/conversations/${A}/visuals`, payload, ['visuals', 'start', A, { visual: payload }], 202],
    ['GET', `/conversations/${A}/visuals/${B}`, undefined, ['visuals', 'get', A, B], 200],
    ['GET', `/conversations/${A}/visuals?limit=4&afterId=${B}`, undefined, ['visuals', 'list', A, { limit: 4, afterId: B }], 200],
    ['POST', `/conversations/${A}/turns/${B}/cancel`, {}, ['turns', 'cancel', A, B], 200],
    ['POST', `/conversations/${A}/turns/${B}/resource`, undefined, ['resources', 'fromTurn', A, B], 201],
    ['POST', `/resources/${A}/activity-draft`, payload, ['resources', 'prepareActivity', A, payload], 200],
    ['POST', `/resources/${A}/publications`, payload, ['publications', 'prepare', A, { parsePrepareFoxyPublication: payload }], 202],
    ['GET', `/resources/${A}/publications?limit=2`, undefined, ['publications', 'list', A, { limit: 2, afterId: null }], 200],
    ['POST', `/assets/${A}/publications`, payload, ['publications', 'prepareVisual', A, { parsePrepareFoxyVisualPublication: payload }], 202],
    ['GET', `/assets/${A}/publications`, undefined, ['publications', 'listVisual', A, { limit: 20, afterId: null }], 200],
    ['GET', `/publications/${A}/management`, undefined, ['publicationManagement', 'inspect', A], 200],
    ['POST', `/publications/${A}/retry`, payload, ['publicationManagement', 'retry', A, { parseRetryFoxyPublication: payload }], 200],
    ['POST', `/publications/${A}/discard`, payload, ['publicationManagement', 'discard', A, { parseDiscardFoxyPublication: payload }], 200],
    ['GET', `/publications/${A}/file?mode=preview`, undefined, ['publicationFiles', 'readFile', A, 'preview'], 200, 'binary'],
    ['GET', `/publications/${A}`, undefined, ['publications', 'inspect', A], 200],
    ['POST', `/publications/${A}/confirm`, payload, ['publications', 'confirm', A, { parseConfirmFoxyPublication: payload }], 200],
    ['GET', `/resources/${A}`, undefined, ['resources', 'get', A], 200],
    ['PATCH', `/resources/${A}`, payload, ['resources', 'edit', A, { parseEditFoxyResource: payload }], 200],
    ['GET', `/conversations/${A}/turns/${B}/citations`, undefined, ['citations', 'list', A, B], 200],
    ['GET', `/conversations/${A}/turns/${B}/citations/c2/file`, undefined, ['citations', 'readFile', A, B, 'c2', 'download'], 200, 'binary'],
    ['GET', `/conversations/${A}`, undefined, ['conversations', 'get', A], 200],
    ['PATCH', `/conversations/${A}`, payload, ['conversations', 'rename', A, { rename: payload }], 200],
    ['DELETE', `/conversations/${A}`, payload, ['conversations', 'remove', A, { remove: payload }], 204, 'empty'],
    ['GET', `/conversations/${A}/turns/${B}`, undefined, ['turns', 'get', A, B], 200],
    ['POST', `/conversations/${A}/turns`, payload, ['turns', 'send', A, { message: payload }], 202],
    ['GET', `/conversations/${A}/turns?afterSequence=3&limit=9`, undefined, ['turns', 'list', A, { afterSequence: 3, limit: 9 }], 200],
    ['GET', `/conversations/${A}/curriculum`, undefined, ['catalog', 'curriculum', A], 200],
    ['GET', `/conversations/${A}/sources?kind=MATERIAL&limit=7`, undefined, ['catalog', 'sources', A, { source: { kind: 'MATERIAL', limit: 7, after: null } }], 200],
  ];
  for (const [method, path, body, expected, status, shape] of rows) {
    const { calls, route, signal } = fixture();
    const result = await route(method, path, body);
    const label = `${method} ${path}`;
    assert.deepEqual(calls, [expected.map(value => (value === 'SIGNAL' ? signal : value))], label);
    assert.equal(result.status, status, label);
    if (shape === 'binary') { assert.equal(result.binary, file.bytes, label); assert.deepEqual(result.headers, file.headers, label); }
    else if (shape === 'empty') assert.equal(result.body, undefined, label);
    else assert.equal(result.body.from, expected[0] === 'capabilities' ? 'capabilities' : `${expected[0]}.${expected[1]}`, label);
  }
});

test('created flags choose 200 instead of 201/202 on the routes that return them', async () => {
  for (const [method, path, body] of [['POST', '/conversations', {}], ['POST', `/conversations/${A}/visuals`, {}],
    ['POST', `/conversations/${A}/turns/${B}/resource`], ['POST', `/resources/${A}/publications`, {}],
    ['POST', `/assets/${A}/publications`, {}], ['POST', `/conversations/${A}/turns`, {}]]) {
    const { route } = fixture({ created: false });
    assert.equal((await route(method, path, body)).status, 200, `${method} ${path}`);
  }
});

test('wrong methods on known paths and unknown paths answer 404 NOT_FOUND without dispatching', async () => {
  for (const [method, path] of [['DELETE', '/capabilities'], ['PUT', `/resources/${A}`], ['GET', `/publications/${A}/confirm`],
    ['POST', `/conversations/${A}/curriculum`], ['GET', `/publications/${A}/retry`], ['PATCH', '/conversations'],
    ['PUT', `/conversations/${A}/turns`], ['DELETE', `/conversations/${A}/visuals`], ['GET', '/unknown'], ['GET', `/conversations/${A}/other`]]) {
    const { calls, route } = fixture();
    const result = await route(method, path, {});
    assert.equal(result.status, 404, `${method} ${path}`);
    assert.deepEqual(result.body, { error: { code: 'NOT_FOUND' } }, `${method} ${path}`);
    assert.deepEqual(calls, [], `${method} ${path}`);
  }
});

test('query key lists are enforced per route', async () => {
  for (const path of ['/capabilities?x=1', '/conversations?other=1', `/conversations/${A}?x=1`, `/conversations/${A}/turns?after=1`,
    `/conversations/${A}/visuals?cursor=1`, `/resources/${A}/publications?q=1`, `/publications/${A}/file?mode=html`,
    `/conversations/${A}/sources?q=1`, '/creations?limit=51', `/assets/${A}/file?mode=preview&mode=download`]) {
    const { calls, route } = fixture();
    await assert.rejects(route('GET', path), { code: 'INVALID_INPUT' }, path);
    assert.deepEqual(calls, [], path);
  }
});

test('a missing optional service answers 404 only after the route checked its query', async () => {
  for (const [name, method, path, body] of [['privateAssetEditorial', 'PATCH', `/assets/${A}/editorial`, {}],
    ['privateAssetReadService', 'GET', `/assets/${A}`], ['privateAssetReader', 'GET', `/assets/${A}/file`],
    ['creations', 'GET', '/creations'], ['visuals', 'GET', `/conversations/${A}/visuals/${B}`]]) {
    const { route } = fixture({ without: [name] });
    assert.deepEqual(await route(method, path, body), { status: 404, body: { error: { code: 'NOT_FOUND' } } }, `${name} ${path}`);
    await assert.rejects(fixture({ without: [name] }).route(method, `${path}?unexpected=1`, body), { code: 'INVALID_INPUT' }, `${name} query first`);
  }
});
