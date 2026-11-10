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

const room = { id:'room', revision:'4', role:'teacher', archived:false, plans:[], units:[{id:'unit',name:'Seres vivos',topics:[
  {id:'cell',name:'La célula',status:'NEXT'}, {id:'food',name:'Nutrición',status:'TAUGHT'},
]}] };
function loadWorkspace() {
  return loadTsModule('apps/web/src/application/academic-plan-workspace.tsx', {stubs:{"../model/use-plan-workspace.ts":{usePlanWorkspace:()=>({data:{materials:[],activities:[]}})}}}).PlanWorkspace;
}
test('teaching check is independent from selection and contextual creation does not persist anything', async()=>{
  const writes=[],created=[],uploads=[],selected=[];
  const view=hookView(loadWorkspace(),{api:{},room,onOpenActivity(){},onTopicState:(...args)=>writes.push(args),
    onCreateActivity:ctx=>created.push(ctx),onAddMaterial:ctx=>uploads.push(ctx),onSelectTopic:id=>selected.push(id)});
  try {
    await view.flush();
    const find=fn=>descendants(view.tree,fn);
    const checkbox=find(n=>n.type==='input'&&n.props['aria-label']==='Marcar como dado: La célula')[0];
    assert.ok(checkbox,'direct teaching checkbox');
    checkbox.props.onChange({target:{checked:true}});
    assert.deepEqual(writes,[['cell','TAUGHT']]);
    find(n=>n.type==='button'&&n.props['aria-label']==='Crear actividad para La célula')[0].props.onClick();
    find(n=>n.type==='button'&&n.props['aria-label']==='Agregar material para La célula')[0].props.onClick();
    assert.deepEqual(created,[{unitId:'unit',topicIds:['cell']}]);assert.deepEqual(uploads,created);
    find(n=>n.type==='select'&&n.props['aria-label']==='Tema del plan')[0].props.onChange({target:{value:'food'}});
    await view.flush();
    assert.deepEqual(selected,['food']);assert.equal(writes.length,1,'selection did not write');
  }finally{view.close();}
});
for(const override of [{role:'student'},{archived:true}])test(`read-only plan does not offer writing controls: ${JSON.stringify(override)}`,async()=>{
  const view=hookView(loadWorkspace(),{api:{},room:{...room,...override},onOpenActivity(){},onTopicState(){},onCreateActivity(){},onAddMaterial(){}});
  try{await view.flush();assert.equal(descendants(view.tree,n=>n.type==='input'&&n.props.type==='checkbox').length,0);assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']?.startsWith('Crear actividad para')).length,0);}finally{view.close();}
});
test('teaching undo exists only after confirmed save and restores NEXT without migrating other topics',async()=>{
  const calls=[];let revision=4;
  const props={api:{call:async(path,method,payload)=>{calls.push({path,method,payload});}},room:structuredClone(room),reload:async()=>{props.room={...props.room,revision:String(++revision)};}};
  const {Plan}=loadTsModule('apps/web/src/application/academic-plan.tsx');const view=hookView(Plan,props);
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
  const {Plan}=loadTsModule('apps/web/src/application/academic-plan.tsx');
  const view=hookView(Plan,{api:{call:async()=>{throw Error('Conflicto de revisión');}},room,reload:async()=>{throw Error('must not reload');}});
  try{await view.flush();await descendants(view.tree,n=>n.type?.name==='PlanWorkspace')[0].props.onTopicState('cell','TAUGHT');await view.flush();assert.equal(descendants(view.tree,n=>n.type==='button'&&n.props.children==='Deshacer avance').length,0);assert.ok(descendants(view.tree,n=>n.type?.name==='Notice'&&n.props.error).length);}finally{view.close();}
});
test('retained activities discard a late preview from an earlier visible section',async()=>{
  let resolve;const response=new Promise(done=>{resolve=done;});
  const activity={id:'a',title:'A',type:'ASSIGNMENT',status:'DRAFT',topicId:'cell',topicIds:['cell'],unitId:'unit',zone:'UTC'};
  const {Activities}=loadTsModule('apps/web/src/application/academic-Activities.tsx');
  const props={api:{call:async path=>path.endsWith('/preview')?response:path.endsWith('/library')?[]:{activities:[activity]}},room,active:true,reload:async()=>{}};
  const view=controlledView(Activities,props);
  try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir A')[0].props.onClick();await view.flush();view.update({active:false});await view.flush();resolve({activity,revision:'4'});await view.flush();view.update({active:true});await view.flush();assert.equal(descendants(view.tree,n=>n.type?.name==='ActivityAuthoring'||n.type?.name==='AttemptHistory').length,0);}finally{view.close();}
});
test('new contextual creation asks before replacing a retained editor',async()=>{
  const activity={id:'a',title:'A',type:'ASSIGNMENT',status:'DRAFT',topicId:'cell',topicIds:['cell'],unitId:'unit',zone:'UTC'};
  const {Activities}=loadTsModule('apps/web/src/application/academic-Activities.tsx');
  const props={api:{call:async path=>path.endsWith('/preview')?{activity,revision:'4'}:path.endsWith('/library')?[]:{activities:[activity]}},room,active:true,reload:async()=>{}};
  const view=controlledView(Activities,props);
  try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Abrir A')[0].props.onClick();await view.flush();descendants(view.tree,n=>n.type?.name==='AttemptHistory')[0].props.actions.props.children[0].props.onClick();await view.flush();view.update({creationContext:{unitId:'unit',topicIds:['food']}});await view.flush();assert.ok(descendants(view.tree,n=>n.type?.name==='Dialog'&&n.props.title==='Preparar otra actividad').length);const proceed=descendants(view.tree,n=>n.type==='button'&&n.props.children==='Descartar cambios locales y continuar')[0];proceed.props.onClick();await view.flush();assert.equal(descendants(view.tree,n=>n.type?.name==='ActivityAuthoring').length,0);assert.equal(descendants(view.tree,n=>n.type?.name==='ActivityAssignment').length,0);descendants(view.tree,n=>n.type==='button'&&n.props['aria-label']==='Crear con IA')[0].props.onClick();await view.flush();assert.deepEqual(descendants(view.tree,n=>n.type?.name==='ActivityGeneration')[0].props.creationContext,{unitId:'unit',topicIds:['food']});}finally{view.close();}
});

test('equivalent home destinations retain identity while unrelated classroom resources rerender',async()=>{
 const {ClassroomView}=loadTsModule('apps/web/src/application/academic-ClassroomView.tsx'),target={kind:'activity',classroomId:room.id,activityId:'activity',mode:'respond'};
 const view=controlledView(ClassroomView,{api:{call:async path=>path===`/${room.id}`?room:[]},id:room.id,initialCode:null,onExit(){},homeTarget:target});
 try{await view.flush();const current=()=>descendants(view.tree,n=>n.type?.name==='Activities')[0].props.target;const first=current();view.update({homeTarget:{...target}});await view.flush();assert.equal(current(),first);}finally{view.close();}
});
test('late student follow-up does not open over a different classroom section',async()=>{
  let resolve;const response=new Promise(done=>{resolve=done;});
  const {ClassroomView}=loadTsModule('apps/web/src/application/academic-ClassroomView.tsx');
  const view=hookView(ClassroomView,{api:{call:async path=>path==='/room'?room:path==='/room/members/s'?response:[]},id:'room',initialCode:null,onExit(){}});
  try{await view.flush();const nav=()=>descendants(view.tree,n=>n.type?.name==='ClassroomNavigation')[0];nav().props.onSelect('progress');await view.flush();descendants(view.tree,n=>n.type?.name==='Progress')[0].props.onOpenStudent('s');await view.flush();nav().props.onSelect('plan');await view.flush();resolve({firstName:'Alumno',lastName:'Sintético',attempts:[]});await view.flush();assert.equal(descendants(view.tree,n=>n.type?.name==='ClassroomDialogs')[0].props.summary,null);}finally{view.close();}
});
test('new upload context cannot silently reset a file metadata draft',async()=>{
  const {Library}=loadTsModule('apps/web/src/features/materials/ui/Library.tsx');
  const view=controlledView(Library,{room,api:{call:async()=>[],uploadClassroom:async()=>({id:'f',name:'guia.pdf',ready:true})},reload:async()=>{},uploadContext:{unitId:'unit',topicIds:['cell']}});
  try{await view.flush();descendants(view.tree,n=>n.type==='input'&&n.props.type==='file')[0].props.onChange({target:{files:[{name:'guia.pdf'}],value:''}});await view.flush();const form=()=>descendants(view.tree,n=>n.type?.name==='MaterialForm')[0];const key=form().key;view.update({uploadContext:{unitId:'unit',topicIds:['food']}});await view.flush();assert.equal(form().key,key,'metadata form remains mounted with its local title');assert.ok(descendants(view.tree,n=>n.type?.name==='Dialog'&&n.props.title==='Cambiar el destino del material').length);}finally{view.close();}
});
