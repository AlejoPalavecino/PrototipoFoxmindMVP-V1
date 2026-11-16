import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyAgendaIntegration } from '../../../../bootstrap/study-agenda-integration.ts';
const owner=crypto.randomUUID(), sessionId=crypto.randomUUID(), eventId=crypto.randomUUID(), allDay=crypto.randomUUID();
const sessions=[{id:sessionId,startAt:'2026-12-05T15:00:00Z',endAt:'2026-12-05T15:30:00Z'}];
test('checks actual recurring and all-day Agenda occurrences and ignores its own session',async()=>{
 const tx={query:async(sql,...args)=>{
  assert.equal(args[0],owner);
  if(sql.includes('FROM agenda_events')) {
    const common={owner_id:owner,revision:1n,title:'Ocupado',description:'',category:'CLASS',start_offset_minutes:null,end_offset_minutes:null,color:null,repeat_until:null,created_at:new Date(),updated_at:new Date(),exceptions:[]};
    return [{...common,id:eventId,schedule_kind:'TIMED',start_date:'2026-11-28',end_date_exclusive:'2026-11-29',
      start_local:'2026-11-28T12:05',end_local:'2026-11-28T12:20',time_zone:'America/Argentina/Buenos_Aires',repeat_kind:'WEEKLY',repeat_until:'2026-12-12'},
      {...common,id:allDay,schedule_kind:'ALL_DAY',start_date:'2026-12-05',end_date_exclusive:'2026-12-06',repeat_kind:'NONE'}];
  }
  return [];
 }};
 const agenda=createStudyAgendaIntegration();
 const result=await agenda.conflicts(tx,owner,'America/Argentina/Buenos_Aires',sessions);
 assert.deepEqual(result.map(i=>i.title),['Ocupado','Ocupado']);
 assert(result.every(i=>i.sessionId===sessionId));
 const excluding={query:async(sql,...args)=>sql.startsWith('SELECT id,agenda_event_id FROM study_review_sessions')?[{id:sessionId,agenda_event_id:eventId}]:tx.query(sql,...args)};
 assert.equal((await agenda.conflicts(excluding,owner,'America/Argentina/Buenos_Aires',sessions)).length,1);
});
