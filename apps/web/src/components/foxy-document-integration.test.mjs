import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {readFileSync} from 'node:fs';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import {componentWithPorts} from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import {hookView} from '../../../../tests/agenda-ui-helpers.test.mjs';

test('_app captures the initial document path before rendering any page and guards SSR',()=>{
 const source=readFileSync('apps/web/pages/_app.tsx','utf8');assert.match(source,/foxy-document-boundary/);assert.match(source,/captureDocumentEntry/);
 assert.match(source,/typeof\s+window/);assert.ok(source.indexOf('captureDocumentEntry(')<source.indexOf('function App('));
});

for(const initial of ['/inicio',null])test(`screen gates editor for non-Foxy document entry ${initial}`,async()=>{
 const original=globalThis.window;globalThis.window={document:{},location:{pathname:'/foxy-ai',replace:()=>{}}};let sessionCalls=0,workspaces=0,replaces=[];
 try{const teacher={authenticated:true,user:{id:randomUUID(),firstName:'D',lastName:'T',emailVerified:true,accountRole:'teacher'}},router={isReady:true,replace:async()=>{}};
  const {FoxyScreen}=componentWithPorts('apps/web/src/components/foxy-screen.tsx',{
   'next/head':{default:({children})=>React.createElement(React.Fragment,null,children)},'next/link':{default:({children,...props})=>React.createElement('a',props,children)},'next/router':{useRouter:()=>router},
   '../../../classrooms-ui/components':{Notice:({children})=>React.createElement('div',null,children)},'../features/identity/index.ts':{createAccountClient:()=>({session:async()=>{sessionCalls++;return teacher;}})},
   '../lib/classroom-client':{classroomAuthHref:()=>'/sign-in'},'../application/navigation/account-navbar.tsx':{AccountNavbar:()=>null},'./foxy-workspace-session':{FoxyWorkspaceSession:()=>{workspaces++;return React.createElement('div',null,'PRIVATE EDITOR');}},
   '../lib/foxy-document-boundary':{getDocumentEntryPath:()=>initial,isFoxyDocument:()=>false},'../lib/foxy-navigation-bridge':{createFoxyNavigationBridge:()=>({install(){},replace:href=>replaces.push(href),navigate(){},dispose(){}})}
  });const view=hookView(FoxyScreen,{});try{await view.flush();const html=renderToStaticMarkup(view.tree);assert.doesNotMatch(html,/PRIVATE EDITOR/);assert.equal(workspaces,0);assert.equal(sessionCalls,0);
   assert.deepEqual(replaces,initial?['/foxy-ai']:[]);
  }finally{view.close();}
 }finally{globalThis.window=original;}
});

function screenFixture({session,entry='/foxy-ai',bridgeFactory}={}){
 const previous=globalThis.window,listeners=new Map(),calls=[];globalThis.window={document:{},location:{pathname:'/foxy-ai',replace(){}},addEventListener:(name,fn)=>listeners.set(name,fn),removeEventListener:(name)=>listeners.delete(name)};
 const router={isReady:true,replace:async()=>calls.push('router.replace')};
 const {FoxyScreen}=componentWithPorts('apps/web/src/components/foxy-screen.tsx',{
  'next/head':{default:({children})=>React.createElement(React.Fragment,null,children)},'next/link':{default:({children,...props})=>{calls.push(['NextLink',props.href]);return React.createElement('a',props,children);}},'next/router':{useRouter:()=>router},
  '../../../classrooms-ui/components':{Notice:({children})=>React.createElement('div',null,children)},'../features/identity/index.ts':{createAccountClient:()=>({session})},
  '../lib/classroom-client':{classroomAuthHref:()=>'/sign-in'},'../application/navigation/account-navbar.tsx':{AccountNavbar:()=>null},'./foxy-workspace-session':{FoxyWorkspaceSession:()=>React.createElement('div',null,'PRIVATE EDITOR')},
  '../lib/foxy-document-boundary':{getDocumentEntryPath:()=>entry,isFoxyDocument:()=>entry==='/foxy-ai'},
  '../lib/foxy-navigation-bridge':{createFoxyNavigationBridge:bridgeFactory??(options=>({install(){globalThis.window.addEventListener('pagehide',options.hidePresentation);},replace(){},navigate(){},dispose(){}}))}
 });const view=hookView(FoxyScreen,{});return {view,calls,listeners,close(){view.close();globalThis.window=previous;}};
}

test('student or session-error return CTA uses native document navigation, not Next SPA link',async()=>{
 const f=screenFixture({session:async()=>({authenticated:true,user:{id:randomUUID(),emailVerified:true,accountRole:'student'}})});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/disponible para docentes/iu);assert.equal(f.calls.some(x=>Array.isArray(x)&&x[0]==='NextLink'&&x[1]==='/inicio'),false);
 }finally{f.close();}
});

test('pagehide before pending session resolves never mounts private editor',async()=>{
 let resolve;const gate=new Promise(r=>resolve=r),f=screenFixture({session:()=>gate});
 try{await f.view.flush();assert.equal(typeof f.listeners.get('pagehide'),'function');f.listeners.get('pagehide')({persisted:true});
  resolve({authenticated:true,user:{id:randomUUID(),emailVerified:true,accountRole:'teacher'}});await f.view.flush();assert.doesNotMatch(renderToStaticMarkup(f.view.tree),/PRIVATE EDITOR/);
 }finally{f.close();}
});

test('failed bfcache replacement exposes a safe error outside hidden private presentation',async()=>{
 let ports;const f=screenFixture({session:async()=>({authenticated:true,user:{id:randomUUID(),emailVerified:true,accountRole:'teacher'}}),bridgeFactory:options=>{ports=options;return {install(){},replace(){},navigate(){},dispose(){}};}});
 try{await f.view.flush();const root=f.view.tree.props.ref;assert.ok(root);const element={hidden:false};root.current=element;ports.hidePresentation();assert.equal(element.hidden,true);ports.onError();await f.view.flush();
  assert.match(renderToStaticMarkup(f.view.tree),/No pudimos abrir Foxy AI/iu);assert.equal(element.hidden,false,'safe failure must be visible after failed replace');assert.doesNotMatch(renderToStaticMarkup(f.view.tree),/PRIVATE EDITOR/);
 }finally{f.close();}
});
