import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import {componentWithPorts} from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants} from '../../../../tests/agenda-ui-helpers.test.mjs';

const conversationId=randomUUID(),assetId=randomUUID(),jobId=randomUUID(),topicId=randomUUID(),sourceId=randomUUID();
const selection={topicIds:[topicId],sourceIds:[sourceId]};
const job={id:jobId,conversationId,assetId,kind:'IMAGE',aspectRatio:'1:1',state:'READY',errorCode:null};
function fixture(overrides={}) {
 const calls=[],record=name=>(...args)=>calls.push([name,...args]);
 const props={capabilities:{IMAGE:true,DIAGRAM:true},conversationId,revision:'3',selection,kind:'IMAGE',prompt:'Ciclo del agua',aspectRatio:'1:1',jobs:[job],selectedId:jobId,busy:false,error:null,
  actions:{setKind:record('kind'),setPrompt:record('prompt'),setAspectRatio:record('ratio'),start:record('start'),refresh:record('refresh'),select:record('select')},
  assetFileUrl:(id,mode)=>`/api/v1/foxy-ai/assets/${id}/file?mode=${mode}`,...overrides};
 const {FoxyVisualWorkspace}=componentWithPorts('apps/web/src/components/foxy-visual-workspace.tsx',{});
 assert.equal(typeof FoxyVisualWorkspace,'function');return {calls,props,view:hookView(FoxyVisualWorkspace,props)};
}
test('independent capabilities offer image and diagram creation and retain classroom selection',async()=>{
 const f=fixture();try {await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/imagen/iu);assert.match(html,/esquema|diagrama/iu);assert.match(html,/generar|crear/iu);
  assert.ok(descendants(f.view.tree,n=>['textarea','input'].includes(n.type)&&n.props.value==='Ciclo del agua').length);
  assert.ok(descendants(f.view.tree,n=>n.type==='select'||n.type==='button').some(n=>/1:1|formato|proporci[oó]n/iu.test(JSON.stringify(n.props.children))));
 }finally{f.view.close();}
});
test('disabled kind cannot start a request and available kind remains usable',async()=>{
 const f=fixture({capabilities:{IMAGE:false,DIAGRAM:true},kind:'IMAGE'});try {await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/imagen/iu);assert.match(html,/esquema|diagrama/iu);
  const start=descendants(f.view.tree,n=>n.type==='button'&&/generar|crear/iu.test(String(n.props.children)));assert.ok(start.length);assert.ok(start.every(n=>n.props.disabled));assert.equal(f.calls.filter(c=>c[0]==='start').length,0);
 }finally{f.view.close();}
});
test('queued and running jobs expose progress without private preview',async()=>{
 for(const state of ['QUEUED','RUNNING']){const f=fixture({jobs:[{...job,state}]});try {await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/espera|cola|pendiente|generando|proceso/iu);assert.doesNotMatch(html,new RegExp(assetId));}finally{f.view.close();}}
});
test('ready exposes only same-origin private preview; failed displays an error and no preview',async()=>{
 const ready=fixture();try {await ready.view.flush();const nodes=descendants(ready.view.tree,n=>['img','a'].includes(n.type)&&String(n.props.src??n.props.href).includes(assetId));assert.ok(nodes.length);for(const node of nodes)assert.match(String(node.props.src??node.props.href),new RegExp(`^/api/v1/foxy-ai/assets/${assetId}/file\\?mode=preview`));}finally{ready.view.close();}
 const failed=fixture({jobs:[{...job,state:'FAILED',errorCode:'AI_UNAVAILABLE'}],error:'No se pudo generar'});try {await failed.view.flush();const html=renderToStaticMarkup(failed.view.tree);assert.match(html,/error|no se pudo|intent/iu);assert.doesNotMatch(html,new RegExp(assetId));}finally{failed.view.close();}
});
