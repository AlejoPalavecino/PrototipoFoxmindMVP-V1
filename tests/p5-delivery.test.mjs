import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withP5Database} from '../scripts/p5-database.mjs';
import {FileStore} from '../.build/api/apps/api/src/files/store.js';
test('P5 durable encrypted invitation dispatch, restart, stale generation and retry',{timeout:120000},async t=>{
  await withP5Database(async({pool,database})=>{
    const {ClassroomService}=await import('../.build/api/apps/api/src/classrooms/service.js');
    const {InvitationDeliveryWorker}=await import('../.build/api/apps/api/src/classrooms/delivery.js');
    const owner=randomUUID(),room=randomUUID(),key=Buffer.alloc(32,5),sent=[];
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at)
      VALUES($1,now(),'teacher@example.test','teacher@example.test','Teacher','Fixture','fixture',now())`,[owner]);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Class','Subject','A',2026,'UTC','explore',100000000)`,[room,owner]);
    const authenticate=async(tx,req)=>req.actor,files=new FileStore(database,{authenticate,authorize:async()=>{}},100000000n);
    const service=new ClassroomService({database,authenticate,files,deliveryKey:key,signingKey:Buffer.alloc(32,9),
      classroomQuotaBytes:100000000n,webOrigin:'http://127.0.0.1:3005'});
    const invitation=await service.invite({actor:owner},room,'"Quoted User"@example.test');
    const job=(await pool.query("SELECT * FROM background_jobs WHERE type='p5.invitation'")).rows[0];
    await t.test('durable delivery payload contains no raw mailbox or classroom content',()=>{
      assert.ok(job.payload.envelope);assert.ok(!JSON.stringify(job.payload).includes('Quoted User'));
      assert.ok(!JSON.stringify(job.payload).includes('Class'));
    });
    await t.test('teacher invitation list preserves original quoted mailbox spelling for resend',async()=>{
      assert.equal((await service.listInvitations({actor:owner},room))[0].recipient,'"Quoted User"@example.test');
    });
    await t.test('worker reconstructed after service restart dispatches preserved original recipient once',async()=>{
      const worker=new InvitationDeliveryWorker({database,key,send:async(message)=>{sent.push(message);}});
      await worker.sweep();await worker.sweep();
      assert.equal(sent.length,1);assert.equal(sent[0].to,'"Quoted User"@example.test');
      assert.match(sent[0].text,/Registrate.*verificá/s);assert.match(sent[0].text,/aceptá/s);
      assert.equal((await pool.query('SELECT status FROM background_jobs WHERE id=$1',[job.id])).rows[0].status,'COMPLETED');
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM enrollments')).rows[0].n,0);
    });
    await t.test('resend supersedes old generation and revoke cancels queued dispatch',async()=>{
      await pool.query("UPDATE invitations SET issued_at=now()-interval '2 minutes' WHERE id=$1",[invitation.id]);
      await service.invite({actor:owner},room,'"Quoted User"@example.test');
      await pool.query("UPDATE background_jobs SET status='PENDING',completed_at=NULL,available_at=now() WHERE id=$1",[job.id]);
      const worker=new InvitationDeliveryWorker({database,key,send:async(message)=>{sent.push(message);}});
      await worker.sweep();assert.equal(sent.length,2);
      await service.invite({actor:owner},room,'revoked@example.test').then(async i=>service.revokeInvitation({actor:owner},room,i.id));
      await worker.sweep();assert.equal(sent.length,2);
    });
    await t.test('SMTP failure persists retry; a new worker retries without losing the invitation',async()=>{
      await service.invite({actor:owner},room,'retry@example.test');
      await new InvitationDeliveryWorker({database,key,send:async()=>{throw new Error('private SMTP diagnostic');}}).sweep();
      const failed=(await pool.query("SELECT * FROM background_jobs WHERE type='p5.invitation' AND status='PENDING'")).rows[0];
      assert.equal(failed.last_error_code,'P5_MAIL_UNAVAILABLE');assert.equal(failed.attempt_count,1);
      await pool.query('UPDATE background_jobs SET available_at=now() WHERE id=$1',[failed.id]);
      await new InvitationDeliveryWorker({database,key,send:async m=>sent.push(m)}).sweep();
      assert.equal(sent.at(-1).to,'retry@example.test');
    });
    await t.test('tampered encrypted job fails closed and never sends a plaintext fallback',async()=>{
      const i=await service.invite({actor:owner},room,'tamper@example.test');
      await pool.query("UPDATE background_jobs SET payload=jsonb_set(payload,'{envelope}','\"invalid\"') WHERE payload->>'invitationId'=$1",[i.id]);
      const before=sent.length;await new InvitationDeliveryWorker({database,key,send:async m=>sent.push(m)}).sweep();
      assert.equal(sent.length,before);
    });
  });
});
