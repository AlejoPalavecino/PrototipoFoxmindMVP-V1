import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { descendants, hookView } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' || typeof node === 'number' ? String(node)
  : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const room = { id: 'synthetic-room', role: 'teacher', name: 'Ciencias', division: 'A', archived: false, units: [] };
const activity = { id: 'practice', type: 'ASSIGNMENT', status: 'PUBLISHED', title: 'Práctica', deadlineAt: null, zone: 'UTC', locked: false };

test('published teacher activity prioritizes pending review without hiding preview or received submissions', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');
  const calls = [];
  const view = hookView(Activities, { room, api: { call: async (...args) => { calls.push(args); return args[0].endsWith('/preview')?{activity}:{ activities: [activity] }; } }, reload: async () => {} });
  try {
    await view.flush();
    const card = descendants(view.tree, n => n.type === 'article')[0];
    const buttons = descendants(card, n => n.type === 'button');
    assert.equal(buttons.length,1);assert.equal(buttons[0].props['aria-label'],`Abrir ${activity.title}`);
    buttons[0].props.onClick(); await view.flush();
    const history = descendants(view.tree, n => n.type?.name === 'AttemptHistory')[0];
    assert.equal(history.props.activityPreview,activity);assert.equal(history.props.activityId,activity.id);
    assert.ok(calls.every(args=>args[1]==='GET'),'Detail access never writes');
  } finally { view.close(); }
});

test('draft and withdrawn activities never offer pending review; student access stays primary', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');
  for (const [role, status] of [['teacher', 'DRAFT'], ['teacher', 'WITHDRAWN'], ['student', 'PUBLISHED']]) {
    const view = hookView(Activities, { room: { ...room, role }, api: { call: async () => ({ activities: [{ ...activity, status }] }) }, reload: async () => {} });
    try {
      await view.flush();
      const card = descendants(view.tree, n => n.type === 'article')[0];
      assert.doesNotMatch(text(card), /Revisar pendientes/);
      if (role === 'student') {
        const first = descendants(card, n => n.type === 'button')[0];
        assert.equal(first.props['aria-label'],`Abrir ${activity.title}`);
        assert.doesNotMatch(text(card), /Editar actividad|Publicar|Habilitar primera entrega/);
      }
    } finally { view.close(); }
  }
});

test('archived classroom settings disable editing while reactivation remains a separate confirmation', async () => {
  const { ClassroomSettings } = loadTsModule('apps/web/src/features/classrooms/settings/ClassroomSettings.tsx');
  const calls = [], confirmations = [];
  const archivedRoom = { ...room, revision: '2', archived: true, subject: 'Ciencias', academicYear: 2026, coverKey: 'biology' };
  const view = hookView(ClassroomSettings, {
    id: room.id, room: archivedRoom, busy: false,
    settings: { name: 'Ciencias', subject: 'Ciencias', division: 'A', academicYear: 2026, coverKey: 'biology', aiGradingEnabled: false },
    api: { call: async (...args) => calls.push(args) }, load: async () => {}, setConfirm: value => confirmations.push(value),
  });
  try {
    await view.flush();
    const form = descendants(view.tree, n => n.type === 'form')[0];
    const fieldset = descendants(form, n => n.type === 'fieldset')[0];
    assert.equal(fieldset.props.disabled, true);
    for (const label of ['Datos del aula', 'Portada']) {
      assert.ok(descendants(fieldset, n => n.type === 'section' && n.props['aria-label'] === label).length, label);
    }
    const save = descendants(form, n => n.type === 'button' && text(n) === 'Guardar cambios');
    assert.equal(save.length, 1);
    assert.equal(save[0].props.disabled, true);
    assert.doesNotMatch(text(form), /Reactivar aula/);
    const reactivate = descendants(view.tree, n => n.type === 'button' && /Reactivar aula/.test(text(n)))[0];
    assert.ok(reactivate);
    reactivate.props.onClick();
    assert.equal(confirmations[0]?.title, 'Reactivar aula');
    assert.deepEqual(calls, []);
    await confirmations[0].run();
    assert.deepEqual(calls, [['/synthetic-room/archive', 'POST', { archived: false, revision: '2' }]]);
  } finally { view.close(); }
});
