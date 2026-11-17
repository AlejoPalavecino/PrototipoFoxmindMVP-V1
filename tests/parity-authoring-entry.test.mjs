import { authoringFixtureProps } from './helpers/frontend-feature-fixtures.mjs';
import { useState } from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView, descendants } from './agenda-ui-helpers.test.mjs';
const text = node => typeof node === 'string' || typeof node === 'number' ? String(node) : Array.isArray(node) ? node.map(text).join('') : text(node?.props?.children ?? '');
test('focused scope requires a method and private idea; one explicit click requests generation', async () => {
 const {ActivityAuthoring}=loadTsModule('apps/web/src/features/activity-authoring/drafting/ActivityAuthoring.tsx');
 const generated=[],writes=[];
 const view=hookView(ActivityAuthoring,authoringFixtureProps('ActivityAuthoring', {room:{id:'room',name:'Aula',role:'teacher',timezone:'UTC',units:[{id:'u',name:'Unidad',topics:[{id:'t',name:'Tema'}]}]},materials:[],data:{revision:'1',activity:{id:'',title:'',instructions:'',type:'ASSIGNMENT',questions:[],materials:[],instructionFiles:[],attachmentRequired:false,allowLate:false}},api:{call:async(...args)=>{if(args[1]===undefined||args[1]==='GET')return {sources:[]};writes.push(args);}},onSaved:async()=>{},onClose(){},onGenerate:value=>generated.push(value)}));
 const find=predicate=>descendants(view.tree,predicate)[0];
 const click=label=>find(node=>node.type==='button'&&text(node)===label).props.onClick();
 try {await view.flush();
 find(node=>node.type?.name==='ActivityAssignment').props.update({unitIds:[],topicIds:['t']});
 find(node=>node.type?.name==='ActivityTypeChoice').props.update('QUESTIONNAIRE');await view.flush();
 click('Continuar');await view.flush();assert.match(text(view.tree),/Elegí si querés prepararla/);assert.deepEqual(generated,[]);
 const choices=descendants(view.tree,node=>node.type==='input'&&node.props.name==='activity-method');choices[1].props.onChange();await view.flush();
 click('Generar propuesta');await view.flush();assert.match(text(view.tree),/Escribí una idea/);assert.deepEqual(generated,[]);
 click('Ajustes y fuentes (opcional)');await view.flush();assert.deepEqual(generated,[]);click('Listo');await view.flush();assert.deepEqual(generated,[]);
 find(node=>node.type==='textarea'&&node.props.placeholder?.startsWith('Contale')).props.onChange({target:{value:'Comparar dos situaciones con luz.'}});await view.flush();
 click('Generar propuesta');click('Generar propuesta');await view.flush();assert.equal(generated.length,1);assert.deepEqual(generated[0].topicIds,['t']);assert.equal(generated[0].type,'QUESTIONNAIRE');assert.deepEqual(writes,[]);
 }finally{view.close();}
});

test('generation settings are one optional form, not another three-step wizard', async()=>{
 const {GenerationSetup}=loadTsModule('apps/web/src/features/activity-authoring/generation/GenerationSetup.tsx');
 const calls=[]; const value={unitIds:[],topicIds:['t'],teacherBrief:'Comparar las luces',type:'QUESTIONNAIRE',sourceIds:[],durationMinutes:30};
 const view=hookView(GenerationSetup,{room:{units:[{id:'u',name:'Unidad',topics:[{id:'t',name:'Tema'}]}]},value,update(){},sources:[],disabled:false,generate:v=>calls.push(v)});
 try {await view.flush();assert.equal(descendants(view.tree,node=>node.type==='ol').length,0);view.tree.props.onSubmit({preventDefault(){}});await view.flush();assert.deepEqual(calls,[value]);}finally{view.close();}
});

test('explicit generation opens its ready proposal once as a private draft in the shared editor', async()=>{
 const requests=[],applied=[];
 const proposal={title:'Propuesta',evaluationRubric:[{name:'Evidencia',description:'Usa ejemplos',weight:100}]};
 const {ActivityGeneration}=loadTsModule('apps/web/src/features/activity-authoring/generation/ActivityGeneration.tsx',{stubs:{'./use-activity-generation.ts':{useActivityGeneration:()=>{
  const [view,setView]=useState(null);
  return {sources:[],jobs:[],view,busy:false,error:'',generate:async value=>{requests.push(value);setView({id:'job',state:'READY',proposal});return true;},apply:async(id,value)=>applied.push({id,value}),refresh:async()=>{}};
 }}}});
 const input={unitIds:['u1'],topicIds:['t3'],teacherBrief:'Comparar',type:'ASSIGNMENT'};
 const view=hookView(ActivityGeneration,authoringFixtureProps('ActivityGeneration', {api:{},room:{id:'aula',role:'teacher',units:[]},initialRequest:input,onApplied:async()=>{},onClose(){}}));
 try{await view.flush();await view.flush();assert.deepEqual(requests,[input]);assert.deepEqual(applied,[{id:'job',value:proposal}]);assert.equal(descendants(view.tree,node=>node.type==='section'&&node.props.className==='education-generation-settings')[0].props.hidden,true);}finally{view.close();}
});
