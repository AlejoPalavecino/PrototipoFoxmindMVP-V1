import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('Plan filters distinguish NEXT from TAUGHT without writing and clear empty detail', async () => {
  const { PlanWorkspace } = loadTsModule('apps/web/src/application/academic-plan-workspace.tsx', {
    stubs: { '../model/use-plan-workspace.ts': { usePlanWorkspace: () => ({ data: { materials: [], activities: [] } }) } },
  });
  const writes = [], room = { id: 'aula', role: 'teacher', units: [
    { id: 'uno', name: 'Unidad uno', topics: [{ id: 'next', name: 'Siguiente', status: 'NEXT' }] },
    { id: 'dos', name: 'Unidad dos', topics: [{ id: 'taught', name: 'Dado', status: 'TAUGHT' }] },
  ] };
  const view = hookView(PlanWorkspace, { room, api: {}, onOpenActivity() {}, onTopicState: (...args) => writes.push(args) });
  const find = predicate => descendants(view.tree, predicate);
  const chooser = () => find(node => node.type === 'select' && node.props['aria-label'] === 'Tema del plan')[0];
  const filter = name => find(node => node.type === 'button' && node.props['aria-label']?.startsWith(name + ' ('))[0];
  try {
    await view.flush();
    assert.equal(chooser().props.value, 'next');
    filter('Dados').props.onClick(); await view.flush();
    assert.equal(chooser().props.value, 'taught');
    assert.deepEqual(find(node => node.type === 'option').map(node => node.props.value), ['taught']);
    filter('Por dar').props.onClick(); await view.flush();
    assert.deepEqual(find(node => node.type === 'option').map(node => node.props.value), ['next']);
    assert.deepEqual(writes, []);
  } finally { view.close(); }

  const empty = hookView(PlanWorkspace, { room: { ...room, units: room.units.slice(0, 1) }, api: {}, onOpenActivity() {} });
  try {
    await empty.flush();
    descendants(empty.tree, node => node.type === 'button' && node.props['aria-label']?.startsWith('Dados ('))[0].props.onClick();
    await empty.flush();
    assert.equal(descendants(empty.tree, node => node.type === 'section' && node.props['aria-label'] === 'Tema seleccionado').length, 0);
  } finally { empty.close(); }
});
