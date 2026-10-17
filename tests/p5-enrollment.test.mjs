import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withP5Database} from '../scripts/p5-database.mjs';
import {FileStore} from '../.build/api/apps/api/src/files/store.js';
const denied=(p,code)=>assert.rejects(p,e=>e.code===code);
test('P5 enrollment, invitation, privacy and membership lifecycle on real SQL',{timeout:120000},async t=>{
  await withP5Database(async({pool,database})=>{
    const {ClassroomService}=await import('../.build/api/apps/api/src/classrooms/service.js');
    const teacher=randomUUID(),student=randomUUID(),stranger=randomUUID(),otherRoom=randomUUID(),room=randomUUID();
    for(const [id,first]of [[teacher,'Teacher'],[student,'Student'],[stranger,'Other']])await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),$2,$2,$3,'Fixture','fixture',now())`,[id,`${id}@example.test`,first]);
    for(const [id,owner]of [[room,teacher],[otherRoom,stranger]])await pool.query(`INSERT INTO classrooms
      (id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Class','Subject','A',2026,'UTC','explore',100000000)`,[id,owner]);
    const authenticate=async(tx,req)=>req.actor;
    const files=new FileStore(database,{authenticate,authorize:async()=>{}},100000000n);
    const service=new ClassroomService({database,authenticate,files,classroomQuotaBytes:100000000n,
      signingKey:Buffer.alloc(32,1),deliveryKey:Buffer.alloc(32,2),webOrigin:'http://127.0.0.1:3005'});
    const T={actor:teacher},S={actor:student},O={actor:stranger};let code,preview,invite;
    await t.test('only classroom teacher can issue a code; own teacher cannot enroll',async()=>{
      await denied(service.rotateCode(O,room),'FORBIDDEN');
      code=(await service.rotateCode(T,room)).code;
      await denied(service.previewCode(T,code),'ENROLLMENT_UNAVAILABLE');
    });
    await t.test('preview discloses only approved metadata and grants no classroom access',async()=>{
      preview=await service.previewCode(S,code);
      assert.deepEqual(Object.keys(preview.classroom).sort(),['academicYear','division','name','subject','teacher']);
      await denied(service.detail(S,room),'FORBIDDEN');
      await denied(service.confirmCode(O,preview.confirmation),'ENROLLMENT_UNAVAILABLE');
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n,0);
    });
    await t.test('rotation invalidates prior code and its actor-bound confirmation',async()=>{
      const old=code;code=(await service.rotateCode(T,room)).code;
      await denied(service.previewCode(S,old),'ENROLLMENT_UNAVAILABLE');
      await denied(service.confirmCode(S,preview.confirmation),'ENROLLMENT_UNAVAILABLE');
      preview=await service.previewCode(S,code);
    });
    await t.test('parallel explicit confirmation creates exactly one membership',async()=>{
      const result=await Promise.allSettled([service.confirmCode(S,preview.confirmation),service.confirmCode(S,preview.confirmation)]);
      assert.equal(result.filter(r=>r.status==='fulfilled').length,1);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM membership_periods')).rows[0].n,1);
      assert.equal((await service.mine(S)).study.length,1);
    });
    await t.test('student classmates expose names only; other classroom access stays forbidden',async()=>{
      assert.deepEqual(await service.members(S,room),[{firstName:'Student',lastName:'Fixture'}]);
      await denied(service.members(S,otherRoom),'FORBIDDEN');
      await denied(service.members(S,room,true),'FORBIDDEN');
      await denied(service.invite(S,room,`${stranger}@example.test`),'FORBIDDEN');
    });
    await t.test('archive preserves read access but denies every membership and invitation mutation',async()=>{
      const detail=await service.detail(T,room);
      await service.setArchive(T,room,{archived:true,revision:detail.revision});
      assert.equal((await service.detail(S,room)).archived,true);
      await denied(service.leave(S,room),'CONFLICT');
      await denied(service.remove(T,room,student),'CONFLICT');
      await denied(service.rotateCode(T,room),'CONFLICT');
      await denied(service.invite(T,room,`${stranger}@example.test`),'CONFLICT');
      await denied(service.setArchive(S,room,{archived:false,revision:'1'}),'FORBIDDEN');
      await service.setArchive(T,room,{archived:false,revision:'1'});
    });
    await t.test('leave revokes access without deleting enrollment; code cannot restore it',async()=>{
      await service.leave(S,room);
      await denied(service.detail(S,room),'FORBIDDEN');
      await denied(service.previewCode(S,code),'ENROLLMENT_UNAVAILABLE');
      assert.equal((await service.members(T,room)).length,0);
      assert.equal((await service.members(T,room,true)).length,1);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n,1);
    });
    await t.test('invitation requires matching verified account and explicit acceptance; resend deduplicates',async()=>{
      invite=await service.invite(T,room,`${student}@example.test`);
      assert.equal((await service.mine(S)).study.length,0);
      assert.equal((await service.pendingInvitations(S)).length,1);
      await denied(service.acceptInvitation(O,invite.id),'ENROLLMENT_UNAVAILABLE');
      await denied(service.invite(T,room,`${student}@example.test`),'CONFLICT');
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM invitations WHERE revoked_at IS NULL')).rows[0].n,1);
      await service.acceptInvitation(S,invite.id);
      assert.equal((await service.members(T,room)).length,1);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n,1);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM membership_periods')).rows[0].n,2);
    });
    await t.test('teacher removal retains periods and old invitations cannot restore membership',async()=>{
      await service.remove(T,room,student);
      await denied(service.acceptInvitation(S,invite.id),'ENROLLMENT_UNAVAILABLE');
      await denied(service.previewCode(S,code),'ENROLLMENT_UNAVAILABLE');
      const periods=(await service.members(T,room,true))[0].periods;
      assert.equal(periods.length,2);assert.equal(periods[1].endReason,'REMOVED');
    });
    await t.test('expired/revoked invitations cannot enroll and renewal retains one pending record',async()=>{
      invite=await service.invite(T,room,`${student}@example.test`);
      await pool.query("UPDATE invitations SET issued_at=now()-interval '8 days',expires_at=now()-interval '1 day' WHERE id=$1",[invite.id]);
      await denied(service.acceptInvitation(S,invite.id),'ENROLLMENT_UNAVAILABLE');
      const resent=await service.invite(T,room,`${student}@example.test`);
      assert.equal(resent.id,invite.id);assert.equal(resent.generation,'2');
      await service.revokeInvitation(T,room,invite.id);
      await denied(service.acceptInvitation(S,invite.id),'ENROLLMENT_UNAVAILABLE');
      assert.equal((await service.pendingInvitations(S)).length,0);
    });
    await t.test('settings reject timezone/owner changes and stale revisions',async()=>{
      const row=await service.detail(T,room);
      await denied(service.updateSettings(T,room,{revision:row.revision,name:'N',subject:'S',division:'D',academicYear:2027,timezone:'Europe/Paris'}),'INVALID_INPUT');
      await service.updateSettings(T,room,{revision:row.revision,name:'N',subject:'S',division:'D',academicYear:2027});
      await denied(service.updateSettings(T,room,{revision:row.revision,name:'Stale',subject:'S',division:'D',academicYear:2027}),'CONFLICT');
      await assert.rejects(pool.query("UPDATE classrooms SET timezone='Europe/Paris' WHERE id=$1",[room]));
    });
  });
});
