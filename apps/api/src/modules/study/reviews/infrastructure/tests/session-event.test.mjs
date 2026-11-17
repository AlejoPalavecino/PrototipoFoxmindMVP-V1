import {test} from 'node:test';import assert from 'node:assert/strict';
import { studySessionEvent } from "../session-event.ts";
test('repasos conservan instante en zona local y no crean evento fuera de examen',()=>{
 const event=studySessionEvent({title:'Biología',examAt:'2026-11-20T12:00:00Z'}, {id:'a',title:'Células',startAt:'2026-11-15T18:00:00Z',endAt:'2026-11-15T18:30:00Z',timeZone:'America/Argentina/Buenos_Aires',reminderMinutes:15});
 assert.equal(event.schedule.startLocal,'2026-11-15T15:00');assert.equal(event.schedule.startOffsetMinutes,-180);
 assert.throws(()=>studySessionEvent({title:'Examen',examAt:'2026-11-10T12:00:00Z'},{title:'Repaso',startAt:'2026-11-15T18:00:00Z',endAt:'2026-11-15T18:30:00Z',timeZone:'UTC'}));
});
