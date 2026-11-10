import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from "../../../../../../tests/helpers/load-ts-module.mjs";

const conversation = () => ({ id: randomUUID(), title: 'Original', context: { kind: 'GENERAL' }, revision: '0' });
function chatFixture() {
  const a = conversation(), outside = conversation(), sent = [];
  const client = {
    capabilities: async () => ({}), listConversations: async () => ({ items: [a], next: null }),
    getConversation: async id => id === outside.id ? outside : a,
    listTurns: async () => ({ items: [], nextAfterSequence: null }),
    renameConversation: async (id, input) => { sent.push(input); return { ...a, id, ...input, revision: '1' }; },
    createConversation: async input => ({ conversation: { ...outside, ...input, revision: '0' } }),
    curriculum: async () => ({ canGenerate: true, units: [], context: { kind: 'CLASSROOM' }, classroomTitle: 'Aula' }),
  };
  return { a, outside, client, sent, controller: loadTsModule("apps/web/src/features/foxy/model/foxy-chat-controller.ts").createFoxyChatController({ client, onChange() {} }) };
}
test('renaming persists the returned revision and rejects empty title without a request', async () => {
  const f = chatFixture(), c = f.controller; await c.init(); await c.select(f.a.id);
  assert.equal(await c.rename('   '), false); assert.equal(f.sent.length, 0);
  assert.equal(await c.rename('Mi clase'), true); assert.deepEqual(f.sent, [{ revision: '0', title: 'Mi clase' }]);
  assert.equal(c.getState().current.title, 'Mi clase'); assert.equal(c.getState().current.revision, '1'); c.dispose();
});
test('rename conflict refreshes revision without overwriting the teacher title and supports explicit retry', async () => {
  const f = chatFixture(), c = f.controller; await c.init(); await c.select(f.a.id);
  f.client.renameConversation = async () => { throw Object.assign(Error(), { code: 'CONFLICT' }); };
  f.client.getConversation = async () => ({ ...f.a, title: 'Otra sesión', revision: '4' });
  assert.equal(await c.rename('Mi título'), false); assert.match(c.getState().error, /cambió/iu);
  assert.equal(c.getState().current.title, 'Otra sesión'); assert.equal(c.getState().current.revision, '4'); c.dispose();
});
test('conversation found by search opens even outside the first 50 conversations', async () => {
  const f = chatFixture(), c = f.controller; await c.init(); await c.select(f.outside.id);
  assert.equal(c.getState().current.id, f.outside.id); assert.equal(c.getState().error, null); c.dispose();
});
test('preparing classroom context loads its curriculum without sending a first message', async () => {
  const f = chatFixture(), c = f.controller; await c.init(); const room = randomUUID();
  assert.equal(await c.prepareContext(room), true); assert.equal(c.getState().current.context.classroomId, room);
  assert.equal(c.getState().turns.length, 0); assert.ok(c.getState().curriculum); c.dispose();
});
test('catalog applies filters server-side, rejects late search results and follows continuation', async () => {
  const calls = [], old = {}; old.promise = new Promise(resolve => old.resolve = resolve);
  const first = conversation(), last = conversation(), cursor = { updatedAt: '2026-11-08T12:00:00.000Z', id: first.id };
  const client = { listCreations: async () => ({ items: [], next: null }), listConversations: async page => {
    calls.push(page); if (page.q === 'viejo') return old.promise;
    return page.after ? { items: [last], next: null } : { items: [first], next: cursor };
  } };
  const c = loadTsModule("apps/web/src/features/foxy/model/foxy-catalog-controller.ts").createFoxyCatalogController({ client, onChange() {} });
  const pending = c.setConversationQuery({ q: 'viejo', context: 'ALL' });
  await c.setConversationQuery({ q: 'nuevo', context: 'GENERAL' });
  old.resolve({ items: [last], next: null }); await pending;
  assert.equal(c.getState().conversations.items[0].id, first.id);
  await c.moreConversations(); assert.equal(c.getState().conversations.items.length, 2);
  assert.equal(calls.at(-1).q, 'nuevo'); assert.equal(calls.at(-1).context, 'GENERAL'); assert.deepEqual(calls.at(-1).after, cursor);
  c.dispose();
});
test('creation filters reset continuation and disposal aborts account-bound requests', async () => {
  let signal, body;
  const c = loadTsModule("apps/web/src/features/foxy/model/foxy-catalog-controller.ts").createFoxyCatalogController({
    client: { listConversations: async () => ({ items: [], next: null }), listCreations: async (page, s) => { signal = s; body = page; return { items: [], next: null }; } }, onChange() {},
  });
  await c.setCreationQuery({ q: 'luz', context: 'GENERAL', type: 'NOTE', status: 'PRIVATE' });
  assert.equal(body.type, 'NOTE'); assert.equal(body.status, 'PRIVATE'); assert.equal(body.after, null);
  c.dispose(); assert.equal(signal.aborted, true);
});
test('opening an older visual loads its exact job without depending on first page', async () => {
  const room = conversation(), job = { id: randomUUID(), conversationId: room.id, state: 'READY', kind: 'DIAGRAM', assetId: randomUUID() };
  const c = loadTsModule("apps/web/src/features/foxy/model/foxy-visual-controller.ts").createFoxyVisualController({
    client: { listVisuals: async () => ({ items: [], nextAfterId: null }), getVisual: async () => job },
    current: () => ({ conversation: room }), onChange() {}, onRevision() {},
  });
  c.syncContext(); assert.equal(await c.openJob(job.id), true);
  assert.equal(c.getState().selectedId, job.id); assert.equal(c.getState().jobs[0].id, job.id); c.dispose();
});
test('background visual refresh cannot strand a direct creation open in busy state', async () => {
  const room = conversation(), running = { id: randomUUID(), conversationId: room.id, state: 'RUNNING' }, target = { ...running, id: randomUUID(), state: 'READY', kind: 'DIAGRAM' };
  let resolve; const gate = new Promise(done => resolve = done);
  const c = loadTsModule("apps/web/src/features/foxy/model/foxy-visual-controller.ts").createFoxyVisualController({
    client: { listVisuals: async () => ({ items: [running] }), getVisual: async () => gate }, current: () => ({ conversation: room }), onChange() {}, onRevision() {},
  });
  try {
    c.syncContext(); await Promise.resolve(); await Promise.resolve();
    const opening = c.openJob(target.id); await c.refresh(); resolve(target);
    assert.equal(await opening, true); assert.equal(c.getState().busy, false); assert.equal(c.getState().selectedId, target.id);
    await c.refresh(); assert.equal(c.getState().selectedId, target.id); assert.ok(c.getState().jobs.some(job => job.id === target.id));
  } finally { c.dispose(); }
});
test('background catalogue refresh keeps triggers mounted and refreshes all loaded pages', async () => {
  const first=conversation(),second=conversation(),cursor={updatedAt:'2026-11-08T12:00:00.000Z',id:first.id};
  let resolve,refreshing=false;const gate=new Promise(done=>resolve=done);
  const c=loadTsModule("apps/web/src/features/foxy/model/foxy-catalog-controller.ts").createFoxyCatalogController({
    client:{listCreations:async()=>({items:[],next:null}),listConversations:async page=>page.after?{items:[second],next:null}:refreshing?gate:{items:[first],next:cursor}},onChange(){},
  });
  try {await c.refresh();await c.moreConversations();refreshing=true;const pending=c.refresh();
    assert.deepEqual(c.getState().conversations.items.map(x=>x.id),[first.id,second.id]);
    resolve({items:[first],next:cursor});await pending;
    assert.deepEqual(c.getState().conversations.items.map(x=>x.id),[first.id,second.id]);
  }finally{c.dispose();resolve?.({items:[],next:null});}
});
