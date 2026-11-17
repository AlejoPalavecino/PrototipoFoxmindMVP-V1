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
  const {PlanWorkspace}=loadTsModule('apps/web/src/application/workflows/classroom-workspace/PlanWorkspace.tsx',{stubs:{"./use-plan-workspace.ts":{usePlanWorkspace:()=>({data:{materials:[material],activities:[activity]}})}}});
  const view=hookView(PlanWorkspace,{api:{fileUrl:id=>'/files/'+id},room,onOpenActivity:id=>opened.push(id),onTopicState:(...args)=>writes.push(args)});
  try{
    await view.flush();
    const find=predicate=>descendants(view.tree,predicate);
    const resource=find(n=>n.type==='button'&&n.props['aria-label']==='Abrir actividad: Actividad del tema')[0];
    assert.ok(resource);assert.equal(resource.props['aria-label'],'Abrir actividad: Actividad del tema');resource.props.onClick();assert.deepEqual(opened,['activity']);
    const choice = find(n=>n.type==='button'&&n.props['data-topic-choice']==='two')[0];
    assert.ok(choice, 'Ecosistemas debe poder seleccionarse en el mapa');
    choice.props.onClick();
    await view.flush();
    const details = find(n=>n.type==='section'&&n.props['aria-label']==='Tema seleccionado')[0];
    assert.match(text(details), /Ecosistemas/);
    assert.equal(writes.length,0);
    const mark = descendants(details, n=>n.type==='button'&&text(n)==='Marcar como dado')[0];
    assert.ok(mark);
    assert.equal(mark.props['aria-pressed'], false);
    mark.props.onClick();
    assert.deepEqual(writes,[['two','TAUGHT']]);
  }finally{view.close();}
});
