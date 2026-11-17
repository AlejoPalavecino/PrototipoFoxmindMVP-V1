import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { GradingAiRuntime } from '../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/runtime.ts';

const configuration={maxConcurrency:2,deadlineMs:30000,dailyActorRequests:20,dailyGlobalRequests:20,maxInputTokens:10000,maxOutputTokens:200,inputUsdPerMillion:1,outputUsdPerMillion:1,dailyBudgetUsd:5};
async function fixture(pool) {
 const teacher=randomUUID(),student=randomUUID(),room=randomUUID(),activity=randomUUID(),enrollment=randomUUID(),obligation=randomUUID(),attempt=randomUUID(),job=randomUUID(),nonce=randomUUID(),file=randomUUID();
 for(const id of [teacher,student]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
  VALUES($1,now(),$2,$2,'Nombre','Prueba','fixture',now(),$3)`,[id,`${id}@example.test`, id === student ? 'student' : 'teacher']);
 await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,ai_grading_enabled)
  VALUES($1,now(),$2,'Aula','Materia','A',2026,'UTC','explore',1000000,true)`,[room,teacher]);
 await pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,instructions_text) VALUES($1,now(),$2,'ASSIGNMENT','DRAFT','Resuelve')`,[activity,room]);
 await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)',[enrollment,room,student]);
 await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`,[randomUUID(),enrollment,room]);
 await pool.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
  VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT')`,[obligation,room,enrollment,activity]);
 await pool.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,submitted_at,submitted_late)
  VALUES($1,now(),$2,$3,1,'SUBMITTED',now(),false)`,[attempt,obligation,activity]);
 await pool.query(`INSERT INTO grading_ai_jobs(id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch,state,lease_nonce,lease_until)
  VALUES($1,$2,$3,$4,$5,'',0,'RUNNING',$6,now()+interval '1 minute')`,[job,room,activity,attempt,teacher,nonce]);
 await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
  VALUES($1,now(),$2,$3,$4,'sintetico.pdf','pdf','application/pdf',10,'APPROVED','CLEAN',now(),now())`,[file,room,student,`synthetic/${file}`]);
 await pool.query('INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position) VALUES($1,$2,$3,$4,0)',[attempt,activity,room,file]);
 return {teacher,student,room,activity,attempt,job,nonce,file,grant:{jobId:job,leaseNonce:nonce,ownerId:teacher,classroomId:room,activityId:activity,attemptId:attempt,fileId:file,digest:'a'.repeat(64)}};
}
function runtime(database) { return new GradingAiRuntime({database,configuration,provider:{},reader:{}}); }

test('autorización de grant de archivos IA sobre PostgreSQL aislado', {timeout:120000}, async t=>{
 await withP5Database(async({pool,database})=>{
  const signal=new AbortController().signal;
  await t.test('autoriza lease vigente y vínculo, incluida comprobación en transacción suministrada',async()=>{
   const f=await fixture(pool), r=runtime(database); await r.authorizeClaim(f.grant,signal);
   await database.$transaction(raw=>r.authorizeClaim(f.grant,signal,{query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));
  });
  await t.test('identificadores de job, nonce, docente, aula, actividad, intento y archivo no se pueden sustituir',async()=>{
   const f=await fixture(pool), r=runtime(database);
   for(const key of ['jobId','leaseNonce','ownerId','classroomId','activityId','attemptId','fileId']) {
    await assert.rejects(r.authorizeClaim({...f.grant,[key]:randomUUID()},signal),/FORBIDDEN/,key);
   }
  });
  await t.test('lease vencido o reemplazado y estado distinto de RUNNING deniegan',async()=>{
   const f=await fixture(pool), r=runtime(database);
   await pool.query("UPDATE grading_ai_jobs SET lease_until=now()-interval '1 second' WHERE id=$1",[f.job]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
   await pool.query("UPDATE grading_ai_jobs SET lease_until=now()+interval '1 minute',lease_nonce=$2 WHERE id=$1",[f.job,randomUUID()]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
   await pool.query("UPDATE grading_ai_jobs SET lease_nonce=$2,state='STALE' WHERE id=$1",[f.job,f.nonce]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
  });
  await t.test('desactivar/reactivar, archivar y revocar verificación docente bloquean el grant',async()=>{
   const f=await fixture(pool),r=runtime(database);
   await pool.query('UPDATE classrooms SET ai_grading_enabled=false,ai_grading_epoch=ai_grading_epoch+1 WHERE id=$1',[f.room]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
   await pool.query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1',[f.room]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
   await pool.query('UPDATE classrooms SET ai_grading_epoch=0,archived_at=now() WHERE id=$1',[f.room]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
   await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1',[f.room]);
   await pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1',[f.teacher]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
  });
  await t.test('cambio de propietario del job invalida el grant',async()=>{
   const f=await fixture(pool),r=runtime(database);
   await pool.query('UPDATE grading_ai_jobs SET owner_id=$2 WHERE id=$1',[f.job,f.student]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
  });
  await t.test('un intento sin entrega confirmada invalida el grant',async()=>{
   const f=await fixture(pool),r=runtime(database);
   await pool.query("UPDATE attempts SET status='DRAFT',submitted_at=NULL,submitted_late=NULL WHERE id=$1",[f.attempt]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
  });
  await t.test('quitar vínculo de archivo y abortar deniega incluso con lease vigente',async()=>{
   const f=await fixture(pool),r=runtime(database),controller=new AbortController();
   controller.abort(); await assert.rejects(r.authorizeClaim(f.grant,controller.signal),/FORBIDDEN/);
   await pool.query('DELETE FROM attempt_attachments WHERE attempt_id=$1 AND file_id=$2',[f.attempt,f.file]);
   await assert.rejects(r.authorizeClaim(f.grant,signal),/FORBIDDEN/);
  });
 });
});
