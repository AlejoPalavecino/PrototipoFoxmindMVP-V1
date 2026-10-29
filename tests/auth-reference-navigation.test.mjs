import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';

const noop=()=>null;
const {AccountNavbar}=componentWithPorts('apps/web/src/components/account-navbar.tsx',{
  'next/router':{useRouter:()=>({push(){assert.fail('Rendering navigation must not navigate');}})},
  'next/link':{default:({children,...props})=>React.createElement('a',props,children)},
  '../lib/classroom-client':{createWebClassroomClient:()=>({})},
  '../../../shared-ui/AppNavbar':{AppNavbar:noop},
  '../../../shared-ui/index':{FoxmindBrand:noop,FoxmindIcon:noop},
  '../../../classrooms-ui/Notifications':{Notifications:noop},
});
const render=props=>renderToStaticMarkup(React.createElement(AccountNavbar,{minimal:true,...props}));
const links=html=>[...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map(([,attributes,body])=>({
  href:attributes.match(/href="([^"]*)"/)?.[1].replaceAll('&amp;','&'),
  text:body.replace(/<[^>]*>/g,'').trim(),
}));

for(const [view,label,prop,target] of [
  ['sign-in','Crear cuenta','registerHref','/register'],
  ['register','Iniciar sesión','signInHref','/sign-in'],
])test(`Minimal ${view} offers the opposite auth view with the exact supplied continuation`,()=>{
  const next='/mis-aulas?invitacion=a1111111-1111-4111-8111-111111111111';
  const href=`${target}?next=${encodeURIComponent(next)}`;
  const found=links(render({view,session:{authenticated:false},[prop]:href})).filter(link=>link.text===label);
  assert.deepEqual(found,[{href,text:label}]);
});

test('Authenticated minimal header preserves account actions without anonymous registration prompts',()=>{
  const session={authenticated:true,user:{id:'synthetic',firstName:'Alex',lastName:'Prueba',email:'alex@example.test',emailVerified:true}};
  for(const view of ['sign-in','register']){
    const html=render({view,session,accountActions:React.createElement('button',{'data-session-action':true},'Cerrar sesión')});
    assert.match(html,/data-session-action="true"/);
    assert.equal(links(html).some(link=>['Crear cuenta','Iniciar sesión'].includes(link.text)),false);
    assert.ok(links(html).some(link=>link.href==='/inicio'));
  }
});
