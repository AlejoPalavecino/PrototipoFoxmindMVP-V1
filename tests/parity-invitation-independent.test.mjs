import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';
import { InvitationDeliveryWorker } from '../.build/api/apps/api/src/bootstrap/academic-delivery-composition.js';
import { readParticipation } from '../.build/api/apps/api/src/modules/home/infrastructure/queries-participation.js';

async function arrange(local) {
  const f = await fixture(local);
  const actor = randomUUID(), email = `${actor}@example.test`, student = { actor };
  await local.pool.query(`INSERT INTO users
    (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Synthetic','Recipient','fixture',now(),'student')`, [actor, email]);
  const invite = () => f.classrooms.invite(f.T, f.room, email);
  const first = await invite();
  return { ...f, actor, email, student, invite, first };
}

test('declined invitations keep history, permit reinvitation and do not block leaving', { timeout: 120000 }, () =>
  withAiDatabase(({ pool }) => rollbackCase(pool, async local => {
    const { classrooms, room, T, S, student, invite, first } = await arrange(local);
    await assert.rejects(classrooms.declineInvitation(T, first.id), { code: 'ENROLLMENT_UNAVAILABLE' });
    await assert.rejects(classrooms.declineInvitation(S, first.id), { code: 'ENROLLMENT_UNAVAILABLE' });
    assert.deepEqual(await classrooms.declineInvitation(student, first.id), { ok: true });
    assert.deepEqual(await classrooms.declineInvitation(student, first.id), { ok: true });
    assert.deepEqual(await classrooms.pendingInvitations(student), []);
    await assert.rejects(classrooms.acceptInvitation(student, first.id), { code: 'ENROLLMENT_UNAVAILABLE' });
    await assert.rejects(classrooms.revokeInvitation(T, room, first.id), { code: 'ENROLLMENT_UNAVAILABLE' });
    const second = await invite();
    assert.notEqual(first.id, second.id);
    assert.deepEqual(await classrooms.acceptInvitation(student, second.id), { id: room });
    assert.deepEqual(await classrooms.leave(student, room, { confirm: true }), { ok: true });
    const { rows } = await local.pool.query(`SELECT declined_at,accepted_at,revoked_at
      FROM invitations WHERE id=$1`, [first.id]);
    assert.ok(rows[0].declined_at);
    assert.equal(rows[0].accepted_at, null);
    assert.equal(rows[0].revoked_at, null);
  })));

test('declined invitations leave the Home count and queued mail becomes stale', { timeout: 120000 }, () =>
  withAiDatabase(({ pool }) => rollbackCase(pool, async local => {
    const { classrooms, actor, student, first } = await arrange(local);
    const participation = () => local.database.$transaction(raw =>
      readParticipation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }, actor));
    assert.equal((await participation()).setup.invitations, 1);
    await classrooms.declineInvitation(student, first.id);
    const sends = [];
    const worker = new InvitationDeliveryWorker({ database: local.database, key: Buffer.alloc(32, 2),
      send: async message => { sends.push(message); } });
    await worker.sweep();
    const result = await participation();
    assert.deepEqual({ count: result.setup.invitations, sent: sends.length }, { count: 0, sent: 0 });
    const { rows } = await local.pool.query(`SELECT last_error_code FROM background_jobs
      WHERE payload->>'invitationId'=$1`, [first.id]);
    assert.equal(rows[0].last_error_code, 'P5_INVITATION_STALE');
  })));

