import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from './helpers/load-ts-module.mjs';
import {hookView,descendants} from './agenda-ui-helpers.test.mjs';
const text=node=>typeof node==='string'?node:Array.isArray(node)?node.map(text).join(''):node?.props?text(node.props.children):'';
const topics=[{id:'one',name:'La célula',status:'NEXT'},{id:'two',name:'Ecosistemas',status:'PENDING'}];
const room={id:'room',role:'teacher',archived:false,units:[{id:'unit',name:'Seres vivos',topics}]};
test('Plan selection never changes teaching state; only the explicit state control writes',async()=>{
  const writes=[],opened=[];
  const material={id:'material',title:'Guía',fileId:'file',topicId:'one',ready:true,deleted:false,extension:'pdf',previewable:true,fileName:'guia.pdf'};
  const activity={id:'activity',title:'Actividad del tema',topicId:'one',type:'ASSIGNMENT',status:'PUBLISHED',zone:'UTC',deadlineAt:null};
  const {PlanWorkspace}=loadTsModule('apps/classrooms-ui/PlanWorkspace.tsx',{stubs:{'./use-plan-workspace.ts':{usePlanWorkspace:()=>({data:{materials:[material],activities:[activity]}})}}});
  const view=hookView(PlanWorkspace,{api:{fileUrl:id=>'/files/'+id},room,onOpenActivity:id=>opened.push(id),onTopicState:(...args)=>writes.push(args)});
  try{
    await view.flush();
    const find=predicate=>descendants(view.tree,predicate);
    const resource=find(n=>n.type==='button'&&n.props['aria-label']==='Abrir actividad: Actividad del tema')[0];
    assert.ok(resource);assert.equal(text(resource),'Abrir actividad');resource.props.onClick();assert.deepEqual(opened,['activity']);
    find(n=>n.type==='select'&&n.props['aria-label']==='Tema del plan')[0].props.onChange({target:{value:'two'}});await view.flush();
    assert.equal(writes.length,0);
    find(n=>n.type==='select'&&n.props['aria-label']==='Avance de Ecosistemas')[0].props.onChange({target:{value:'TAUGHT'}});
    assert.deepEqual(writes,[['two','TAUGHT']]);
  }finally{view.close();}
});
