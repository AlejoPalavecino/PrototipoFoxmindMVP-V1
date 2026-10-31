import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { randomUUID } from 'node:crypto';
import { componentWithPorts } from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from '../../../../tests/agenda-ui-helpers.test.mjs';

const classroom={id:randomUUID(),name:'Biología'}, conversation={id:randomUUID(),title:'Repaso',context:{kind:'GENERAL'},revision:'0'};
const base={capabilities:{textGeneration:{enabled:true},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}},conversations:[conversation],
  nextConversationCursor:null,current:conversation,turns:[],activeTurn:null,nextAfterSequence:null,pending:null,error:null,busy:false};
function fixture(state=base){
  const calls=[],controller=Object.fromEntries(['init','create','select','send','retry','loadMore','loadMoreConversations','dispose'].map(name=>[name,(...args)=>calls.push({name,args})]));
  const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{});
  assert.equal(typeof FoxyWorkspace,'function');return {controller,calls,view:hookView(FoxyWorkspace,{controller,state,classrooms:[classroom]})};
}

test('teacher workspace offers conversations, explicit general or classroom creation and message composer',async()=>{
  const f=fixture();try {await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
    assert.match(html,/Repaso/iu);assert.match(html,/General/iu);assert.match(html,/Biología/iu);assert.match(html,/propósito|tipo de ayuda/iu);
    assert.match(html,/enviar/iu);assert.ok(descendants(f.view.tree,n=>n.type==='textarea').length>0);
    const select=descendants(f.view.tree,n=>n.type==='button' && String(n.props.children).includes('Repaso'))[0];assert.ok(select);select.props.onClick();
    assert.deepEqual(f.calls.find(c=>c.name==='select')?.args,[conversation.id]);
  }finally{f.view.close();}
});

test('workspace shows queued and failure with manual retry, and renders model text without executable HTML',async()=>{
  const malicious='<img src=x onerror=alert(1)>',state={...base,turns:[{id:randomUUID(),sequence:1,state:'READY',purpose:'CHAT',message:'Hola',
    answer:{title:'Respuesta',markdown:malicious,warnings:[],missingInformation:[]},errorCode:null,createdAt:'2026-01-01T00:00:00.000Z'}],
    activeTurn:{id:randomUUID(),sequence:2,state:'QUEUED'},error:'No pudimos confirmar el envío',pending:{requestId:randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:{topicIds:[],sourceIds:[]}}};
  const f=fixture(state);try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
    assert.match(html,/&lt;img/iu);assert.doesNotMatch(html,/<img[^>]*onerror/iu);assert.match(html,/cola|pendiente|procesando/iu);
    assert.match(html,/No pudimos confirmar/iu);const retry=descendants(f.view.tree,n=>n.type==='button' && /reintentar/i.test(String(n.props.children)))[0];
    assert.ok(retry);retry.props.onClick();assert.equal(f.calls.filter(c=>c.name==='retry').length,1);
  }finally{f.view.close();}
});

test('student is denied before workspace or Foxy client is constructed',async()=>{
  let workspaces=0,clientCalls=0;const student={authenticated:true,user:{id:'student',firstName:'S',lastName:'T',emailVerified:true,accountRole:'student'}};
  const {FoxyScreen}=componentWithPorts('apps/web/src/components/foxy-screen.tsx',{
    'next/head':{default:({children})=>React.createElement(React.Fragment,null,children)},'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
    'next/router':{useRouter:()=>({isReady:true,replace:async()=>{}})},'../../../classrooms-ui/components':{Notice:({children})=>React.createElement('div',null,children)},
    '../lib/account-client':{createAccountClient:()=>({session:async()=>student})},'../lib/classroom-client':{classroomAuthHref:()=>'/sign-in'},
    './account-navbar':{AccountNavbar:()=>null},'./foxy-workspace':{FoxyWorkspace:()=>{workspaces++;return null;}},
    '../lib/foxy-client':{createWebFoxyClient:()=>{clientCalls++;return {};}}
  });
  const view=hookView(FoxyScreen,{});try {await view.flush();assert.match(renderToStaticMarkup(view.tree),/disponible para docentes/iu);
    assert.equal(workspaces,0);assert.equal(clientCalls,0);
  }finally{view.close();}
});

test('invalid blank or more than 5000 codepoints remains editable and never sends',async()=>{
  for(const text of ['   ','😀'.repeat(5001)]) {
    const f=fixture();try {await f.view.flush();let area=descendants(f.view.tree,n=>n.type==='textarea')[0];
      area.props.onChange({target:{value:text}});await f.view.flush();
      const form=descendants(f.view.tree,n=>n.type==='form' && descendants(n,child=>child.type==='textarea').length>0)[0];
      form.props.onSubmit({preventDefault(){}});await f.view.flush();
      assert.equal(f.calls.filter(c=>c.name==='send').length,0);area=descendants(f.view.tree,n=>n.type==='textarea')[0];assert.equal(area.props.value,text);
      assert.equal(f.calls.filter(c=>c.name==='retry').length,0);
    }finally{f.view.close();}
  }
});

for(const phase of ['load','poll','send']) test(`identity expiry during ${phase} clears workspace, aborts and requests sign-in once`,async()=>{
  let identityCallback,disposed=0,notified=0;const state={...base,turns:[{id:randomUUID(),sequence:1,state:'READY',message:'Contenido privado',answer:null}]};
  const controller={getState:()=>state,init:async()=>{},dispose:()=>{disposed++;}};
  const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/components/foxy-workspace-session.tsx',{
    '../lib/classroom-client':{createWebClassroomClient:()=>({call:async()=>({teach:[]})})},
    '../lib/foxy-client':{createWebFoxyClient:(_fetch,onIdentityRequired)=>{identityCallback=onIdentityRequired;return {};}},
    '../lib/foxy-chat-controller':{createFoxyChatController:()=>controller},
    './foxy-workspace':{FoxyWorkspace:()=>React.createElement('section',null,'Contenido privado')}
  });
  const view=hookView(FoxyWorkspaceSession,{onIdentityRequired:()=>{notified++;}});
  try {await view.flush();assert.match(renderToStaticMarkup(view.tree),/Contenido privado/);assert.equal(typeof identityCallback,'function');
    identityCallback('AUTH_REQUIRED');identityCallback('AUTH_REQUIRED');await view.flush();
    assert.equal(notified,1);assert.equal(disposed,1);assert.doesNotMatch(renderToStaticMarkup(view.tree),/Contenido privado/);
  }finally{view.close();}
});

test('prohibited C0 and C1 control characters remain editable and never send',async()=>{
  for(const text of ['Hola\u0001mundo','Hola\u0085mundo','Hola\u007fmundo']) {
    const f=fixture();try {await f.view.flush();let area=descendants(f.view.tree,n=>n.type==='textarea')[0];
      area.props.onChange({target:{value:text}});await f.view.flush();
      const form=descendants(f.view.tree,n=>n.type==='form' && descendants(n,child=>child.type==='textarea').length>0)[0];
      form.props.onSubmit({preventDefault(){}});await f.view.flush();
      assert.equal(f.calls.filter(c=>c.name==='send').length,0);area=descendants(f.view.tree,n=>n.type==='textarea')[0];assert.equal(area.props.value,text);
    }finally{f.view.close();}
  }
});

test('definitive rejected send keeps exact text available for correction',async()=>{
  const f=fixture();try {await f.view.flush();f.controller.send=async(...args)=>{f.calls.push({name:'send',args});return 'invalid';};
    const text='Texto que necesita corrección';let area=descendants(f.view.tree,n=>n.type==='textarea')[0];area.props.onChange({target:{value:text}});await f.view.flush();
    const form=descendants(f.view.tree,n=>n.type==='form' && descendants(n,child=>child.type==='textarea').length>0)[0];form.props.onSubmit({preventDefault(){}});await f.view.flush();
    area=descendants(f.view.tree,n=>n.type==='textarea')[0];assert.equal(area.props.value,text);assert.equal(f.calls.filter(c=>c.name==='send').length,1);
  }finally{f.view.close();}
});
