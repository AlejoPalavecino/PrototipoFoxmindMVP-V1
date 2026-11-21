import test from 'node:test';
import assert from 'node:assert/strict';
import { executeStudy, planExam } from '../../../../../../../../src/core/domain/study/engine.ts';
import { createStudyService } from '../../../folders/application/service.ts';
import { createStudentUnitOfWork } from '../../../folders/infrastructure/unit-of-work.ts';
import { createFolderRepository } from '../../../folders/infrastructure/folder-repository.ts';
import type { FolderRow, StudyDatabase } from '../../../application/contracts.ts';

const topicIds = Array.from({ length: 8 }, () => crypto.randomUUID());
const topics = topicIds.map((id, i) => ({ id, title: `Tema ${i + 1}` }));
const availability = (count: number, minutes = 25) => Array.from({ length: count }, (_, i) => ({ start: `2099-11-${String(20 + i).padStart(2, '0')}T15:00:00Z`, minutes }));
const base = { examAt: '2099-12-01T15:00:00Z', now: '2099-11-18T15:00:00Z', timeZone: 'America/Argentina/Buenos_Aires', minutesPerTopic: 25 };

test('Gemini proposes an activity for each review session using only the selected topics', async () => {
  const response = { status: 'COMPLETE', title: 'Repaso de mitosis', markdown: '', sourceRefs: [], missingInformation: [],
    reviewSessions: [{ title: 'Secuencia de fases', topicIds: [topicIds[0]], activity: 'Dibujá el orden de las fases de memoria.' },
      { title: 'Comparación', topicIds: [topicIds[1]], activity: 'Explicá cómo distinguís metafase y anafase.' }] };
  const input = { action: 'REVIEW_PLAN', message: 'Quiero preparar la evaluación de mitosis', sources: [], topics: topics.slice(0, 2),
    reviewMinutes: [25, 40] } as const;
  const request = { ...input, topics: [...input.topics], sources: [], reviewMinutes: [...input.reviewMinutes] };
  const result = await executeStudy(request, { async generate({ prompt }) {
    assert.deepEqual(JSON.parse(prompt).reviewMinutes, [25, 40]);
    return response;
  } });
  assert.deepEqual(result.reviewSessions, response.reviewSessions);
  for (const reviewSessions of [
    response.reviewSessions.slice(1),
    [{ ...response.reviewSessions[0]!, topicIds: [topicIds[2]] }, response.reviewSessions[1]],
    [{ ...response.reviewSessions[0]!, activity: '<script>…</script>' }, response.reviewSessions[1]],
    [{ ...response.reviewSessions[0]!, startAt: base.now }, response.reviewSessions[1]],
    [{ ...response.reviewSessions[0]!, activity: ' ' }, response.reviewSessions[1]],
  ]) await assert.rejects(executeStudy(request, { async generate() { return { ...response, reviewSessions }; } }), /INVALID_STUDY_OUTPUT/);
});

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

test('review activities distinguish encounter, same-day revisit and spaced transfer in the plan time zone', async () => {
  const { studyReviewActivities } = await import('../../../../../../../../src/core/domain/study/review.ts');
  const [first, sameDay, second, third] = [
    { id: 'a', startAt: '2099-11-20T23:30:00Z' },
    { id: 'b', startAt: '2099-11-21T01:30:00Z' },
    { id: 'c', startAt: '2099-11-22T15:00:00Z' },
    { id: 'd', startAt: '2099-11-25T15:00:00Z', activity: 'Resolvé el caso que marcaste en clase.' },
  ].map(session => ({ ...session, topicIds: [topicIds[0]!] }));
  const result = studyReviewActivities([third!, second!, sameDay!, first!], base.timeZone);
  assert.match(result.get('a')!, /sin mirar el material/i);
  assert.match(result.get('b')!, /otro día/i);
  assert.match(result.get('c')!, /caso distinto/i);
  assert.equal(result.get('d'), third!.activity);
});

function fixture() {
  const owner = crypto.randomUUID(); let conflictChecks = 0, agendaWrites = 0, generations = 0;
  const conversationId = crypto.randomUUID();
  const confirmed: unknown[][] = [];
  let row: FolderRow = { id: crypto.randomUUID(), owner_id: owner, status: 'ACTIVE', revision: 1n, created_at: new Date(), updated_at: new Date(), state: {
    version: 1, fields: { name: 'Estudio', subject: 'Historia', academicYear: 2026, bannerKey: 'general', linkedClassroomId: null, planFileId: null,
      units: [{ id: crypto.randomUUID(), title: 'Unidad', topics }] }, materials: [],
    conversations: [{ id: conversationId, title: 'Biología', turns: [] }], creations: [], practices: [], exams: [], memory: {}, receipts: {} } };
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
    generate: input => executeStudy(input, { async generate() {
      generations++;
      return { status: 'COMPLETE', title: 'Repasá mitosis', markdown: '', sourceRefs: [], missingInformation: [],
        reviewSessions: ['Dibujá las fases.', 'Compará dos fases.', 'Explicá lo que cambia.']
          .map((activity, index) => ({ title: `Mitosis · ${index + 1}`, topicIds: [topicIds[0]], activity })) };
    } }),
    agenda: { conflicts: async (_tx, id, zone, sessions) => { conflictChecks++; assert.equal(id, owner); assert.equal(zone, base.timeZone); assert.equal(sessions.length, 3);
      return [{ sessionId: sessions[0]!.id, occurrenceId: crypto.randomUUID(), title: 'Evento propio' }]; },
      confirm: async (_tx, _owner, _folder, _exam, sessions) => { agendaWrites++; confirmed.push(sessions); return {}; }, cancel: async () => {} } });
  return { service, confirmed, conversationId, get row() { return row; }, get generations() { return generations; }, get checks() { return conflictChecks; }, get writes() { return agendaWrites; },
    input(extra: Record<string, unknown> = {}) { const { now: _, ...fields } = base; return { action: 'PLAN_EXAM', ...fields, title: 'Mi evaluación', sessionCount: 3,
      availability: availability(3), topicIds: [topicIds[0]], revision: String(row.revision), requestId: crypto.randomUUID(), ...extra }; } };
}

test('a Gemini review survives reload and receipt replay, then sends the confirmed activities to Agenda', async () => {
  const f = fixture();
  const input = { action: 'GENERATE', kind: 'REVIEW_PLAN', message: 'Repasar para la evaluación de mitosis',
    topicIds: [topicIds[0]], conversationId: f.conversationId, revision: String(f.row.revision), requestId: crypto.randomUUID(),
    review: { examAt: base.examAt, timeZone: base.timeZone, availability: availability(3) } };
  const response = await f.service.command({}, f.row.id, input);
  assert.equal(f.generations, 1);
  assert.equal(f.writes, 0);
  const { exam } = response.result as { exam: FolderRow['state']['exams'][number] };
  assert.equal(exam.sessions[0]?.startAt, new Date(input.review.availability[0]!.start).toISOString());
  const detail = await f.service.get({}, f.row.id);
  assert.equal(detail.exams[0]?.id, exam.id);
  const generation = detail.conversations[0]?.turns[0]?.generation;
  assert.ok(generation && 'status' in generation);
  assert.equal(generation.status, 'COMPLETE');
  assert.equal(detail.conversations[0]?.turns[1]?.examId, exam.id);
  assert.deepEqual(await f.service.command({}, f.row.id, input), response);
  assert.equal(f.generations, 1);
  const confirm = { action: 'CONFIRM_AGENDA', examId: exam.id, sessionIds: [exam.sessions[1]?.id],
    revision: String(f.row.revision), requestId: crypto.randomUUID() };
  await f.service.command({}, f.row.id, confirm);
  await f.service.command({}, f.row.id, confirm);
  assert.equal(f.writes, 1);
  assert.deepEqual(f.confirmed[0], [exam.sessions[1]]);
});

test('exact PLAN_EXAM persists count with existing agenda warnings and replays without creating events', async () => {
  const f = fixture(), input = f.input(), response = await f.service.command({}, f.row.id, input);
  const exam = (response.result as { exam: { id: string; sessions: { id: string; minutes: number }[]; conflicts: unknown[] } }).exam;
  assert.equal(exam.sessions.length, 3); assert.equal(new Set(exam.sessions.map(s => s.id)).size, 3); assert.equal(exam.conflicts.length, 1);
  assert.equal((f.row.state.exams[0]!.sessions as unknown[]).length, 3); assert.equal(f.writes, 0);
  const snapshot = structuredClone(f.row); assert.deepEqual(await f.service.command({}, f.row.id, input), response);
  assert.deepEqual(f.row, snapshot); assert.equal(f.checks, 1); assert.equal(f.writes, 0);
});

test('editing a review persists a private activity and Agenda receives only the confirmed sessions', async () => {
  const f = fixture(), response = await f.service.command({}, f.row.id, f.input());
  const { exam } = response.result as { exam: FolderRow['state']['exams'][number] };
  const [first, second] = exam.sessions;
  const editedSessions = [{ ...first!, activity: 'Calculá la conversión de un plano nuevo.' }, ...exam.sessions.slice(1)];
  const command = (fields: Record<string, unknown>) => ({
    revision: String(f.row.revision), requestId: crypto.randomUUID(), examId: exam.id, ...fields,
  });
  await f.service.command({}, f.row.id, command({ action: 'EDIT_EXAM', sessions: editedSessions }));
  assert.equal(f.row.state.exams[0]!.sessions[0]!.activity, editedSessions[0]!.activity);
  assert.equal(f.writes, 0);
  const confirm = command({ action: 'CONFIRM_AGENDA', sessionIds: [first!.id, second!.id] });
  const confirmation = await f.service.command({}, f.row.id, confirm);
  assert.deepEqual(await f.service.command({}, f.row.id, confirm), confirmation);
  assert.equal(f.writes, 1);
  const agendaSessions = f.confirmed[0] as typeof editedSessions;
  assert.equal(agendaSessions.length, 2);
  assert.equal(agendaSessions[0]!.activity, editedSessions[0]!.activity);
  assert.match(agendaSessions[1]!.activity!, /caso distinto/);
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
