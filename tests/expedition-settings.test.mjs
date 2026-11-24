import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
const textOf = node => node == null || typeof node === 'boolean' ? '' : typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(textOf).join('') : textOf(node.props?.children);
const room = extra => ({ id, revision: '2', role: 'teacher', archived: false, name: 'Ciencias', subject: 'Ciencias', division: 'A', academicYear: 2026,
  teacher: 'Docente', timezone: 'UTC', coverKey: 'biology', plans: [], units: [], aiGradingEnabled: false, aiGradingAvailable: true, ...extra });
function settingsView(extra = {}, settingsExtra = {}) {
  const { ClassroomSettings } = loadTsModule('apps/web/src/features/classrooms/settings/ClassroomSettings.tsx');
  const calls = [], r = room(extra);
  let settings = { name: r.name, subject: r.subject, division: r.division, academicYear: r.academicYear, coverKey: r.coverKey, aiGradingEnabled: r.aiGradingEnabled, ...settingsExtra };
  const props = () => ({ api: { call: async (...args) => { calls.push(args); return { revision: '3' }; } }, id, room: r, settings,
    setSettings: update => { settings = typeof update === 'function' ? update(settings) : update; view.rerender?.(props()); }, settingsRevision: '2', setSettingsRevision() {},
    settingsConflict: false, setSettingsConflict() {}, reloadSettings: async () => {}, isCurrentRoom: () => true, busy: false, load: async () => {},
    action: async work => work(), setNotice() {}, setConfirm() {} });
  const view = hookView(ClassroomSettings, props());
  return { view, calls, settings: () => settings };
}
const toggle = view => descendants(view.tree, node => node.props?.role === 'switch')[0];

test('Ajustes: el interruptor de corrección asistida se ve con su estado, explica el consumo de IA y cambia el valor que se guarda', async () => {
  const { view, settings } = settingsView();
  try {
    await view.flush();
    const control = toggle(view);
    assert.ok(control); assert.equal(control.props['aria-checked'], false); assert.equal(control.props.disabled, false);
    assert.match(textOf(control), /Desactivada/);
    assert.match(textOf(view.tree), /Cada propuesta usa tu saldo de IA/);
    control.props.onClick();
    assert.equal(settings().aiGradingEnabled, true);
  } finally { view.close(); }
});

test('Ajustes: si el servicio no está disponible no se puede activar, pero una corrección ya activa se puede apagar', async () => {
  const off = settingsView({ aiGradingAvailable: false });
  try { await off.view.flush(); assert.equal(toggle(off.view).props.disabled, true); assert.match(textOf(off.view.tree), /no está disponible en este momento/); }
  finally { off.view.close(); }
  const on = settingsView({ aiGradingAvailable: false, aiGradingEnabled: true });
  try { await on.view.flush(); assert.equal(toggle(on.view).props.disabled, false); assert.equal(toggle(on.view).props['aria-checked'], true); }
  finally { on.view.close(); }
});

test('Ajustes: guardar envía aiGradingEnabled apagado aunque el servicio no esté disponible', async () => {
  const { view, calls } = settingsView({ aiGradingAvailable: false, aiGradingEnabled: true }, { aiGradingEnabled: false });
  try {
    await view.flush();
    descendants(view.tree, node => node.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
    assert.equal(calls[0][2].aiGradingEnabled, false);
  } finally { view.close(); }
});

test('Ajustes: ofrece las 7 portadas del catálogo y muestra el ciclo lectivo como dato de sólo lectura', async () => {
  const { view } = settingsView();
  try {
    await view.flush();
    const covers = descendants(view.tree, node => node.type === 'input' && node.props.name === 'classroom-cover');
    assert.equal(covers.length, 7);
    const year = descendants(view.tree, node => node.props?.className === 'classroom-settings-readonly')[0];
    assert.match(textOf(year), /Ciclo lectivo2026Se define al crear el aula\./);
    assert.equal(descendants(year, node => node.type === 'input').length, 0);
  } finally { view.close(); }
});
