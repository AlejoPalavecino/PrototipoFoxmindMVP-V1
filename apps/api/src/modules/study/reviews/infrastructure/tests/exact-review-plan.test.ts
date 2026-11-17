import test from 'node:test';
import assert from 'node:assert/strict';
import { planExam } from '../../../../../../../../src/core/domain/study/engine.ts';
import { createStudyService } from '../../../folders/application/service.ts';
import { createStudentUnitOfWork } from '../../../folders/infrastructure/unit-of-work.ts';
import { createFolderRepository } from '../../../folders/infrastructure/folder-repository.ts';
import type { FolderRow, StudyDatabase } from '../../../application/contracts.ts';

const topicIds = Array.from({ length: 8 }, () => crypto.randomUUID());
const topics = topicIds.map((id, i) => ({ id, title: `Tema ${i + 1}` }));
const availability = (count: number, minutes = 25) => Array.from({ length: count }, (_, i) => ({ start: `2099-11-${String(20 + i).padStart(2, '0')}T15:00:00Z`, minutes }));
const base = { examAt: '2099-12-01T15:00:00Z', now: '2099-11-18T15:00:00Z', timeZone: 'America/Argentina/Buenos_Aires', minutesPerTopic: 25 };

test('exact review uses one full window per session and rotates topics for every supported count/duration', () => {
  for (const sessionCount of [2, 3, 4, 5]) for (const minutes of [15, 25, 40]) for (const topicCount of [1, 2, 8]) {
    const slots = availability(sessionCount, minutes), result = planExam({ ...base, topics: topics.slice(0, topicCount), availability: [...slots].reverse(), sessionCount });
    assert.equal(result.sessions.length, sessionCount);
    result.sessions.forEach((session, index) => {
      assert.equal(session.startAt, new Date(slots[index]!.start).toISOString()); assert.equal(session.minutes, minutes);
      assert.equal(Date.parse(session.endAt) - Date.parse(session.startAt), minutes * 60000);
      assert.deepEqual(session.topicIds, [topicIds[index % topicCount]]);
    });
  }
});

test('exact review rejects invalid count, window mismatch, dates, duration, timezone and overlaps instead of partial plans', () => {
  const input = { ...base, topics: topics.slice(0, 1), availability: availability(3), sessionCount: 3 };
  const invalid = [
    ...[0, 1, 6, 2.5, '3', null].map(sessionCount => ({ ...input, sessionCount })),
    { ...input, availability: availability(2) }, { ...input, examAt: '2099-11-17T15:00:00Z' },
    { ...input, timeZone: 'Invalid/Zone' }, { ...input, topics: [] },
    ...[{ start: '2099-11-17T15:00:00Z', minutes: 25 }, { start: '2099-12-01T15:00:00Z', minutes: 25 },
      { start: '2099-02-31T15:00:00Z', minutes: 25 }, { start: '2099-11-20T15:00:00', minutes: 25 },
      { start: '2099-11-21T15:05:00Z', minutes: 25 }, { start: '2099-11-20T15:00:00Z', minutes: 0 },
      { start: '2099-11-20T15:00:00Z', minutes: '25' }, { start: '2099-11-20T15:00:00Z', minutes: 1441 }]
      .map(slot => ({ ...input, availability: [slot, ...availability(3).slice(1)] })),
  ];
  for (const candidate of invalid) assert.throws(() => planExam(candidate as Parameters<typeof planExam>[0]));
});

test('legacy planning still consumes topics once and exact planning accepts explicit offsets', () => {
  const legacy = planExam({ ...base, topics: topics.slice(0, 1), availability: availability(3) });
  assert.equal(legacy.sessions.length, 1);
  const slots = [{ start: '2099-11-20T12:00:00-03:00', minutes: 15 }, { start: '2099-11-21T12:00:00-03:00', minutes: 15 }];
  const exact = planExam({ ...base, topics: topics.slice(0, 1), availability: slots, sessionCount: 2 });
  assert.equal(exact.sessions.length, 2); assert.equal(exact.sessions[0]!.startAt, '2099-11-20T15:00:00.000Z');
});

function fixture() {
  const owner = crypto.randomUUID(); let conflictChecks = 0, agendaWrites = 0;
  let row: FolderRow = { id: crypto.randomUUID(), owner_id: owner, status: 'ACTIVE', revision: 1n, created_at: new Date(), updated_at: new Date(), state: {
    version: 1, fields: { name: 'Estudio', subject: 'Historia', academicYear: 2026, bannerKey: 'general', linkedClassroomId: null, planFileId: null,
      units: [{ id: crypto.randomUUID(), title: 'Unidad', topics }] }, materials: [], conversations: [], creations: [], practices: [], exams: [], memory: {}, receipts: {} } };
  const database: StudyDatabase = { async $transaction(operation) {
    const before = structuredClone(row);
    try { return await operation({ $queryRawUnsafe: async <T>(sql: string, ...values: unknown[]) => {
      let result: unknown[] = [];
      if (sql.includes('FROM users')) result = [{ account_role: 'student', email_verified_at: new Date() }];
      else if (sql.includes('FROM study_folders')) result = row.id === values[0] && row.owner_id === values[1] ? [structuredClone(row)] : [];
      else if (sql.includes('UPDATE study_folders')) { row = { ...row, state: JSON.parse(String(values[2])), revision: row.revision + 1n }; result = [structuredClone(row)]; }
      return result as T;
    } }); } catch (error) { row = before; throw error; }
  } };
  const service = createStudyService({ uow: createStudentUnitOfWork({ database, authenticate: async (_tx, request) => (request as { owner?: string }).owner ?? owner }),
    folders: createFolderRepository(), newId: () => crypto.randomUUID(), digest: value => value, sources: async () => [], linkedClassrooms: async () => [], verifyLink: async () => {}, importPlan: async () => null,
    agenda: { conflicts: async (_tx, id, zone, sessions) => { conflictChecks++; assert.equal(id, owner); assert.equal(zone, base.timeZone); assert.equal(sessions.length, 3);
      return [{ sessionId: sessions[0]!.id, occurrenceId: crypto.randomUUID(), title: 'Evento propio' }]; }, confirm: async () => { agendaWrites++; return {}; }, cancel: async () => {} } });
  return { service, get row() { return row; }, get checks() { return conflictChecks; }, get writes() { return agendaWrites; },
    input(extra: Record<string, unknown> = {}) { const { now: _, ...fields } = base; return { action: 'PLAN_EXAM', ...fields, title: 'Mi evaluación', sessionCount: 3,
      availability: availability(3), topicIds: [topicIds[0]], revision: String(row.revision), requestId: crypto.randomUUID(), ...extra }; } };
}

test('exact PLAN_EXAM persists count with existing agenda warnings and replays without creating events', async () => {
  const f = fixture(), input = f.input(), response = await f.service.command({}, f.row.id, input);
  const exam = (response.result as { exam: { id: string; sessions: { id: string; minutes: number }[]; conflicts: unknown[] } }).exam;
  assert.equal(exam.sessions.length, 3); assert.equal(new Set(exam.sessions.map(s => s.id)).size, 3); assert.equal(exam.conflicts.length, 1);
  assert.equal((f.row.state.exams[0]!.sessions as unknown[]).length, 3); assert.equal(f.writes, 0);
  const snapshot = structuredClone(f.row); assert.deepEqual(await f.service.command({}, f.row.id, input), response);
  assert.deepEqual(f.row, snapshot); assert.equal(f.checks, 1); assert.equal(f.writes, 0);
});

test('invalid exact plans, foreign ownership and stale revisions cannot save a partial exam or consult Agenda', async () => {
  for (const scenario of ['count', 'windows', 'overlap', 'date', 'foreign', 'revision', 'topic']) {
    const f = fixture(), input = f.input();
    if (scenario === 'count') input.sessionCount = 6;
    if (scenario === 'windows') input.availability = availability(2);
    if (scenario === 'overlap') input.availability[1]!.start = input.availability[0]!.start;
    if (scenario === 'date') input.availability[0]!.start = '2000-01-01T15:00:00Z';
    if (scenario === 'revision') input.revision = '99';
    if (scenario === 'topic') input.topicIds = [crypto.randomUUID()];
    const before = structuredClone(f.row), request = scenario === 'foreign' ? { owner: crypto.randomUUID() } : {};
    await assert.rejects(f.service.command(request, f.row.id, input), { code: scenario === 'foreign' ? 'FORBIDDEN' : scenario === 'revision' ? 'CONFLICT' : 'INVALID_INPUT' });
    assert.deepEqual(f.row, before); assert.equal(f.checks, 0); assert.equal(f.writes, 0);
  }
});
