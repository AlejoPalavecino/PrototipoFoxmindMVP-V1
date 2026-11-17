import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from './helpers/academic-fixture.ts';

test('TP service exports coherent draft removal, confirmed submission and teacher receipts without losing prior services', () => {
  for (const name of ['removeAttemptAttachment','submitPracticalAttempt','assignmentSubmissions','assignmentSubmission','activitySession','startActivity','changeActivities','invite'])
    assert.equal(typeof ClassroomService.prototype[name], 'function', name);
});
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileService } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/service.js';
import { createFileAccess } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/access.js';
import { attachmentIntegration } from '../.build/api/apps/api/src/bootstrap/attachment-integration.js';
import { FileError } from '../.build/api/apps/api/src/modules/files/domain/errors.js';
import { PDFDocument } from 'pdf-lib';
import { captureSubmissionReceipt } from '../.build/api/apps/api/src/modules/participation/attempts/infrastructure/submission-receipt.js';
import { waitForAttemptClock } from './helpers/attempt-clock.mjs';
import pg from 'pg';

const { authorizeAttemptWrite: authorizeAttemptFileWrite, onReadyTransition: linkReadyAttemptAttachment } = attachmentIntegration;

// Controlled SQL authentication/scanner below are explicitly not actual P3 or production ClamAV proof.
test('TP public service and file ports preserve drafts, receipts, quotas and concurrent security/deadline boundaries', {timeout:120000}, async t=>{
 const oldInt8=pg.types.getTypeParser(20);pg.types.setTypeParser(20,BigInt);
 try { await withP5Database(async({pool,database})=>{
  const teacher=randomUUID(),student=randomUUID(),foreign=randomUUID(),room=randomUUID(),unit=randomUUID(),topic=randomUUID();
  for(const id of [teacher,student,foreign])await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
   VALUES($1,now(),$2,$2,'Practical','Fixture','fixture',now(),$3)`,[id,`${id}@example.test`, id !== teacher ? 'student' : 'teacher']);
  await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
   VALUES($1,now(),$2,'Practical','Science','A',2026,'UTC','explore',1000000000)`,[room,teacher]);
  await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`,[unit,room]);
  await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`,[topic,room,unit]);
  const authenticate=async(_tx,req)=>req.actor,objects=new Map();let scan=async()=>{};
  const access=createFileAccess({authenticate,authorizeAttemptWrite:authorizeAttemptFileWrite});
  const fileService=(onReadyTransition=linkReadyAttemptAttachment)=>new FileService({database,access,storage:{put:async(key,bytes)=>{objects.set(key,bytes);},get:async key=>objects.get(key),remove:async key=>{objects.delete(key);}},scanner:{scan:async bytes=>scan(bytes)},draftQuotaBytes:1000000000n,onReadyTransition});
  let files=fileService();
  const service=new ClassroomService({database,files:files.store,authenticate,signingKey:Buffer.alloc(32,1),deliveryKey:Buffer.alloc(32,2),classroomQuotaBytes:1000000000n,webOrigin:'http://127.0.0.1:3005'});
  const T={actor:teacher,headers:{}},S={actor:student,headers:{}},F={actor:foreign,headers:{}};
  const change=async operation=>service.changeActivities(T,room,{revision:(await service.detail(T,room)).revision,operation});
  const create=async(required=false)=>{
   const {id}=await change({action:'create',type:'ASSIGNMENT'});
   await change({action:'save',id,payload:{title:'Practical',unitId:unit,topicId:topic,instructions:'Confirmed instructions',attachmentRequired:required,instructionFileIds:[],materialIds:[],questions:[],deadline:null,allowLate:false}});
   await change({action:'publish',id});return id;
  };
  const firstActivity=await create(true);
  const {code}=await service.rotateCode(T,room),preview=await service.previewCode(S,code);await service.confirmCode(S,preview.confirmation);
  const started=await service.startActivity(S,room,firstActivity,{});let attempt=started.attempt,editor=started.editor;
  const request=(e=editor)=>({...S,headers:{'x-attempt-editor':e.token,'x-attempt-epoch':e.epoch}});
  const session=()=>service.activitySession(S,room,firstActivity);
  const submit=(input={})=>service.submitPracticalAttempt(request(),room,attempt.id,{revision:attempt.revision,confirm:true,...input});
  const snapshot=async()=>JSON.stringify((await pool.query(`SELECT
   (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM attempts a) a,
   (SELECT jsonb_agg(to_jsonb(a) ORDER BY attempt_id,file_id) FROM attempt_attachments a) l,
   (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM files a) f,
   (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM uploads a) u,
   (SELECT jsonb_agg(to_jsonb(a) ORDER BY file_id) FROM file_custodies a) c,
   (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM attempt_grades a) grades`)).rows);
  const rejected=async(fn,code)=>{const before=await snapshot();await assert.rejects(async()=>fn(),{code});assert.equal(await snapshot(),before);};
  const pdf=await PDFDocument.create();pdf.addPage();const bytes=Buffer.from(await pdf.save());
  const reserve=(name='work.pdf')=>files.begin(request(),{kind:'classroom',id:room},{purpose:'attachment',name,bytes:bytes.length},attempt.id);
  const remove=async id=>{await service.removeAttemptAttachment(request(),room,attempt.id,{revision:attempt.revision,fileId:id});attempt=(await session()).attempt;};
  let failed=false;
  const check=(name,run)=>t.test(name,{skip:failed?'Earlier shared controlled TP prerequisite failed':false},async()=>{try{await run();}catch(e){failed=true;console.error('Controlled TP failure:',name,e.code??e.name,e.message);throw e;}});
  await check('written practical response uses the same editor, CAS, ownership and durable session contract',async()=>{
   const old=attempt.revision,text='Observación propia\n'+ '😀'.repeat(4981);
   const saved=await service.savePracticalResponse(request(),room,attempt.id,{revision:old,text});
   assert.equal(saved.text,text);attempt=(await session()).attempt;assert.equal(attempt.practicalResponse,text);assert.equal(attempt.revision,saved.revision);
   await rejected(()=>service.savePracticalResponse(request(),room,attempt.id,{revision:old,text:'stale'}),'CONFLICT');
   await rejected(()=>service.savePracticalResponse({...F,headers:request().headers},room,attempt.id,{revision:attempt.revision,text:'foreign'}),'FORBIDDEN');
   await rejected(()=>service.savePracticalResponse({...T,headers:request().headers},room,attempt.id,{revision:attempt.revision,text:'teacher'}),'FORBIDDEN');
   await rejected(()=>service.savePracticalResponse(request(),room,attempt.id,{revision:attempt.revision,text:'😀'.repeat(5001)}),'INVALID_INPUT');
   await service.savePracticalResponse(request(),room,attempt.id,{revision:attempt.revision,text:'Respuesta propia de campo'});attempt=(await session()).attempt;
  });
  await check('mandatory and explicit confirm guards preserve state; teacher cannot inspect private draft/file',async()=>{
   await rejected(()=>submit(),'CONFLICT');await rejected(()=>submit({confirm:false}),'INVALID_INPUT');
   await rejected(()=>service.assignmentSubmission(T,room,attempt.id),'FORBIDDEN');
   assert.deepEqual((await service.assignmentSubmissions(T,room,firstActivity)).submissions,[]);
   const pending=await reserve();await rejected(()=>files.read(T,pending.id),'FORBIDDEN');
   await rejected(()=>submit(),'CONFLICT');await remove(pending.id);await rejected(()=>files.receive(request(),pending.id,bytes),'UPLOAD_CONFLICT');
  });
  let confirmed;
  await check('only successful ready transition links atomically, confirmed files recover across service restart, remove/retry never relinks',async()=>{
   const beforeRevision=BigInt(attempt.revision);
   const reserved=await reserve();assert.equal(reserved.ready,false);assert.equal((await session()).attempt.attachments[0].selected,false);
   confirmed=await files.receive(request(),reserved.id,bytes);assert.equal(confirmed.ready,true);
   attempt=(await session()).attempt;assert.equal(attempt.revision,(beforeRevision+1n).toString());assert.equal(attempt.attachments.length,1);assert.equal(attempt.attachments[0].selected,true);
   await files.store.transaction(async tx=>linkReadyAttemptAttachment(tx,request(),await files.store.load(tx,confirmed.id)));
   assert.equal((await session()).attempt.revision,attempt.revision);
   assert.equal((await session()).attempt.attachments.length,1);
   files=fileService();assert.equal((await files.status(S,confirmed.id)).ready,true);assert.equal((await session()).attempt.attachments[0].id,confirmed.id);
   const used=(await files.usage(T,{kind:'classroom',id:room})).usedBytes;
   await remove(confirmed.id);assert.equal((await session()).attempt.attachments.length,0);
   assert.equal((await files.receive(request(),confirmed.id,bytes)).ready,true);assert.equal((await session()).attempt.attachments.length,0);
   assert.equal((await files.usage(T,{kind:'classroom',id:room})).usedBytes,used);
   const row=(await pool.query('SELECT completed_at FROM uploads WHERE file_id=$1',[confirmed.id])).rows[0];assert.ok(row.completed_at);
  });
  await check('five slots include parallel reservations; canceled and completed-unselected custodies are not permanent active slots',async()=>{
   const results=await Promise.allSettled(Array.from({length:6},()=>reserve()));
   assert.equal(results.filter(r=>r.status==='fulfilled').length,5);assert.equal(results.filter(r=>r.status==='rejected'&&r.reason.code==='UPLOAD_CONFLICT').length,1);
   assert.equal((await session()).attempt.attachments.length,5);
   for(const result of results)if(result.status==='fulfilled')await remove(result.value.id);
   assert.equal((await session()).attempt.attachments.length,0);
   const next=await reserve();await remove(next.id);
  });
  await check('scanner failure stays private; pending cancellation invalidates finalization during scanner I/O',async()=>{
   const pending=await reserve();scan=async()=>{throw new FileError('SERVICE_UNAVAILABLE');};
   await assert.rejects(()=>files.receive(request(),pending.id,bytes),{code:'SERVICE_UNAVAILABLE'});
   assert.equal((await files.status(S,pending.id)).ready,false);await rejected(()=>submit(),'CONFLICT');await remove(pending.id);
   let scanned,release;const waiting=new Promise(r=>scanned=r),gate=new Promise(r=>release=r);scan=async()=>{scanned();await gate;};
   const reserved=await reserve();const inflight=files.receive(request(),reserved.id,bytes);await waiting;
   await remove(reserved.id);release();await assert.rejects(()=>inflight,{code:'UPLOAD_CONFLICT'});
   assert.equal((await files.status(S,reserved.id)).ready,false);assert.equal((await session()).attempt.attachments.length,0);scan=async()=>{};
  });
  await check('ready callback failure rolls back readiness/link/revision as one transaction',async()=>{
   const reserved=await reserve(),before=(await session()).attempt.revision;
   const failing=fileService(async(tx,req,row)=>{
    await linkReadyAttemptAttachment(tx,req,row);
    const query=`SELECT c.phase,u.status::text AS status,u.reservation_released_at IS NULL AS reserved,
      a.revision::text AS revision,EXISTS(SELECT 1 FROM attempt_attachments aa WHERE aa.attempt_id=a.id AND aa.file_id=c.file_id) AS linked
      FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id JOIN attempts a ON a.id=c.target_id WHERE c.file_id=$1::uuid`;
    assert.deepEqual((await tx.query(query,row.id))[0],{phase:'ready',status:'COMPLETED',reserved:false,revision:String(BigInt(before)+1n),linked:true});
    const outside=(await pool.query(query,[row.id])).rows[0];
    assert.deepEqual(outside,{phase:'inspecting',status:'UPLOADING',reserved:true,revision:before,linked:false});
    throw new FileError('UPLOAD_CONFLICT');
   });
   await assert.rejects(()=>failing.receive(request(),reserved.id,bytes),{code:'UPLOAD_CONFLICT'});
   assert.equal((await files.status(S,reserved.id)).ready,false);assert.equal((await session()).attempt.revision,before);
   assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_attachments WHERE file_id=$1',[reserved.id])).rows[0].n,0);
   await remove(reserved.id);
  });
  await check('archive and departure during scan reject at final authorization, not merely at upload start',async()=>{
   for(const kind of ['archive','departure']){
    const reserved=await reserve();let entered,release;
    const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);scan=async()=>{entered();await gate;};
    const inflight=files.receive(request(),reserved.id,bytes);await waiting;
    if(kind==='archive')await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1',[room]);
    else await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$1 WHERE enrollment_id=(SELECT id FROM enrollments WHERE classroom_id=$2 AND student_id=$1)",[student,room]);
    release();await assert.rejects(()=>inflight,{code:kind==='archive'?'FORBIDDEN':'FORBIDDEN'});
    assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_attachments WHERE file_id=$1',[reserved.id])).rows[0].n,0);
    if(kind==='archive')await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1',[room]);
    else await pool.query('UPDATE membership_periods SET ended_at=NULL,end_reason=NULL,ended_by_id=NULL WHERE enrollment_id=(SELECT id FROM enrollments WHERE classroom_id=$1 AND student_id=$2)',[room,student]);
    await remove(reserved.id);scan=async()=>{};
   }
  });
  await check('editor transfer during scan rejects old finalization; revision-only changes do not revoke current file editor',async()=>{
   const reserved=await reserve();let entered,release;const waiting=new Promise(r=>entered=r),gate=new Promise(r=>release=r);scan=async()=>{entered();await gate;};
   const old=request(),inflight=files.receive(old,reserved.id,bytes);await waiting;
   const moved=await service.transferAttemptEditor(S,room,attempt.id,{revision:attempt.revision});editor=moved.editor;attempt=moved.attempt;
   release();await assert.rejects(()=>inflight,{code:'FORBIDDEN'});assert.equal((await files.status(S,reserved.id)).ready,false);
   scan=async()=>{};assert.equal((await files.receive(request(),reserved.id,bytes)).ready,true);
   attempt=(await session()).attempt;assert.ok(attempt.attachments[0].ready);confirmed=attempt.attachments[0];
   const reservation=await reserve();await pool.query('UPDATE attempts SET revision=revision+1 WHERE id=$1',[attempt.id]);
   assert.equal((await files.receive(request(),reservation.id,bytes)).ready,true);attempt=(await session()).attempt;
  });
  await check('foreign user, archive and departed membership reject without changing drafts or files',async()=>{
   await rejected(()=>service.removeAttemptAttachment({...F,headers:request().headers},room,attempt.id,{revision:attempt.revision,fileId:confirmed.id}),'FORBIDDEN');
   await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1',[room]);await rejected(()=>submit(),'CONFLICT');
   await rejected(()=>reserve(),'FORBIDDEN');await pool.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1',[room]);
   await pool.query("UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$1 WHERE enrollment_id=(SELECT id FROM enrollments WHERE classroom_id=$2 AND student_id=$1)",[student,room]);
   await rejected(()=>submit(),'FORBIDDEN');await rejected(()=>files.read(S,confirmed.id),'FORBIDDEN');
   await pool.query('UPDATE membership_periods SET ended_at=NULL,end_reason=NULL,ended_by_id=NULL WHERE enrollment_id=(SELECT id FROM enrollments WHERE classroom_id=$1 AND student_id=$2)',[room,student]);
  });
  await check('complete submission receipt before deadline stays on time across selected-file lock wait',async()=>{
   await pool.query("UPDATE attempts SET individual_deadline_at=clock_timestamp()+interval '400 milliseconds' WHERE id=$1",[attempt.id]);
   assert.ok(confirmed?.id);const lock=await pool.connect();await lock.query('BEGIN');
   let pending;
   try{
    await lock.query('SELECT id FROM files WHERE id=$1 FOR UPDATE',[confirmed.id]);
    pending=submit();await new Promise(r=>setTimeout(r,650));
   }finally{await lock.query('COMMIT');lock.release();}
   const receipt=await pending;assert.equal(receipt.status,'SUBMITTED');assert.equal(receipt.submittedLate,false);
   assert.ok(new Date(receipt.submittedAt)<new Date(receipt.appliedDeadlineAt));
   assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n,0);
   await rejected(()=>remove(confirmed.id),'CONFLICT');await rejected(()=>reserve(),'FORBIDDEN');
   const teacherReceipt=await service.assignmentSubmission(T,room,attempt.id);assert.equal(teacherReceipt.attachments.length,2);assert.equal(teacherReceipt.practicalResponse,'Respuesta propia de campo');
   assert.equal((await service.assignmentSubmissions(T,room,firstActivity)).submissions.length,1);
   assert.deepEqual((await files.read(T,confirmed.id)).bytes,bytes);await rejected(()=>service.assignmentSubmission(F,room,attempt.id),'FORBIDDEN');
  });
  await check('submitted written response is immutable and a reopened draft copies without rewriting historical text',async()=>{
   const original=attempt.id;
   await rejected(()=>service.savePracticalResponse(request(),room,original,{revision:attempt.revision,text:'rewrite submitted'}),'CONFLICT');
   const opened=await service.reopenActivity(T,room,firstActivity,{revision:(await service.detail(T,room)).revision,studentId:student,deadline:{local:new Date(Date.now()+120000).toISOString().slice(0,16)},confirm:true});
   const resumed=await service.transferAttemptEditor(S,room,opened.id,{revision:'0'});
   assert.equal(resumed.attempt.practicalResponse,'Respuesta propia de campo');
   const req={...S,headers:{'x-attempt-editor':resumed.editor.token,'x-attempt-epoch':resumed.editor.epoch}};
   await service.savePracticalResponse(req,room,opened.id,{revision:resumed.attempt.revision,text:'Nueva respuesta de reentrega'});
   assert.equal((await session()).attempt.practicalResponse,'Nueva respuesta de reentrega');
   assert.equal((await service.assignmentSubmission(T,room,original)).practicalResponse,'Respuesta propia de campo');
   await rejected(()=>service.assignmentSubmission(T,room,opened.id),'FORBIDDEN');
  });
  await check('optional attachment-free explicit receipt is not a grade and has no invented lateness',async()=>{
   const activity=await create(false),started=await service.startActivity(S,room,activity,{});
   await assert.rejects(() => pool.query("UPDATE attempts SET status='SUBMITTED',submitted_at=opened_at-interval '1 millisecond',submitted_late=false WHERE id=$1", [started.attempt.id]), e => e.code === '23514' && e.constraint === 'attempt_submission_check');
   assert.equal((await pool.query('SELECT status::text AS status FROM attempts WHERE id=$1',[started.attempt.id])).rows[0].status,'DRAFT');
   await waitForAttemptClock(started.attempt.openedAt);
   const send=()=>service.submitPracticalAttempt({...S,headers:{'x-attempt-editor':started.editor.token,'x-attempt-epoch':started.editor.epoch}},room,started.attempt.id,{revision:'0',confirm:true});
   const concurrent=await Promise.allSettled([send(),send()]);assert.equal(concurrent.filter(r=>r.status==='fulfilled').length,1);
   assert.equal(concurrent.find(r=>r.status==='rejected').reason.code,'CONFLICT');const result=concurrent.find(r=>r.status==='fulfilled').value;
   assert.equal(result.submittedLate,false);assert.equal(result.appliedDeadlineAt,null);assert.equal((await service.assignmentSubmission(T,room,started.attempt.id)).attachments.length,0);
  });
  await check('five allowed ZIP attachments of 50MB fit; PDF stops at 20MB and exact deadline equality is late or closed',async()=>{
   const activity=await create(true),started=await service.startActivity(S,room,activity,{});
   const req={...S,headers:{'x-attempt-editor':started.editor.token,'x-attempt-epoch':started.editor.epoch}};
   await rejected(()=>files.begin(req,{kind:'classroom',id:room},
    {purpose:'attachment',name:'oversize-document.pdf',bytes:20000001},started.attempt.id),'FILE_TOO_LARGE');
   const ids=[];
   for(let i=0;i<5;i++){
    const reserved=await files.begin(req,{kind:'classroom',id:room},{purpose:'attachment',name:`boundary-${i}.zip`,bytes:50000000},started.attempt.id);ids.push(reserved.id);
    // Explicit domain-only proof fixture: no claim that these 250MB passed actual storage/scanner.
    await files.store.transaction(async tx=>{
     await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid FOR UPDATE',room);
     await tx.query("UPDATE files SET validation_status='APPROVED',scan_status='CLEAN',validated_at=now(),scanned_at=now() WHERE id=$1::uuid RETURNING id",reserved.id);
     await tx.query("UPDATE uploads SET status='COMPLETED',completed_at=now(),reserved_bytes=0,reservation_released_at=now() WHERE file_id=$1::uuid RETURNING id",reserved.id);
     await tx.query("UPDATE file_custodies SET phase='ready',digest=$2,validated_digest=$2,scanned_digest=$2 WHERE file_id=$1::uuid RETURNING file_id",reserved.id,'a'.repeat(64));
     await linkReadyAttemptAttachment(tx,req,await files.store.load(tx,reserved.id));
    });
   }
   assert.equal((await pool.query('SELECT sum(size_bytes)::bigint n FROM files WHERE id=ANY($1::uuid[])',[ids])).rows[0].n,250000000n);
   const fixed=new Date('2030-01-01T18:00:00.000Z');await pool.query('UPDATE attempts SET individual_deadline_at=$2 WHERE id=$1',[started.attempt.id,fixed]);
   const originalNow=Date.now;try{Date.now=()=>+fixed;captureSubmissionReceipt(req);}finally{Date.now=originalNow;}
   const current=(await service.activitySession(S,room,activity)).attempt;
   await rejected(()=>service.submitPracticalAttempt(req,room,current.id,{revision:current.revision,confirm:true}),'CONFLICT');
   await pool.query('UPDATE activities SET allow_late_submissions=true WHERE id=$1',[activity]);
   const receipt=await service.submitPracticalAttempt(req,room,current.id,{revision:current.revision,confirm:true});
   assert.equal(+receipt.submittedAt,+fixed);assert.equal(+receipt.appliedDeadlineAt,+fixed);assert.equal(receipt.submittedLate,true);
   assert.equal((await service.assignmentSubmission(T,room,current.id)).attachments.length,5);
  });
 }); } finally { pg.types.setTypeParser(20,oldInt8); }
});
