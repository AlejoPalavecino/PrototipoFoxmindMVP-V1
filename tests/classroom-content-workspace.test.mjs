import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const room = { id: 'synthetic-room', role: 'teacher', name: 'Ciencias', division: 'A', archived: false, units: [] };
const activity = { id: 'practice', type: 'ASSIGNMENT', status: 'PUBLISHED', title: 'Práctica', deadlineAt: null, zone: 'UTC', locked: false };

test('published teacher activity prioritizes pending review without hiding preview or received submissions', async () => {
  const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
  const calls = [];
  const view = hookView(Activities, { room, api: { call: async (...args) => { calls.push(args); return { activities: [activity] }; } }, reload: async () => {} });
  try {
    await view.flush();
    const card = descendants(view.tree, n => n.type === 'article')[0];
    const buttons = descendants(card, n => n.type === 'button');
    assert.equal(text(buttons[0]), 'Revisar pendientes');
    assert.match(buttons[0].props.className, /primary/);
    const secondary = descendants(card, n => n.props.role === 'group' && n.props['aria-label'] === 'Consulta y opciones de la actividad')[0];
    assert.ok(secondary); assert.match(text(secondary), /Vista previa docente/); assert.match(text(secondary), /Ver entregas recibidas/);
    buttons[0].props.onClick(); await view.flush();
    const history = descendants(view.tree, n => n.type?.name === 'AttemptHistory')[0];
    assert.equal(history.props.filter, 'unpublished'); assert.equal(history.props.activityId, activity.id);
    assert.equal(calls.length, 1, 'opening review does not perform a write');
  } finally { view.close(); }
});

test('draft and withdrawn activities never offer pending review; student access stays primary', async () => {
  const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
  for (const [role, status] of [['teacher', 'DRAFT'], ['teacher', 'WITHDRAWN'], ['student', 'PUBLISHED']]) {
    const view = hookView(Activities, { room: { ...room, role }, api: { call: async () => ({ activities: [{ ...activity, status }] }) }, reload: async () => {} });
    try {
      await view.flush();
      const card = descendants(view.tree, n => n.type === 'article')[0];
      assert.doesNotMatch(text(card), /Revisar pendientes/);
      if (role === 'student') {
        const first = descendants(card, n => n.type === 'button')[0];
        assert.equal(text(first), 'Abrir trabajo práctico'); assert.match(first.props.className, /primary/);
        assert.doesNotMatch(text(card), /Editar actividad|Publicar|Habilitar primera entrega/);
      }
    } finally { view.close(); }
  }
});

test('settings exposes named information and options groups under the existing disabled boundary', () => {
  const { ClassroomSettings } = loadTsModule('apps/classrooms-ui/ClassroomSettings.tsx');
  const tree = ClassroomSettings({ room: { ...room, archived: true }, settings: { name: 'Ciencias', subject: 'Ciencias', division: 'A', academicYear: 2026, aiGradingEnabled: false }, busy: false });
  const form = descendants(tree, n => n.type === 'form')[0];
  assert.equal(descendants(form, n => n.type === 'fieldset')[0].props.disabled, true);
  for (const label of ['Datos del aula', 'Opciones de corrección']) {
    assert.ok(descendants(form, n => n.type === 'section' && n.props['aria-label'] === label).length, label);
  }
  assert.equal(descendants(form, n => n.type === 'button' && text(n) === 'Guardar cambios').length, 1);
  assert.doesNotMatch(text(form), /Reactivar aula/);
});
