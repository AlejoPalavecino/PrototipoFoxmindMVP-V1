import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const text = n => typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join(' ') : text(n?.props?.children ?? '');
const room = {id:'room', revision:'r1',role:'teacher',archived:false,units:[{id:'unit',name:'Números',topics:[{id:'t1',name:'Fracciones'},{id:'t2',name:'Decimales'}]}]};
const context = {unitId:'unit',topicIds:['t1','t2']};
test('Plan context survives the clean method chooser and remains editable in AI stage one without writes', async () => {
 const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
 const calls = [], api = { call: async (...args) => { calls.push(args); return args[0].endsWith('/sources') ? { revision: 'r1', sources: [] } : args[0].endsWith('/activity-generations') ? { jobs: [] } : { activities: [] }; } };
 const view = hookView(Activities, { api, room, reload: async () => {}, creationContext: context });
 let generationView;
 try {
  await view.flush();
  descendants(view.tree, node => node.type === 'button' && text(node) === 'Crear actividad')[0].props.onClick(); await view.flush();
  const choice = descendants(view.tree, node => node.type?.name === 'Dialog' && node.props.title === 'Crear actividad')[0];
  assert.ok(choice);
  assert.equal(descendants(choice, node => node.type?.name === 'ActivityAssignment').length, 0);
  assert.match(text(choice), /Crear manualmente/); assert.match(text(choice), /Crear con IA/);
  assert.ok(calls.every(call => call[1] === 'GET'), 'Opening the method choice never creates a draft');
  descendants(choice, node => node.type === 'button' && node.props['aria-label'] === 'Crear con IA')[0].props.onClick(); await view.flush();
  const generation = descendants(view.tree, node => node.type?.name === 'ActivityGeneration')[0];
  assert.deepEqual(generation.props.creationContext, context);
  generationView = hookView(generation.type, generation.props); await generationView.flush();
  const setup = () => descendants(generationView.tree, node => node.type?.name === 'GenerationSetup')[0];
  assert.equal(setup().props.value.unitId, context.unitId);
  assert.deepEqual(setup().props.value.topicIds, context.topicIds);
  setup().props.update({ ...setup().props.value, topicIds: ['t2'] }); await generationView.flush();
  assert.deepEqual(setup().props.value.topicIds, ['t2'], 'The initial curriculum remains editable before generating');
  assert.ok(calls.every(call => call[1] === 'GET'), 'Choice and local context editing never generate, save or publish');
 } finally { generationView?.close(); view.close(); }
});

test('Manual editor precarga context locally and keeps the three approved stages without publishing',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/classrooms-ui/ActivityAuthoring.tsx');const calls=[];
 const activity={id:'a',type:'ASSIGNMENT',status:'DRAFT',title:null,unitId:null,topicIds:[],instructions:'',attachmentRequired:false,questions:[],instructionFiles:[],materials:[],deadlineAt:null,allowLate:false,locked:false};
 const view=hookView(ActivityAuthoring,{api:{call:async(...a)=>calls.push(a)},room:{...room,timezone:'UTC'},data:{activity,revision:'r1'},materials:[],creationContext:context,onSaved:async()=>{},onClose(){}});
 try{await view.flush();const assignment=descendants(view.tree,n=>n.type?.name==='ActivityAssignment')[0];assert.deepEqual(assignment.props.value,context);assignment.props.update({unitId:'unit',topicIds:['t2']});await view.flush();assert.deepEqual(descendants(view.tree,n=>n.type?.name==='ActivityAssignment')[0].props.value,{unitId:'unit',topicIds:['t2']});const stages=descendants(view.tree,n=>n.type==='ol'&&n.props['aria-label']==='Etapas de edición')[0];assert.equal(descendants(stages,n=>n.type==='li').length,3);assert.match(text(stages),/Selección y origen/);assert.match(text(stages),/Preparar actividad/);assert.match(text(stages),/Revisar y asignar/);assert.equal(calls.length,0);}finally{view.close();}
});
test('Assignment keeps real multi-topic checkboxes editable, clearing topics on a unit change',()=>{
 const {ActivityAssignment}=loadTsModule('apps/classrooms-ui/activity-Assignment.tsx');const changes=[];
 const tree=ActivityAssignment({room,value:context,update:value=>changes.push(value)});
 const checks=descendants(tree,n=>n.type==='input'&&n.props.type==='checkbox');assert.equal(checks.length,2);assert.ok(checks.every(n=>n.props.checked));
 checks[0].props.onChange({target:{checked:false}});assert.deepEqual(changes[0],{unitId:'unit',topicIds:['t2']});
 descendants(tree,n=>n.type==='select')[0].props.onChange({target:{value:''}});assert.deepEqual(changes[1],{unitId:'',topicIds:[]});
});
test('Saving manual contextual activity sends all selected topics without publication and stage navigation never writes',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/classrooms-ui/ActivityAuthoring.tsx');const calls=[];
 const activity={id:'a',type:'ASSIGNMENT',status:'DRAFT',title:'Ejercicios',unitId:null,topicIds:[],instructions:'Resolver',attachmentRequired:true,questions:[],instructionFiles:[],materials:[],deadlineAt:null,allowLate:false,locked:false};
 const view=hookView(ActivityAuthoring,{api:{call:async(...a)=>{calls.push(a);return {revision:'r2'};}},room:{...room,timezone:'UTC'},data:{activity,revision:'r1'},materials:[],creationContext:context,onSaved:async()=>{},onClose(){}});
 try{await view.flush();descendants(view.tree,n=>n.type==='button'&&text(n)==='Continuar')[0].props.onClick();await view.flush();assert.equal(calls.length,0);
 descendants(view.tree,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();assert.equal(calls.length,1);assert.equal(calls[0][2].operation.action,'save');assert.deepEqual(calls[0][2].operation.payload.topicIds,['t1','t2']);assert.equal(calls[0][2].operation.payload.unitId,'unit');
 }finally{view.close();}
});
test('AI setup cannot pass materials without an explicit source or class explanation',async()=>{
 const {GenerationSetup}=loadTsModule('apps/classrooms-ui/GenerationSetup.tsx');const {defaultGenerationForm}=loadTsModule('apps/classrooms-ui/ActivityGenerationForm.tsx');const calls=[];
 const view=hookView(GenerationSetup,{room,value:{...defaultGenerationForm(),...context,objective:'Relacionar conceptos'},update(){},sources:[],disabled:false,generate:v=>calls.push(v)});
 try{await view.flush();for(let i=0;i<2;i++){descendants(view.tree,n=>n.type==='form')[0].props.onSubmit({preventDefault(){}});await view.flush();}assert.equal(calls.length,0);assert.match(text(view.tree),/Elegí al menos una fuente/);assert.match(text(view.tree),/Cambiar unidad o temas/);}finally{view.close();}
});

for (const state of [{ archived: false, status: 'DRAFT', editing: true }, { archived: true, status: 'DRAFT', editing: false }, { archived: false, status: 'PUBLISHED', editing: false }]) test(`Contextual activity target opens the draft editor only when writable ${JSON.stringify(state)}`, async () => {
 const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
 const calls = [], activity = { id: 'draft', type: 'ASSIGNMENT', status: state.status, title: 'Saved draft', locked: false };
 const api = { call: async (...args) => { calls.push(args); return args[0].endsWith('/preview') ? { activity, revision: 'r1' } : args[0].endsWith('/library') ? [] : { activities: [] }; } };
 const view = hookView(Activities, { api, room: { ...room, archived: state.archived }, target: { kind: 'activity', activityId: 'draft' }, reload: async () => {} });
 try {
  await view.flush();
  const editors = descendants(view.tree, node => node.type?.name === 'ActivityAuthoring');
  assert.equal(editors.length, Number(state.editing));
  if (state.editing) assert.strictEqual(editors[0].props.data.activity, activity);
  assert.equal(calls.some(args => args[0] === '/room/library'), state.editing);
  assert.ok(calls.every(args => args[1] === 'GET'), 'Opening a saved draft never saves or publishes it');
 } finally { view.close(); }
});
