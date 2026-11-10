import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { FileService } from '../.build/api/apps/api/src/modules/files/infrastructure/service.js';
import { createFileAccess } from '../.build/api/apps/api/src/modules/files/infrastructure/access.js';
import { FileError } from '../.build/api/apps/api/src/modules/files/domain/errors.js';

export async function verifyPromotion(t, { sql, options, users, sessions, bytes }) {
  const classroom = randomUUID(), draft = randomUUID();
  await sql.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
    VALUES($1,now(),$2,'Publication fixture','P4','A',2026,'America/Argentina/Buenos_Aires','fixture',$3)`, [classroom, users[0], bytes.length]);
  await sql.query(`INSERT INTO classroom_drafts(id,updated_at,owner_id) VALUES($1,now(),$2)`, [draft, users[0]]);
  const access = createFileAccess({ authenticate: options.access.authenticate, async authorizeAttemptWrite() { throw new FileError('FORBIDDEN'); } });
  const service = new FileService({ ...options, access }), actor = sessions[0];
  const draftScope = { kind: 'draft', id: draft }, classroomScope = { kind: 'classroom', id: classroom };
  const intent = { purpose: 'plan', name: 'retained-plan.pdf', bytes: bytes.length };
  const first = await service.begin(actor, draftScope, intent), second = await service.begin(actor, draftScope, intent);
  await service.receive(actor, first.id, bytes); await service.receive(actor, second.id, bytes);
  await t.test('draft plan promotion rejects unpublished/foreign targets and retains its bytes and quota', async () => {
    await assert.rejects(service.promoteDraftPlan(actor, first.id, classroom), { code: 'FORBIDDEN' });
    await sql.query('UPDATE classroom_drafts SET published_classroom_id=$2 WHERE id=$1', [draft, classroom]);
    await assert.rejects(service.promoteDraftPlan(sessions[2], first.id, classroom), { code: 'FORBIDDEN' });
    const before = (await sql.query('SELECT storage_key FROM files WHERE id=$1', [first.id])).rows[0].storage_key;
    await service.promoteDraftPlan(actor, first.id, classroom);
    const row = (await sql.query('SELECT classroom_id,classroom_draft_id,storage_key FROM files WHERE id=$1', [first.id])).rows[0];
    assert.deepEqual(row, { classroom_id: classroom, classroom_draft_id: null, storage_key: before });
    assert.deepEqual((await service.read(actor, first.id)).bytes, bytes);
    assert.equal((await service.usage(actor, classroomScope)).usedBytes, BigInt(bytes.length));
    assert.equal((await service.usage(actor, draftScope)).usedBytes, BigInt(bytes.length));
    await service.promoteDraftPlan(actor, first.id, classroom);
    assert.equal((await service.usage(actor, classroomScope)).usedBytes, BigInt(bytes.length));
  });
  await t.test('quota exhaustion and transaction rollback cannot partially move a confirmed draft plan', async () => {
    await assert.rejects(service.promoteDraftPlan(actor, second.id, classroom), { code: 'QUOTA_EXCEEDED' });
    await sql.query('UPDATE classrooms SET storage_quota_bytes=$2 WHERE id=$1', [classroom, bytes.length * 2]);
    await assert.rejects(service.store.transaction(async tx => {
      await service.promoteDraftPlanInTransaction(tx, actor, second.id, classroom);
      throw new Error('forced publication rollback');
    }), { code: 'SERVICE_UNAVAILABLE' });
    assert.equal((await service.usage(actor, draftScope)).usedBytes, BigInt(bytes.length));
    assert.equal((await service.usage(actor, classroomScope)).usedBytes, BigInt(bytes.length));
    await sql.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [classroom]);
    await assert.rejects(service.promoteDraftPlan(actor, second.id, classroom), { code: 'FORBIDDEN' });
    await sql.query('UPDATE classrooms SET archived_at=NULL WHERE id=$1', [classroom]);
    await service.promoteDraftPlan(actor, second.id, classroom);
    assert.equal((await service.usage(actor, draftScope)).usedBytes, 0n);
  });
  await t.test('database still rejects arbitrary reparenting and identity replacement after promotion', async () => {
    await assert.rejects(sql.query('UPDATE files SET classroom_draft_id=$2,classroom_id=NULL WHERE id=$1', [first.id, draft]), { code: '23514' });
    await assert.rejects(sql.query(`UPDATE files SET original_name='replacement.pdf' WHERE id=$1`, [first.id]), { code: '23514' });
  });
  await t.test('concurrent draft promotions reserve destination quota exactly once without weakening its SQL guard', async () => {
    const nextDraft = randomUUID(), nextClassroom = randomUUID();
    await sql.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Race fixture','P4','A',2026,'America/Argentina/Buenos_Aires','fixture',$3)`, [nextClassroom, users[0], bytes.length]);
    await sql.query('INSERT INTO classroom_drafts(id,updated_at,owner_id) VALUES($1,now(),$2)', [nextDraft, users[0]]);
    const plans = [];
    for (let n = 0; n < 2; n++) {
      const plan = await service.begin(actor, { kind: 'draft', id: nextDraft }, intent);
      await service.receive(actor, plan.id, bytes); plans.push(plan.id);
    }
    await sql.query('UPDATE classroom_drafts SET published_classroom_id=$2 WHERE id=$1', [nextDraft, nextClassroom]);
    const results = await Promise.allSettled(plans.map(id => service.promoteDraftPlan(actor, id, nextClassroom)));
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    assert.equal(results.find(r => r.status === 'rejected').reason.code, 'QUOTA_EXCEEDED');
    const remaining = plans[results.findIndex(r => r.status === 'rejected')];
    await assert.rejects(sql.query('UPDATE files SET classroom_id=$2,classroom_draft_id=NULL WHERE id=$1', [remaining, nextClassroom]), { code: '23514' });
    assert.equal((await service.usage(actor, { kind: 'classroom', id: nextClassroom })).usedBytes, BigInt(bytes.length));
    assert.equal((await service.usage(actor, { kind: 'draft', id: nextDraft })).usedBytes, BigInt(bytes.length));
  });
}
