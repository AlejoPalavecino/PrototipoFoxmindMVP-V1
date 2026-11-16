import test from 'node:test';
import assert from 'node:assert/strict';
import { parseHomeTarget } from '../src/core/domain/home/target.ts';
import { homeClassroomTab } from '../apps/web/src/application/academic-classroom-home-target.ts';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

test('los accesos del alumno abren exactamente la sección autorizada del aula', () => {
  for (const section of ['plan', 'library', 'progress', 'wall', 'members']) {
    const target = { kind: 'classroom', classroomId: '11111111-1111-4111-8111-111111111111', section };
    assert.deepEqual(parseHomeTarget(target), target);
    assert.equal(homeClassroomTab(target), section);
  }
  for (const section of ['settings', 'history', 'unknown']) {
    assert.throws(() => parseHomeTarget({ kind: 'classroom', classroomId: '11111111-1111-4111-8111-111111111111', section }));
  }
});

test('autoría manual requiere revisión y confirmación explícita antes de asignar', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/ui/ActivityAuthoring.tsx');
  const calls = [];
  const activity = { id: 'a', title: 'Trabajo', type: 'ASSIGNMENT', status: 'DRAFT', questions: [], instructionFiles: [], materials: [], topicIds: ['t'], unitId:'u',objective:'Explicar conceptos',instructions:'Resolver',evaluationRubric:[{name:'Evidencia',description:'Explica',weight:100}], allowLate: false, locked: false, attachmentRequired: false };
  const view = hookView(ActivityAuthoring, { api: { call: async (...args) => { calls.push(args); return { revision: '2' }; } }, room: { id: 'r', name: 'Aula', timezone: 'UTC', units: [{id:'u',name:'Unidad',topics:[{id:'t',name:'Tema'}]}], archived: false }, data: { activity, revision: '1' }, materials: [], onSaved: async () => {}, onClose() {} });
  const text = value => typeof value === 'string' ? value : Array.isArray(value) ? value.map(text).join(' ') : text(value?.props?.children ?? '');
  try {
    await view.flush();
    const steps = descendants(view.tree, node => node.type === 'ol' && node.props['aria-label'] === 'Etapas de edición')[0];
    assert.equal(descendants(steps, node => node.type === 'li').length, 3);
    assert.match(text(steps), /Alcance.*Contenido.*Revisión/);
    const choose = async label => {
      const button = descendants(view.tree, node => node.type === 'button' && text(node).trim() === label)[0];
      assert.ok(button, label);
      assert.equal(Boolean(button.props.disabled), false, label);
      button.props.onClick();
      await view.flush();
    };
    await choose('Continuar');
    const fieldsets = descendants(view.tree, node => node.type === 'fieldset' && !node.props.hidden);
    assert.ok(fieldsets.some(node => node.props['aria-label'] === 'Consigna'));
    assert.ok(fieldsets.some(node => node.props['aria-label'] === 'Plazo de entrega'));
    await choose('Continuar a revisión');
    assert.ok(descendants(view.tree, node => node.props?.['aria-label'] === 'Revisión del borrador').length);
    assert.equal(calls.length, 0);
    await choose('Publicar actividad');
    assert.equal(calls.length, 0);
    await choose('Asignar al aula');
    assert.deepEqual(calls.map(call=>call[2].operation.action),['save','publish']);
    assert.equal(calls.at(-1)[2].operation.id,'a');
  } finally { view.close(); }
});

test('Continuar borrador abre el editor y los contenidos publicados o archivados siguen en consulta', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
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
      const history=descendants(view.tree, node => node.type?.name === 'AttemptHistory');
      assert.equal(history.length, editable ? 0 : 1);
      if(!editable)assert.equal(history[0].props.activityPreview,data.activity);
      assert.ok(calls.every(call => call[1] === 'GET'));
    } finally { view.close(); }
  }
});

test('el selector limpio conserva unidad y temas del Plan para ambos métodos', async () => {
  const { Activities } = loadTsModule('apps/web/src/application/academic-Activities.tsx');
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
  const { ClassroomsApp } = loadTsModule('apps/web/src/application/academic-Classrooms.tsx');
  for (const role of ['teacher', 'student']) {
    const calls = [];
    const room = { id: 'room', name: 'Aula real', coverKey:'biology', archived: false };
    const archived = { id: 'archived', name: 'Aula archivada', archived: true };
    const view = hookView(ClassroomsApp, { initialPresentation: 'home', accountRole: role, displayName: 'Prueba', api: { call: async (...args) => {
      calls.push(args); return role === 'teacher' ? { teach: [room, archived], study: [] } : { teach: [], study: [room, archived] };
    } } });
    try {
      await view.flush();
      assert.deepEqual(calls.map(call => call[0]), ['']);
      const navbar = descendants(view.tree, node => node.type?.name === 'AppNavbar')[0];
      assert.deepEqual(navbar.props.classroomLinks, [{ href: '/mis-aulas?aula=room', label: 'Aula real', coverKey:'biology', current: false }]);
      assert.equal(calls[0][3].aborted, false);
    } finally { view.close(); }
    assert.equal(calls[0][3].aborted, true);
  }
});
