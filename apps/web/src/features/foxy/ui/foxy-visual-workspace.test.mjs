import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import {componentWithPorts} from "../../../../../../tests/foxmind-3d-flows-loader.test.mjs";
import {hookView,descendants} from "../../../../../../tests/agenda-ui-helpers.test.mjs";

const conversationId=randomUUID(),assetId=randomUUID(),jobId=randomUUID(),topicId=randomUUID(),otherTopicId=randomUUID();
const job={id:jobId,conversationId,assetId,kind:'IMAGE',aspectRatio:'1:1',state:'READY',errorCode:null};
const {FoxyVisualWorkspace,FoxyVisualTimeline}=componentWithPorts("apps/web/src/features/foxy/visuals/foxy-visual-workspace.tsx",{});

function fixture(overrides={}) {
 const calls=[],record=name=>(...args)=>calls.push([name,...args]);
 const props={capabilities:{IMAGE:true,DIAGRAM:true},kind:'DIAGRAM',prompt:'Ciclo del agua',aspectRatio:'1:1',jobs:[job],selectedId:jobId,busy:false,error:null,
  actions:{setKind:record('kind'),setPrompt:record('prompt'),setAspectRatio:record('ratio'),start:record('start')},
  assetFileUrl:(id,mode)=>`/api/v1/foxy-ai/assets/${id}/file?mode=${mode}`,...overrides};
 return {calls,view:hookView(FoxyVisualWorkspace,props)};
}
const controls=(tree,type)=>descendants(tree,node=>node.type==='input'&&node.props.type===type);
function submit(tree) {
 const form=descendants(tree,node=>node.type==='form'&&node.props.id==='foxy-visual-form')[0];
 assert.ok(form,'el formulario recibe el envío desde el pie del diálogo');
 assert.equal(form.props.hidden,false);
 let prevented=false;
 form.props.onSubmit({preventDefault(){prevented=true;}});
 assert.equal(prevented,true);
}
test('independent capabilities offer image and diagram creation and retain classroom selection',async()=>{
 const initialTopicIds=[topicId];
 const f=fixture({jobs:[],selectedId:null,topics:[{id:topicId,name:'Agua'},{id:otherTopicId,name:'Atmósfera'}],
  initialTopicIds,contextName:'Biología',materialCount:2});
 try {
  await f.view.flush();
  const html=renderToStaticMarkup(f.view.tree);
  assert.match(html,/Biología/iu);
  assert.match(html,/2 materiales incluidos/iu);
  assert.match(html,/Imagen de ejemplo/u);
  assert.match(html,/Esquema/u);
  assert.ok(descendants(f.view.tree,node=>node.type==='textarea'&&node.props.value==='Ciclo del agua').length);
  const kinds=controls(f.view.tree,'radio');
  assert.equal(kinds.length,2);
  assert.deepEqual(kinds.map(node=>[node.props.checked,node.props.disabled]),[[true,false],[false,false]]);
  kinds[1].props.onChange();
  assert.deepEqual(f.calls,[['kind','IMAGE']]);
  const topics=controls(f.view.tree,'checkbox');
  assert.equal(topics.length,2);
  assert.deepEqual(topics.map(node=>node.props.checked),[true,false]);
  submit(f.view.tree);
  topics[0].props.onChange();
  await f.view.flush();
  controls(f.view.tree,'checkbox')[1].props.onChange();
  await f.view.flush();
  assert.deepEqual(controls(f.view.tree,'checkbox').map(node=>node.props.checked),[false,true]);
  submit(f.view.tree);
  assert.deepEqual(f.calls,[['kind','IMAGE'],['start',[topicId]],['start',[otherTopicId]]]);
  assert.deepEqual(initialTopicIds,[topicId],'la selección previa del chat permanece intacta');
 }finally{f.view.close();}
});
test('disabled kind cannot start a request and available kind remains usable',async()=>{
 for(const unavailable of ['IMAGE','DIAGRAM']){
  const available=unavailable==='IMAGE'?'DIAGRAM':'IMAGE';
  const capabilities={IMAGE:available==='IMAGE',DIAGRAM:available==='DIAGRAM'};
  const disabled=fixture({capabilities,kind:unavailable,jobs:[],selectedId:null});
  const enabled=fixture({capabilities,kind:available,jobs:[],selectedId:null});
  try {
   await disabled.view.flush();
   const radios=controls(disabled.view.tree,'radio');
   assert.equal(radios.length,2);
   assert.equal(radios.find(node=>node.props.checked)?.props.disabled,true);
   assert.equal(radios.find(node=>!node.props.checked)?.props.disabled,false);
   assert.match(renderToStaticMarkup(disabled.view.tree),/no está disponible/iu);
   submit(disabled.view.tree);
   assert.deepEqual(disabled.calls,[]);
   radios.find(node=>!node.props.disabled).props.onChange();
   assert.deepEqual(disabled.calls,[['kind',available]]);
   await enabled.view.flush();
   assert.equal(controls(enabled.view.tree,'radio').find(node=>node.props.checked)?.props.disabled,false);
   submit(enabled.view.tree);
   assert.deepEqual(enabled.calls,[['start',undefined]]);
  }finally{disabled.view.close();enabled.view.close();}
 }
});
test('queued and running jobs expose progress in the conversation without private preview',async()=>{
 for(const [state,title] of [['QUEUED','Tu solicitud está en cola'],['RUNNING','Diseñando una imagen para explicarla']]){
  const jobs=[{...job,state}];
  const f=fixture({jobs});
  const stopped=[];
  const timeline=hookView(FoxyVisualTimeline,{jobs,onStop:id=>stopped.push(id),onRetry(){},onOpen(){assert.fail('Un trabajo incompleto no se puede abrir');}});
  try {
   await f.view.flush();
   await timeline.flush();
   const html=renderToStaticMarkup(timeline.tree);
   assert.ok(html.includes(title));
   assert.match(html,/role="status" aria-live="polite"/u);
   assert.doesNotMatch(html,/Abrir creación|mode=preview|mode=download/u);
   assert.doesNotMatch(html+renderToStaticMarkup(f.view.tree),new RegExp(assetId));
   const progress=descendants(timeline.tree,node=>node.type?.name==='FoxyWait')[0];
   assert.ok(progress);
   assert.equal(progress.props.queued,state==='QUEUED');
   progress.props.onStop();
   assert.deepEqual(stopped,[jobId]);
  }finally{timeline.close();f.view.close();}
 }
});
test('ready exposes same-origin private preview and download; failed exposes neither',async()=>{
 const ready=fixture();try {await ready.view.flush();
  const paths=descendants(ready.view.tree,n=>['img','a'].includes(n.type)).map(n=>n.props.src??n.props.href);
  const path=`/api/v1/foxy-ai/assets/${assetId}/file?mode=`;
  assert.ok(paths.includes(path+'preview'));
  assert.ok(paths.includes(path+'download'));
  assert.ok(paths.every(href=>href===path+'preview'||href===path+'download'));
 }finally{ready.view.close();}
 const failed=fixture({jobs:[{...job,state:'FAILED',errorCode:'AI_UNAVAILABLE'}],error:'No se pudo generar'});try {await failed.view.flush();const html=renderToStaticMarkup(failed.view.tree);assert.match(html,/error|no se pudo|intent/iu);assert.doesNotMatch(html,new RegExp(assetId));}finally{failed.view.close();}
});
