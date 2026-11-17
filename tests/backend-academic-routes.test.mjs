import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import { loadTsModule } from './helpers/load-ts-module.mjs';

const httpPath = 'apps/api/src/bootstrap/academic-http.ts';
const { createClassroomsHandler } = loadTsModule(httpPath);
const id = 'a1111111-1111-4111-8111-111111111111';
const editor = { 'x-attempt-editor': 'a'.repeat(43), 'x-attempt-epoch': '1' };
const mutation = { revision: '1', operation: { action: 'create', type: 'ASSIGNMENT' } };
const privateGrade = { revision: '1', overallGrade: null, overallFeedback: null, questions: [] };

function exchange(handler, { path = '', method = 'GET', body, headers = {}, rawBody, emitBody = true } = {}) {
  const req = Object.assign(new EventEmitter(), {
    url: '/classrooms' + path, method, complete: true,
    headers: { ...(method === 'GET' ? {} : { 'content-type': 'application/json' }), ...headers },
    pause() { this.paused = true; }, destroy() { this.destroyed = true; },
  });
  const res = Object.assign(new EventEmitter(), {
    headers: {}, statusCode: 200, destroyed: false, writableEnded: false,
    setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
    getHeader(key) { return this.headers[key.toLowerCase()]; },
  });
  const completed = new Promise(resolve => {
    res.end = value => { res.writableEnded = true; res.body = value; res.emit('finish'); resolve({ req, res }); };
    handler(req, res, () => { res.statusCode = 404; res.end(); });
    if (method !== 'GET' && emitBody) setImmediate(() => {
      req.emit('data', Buffer.from(rawBody ?? JSON.stringify(body ?? {})));
      req.emit('end');
    });
  });
  return { req, res, completed };
}

const scenarios = [
  ['', 'GET', 'mine'], ['/search?q=tema', 'GET', 'search'],
  ['/drafts', 'GET', 'listDrafts'], ['/drafts', 'POST', 'createDraft', {}],
  [`/drafts/${id}`, 'GET', 'getDraft'], [`/drafts/${id}`, 'PATCH', 'saveDraft', { revision: '1', payload: {} }],
  [`/drafts/${id}`, 'DELETE', 'deleteDraft', { revision: '1', confirm: true }],
  [`/drafts/${id}/publish`, 'POST', 'publishDraft', { revision: '1' }],
  ['/codes/preview', 'POST', 'previewCode', { code: '123456' }],
  ['/codes/confirm', 'POST', 'confirmCode', { confirmation: 'synthetic' }],
  ['/invitations', 'GET', 'pendingInvitations'],
  [`/invitations/${id}/accept`, 'POST', 'acceptInvitation', {}],
  [`/invitations/${id}/decline`, 'POST', 'declineInvitation', {}],
  ['/notifications', 'GET', 'listNotifications'], ['/notifications/page', 'GET', 'listNotificationPage'],
  ['/notifications/read-all', 'POST', 'readAllNotifications', {}],
  [`/notifications/${id}/read`, 'POST', 'readNotification', {}],
  [`/notifications/${id}/unread`, 'POST', 'readNotification', {}],
  [`/notifications/${id}/open`, 'POST', 'openNotification', {}],
  [`/${id}`, 'GET', 'detail'], [`/${id}/plan`, 'POST', 'changePlan', { revision: '1', operation: {} }],
  [`/${id}/library`, 'GET', 'listMaterials'], [`/${id}/library`, 'POST', 'changeLibrary', { revision: '1', operation: {} }],
  [`/${id}/activities`, 'GET', 'listActivities'], [`/${id}/activities`, 'POST', 'changeActivities', mutation],
  [`/${id}/activities/deadline`, 'POST', 'activityDeadlineChoices', { local: '2026-11-16T10:00' }],
  [`/${id}/activities/${id}`, 'GET', 'activityDetail'], [`/${id}/activities/${id}/preview`, 'GET', 'activityDetail'],
  [`/${id}/activities/${id}/history`, 'GET', 'activityHistory'],
  [`/${id}/activities/${id}/history-submissions`, 'GET', 'activitySubmissions'],
  [`/${id}/activities/${id}/reopen`, 'POST', 'reopenActivity', { revision: '1', studentId: id, deadline: null, confirm: true }],
  [`/${id}/attempts/${id}/history`, 'GET', 'activityAttempt'],
  [`/${id}/attempts/${id}/result`, 'GET', 'getAttemptResult'],
  [`/${id}/attempts/${id}/publish-grade`, 'POST', 'publishAttemptGrade', { revision: '1', confirm: true }],
  [`/${id}/attempts/${id}/grade-corrections`, 'GET', 'getGradeCorrections'],
  [`/${id}/attempts/${id}/grade-corrections`, 'POST', 'correctPublishedGrade', { revision: '1', newGrade: '8', reason: 'Corrección', confirm: true }],
  [`/${id}/attempts/${id}/grading-ai`, 'GET', 'getGradingAi'],
  [`/${id}/attempts/${id}/grading-ai/${id}/apply`, 'POST', 'applyGradingAi', {}],
  [`/${id}/attempts/${id}/grading-ai/${id}/discard`, 'POST', 'discardGradingAi', {}],
  [`/${id}/attempts/${id}/grading`, 'GET', 'getAttemptGrading'],
  [`/${id}/attempts/${id}/grading`, 'POST', 'saveAttemptGrading', privateGrade],
  [`/${id}/activities/${id}/session`, 'GET', 'activitySession'],
  [`/${id}/activities/${id}/eligibility`, 'GET', 'activityEligibility'],
  [`/${id}/activities/${id}/start`, 'POST', 'startActivity', {}],
  [`/${id}/activities/${id}/authorize-first`, 'POST', 'authorizeFirstSubmission', { revision: '1', studentId: id, deadline: null }],
  [`/${id}/attempts/${id}/transfer`, 'POST', 'transferAttemptEditor', { revision: '1' }],
  [`/${id}/attempts/${id}/answer`, 'POST', 'saveAttemptAnswer', { revision: '1', questionId: id, text: '', optionIds: [] }, editor],
  [`/${id}/attempts/${id}/submit-answers`, 'POST', 'submitQuestionnaireAttempt', { revision: '1', confirm: true, confirmIncomplete: true }, editor],
  [`/${id}/attempts/${id}/attachments-remove`, 'POST', 'removeAttemptAttachment', { revision: '1', fileId: id }, editor],
  [`/${id}/attempts/${id}/submit-practical`, 'POST', 'submitPracticalAttempt', { revision: '1', confirm: true }, editor],
  [`/${id}/attempts/${id}/practical-response`, 'POST', 'savePracticalResponse', { revision: '1', text: 'Respuesta' }, editor],
  [`/${id}/activities/${id}/submissions`, 'GET', 'assignmentSubmissions'],
  [`/${id}/attempts/${id}/receipt`, 'GET', 'assignmentSubmission'],
  [`/${id}/wall`, 'GET', 'listWall'], [`/${id}/wall/${id}`, 'GET', 'wallThread'],
  [`/${id}/wall/${id}/replies`, 'GET', 'listWallReplies'],
  [`/${id}/wall`, 'POST', 'changeWall', { revision: '1', operation: { action: 'publish', body: 'Texto' } }],
  [`/${id}/settings`, 'PATCH', 'updateSettings', { revision: '1', name: 'Aula', subject: 'Tema', division: 'A', academicYear: 2026 }],
  [`/${id}/archive`, 'POST', 'setArchive', { revision: '1', archived: true }],
  [`/${id}/code`, 'POST', 'rotateCode', {}], [`/${id}/members`, 'GET', 'members'], [`/${id}/history`, 'GET', 'members'],
  [`/${id}/members/${id}/ai-summary`, 'GET', 'getStudentAiReport'],
  [`/${id}/progress`, 'GET', 'getProgress'], [`/${id}/members/${id}/progress`, 'GET', 'getStudentProgress'],
  [`/${id}/members/${id}`, 'GET', 'studentSummary'],
  [`/${id}/invitations`, 'GET', 'listInvitations'], [`/${id}/invitations`, 'POST', 'invite', { email: 'synthetic@example.test' }],
  [`/${id}/invitations/batch`, 'POST', 'reserveInvitationBatch', { requestId: id, emails: [] }],
  [`/${id}/invitations/batch/${id}`, 'GET', 'readInvitationBatch'],
  [`/${id}/invitations/batch/${id}/49`, 'POST', 'emitInvitationBatchRecipient', {}],
  [`/${id}/invitations/${id}/revoke`, 'POST', 'revokeInvitation', {}],
  [`/${id}/leave`, 'POST', 'leave', {}], [`/${id}/members/${id}/remove`, 'POST', 'remove', {}],
];

for (const [path, method, operation, body, headers] of scenarios) {
  test(`academic dispatch ${method} ${path} -> ${operation}`, async () => {
    const calls = [];
    const service = new Proxy({}, { get: (_target, name) => async (...args) => { calls.push([name, ...args]); return { operation: name }; } });
    let admitted = 0;
    const handler = createClassroomsHandler(service, { admit: async (_req, write) => { admitted++; assert.equal(write, method !== 'GET'); } });
    const { req, res } = await exchange(handler, { path, method, body, headers }).completed;
    assert.equal(res.statusCode, 200, res.body);
    assert.deepEqual(JSON.parse(res.body), { operation });
    assert.equal(calls.length, 1); assert.equal(calls[0][0], operation); assert.equal(calls[0][1], req);
    assert.equal(admitted, 1); assert.equal(res.headers['cache-control'], 'no-store');
    assert.equal(res.headers['x-content-type-options'], 'nosniff');
  });
}

test('bootstrap depends on explicit capability contracts instead of the global service', () => {
  assert.doesNotMatch(readFileSync(httpPath, 'utf8'), /\bClassroomService\b|\bservice\.\w+\(/);
});

test('a handled operation returning undefined is not dispatched again or treated as unmatched', async () => {
  let called = 0;
  const { res } = await exchange(createClassroomsHandler({ mine: async () => { called++; } }, { admit: async () => {} })).completed;
  assert.equal(called, 1); assert.equal(res.statusCode, 200); assert.equal(res.body, undefined);
});

test('invalid route bodies, editor authority and method branches reject before dispatch', async () => {
  const cases = [
    [`/${id}/activities`, 'POST', { ...mutation, ownerId: id }],
    [`/${id}/activities`, 'POST', { revision: '1', operation: { action: 'unknown' } }],
    [`/${id}/attempts/${id}/grading`, 'PATCH', {}],
    [`/${id}/attempts/${id}/grading`, 'POST', { ...privateGrade, forged: true }],
    [`/${id}/activities/${id}/history`, 'POST', {}],
    [`/${id}/attempts/${id}/answer`, 'POST', { revision: '1', questionId: id, text: '', optionIds: [] }],
    [`/${id}/attempts/${id}/result`, 'GET', undefined, editor],
    [`/${id}/invitations/batch/${id}/50`, 'POST', {}],
    ['/notifications/read-all', 'POST', { ownerId: id }],
    [`/${id}/wall?actor=forged`, 'GET'],
  ];
  let called = 0;
  const service = new Proxy({}, { get: () => async () => { called++; } });
  const handler = createClassroomsHandler(service, { admit: async () => {} });
  for (const [path, method, body, headers] of cases) {
    const { res } = await exchange(handler, { path, method, body, headers }).completed;
    assert.equal(res.statusCode, 400, path); assert.equal(JSON.parse(res.body).error.code, 'INVALID_INPUT');
  }
  assert.equal(called, 0);
});

test('admission, JSON limit and malformed body remain before capability dispatch', async () => {
  let called = 0;
  const service = { createDraft: async () => { called++; } };
  const denied = createClassroomsHandler(service, { admit: async () => { throw Error('denied'); } });
  assert.equal((await exchange(denied, { path: '/drafts', method: 'POST', body: {} }).completed).res.statusCode, 403);
  const handler = createClassroomsHandler(service, { admit: async () => {} });
  for (const rawBody of ['{invalid', 'x'.repeat(512 * 1024 + 1)]) {
    const { req, res } = await exchange(handler, { path: '/drafts', method: 'POST', rawBody }).completed;
    assert.equal(res.statusCode, 400); if (rawBody.length > 512 * 1024) assert.equal(req.paused, true);
  }
  assert.equal(called, 0);
});

test('the sixteen-request limit rejects before admission and releases completed work', async () => {
  const releases = [];
  let admissions = 0, holding = true;
  const handler = createClassroomsHandler({ mine: async () => {
    if (holding) await new Promise(resolve => releases.push(resolve));
    return {};
  } }, { admit: async () => { admissions++; } });
  const pending = Array.from({ length: 16 }, () => exchange(handler));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(releases.length, 16);
  const saturated = await exchange(handler).completed;
  assert.equal(saturated.res.statusCode, 503); assert.equal(admissions, 16);
  holding = false; releases.forEach(resolve => resolve());
  await Promise.all(pending.map(value => value.completed));
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await exchange(handler).completed).res.statusCode, 200);
  assert.equal(admissions, 17);
});

test('body cancellation stops before dispatch and the original request owns the completed-body receipt', async () => {
  const events = [];
  const { createClassroomsHandler: create } = loadTsModule(httpPath, { stubs: {
    '../modules/participation/attempts/infrastructure/submission-receipt.ts': {
      captureSubmissionReceipt(request) { events.push(['receipt', request]); },
    },
  } });
  const handler = create({ createDraft: async request => { events.push(['service', request]); return {}; } },
    { admit: async request => { events.push(['admit', request]); } });
  const aborted = exchange(handler, { path: '/drafts', method: 'POST', emitBody: false });
  await new Promise(resolve => setImmediate(resolve));
  aborted.req.emit('aborted');
  assert.equal((await aborted.completed).res.statusCode, 400); assert.equal(aborted.req.paused, true);
  assert.deepEqual(events.map(event => event[0]), ['admit']);
  events.length = 0;
  const completed = await exchange(handler, { path: '/drafts', method: 'POST', body: {} }).completed;
  assert.deepEqual(events.map(event => event[0]), ['admit', 'receipt', 'service']);
  assert.ok(events.every(event => event[1] === completed.req));
});

test('identity errors preserve retry/request headers and close an incomplete request', async () => {
  class BoundaryIdentityError extends Error {
    code = 'RATE_LIMITED'; status = 429; retryAfter = 8;
  }
  const { createClassroomsHandler: create } = loadTsModule(httpPath, { stubs: {
    '../modules/classrooms/access/infrastructure/errors.ts': { ClassroomIdentityError: BoundaryIdentityError },
  } });
  const handler = create({}, { admit: async (_req, _write, res) => {
    res.setHeader('X-Request-Id', 'server-request'); throw new BoundaryIdentityError();
  } });
  const pending = exchange(handler); pending.req.complete = false;
  const { req, res } = await pending.completed;
  assert.equal(res.statusCode, 429); assert.equal(res.headers['retry-after'], '8');
  assert.equal(res.headers.connection, 'close'); assert.equal(req.destroyed, true);
  assert.deepEqual(JSON.parse(res.body), { error: { code: 'RATE_LIMITED', requestId: 'server-request' } });
});

test('existing AI delegates retain precedence and their non-200 statuses', async () => {
  for (const [path, option] of [[`/${id}/activity-generations`, 'activityAi'], [`/drafts/${id}/curriculum-extractions`, 'ai']]) {
    let called = 0;
    const handler = createClassroomsHandler({}, { admit: async () => {}, [option]: {
      start: async () => { called++; return { created: true, view: { id } }; },
    } });
    const { res } = await exchange(handler, { path, method: 'POST', body: {} }).completed;
    assert.equal(res.statusCode, 202); assert.equal(called, 1); assert.deepEqual(JSON.parse(res.body), { id });
  }
});

test('method, query and GET-body rejection remain before admission', async () => {
  let admitted = 0;
  const handler = createClassroomsHandler({}, { admit: async () => { admitted++; } });
  for (const [options, status] of [
    [{ path: '/drafts', method: 'PUT' }, 405],
    [{ path: '/drafts?forged=1' }, 400],
    [{ path: '/drafts', headers: { 'content-length': '1' } }, 400],
    [{ path: '/drafts', headers: { 'transfer-encoding': 'chunked' } }, 400],
  ]) assert.equal((await exchange(handler, options).completed).res.statusCode, status);
  assert.equal(admitted, 0);
});
