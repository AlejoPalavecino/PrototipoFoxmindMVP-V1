import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { componentWithPorts } from "../../../../../tests/foxmind-3d-flows-loader.test.mjs";
import { loadTsModule } from "../../../../../tests/helpers/load-ts-module.mjs";

const noop=()=>null;
function navPorts(capture) { return {
  '../../../../../shared-ui/AppNavbar.tsx':{AppNavbar:props=>{capture.push(props);return null;}},
  '../../../../shared-ui/AppNavbar.tsx':{AppNavbar:props=>{capture.push(props);return null;}},
  '../../../shared-ui/AppNavbar.tsx':{AppNavbar:props=>{capture.push(props);return null;}},
  '../../../../shared-ui/index.ts':{FoxmindBrand:noop,FoxmindIcon:noop},
  '../../features/notifications/index.ts':{Notifications:noop}, '../features/notifications/index.ts':{Notifications:noop},
  '../features/classrooms/index.ts':{ClassroomCollection:noop,ClassroomCollectionHero:noop,classroomExperienceStyles:{}},
  '../features/home/index.ts':{Home:noop}, '../../../shared-ui/EntryIcon':{EntryIcon:noop},
  'next/router':{useRouter:()=>({push(){}})}, 'next/link':{default:noop}, '../clients/classroom-client.ts':{createWebClassroomClient:()=>({})},
}; }
const session=accountRole=>({authenticated:true,user:{id:'synthetic',firstName:'Docente',lastName:'Prueba',emailVerified:true,accountRole}});

test('account navigation exposes Foxy AI only for verified teachers and navigates to the exact route',()=>{
  const capture=[], pushes=[], ports=navPorts(capture); ports['next/router']={useRouter:()=>({push:href=>pushes.push(href)})};
  const {AccountNavbar}=componentWithPorts('apps/web/src/application/navigation/account-navbar.tsx',ports);
  for(const role of ['teacher','student']) {
    renderToStaticMarkup(React.createElement(AccountNavbar,{session:session(role)})); const nav=capture.pop(), link=nav.links.find(x=>x.href==='/foxy-ai');
    if(role==='teacher'){assert.equal(link?.label,'Foxy AI');nav.onNavigate('/foxy-ai');assert.deepEqual(pushes,['/foxy-ai']);}
    else assert.equal(link,undefined);
  }
});

test('classroom navigation exposes and opens Foxy AI for teachers but not students',()=>{
  const capture=[], ports=navPorts(capture), {ClassroomsApp}=componentWithPorts("apps/web/src/application/workflows/classroom-collection/ClassroomsApp.tsx",ports);
  const prior=globalThis.window, navigations=[]; globalThis.window={location:{assign:href=>navigations.push(href)}};
  try {for(const role of ['teacher','student']) {
    renderToStaticMarkup(React.createElement(ClassroomsApp,{api:{},displayName:'Prueba',accountRole:role,initialPresentation:'home'}));
    const nav=capture.pop(),link=nav.links.find(x=>x.href==='/foxy-ai');
    if(role==='teacher'){assert.equal(link?.label,'Foxy AI');nav.onNavigate('/foxy-ai');assert.deepEqual(navigations,['/foxy-ai']);}
    else assert.equal(link,undefined);
  }} finally {if(prior===undefined) delete globalThis.window;else globalThis.window=prior;}
});

test('login continuation accepts only exact local Foxy route and rejects redirect variants',()=>{
  const {classroomDestination,classroomAuthHref}=({...loadTsModule("apps/web/src/application/clients/classroom-client.ts"),classroomDestination:loadTsModule('apps/web/src/application/navigation/destinations.ts').safeDestination,classroomAuthHref:loadTsModule('apps/web/src/application/navigation/destinations.ts').authHref,classroomHomeHref:loadTsModule('apps/web/src/application/navigation/destinations.ts').classroomHomeHref,classroomHomeDestination:loadTsModule('apps/web/src/application/navigation/destinations.ts').classroomHomeDestination});
  assert.equal(classroomDestination('/foxy-ai'),'/foxy-ai'); assert.equal(classroomAuthHref('sign-in','/foxy-ai'),'/sign-in?next=%2Ffoxy-ai');
  for(const unsafe of ['//evil.test/foxy-ai','https://evil.test/foxy-ai','/foxy-ai?next=https://evil.test','/foxy-ai/../account','/foxy-ai#x','/foxy-ai%2f..'])
    assert.equal(classroomDestination(unsafe),null,unsafe);
});

test('Foxy route exports its dedicated screen', async()=>{
  const {existsSync,readFileSync}=await import('node:fs');
  const page='apps/web/pages/foxy-ai.tsx',screen="apps/web/src/screens/foxy-screen.tsx";
  assert.equal(existsSync(page),true);assert.equal(existsSync(screen),true);
  assert.match(readFileSync(page,'utf8'),/foxy-screen/u);
});
