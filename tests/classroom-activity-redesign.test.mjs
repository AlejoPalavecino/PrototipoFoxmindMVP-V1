import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const text = n => typeof n === 'string' ? n : Array.isArray(n) ? n.map(text).join(' ') : text(n?.props?.children ?? '');
const room = {id:'room', revision:'r1',role:'teacher',archived:false,units:[{id:'unit',name:'Números',topics:[{id:'t1',name:'Fracciones'},{id:'t2',name:'Decimales'}]}]};
const context = {unitId:'unit',topicIds:['t1','t2']};
test('Context from Plan is visible and editable before choosing manual or AI, without creating a draft', async()=>{
 const {Activities}=loadTsModule('apps/classrooms-ui/Activities.tsx'); const calls=[];
 const view=hookView(Activities,{api:{call:async(...args)=>{calls.push(args);return {activities:[]};}},room,reload:async()=>{},creationContext:context});
 try {await view.flush(); const assignment=descendants(view.tree,n=>n.type?.name==='ActivityAssignment')[0]; assert.ok(assignment); assert.deepEqual(assignment.props.value,context);
 assert.match(text(view.tree),/Crear manualmente/); assert.match(text(view.tree),/Foxy AI/); assert.ok(calls.every(c=>c[1]==='GET'));
 descendants(view.tree,n=>n.type==='button'&&text(n).includes('Foxy AI'))[0].props.onClick();await view.flush();
 const generation=descendants(view.tree,n=>n.type?.name==='ActivityGeneration')[0];assert.deepEqual(generation.props.creationContext,context);assert.ok(calls.every(c=>c[1]==='GET'));
 }finally{view.close();}
});
test('Manual editor precarga context locally and keeps all four stages without publishing',async()=>{
 const {ActivityAuthoring}=loadTsModule('apps/classrooms-ui/ActivityAuthoring.tsx');const calls=[];
 const activity={id:'a',type:'ASSIGNMENT',status:'DRAFT',title:null,unitId:null,topicIds:[],instructions:'',attachmentRequired:false,questions:[],instructionFiles:[],materials:[],deadlineAt:null,allowLate:false,locked:false};
 const view=hookView(ActivityAuthoring,{api:{call:async(...a)=>calls.push(a)},room:{...room,timezone:'UTC'},data:{activity,revision:'r1'},materials:[],creationContext:context,onSaved:async()=>{},onClose(){}});
 try{await view.flush();const assignment=descendants(view.tree,n=>n.type?.name==='ActivityAssignment')[0];assert.deepEqual(assignment.props.value,context);assert.match(text(view.tree),/Preparación/);assert.match(text(view.tree),/Materiales/);assert.match(text(view.tree),/Condiciones/);assert.match(text(view.tree),/Revisión/);assert.equal(calls.length,0);}finally{view.close();}
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
