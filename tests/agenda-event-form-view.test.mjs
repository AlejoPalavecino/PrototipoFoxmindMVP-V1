import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import { day, zone, privateEvent, installWindow } from './agenda-event-form-helpers.test.mjs';

test('shared notices preserve accessible status and error semantics', () => {
  const { Notice } = loadTsModule('apps/shared-ui/feedback.tsx');
  const status = renderToStaticMarkup(React.createElement(Notice, null, 'Guardado'));
  const error = renderToStaticMarkup(React.createElement(Notice, { error: true }, 'No se pudo guardar'));
  assert.match(status, /role="status"/); assert.match(status, /class="p5-notice"/);
  assert.match(error, /role="alert"/); assert.match(error, /class="p5-notice error"/);
});

test('shared dialog preserves heading, close action and Escape cancellation', async () => {
  const { Dialog } = loadTsModule('apps/shared-ui/feedback.tsx', { stubs: {"./dialog-focus":{openDialog: () => () => {}}} });
  let closed = 0, prevented = 0;
  const view = hookView(Dialog, { title: 'Revisar', className: 'agenda-dialog', onClose: () => closed++, children: 'Contenido' });
  try {
    await view.flush();
    assert.equal(view.tree.props.className, 'p5-dialog agenda-dialog');
    const heading = descendants(view.tree, node => node.type === 'h2')[0];
    assert.equal(heading.props.children, 'Revisar');
    assert.ok(heading.props.id);
    assert.equal(view.tree.props['aria-labelledby'], heading.props.id);
    descendants(view.tree, node => node.type === 'button')[0].props.onClick();
    const dialog = {};
    const cancel = target => view.tree.props.onCancel({ target, currentTarget: dialog, preventDefault: () => prevented++ });
    cancel({});
    assert.equal(closed, 1); assert.equal(prevented, 0);
    cancel(dialog);
    assert.equal(closed, 2); assert.equal(prevented, 1);
  } finally { view.close(); }
});

test('new and edited events expose the appropriate primary action and explicit whole-series scope', () => {
  const { EventForm } = loadTsModule('apps/web/src/features/agenda/index.ts');
  const props = { api: {}, day, zone, onClose() {}, onSaved() {} };
  const created = renderToStaticMarkup(React.createElement(EventForm, props));
  assert.ok(created.includes('Crear evento'));
  const edited = renderToStaticMarkup(React.createElement(EventForm, { ...props,
    event: privateEvent({ repeat: { kind: 'WEEKLY', untilDate: '2026-11-24' } }) }));
  assert.ok(edited.includes('Guardar cambios')); assert.match(edited, /toda la serie.*pasadas/);
});

test('invalid submit renders accessible field issues without sending a write', async () => {
  const { EventForm } = loadTsModule('apps/web/src/features/agenda/index.ts');
  let writes = 0;
  const view = hookView(EventForm, { api: { async put() { writes++; } }, day, zone, onClose() {}, onSaved() {} });
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    await view.flush();
    const html = renderToStaticMarkup(view.tree);
    assert.equal(writes, 0); assert.match(html, /name="title"/);
    assert.match(html, /aria-invalid="true"/); assert.match(html, /aria-describedby="[^"]+"/);
    assert.ok(!html.includes('Detalle temporal:')); assert.ok(!html.includes('datetime-local'));
  } finally { view.close(); }
});

test('reference fields expose date, start/end times and repetition without extra duration or zone controls', () => {
  const { EventForm } = loadTsModule('apps/web/src/features/agenda/index.ts');
  const html = renderToStaticMarkup(React.createElement(EventForm,
    { api: {}, day, zone, onClose() {}, onSaved() {} }));
  for (const field of ['startDate', 'startTime', 'title']) assert.ok(html.includes(`name="${field}"`));
  assert.ok(!html.includes('type="number"'));
  assert.ok(!html.includes('datetime-local')); assert.ok(!html.includes('<details'));
  assert.ok(!html.includes('Ocupa varios días'));
  assert.match(html, /name="endTime"/); assert.match(html, /Repetición/); assert.match(html, /Diariamente/); assert.match(html, /Mensualmente/);
  assert.match(html, /Clase/); assert.match(html, /Evaluación/); assert.match(html, /Actividad/);
});

test('cancel closes a pristine form but protects changed fields when discard is declined', async () => {
  const { EventForm } = loadTsModule('apps/web/src/features/agenda/index.ts');
  let closes = 0, confirmations = 0;
  const restore = installWindow(() => { confirmations++; return false; });
  const view = hookView(EventForm, { api: {}, day, zone, onClose() { closes++; }, onSaved() {} });
  const cancel = () => descendants(view.tree, node => node.type === 'button' && node.props.children === 'Cancelar')[0];
  try {
    await view.flush(); cancel().props.onClick(); assert.equal(closes, 1); assert.equal(confirmations, 0);
    const fields = descendants(view.tree, node => node.type.name === 'EventFields')[0];
    fields.props.onChange({ ...fields.props.draft, title: 'Borrador importante' }); await view.flush();
    cancel().props.onClick(); await view.flush();
    assert.equal(closes, 1); assert.equal(confirmations, 1);
    const current = descendants(view.tree, node => node.type.name === 'EventFields')[0];
    assert.equal(current.props.draft.title, 'Borrador importante');
  } finally { view.close(); restore(); }
});

for (const field of ['title', 'description']) test(`invalid ${field} focuses after busy unlock and opens its secondary details`, async () => {
  const { EventForm } = loadTsModule('apps/web/src/features/agenda/index.ts');
  const priorDetails = globalThis.HTMLDetailsElement;
  class Details { open = false; }
  globalThis.HTMLDetailsElement = Details;
  const details = new Details(), submitButton = {}, renders = [], attempts = [];
  let disabled = false, activeElement = submitButton, writes = 0;
  const form = { querySelector(selector) { return selector === `[name="${field}"]` ? control : null; } };
  details.parentElement = form;
  const control = { parentElement: field === 'description' ? details : form,
    focus() {
      attempts.push({ disabled, expanded: details.open });
      if (!disabled && (field !== 'description' || details.open)) activeElement = control;
    } };
  const Harness = props => {
    const tree = EventForm(props);
    const formNode = descendants(tree, node => node.type === 'form')[0];
    disabled = descendants(tree, node => node.type === 'fieldset')[0].props.disabled;
    renders.push(disabled); formNode.props.ref.current = form;
    return tree;
  };
  const view = hookView(Harness, { api: { async put() { writes++; } }, day, zone, onClose() {}, onSaved() {} });
  try {
    await view.flush();
    if (field === 'description') {
      const fields = descendants(view.tree, node => node.type.name === 'EventFields')[0];
      fields.props.onChange({ ...fields.props.draft, title: 'Plan válido', description: 'x'.repeat(4001) });
      await view.flush();
    }
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} });
    await view.flush();
    assert.ok(renders.includes(true), 'Exercise the disabled fieldset before the asynchronous unlock');
    assert.equal(disabled, false); assert.equal(writes, 0);
    assert.equal(activeElement, control, 'The first invalid control must receive focus after it becomes enabled');
    assert.ok(attempts.some(attempt => !attempt.disabled));
    if (field === 'description') assert.equal(details.open, true);
  } finally {
    view.close();
    if (priorDetails === undefined) delete globalThis.HTMLDetailsElement;
    else globalThis.HTMLDetailsElement = priorDetails;
  }
});
