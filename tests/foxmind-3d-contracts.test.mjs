import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const domain = () => loadTsModule('src/core/domain/index.ts');
const invalid = { code: 'INVALID_INPUT' };
const id = n => `a0000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const now = '2026-10-25T12:00:00.000Z';
const zone = 'America/Argentina/Buenos_Aires';
const modules = ['pending', 'review', 'feedback', 'agenda', 'queries', 'materials', 'classrooms'];
const room = role => ({ id: id(1), name: 'Ciencias <script>', division: 'A', subject: 'Ciencias',
  role, coverKey: 'explore', archived: false, timeZone: zone });
const target = kind => ({ kind, classroomId: id(1), ...({
  classroom: { section: 'plan' }, activity: { activityId: id(2) },
  submissions: { activityId: id(2), filter: 'unpublished' },
  grade: { activityId: id(2), attemptId: id(3), gradeId: id(4) },
  wall: { postId: id(5) }, material: { materialId: id(6) },
}[kind] ?? {}) });
const privateTarget = () => ({ kind: 'private-event', eventId: id(7), occurrenceId: id(8), date: '2026-10-26' });
const item = name => {
  const base = { id: id(10), title: 'Contenido autorizado', classroom: room('student') };
  return { ...base, ...{
    pending: { target: target('activity'), activityType: 'ASSIGNMENT', state: 'first-submission',
      attemptId: null, deadlineAt: now, reception: 'closed', late: true },
    review: { classroom: room('teacher'), target: target('submissions'), activityType: 'QUESTIONNAIRE',
      needsReview: 2, readyToPublish: 1, oldestSubmittedAt: now },
    feedback: { target: target('grade'), activityType: 'EVALUATION', attemptNumber: 1,
      finalGrade: '0', publishedAt: now, changedAt: now, availability: 'available' },
    agenda: { classroom: null, target: privateTarget(), source: 'PRIVATE_EVENT', startAt: '2026-10-26T12:00:00.000Z',
      date: '2026-10-26', timeZone: zone, allDay: false },
    queries: { classroom: room('teacher'), target: target('wall'), updatedAt: now },
    materials: { target: target('material'), publishedAt: now, extension: 'pdf' },
    classrooms: { target: target('classroom') },
  }[name] };
};
const page = name => ({ status: 'ready', items: [item(name)],
  totalItems: ['queries', 'materials', 'agenda'].includes(name) ? null : 1, nextCursor: null,
  ...(name === 'review' ? { totals: { attempts: 3, needsReview: 2, readyToPublish: 1 } } : {}) });
const response = () => ({ version: 1, subjectId: id(20), generatedAt: now, timeZone: zone,
  participation: 'mixed', memberships: { study: 1, teach: 1, archived: 0 },
  setup: { drafts: 1, invitations: 0 }, modules: Object.fromEntries(modules.map(name => [name, page(name)])) });
const moduleResponse = name => ({ subjectId: id(20), generatedAt: now, module: name, page: page(name) });

test('S0 Home query accepts only a real IANA zone and no client authority', () => {
  const { parseHomeQuery, parseHomePageQuery } = domain();
  assert.deepEqual(parseHomeQuery({ timeZone: zone }), { timeZone: zone });
  assert.deepEqual(parseHomeQuery({ timeZone: 'UTC' }), { timeZone: 'UTC' });
  for (const input of [null, [], {}, { timeZone: [zone] }, { timeZone: '+03:00' },
    { timeZone: 'Imaginary/Zone' }, { timeZone: '' }, { timeZone: zone, role: 'teacher' },
    { timeZone: zone, userId: id(20) }, { timeZone: zone, cursor: 'forged' }])
    assert.throws(() => parseHomeQuery(input), invalid, JSON.stringify(input));
  for (const module of modules) assert.deepEqual(parseHomePageQuery({ timeZone: zone, module, cursor: null }),
    { timeZone: zone, module, cursor: null });
  const paged = { timeZone: zone, module: 'pending', cursor: 'opaque-signed_cursor.123' };
  assert.deepEqual(parseHomePageQuery(paged), paged);
  for (const patch of [{ module: 'all' }, { module: ['pending'] }, { cursor: [] }, { cursor: 1 },
    { cursor: 'x'.repeat(2049) }, { role: 'teacher' }, { offset: 5 }, { actor: id(20) }])
    assert.throws(() => parseHomePageQuery({ ...paged, ...patch }), invalid, JSON.stringify(patch));
});

test('S0 every typed destination survives parsing without an arbitrary URL', () => {
  const { parseHomeTarget } = domain();
  for (const kind of ['classroom', 'activity', 'submissions', 'grade', 'wall', 'material',
    'create-activity', 'upload-material', 'publish-notice']) assert.deepEqual(parseHomeTarget(target(kind)), target(kind));
  assert.deepEqual(parseHomeTarget(privateTarget()), privateTarget());
  for (const value of [null, [], { kind: 'url', href: 'https://example.test' },
    { ...target('activity'), url: '/mis-aulas' }, { ...target('activity'), classroomId: 'foreign' },
    { ...target('activity'), activityId: [id(2)] }, { kind: 'grade', classroomId: id(1), activityId: id(2) },
    { ...target('classroom'), section: 'members' }, { ...target('submissions'), filter: 'all' },
    { ...privateTarget(), date: '2026-02-30' }, { ...privateTarget(), eventId: 'not-a-uuid' },
    { ...privateTarget(), token: 'never-in-a-target' }])
    assert.throws(() => parseHomeTarget(value), invalid, JSON.stringify(value));
});

test('S0 aggregate and each module accept all seven real row variants, including grade zero', () => {
  const { parseHomeResponse, parseHomeModuleResponse } = domain();
  const original = response();
  assert.deepEqual(parseHomeResponse(original), { ...original, modules: { ...original.modules,
    drafts: { status: 'not-applicable' }, submitted: { status: 'not-applicable' } } });
  for (const name of modules) assert.deepEqual(parseHomeModuleResponse(moduleResponse(name)), moduleResponse(name));
  const resubmission = moduleResponse('pending');
  Object.assign(resubmission.page.items[0], { state: 'resubmission', attemptId: id(3), deadlineAt: null, late: false, reception: 'open' });
  assert.deepEqual(parseHomeModuleResponse(resubmission), resubmission);
  const academic = moduleResponse('agenda');
  Object.assign(academic.page.items[0], { classroom: room('student'), source: 'ACADEMIC_DEADLINE', target: target('activity') });
  assert.deepEqual(parseHomeModuleResponse(academic), academic);
});

test('published Home feedback accepts the same code-point limit and multiline text as grading',()=>{
 const {parseHomeModuleResponse}=domain(),value=moduleResponse('feedback');value.page.items[0].overallFeedback='🦊'.repeat(3000)+'\nDevolución';
 assert.equal(parseHomeModuleResponse(value).page.items[0].overallFeedback,value.page.items[0].overallFeedback);
});

test('S0 distinguishes ready empty, recoverable module failure and role inapplicability', () => {
  const { parseHomeResponse, parseHomeModuleResponse } = domain();
  const value = response();
  value.participation = 'study'; value.memberships.teach = 0;
  value.modules.review = { status: 'not-applicable' };
  value.modules.queries = { status: 'not-applicable' };
  value.modules.pending = { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true };
  value.modules.feedback = { status: 'ready', items: [], totalItems: 0, nextCursor: null };
  assert.deepEqual(parseHomeResponse(value), { ...value, modules: { ...value.modules,
    drafts: { status: 'not-applicable' }, submitted: { status: 'not-applicable' } } });
  for (const bad of [
    { status: 'error', code: 'FORBIDDEN', retryable: true },
    { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: false },
    { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true, items: [] },
    { status: 'not-applicable', items: [] }, { status: 'loading' },
    { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true, totals: { attempts: 0, needsReview: 0, readyToPublish: 0 } },
  ]) assert.throws(() => parseHomeModuleResponse({ ...moduleResponse('review'), page: bad }), invalid);
});

test('S0 rejects forged identity, impossible timestamps, missing modules and invalid counters', () => {
  const { parseHomeResponse } = domain();
  for (const patch of [{ version: 2 }, { subjectId: 'forged' }, { generatedAt: '2026-02-30T12:00:00.000Z' },
    { generatedAt: '2026-10-25T12:00:00-03:00' }, { timeZone: 'Fake/Zone' }, { participation: 'teacher' },
    { memberships: { study: -1, teach: 1, archived: 0 } }, { setup: { drafts: 0.5, invitations: 0 } },
    { modules: {} }, { email: 'other@example.test' }, { editorToken: 'private' }])
    assert.throws(() => parseHomeResponse({ ...response(), ...patch }), invalid, JSON.stringify(patch));
  const extraModule = response(); extraModule.modules.answers = { status: 'ready', items: [] };
  assert.throws(() => parseHomeResponse(extraModule), invalid);
});

test('S0 rejects private nested fields and malformed row data rather than silently stripping them', () => {
  const { parseHomeModuleResponse } = domain();
  for (const [name, patch] of [
    ['pending', { correctAnswers: ['private'] }], ['pending', { activityType: 'EXAM' }],
    ['pending', { deadlineAt: 'yesterday' }], ['pending', { late: 'true' }],
    ['review', { needsReview: -1 }], ['feedback', { finalGrade: null }],
    ['feedback', { attemptNumber: 0 }], ['feedback', { availability: 'read' }],
    ['agenda', { description: 'Private full event description' }], ['agenda', { date: '2026-02-30' }],
    ['agenda', { timeZone: 'Imaginary/Zone' }], ['queries', { updatedAt: 'invalid' }],
    ['materials', { storageKey: 'private/object' }], ['classrooms', { title: 42 }],
  ]) {
    const value = moduleResponse(name); Object.assign(value.page.items[0], patch);
    assert.throws(() => parseHomeModuleResponse(value), invalid, `${name} ${JSON.stringify(patch)}`);
  }
  const value = moduleResponse('classrooms'); value.page.items[0].classroom.email = 'teacher@example.test';
  assert.throws(() => parseHomeModuleResponse(value), invalid);
});

test('S0 exact review totals, safe page counts and bounded cursor cannot become invented totals', () => {
  const { parseHomeModuleResponse } = domain();
  for (const totals of [{ attempts: 4, needsReview: 2, readyToPublish: 1 },
    { attempts: 3, needsReview: -1, readyToPublish: 4 }, { attempts: 3.5, needsReview: 2, readyToPublish: 1.5 }]) {
    const value = moduleResponse('review'); value.page.totals = totals;
    assert.throws(() => parseHomeModuleResponse(value), invalid);
  }
  for (const patch of [{ totalItems: -1 }, { totalItems: 1.5 }, { nextCursor: 'x'.repeat(2049) },
    { nextCursor: ['forged'] }, { answers: [] }])
    assert.throws(() => parseHomeModuleResponse({ ...moduleResponse('pending'), page: { ...page('pending'), ...patch } }), invalid);
  const wrong = moduleResponse('pending'); wrong.module = 'unknown';
  assert.throws(() => parseHomeModuleResponse(wrong), invalid);
  assert.throws(() => parseHomeModuleResponse({ ...moduleResponse('pending'), subjectId: id(20), role: 'teacher' }), invalid);
});

test('S0 cover writes accept exactly ten keys while display maps legacy aliases and unknown fallback', () => {
  const { CLASSROOM_COVER_KEYS, isClassroomCoverKey, classroomCoverAsset } = domain();
  const expected = ['explore', 'create', 'discover', 'literature', 'math', 'biology', 'society', 'science', 'creative', 'general'];
  assert.deepEqual([...CLASSROOM_COVER_KEYS], expected);
  for (const key of expected) assert.equal(isClassroomCoverKey(key), true, key);
  for (const key of [null, undefined, [], 1, '', 'GENERAL', 'unknown', ' general', 'general '])
    assert.equal(isClassroomCoverKey(key), false, String(key));
  for (const [legacy, asset] of [['explore', 'general'], ['create', 'creative'], ['discover', 'science']])
    assert.equal(classroomCoverAsset(legacy), asset);
  for (const key of expected.slice(3)) assert.equal(classroomCoverAsset(key), key);
  assert.equal(classroomCoverAsset('unknown-from-an-old-record'), 'general');
  assert.equal(isClassroomCoverKey('unknown-from-an-old-record'), false, 'Presentation fallback must never authorize an unknown write');
});
