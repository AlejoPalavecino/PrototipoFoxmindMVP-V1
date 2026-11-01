import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { randomUUID } from 'node:crypto';
import { componentWithPorts } from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import { hookView, descendants } from '../../../../tests/agenda-ui-helpers.test.mjs';

globalThis.window={document:{},location:{replace(){}},addEventListener(){},removeEventListener(){}};
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
    '../lib/foxy-document-boundary':{getDocumentEntryPath:()=>'/foxy-ai',isFoxyDocument:()=>true},'../lib/foxy-navigation-bridge':{createFoxyNavigationBridge:()=>({install(){},dispose(){},navigate(){},replace(){}})},
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

for(const phase of ['load','poll','send']) test(`identity expiry during ${phase} clears workspace and requests sign-in once`,async()=>{
  let identityCallback,disposed=0,notified=0;const subjectId=randomUUID(),chat={...base,turns:[{id:randomUUID(),sequence:1,state:'READY',message:'Contenido privado',answer:null}]};
  const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/components/foxy-workspace-session.tsx',{
    '../lib/use-foxy-workspace':{useFoxyWorkspace:({onIdentityRequired})=>{const [active,setActive]=React.useState(true);React.useEffect(()=>()=>{disposed++;},[]);identityCallback=code=>{if(active){setActive(false);onIdentityRequired(code);}};return {state:active?{subjectId,closed:false,chat,classrooms:[],resource:null,preparation:null,history:null,confirmation:null}:null,runtime:active?{}:null,initializing:false};}},
    '../lib/use-foxy-workspace-actions':{useFoxyWorkspaceActions:({runtime})=>({actions:runtime?{chat:{},resource:{open:()=>{}}}:null,ui:runtime?{leave:null,openingResource:false}:null})},
    './foxy-workspace':{FoxyWorkspace:()=>React.createElement('section',null,'Contenido privado')},
    './foxy-resource-workspace':{FoxyResourceWorkspace:()=>null},'../lib/foxy-client':{createWebFoxyClient:()=>({})}
  });
  const view=hookView(FoxyWorkspaceSession,{subjectId,onIdentityRequired:()=>{notified++;}});
  try{await view.flush();assert.match(renderToStaticMarkup(view.tree),/Contenido privado/);identityCallback('AUTH_REQUIRED');await view.flush();
    assert.equal(notified,1);assert.doesNotMatch(renderToStaticMarkup(view.tree),/Contenido privado/);
  }finally{view.close();}assert.equal(disposed,1);
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

test('READY answer exposes edit resource even when AI generation is disabled',async()=>{
 const cid=conversation.id,turnId=randomUUID(),calls=[],state={...base,capabilities:{textGeneration:{enabled:false},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}},
  turns:[{id:turnId,sequence:1,state:'READY',purpose:'SUMMARY',message:'Hola',answer:{title:'Resumen',markdown:'Contenido',warnings:[],missingInformation:[]},errorCode:null,createdAt:'2026-01-01T00:00:00.000Z'}]};
 const controller=Object.fromEntries(['init','create','select','send','retry','loadMore','loadMoreConversations','dispose'].map(name=>[name,()=>{}]));
 const {FoxyWorkspace}=componentWithPorts('apps/web/src/components/foxy-workspace.tsx',{}),view=hookView(FoxyWorkspace,{controller,state,classrooms:[classroom],onOpenResource:(...args)=>calls.push(args)});
 try{await view.flush();const buttons=descendants(view.tree,n=>n.type==='button'&&/editar recurso/iu.test(String(n.props.children)));assert.equal(buttons.length,1);buttons[0].props.onClick();assert.deepEqual(calls,[[cid,turnId]]);}finally{view.close();}
});

test('non-READY or missing answer never offers resource editing',async()=>{
 for(const [stateName,answer] of [['QUEUED',null],['FAILED',null],['READY',null]]){const state={...base,turns:[{id:randomUUID(),sequence:1,state:stateName,purpose:'CHAT',message:'Hola',answer,errorCode:null,createdAt:'2026-01-01T00:00:00.000Z'}]};
  const f=fixture(state);try{await f.view.flush();assert.equal(descendants(f.view.tree,n=>n.type==='button'&&/editar recurso/iu.test(String(n.props.children))).length,0);}finally{f.view.close();}}
});

test('session binds one subject runtime and guarded actions to chat and material dialog',async()=>{
 const subjectId=randomUUID(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),calls=[];
 const snapshot={subjectId,closed:false,chat:{...base,current:{...conversation,id:cid}},resource:{status:'editing',resource:{id:rid}},preparation:{},history:{},confirmation:{},classrooms:[classroom],classroomsError:null};
 const runtime={resource:{},chat:{},preparation:{},history:{},confirmation:{}},actions={chat:{},resource:{open:(...args)=>calls.push(['open',...args])},preparation:{},history:{},confirmation:{}};
 const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/components/foxy-workspace-session.tsx',{
  '../lib/use-foxy-workspace':{useFoxyWorkspace:input=>{calls.push(['hook',input.subjectId]);return {state:snapshot,runtime,initializing:false};}},
  '../lib/use-foxy-workspace-actions':{useFoxyWorkspaceActions:()=>({actions,ui:{leave:null,openingResource:false,loadingDestinationId:null,error:null}})},
  './foxy-workspace':{FoxyWorkspace:props=>React.createElement('button',{onClick:()=>props.onOpenResource(cid,tid)},'Editar recurso')},
  './foxy-resource-workspace':{FoxyResourceWorkspace:()=>React.createElement('div',{'data-testid':'resource-dialog'},'Editor de material')},
  '../lib/classroom-client':{createWebClassroomClient:()=>({call:async()=>({teach:[]})})},'../lib/foxy-client':{createWebFoxyClient:()=>({})},
  '../lib/foxy-chat-controller':{createFoxyChatController:()=>({init:async()=>{},getState:()=>({...base}),dispose:()=>{}})}
 });
 const view=hookView(FoxyWorkspaceSession,{subjectId,onIdentityRequired:()=>{}});try{await view.flush();assert.ok(calls.some(c=>c[0]==='hook'&&c[1]===subjectId));
  assert.match(renderToStaticMarkup(view.tree),/Editor de material/);const workspace=descendants(view.tree,n=>typeof n.props?.onOpenResource==='function')[0];assert.ok(workspace);workspace.props.onOpenResource(cid,tid);assert.deepEqual(calls.find(c=>c[0]==='open'),['open',cid,tid]);
 }finally{view.close();}
});

test('verified teacher screen passes subject identity and isolates session by user key',async()=>{
 const id=randomUUID(),seen=[],teacher={authenticated:true,user:{id,firstName:'D',lastName:'T',emailVerified:true,accountRole:'teacher'}};
 const {FoxyScreen}=componentWithPorts('apps/web/src/components/foxy-screen.tsx',{
  'next/head':{default:({children})=>React.createElement(React.Fragment,null,children)},'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  'next/router':{useRouter:()=>({isReady:true,replace:async()=>{}})},'../../../classrooms-ui/components':{Notice:({children})=>React.createElement('div',null,children)},
  '../lib/foxy-document-boundary':{getDocumentEntryPath:()=>'/foxy-ai',isFoxyDocument:()=>true},'../lib/foxy-navigation-bridge':{createFoxyNavigationBridge:()=>({install(){},dispose(){},navigate(){},replace(){}})},
  '../lib/account-client':{createAccountClient:()=>({session:async()=>teacher})},'../lib/classroom-client':{classroomAuthHref:()=>'/sign-in'},'./account-navbar':{AccountNavbar:()=>null},
  './foxy-workspace-session':{FoxyWorkspaceSession:props=>{seen.push(props.subjectId);return React.createElement('section',null,'Foxy');}}
 });const view=hookView(FoxyScreen,{});try{await view.flush();renderToStaticMarkup(view.tree);assert.ok(seen.includes(id));const nodes=descendants(view.tree,n=>n.props?.subjectId===id);assert.ok(nodes.some(n=>n.key===id));}finally{view.close();}
});

test('session delegates both PDF URLs to the single runtime client without creating another client',async()=>{
 const subjectId=randomUUID(),pid=randomUUID(),calls=[],snapshot={subjectId,closed:false,chat:base,resource:{status:'editing',resource:{id:randomUUID()}},preparation:{},history:{},confirmation:{},classrooms:[],classroomsError:null};
 const runtime={publicationFileUrl:(id,mode)=>{calls.push(['runtimeUrl',id,mode]);return `/api/v1/foxy-ai/publications/${id}/file?mode=${mode}`;}},actions={chat:{},resource:{open:()=>{}},preparation:{},history:{},confirmation:{}};
 const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/components/foxy-workspace-session.tsx',{
  '../lib/use-foxy-workspace':{useFoxyWorkspace:()=>({state:snapshot,runtime,initializing:false})},'../lib/use-foxy-workspace-actions':{useFoxyWorkspaceActions:()=>({actions,ui:{leave:null,openingResource:false}})},
  './foxy-workspace':{FoxyWorkspace:()=>null},'./foxy-resource-workspace':{FoxyResourceWorkspace:()=>null},
  '../lib/foxy-client':{createWebFoxyClient:()=>{calls.push(['extraClient']);return {publicationFileUrl:()=>'/unexpected'};}}
 });
 const view=hookView(FoxyWorkspaceSession,{subjectId,onIdentityRequired:()=>{}});try{await view.flush();const node=descendants(view.tree,n=>typeof n.props?.publicationFileUrl==='function')[0];assert.ok(node);
  for(const mode of ['preview','download'])assert.equal(node.props.publicationFileUrl(pid,mode),`/api/v1/foxy-ai/publications/${pid}/file?mode=${mode}`);
  assert.deepEqual(calls,[['runtimeUrl',pid,'preview'],['runtimeUrl',pid,'download']]);
 }finally{view.close();}
});

test('session native navigation guard includes only active management operations',async()=>{
 const subjectId=randomUUID(),rid=randomUUID();let binding,management={pending:null,busy:false,management:{cleanupState:'PENDING'}};
 const snapshot={subjectId,closed:false,chat:base,resource:{status:'editing',resource:{id:rid},dirty:false,busy:false,pending:null},preparation:{busy:false,pending:null},history:{},confirmation:{busy:false,pending:null},management,classrooms:[],classroomsError:null};
 const runtime={getState:()=>({...snapshot,management})},actions={chat:{},resource:{open:()=>{}},preparation:{},history:{},confirmation:{},management:{},requestNavigate:()=>{}};
 const {FoxyWorkspaceSession}=componentWithPorts('apps/web/src/components/foxy-workspace-session.tsx',{
  '../lib/use-foxy-workspace':{useFoxyWorkspace:()=>({state:snapshot,runtime,initializing:false})},
  '../lib/use-foxy-workspace-actions':{useFoxyWorkspaceActions:()=>({actions,ui:{leave:null,openingResource:false}})},
  './foxy-workspace':{FoxyWorkspace:()=>null},'./foxy-resource-workspace':{FoxyResourceWorkspace:()=>null}
 });
 const view=hookView(FoxyWorkspaceSession,{subjectId,onIdentityRequired:()=>{},onRegister:value=>{binding=value;}});
 try{await view.flush();assert.ok(binding);assert.equal(binding.shouldBlock(),false,'durable cleanup alone must not block');
  for(const active of [{pending:'RETRY',busy:false},{pending:'DISCARD',busy:false},{pending:null,busy:true}]){management={...management,...active};assert.equal(binding.shouldBlock(),true,JSON.stringify(active));}}
 finally{view.close();}
});
