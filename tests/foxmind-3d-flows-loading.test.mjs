import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('D9 Home delegates aggregate errors and loads only sidebar rooms without a legacy list spinner', async () => {
  const { ClassroomsApp } = loadTsModule("apps/web/src/application/workflows/classroom-collection/ClassroomsApp.tsx");
  const calls = [], view = hookView(ClassroomsApp, { initialPresentation: 'home', subjectId: '11111111-1111-4111-8111-111111111111',
    displayName: 'Synthetic', accountRole: 'teacher', api: { call: async (...args) => { calls.push(args); return { teach: [], study: [] }; } },
    homeClient: { read: async () => { throw new Error('Home owns its error'); } }, onAction() {}, onAccountRequired() {} });
  try {
    await view.flush();
    const text = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.props ? text(value.props.children) : '';
    assert.doesNotMatch(text(view.tree), /Cargando tus aulas/);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Home').length, 1);
    assert.deepEqual(calls.map(([path]) => path), [''], 'Home loads the real sidebar room catalog exactly once, without drafts or invitations');
    assert.ok(calls.every(([, method]) => !method || method === 'GET'), 'Sidebar reads never write');
  } finally { view.close(); }
});
