import { libraryFixtureView } from './helpers/frontend-feature-fixtures.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
import React from 'react';

function controlledView(Component, props) {
  let refresh;
  function Host() { const [,setTick]=React.useState(0); refresh=()=>setTick(n=>n+1); return Component(props); }
  const view=hookView(Host,{});
  return {...view,get tree(){return view.tree;},update(next){Object.assign(props,next);refresh();}};
}

const room = { id:'room', name:'Ciencias', revision:'4', role:'teacher', archived:false, plans:[], units:[{id:'unit',name:'Seres vivos',topics:[
  {id:'cell',name:'La célula',status:'NEXT'}, {id:'food',name:'Nutrición',status:'TAUGHT'},
]}] };
const text = node => typeof node === 'string' ? node : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
const activity = { id:'a', title:'Una actividad', type:'ASSIGNMENT', status:'PUBLISHED', topicId:'cell', topicIds:['cell'], unitId:'unit', zone:'UTC' };
const draft = { ...activity, status:'DRAFT' };
function loadWorkspace() {
  return loadTsModule('apps/web/src/application/workflows/classroom-workspace/PlanWorkspace.tsx', {stubs:{"./use-plan-workspace.ts":{usePlanWorkspace:()=>({data:{materials:[],activities:[activity]}})}}}).PlanWorkspace;
}
test('teaching state stays independent from topic selection, opening activities and preparing a contextual upload', async()=>{
  const writes=[],opened=[],uploads=[],selected=[];
  const view=hookView(loadWorkspace(),{api:{},room,onOpenActivity:id=>opened.push(id),onTopicState:(...args)=>writes.push(args),
    onAddMaterial:ctx=>uploads.push(ctx),onSelectTopic:id=>selected.push(id)});
  try {
    await view.flush();
    const find=fn=>descendants(view.tree,fn)[0];
    const choose=id=>find(n=>n.type==='button'&&n.props['data-topic-choice']===id).props.onClick();
    choose('food'); await view.flush();
    assert.equal(find(n=>n.type==='button'&&text(n)==='Marcar como pendiente').props['aria-pressed'],true);
    assert.equal(find(n=>n.type==='button'&&n.props['aria-label']==='Abrir actividad: Una actividad'),undefined);
    choose('cell'); await view.flush();
    assert.deepEqual(selected,['food','cell']);
    assert.deepEqual([writes,opened,uploads],[[],[],[]]);
    find(n=>n.type==='button'&&n.props['aria-label']==='Abrir actividad: Una actividad').props.onClick();
    find(n=>n.type==='button'&&n.props['aria-label']==='Subir archivo para La célula').props.onClick();
    assert.deepEqual(opened,['a']);
    assert.deepEqual(uploads,[{unitId:'unit',topicIds:['cell']}]);
    assert.deepEqual(writes,[]);
    find(n=>n.type==='button'&&text(n)==='Marcar como dado').props.onClick();
    assert.deepEqual(writes,[['cell','TAUGHT']]);
  }finally{view.close();}
});
for(const override of [{role:'student'},{archived:true}])test(`read-only plan does not offer writing controls: ${JSON.stringify(override)}`,async()=>{
  const view=hookView(loadWorkspace(),{api:{},room:{...room,...override},onOpenActivity(){},onTopicState(){},onAddMaterial(){}});
  try{
    await view.flush();
    const buttons=descendants(view.tree,n=>n.type==='button');
    assert.ok(buttons.some(n=>n.props['aria-label']==='Abrir actividad: Una actividad'));
    assert.ok(!buttons.some(n=>n.props['aria-pressed']!==undefined || n.props['aria-label']?.startsWith('Subir archivo para')));
  }finally{view.close();}
});
test('teaching undo exists only after confirmed save and restores NEXT without migrating other topics',async()=>{
  const calls=[];let revision=4;
  const props={api:{call:async(path,method,payload)=>{calls.push({path,method,payload});}},room:structuredClone(room),reload:async()=>{props.room={...props.room,revision:String(++revision)};}};
  const {Plan}=loadTsModule('apps/web/src/application/workflows/classroom-workspace/ClassroomPlan.tsx');const view=hookView(Plan,props);
  try{
    await view.flush();const workspace=()=>descendants(view.tree,n=>n.type?.name==='PlanWorkspace')[0];
    await workspace().props.onTopicState('cell','TAUGHT');await view.flush();
    const undo=descendants(view.tree,n=>n.type==='button'&&n.props.children==='Deshacer avance')[0];assert.ok(undo);
    await undo.props.onClick();await view.flush();
    assert.deepEqual(calls.map(c=>[c.payload.revision,c.payload.operation]),[
      ['4',{action:'setTopicState',id:'cell',status:'TAUGHT'}],['5',{action:'setTopicState',id:'cell',status:'NEXT'}],
    ]);
  }finally{view.close();}
});
test('failed teaching save shows error and offers no false undo',async()=>{
  const {Plan}=loadTsModule('apps/web/src/application/workflows/classroom-workspace/ClassroomPlan.tsx');
  const view=hookView(Plan,{api:{call:async()=>{throw Error('Conflicto de revisión');}},room,reload:async()=>{throw Error('must not reload');}});
  try{await view.flush();await descendants(view.tree,n=>n.type?.name==='PlanWorkspace')[0].props.onTopicState('cell','TAUGHT');await view.flush();assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props.children==='Deshacer avance').length,0);assert.ok(descendants(view.tree,n=>n.type?.name==='Notice'&&n.props.error).length);}finally{view.close();}
});
test('retained activities discard a late preview from an earlier visible section',async()=>{
  let resolve;const response=new Promise(done=>{resolve=done;});
  const {Activities}=loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');
  const calls=[];
  const props={api:{call:async(...args)=>{
    calls.push(args);
    return args[0].endsWith('/preview')?response:args[0].endsWith('/progress')?{scope:'classroom',students:[]}:{activities:[activity]};
  }},room,active:true,reload:async()=>{}};
  const view=controlledView(Activities,props);
  try{
    await view.flush();
    const previewCall=()=>calls.find(([path])=>path==='/room/activities/a/preview');
    assert.equal(previewCall(),undefined);
    const open=descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir Una actividad')[0];
    assert.ok(open);
    open.props.onClick(); await view.flush();
    assert.ok(previewCall(),'the request was started by the click');
    assert.equal(previewCall()[3].aborted,false);
    view.update({active:false}); await view.flush();
    assert.equal(previewCall()[3].aborted,true);
    resolve({activity,revision:'4'}); await view.flush();
    view.update({active:true}); await view.flush();
    assert.equal(descendants(view.tree,n=>n.type?.name==='ActivityAuthoring'||n.type?.name==='AttemptHistory').length,0);
    assert.ok(calls.every(([,method])=>method==='GET'));
  }finally{view.close();}
});
test('new contextual creation asks before replacing a retained editor',async()=>{
  const {Activities}=loadTsModule('apps/web/src/application/workflows/activity-session/Activities.tsx');
  const calls=[];
  const props={api:{call:async(...args)=>{
    calls.push(args);const [path]=args;
    return path.endsWith('/preview')?{activity:draft,revision:'4'}:path.endsWith('/library')?[]:path.endsWith('/progress')?{scope:'classroom',students:[]}:{activities:[draft]};
  }},room,active:true,reload:async()=>{}};
  const view=controlledView(Activities,props);
  try{
    await view.flush();
    const find=predicate=>descendants(view.tree,predicate)[0];
    const editor=()=>find(n=>n.type?.name==='ActivityAuthoring');
    const editorId=()=>editor()?.props.data.activity.id;
    const drafts=find(n=>n.type==='button'&&text(n)==='Borradores privados');
    assert.ok(drafts);
    drafts.props.onClick(); await view.flush();
    find(n=>n.type==='button'&&n.props['aria-label']==='Abrir Una actividad').props.onClick();
    await view.flush();
    assert.equal(editorId(),'a');
    const context={unitId:'unit',topicIds:['food']};
    view.update({creationContext:context}); await view.flush();
    assert.ok(find(n=>n.type?.name==='Dialog'&&n.props.title==='Preparar otra actividad'));
    assert.equal(editorId(),'a');
    find(n=>n.type==='button'&&n.props.children==='Volver a la actividad abierta').props.onClick();
    await view.flush();
    assert.equal(editorId(),'a');
    assert.equal(find(n=>n.type?.name==='Dialog'&&n.props.title==='Preparar otra actividad'),undefined);
    view.update({creationContext:structuredClone(context)}); await view.flush();
    find(n=>n.type==='button'&&n.props.children==='Descartar cambios locales y continuar').props.onClick();
    await view.flush();
    assert.ok(editor());
    assert.notEqual(editorId(),'a');
    assert.deepEqual(editor().props.creationContext,context);
    assert.ok(calls.every(([,method])=>method==='GET'));
  }finally{view.close();}
});

test('equivalent home destinations retain identity while unrelated classroom resources rerender',async()=>{
 const {ClassroomView}=loadTsModule('apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx'),target={kind:'activity',classroomId:room.id,activityId:'activity',mode:'respond'};
 const view=controlledView(ClassroomView,{api:{call:async path=>path===`/${room.id}`?room:[]},id:room.id,initialCode:null,onExit(){},homeTarget:target});
 try{await view.flush();const current=()=>descendants(view.tree,n=>n.type?.name==='Activities')[0].props.target;const first=current();view.update({homeTarget:{...target}});await view.flush();assert.equal(current(),first);}finally{view.close();}
});
test('late student follow-up does not open over a different classroom section',async()=>{
  let resolve;const response=new Promise(done=>{resolve=done;});
  const {ClassroomView}=loadTsModule('apps/web/src/application/workflows/classroom-workspace/ClassroomWorkspace.tsx');
  const view=hookView(ClassroomView,{api:{call:async path=>path==='/room'?room:path==='/room/members/s'?response:[]},id:'room',initialCode:null,onExit(){}});
  try{await view.flush();const nav=()=>descendants(view.tree,n=>n.type?.name==='ClassroomNavigation')[0];nav().props.onSelect('progress');await view.flush();descendants(view.tree,n=>n.type?.name==='Progress')[0].props.onOpenStudent('s');await view.flush();nav().props.onSelect('plan');await view.flush();resolve({firstName:'Alumno',lastName:'Sintético',attempts:[]});await view.flush();assert.equal(descendants(view.tree,n=>n.type?.name==='ClassroomDialogs')[0].props.summary,null);}finally{view.close();}
});
test('new upload context cannot silently reset a file metadata draft',async()=>{
  const {Library}=loadTsModule('apps/web/src/features/materials/catalog/Library.tsx');
  const view=libraryFixtureView(Library,{room,api:{call:async()=>[],uploadClassroom:async()=>({id:'f',name:'guia.pdf',ready:true})},reload:async()=>{},uploadContext:{unitId:'unit',topicIds:['cell']}});
  try{await view.flush();descendants(view.tree,n=>n.type==='input'&&n.props.type==='file')[0].props.onChange({target:{files:[{name:'guia.pdf'}],value:''}});await view.flush();const form=()=>descendants(view.tree,n=>n.type?.name==='MaterialForm')[0];const key=form().key;view.update({uploadContext:{unitId:'unit',topicIds:['food']}});await view.flush();assert.equal(form().key,key,'metadata form remains mounted with its local title');assert.ok(descendants(view.tree,n=>n.type?.name==='Dialog'&&n.props.title==='Cambiar el destino del material').length);}finally{view.close();}
});
