import { gradingFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { gradingView } from './helpers/audit-grade-dto.mjs';

const { GradingEditor } = loadTsModule('apps/web/src/features/grading/editing/GradingEditor.tsx');
const button = (view, text) => descendants(view.tree, node => node.type === 'button' && node.props.children === text)[0];
const field = (view, label) => descendants(view.tree, node => node.props['aria-label'] === label)[0];
const discardDialog = view => descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Tenés cambios sin guardar')[0];

async function editor(t) {
  const data = structuredClone(gradingView), calls = [];
  Object.assign(data.grade, { finalGrade: '6.00', overallFeedback: 'Devolución guardada' });
  let closed = 0;
  const view = hookView(GradingEditor, gradingFixtureProps('GradingEditor', {
    api: { call: async (path, method, payload) => {
      calls.push({ path, method, payload });
      assert.equal(method, 'GET', 'discard/reload must never save or publish');
      return structuredClone(data);
    } },
    roomId: 'room-synthetic', attemptId: 'attempt-synthetic', onClose() { closed++; }, onChanged: async () => {},
  }));
  t.after(() => view.close());
  await view.flush();
  assert.equal(calls.length, 1, 'initial load');
  field(view, 'Calificación general').props.onChange({ target: { value: '9,25' } });
  field(view, 'Devolución general opcional').props.onChange({ target: { value: 'Edición local pendiente' } });
  await view.flush();
  return { view, calls, closed: () => closed };
}

function assertLocalDraft(view) {
  assert.equal(field(view, 'Calificación general').props.value, '9,25');
  assert.equal(field(view, 'Devolución general opcional').props.value, 'Edición local pendiente');
}

test('grading navigation asks for discard and cancellation preserves grade and feedback (control)', async t => {
  const { view, calls, closed } = await editor(t);
  field(view, 'Volver al historial').props.onClick();
  await view.flush();
  assert.ok(discardDialog(view));
  button(view, 'Volver a la corrección').props.onClick();
  await view.flush();
  assertLocalDraft(view);
  assert.equal(discardDialog(view), undefined);
  assert.equal(closed(), 0);
  assert.equal(calls.length, 1);
});

test('grading reload asks for the same discard as navigation; cancel preserves draft without GET or POST', async t => {
  const { view, calls, closed } = await editor(t);
  button(view, 'Recargar corrección').props.onClick();
  await view.flush();
  assert.ok(discardDialog(view), 'reload of an edited correction must ask before discarding');
  assertLocalDraft(view);
  assert.equal(calls.length, 1, 'no reload before the discard decision');
  button(view, 'Volver a la corrección').props.onClick();
  await view.flush();
  assert.equal(discardDialog(view), undefined);
  assertLocalDraft(view);
  assert.equal(calls.length, 1, 'cancellation must not fetch or write');
  assert.equal(closed(), 0);
});

test('grading confirmed discard reloads grade and feedback from server with one GET and no POST', async t => {
  const { view, calls, closed } = await editor(t);
  button(view, 'Recargar corrección').props.onClick();
  await view.flush();
  assert.ok(discardDialog(view), 'reload must wait for explicit discard confirmation');
  assert.equal(calls.length, 1);
  button(view, 'Descartar cambios').props.onClick();
  await view.flush();
  assert.equal(discardDialog(view), undefined);
  assert.equal(field(view, 'Calificación general').props.value, '6,00');
  assert.equal(field(view, 'Devolución general opcional').props.value, 'Devolución guardada');
  assert.deepEqual(calls.map(({ path, method }) => ({ path, method })), [
    { path: '/room-synthetic/attempts/attempt-synthetic/grading', method: 'GET' },
    { path: '/room-synthetic/attempts/attempt-synthetic/grading', method: 'GET' },
  ]);
  assert.equal(closed(), 0, 'reload keeps the editor open');
});
