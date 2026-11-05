import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHomeTarget } from '../src/core/domain/home-target.ts';
import { homeClassroomTab } from '../apps/classrooms-ui/classroom-home-target.ts';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('los accesos del alumno abren exactamente la sección autorizada del aula', () => {
  for (const section of ['plan', 'library', 'progress', 'wall']) {
    const target = { kind: 'classroom', classroomId: '11111111-1111-4111-8111-111111111111', section };
    assert.deepEqual(parseHomeTarget(target), target);
    assert.equal(homeClassroomTab(target), section);
  }
  for (const section of ['settings', 'members', 'history', 'unknown']) {
    assert.throws(() => parseHomeTarget({ kind: 'classroom', classroomId: '11111111-1111-4111-8111-111111111111', section }));
  }
});

test('autoría manual agrupa la preparación y requiere revisión antes de asignar', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/classrooms-ui/ActivityAuthoring.tsx');
  const calls = [];
  const activity = { id: 'a', title: 'Trabajo', type: 'ASSIGNMENT', status: 'DRAFT', questions: [], instructionFiles: [], materials: [], topicIds: [], allowLate: false, locked: false, attachmentRequired: false };
  const view = hookView(ActivityAuthoring, { api: { call: async (...args) => { calls.push(args); return { revision: '2' }; } }, room: { id: 'r', name: 'Aula', timezone: 'UTC', units: [], archived: false }, data: { activity, revision: '1' }, materials: [], onSaved: async () => {}, onClose() {} });
  const text = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : text(value?.props?.children ?? '');
  try {
    await view.flush();
    const steps = descendants(view.tree, node => node.type === 'ol' && node.props['aria-label'] === 'Etapas de edición')[0];
    assert.equal(descendants(steps, node => node.type === 'li').length, 3);
    assert.match(text(steps), /Selección y origen/);
    assert.match(text(steps), /Preparar actividad/);
    assert.match(text(steps), /Revisar y asignar/);
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Continuar')[0].props.onClick();
    await view.flush();
    const fieldsets = descendants(view.tree, node => node.type === 'fieldset' && !node.props.hidden);
    assert.ok(fieldsets.some(node => text(node).includes('Propuesta para los estudiantes')));
    assert.ok(fieldsets.some(node => text(node).includes('Fecha límite')));
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Continuar')[0].props.onClick();
    await view.flush();
    assert.ok(descendants(view.tree, node => node.props?.['aria-label'] === 'Revisión del borrador').length);
    assert.equal(calls.length, 0);
    descendants(view.tree, node => node.type === 'button' && text(node) === 'Asignar al aula')[0].props.onClick();
    await view.flush();
    assert.equal(calls.length, 0);
    const confirm = descendants(view.tree, node => node.type === 'button' && text(node) === 'Confirmar asignación al aula')[0];
    assert.ok(confirm);
    confirm.props.onClick();
    await view.flush();
    assert.deepEqual(calls[0].slice(0,3), ['/r/activities', 'POST', { revision: '1', operation: { action: 'publish', id: 'a' } }]);
  } finally { view.close(); }
});

test('Continuar borrador abre el editor y los contenidos publicados o archivados siguen en consulta', async () => {
  const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
  for (const [status, archived] of [['DRAFT', false], ['PUBLISHED', false], ['DRAFT', true]]) {
    const calls = [];
    const data = { activity: { id: 'a', status }, revision: 'r' };
    const view = hookView(Activities, { room: { id: 'r', role: 'teacher', archived, units: [] }, target: { kind: 'activity', classroomId: 'r', activityId: 'a' }, reload: async () => {}, api: { call: async (...args) => {
      calls.push(args); return args[0].endsWith('/preview') ? data : args[0].endsWith('/library') ? [] : { activities: [] };
    } } });
    try {
      await view.flush();
      const editable = status === 'DRAFT' && !archived;
      assert.equal(descendants(view.tree, node => node.type?.name === 'ActivityAuthoring').length, editable ? 1 : 0);
      assert.equal(descendants(view.tree, node => node.type?.name === 'ActivityPreview').length, editable ? 0 : 1);
      assert.ok(calls.every(call => call[1] === 'GET'));
    } finally { view.close(); }
  }
});

test('el selector limpio conserva unidad y temas del Plan para ambos métodos', async () => {
  const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
  const context = { unitId: 'u', topicIds: ['t'] };
  for (const method of ['Crear manualmente', 'Crear con IA']) {
    const calls = [];
    const view = hookView(Activities, { room: { id: 'r', role: 'teacher', archived: false, units: [], revision: 'v' }, openAuthoring: true, creationContext: context, reload: async () => {}, api: { call: async (...args) => {
      calls.push(args); return args[0].endsWith('/preview') ? { activity: { id: 'a', status: 'DRAFT' } } : args[0].endsWith('/library') ? [] : args[1] === 'POST' ? { id: 'a' } : { activities: [] };
    } } });
    try {
      await view.flush();
      assert.equal(descendants(view.tree, node => node.type?.name === 'ActivityAssignment').length, 0);
      assert.ok(calls.every(call => call[1] === 'GET'));
      descendants(view.tree, node => node.type === 'button' && node.props['aria-label'] === method)[0].props.onClick();
      await view.flush();
      const next = descendants(view.tree, node => node.type?.name === (method === 'Crear con IA' ? 'ActivityGeneration' : 'ActivityAuthoring'))[0];
      assert.deepEqual(next.props.creationContext, context);
    } finally { view.close(); }
  }
});

test('Inicio carga solo el catálogo real para la sidebar de ambos roles y cancela al salir', async () => {
  const { ClassroomsApp } = loadTsModule('apps/classrooms-ui/Classrooms.tsx');
  for (const role of ['teacher', 'student']) {
    const calls = [];
    const room = { id: 'room', name: 'Aula real', archived: false };
    const archived = { id: 'archived', name: 'Aula archivada', archived: true };
    const view = hookView(ClassroomsApp, { initialPresentation: 'home', accountRole: role, displayName: 'Prueba', api: { call: async (...args) => {
      calls.push(args); return role === 'teacher' ? { teach: [room, archived], study: [] } : { teach: [], study: [room, archived] };
    } } });
    try {
      await view.flush();
      assert.deepEqual(calls.map(call => call[0]), ['']);
      const navbar = descendants(view.tree, node => node.type?.name === 'AppNavbar')[0];
      assert.deepEqual(navbar.props.classroomLinks, [{ href: '/mis-aulas?aula=room', label: 'Aula real', current: false }]);
      assert.equal(calls[0][3].aborted, false);
    } finally { view.close(); }
    assert.equal(calls[0][3].aborted, true);
  }
});
