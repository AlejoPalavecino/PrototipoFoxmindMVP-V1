import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, deferred, descendants } from './agenda-ui-helpers.test.mjs';

const A = '11111111-1111-4111-8111-111111111111', B = '22222222-2222-4222-8222-222222222222';
const data = (subjectId = A) => ({ version: 1, subjectId, generatedAt: '2026-10-25T12:00:00.000Z', timeZone: 'UTC',
  participation: 'mixed', memberships: { study: 1, teach: 1, archived: 0 }, setup: { drafts: 0, invitations: 0 },
  modules: Object.fromEntries(['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms']
    .map(name => [name, { status: 'ready', items: [], totalItems: 0, nextCursor: null }])) });
async function windowCase(operation) {
  const prior = globalThis.window, clock = Date.now; globalThis.window = new EventTarget();
  try { await operation(); } finally { Date.now = clock; if (prior === undefined) delete globalThis.window; else globalThis.window = prior; }
}
function hook(props) {
  const { useHome } = loadTsModule('apps/classrooms-ui/use-home.ts');
  return hookView(() => useHome(props.client, props.subjectId), {});
}

test('D9 focus refresh uses sixty-second boundary and never polls continuously', () => windowCase(async () => {
  let now = 1000000, reads = 0; Date.now = () => now;
  const view = hook({ subjectId: A, client: { read: async () => { reads++; return data(); } } });
  try {
    await view.flush(); assert.equal(reads, 1);
    now += 59999; window.dispatchEvent(new Event('focus')); await view.flush(); assert.equal(reads, 1);
    now++; window.dispatchEvent(new Event('focus')); await view.flush(); assert.equal(reads, 2);
    window.dispatchEvent(new Event('focus')); await view.flush(); assert.equal(reads, 2);
  } finally { view.close(); }
}));

test('D9 failed module retry removes only that module while global refresh failure clears all old data', () => windowCase(async () => {
  let failRead = false; const view = hook({ subjectId: A, client: { read: async () => {
    if (failRead) throw new Error('Read unavailable'); return data();
  }, page: async () => { throw new Error('Widget unavailable'); } } });
  try {
    await view.flush(); await view.tree.retry('review'); await view.flush();
    assert.deepEqual(view.tree.data.modules.review, { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true });
    assert.equal(view.tree.data.modules.pending.status, 'ready');
    failRead = true; await view.tree.refresh(); await view.flush();
    assert.equal(view.tree.data, null); assert.ok(view.tree.error);
  } finally { view.close(); }
}));

test('D9 responses from a previous account are aborted and discarded after current account resolves', () => windowCase(async () => {
  const pending = [], props = { subjectId: A, client: { read: async (_query, signal) => {
    const value = deferred(); pending.push({ ...value, signal }); return value.promise;
  } } }, view = hook(props);
  try {
    await view.flush(); assert.equal(pending.length, 1);
    const refresh = view.tree.refresh(); props.subjectId = B; await view.flush();
    assert.equal(pending.length, 3); assert.equal(pending[0].signal.aborted, true); assert.equal(pending[1].signal.aborted, true);
    assert.equal(view.tree.data, null);
    pending[2].resolve(data(B)); await view.flush(); assert.equal(view.tree.data.subjectId, B);
    pending[0].resolve(data(A)); pending[1].resolve(data(A)); await refresh; await view.flush();
    assert.equal(view.tree.data.subjectId, B);
  } finally { view.close(); }
}));

test('D9 foreign subject payload and identity failure in a widget clear the entire account projection', () => windowCase(async () => {
  const foreign = hook({ subjectId: A, client: { read: async () => data(B) } });
  try { await foreign.flush(); assert.equal(foreign.tree.data, null); assert.ok(foreign.tree.error); }
  finally { foreign.close(); }
  const { HomeClientError } = loadTsModule('apps/classrooms-ui/home-api.ts');
  const view = hook({ subjectId: A, client: { read: async () => data(), page: async () => { throw new HomeClientError('AUTH_REQUIRED', 401); } } });
  try { await view.flush(); await view.tree.retry('review'); await view.flush(); assert.equal(view.tree.data, null); assert.ok(view.tree.error); }
  finally { view.close(); }
}));

test('D9 Home never fabricates old classroom cards or a false up-to-date state when its aggregate API fails', () => windowCase(async () => {
  const { Home } = loadTsModule('apps/classrooms-ui/Home.tsx');
  const view = hookView(Home, { displayName: 'Synthetic', subjectId: A,
    homeClient: { read: async () => { throw new Error('Unavailable'); } },
    data: { teach: [{ id: 'old', name: 'Old authorized classroom' }], study: [], drafts: [], invitations: [] },
    onAction() {}, onCreate() {}, onJoin() {}, onClassrooms() {} });
  try {
    await view.flush(); assert.equal(descendants(view.tree, node => node.props.role === 'alert').length, 1);
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeModule').length, 0);
    assert.equal(descendants(view.tree, node => node.type?.name === 'HomeShortcuts').length, 0);
  } finally { view.close(); }
}));
