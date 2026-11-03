import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('D9 Home branch delegates loading to Home and never leaves a skipped legacy classroom-list spinner visible', async () => {
  const { ClassroomsApp } = loadTsModule('apps/classrooms-ui/Classrooms.tsx');
  const calls = [], view = hookView(ClassroomsApp, { initialPresentation: 'home', subjectId: '11111111-1111-4111-8111-111111111111',
    displayName: 'Synthetic', accountRole: 'teacher', api: { call: async (...args) => { calls.push(args); return []; } },
    homeClient: { read: async () => { throw new Error('Home owns its error'); } }, onAction() {}, onAccountRequired() {} });
  try {
    await view.flush();
    const text = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : value?.props ? text(value.props.children) : '';
    assert.doesNotMatch(text(view.tree), /Cargando tus aulas/);
    assert.equal(descendants(view.tree, node => node.type?.name === 'Home').length, 1);
    assert.equal(calls.filter(([path]) => ['', '/drafts', '/invitations'].includes(path)).length, 0, 'Home must not load legacy lists in parallel');
  } finally { view.close(); }
});
