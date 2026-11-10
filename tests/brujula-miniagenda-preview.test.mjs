import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { parseHomePage } from '../src/core/domain/home/rows-validation.ts';
const id=n=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const event=(n,source)=>({id:id(n),title:`Evento ${n}`,source,startAt:`2026-11-06T${String(n).padStart(2,'0')}:00:00.000Z`,date:'2026-11-06',timeZone:'UTC',allDay:false,classroom:source==='PRIVATE_EVENT'?null:{id:id(99),name:'Aula',division:'A',subject:'Materia',role:'teacher',coverKey:'general',archived:false,timeZone:'UTC'},target:source==='PRIVATE_EVENT'?{kind:'private-event',eventId:id(n),occurrenceId:id(n),date:'2026-11-06'}:{kind:'activity',classroomId:id(99),activityId:id(n)}});
test('preview de agenda separa categorías fuera de la primera página sin consultas adicionales',async()=>{
  const {readMiniagenda}=loadTsModule("apps/api/src/modules/home/infrastructure/miniagenda.ts");
  const items=[1,2,3,4].map(n=>event(n,'ACADEMIC_DEADLINE')).concat([event(5,'PRIVATE_EVENT'),event(6,'PRIVATE_EVENT')]);let calls=0;
  const tx={query:async()=>++calls===1?[]:items.map(item=>({item,sort_key:`${item.startAt}|${item.id}`,timing:null}))};
  const result=await readMiniagenda(tx,{userId:id(98),now:'2026-11-05T09:00:00.000Z'},{module:'agenda',timeZone:'UTC',cursor:null});
  assert.equal(calls,2);assert.equal(result.items.length,3);assert.deepEqual(result.preview.personal.map(item=>item.id),[id(5),id(6)]);assert.equal(result.preview.deadline.id,id(1));assert.ok(result.nextCursor);
});
test('preview valida fuentes, tamaño y no admite campos privados',()=>{
  const preview={personal:[event(5,'PRIVATE_EVENT')],deadline:event(1,'ACADEMIC_DEADLINE')},page={status:'ready',items:[],totalItems:null,nextCursor:null,preview};
  assert.deepEqual(parseHomePage('agenda',page).preview,preview);
  for(const bad of [{...preview,personal:[preview.deadline]},{...preview,personal:[...preview.personal,...preview.personal,...preview.personal]},{...preview,privateText:'secret'}])assert.throws(()=>parseHomePage('agenda',{...page,preview:bad}));
});
