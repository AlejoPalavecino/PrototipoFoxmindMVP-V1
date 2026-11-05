import test from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {withGradingFixture} from './p8-grading-helpers.mjs';import {saveComplete,publish} from './p8-publication-helpers.mjs';
import {loadTsModule} from './helpers/load-ts-module.mjs';import {deferred} from './agenda-ui-helpers.test.mjs';

test('read-all is atomic for121+, idempotent and excludes other actors/revoked/invalid targets after ordered room locks', {timeout:120000},async()=>{
 const {WallService}=loadTsModule('apps/api/src/classrooms/wall.ts');assert.equal(typeof WallService.prototype.readAllNotifications,'function');
 const {ClassroomCore}=loadTsModule('apps/api/src/classrooms/context.ts');
 await withGradingFixture(async f=>{
  const makeService=(database=f.database)=>new WallService(new ClassroomCore({...f.ports,database}),{advanceRevision(){throw new Error('read-all must not advance classroom revision');}});
  const service=makeService(),activity=await f.create('ASSIGNMENT');await publish(f,activity.attempt,await saveComplete(f,activity.attempt));
  const post=randomUUID(),other=randomUUID(),invalid=randomUUID(),revoked=randomUUID(),revokedRoom=randomUUID(),enrollment=randomUUID(),period=randomUUID();
  await f.pool.query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body) VALUES($1,now(),$2,$3,'NOTICE','Synthetic')`,[post,f.room,f.teacher]);
  await f.pool.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id) SELECT gen_random_uuid(),now(),$1,$2,'WALL_NOTICE',$3 FROM generate_series(1,121)`,[f.student,f.room,post]);
  await f.pool.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id) VALUES($1,now(),$2,$3,'WALL_NOTICE',$4),($5,now(),$6,$3,'WALL_REPLY',$4)`,[other,f.peer,f.room,post,invalid,f.student]);
  await f.pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes) VALUES($1,now(),$2,'Revoked','Science','A',2026,'UTC','explore',100000000)`,[revokedRoom,f.teacher]);
  await f.pool.query(`INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)`,[enrollment,revokedRoom,f.student]);
  await f.pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method,joined_at,ended_at,end_reason,ended_by_id) VALUES($1,now(),$2,$3,'CODE',now()-interval '1 day',now(),'REMOVED',$4)`,[period,enrollment,revokedRoom,f.teacher]);
  const revokedPost=randomUUID();await f.pool.query(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body) VALUES($1,now(),$2,$3,'NOTICE','Revoked')`,[revokedPost,revokedRoom,f.teacher]);
  await f.pool.query(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id) VALUES($1,now(),$2,$3,'WALL_NOTICE',$4)`,[revoked,f.student,revokedRoom,revokedPost]);
  // Readability of archived classrooms is deliberately retained by the batch.
  await f.pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1',[f.room]);
  const visible=await service.listNotificationPage(f.S);assert.ok(visible.unreadCount>=123);
  const excluded=[other,invalid,revoked];
  await f.pool.query(`CREATE FUNCTION brujula_batch_abort() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF OLD.recipient_id='${f.student}'::uuid AND OLD.event_type='WALL_NOTICE' THEN RAISE EXCEPTION 'synthetic rollback'; END IF; RETURN NEW; END $$; CREATE TRIGGER brujula_batch_abort BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION brujula_batch_abort()`);
  await assert.rejects(()=>service.readAllNotifications(f.S),{code:'SERVICE_UNAVAILABLE'});assert.equal((await service.listNotificationPage(f.S)).unreadCount,visible.unreadCount);
  await f.pool.query('DROP TRIGGER brujula_batch_abort ON notifications; DROP FUNCTION brujula_batch_abort()');
  const budget=async()=>Number((await f.pool.query(`SELECT request_count FROM account_action_controls WHERE action='p5-mutation' AND subject_key=$1`,[f.student])).rows[0]?.request_count??0);
  const beforeBudget=await budget();const first=await service.readAllNotifications(f.S);assert.deepEqual(first,{read:true,updatedCount:visible.unreadCount});assert.equal(await budget(),beforeBudget+1);
  const stamps=(await f.pool.query('SELECT id,read_at,updated_at FROM notifications WHERE recipient_id=$1 AND read_at IS NOT NULL ORDER BY id',[f.student])).rows;
  assert.equal((await service.listNotificationPage(f.S)).unreadCount,0);assert.deepEqual(await service.readAllNotifications(f.S),{read:true,updatedCount:0});assert.deepEqual((await f.pool.query('SELECT id,read_at,updated_at FROM notifications WHERE recipient_id=$1 AND read_at IS NOT NULL ORDER BY id',[f.student])).rows,stamps);
  assert.ok((await f.pool.query('SELECT read_at FROM notifications WHERE id=ANY($1::uuid[])',[excluded])).rows.every(row=>row.read_at===null));
  assert.deepEqual(await service.readAllNotifications(f.F),{read:true,updatedCount:0});assert.ok((await f.pool.query('SELECT read_at FROM notifications WHERE id=ANY($1::uuid[])',[excluded])).rows.every(row=>row.read_at===null));
  // Pause after authorized discovery while another transaction holds the standard room lock.
  await f.pool.query('UPDATE membership_periods SET ended_at=NULL,end_reason=NULL,ended_by_id=NULL WHERE id=$1',[period]);
  const blocker=await f.pool.connect();const discovered=deferred();
  await blocker.query('BEGIN');await blocker.query('SELECT id FROM classrooms WHERE id=$1 FOR UPDATE',[revokedRoom]);
  const database={$transaction:(operation,options)=>f.database.$transaction(raw=>operation({$queryRawUnsafe:async(sql,...args)=>{const result=await raw.$queryRawUnsafe(sql,...args);if(sql.includes('SELECT DISTINCT visible."classroomId"'))discovered.resolve();return result;}}),options)};
  const pending=makeService(database).readAllNotifications(f.S);
  try{await discovered.promise;await blocker.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1`,[period,f.teacher]);await blocker.query('COMMIT');assert.deepEqual(await pending,{read:true,updatedCount:0});assert.equal((await f.pool.query('SELECT read_at FROM notifications WHERE id=$1',[revoked])).rows[0].read_at,null);}finally{await blocker.query('ROLLBACK');blocker.release();}
 });
});
