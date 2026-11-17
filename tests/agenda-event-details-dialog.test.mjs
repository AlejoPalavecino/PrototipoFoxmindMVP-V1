import assert from 'node:assert/strict';
import test from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { privateEvent, day, zone } from './agenda-event-form-helpers.test.mjs';
import { deferred, descendants, hookView } from './agenda-ui-helpers.test.mjs';

const { EventDetails } = loadTsModule('apps/web/src/features/agenda/event-details/EventDetails.tsx');
const later = '2026-10-28';
const series = () => privateEvent({ repeat: { kind: 'DAILY', untilDate: later } });
function text(children) {
  if (Array.isArray(children)) return children.map(text).join('');
  if (typeof children === 'string') return children;
  return children?.props ? text(children.props.children) : '';
}
function button(view, label) {
  const control = descendants(view.tree, node => node.type === 'button' && text(node.props.children) === label)[0];
  assert.ok(control, `Expected button: ${label}`);
  return control;
}
async function click(view, label) {
  button(view, label).props.onClick();
  await view.flush();
}
function open(event, api, options = {}) {
  return hookView(EventDetails, { event, api, occurrenceDate: day, onBack() {}, onEdit() {}, onRemoved() {}, ...options });
}

test('an edited occurrence shows its effective content, notice and study destination without mutating it', async () => {
  const original = series();
  const view = open({
    ...original, reviewSession: { folderId: 'folder/id', examId: 'exam#1' },
    exceptions: [{ date: later, replacement: {
      ...original, title: 'Repaso de Historia', description: 'Traer el apunte', color: 'PINK',
      reminder: { minutes: 15 }, schedule: { kind: 'TIMED', timeZone: zone, startLocal: `${later}T23:45`, endLocal: '2026-10-29T00:30' },
    } }],
  }, {}, { occurrenceDate: later });
  try {
    await view.flush();
    const html = renderToStaticMarkup(view.tree);
    assert.match(html, /<dialog\b/);
    assert.match(html, /Tu evento/);
    assert.match(html, /agenda-color-pink/);
    assert.equal((html.match(/Repaso de Historia/g) ?? []).length, 1);
    assert.doesNotMatch(html, /Clase de Historia/);
    for (const value of ['23:45', '00:30', '45 min', '15 minutos antes', 'Traer el apunte']) assert.ok(html.includes(value));
    assert.match(html, /folder%2Fid\?tab=repaso&amp;exam=exam%231/);
  } finally { view.close(); }
});

test('remove requires an explicit confirmation and sends the original date of a moved occurrence only once', async () => {
  const event = series(), calls = [], request = deferred();
  event.exceptions = [{ date: later, replacement: {
    ...event, schedule: { kind: 'TIMED', timeZone: zone, startLocal: '2026-11-02T10:00', endLocal: '2026-11-02T10:30' },
  } }];
  const view = open(event, {
    remove(...args) { calls.push(['series', ...args]); },
    changeOccurrence(...args) { calls.push(['single', ...args]); return request.promise; },
  }, { occurrenceDate: later, onRemoved: () => calls.push(['removed']) });
  try {
    await view.flush();
    await click(view, 'Eliminar');
    assert.deepEqual(calls, []);
    await click(view, 'Conservar evento');
    assert.deepEqual(calls, []);
    await click(view, 'Eliminar');
    view.tree.props.onClose();
    await view.flush();
    assert.deepEqual(calls, []);
    await click(view, 'Eliminar');
    assert.deepEqual(calls, []);
    const confirm = button(view, 'Eliminar evento').props.onClick;
    confirm(); confirm();
    await view.flush();
    assert.deepEqual(calls, [['single', event.id, event.revision, later, null]]);
    request.resolve();
    await view.flush();
    assert.deepEqual(calls.at(-1), ['removed']);
  } finally { view.close(); }
});

test('whole series is removed only after selecting it; failure keeps the confirmation open', async () => {
  const event = series(), calls = [], onRemoved = () => calls.push(['removed']);
  const view = open(event, {
    remove(...args) { calls.push(args); throw Error('No pudimos eliminarlo.'); },
    changeOccurrence() { assert.fail('An occurrence should not be removed'); },
  }, { onRemoved });
  try {
    await view.flush();
    await click(view, 'Eliminar');
    const scope = descendants(view.tree, node => node.type === 'input' && node.props.value === 'series')[0];
    assert.ok(scope);
    scope.props.onChange();
    await view.flush();
    assert.deepEqual(calls, []);
    await click(view, 'Eliminar serie');
    assert.deepEqual(calls, [[event.id, event.revision]]);
    const html = renderToStaticMarkup(view.tree);
    assert.match(html, /role="alert">No pudimos eliminarlo\./);
    assert.match(html, /Conservar evento/);
  } finally { view.close(); }
});
