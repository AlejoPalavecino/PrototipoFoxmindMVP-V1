import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import {componentWithPorts} from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants} from '../../../../tests/agenda-ui-helpers.test.mjs';
const assetId=randomUUID(),classroomId=randomUUID(),publicationId=randomUUID();
function fixture(changes={}){const calls=[],record=name=>(...args)=>calls.push([name,...args]);const state={assetId,assetRevision:'2',classroomId,title:'Imagen revisada',publication:null,inspection:null,reviewed:false,busy:false,pending:null,error:null,receipt:null,...changes};
 const actions={setClassroomId:record('classroom'),setTitle:record('title'),prepare:record('prepare'),retry:record('retry'),refresh:record('refresh'),review:record('review'),setReviewed:record('reviewed'),confirm:record('confirm')};
 const {FoxyVisualPublicationPanel}=componentWithPorts('apps/web/src/components/foxy-visual-publication-panel.tsx',{});const view=hookView(FoxyVisualPublicationPanel,{state,actions,classrooms:[{id:classroomId,name:'Biología',role:'teacher',archived:false}],publicationFileUrl:(id,mode)=>`/api/v1/foxy-ai/publications/${id}/file?mode=${mode}`});return {view,calls};}
test('visual publication allows choosing destination and title before preparing without automatic confirm',async()=>{const f=fixture();try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/Biología/iu);assert.match(html,/preparar/iu);assert.ok(descendants(f.view.tree,n=>n.type==='input'&&n.props.value==='Imagen revisada').length);assert.equal(f.calls.filter(c=>c[0]==='confirm').length,0);}finally{f.view.close();}});
test('READY offers private preview and requires explicit checked confirmation',async()=>{const publication={id:publicationId,sourceKind:'VISUAL',assetId,assetRevision:'2',classroomId,title:'Imagen revisada',state:'READY',revision:'3'},inspection={publication,classroomRevision:'4',classroomArchived:false,errorCode:null};
 const f=fixture({publication,inspection});try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/revis|vista previa/iu);assert.ok(descendants(f.view.tree,n=>['a','img'].includes(n.type)&&String(n.props.href??n.props.src).startsWith(`/api/v1/foxy-ai/publications/${publicationId}/file?mode=preview`)).length);
  const checkbox=descendants(f.view.tree,n=>n.type==='input'&&n.props.type==='checkbox');assert.ok(checkbox.length);assert.equal(checkbox[0].props.checked,false);const confirm=descendants(f.view.tree,n=>n.type==='button'&&/publicar|confirmar/iu.test(String(n.props.children)));assert.ok(confirm.length);assert.ok(confirm.every(n=>n.props.disabled));assert.equal(f.calls.filter(c=>c[0]==='confirm').length,0);
 }finally{f.view.close();}});
test('uncertain publication exposes retry and does not claim student visibility',async()=>{const f=fixture({pending:'PREPARE',error:'No pudimos confirmar la solicitud'});try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/reintentar/iu);assert.doesNotMatch(html,/publicado en la biblioteca/iu);assert.equal(f.calls.filter(c=>c[0]==='confirm').length,0);}finally{f.view.close();}});

test('unit and topic selectors are labelled and expose the classroom hierarchy',async()=>{
 const unit=randomUUID(),topic=randomUUID();const f=fixture({destination:{id:classroomId,name:'Biología',units:[{id:unit,name:'Unidad uno',topics:[{id:topic,name:'Tema uno'}]}]},unitId:unit,topicId:topic});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/<label[^>]*>\s*Unidad[\s\S]*?<select/iu);assert.match(html,/<label[^>]*>\s*Tema[\s\S]*?<select/iu);assert.match(html,/Unidad uno/);assert.match(html,/Tema uno/);}finally{f.view.close();}
});