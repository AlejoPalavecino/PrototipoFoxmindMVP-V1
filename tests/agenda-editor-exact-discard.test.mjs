import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { deferred, descendants, hookView } from './agenda-ui-helpers.test.mjs';
import { day, privateEvent, zone } from './agenda-event-form-helpers.test.mjs';

const { EventForm } = loadTsModule('apps/web/src/features/agenda/event-editor/EventForm.tsx');
const find = (view, predicate) => descendants(view.tree, predicate)[0];
const fields = view => find(view, node => node.type.name === 'EventFields');
const button = (view, label) => find(view, node => node.type === 'button' && node.props.children === label);

test('cancelling dirty edits uses a FoxMind confirmation and preserves the draft and focus when continuing', async () => {
  let closes = 0, restored = 0;
  const target = { focus() { restored++; }, isConnected: true };
  const Harness = (props) => {
    const tree = EventForm(props);
    const form = descendants(tree, node => node.type === 'form')[0];
    form.props.ref.current = { ownerDocument: { activeElement: target } };
    return tree;
  };
  const view = hookView(Harness, { api: {}, day, zone, onSaved() {}, onClose() { closes++; } });
  try {
    await view.flush();
    button(view, 'Cancelar').props.onClick();
    assert.equal(closes, 1);

    const next = { ...fields(view).props.draft, title: 'Preparar la exposición', allDay: true, reminderMinutes: 30, color: 'GREEN' };
    fields(view).props.onChange(next);
    await view.flush();

    button(view, 'Cancelar').props.onClick();
    await view.flush();
    assert.equal(view.tree.props.title, '¿Descartás los cambios?');
    assert.equal(closes, 1);
    assert.ok(button(view, 'Descartar cambios'));

    button(view, 'Seguir editando').props.onClick();
    await view.flush();
    assert.deepEqual(fields(view).props.draft, next);
    assert.equal(restored, 1);

    view.tree.props.onClose();
    await view.flush();
    assert.equal(view.tree.props.title, '¿Descartás los cambios?');
    view.tree.props.onClose();
    await view.flush();
    assert.deepEqual(fields(view).props.draft, next);
    assert.equal(restored, 2);

    view.tree.props.onClose();
    await view.flush();
    button(view, 'Descartar cambios').props.onClick();
    assert.equal(closes, 2);
  } finally { view.close(); }
});

test('editing shows only the save and cancel actions and leaves deletion in the details', async () => {
  const view = hookView(EventForm, { api: {}, event: privateEvent(), day, zone, onSaved() {}, onClose() {} });
  try {
    await view.flush();
    assert.ok(button(view, 'Cancelar'));
    const footer = find(view, node => node.type === 'footer');
    assert.equal(descendants(footer, node => node.type === 'button').length, 2);
  } finally { view.close(); }
});

test('the editor blocks cancellation while saving and preserves the selected date, color and reminder after failure', async () => {
  const network = deferred(), calls = [], outcomes = [];
  let closes = 0;
  const view = hookView(EventForm, {
    day, zone, onSaved(value) { outcomes.push(value); }, onClose() { closes++; },
    api: { async put(id, payload) {
      calls.push({ id, payload });
      return calls.length === 1 ? network.promise : privateEvent({ id, ...payload });
    } },
  });
  const submit = () => find(view, node => node.type === 'form').props.onSubmit({ preventDefault() {} });
  try {
    await view.flush();
    assert.equal(fields(view).props.draft.startDate, day);
    const next = { ...fields(view).props.draft, title: 'Preparar la exposición', allDay: true, reminderMinutes: 30, color: 'GREEN' };
    fields(view).props.onChange(next);
    await view.flush();
    submit();
    await view.flush();
    assert.equal(button(view, 'Cancelar').props.disabled, true);
    view.tree.props.onClose();
    await view.flush();
    assert.equal(view.tree.props.title, 'Un momento en tu agenda');
    assert.equal(closes, 0);

    network.reject({ code: 'SERVICE_UNAVAILABLE', message: 'Tus cambios siguen acá; podés volver a intentar.' });
    await view.flush();
    assert.ok(find(view, node => node.type.name === 'Notice' && node.props.error));
    assert.deepEqual(fields(view).props.draft, next);
    submit();
    await view.flush();
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1], calls[0]);
    assert.equal(outcomes[0].mode, 'created');
    assert.equal(outcomes[0].event.schedule.kind, 'ALL_DAY');
    assert.equal(outcomes[0].event.schedule.startDate, day);
    assert.equal(outcomes[0].event.reminder.minutes, 30);
    assert.equal(outcomes[0].event.color, 'GREEN');
  } finally { view.close(); }
});
