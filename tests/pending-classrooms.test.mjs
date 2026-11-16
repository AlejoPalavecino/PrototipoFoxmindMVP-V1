import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants } from './agenda-ui-helpers.test.mjs';
import { collectionView } from './helpers/classrooms-reference/collection-view.mjs';
import { createServer } from 'node:http';
const text = n => typeof n === 'string' || typeof n === 'number' ? String(n) : Array.isArray(n) ? n.map(text).join('') : n?.props ? text(n.props.children) : '';
const pending = { id: '11111111-1111-4111-8111-111111111111', revision: '2', publishedClassroomId: null, payload: { name: 'Biología', division: 'A', academicYear: 2026 } };
const buttons = view => descendants(view.tree, n => n.type === 'button');
test('teacher pending state has its own count and cards, students cannot select it', async () => {
  const { ClassroomCollection } = loadTsModule("apps/web/src/features/classrooms/ui/ClassroomCollection.tsx");
  for (const role of ['teacher', 'student']) {
    const view = collectionView(ClassroomCollection, { accountRole: role, teach: [], study: [], drafts: [pending], search: '', onEnter() {}, onContinue() {}, onDelete() {} });
    try {
      await view.flush();
      const toggle = buttons(view).find(n => text(n).startsWith('Borradores'));
      if (role === 'student') { assert.equal(toggle, undefined); continue; }
      assert.equal(text(toggle), 'Borradores 1');
      assert.equal(descendants(view.tree, n => n.type?.name === 'PendingClassroomCard').length, 0);
      toggle.props.onClick(); await view.flush();
      assert.equal(descendants(view.tree, n => n.type?.name === 'PendingClassroomCard').length, 1);
      buttons(view).find(n => text(n).startsWith('Archivadas')).props.onClick(); await view.flush();
      assert.equal(descendants(view.tree, n => n.type?.name === 'PendingClassroomCard').length, 0);
    } finally { view.close(); }
  }
});
test('pending cards automatically identify unnamed drafts and offer separate continue/delete actions', () => {
  const { PendingClassroomCard } = loadTsModule("apps/web/src/features/classrooms/ui/PendingClassroomCard.tsx");
  const continued = [], deleted = [];
  const card = PendingClassroomCard({ draft: { ...pending, payload: {} }, onContinue: id => continued.push(id), onDelete: item => deleted.push(item), busy: false });
  assert.match(text(card), /Pendiente de creación/); assert.match(text(card), /Tu próxima aula/);
  const actions = descendants(card, n => n.type === 'button');
  actions.find(n => text(n) === 'Continuar creación').props.onClick();
  actions.find(n => n.props['aria-label'] === 'Eliminar borrador sin nombre').props.onClick();
  assert.deepEqual(continued, [pending.id]); assert.equal(deleted.length, 1);
});
test('deletion requires confirmation and current revision and refuses published drafts', async () => {
  const { DraftService } = loadTsModule("apps/api/src/bootstrap/academic-management-composition.ts");
  let row = { id: pending.id, revision: 2n, published_classroom_id: null }, writes = 0;
  const service = new DraftService({ ports: {}, classroom() {}, run: async (_request, _write, fn) => fn({ query: async sql => {
    if (sql.startsWith('SELECT')) return [row];
    writes++; return [{ id: row.id }];
  } }, { id: 'owner', account_role: 'teacher' }) });
  await assert.rejects(() => service.deleteDraft({}, pending.id, { revision: '2', confirm: false }), e => e.code === 'INVALID_INPUT');
  await assert.rejects(() => service.deleteDraft({}, pending.id, { revision: '1', confirm: true }), e => e.code === 'CONFLICT');
  row.published_classroom_id = 'created';
  await assert.rejects(() => service.deleteDraft({}, pending.id, { revision: '2', confirm: true }), e => e.code === 'CONFLICT');
  assert.equal(writes, 0); row.published_classroom_id = null;
  await service.deleteDraft({}, pending.id, { revision: '2', confirm: true }); assert.equal(writes, 1);
});
test('DELETE crosses the Next proxy and HTTP admission with strict reviewed input', async () => {
  const { proxyClassroomRequest } = loadTsModule("apps/web/src/application/server/classroom-proxy.ts");
  const { createClassroomsHandler } = loadTsModule("apps/api/src/bootstrap/academic-http.ts");
  const calls = [];
  const handler = createClassroomsHandler({ deleteDraft: async (_req, id, input) => { calls.push({ id, input }); return { deleted: true }; } }, {
    admit: async (req, write) => { assert.equal(write, true); if (!req.headers['x-csrf-token']) throw new Error('deny'); },
  });
  const api = createServer((req, res) => { req.url = req.url.replace('/api/v1', ''); handler(req, res, () => res.end()); });
  await new Promise(resolve => api.listen(0, '127.0.0.1', resolve));
  const web = createServer((req, res) => void proxyClassroomRequest(req, res, `http://127.0.0.1:${api.address().port}`));
  await new Promise(resolve => web.listen(0, '127.0.0.1', resolve));
  const send = (input, csrf = true) => fetch(`http://127.0.0.1:${web.address().port}/api/v1/classrooms/drafts/${pending.id}`, {
    method: 'DELETE', headers: { 'content-type': 'application/json', cookie: 'foxmind_session=synthetic', origin: 'http://web.test', ...(csrf ? { 'x-csrf-token': 'synthetic' } : {}) }, body: JSON.stringify(input),
  });
  try {
    const input = { revision: '2', confirm: true };
    const result = await send(input); assert.equal(result.status, 200); assert.deepEqual(await result.json(), { deleted: true });
    assert.equal(result.headers.get('cache-control'), 'no-store');
    assert.deepEqual(calls, [{ id: pending.id, input }]);
    for (const invalid of [{ ...input, ownerId: 'forged' }, { ...input, confirm: 'true' }, { confirm: true }]) assert.equal((await send(invalid)).status, 400);
    assert.equal((await send(input, false)).status, 403); assert.equal(calls.length, 1);
  } finally {
    for (const server of [web, api]) await new Promise(resolve => { server.closeAllConnections(); server.close(resolve); });
  }
});
test('deleting a draft does not block cleanup of incomplete uploads', async () => {
  const { cleanIncomplete } = loadTsModule("apps/api/src/modules/files/infrastructure/cleanup.ts");
  const { FileStore } = loadTsModule("apps/api/src/modules/files/infrastructure/store.ts");
  const ids = ['22222222-2222-4222-8222-222222222222', '33333333-3333-4333-8333-333333333333'], removes = [];
  const rows = new Map(ids.map(id => [id, { id, storage_key: id, classroom_id: null, classroom_draft_id: pending.id,
    upload_status: 'STARTED', phase: 'reserved', last_activity_at: new Date('2026-01-01'),
    completed_at: null, reservation_released_at: null, lease_until: null }]));
  const tx = { query: async (sql, ...args) => {
    if (sql.startsWith('SELECT f.id')) return ids.map(id => ({ id }));
    if (sql.includes('FROM classroom_drafts')) return sql.includes('deleted_at IS NULL') ? [] : [{ owner_id: 'owner', published_classroom_id: null }];
    if (sql.startsWith('SELECT EXISTS')) return [{ linked: false }];
    if (sql.includes("SET phase='deleting'")) Object.assign(rows.get(args[0]), { phase: 'deleting', operation_id: args[1] });
    if (sql.startsWith('UPDATE')) return [];
    throw new Error('Unexpected SQL');
  } };
  const store = { transaction: fn => fn(tx), load: async (_tx, id) => ({ ...rows.get(id) }), now: async () => new Date('2026-11-08'),
    lockScope: FileStore.prototype.lockScope, draftQuotaBytes: 1000n };
  await assert.rejects(store.lockScope(tx, { kind: 'draft', id: pending.id }), e => e.code === 'FORBIDDEN');
  assert.deepEqual(await cleanIncomplete(store, { remove: async key => removes.push(key) }, 100), { deleted: 2, failed: 0 });
  assert.deepEqual(removes, ids);
});
test('pending search respects selected drafts without extra filters or invented values', async () => {
 const {ClassroomCollection}=loadTsModule('apps/web/src/features/classrooms/ui/ClassroomCollection.tsx');
 const view=collectionView(ClassroomCollection,{accountRole:'teacher',teach:[],study:[],drafts:[pending,{...pending,id:'unnamed',payload:{}}],search:'BIOLOGÍA',onEnter(){}});
 try {await view.flush();buttons(view).find(n=>text(n).startsWith('Borradores')).props.onClick();await view.flush();
 assert.equal(descendants(view.tree,n=>n.type?.name==='PendingClassroomCard').length,1);
 assert.equal(buttons(view).find(n=>text(n).startsWith('Filtros')),undefined);
 } finally {view.close();}
});

test('Retomar creación elige el primer borrador de la proyección ordenada por actualización descendente', async () => {
 const {ClassroomCollection}=loadTsModule('apps/web/src/features/classrooms/ui/ClassroomCollection.tsx');
 const recent={...pending,id:'recent',payload:{name:'QA guardado recién'}},older={...pending,id:'older',payload:{name:'Anterior'}};
 const continued=[];const view=collectionView(ClassroomCollection,{accountRole:'teacher',teach:[],study:[],drafts:[recent,older],search:'',onEnter(){},onContinue:id=>continued.push(id)});
 try {await view.flush();const banner=descendants(view.tree,n=>n.type==='aside'&&n.props.className==='draft-nudge')[0];
 assert.match(text(banner),/QA guardado recién/);assert.doesNotMatch(text(banner),/Anterior/);
 descendants(banner,n=>n.type==='button')[0].props.onClick();assert.deepEqual(continued,['recent']);
 }finally{view.close();}
});
