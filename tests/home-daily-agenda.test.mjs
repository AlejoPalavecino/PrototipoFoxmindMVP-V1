import test from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from './helpers/load-ts-module.mjs';
const read=()=>loadTsModule('apps/web/src/features/home/dashboard/home-daily-agenda.ts');
const event=(id,startAt,endAt)=>({kind:'PRIVATE_EVENT',occurrenceId:id+':2026-11-15',startDate:startAt.slice(0,10),endDateExclusive:'2026-11-16',startAt,endAt,event:{id,title:id,category:'CLASS',schedule:{kind:'TIMED',timeZone:'UTC'}}});
test('Daily Home reads every page and retains past/current events of today in the display zone',async()=>{
 const calls=[],items=[event('past','2026-11-15T12:00Z','2026-11-15T13:00Z'),event('later','2026-11-15T23:00Z','2026-11-16T00:00Z'),event('tomorrow','2026-11-16T12:00Z','2026-11-16T13:00Z')];
 const client={list:async(range,cursor)=>{calls.push([range,cursor]);return cursor?{items:items.slice(1),nextCursor:null}:{items:[items[0]],nextCursor:'page2'};}};
 const result=await read().readHomeDay(client,'2026-11-16T01:00Z','America/Argentina/Buenos_Aires',new AbortController().signal);
 assert.equal(result.date,'2026-11-15');assert.deepEqual(result.events.map(e=>e.title),['past','later']);assert.equal(calls.length,2);
 assert.deepEqual(calls[0][0],{startDate:'2026-11-09',endDateExclusive:'2026-11-16',timeZone:'America/Argentina/Buenos_Aires'});
 assert.equal(result.events[0].target.eventId,'past');assert.equal(result.events[0].target.occurrenceId,'past:2026-11-15');
});
test('Daily Home fails closed on pagination failure or repeated cursor, never yielding a false empty day',async()=>{
 const signal=new AbortController().signal;
 await assert.rejects(read().readHomeDay({list:async()=>{throw Error('offline');}},'2026-11-15T12:00Z','UTC',signal),/offline/);
 await assert.rejects(read().readHomeDay({list:async()=>({items:[],nextCursor:'loop'})},'2026-11-15T12:00Z','UTC',signal),/pagination/);
});
test('Daily Home keeps all-day overlap and marks real weekdays only',async()=>{
 const item={kind:'PRIVATE_EVENT',occurrenceId:'all',startDate:'2026-11-14',endDateExclusive:'2026-11-17',startAt:null,endAt:null,event:{id:'all',title:'Jornada',category:'ACTIVITY',schedule:{kind:'ALL_DAY'}}};
 const result=await read().readHomeDay({list:async()=>({items:[item],nextCursor:null})},'2026-11-16T12:00Z','UTC',new AbortController().signal);
 assert.equal(result.events.length,1);assert.equal(result.events[0].allDay,true);assert.equal(result.dates.has('2026-11-16'),true);
});

test('Home duration uses hours and remaining minutes, never invented values',()=>{
 const {homeEventDuration}=loadTsModule('apps/web/src/features/home/model/home-presentation.ts');
 assert.equal(homeEventDuration('2026-11-15T12:00Z','2026-11-15T13:00Z'),'1 h');
 assert.equal(homeEventDuration('2026-11-15T12:00Z','2026-11-15T13:30Z'),'1 h 30 min');
 assert.equal(homeEventDuration('2026-11-15T12:00Z','2026-11-15T12:30Z'),'30 min');
 assert.equal(homeEventDuration('bad','bad'),'');
});
