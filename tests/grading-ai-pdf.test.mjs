import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withP5Database } from '../scripts/p5-database.mjs';
import { enqueueSubmittedAttemptGradingAi } from '../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/enqueue.ts';
import { GradingAiRuntime } from '../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/runtime.ts';
import { GeminiGradingAiProvider } from '../apps/api/src/modules/grading/assistance/infrastructure/grading-ai/provider.ts';
import { createGradingAiAttachmentReader } from '../apps/api/src/modules/files/custody/infrastructure/grading-ai-attachment-reader.ts';
import { parseActivityDocument } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/activity-document.js';

const config = { model:'synthetic', maxConcurrency:2, deadlineMs:30000, dailyActorRequests:20, dailyGlobalRequests:20,
  maxInputTokens:10000, maxOutputTokens:200, inputUsdPerMillion:1, outputUsdPerMillion:1, dailyBudgetUsd:5 };
const grade = { schemaVersion:'grading-proposal-v1', overallGrade:'7.00', overallFeedback:'Revisar', questions:[], warnings:[] };
async function makePdf() { const doc = await PDFDocument.create(); doc.addPage([200,200]).drawText('Respuesta sintetica'); return Buffer.from(await doc.save()); }
async function fixture(pool, database, bytes) {
  const teacher=randomUUID(), student=randomUUID(), room=randomUUID(), activity=randomUUID(), enrollment=randomUUID(), obligation=randomUUID(), attempt=randomUUID(), file=randomUUID();
  const digest=createHash('sha256').update(bytes).digest('hex');
  for(const id of [teacher,student]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Nombre','Sintetico','fixture',now(),$3)`,[id,`${id}@example.test`, id === student ? 'student' : 'teacher']);
  await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,ai_grading_enabled)
    VALUES($1,now(),$2,'Aula','Materia','A',2026,'UTC','explore',1000000,true)`,[room,teacher]);
  await pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,instructions_text) VALUES($1,now(),$2,'ASSIGNMENT','DRAFT','Resuelve')`,[activity,room]);
  await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)',[enrollment,room,student]);
  await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`,[randomUUID(),enrollment,room]);
  await pool.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason)
    VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT')`,[obligation,room,enrollment,activity]);
  await pool.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number,status,submitted_at,submitted_late)
    VALUES($1,now(),$2,$3,1,'SUBMITTED',now(),false)`,[attempt,obligation,activity]);
  await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
    VALUES($1,now(),$2,$3,$4,'archivo-privado.pdf','pdf','application/pdf',$5,'APPROVED','CLEAN',now(),now())`,[file,room,student,`synthetic/${file}`,bytes.length]);
  await pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',$3,now())`,[randomUUID(),file,bytes.length]);
  await pool.query(`INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest) VALUES($1,'attachment',$2,'ready',$3,$3,$3)`,[file,attempt,digest]);
  await pool.query('INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position) VALUES($1,$2,$3,$4,0)',[attempt,activity,room,file]);
  await database.$transaction(raw=>enqueueSubmittedAttemptGradingAi({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},{classroomId:room,activityId:activity,attemptId:attempt}));
  return {teacher,student,room,activity,attempt,file,digest};
}
function provider(onGenerate) {
  const calls=[]; const client={models:{countTokens:async p=>{calls.push(['count',p]);return {totalTokens:30};},
    generateContent:async p=>{calls.push(['generate',p]);if(onGenerate) await onGenerate();return {text:JSON.stringify(grade),candidates:[{finishReason:'STOP'}],usageMetadata:{promptTokenCount:30,candidatesTokenCount:10}};}}};
  return {calls,provider:new GeminiGradingAiProvider(client,config)};
}
function reader(f,bytes,change={}) {
  let check=0;
  return createGradingAiAttachmentReader({
    authorize:async grant=>{assert.equal(grant.fileId,f.file); if(change.revokeAt && ++check===change.revokeAt) throw Error('FORBIDDEN');},
    snapshot:async()=>({classroomId:f.room,attemptId:f.attempt,fileId:f.file,digest:f.digest,extension:'pdf',approved:true,clean:true}),
    readBytes:async()=>change.bytes ?? bytes,
    parse:parseActivityDocument,
  });
}
const row=async(pool,attempt)=>(await pool.query('SELECT state,proposal,dispatch_count FROM grading_ai_jobs WHERE attempt_id=$1',[attempt])).rows[0];

test('PDF aprobado: parser real, control de integridad y envío inline al proveedor simulado', {timeout:120000}, async t=>{
 await withP5Database(async({pool,database})=>{
  const bytes=await makePdf();
  await t.test('PDF sintético aprobado llega intacto, con MIME y sin metadatos de identidad',async()=>{
   const f=await fixture(pool,database,bytes), p=provider(), runtime=new GradingAiRuntime({database,configuration:config,provider:p.provider,reader:reader(f,bytes)});
   assert.equal(await runtime.runOnce(),true); const saved=await row(pool,f.attempt); assert.equal(saved.state,'READY'); assert.deepEqual(saved.proposal,grade);
   const count=p.calls.find(c=>c[0]==='count')[1], sent=p.calls.find(c=>c[0]==='generate')[1];
   assert.deepEqual(count.contents.slice(-sent.contents.length),sent.contents);
   const parts=sent.contents.flatMap(c=>c.parts); const inline=parts.find(x=>x.inlineData)?.inlineData;
   assert.equal(inline?.mimeType,'application/pdf'); assert.deepEqual(Buffer.from(inline.data,'base64'),bytes);
   const meta=JSON.stringify(sent.contents); for(const id of [f.teacher,f.student,f.room,f.attempt,f.file,'archivo-privado.pdf']) assert.ok(!meta.includes(id));
   assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1',[f.attempt])).rows[0].n,0);
  });
  await t.test('digest incorrecto impide el envío al proveedor',async()=>{
   const f=await fixture(pool,database,bytes), p=provider(), runtime=new GradingAiRuntime({database,configuration:config,provider:p.provider,reader:reader(f,bytes,{bytes:Buffer.from('alterado')})});
   await runtime.runOnce(); const saved=await row(pool,f.attempt); assert.notEqual(saved.state,'READY'); assert.equal(saved.proposal,null); assert.equal(p.calls.length,0);
  });
  await t.test('revocación de acceso al leer impide el envío',async()=>{
   const f=await fixture(pool,database,bytes), p=provider(), runtime=new GradingAiRuntime({database,configuration:config,provider:p.provider,reader:reader(f,bytes,{revokeAt:2})});
   await runtime.runOnce(); assert.notEqual((await row(pool,f.attempt)).state,'READY'); assert.equal(p.calls.length,0);
  });
  await t.test('revocación del vínculo en vuelo invalida el resultado',async()=>{
   const f=await fixture(pool,database,bytes), p=provider(()=>pool.query('DELETE FROM attempt_attachments WHERE attempt_id=$1 AND file_id=$2',[f.attempt,f.file]));
   const runtime=new GradingAiRuntime({database,configuration:config,provider:p.provider,reader:reader(f,bytes)});
   await runtime.runOnce(); const saved=await row(pool,f.attempt); assert.equal(saved.state,'STALE'); assert.equal(saved.proposal,null);
  });
 });
});

test('PDF inválido, sobre 100 páginas o más de 20 MB no se procesa', { timeout:15000 }, async () => {
 const signal=new AbortController().signal;
 await assert.rejects(parseActivityDocument(Buffer.from('%PDF-falso'),'pdf',signal));
 const doc=await PDFDocument.create(); for(let i=0;i<101;i++) doc.addPage([100,100]);
 await assert.rejects(parseActivityDocument(await doc.save(),'pdf',signal));
 await assert.rejects(parseActivityDocument(Buffer.alloc(20000001),'pdf',signal));
});
