import test from 'node:test';import assert from 'node:assert/strict';import React from 'react';
import {loadTsModule} from './helpers/load-ts-module.mjs';import {hookView,descendants,deferred} from './agenda-ui-helpers.test.mjs';
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n?.props?.children??'');
test('after-day query reads its entire selected future range with pagination, independently from visible calendar',async()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();const calls=[];
 const api={list:async(range,cursor)=>{calls.push({range,cursor});return {items:[],nextCursor:!cursor&&range.startDate==='2026-11-06'?'next':null};},upcoming:async()=>({items:[]})};
 const {useAgenda}=loadTsModule('apps/agenda-ui/useAgenda.ts');function Harness(){return React.createElement('output',{state:useAgenda(api,{startDate:'2026-11-05',endDateExclusive:'2026-11-06',timeZone:'UTC'},true,'2026-11-05')});}
 const view=hookView(Harness,{});try{await view.flush();assert.ok(view.tree.props.state.afterDay);assert.deepEqual(calls.filter(c=>c.range.startDate==='2026-11-06').map(c=>({range:c.range,cursor:c.cursor})),[{range:{startDate:'2026-11-06',endDateExclusive:'2026-12-07',timeZone:'UTC'},cursor:null},{range:{startDate:'2026-11-06',endDateExclusive:'2026-12-07',timeZone:'UTC'},cursor:'next'}]);}finally{view.close();globalThis.window=previous;}
});
test('Mi cuenta uses an explicit dialog trigger instead of disclosure; opening never navigates',async()=>{
 const {ShellAccount}=loadTsModule('apps/shared-ui/NavbarParts.tsx');const calls=[];
 const shell=ShellAccount({privateShell:true,homeNavigation:true,displayName:'Nombre Real',accountEmail:'synthetic@example.test',accountRole:'teacher',follow:(...a)=>calls.push(a),accountActions:React.createElement('button',null,'Cerrar sesión')});
 const child=descendants(shell,n=>n.type?.name==='HomeAccountMenu')[0];const view=hookView(child.type,child.props);const previous=globalThis.document;globalThis.document={addEventListener(){},removeEventListener(){}};
 try{await view.flush();const trigger=descendants(view.tree,n=>n.type==='button'&&n.props['aria-haspopup']==='dialog')[0];assert.ok(trigger);trigger.props.onClick();await view.flush();const dialog=descendants(view.tree,n=>n.type==='dialog')[0];assert.ok(dialog);assert.match(text(dialog),/Mi cuenta/);assert.match(text(dialog),/synthetic@example.test/);assert.match(text(dialog),/Cerrar sesión/);assert.equal(calls.length,0);dialog.props.onCancel({preventDefault(){},stopPropagation(){}});await view.flush();assert.equal(descendants(view.tree,n=>n.type==='dialog').length,0);}finally{view.close();globalThis.document=previous;}
});

test('after-day merges only queried future personal occurrences and deadlines, in date order with authorized destinations',()=>{
 const {AgendaAfterDay,afterDayEntries}=loadTsModule('apps/agenda-ui/AgendaAfterDay.tsx');const opened=[],edited=[];
 const event=(id,date)=>({kind:'PRIVATE_EVENT',occurrenceId:id,event:{id,title:id,category:'CLASS',color:'PURPLE',schedule:{kind:'ALL_DAY',startDate:date,endDateExclusive:date==='2026-11-05'?'2026-11-06':'2026-11-08'}},startDate:date,endDateExclusive:date==='2026-11-05'?'2026-11-06':'2026-11-08',startAt:null,endAt:null});
 const deadline={kind:'ACADEMIC_DEADLINE',id:'deadline',title:'Plazo',classroomName:'Aula',deadlineAt:'2026-11-06T15:00:00Z',target:{classroomId:'room',activityId:'activity'}};
 const items=[event('old','2026-11-05'),event('later','2026-11-07'),deadline,event('outside','2026-12-08'),deadline];
 assert.deepEqual(afterDayEntries(items,'2026-11-05','UTC').map(e=>e.item.kind==='PRIVATE_EVENT'?e.item.event.id:e.item.id),['deadline','later']);
 const tree=AgendaAfterDay({items,day:'2026-11-05',zone:'UTC',busy:false,loading:false,error:'',onRetry(){},onEdit:e=>edited.push(e),onOpen:t=>opened.push(t)});
 const buttons=descendants(tree,n=>n.type==='button');buttons[0].props.onClick();buttons[1].props.onClick();assert.deepEqual(opened,[deadline.target]);assert.equal(edited[0].id,'later');
 const loading=AgendaAfterDay({items,day:'2026-11-05',zone:'UTC',busy:false,loading:true,error:'',onRetry(){},onEdit(){},onOpen(){}});assert.equal(descendants(loading,n=>n.type==='button').length,0);assert.doesNotMatch(text(loading),/Plazo|later/);
});
test('Mi cuenta route follows real callback and closes dialog after primary navigation',async()=>{
 const {ShellAccount}=loadTsModule('apps/shared-ui/NavbarParts.tsx');const calls=[];
 const child=descendants(ShellAccount({privateShell:true,homeNavigation:true,displayName:'Nombre',follow:(event,href)=>calls.push(href)}),n=>n.type?.name==='HomeAccountMenu')[0];
 const view=hookView(child.type,child.props);try{await view.flush();descendants(view.tree,n=>n.type==='button'&&n.props['aria-haspopup']==='dialog')[0].props.onClick();await view.flush();descendants(view.tree,n=>n.type==='a'&&n.props.href==='/settings')[0].props.onClick({button:0});await view.flush();assert.deepEqual(calls,['/settings']);assert.equal(descendants(view.tree,n=>n.type==='dialog').length,0);}finally{view.close();}
});

test('changing selected day aborts prior future query and never reveals its delayed private items',async()=>{
 const previous=globalThis.window;globalThis.window=new EventTarget();const pending=deferred();let oldSignal;
 const api={list:async(range,cursor,signal)=>{if(range.startDate==='2026-11-06'){oldSignal=signal;return pending.promise;}return {items:range.startDate==='2026-11-08'?[{id:'new'}]:[],nextCursor:null};},upcoming:async()=>({items:[]})};
 const {useAgenda}=loadTsModule('apps/agenda-ui/useAgenda.ts');function Harness(){const [day,setDay]=React.useState('2026-11-05');return React.createElement('output',{setDay,state:useAgenda(api,{startDate:day,endDateExclusive:'2026-11-10',timeZone:'UTC'},true,day)});}
 const view=hookView(Harness,{});try{await view.flush();view.tree.props.setDay('2026-11-07');await view.flush();assert.ok(oldSignal.aborted);pending.resolve({items:[{id:'old-private'}],nextCursor:null});await view.flush();assert.deepEqual(view.tree.props.state.afterDay.items,[{id:'new'}]);}finally{pending.resolve({items:[],nextCursor:null});view.close();globalThis.window=previous;}
});
