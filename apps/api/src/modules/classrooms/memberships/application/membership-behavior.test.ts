import test from 'node:test';
import assert from 'node:assert/strict';
import { createMembershipCodeOperations } from './membership-code-operations.ts';
import { createMembershipLifecycleOperations } from './membership-lifecycle-operations.ts';
const classroomId = '11111111-1111-4111-8111-111111111111';
const codeId = '22222222-2222-4222-8222-222222222222';
const studentId = '33333333-3333-4333-8333-333333333333';

test('code confirmation keeps classroom/code/enrollment order and repeats token check at DB time', async () => {
 for (const archived of [false, true]) {
  const tx = {}, events: string[] = [], now = new Date('2026-01-01');
  const record = (name: string, rows: unknown[]) => async (seen: unknown) => { assert.equal(seen, tx); events.push(name); return rows; };
  const repository = { lockConfirmationClassroom: record('classroom-lock', [{ teacher_id: 'teacher', archived_at: archived ? now : null }]),
   findConfirmationCode: record('code', [{ id: codeId }]), findConfirmationEnrollment: record('enrollment', []), readConfirmationTime: record('clock', [{ now }]) };
  const capability = { run: async (_: unknown, write: boolean, action: Function) => { assert.equal(write, true); return action(tx, { id: studentId, account_role: 'student', now }); },
   tokens: { read: (_: unknown, actor: string, time: number) => { assert.equal(actor, studentId); assert.equal(time, now.getTime()); events.push('token'); return { classroomId, codeId, digest: 'digest' }; } },
   enroll: async (seen: unknown, _actor: unknown, id: string, invitation: null) => { assert.equal(seen, tx); assert.equal(id, classroomId); assert.equal(invitation, null); events.push('enroll'); } };
  const operations = createMembershipCodeOperations(repository as any, { digest: value => value });
  const call = operations.confirmCodeOperation(capability as any, {}, 'confirmation');
  if (archived) await assert.rejects(call, { code: 'ENROLLMENT_UNAVAILABLE' }); else assert.deepEqual(await call, { id: classroomId });
  assert.deepEqual(events, ['token', 'classroom-lock', 'code', 'enrollment', 'clock', 'token', ...(archived ? [] : ['enroll'])]);
 }
});
test('membership departure permits archived self-leave and revokes invitations before the event', async () => {
 const tx = {}, events: string[] = [];
 const repository = { lockActivePeriod: async (seen: unknown) => { assert.equal(seen, tx); events.push('period-lock'); return [{ id: 'period', enrollment_id: 'enrollment' }]; },
  endPeriod: async (seen: unknown, input: unknown) => { assert.equal(seen, tx); assert.deepEqual(input, { periodId: 'period', reason: 'LEFT', actorId: studentId }); events.push('end'); },
  revokePendingInvitations: async (seen: unknown) => { assert.equal(seen, tx); events.push('revoke'); } };
 const capability = { run: async (_: unknown, _write: boolean, action: Function) => action(tx, { id: studentId }),
  classroom: async (...args: unknown[]) => { assert.deepEqual(args, [tx, { id: studentId }, classroomId, false, false]); events.push('classroom'); return { teacher_id: 'teacher', archived_at: new Date() }; },
  membershipEvent: async (seen: unknown, enrollment: string, period: string, event: string) => { assert.equal(seen, tx); assert.deepEqual([enrollment, period, event], ['enrollment', 'period', 'left']); events.push('event'); } };
 await createMembershipLifecycleOperations(repository as any).endMembershipOperation(capability as any, {}, classroomId, null);
 assert.deepEqual(events, ['classroom', 'period-lock', 'end', 'revoke', 'event']);
});
test('student member view excludes private email and historical periods', async () => {
 const tx = {};
 const repository = { listMembers: async () => [{ enrollment_id: 'e', student_id: studentId, first_name: 'A', last_name: 'B', email: 'private@example.test', active: true },
  { enrollment_id: 'old', student_id: 'other', first_name: 'C', last_name: 'D', email: 'old@example.test', active: false }],
  listPeriods: async () => { throw Error('Student cannot read periods'); } };
 const capability = { run: async (_: unknown, _write: boolean, action: Function) => action(tx, { id: studentId }), classroom: async () => ({ teacher_id: 'teacher' }) };
 assert.deepEqual(await createMembershipLifecycleOperations(repository as any).membersOperation(capability as any, {}, classroomId), [{ firstName: 'A', lastName: 'B', isSelf: true }]);
});
test('code misses limit each student and only legacy 6-digit guesses share the global ceiling', async () => {
 const windows = new Map<string, number>();
 const repository = {
  readCodeFailures: async (_tx: unknown, input: { subject: string }) => [{ failures: windows.get(input.subject) ?? 0, retry_after: 60 }],
  recordCodeFailure: async (_tx: unknown, input: { subject: string }) => { windows.set(input.subject, (windows.get(input.subject) ?? 0) + 1); return []; },
  findLiveCode: async () => [],
 };
 const capability = (id: string) => ({ run: async (_: unknown, _write: boolean, action: Function) => action({}, { id, account_role: 'student', now: new Date() }) });
 const operations = createMembershipCodeOperations(repository as any, { digest: value => value });
 const preview = (id: string, code: string) => operations.previewCodeOperation(capability(id) as any, {}, code);
 const first = '44444444-4444-4444-8444-444444444444', second = '55555555-5555-4555-8555-555555555555';
 for (let n = 0; n < 20; n++) await assert.rejects(preview(first, 'ABCD-EFGH'), { code: 'ENROLLMENT_UNAVAILABLE' });
 await assert.rejects(preview(first, 'ABCD-EFGH'), { code: 'RATE_LIMITED' });
 await assert.rejects(preview(second, 'ABCD-EFGH'), { code: 'ENROLLMENT_UNAVAILABLE' }, 'another student keeps trying');
 assert.equal(windows.get('global') ?? 0, 0, 'modern codes cannot exhaust a shared ceiling');
 windows.set('global', 300);
 await assert.rejects(preview(second, '123 456'), { code: 'RATE_LIMITED' });
 await assert.rejects(preview(second, 'ABCD-EFGH'), { code: 'ENROLLMENT_UNAVAILABLE' }, 'the legacy ceiling never blocks modern codes');
});
