import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { PDFDocument } from 'pdf-lib';
import { withP4Services } from '../scripts/p4-services.mjs';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';
import { ClassroomService } from './helpers/academic-fixture.ts';
import { FileService } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/service.js';
import { S3Storage } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/storage.js';
import { ClamdScanner } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/scanner.js';
import { createFileAccess } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/access.js';
import { attachmentIntegration } from '../.build/api/apps/api/src/bootstrap/attachment-integration.js';
import { createDurableGradingAiAttachmentReader } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/durable-grading-ai-attachment-reader.js';
import { createDurableGradingAiInstructionReader } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/durable-grading-ai-instruction-reader.js';
import { GradingAiRuntime } from '../.build/api/apps/api/src/modules/grading/assistance/infrastructure/grading-ai/runtime.js';

const configuration={maxConcurrency:2,deadlineMs:30000,dailyActorRequests:20,dailyGlobalRequests:20,maxInputTokens:10000,maxOutputTokens:200,inputUsdPerMillion:1,outputUsdPerMillion:1,dailyBudgetUsd:5};
async function pdf(text) {const doc=await PDFDocument.create();doc.addPage([300,300]).drawText(text);return Buffer.from(await doc.save());}

test('TP con archivos reales: carga, sugerencia privada, aprobación y publicación', {timeout:330000}, async()=>{
 await withP4Services(async infra=>{
  const prisma=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...process.env,DATABASE_URL:infra.databaseUrl},encoding:'utf8',windowsHide:true,timeout:60000});
  assert.equal(prisma.status,0,'migraciones en PostgreSQL efímero');
  const pool=new pg.Pool({connectionString:infra.databaseUrl,max:8,connectionTimeoutMillis:2000,statement_timeout:5000,idle_in_transaction_session_timeout:6000});
  const oldParser=pg.types.getTypeParser(20);pg.types.setTypeParser(20,BigInt);
  const database={$transaction:async fn=>{const client=await pool.connect();try{await client.query('BEGIN');const value=await fn({$queryRawUnsafe:async(sql,...args)=>(await client.query(sql,args)).rows});await client.query('COMMIT');return value;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};
  let runtime;
  try {
   const teacher=randomUUID(),student=randomUUID(),room=randomUUID(),unit=randomUUID(),topic=randomUUID();
   for(const id of [teacher,student]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Usuario','Sintetico','fixture',now(),$3)`,[id,`${id}@example.test`, id === student ? 'student' : 'teacher']);
   await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,ai_grading_enabled)
    VALUES($1,now(),$2,'Aula','Materia','A',2026,'UTC','explore',10000000,true)`,[room,teacher]);
   await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unidad',0)`,[unit,room]);
   await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Tema',0)`,[topic,room,unit]);
   const authenticate=async(_tx,req)=>req.actor, access=createFileAccess({authenticate,authorizeAttemptWrite:attachmentIntegration.authorizeAttemptWrite});
   const files=new FileService({database,access,storage:new S3Storage(infra.s3,infra.infrastructure.bucket),
    scanner:new ClamdScanner(infra.scannerHost,infra.scannerPort),draftQuotaBytes:10000000n,onReadyTransition:attachmentIntegration.onReadyTransition});
   const service=new ClassroomService({database,files:files.store,authenticate,gradingAiAvailable:true,signingKey:Buffer.alloc(32,1),deliveryKey:Buffer.alloc(32,2),classroomQuotaBytes:10000000n,webOrigin:'http://127.0.0.1:3005'});
   const T={actor:teacher,headers:{}},S={actor:student,headers:{}};
   const change=async operation=>service.changeActivities(T,room,{revision:(await service.detail(T,room)).revision,operation});
   const {code}=await service.rotateCode(T,room);await service.confirmCode(S,(await service.previewCode(S,code)).confirmation);
   const {id:activity}=await change({action:'create',type:'ASSIGNMENT'});
   const instructionBytes=await pdf('Consigna sintetica'), answerBytes=await pdf('Respuesta sintetica');
   const instruction=await files.begin(T,{kind:'classroom',id:room},{purpose:'instructions',name:'consigna.pdf',bytes:instructionBytes.length},activity);
   assert.equal((await files.receive(T,instruction.id,instructionBytes)).ready,true);
   await change({action:'save',id:activity,payload:{title:'Trabajo',unitId:unit,topicId:topic,instructions:'',attachmentRequired:true,
    instructionFileIds:[instruction.id],materialIds:[],questions:[],deadline:null,allowLate:false}});
   await change({action:'publish',id:activity});
   let opened=await service.startActivity(S,room,activity,{});
   const studentRequest={...S,headers:{'x-attempt-editor':opened.editor.token,'x-attempt-epoch':opened.editor.epoch}};
   const attachment=await files.begin(studentRequest,{kind:'classroom',id:room},{purpose:'attachment',name:'respuesta.pdf',bytes:answerBytes.length},opened.attempt.id);
   assert.equal((await files.receive(studentRequest,attachment.id,answerBytes)).ready,true);
   opened=await service.activitySession(S,room,activity);await waitForAttemptClock(opened.attempt.openedAt);
   await service.submitPracticalAttempt(studentRequest,room,opened.attempt.id,{revision:opened.attempt.revision,confirm:true});
   const calls=[],provider={countGradingAiTokens:async input=>{calls.push(['count',input]);return 30;},generateGradingAi:async input=>{
    calls.push(['generate',input]);return {json:{schemaVersion:'grading-proposal-v1',overallGrade:'8.00',overallFeedback:'Bien',questions:[],warnings:[]},inputTokens:30,outputTokens:15};}};
   const authorize=(grant,signal,tx)=>runtime.authorizeClaim(grant,signal,tx);
   const reader=createDurableGradingAiAttachmentReader({files,authorize}),instructionReader=createDurableGradingAiInstructionReader({files,authorize});
   runtime=new GradingAiRuntime({database,configuration,provider,reader,instructionReader});
   assert.equal(await runtime.runOnce(),true);
   const suggestion=await service.getGradingAi(T,room,opened.attempt.id);assert.equal(suggestion.state,'READY');
   const evidence=calls.find(x=>x[0]==='generate')[1].evidence;
   const sentPdfs=evidence.files.filter(f=>f.kind==='pdf');assert.equal(sentPdfs.length,2);
   assert.deepEqual(Buffer.from(sentPdfs.find(f=>f.purpose==='instruction').data,'base64'),instructionBytes);
   assert.deepEqual(Buffer.from(sentPdfs.find(f=>f.purpose==='attachment').data,'base64'),answerBytes);
   for(const privateValue of [teacher,student,room,activity,attachment.id,instruction.id,'consigna.pdf','respuesta.pdf']) assert.ok(!JSON.stringify(evidence).includes(privateValue));
   const before=await service.getAttemptGrading(T,room,opened.attempt.id);
   await service.applyGradingAi(T,room,opened.attempt.id,suggestion.id,{requestId:randomUUID(),revision:before.revision,snapshotHash:suggestion.snapshotHash,proposal:suggestion.proposal});
   const saved=await service.getAttemptGrading(T,room,opened.attempt.id);assert.equal(saved.grade.isPublished,false);
   assert.equal((await service.getAttemptResult(S,room,opened.attempt.id)).status,'pending');
   await service.publishAttemptGrade(T,room,opened.attempt.id,{revision:saved.revision,confirm:true});
   assert.equal((await service.getAttemptResult(S,room,opened.attempt.id)).status,'published');
  } finally { await runtime?.onModuleDestroy(); await pool.end();pg.types.setTypeParser(20,oldParser); }
 });
});
