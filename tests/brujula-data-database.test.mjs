import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { homeFixture } from './foxmind-3d-repository-fixture.test.mjs';
import { readSqlPage } from '../apps/api/src/home/sql-page.ts';
import { createHomeService, createHomeUnitOfWork } from '../apps/api/src/home/index.ts';
import { mine } from '../apps/api/src/classrooms/classroom-queries.ts';
import {detail as classroomDetail} from '../apps/api/src/classrooms/classroom-queries.ts';
import {newClassroomCode} from '../apps/api/src/classrooms/classroom-codes.ts';
import {encryptDelivery,decryptDelivery} from '../apps/api/src/classrooms/delivery-envelope.ts';

test('Home returns only published own feedback and saved own question progress',{timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async local=>{
  const f=await homeFixture(local.query),service=createHomeService(createHomeUnitOfWork(local.database,async(_tx,req)=>req.userId));
  const a=await f.activity('study'),attempt=await f.attempt(a),grade=await f.grade(a,attempt,{value:'8',published:true,effective:true});
  await local.query('UPDATE attempt_grades SET overall_feedback=$2 WHERE id=$1',grade,'Devolución publicada\nCon detalle 🦊');
  const b=await f.activity('study'),draft=await f.attempt(b,{submitted:false}),question=randomUUID();
  await local.query("UPDATE activities SET type='QUESTIONNAIRE' WHERE id=$1",b.id);
  await local.query("INSERT INTO questions(id,updated_at,activity_id,type,prompt,available_points,position) VALUES($1,now(),$2,'DEVELOPMENT','Explicá',1,0)",question,b.id);
  await local.query("INSERT INTO answers(id,updated_at,attempt_id,activity_id,question_id,development_text,saved_at) VALUES($1,now(),$2,$3,$4,'Respuesta propia',now())",randomUUID(),draft,b.id,question);
  const home=await service.read({userId:f.actor},{timeZone:'UTC'});
  assert.equal(home.modules.feedback.items[0].overallFeedback,'Devolución publicada\nCon detalle 🦊');
  assert.deepEqual(home.modules.pending.items.find(item=>item.id===b.id).questionProgress,{answered:1,total:1});
  for(const whitespace of ['\n\t','\u00a0\u2003\ufeff']){
    await local.query('UPDATE answers SET development_text=$2 WHERE attempt_id=$1',draft,whitespace);
    assert.deepEqual((await service.read({userId:f.actor},{timeZone:'UTC'})).modules.pending.items.find(item=>item.id===b.id).questionProgress,{answered:0,total:1});
  }
  const readOnly=await f.activity('study',{expected:false,allowLate:true});
  const {ClassroomService}=await import('../.build/api/apps/api/src/classrooms/service.js');
  const classrooms=new ClassroomService({database:local.database,files:{},authenticate:async(_tx,req)=>req.userId,signingKey:Buffer.alloc(32,4),deliveryKey:Buffer.alloc(32,5),classroomQuotaBytes:1000000n,webOrigin:'http://127.0.0.1:3005'});
  assert.equal((await classrooms.listActivities({userId:f.actor},f.rooms.study.id)).activities.find(item=>item.id===readOnly.id).studentState,'READ_ONLY');
  assert.equal((await service.read({userId:f.outsider},{timeZone:'UTC'})).modules.feedback.items?.length??0,0);
 }));
});

test('access code recovery is encrypted, teacher-only, record-bound and revoked on rotation',{timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async local=>{
  const f=await homeFixture(local.query),key=Buffer.alloc(32,11),room=f.rooms.teach.id,tx={query:local.query};
  const code=await newClassroomCode(tx,room,key);
  const [stored]=await local.query('SELECT code_envelope,code_digest FROM classroom_codes WHERE classroom_id=$1 AND revoked_at IS NULL',room);
  assert.ok(!stored.code_envelope.includes(code));assert.notEqual(stored.code_digest,code);
  assert.throws(()=>decryptDelivery(key,stored.code_envelope,`classroom-access:${randomUUID()}`));
  const context={ports:{deliveryKey:key},run:async(request,_write,run)=>run(tx,{id:request.userId}),classroom:async()=>({teacher_id:f.teacherActor}),summary:()=>({id:room})};
  assert.equal((await classroomDetail(context,{userId:f.teacherActor},room)).accessCode,code);
  assert.equal((await classroomDetail(context,{userId:f.teacherActor},room.toUpperCase())).accessCode,code,'UUID casing cannot change the envelope identity');
  assert.equal(Object.hasOwn(await classroomDetail(context,{userId:f.pupil},room),'accessCode'),false);
  const next=await newClassroomCode(tx,room.toUpperCase(),key);assert.notEqual(next,code);
  assert.equal((await classroomDetail(context,{userId:f.teacherActor},room)).accessCode,next);
  assert.equal((await local.query('SELECT code_envelope FROM classroom_codes WHERE classroom_id=$1 AND revoked_at IS NOT NULL',room))[0].code_envelope,null);
  await local.query('UPDATE classroom_codes SET code_envelope=$2 WHERE classroom_id=$1 AND revoked_at IS NULL',room,encryptDelivery(key,{code:'invalid'},`classroom-access:${room}`));
  assert.equal((await classroomDetail(context,{userId:f.teacherActor},room)).accessCode,null,'tampered/mismatched code fails closed');
 }));
});

test('Home miniagenda respects cancelled and moved private occurrences and shares daily/monthly expansion', {timeout:120000},async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async local=>{
  const f=await homeFixture(local.query),service=createHomeService(createHomeUnitOfWork(local.database,async(_tx,req)=>req.userId));
  const id=await f.event({days:1}),first=f.at(1).slice(0,10),second=f.at(8).slice(0,10),movedDate=f.at(2).slice(0,10);
  const replacement={title:'Clase trasladada',description:'',category:'CLASS',schedule:{kind:'TIMED',timeZone:'UTC',startLocal:f.at(2).slice(0,16),endLocal:new Date(Date.parse(f.at(2))+3600000).toISOString().slice(0,16)},repeat:{kind:'NONE'}};
  await local.query("UPDATE agenda_events SET repeat_kind='WEEKLY',repeat_until=$2::date,exceptions=$3::jsonb WHERE id=$1",id,f.at(15).slice(0,10),JSON.stringify([{date:first,replacement:null},{date:second,replacement}]));
  const agenda=(await service.read({userId:f.actor},{timeZone:'UTC'})).modules.agenda;
  assert.equal(agenda.items[0].title,'Clase trasladada');assert.equal(agenda.items[0].date,movedDate);assert.ok(!agenda.items.some(item=>item.date===first));
  assert.equal(agenda.items[0].target.date,second,'deep link retains the source occurrence identity after moving');
  await local.query("UPDATE agenda_events SET repeat_kind='DAILY',repeat_until=$2::date,exceptions='[]' WHERE id=$1",id,f.at(3).slice(0,10));
  const daily=(await service.read({userId:f.actor},{timeZone:'UTC'})).modules.agenda.items.filter(item=>item.source==='PRIVATE_EVENT');assert.equal(daily.length,3);
 }));
});

test('Brújula derived SQL scopes drafts, latest submitted state, ordered next topic and catalog aggregates', {timeout:120000}, async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async local=>{
  const f=await homeFixture(local.query), tx={query:local.query};
  const service=createHomeService(createHomeUnitOfWork(local.database,async(_tx,req)=>req.userId));
  const empty=await service.read({userId:f.outsider},{timeZone:'UTC'});
  assert.equal(empty.modules.drafts.status,'not-applicable');assert.equal(empty.modules.submitted.status,'not-applicable');
  const teacher=await service.read({userId:f.teacherActor},{timeZone:'UTC'});
  assert.equal(teacher.modules.drafts.status,'ready');assert.equal(teacher.modules.submitted.status,'not-applicable');
  const studentHome=await service.read({userId:f.actor},{timeZone:'UTC'});
  assert.equal(studentHome.modules.drafts.status,'not-applicable');assert.equal(studentHome.modules.submitted.status,'ready');
  const read=(module,userId=f.teacherActor,cursor=null)=>readSqlPage(tx,{userId,now:f.now},{module,timeZone:'UTC',cursor});
  for(let n=0;n<7;n++) await f.activity('teach',{status:'DRAFT',title:`Draft ${n}`});
  await f.activity('foreign',{status:'DRAFT'}); await f.activity('archived',{status:'DRAFT'});
  const drafts=await read('drafts'); assert.equal(drafts.totalItems,7); assert.equal(drafts.items.length,5); assert.ok(drafts.nextCursor);
  const tail=await read('drafts',f.teacherActor,drafts.nextCursor); assert.equal(tail.items.length,2);assert.equal(tail.nextCursor,null);
  assert.equal(new Set([...drafts.items,...tail.items].map(x=>x.id)).size,7);
  assert.equal((await read('drafts',f.actor)).totalItems,0);
  const a=await f.activity(), attempt=await f.attempt(a); await f.grade(a,attempt,{value:'9'});
  const submitted=await read('submitted',f.actor); assert.equal(submitted.totalItems,1);assert.equal(submitted.items[0].id,attempt);
  assert.equal(JSON.stringify(submitted).includes('finalGrade'),false);
  assert.equal((await read('submitted',f.outsider)).totalItems,0);
  await f.attempt(a,{number:2,submitted:false}); assert.equal((await read('submitted',f.actor)).totalItems,0);
  const b=await f.activity(), bt=await f.attempt(b); await f.grade(b,bt,{published:true});
  assert.equal((await read('submitted',f.actor)).totalItems,0);
  const c=await f.activity(); await f.attempt(c);const ct=await f.attempt(c,{number:2});
  assert.deepEqual((await read('submitted',f.actor)).items.map(x=>x.id),[ct]);
  const room=f.rooms.study;
  const nextUnit=randomUUID(),nextTopic=randomUUID();
  await local.query("UPDATE topics SET status='TAUGHT' WHERE id=$1",room.topic);
  await local.query("INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Segunda',1)",nextUnit,room.id);
  await local.query("INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Siguiente',0)",nextTopic,room.id,nextUnit);
  const homeRoom=(await read('classrooms',f.actor)).items[0];
  assert.deepEqual(homeRoom.planProgress,{taught:1,total:2}); assert.deepEqual(homeRoom.nextTopic,{unitId:nextUnit,unitName:'Segunda',topicId:nextTopic,topicName:'Siguiente'});
  await local.query("UPDATE topics SET status='PENDING' WHERE id=$1",room.topic);
  await local.query("UPDATE topics SET status='NEXT' WHERE id=$1",nextTopic);
  assert.equal((await read('classrooms',f.actor)).items[0].nextTopic.topicId,nextTopic,'Home preserves the explicitly selected NEXT topic over an earlier pending topic');
  await local.query("UPDATE topics SET status='TAUGHT' WHERE id=$1",room.topic);
  await local.query("UPDATE topics SET status='TAUGHT' WHERE id=$1",nextTopic);
  assert.equal((await read('classrooms',f.actor)).items[0].nextTopic,null);
  const catalog=actor=>mine({run:(_r,_w,fn)=>fn(tx,{id:actor}),summary:(r,id)=>({id:r.id,role:r.teacher_id===id?'teacher':'student'})},{});
  assert.equal((await catalog(f.teacherActor)).teach.find(x=>x.id===f.rooms.teach.id).studentCount,1);
  const student=(await catalog(f.actor)).study[0];assert.deepEqual(student.planProgress,{taught:2,total:2});assert.equal('studentCount' in student,false);
  await local.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE id=$1",f.rooms.teach.period,f.pupil);
  assert.equal((await catalog(f.teacherActor)).teach.find(x=>x.id===f.rooms.teach.id).studentCount,0);
  await local.query("UPDATE classrooms SET archived_at=now() WHERE id=$1",room.id);
  assert.equal((await read('submitted',f.actor)).totalItems,0);
  await local.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE id=$1",room.period,f.actor);
  assert.equal((await read('classrooms',f.actor)).totalItems,0);
 }));
});


test('unanswered query total spans pages, preserves real zero and excludes replies/foreign/archived', {timeout:120000}, async()=>{
 await withAgendaDatabase(async({transaction})=>transaction(async local=>{
  const f=await homeFixture(local.query),tx={query:local.query};
  const read=(userId=f.teacherActor,cursor=null,module='queries')=>readSqlPage(tx,{userId,now:f.now},{module,timeZone:'UTC',cursor});
  assert.equal((await read()).totalItems,0);
  const posts=[];for(let n=0;n<7;n++) posts.push(await f.post());
  await f.post('foreign');await f.post('archived');await f.post('teach',{removed:true});await f.post('teach',{type:'NOTICE'});
  const first=await read();assert.equal(first.totalItems,7);assert.equal(first.items.length,5);assert.ok(first.nextCursor);
  const second=await read(f.teacherActor,first.nextCursor);assert.equal(second.totalItems,7);assert.equal(second.items.length,2);assert.equal(second.nextCursor,null);
  assert.equal(new Set([...first.items,...second.items].map(x=>x.id)).size,7);
  assert.equal((await read(f.outsider)).totalItems,0);
  const reply=async(post,author)=>local.query("INSERT INTO wall_replies(id,updated_at,post_id,classroom_id,author_id,body) VALUES($1,now(),$2,$3,$4,'Respuesta sintética')",randomUUID(),post,f.rooms.teach.id,author);
  await reply(posts[0],f.pupil);assert.equal((await read()).totalItems,7);
  await reply(posts[0],f.teacherActor);assert.equal((await read()).totalItems,6);assert.equal((await read()).items.some(x=>x.id===posts[0]),false);
  for(const post of posts.slice(1)) await reply(post,f.teacherActor);
  const empty=await read();assert.equal(empty.totalItems,0);assert.equal(empty.items.length,0);assert.equal(empty.nextCursor,null);
  assert.equal((await read(f.actor,null,'materials')).totalItems,null);
 }));
});
