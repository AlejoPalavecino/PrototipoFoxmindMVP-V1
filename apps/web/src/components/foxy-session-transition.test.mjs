import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { componentWithPorts } from '../../../../tests/foxmind-3d-flows-loader.test.mjs';
import { deferred } from '../../../../tests/agenda-ui-helpers.test.mjs';

function hookView(Component) {
  const slots=[], cleanups=new Map(); let cursor=0,dirty=true,tree,effects=[];
  const same=(a,b)=>a && b && a.length===b.length && a.every((x,i)=>Object.is(x,b[i]));
  const hooks={useState(initial){const i=cursor++;if(!slots[i])slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(!Object.is(value,slots[i].value)){slots[i].value=value;dirty=true;}}];},
    useCallback(value,deps){const i=cursor++;if(!same(slots[i]?.deps,deps))slots[i]={value,deps};return slots[i].value;},
    useEffect(effect,deps){const i=cursor++;if(!same(slots[i]?.deps,deps)){slots[i]={deps};effects.push([i,effect]);}}};
  function render(){cursor=0;dirty=false;const internals=React.__CLIENT_INTERNALS_DO_NOT_USE_OR_WARN_USERS_THEY_CANNOT_UPGRADE,prior=internals.H;internals.H=hooks;try{tree=Component();}finally{internals.H=prior;}const pending=effects;effects=[];for(const [i,effect] of pending){cleanups.get(i)?.();cleanups.set(i,effect());}}
  return {get tree(){return tree;},force(){dirty=true;},async flush(){for(let i=0;i<12;i++){if(dirty)render();await Promise.resolve();}},close(){for(const cleanup of cleanups.values())cleanup?.();}};
}

const teacher={authenticated:true,user:{id:'teacher',firstName:'Docente',lastName:'Prueba',emailVerified:true,accountRole:'teacher'}};
const student={authenticated:true,user:{id:'student',firstName:'Estudiante',lastName:'Prueba',emailVerified:true,accountRole:'student'}};
const noop=()=>null;
function setup(session) {
  let currentRouter={isReady:true,replace:async()=>{}}; const requests=[],pending=[];
  const {FoxyScreen}=componentWithPorts('apps/web/src/components/foxy-screen.tsx',{
    'next/head':{default:({children})=>React.createElement(React.Fragment,null,children)},
    'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
    'next/router':{useRouter:()=>currentRouter},
    '../../../classrooms-ui/components':{Notice:({children})=>React.createElement('div',null,children)},
    '../lib/account-client':{createAccountClient:()=>({session:()=>{requests.push('session');const d=deferred();pending.push(d);return d.promise;}})},
    '../lib/classroom-client':{classroomAuthHref:()=>'/sign-in?next=%2Ffoxy-ai'},
    './account-navbar':{AccountNavbar:props=>React.createElement('nav',{'data-role':props.session.user.accountRole},'Docente')},
    '../lib/foxy-client':{createWebFoxyClient:()=>{requests.push('foxy');return {};}}
  });
  const view=hookView(FoxyScreen,{});
  return {view,pending,requests,reroute:()=>{currentRouter={isReady:true,replace:async()=>{}};},session};
}
test('revalidation from teacher to student removes old teacher navigation and content',async()=>{
  const f=setup();try {
    await f.view.flush();f.pending[0].resolve(teacher);await f.view.flush();assert.match(renderToStaticMarkup(f.view.tree),/data-role="teacher"/);
    f.reroute();f.view.force();await f.view.flush();f.pending.at(-1).resolve(student);await f.view.flush();
    const html=renderToStaticMarkup(f.view.tree);assert.doesNotMatch(html,/data-role="teacher"/);assert.match(html,/disponible para docentes/i);
    assert.equal(f.requests.includes('foxy'),false);
  }finally{f.view.close();}
});

test('guest revalidation clears prior teacher UI and cannot request Foxy data',async()=>{
  const f=setup();try {await f.view.flush();f.pending[0].resolve(teacher);await f.view.flush();
    f.reroute();f.view.force();await f.view.flush();f.pending.at(-1).resolve({authenticated:false});await f.view.flush();
    assert.doesNotMatch(renderToStaticMarkup(f.view.tree),/data-role="teacher"/);assert.equal(f.requests.includes('foxy'),false);
  }finally{f.view.close();}
});

test('late older teacher session cannot overwrite a newer student denial',async()=>{
  const f=setup();try {await f.view.flush();
    f.reroute();f.view.force();await f.view.flush();assert.equal(f.pending.length,2);
    f.pending[1].resolve(student);await f.view.flush();f.pending[0].resolve(teacher);await f.view.flush();
    const html=renderToStaticMarkup(f.view.tree);assert.doesNotMatch(html,/data-role="teacher"/);assert.match(html,/disponible para docentes/i);
    assert.equal(f.requests.includes('foxy'),false);
  }finally{f.view.close();}
});
