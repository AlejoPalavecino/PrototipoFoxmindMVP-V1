import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { FileService } from '../.build/api/apps/api/src/files/service.js';
import { FileError } from '../.build/api/apps/api/src/files/errors.js';
import { createFileAccess } from '../.build/api/apps/api/src/files/access.js';

export async function verifyRecordAccess(t, { sql, options, users, sessions, classroom, bytes }) {
  const enrollment = randomUUID(), period = randomUUID(), activity = randomUUID(), studentActivity = randomUUID(), attempt = randomUUID();
  await sql.query('UPDATE sessions SET revoked_at=NULL WHERE id=$1', [sessions[1]]);
  await sql.query(`INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)`, [enrollment, classroom, users[1]]);
  await sql.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [period, enrollment, classroom]);
  const peerEnrollment = randomUUID();
  await sql.query(`INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)`, [peerEnrollment, classroom, users[2]]);
  await sql.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), peerEnrollment, classroom]);
  const unit = randomUUID(), topic = randomUUID();
  await sql.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Fixture unit',0)`, [unit, classroom]);
  await sql.query(`INSERT INTO topics(id,updated_at,unit_id,classroom_id,name,position) VALUES($1,now(),$2,$3,'Fixture topic',0)`, [topic, unit, classroom]);
  await sql.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,title,instructions_text,unit_id,topic_id)
    VALUES($1,now(),$2,'ASSIGNMENT','DRAFT','Private fixture','Fixture instructions',$3,$4)`, [activity, classroom, unit, topic]);
  await sql.query(`INSERT INTO student_activities(id,updated_at,classroom_id,enrollment_id,activity_id,is_expected,eligibility_reason,eligible_at)
    VALUES($1,now(),$2,$3,$4,true,'INITIAL_ENROLLMENT',now())`, [studentActivity, classroom, enrollment, activity]);
  await sql.query(`INSERT INTO attempts(id,updated_at,student_activity_id,activity_id,attempt_number) VALUES($1,now(),$2,$3,1)`, [attempt, studentActivity, activity]);
  let editorAllowed = true, editorChecks = 0;
  const access = createFileAccess({ authenticate: options.access.authenticate, async authorizeAttemptWrite(tx, userId, target, request) {
    assert.equal(request, sessions[1]); assert.equal(userId, users[1]); assert.equal(target.targetId, attempt);
    editorChecks++; if (!editorAllowed) throw new FileError('FORBIDDEN');
  } });
  const service = new FileService({ ...options, access }), scope = { kind: 'classroom', id: classroom };
  const intent = { purpose: 'material', name: 'visible.pdf', bytes: bytes.length };
  let material, instruction, attachment;
  await t.test('real record resolver grants students only linked material and revokes access with membership', async () => {
    material = await service.begin(sessions[0], scope, intent); await service.receive(sessions[0], material.id, bytes);
    await assert.rejects(service.read(sessions[1], material.id), { code: 'FORBIDDEN' });
    await sql.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id) VALUES($1,now(),$2,'Visible',$3,$4)`, [randomUUID(), classroom, material.id, users[0]]);
    assert.deepEqual((await service.read(sessions[1], material.id)).bytes, bytes);
    await sql.query(`UPDATE membership_periods SET ended_at=now(),end_reason='LEFT',ended_by_id=$2 WHERE id=$1`, [period, users[1]]);
    await assert.rejects(service.read(sessions[1], material.id), { code: 'FORBIDDEN' });
    await sql.query('UPDATE membership_periods SET ended_at=NULL,end_reason=NULL,ended_by_id=NULL WHERE id=$1', [period]);
  });
  await t.test('private activity instructions stay private until publication and lock after participation', async () => {
    instruction = await service.begin(sessions[0], scope, { ...intent, purpose: 'instructions' }, activity);
    await service.receive(sessions[0], instruction.id, bytes);
    await sql.query(`INSERT INTO activity_instruction_files(updated_at,activity_id,classroom_id,file_id) VALUES(now(),$1,$2,$3)`, [activity, classroom, instruction.id]);
    await assert.rejects(service.read(sessions[1], instruction.id), { code: 'FORBIDDEN' });
    await sql.query(`UPDATE activities SET status='PUBLISHED',published_at=now() WHERE id=$1`, [activity]);
    assert.deepEqual((await service.read(sessions[1], instruction.id)).bytes, bytes);
    await sql.query('UPDATE activities SET first_started_at=now() WHERE id=$1', [activity]);
    await assert.rejects(service.begin(sessions[0], scope, { ...intent, purpose: 'instructions' }, activity), { code: 'FORBIDDEN' });
    await assert.rejects(service.begin(sessions[0], scope, { ...intent, purpose: 'instructions' }, randomUUID()), { code: 'FORBIDDEN' });
  });
  await t.test('attempt attachments enforce real student ownership, private drafts and required editor authorization', async () => {
    editorAllowed = false;
    await assert.rejects(service.begin(sessions[1], scope, { ...intent, purpose: 'attachment' }, attempt), { code: 'FORBIDDEN' });
    editorAllowed = true;
    attachment = await service.begin(sessions[1], scope, { ...intent, purpose: 'attachment' }, attempt);
    await service.receive(sessions[1], attachment.id, bytes); assert.ok(editorChecks >= 4);
    assert.deepEqual((await service.read(sessions[1], attachment.id)).bytes, bytes);
    await assert.rejects(service.read(sessions[0], attachment.id), { code: 'FORBIDDEN' });
    await assert.rejects(service.read(sessions[2], attachment.id), { code: 'FORBIDDEN' });
    await sql.query(`INSERT INTO attempt_attachments(updated_at,attempt_id,activity_id,classroom_id,file_id,position) VALUES(now(),$1,$2,$3,$4,1)`, [attempt, activity, classroom, attachment.id]);
    await sql.query(`UPDATE attempts SET status='SUBMITTED',submitted_at=now(),submitted_late=false WHERE id=$1`, [attempt]);
    assert.deepEqual((await service.read(sessions[0], attachment.id)).bytes, bytes);
    await assert.rejects(service.begin(sessions[1], scope, { ...intent, purpose: 'attachment' }, attempt), { code: 'FORBIDDEN' });
  });
  await t.test('membership revoked during actual scan cannot confirm a student attachment', async () => {
    await sql.query(`UPDATE attempts SET status='DRAFT',submitted_at=NULL,submitted_late=NULL WHERE id=$1`, [attempt]);
    const start = await service.begin(sessions[1], scope, { ...intent, purpose: 'attachment' }, attempt);
    const revoked = new FileService({ ...options, access, scanner: { async scan(input) {
      await options.scanner.scan(input);
      await sql.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1`, [period, users[0]]);
    } } });
    await assert.rejects(revoked.receive(sessions[1], start.id, bytes), { code: 'FORBIDDEN' });
    await sql.query('UPDATE membership_periods SET ended_at=NULL,end_reason=NULL,ended_by_id=NULL WHERE id=$1', [period]);
    assert.equal((await service.status(sessions[1], start.id)).ready, false);
  });
}
