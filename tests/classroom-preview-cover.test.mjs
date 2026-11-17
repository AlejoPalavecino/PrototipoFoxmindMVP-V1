import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
const roomId = '10000000-0000-4000-8000-000000000001';
const actor = { id: '20000000-0000-4000-8000-000000000002', account_role: 'student', email_normalized: 'synthetic@example.test', now: new Date('2026-11-16T12:00:00Z') };
const code = { id: '30000000-0000-4000-8000-000000000003', classroom_id: roomId, code_digest: 'synthetic' };
const room = { name: 'Aula sintética', subject: 'Arte', division: 'A', academic_year: 2026, teacher: 'Docente Demo', teacher_id: roomId, archived_at: null, cover_key: 'literature' };
function previewFixture(change = {}) {
  const calls = [], tokens = [];
  const tx = { query: async (sql, ...params) => {
    calls.push({ sql, params });
    if (sql.includes('code_digest=$1')) return change.missingCode ? [] : [code];
    if (sql.includes('SELECT c.*')) return [{ ...room, ...change.room }];
    if (sql.includes('FROM enrollments')) return change.enrolled ? [{ id: 'existing' }] : [];
    if (sql.includes('FROM classroom_codes')) return change.revoked ? [] : [code];
    if (sql.includes('clock_timestamp')) return [{ now: actor.now }];
    throw new Error('Unexpected SQL');
  } };
  return { calls, tokens, capability: { run: async (_request, write, work) => { assert.equal(write, true); return work(tx, { ...actor, ...change.actor }); }, tokens: { issue: value => { tokens.push(value); return 'confirmation'; } } } };
}
test('code preview returns the persisted cover and keeps confirmation scoped to actor/classroom', async () => {
  const { previewCodeOperation } = loadTsModule('apps/api/src/bootstrap/academic-management-composition.ts');
  const f = previewFixture();
  const result = await previewCodeOperation(f.capability, {}, '123456');
  assert.equal(result.classroom.coverKey, 'literature');
  assert.equal(result.confirmation, 'confirmation');
  assert.equal(f.tokens[0].actor, actor.id); assert.equal(f.tokens[0].classroomId, roomId);
  assert.equal(f.tokens[0].expires, actor.now.getTime() + 300000);
  assert.ok(f.calls.every(({ sql }) => !/INSERT|UPDATE classrooms SET/.test(sql)));
});
test('cover projection does not bypass code preview rejection paths or require legacy cover data', async () => {
  const { previewCodeOperation } = loadTsModule('apps/api/src/bootstrap/academic-management-composition.ts');
  for (const change of [{ actor: { account_role: 'teacher' } }, { missingCode: true }, { room: { archived_at: actor.now } }, { room: { teacher_id: actor.id } }, { enrolled: true }, { revoked: true }]) {
    const f = previewFixture(change);
    await assert.rejects(previewCodeOperation(f.capability, {}, '123456'), { code: 'ENROLLMENT_UNAVAILABLE' });
    assert.equal(f.tokens.length, 0);
  }
  const f = previewFixture({ room: { cover_key: undefined } });
  assert.equal(Object.hasOwn((await previewCodeOperation(f.capability, {}, '123456')).classroom, 'coverKey'), false);
});
test('pending invitations project the classroom cover with recipient, expiry and membership filters intact', async () => {
  const { createInvitationsRepository } = loadTsModule('apps/api/src/modules/classrooms/invitations/infrastructure/invitations-repository.ts');
  const { InvitationService } = loadTsModule('apps/api/src/modules/classrooms/invitations/application/invitations.ts');
  const calls = [], rows = [{ id: code.id, name: room.name, coverKey: room.cover_key }];
  const tx = { query: async (sql, ...params) => { calls.push({ sql, params }); return rows; } };
  const service = new InvitationService({ run: async (_req, write, work) => { assert.equal(write, false); return work(tx, actor); }, classroom() {} }, { enroll() {} }, createInvitationsRepository(), {});
  assert.deepEqual(await service.pendingInvitations({}), rows);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [actor.email_normalized, actor.id]);
  assert.match(calls[0].sql, /c\.cover_key AS "coverKey"/);
  for (const guard of ['i.recipient_email_normalized=$1', 'i.accepted_at IS NULL', 'i.revoked_at IS NULL', 'i.declined_at IS NULL', 'i.expires_at>clock_timestamp()', 'c.archived_at IS NULL', 'c.teacher_id<>$2::uuid', 'e.student_id=$2::uuid', 'm.ended_at>=i.issued_at']) assert.ok(calls[0].sql.includes(guard), guard);
});
