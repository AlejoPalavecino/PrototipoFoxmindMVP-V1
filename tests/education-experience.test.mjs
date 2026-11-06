import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';

const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join(' ') : text(node?.props?.children ?? '');
const room = { role: 'teacher', archived: false, units: [{ id: 'unit', name: 'Números', topics: [{ id: 'topic', name: 'Fracciones' }] }] };
const value = { type: 'ASSIGNMENT', unitId: 'unit', topicIds: ['topic'], sourceIds: [], objective: 'Comparar fracciones', groupLevel: '', context: 'Contenido docente', difficulty: 'INTERMEDIATE', durationMinutes: 40, counts: { assignment: 3, development: 0, singleChoice: 0, multipleChoice: 0 }, acknowledgedWarnings: [] };

test('Guided AI setup advances twice without generating and sends the unchanged request only on final confirmation', async () => {
  const { GenerationSetup } = loadTsModule('apps/classrooms-ui/GenerationSetup.tsx');
  const calls = [], view = hookView(GenerationSetup, { room, value, update() {}, sources: [], disabled: false, generate: body => calls.push(body) });
  try {
    await view.flush();
    const submit = async () => { descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush(); };
    assert.match(text(view.tree), /Tema y objetivo/);
    await submit(); assert.equal(calls.length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'ActivityGenerationForm')[0].props.step, 1);
    await submit(); assert.equal(calls.length, 0);
    assert.equal(descendants(view.tree, n => n.type?.name === 'ActivityGenerationForm')[0].props.step, 2);
    await submit(); assert.deepEqual(calls, [value]);
  } finally { view.close(); }
});

test('AI setup retains missing-topic validation and never generates while disabled', async () => {
  const { GenerationSetup } = loadTsModule('apps/classrooms-ui/GenerationSetup.tsx');
  for (const props of [{ value: { ...value, topicIds: [] }, disabled: false }, { value, disabled: true }]) {
    const calls = [], view = hookView(GenerationSetup, { room, update() {}, sources: [], generate: body => calls.push(body), ...props });
    try { await view.flush(); descendants(view.tree, n => n.type === 'form')[0].props.onSubmit({ preventDefault() {} }); await view.flush();
      assert.equal(calls.length, 0); assert.equal(descendants(view.tree, n => n.type?.name === 'ActivityGenerationForm')[0].props.step, 0);
      if (!props.disabled) assert.match(text(view.tree), /Seleccioná al menos un tema/);
    } finally { view.close(); }
  }
});

test('Inactive AI steps are hidden and disabled so native validation targets only the current step', () => {
  const { ActivityGenerationForm } = loadTsModule('apps/classrooms-ui/ActivityGenerationForm.tsx');
  for (const step of [0, 1, 2]) {
    const tree = ActivityGenerationForm({ room, value, update() {}, sources: [], disabled: false, step });
    const groups = descendants(tree, n => n.type === 'fieldset' && n.props['data-generation-step'] !== undefined);
    assert.equal(groups.length, 3);
    for (const group of groups) { assert.equal(group.props.hidden, group.props['data-generation-step'] !== step); assert.equal(group.props.disabled, group.props['data-generation-step'] !== step); }
  }
});

test('AI waiting describes the actual server state without a fabricated percentage or completion', () => {
  const { AiProgress } = loadTsModule('apps/shared-ui/AiProgress.tsx');
  for (const state of ['QUEUED', 'RUNNING', 'SENDING']) {
    const tree = AiProgress({ state, task: 'activity' });
    assert.equal(tree.props.role, 'status'); assert.equal(tree.props['aria-live'], 'polite');
    assert.doesNotMatch(text(tree), /\d+%|completado|publicado/);
    assert.match(text(tree), /Cerrar no cancela/);
    assert.match(text(tree), state === 'QUEUED' ? /En espera/ : state === 'RUNNING' ? /Preparando tu propuesta/ : /Enviando tu solicitud/);
  }
});

test('Opening grading focuses the work area by hiding the history list and restoring it on return', async () => {
  const { AttemptHistory } = loadTsModule('apps/classrooms-ui/AttemptHistory.tsx');
  const calls = [], api = { call: async (...args) => { calls.push(args); return { activity: { title: 'Actividad', zone: 'UTC', deadlineAt: null }, attempts: [{ id: 'attempt', number: 1, status: 'SUBMITTED' }] }; } };
  const view = hookView(AttemptHistory, { api, room: { ...room, id: 'room' }, activityId: 'activity', onClose() {}, onChanged() {}, onResume() {} });
  try {
    await view.flush();
    descendants(view.tree, n => n.type === 'button' && text(n).includes('Corregir intento'))[0].props.onClick(); await view.flush();
    assert.equal(descendants(view.tree, n => n.props?.className === 'education-attempt-history')[0].props.hidden, true);
    descendants(view.tree, n => n.type?.name === 'GradingEditor')[0].props.onClose(); await view.flush();
    assert.equal(descendants(view.tree, n => n.props?.className === 'education-attempt-history')[0].props.hidden, false);
    assert.ok(calls.every(([, method]) => method === 'GET'));
  } finally { view.close(); }
});

test('Activity detail keeps permitted teacher options behind the single activity entry', async () => {
 const {Activities}=loadTsModule('apps/classrooms-ui/Activities.tsx');
 const activity={id:'activity',type:'ASSIGNMENT',status:'PUBLISHED',title:'Práctica',zone:'UTC',locked:false};
 const view=hookView(Activities,{api:{call:async path=>path.endsWith('/preview')?{activity}:{activities:[activity]}},room:{...room,id:'room'},reload:async()=>{}});
 try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir Práctica')[0].props.onClick();await view.flush();const detail=descendants(view.tree,n=>n.type?.name==='AttemptHistory')[0];assert.match(text(detail.props.actions),/Editar actividad/);assert.match(text(detail.props.actions),/Retirar actividad/);assert.equal(detail.props.activityPreview,activity);}finally{view.close();}
});
