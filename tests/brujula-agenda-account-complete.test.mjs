import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';
import {loadTsModule} from './helpers/load-ts-module.mjs';import {hookView,descendants,deferred} from './agenda-ui-helpers.test.mjs';
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n?.props?.children??'');
test('after-day query reads its entire selected future range with pagination, independently from visible calendar',async()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();const calls=[];
 const api={list:async(range,cursor)=>{calls.push({range,cursor});return {items:[],nextCursor:!cursor&&range.startDate==='2026-11-06'?'next':null};},upcoming:async()=>({items:[]})};
 const {useAgenda}=loadTsModule('apps/web/src/features/agenda/calendar/useAgenda.ts');function Harness(){return React.createElement('output',{state:useAgenda(api,{startDate:'2026-11-05',endDateExclusive:'2026-11-06',timeZone:'UTC'},true,'2026-11-05')});}
 const view=hookView(Harness,{});try{await view.flush();assert.ok(view.tree.props.state.afterDay);assert.deepEqual(calls.filter(c=>c.range.startDate==='2026-11-06').map(c=>({range:c.range,cursor:c.cursor})),[{range:{startDate:'2026-11-06',endDateExclusive:'2026-12-07',timeZone:'UTC'},cursor:null},{range:{startDate:'2026-11-06',endDateExclusive:'2026-12-07',timeZone:'UTC'},cursor:'next'}]);}finally{view.close();globalThis.window=previous;}
});
test('Mi perfil is an accessible direct link for both account roles',()=>{
 const {ShellAccount}=loadTsModule('apps/shared-ui/NavbarParts.tsx');
 for(const [accountRole,roleLabel] of [['teacher','Docente'],['student','Estudiante']]){
  const calls=[];
  const shell=ShellAccount({privateShell:true,homeNavigation:true,displayName:'Nombre Real',accountEmail:'synthetic@example.test',accountRole,follow:(...args)=>calls.push(args)});
  const links=descendants(shell,n=>n.type==='a');
  assert.equal(links.length,1);
  assert.equal(links[0].props.href,'/profile');
  assert.equal(links[0].props['aria-label'],'Mi perfil de Nombre Real');
  assert.match(text(links[0]),new RegExp(roleLabel));
  assert.doesNotMatch(text(shell),/synthetic@example.test/);
  assert.equal(links[0].props['aria-haspopup'],undefined);
  assert.equal(calls.length,0);
 }
});

test('after-day merges only queried future personal occurrences and deadlines, in date order with authorized destinations',()=>{
 const {AgendaAfterDay,afterDayEntries}=loadTsModule('apps/web/src/features/agenda/calendar/AgendaAfterDay.tsx');const opened=[],edited=[];
 const event=(id,date)=>({kind:'PRIVATE_EVENT',occurrenceId:id,event:{id,title:id,category:'CLASS',color:'PURPLE',schedule:{kind:'ALL_DAY',startDate:date,endDateExclusive:date==='2026-11-05'?'2026-11-06':'2026-11-08'}},startDate:date,endDateExclusive:date==='2026-11-05'?'2026-11-06':'2026-11-08',startAt:null,endAt:null});
 const deadline={kind:'ACADEMIC_DEADLINE',id:'deadline',title:'Plazo',classroomName:'Aula',deadlineAt:'2026-11-06T15:00:00Z',target:{classroomId:'room',activityId:'activity'}};
 const items=[event('old','2026-11-05'),event('later','2026-11-07'),deadline,event('outside','2026-12-08'),deadline];
 assert.deepEqual(afterDayEntries(items,'2026-11-05','UTC').map(e=>e.item.kind==='PRIVATE_EVENT'?e.item.event.id:e.item.id),['deadline','later']);
 const tree=AgendaAfterDay({items,day:'2026-11-05',zone:'UTC',busy:false,loading:false,error:'',onRetry(){},onEdit:e=>edited.push(e),onOpen:t=>opened.push(t)});
 const buttons=descendants(tree,n=>n.type==='button');buttons[0].props.onClick();buttons[1].props.onClick();assert.deepEqual(opened,[deadline.target]);assert.equal(edited[0].id,'later');
 const loading=AgendaAfterDay({items,day:'2026-11-05',zone:'UTC',busy:false,loading:true,error:'',onRetry(){},onEdit(){},onOpen(){}});assert.equal(descendants(loading,n=>n.type==='button').length,0);assert.doesNotMatch(text(loading),/Plazo|later/);
});
test('Mi perfil follows the real callback from the drawer and offers Configuración on arrival',async()=>{
 const {AppNavbar}=loadTsModule('apps/shared-ui/AppNavbar.tsx');
 const previous=globalThis.window;globalThis.window=new EventTarget();const calls=[];
 const view=hookView(AppNavbar,{logoHref:'/inicio',links:[{href:'/mis-aulas',label:'Mis aulas'}],displayName:'Nombre',onNavigate:href=>calls.push(href)});
 try{
  await view.flush();
  const open=descendants(view.tree,n=>n.type==='button'&&n.props['aria-controls']==='fm3d-navigation-drawer')[0];
  assert.ok(open);open.props.onClick();await view.flush();
  const drawer=descendants(view.tree,n=>n.type?.name==='NavbarDrawer')[0];assert.ok(drawer);
  const account=descendants(drawer,n=>n.type?.name==='ShellAccount')[0];assert.ok(account);
  const profile=descendants(account.type(account.props),n=>n.type==='a'&&n.props.href==='/profile')[0];
  assert.ok(profile);let prevented=0;
  profile.props.onClick({button:0,preventDefault(){prevented++;}});
  await view.flush();
  assert.deepEqual(calls,['/profile']);assert.equal(prevented,1);
  assert.equal(descendants(view.tree,n=>n.type?.name==='NavbarDrawer').length,0);
 }finally{view.close();globalThis.window=previous;}
 const {AccountProfile}=loadTsModule('apps/web/src/features/identity/profile/account-profile.tsx');
 const signOut=React.createElement('button',{onClick:()=>calls.push('logout')},'Cerrar sesión');
 const profile=hookView(AccountProfile,{profile:{id:'account',firstName:'Nombre',lastName:'Real',email:'synthetic@example.test',accountRole:'teacher'},firstName:'Nombre',lastName:'Real',signOut});
 try{
  await profile.flush();
  const settings=descendants(profile.tree,n=>n.props.href==='/settings')[0];assert.ok(settings);
  assert.match(text(settings),/Configuración/);
  const logout=descendants(profile.tree,n=>n===signOut)[0];assert.ok(logout);logout.props.onClick();
  assert.deepEqual(calls,['/profile','logout']);
 }finally{profile.close();}
});

test('changing selected day aborts prior future query and never reveals its delayed private items',async()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();const pending=deferred();let oldSignal;
 const api={list:async(range,cursor,signal)=>{if(range.startDate==='2026-11-06'){oldSignal=signal;return pending.promise;}return {items:range.startDate==='2026-11-08'?[{id:'new'}]:[],nextCursor:null};},upcoming:async()=>({items:[]})};
 const {useAgenda}=loadTsModule('apps/web/src/features/agenda/calendar/useAgenda.ts');function Harness(){const [day,setDay]=React.useState('2026-11-05');return React.createElement('output',{setDay,state:useAgenda(api,{startDate:day,endDateExclusive:'2026-11-10',timeZone:'UTC'},true,day)});}
 const view=hookView(Harness,{});try{await view.flush();view.tree.props.setDay('2026-11-07');await view.flush();assert.ok(oldSignal.aborted);pending.resolve({items:[{id:'old-private'}],nextCursor:null});await view.flush();assert.deepEqual(view.tree.props.state.afterDay.items,[{id:'new'}]);}finally{pending.resolve({items:[],nextCursor:null});view.close();globalThis.window=previous;}
});
