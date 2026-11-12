import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { randomUUID } from 'node:crypto';
import { componentWithPorts } from "../../../../../../tests/foxmind-3d-flows-loader.test.mjs";
import { hookView,descendants } from "../../../../../../tests/agenda-ui-helpers.test.mjs";

const cid=randomUUID(),room=randomUUID(),topic=randomUUID(),tid=randomUUID(),plan=`plan:${randomUUID()}`,material=`material:${randomUUID()}`;
const context={kind:'CLASSROOM',classroomId:room},conversation={id:cid,title:'Biología',context,revision:'0'};
const state={capabilities:{textGeneration:{enabled:true}},conversations:[conversation],current:conversation,turns:[],busy:false,pending:null,error:null,activeTurn:null,nextAfterSequence:null,nextConversationCursor:null,
  curriculum:{context,classroomRevision:'1',classroomTitle:'Biología',archived:false,canGenerate:true,units:[{id:randomUUID(),name:'Unidad',position:0,topics:[
    {id:topic,name:'Fotosíntesis',status:'TAUGHT',position:0},{id:randomUUID(),name:'Energía',status:'NEXT',position:1},{id:randomUUID(),name:'Futuro',status:'PENDING',position:2}]}]},
  sources:{PLAN:{items:[{sourceId:plan,kind:'PLAN',title:'Plan versión 1',available:true,documentCount:1,planVersion:1}],next:null},
    MATERIAL:{items:[{sourceId:material,kind:'MATERIAL',title:'Libro pendiente',available:false,reason:'FILE_NOT_READY',documentCount:1}],next:null},ACTIVITY:{items:[],next:null}},
  selection:{topicIds:[],sourceIds:[]},citations:{}};
function fixture(value=state){const calls=[],controller=Object.fromEntries(['select','send','create','retry','loadMore','loadMoreConversations','selectTopic','selectSource','loadSources','loadCitations'].map(name=>[name,(...args)=>calls.push({name,args})]));
  const {FoxyWorkspace}=componentWithPorts("apps/web/src/features/foxy/ui/foxy-workspace.tsx",{});return {calls,view:hookView(FoxyWorkspace,{controller,state:value,classrooms:[{id:room,name:'Biología'}]})};}

test('classroom shows teaching states, historical plans and unavailable library sources',async()=>{
  const f=fixture();try{await f.view.flush();
    descendants(f.view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes('0 temas'))[0].props.onClick();
    await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
    for(const text of ['Fotosíntesis','Energía','Futuro','Plan versión 1','Libro pendiente'])assert.ok(html.includes(text),text);
    assert.match(html,/tratado|enseñado/iu);assert.match(html,/próximo/iu);assert.match(html,/pendiente/iu);
    const inputs=descendants(f.view.tree,n=>n.type==='input'&&n.props.type==='checkbox');assert.ok(inputs.length>=3);
    assert.ok(inputs.some(n=>n.props.disabled),'unavailable source cannot be selected');
  }finally{f.view.close();}
});

test('ready citations render only safe local links for available files',async()=>{
  const href=`/api/v1/foxy-ai/conversations/${cid}/turns/${tid}/citations/c1/file?mode=preview`;
  const value={...state,turns:[{id:tid,sequence:1,state:'READY',message:'Hola',answer:{title:'R',markdown:'<script>alert(1)</script>',warnings:[],missingInformation:[]}}],
    citations:{[tid]:[{id:'c1',sourceTitle:'Plan',sourceKind:'PLAN',documentTitle:'plan.pdf',page:1,availability:'AVAILABLE',href},
      {id:'c2',sourceTitle:'Texto',sourceKind:'ACTIVITY',documentTitle:null,page:null,availability:'TEXT_ONLY',href:null},
      {id:'c3',sourceTitle:'Retirado',sourceKind:'MATERIAL',documentTitle:null,page:null,availability:'UNAVAILABLE',href:null}]}};
  const f=fixture(value);try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
    assert.ok(html.includes('plan.pdf'));assert.ok(html.includes('Texto'));assert.ok(html.includes('Retirado'));assert.ok(html.includes(href.replaceAll('&','&amp;')));
    assert.doesNotMatch(html,/<script>/iu);assert.match(html,/&lt;script/iu);
    assert.equal((html.match(/\/citations\/c\d+\/file/gu)??[]).length,1);
  }finally{f.view.close();}
});

test('active classroom heading names the current classroom and general view never retains it',async()=>{
  const classroomState={...state,current:{...conversation,title:'Consulta neutral'},curriculum:{...state.curriculum,classroomTitle:'Biología sintética'}};
  const classroom=fixture(classroomState);try{await classroom.view.flush();const paragraphs=descendants(classroom.view.tree,n=>n.type==='p').map(n=>renderToStaticMarkup(n));
    assert.ok(paragraphs.some(text=>/Biología sintética/u.test(text)),'active context must name classroom, not infer it from another selector');
  }finally{classroom.view.close();}
  const generalState={...state,current:{...conversation,title:'Consulta general',context:{kind:'GENERAL'}},curriculum:null};
  const general=fixture(generalState);try{await general.view.flush();const html=renderToStaticMarkup(general.view.tree);
    assert.match(html,/contexto general/iu);assert.equal(html.includes('Biología sintética'),false);
  }finally{general.view.close();}
});
