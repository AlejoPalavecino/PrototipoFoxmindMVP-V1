import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { loadPlanWorkspace } from './helpers/plan-workspace.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('Plan selects every topic without legacy filters or writes and marks only from the detail', async () => {
  const { PlanWorkspace } = loadPlanWorkspace({
    stubs: { './use-plan-workspace.ts': { usePlanWorkspace: () => ({ data: { materials: [], activities: [] } }) } },
  });
  const writes = [], room = { id: 'aula', role: 'teacher', units: [
    { id: 'uno', name: 'Unidad uno', topics: [{ id: 'next', name: 'Siguiente', status: 'NEXT' }] },
    { id: 'dos', name: 'Unidad dos', topics: [{ id: 'taught', name: 'Dado', status: 'TAUGHT' }] },
  ] };
  const view = hookView(PlanWorkspace, { room, api: {}, onOpenActivity() {}, onTopicState: (...args) => writes.push(args) });
  const find = predicate => descendants(view.tree, predicate);
  const selected = () => find(node => node.type === 'button' && node.props['data-topic-choice'] && node.props['aria-current'] === 'true')[0]?.props['data-topic-choice'];
  try {
    await view.flush();
    assert.ok(find(node => node.type === 'button' && node.props['aria-haspopup'] === 'dialog')[0]);
    assert.equal(selected(), 'next');
    assert.equal(find(node => node.props?.['aria-label'] === 'Filtrar temas').length, 0);
    assert.equal(find(node => node.type === 'input' && node.props.type === 'checkbox').length, 0);
    find(node => node.type === 'button' && node.props['data-topic-choice'] === 'taught')[0].props.onClick(); await view.flush();
    assert.equal(selected(), 'taught');
    assert.deepEqual(writes, []);
    const mark = find(node => node.type === 'button' && node.props['aria-pressed'] === true)[0];
    assert.ok(mark);
    mark.props.onClick();
    assert.deepEqual(writes, [['taught', 'PENDING']]);
    find(node => node.type === 'button' && node.props['data-topic-choice'] === 'next')[0].props.onClick(); await view.flush();
    assert.equal(selected(), 'next');
    assert.equal(room.units[0].topics[0].status, 'NEXT');
  } finally { view.close(); }

  const empty = hookView(PlanWorkspace, { room: { ...room, units: [] }, api: {}, onOpenActivity() {} });
  try {
    await empty.flush();
    assert.equal(descendants(empty.tree, node => node.type === 'section' && node.props['aria-label'] === 'Tema seleccionado').length, 0);
    assert.match(JSON.stringify(empty.tree), /El aula todavía no tiene temas/);
  } finally { empty.close(); }
});
