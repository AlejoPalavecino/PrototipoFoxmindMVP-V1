import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { parseHomeTarget } from '../src/core/domain/home/target.ts';
import { parseHomePage } from '../src/core/domain/home/rows-validation.ts';
import { homeAcademicTarget } from '../apps/web/src/application/workflows/classroom-workspace/classroom-home-target.ts';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
test('Assigning from review saves then publishes only after an explicit assignment action', async () => {
  const { ActivityAuthoring } = loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
  const calls = [], confirmations = [];
  const activity = { id, title:'Actividad',objective:'Explicar',instructions:'Resolver',evaluationRubric:[{name:'Criterio',description:'Explica',weight:100}],type:'ASSIGNMENT', status:'DRAFT', questions:[], instructionFiles:[], materials:[],unitId:'u',topicIds:['t'], allowLate:false, locked:false, attachmentRequired:false };
  const view = hookView(ActivityAuthoring, authoringFixtureProps('ActivityAuthoring', { api:{call:async(...args)=>{calls.push(args);return {revision:'2'};}},
    room:{id,name:'Aula de prueba',timezone:'UTC',units:[{id:'u',name:'Unidad',topics:[{id:'t',name:'Tema'}]}],archived:false}, data:{activity,revision:'1'}, materials:[], onSaved:async value=>{confirmations.push(value);}, onClose(){} }));
  try {
    await view.flush();
    const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
    for (const label of ['Continuar', 'Continuar a revisión', 'Publicar actividad']) {
      const action = descendants(view.tree, node => node.type === 'button' && text(node).trim() === label)[0];
      assert.ok(action, label);
      action.props.onClick();
      await view.flush();
      assert.deepEqual(calls, []);
      assert.deepEqual(confirmations, []);
    }
    const assign = descendants(view.tree,n=>n.type==='button'&&text(n)==='Asignar al aula')[0];
    assert.equal(assign.props.disabled,false);
    assign.props.onClick();
    await view.flush();
    assert.deepEqual(calls.map(call=>call[2].operation.action),['save','publish']);
    assert.equal(calls.at(-1)[2].operation.id,id);
    assert.deepEqual(confirmations,[true]);
  } finally { view.close(); }
});
test('Review destination preserves the exact persisted attempt through validation and classroom routing', () => {
  const target = { kind: 'submissions', classroomId: id, activityId: id, attemptId: id, filter: 'unpublished' };
  assert.deepEqual(parseHomeTarget(target), target);
  assert.equal(homeAcademicTarget(target).attemptId, id);
  assert.throws(() => parseHomeTarget({ ...target, attemptId: 'bad' }));
});
test('Review rows accept validated student identity and reject malformed attempt metadata', () => {
  const item = { id, title: 'Trabajo', target: { kind: 'submissions', classroomId: id, activityId: id, attemptId: id, filter: 'unpublished' },
    classroom: { id, name: 'Aula', subject: 'Ciencias', division: 'A', role: 'teacher', coverKey: 'general', archived: false, timeZone: 'UTC' },
    activityType: 'ASSIGNMENT', needsReview: 1, readyToPublish: 0, oldestSubmittedAt: '2026-11-05T12:00:00.000Z', studentName: 'Estudiante de prueba', attemptNumber: 2 };
  const read = row => parseHomePage('review', { status: 'ready', items: [row], totalItems: 1, nextCursor: null });
  assert.equal(read(item).items[0].studentName, item.studentName);
  assert.throws(() => read({ ...item, attemptNumber: 0 }));
});
test('Agenda preview reflects title, selected color and all-day time before any mutation', () => {
  const { EventColorFields } = loadTsModule("apps/web/src/features/agenda/event-editor/EventColorFields.tsx");
  const html = renderToStaticMarkup(EventColorFields({ draft: { category: 'CLASS', color: 'PURPLE', title: 'Preparar laboratorio', allDay: true, startDate: '2026-11-05' }, issues: [], onChange() { throw new Error('preview must not mutate'); } }));
  assert.match(html, /Vista previa del evento/);
  assert.match(html, /Preparar laboratorio/);
  assert.match(html, /En tu agenda/);
  assert.match(html, /agenda-event-preview agenda-color-purple/);
});
