import test from 'node:test';
import assert from 'node:assert/strict';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';

test('participation public service extends all accepted classroom behavior', () => {
  for (const name of ['activitySession', 'startActivity', 'transferAttemptEditor', 'authorizeFirstSubmission', 'changeActivities', 'invite', 'changeWall'])
    assert.equal(typeof ClassroomService.prototype[name], 'function', name);
});
test('server receipt boundary, optional deadlines and later general extension are pure', async () => {
  const { receptionPolicy } = await import('../apps/api/src/classrooms/attempt-policy.ts');
  const deadline = new Date('2026-11-01T06:30:00Z');
  assert.deepEqual(receptionPolicy(null, null, false, deadline), { deadline: null, open: true, late: false });
  assert.deepEqual(receptionPolicy(deadline, null, false, new Date(+deadline - 1)), { deadline, open: true, late: false });
  assert.deepEqual(receptionPolicy(deadline, null, false, deadline), { deadline, open: false, late: true });
  assert.deepEqual(receptionPolicy(deadline, null, true, deadline), { deadline, open: true, late: true });
  const individual = new Date(+deadline + 1000), extension = new Date(+individual + 1000);
  assert.equal(+receptionPolicy(extension, individual, false, deadline).deadline, +extension);
  assert.equal(+receptionPolicy(deadline, individual, false, deadline).deadline, +individual);
});

import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { assertAttemptWrite } from '../.build/api/apps/api/src/classrooms/activity-participation.js';

test('transactional enrollment/publication, initial attempts and editor authorization on controlled SQL', {timeout:120000}, async t => {
  await withP5Database(async ({pool,database}) => {
    const teacher=randomUUID(),student=randomUUID(),lateStudent=randomUUID(),room=randomUUID(),unit=randomUUID(),topic=randomUUID();
    for(const id of [teacher,student,lateStudent]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,'Participation','Fixture','fixture',now())`,[id,`${id}@example.test`]);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Participation','Science','A',2026,'UTC','explore',100000000)`,[room,teacher]);
    await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`,[unit,room]);
    await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`,[topic,room,unit]);
    const authenticate=async(_tx,req)=>req.actor;
    const files=new FileStore(database,{authenticate,authorize:async()=>{}},100000000n);
    const service=new ClassroomService({database,files,authenticate,signingKey:Buffer.alloc(32,1),deliveryKey:Buffer.alloc(32,2),classroomQuotaBytes:100000000n,webOrigin:'http://127.0.0.1:3005'});
    const T={actor:teacher},S={actor:student},L={actor:lateStudent};
    const change=async operation=>service.changeActivities(T,room,{revision:(await service.detail(T,room)).revision,operation});
    const create=async(title,deadline=null,allowLate=false,type='ASSIGNMENT')=>{
      const {id}=await change({action:'create',type});
      await change({action:'save',id,payload:{title,unitId:unit,topicId:topic,instructions:'Instructions',attachmentRequired:false,
        instructionFileIds:[],materialIds:[],questions:type==='ASSIGNMENT'?[]:[{type:'DEVELOPMENT',prompt:'Explain',points:'1',scoringRule:null,options:[]}],deadline,allowLate}});
      await change({action:'publish',id});return id;
    };
    const join=async req=>{
      const {code}=await service.rotateCode(T,room),preview=await service.previewCode(req,code);
      return service.confirmCode(req,preview.confirmation);
    };
    const records=async req=>(await pool.query(`SELECT sa.* FROM student_activities sa JOIN enrollments e ON e.id=sa.enrollment_id WHERE e.student_id=$1 ORDER BY sa.activity_id`,[req.actor])).rows;
    const snapshot=async()=>JSON.stringify((await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(sa) ORDER BY id) FROM student_activities sa) obligations,
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM attempts a) attempts,
      (SELECT jsonb_agg(to_jsonb(a) ORDER BY id) FROM activities a) activities,
      (SELECT revision FROM classrooms WHERE id=$1) revision`,[room])).rows);
    const rejects=async(fn,code)=>{const before=await snapshot();await assert.rejects(fn,{code});assert.equal(await snapshot(),before);};
    let expired,open,quiz,first,transferred,absenceOpen,absenceExpired;
    await t.test('first code enrollment records undated/future expected and expired consultation even with late reception',async()=>{
      expired=await create('Expired',{local:'2020-01-01T18:00'},true);
      open=await create('Undated');quiz=await create('Quiz',null,false,'QUESTIONNAIRE');
      await join(S);
      const rows=await records(S);assert.equal(rows.length,3);
      assert.equal(rows.find(r=>r.activity_id===expired).is_expected,false);
      assert.equal(rows.find(r=>r.activity_id===open).is_expected,true);
      assert.ok(rows.every(r=>r.eligibility_reason==='INITIAL_ENROLLMENT'));
      assert.equal((await service.activitySession(S,room,expired)).canStart,true);
      assert.equal((await service.activitySession(S,room,expired)).activity.instructions,null);
      assert.equal((await service.activityDetail(S,room,expired)).activity.instructions,null);
      const before=await records(S);
      await change({action:'deadline',id:expired,deadline:{local:'2030-01-01T18:00'},allowLate:true});
      assert.deepEqual(await records(S),before,'General extension does not rewrite event decisions');
      await change({action:'withdraw',id:expired});await change({action:'publish',id:expired});
      assert.deepEqual(await records(S),before,'Republication never rewrites obligations');
    });
    await t.test('teacher preview and ordinary reads start nothing; only public explicit student start creates initial attempt and lock',async()=>{
      assert.equal((await service.activityDetail(T,room,open,true)).preview,true);
      assert.equal((await service.activityDetail(S,room,open)).activity.instructions,null);
      assert.equal((await service.activitySession(S,room,open)).activity.instructions,null);
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts')).rows[0].n,0);
      await rejects(()=>service.startActivity(T,room,open,{}),'FORBIDDEN');
      const started=await Promise.all([service.startActivity(S,room,open,{}),service.startActivity(S,room,open,{})]);
      first=started.find(s=>s.editor);assert.ok(first.editor);assert.equal(started.filter(s=>s.editor).length,1);
      assert.equal(started[0].attempt.id,started[1].attempt.id);assert.equal(first.attempt.number,1);
      assert.equal(first.activity.instructions,'Instructions');assert.equal(first.activity.locked,true);
      const stored=(await pool.query('SELECT * FROM attempts WHERE id=$1',[first.attempt.id])).rows[0];
      assert.notEqual(stored.editor_token_hash,first.editor.token);assert.equal(stored.editor_epoch,'1');
      const consult=await service.activitySession(S,room,open);assert.equal(consult.editor,undefined);
      assert.equal((await service.startActivity(S,room,open,{})).editor,undefined);
      assert.equal((await service.activityDetail(S,room,open)).activity.instructions,'Instructions');
      await rejects(()=>change({action:'withdraw',id:open}),'CONFLICT');
      assert.equal((await service.activitySession(S,room,quiz)).attempt,null,'Question consultation never starts');
      for(const key of ['correct','scoringRule','editor_token_hash','effective_grade_id'])assert.ok(!JSON.stringify(consult).includes(`"${key}"`));
    });
    const write=(editor,expected,actor=student)=>database.$transaction(async raw=>assertAttemptWrite({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},actor,room,first.attempt.id,editor,expected));
    await t.test('explicit transfer keeps identity, rotates hash/epoch and rejects old writes separately from revision conflicts',async()=>{
      await write(first.editor,first.attempt.revision);
      await rejects(()=>service.transferAttemptEditor(S,room,first.attempt.id,{revision:'99'}),'CONFLICT');
      transferred=await service.transferAttemptEditor(S,room,first.attempt.id,{revision:first.attempt.revision});
      assert.equal(transferred.attempt.id,first.attempt.id);assert.equal(transferred.attempt.number,1);
      assert.notEqual(transferred.editor.token,first.editor.token);assert.equal(transferred.editor.epoch,'2');
      assert.equal(transferred.attempt.revision,'1');assert.deepEqual(transferred.attempt.answers,[]);
      await rejects(()=>write(first.editor),'FORBIDDEN');await write(transferred.editor,'1');
      await rejects(()=>write(transferred.editor,'0'),'CONFLICT');
      await rejects(()=>write(transferred.editor,undefined,lateStudent),'FORBIDDEN');
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts')).rows[0].n,1);
    });
    await t.test('first authorization is teacher/current-roster scoped and future individual deadline creates no fictitious attempt',async()=>{
      const authorize=(req,deadline)=>service.authorizeFirstSubmission(req,room,expired,{revision:undefined,studentId:student,deadline});
      const body=async deadline=>({revision:(await service.detail(T,room)).revision,studentId:student,deadline});
      await rejects(async()=>service.authorizeFirstSubmission(S,room,expired,await body({local:'2031-01-01T12:00'})),'FORBIDDEN');
      await rejects(async()=>service.authorizeFirstSubmission(T,room,expired,await body({local:'2020-01-01T12:00'})),'INVALID_INPUT');
      await service.authorizeFirstSubmission(T,room,expired,await body({local:'2031-01-01T12:00'}));
      const row=(await records(S)).find(r=>r.activity_id===expired);assert.equal(row.is_expected,true);
      assert.equal(row.eligibility_reason,'TEACHER_AUTHORIZATION');assert.equal(row.authorized_by_id,teacher);assert.ok(row.eligible_at);
      assert.equal((await service.activitySession(S,room,expired)).attempt,null);
      assert.equal((await service.activitySession(S,room,expired)).canStart,true);
      await change({action:'deadline',id:expired,deadline:{local:'2032-01-01T12:00'},allowLate:true});
      assert.equal((await service.activitySession(S,room,expired)).reception.deadlineAt.toISOString(),'2032-01-01T12:00:00.000Z');
    });
    await t.test('departure/reentry preserves old obligations and records absence activities only at actual joined event',async()=>{
      const before=await records(S);await service.leave(S,room);
      await rejects(()=>service.activitySession(S,room,open),'FORBIDDEN');await rejects(()=>write(transferred.editor),'FORBIDDEN');
      absenceOpen=await create('During absence open');absenceExpired=await create('During absence expired',{local:'2020-01-01T12:00'},true);
      assert.equal((await records(S)).length,before.length);
      const invitation=await service.invite(T,room,`${student}@example.test`);await service.acceptInvitation(S,invitation.id);
      const after=await records(S);for(const prior of before)assert.deepEqual(after.find(r=>r.id===prior.id),prior);
      assert.equal(after.find(r=>r.activity_id===absenceOpen).is_expected,true);
      assert.equal(after.find(r=>r.activity_id===absenceExpired).is_expected,false);
      assert.equal(after.find(r=>r.activity_id===absenceOpen).eligibility_reason,'REENTRY');
      assert.ok((await pool.query("SELECT count(*)::int n FROM background_jobs WHERE type='p5.membership'")).rows[0].n>=3);
      await write(transferred.editor);
    });
    await t.test('deadline observed after classroom lock wait rejects a new start at current receipt time',async()=>{
      const waiting=await create('Lock-time boundary',null,false,'QUESTIONNAIRE');
      const lock=await pool.connect();await lock.query('BEGIN');await lock.query('SELECT id FROM classrooms WHERE id=$1 FOR UPDATE',[room]);
      await lock.query("UPDATE activities SET deadline_at=clock_timestamp()+interval '100 milliseconds',allow_late_submissions=false WHERE id=$1",[waiting]);
      const result=service.startActivity(S,room,waiting,{}).then(()=>null,error=>error);
      await lock.query('SELECT pg_sleep(0.2)');await lock.query('COMMIT');lock.release();
      assert.equal((await result)?.code,'CONFLICT');
      assert.equal((await pool.query('SELECT count(*)::int n FROM attempts WHERE activity_id=$1',[waiting])).rows[0].n,0);
    });
    await t.test('closed expected TP still opens instructions read-only and locks content without reserving reception',async()=>{
      const closed=await create('Closed TP consultation');
      await pool.query("UPDATE activities SET deadline_at=clock_timestamp()-interval '1 second',allow_late_submissions=false WHERE id=$1",[closed]);
      const opened=await service.startActivity(S,room,closed,{});
      assert.equal(opened.reception.open,false);assert.equal(opened.editor,undefined);assert.equal(opened.canTransfer,false);
      assert.equal(opened.attempt.status,'DRAFT');assert.equal(opened.attempt.epoch,'0');assert.equal(opened.attempt.submittedAt,null);
      assert.equal(opened.activity.instructions,'Instructions');assert.equal(opened.activity.locked,true);assert.equal(opened.expected,true);
      const prior=(await records(S)).find(r=>r.activity_id===closed);assert.equal(prior.is_expected,true);
      const row=(await pool.query('SELECT * FROM attempts WHERE id=$1',[opened.attempt.id])).rows[0];assert.equal(row.editor_token_hash,null);
      await rejects(()=>service.transferAttemptEditor(S,room,opened.attempt.id,{revision:opened.attempt.revision}),'CONFLICT');
      await rejects(()=>change({action:'withdraw',id:closed}),'CONFLICT');
      await change({action:'deadline',id:closed,deadline:{local:'2033-01-01T12:00'},allowLate:false});
      assert.equal((await service.activitySession(S,room,closed)).canTransfer,true);
      const granted=await service.transferAttemptEditor(S,room,opened.attempt.id,{revision:opened.attempt.revision});assert.ok(granted.editor);
      assert.equal(granted.attempt.id,opened.attempt.id);
    });
    await t.test('archive retains consultation but rejects transfers and writes; submitted snapshot is not rewritten',async()=>{
      const unread=await create('Archived unread TP');
      await service.setArchive(T,room,{revision:(await service.detail(T,room)).revision,archived:true});
      assert.equal((await service.activitySession(S,room,open)).archived,true);
      const archivedUnread=await service.activitySession(S,room,unread);assert.equal(archivedUnread.activity.instructions,'Instructions');assert.equal(archivedUnread.attempt,null);
      assert.equal((await service.activityDetail(S,room,unread)).activity.instructions,'Instructions');
      await rejects(()=>service.transferAttemptEditor(S,room,first.attempt.id,{revision:'1'}),'CONFLICT');
      await rejects(()=>write(transferred.editor),'CONFLICT');
      await service.setArchive(T,room,{revision:(await service.detail(T,room)).revision,archived:false});
      await pool.query(`UPDATE attempts SET status='SUBMITTED',submitted_at=clock_timestamp(),submitted_late=false WHERE id=$1`,[first.attempt.id]);
      const before=(await pool.query('SELECT * FROM attempts WHERE id=$1',[first.attempt.id])).rows;
      const submitted=await service.startActivity(S,room,open,{});assert.equal(submitted.attempt.status,'SUBMITTED');assert.equal(submitted.canTransfer,false);
      await rejects(()=>write(transferred.editor),'CONFLICT');
      assert.deepEqual((await pool.query('SELECT * FROM attempts WHERE id=$1',[first.attempt.id])).rows,before);
      await join(L);assert.equal((await service.activitySession(L,room,absenceExpired)).expected,false);
    });
  });
});
