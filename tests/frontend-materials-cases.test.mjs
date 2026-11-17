import test from 'node:test';
import assert from 'node:assert/strict';
import { createMaterialsApi } from '../apps/web/src/features/materials/api.ts';

test('materials operations preserve library routes, revision, payload and abort signal', async () => {
  const calls = [];
  const materials = [{ id: 'material', fileId: 'file' }];
  const activities = [{ id: 'activity' }];
  const signal = new AbortController().signal;
  const api = createMaterialsApi({
    call: async (...args) => {
      calls.push(args);
      return args[0].endsWith('/activities') ? { activities } : materials;
    },
    fileStatus: async () => ({}), fileUrl: () => '',
  });
  assert.equal(await api.list('room', signal), materials);
  assert.equal(await api.listActivities('room', signal), activities);
  const operation = { action: 'edit', id: 'material', description: null, activityIds: [] };
  await api.change('room', '7', operation, signal);
  assert.deepEqual(calls, [
    ['/room/library', 'GET', undefined, signal],
    ['/room/activities', 'GET', undefined, signal],
    ['/room/library', 'POST', { revision: '7', operation }, signal],
  ]);
});

test('material lookup reuses an explicitly supplied collection and otherwise uses the existing library read', async () => {
  let reads = 0;
  const material = { id: 'material', fileId: 'file' };
  const signal = new AbortController().signal;
  const api = createMaterialsApi({
    call: async (path, method, data, receivedSignal) => {
      reads += 1;
      assert.equal(path, '/room/library');
      assert.equal(receivedSignal, signal);
      return [material];
    },
    fileStatus: async () => ({}), fileUrl: () => '',
  });
  assert.equal(await api.findMaterial('room', 'material', { materials: [material] }), material);
  assert.equal(await api.findMaterial('room', 'absent', { materials: [] }), undefined);
  assert.equal(reads, 0);
  assert.equal(await api.findMaterial('room', 'material', { signal }), material);
  assert.equal(reads, 1);
});

test('file operations delegate to the existing material transport and preserve errors', async () => {
  const calls = [];
  const file = new File(['docx'], 'material.docx');
  const state = { id: 'file', ready: false };
  const signal = new AbortController().signal;
  const error = new Error('synthetic rejected write');
  const api = createMaterialsApi({
    call: async () => { throw error; },
    uploadClassroom: async (...args) => { calls.push(args); return state; },
    fileStatus: async (...args) => { calls.push(args); return state; },
    fileUrl: (...args) => { calls.push(args); return '/private/file'; },
  });
  assert.equal(await api.upload('room', file), state);
  assert.equal(await api.fileStatus('file', signal), state);
  assert.equal(api.fileUrl('file', true), '/private/file');
  assert.deepEqual(calls, [['room', file, 'material'], ['file', signal], ['file', true]]);
  await assert.rejects(api.change('room', '1', { action: 'delete', id: 'material', confirm: true }), value => value === error);
  const unavailable = createMaterialsApi({ call: async () => [], fileStatus: async () => state, fileUrl: () => '' });
  await assert.rejects(unavailable.upload('room', file), /La carga de archivos no está disponible/);
});
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const room = { id: 'room', revision: '1', role: 'teacher', units: [] };
const operationPorts = overrides => ({
  list: async () => { throw new Error('unexpected catalog request'); },
  findMaterial: async (_room, id, lookup) => lookup.materials?.find(item => item.id === id),
  listActivities: async () => [], change: async () => {},
  upload: async () => ({ id: 'file', name: 'guide.pdf', ready: false, validation: 'PENDING', scan: 'PENDING' }),
  fileStatus: async () => ({ id: 'file', ready: true }), fileUrl: () => '/file', ...overrides,
});

test('independent reader reuses an injected material collection without catalog GET', async () => {
  const { MaterialReaderWorkspace } = loadTsModule('apps/web/src/features/materials/reader/MaterialReaderWorkspace.tsx');
  const material = { id: 'material', ready: true, deleted: false };
  const view = hookView(MaterialReaderWorkspace, { api: operationPorts(), room, materials: [material], targetMaterialId: 'material', active: true });
  try {
    await view.flush();
    const reader = descendants(view.tree, node => node.type?.name === 'MaterialReader')[0];
    assert.equal(reader.props.material, material);
  } finally { view.close(); }
});

test('independent upload preserves its draft across pending-file polling without catalog GET', async () => {
  const { MaterialPublishing } = loadTsModule('apps/web/src/features/materials/publishing/MaterialPublishing.tsx');
  const oldDocument = globalThis.document, oldSetTimeout = globalThis.setTimeout, oldClearTimeout = globalThis.clearTimeout;
  const timers = new Map(); let sequence = 0, statusCalls = 0;
  globalThis.document = { hidden: false };
  globalThis.setTimeout = (callback, delay) => { const id = ++sequence; timers.set(id, { callback, delay }); return id; };
  globalThis.clearTimeout = id => timers.delete(id);
  const view = hookView(MaterialPublishing, {
    api: operationPorts({ fileStatus: async () => {
      statusCalls += 1;
      return { id: 'file', ready: statusCalls === 2, validation: 'PENDING', scan: 'PENDING' };
    } }),
    room, reload: async () => {}, presentation: 'upload', active: true,
  });
  const form = () => descendants(view.tree, node => node.type?.name === 'MaterialForm')[0].props;
  try {
    await view.flush();
    const draft = { title: 'Mi borrador', description: 'Conservar', activityIds: ['activity'], unitId: null, topicId: null };
    form().onDraft(draft);
    await view.flush();
    const picker = descendants(view.tree, node => node.type === 'input' && node.props.type === 'file')[0];
    picker.props.onChange({ target: { files: [new File(['x'], 'guide.pdf')], value: '' } });
    await view.flush();
    assert.equal(form().blocked, true);
    const timer = [...timers.values()][0];
    assert.equal(timer.delay, 1500);
    await timer.callback();
    await view.flush();
    assert.equal(statusCalls, 1);
    assert.equal(form().blocked, true);
    const nextTimer = [...timers.values()].find(item => item.delay === 3000);
    assert.ok(nextTimer, 'pending file status backs off from 1500 to 3000 ms');
    await nextTimer.callback();
    await view.flush();
    assert.equal(statusCalls, 2);
    assert.deepEqual(form().draft, draft);
    assert.equal(form().blocked, false);
  } finally {
    view.close(); globalThis.document = oldDocument; globalThis.setTimeout = oldSetTimeout; globalThis.clearTimeout = oldClearTimeout;
  }
});

test('confirmed standalone publication retries refresh without uploading or publishing again', async () => {
  const { MaterialPublishing } = loadTsModule('apps/web/src/features/materials/publishing/MaterialPublishing.tsx');
  let writes = 0, uploads = 0, refreshFails = true, closed = 0;
  const view = hookView(MaterialPublishing, {
    api: operationPorts({ change: async () => { writes += 1; }, upload: async () => { uploads += 1; return { id: 'file', ready: true }; } }),
    room, presentation: 'upload', active: true, onUploadClose: () => { closed += 1; },
    reload: async () => { if (refreshFails) throw new Error('synthetic refresh failure'); },
  });
  const find = predicate => descendants(view.tree, predicate);
  const form = () => find(node => node.type?.name === 'MaterialForm')[0]?.props;
  try {
    await view.flush();
    const picker = find(node => node.type === 'input' && node.props.type === 'file')[0];
    picker.props.onChange({ target: { files: [new File(['x'], 'guide.pdf')], value: '' } });
    await view.flush();
    const draft = { title: 'Material', description: 'Contexto', unitId: null, topicId: null };
    form().onDraft(draft); await view.flush();
    await form().onContinue(draft); await view.flush();
    assert.equal(form().step, 'organization');
    await form().onSave(draft); await view.flush();
    assert.equal(form(), undefined);
    assert.equal(writes, 1); assert.equal(uploads, 1); assert.equal(closed, 0);
    refreshFails = false;
    find(node => node.type === 'button' && node.props.children === 'Actualizar Plan y cerrar')[0].props.onClick();
    await view.flush();
    assert.equal(writes, 1); assert.equal(uploads, 1); assert.equal(closed, 1);
  } finally { view.close(); }
});
