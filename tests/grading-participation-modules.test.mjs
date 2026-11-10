import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerHooks } from 'node:module';

for (const [module, files] of Object.entries({
  grading: ['grading', 'grade-publication', 'grade-corrections', 'progress', 'grading-ai/service'],
  participation: ['activity-session', 'activity-eligibility', 'activity-events', 'attempt-access', 'activity-participation', 'activity-history', 'questionnaire-attempts', 'practical-submissions', 'attempt-attachments'],
})) {
  for (const file of files) test(`${module}/${file} owns application behavior without SQL`, () => {
    const source = readFileSync(new URL(`../apps/api/src/modules/${module}/application/${file}.ts`, import.meta.url), 'utf8');
    assert.doesNotMatch(source, /\b(?:SELECT|INSERT INTO|UPDATE \w+ SET|DELETE FROM)\b/);
    assert.doesNotMatch(source, /from ['"][^'"]*infrastructure\//);
    assert.doesNotMatch(source, /from ['"]node:/);
    assert.doesNotMatch(source, /\$transaction|\btx\.query\s*[(<]/);
  });
}

for (const module of ['grading', 'participation']) test(`${module} public surface exposes only application and domain`, () => {
  const source = readFileSync(new URL(`../apps/api/src/modules/${module}/public.ts`, import.meta.url), 'utf8');
  assert.doesNotMatch(source, /export\s+\*/);
  assert.doesNotMatch(source, /infrastructure|bootstrap/);
});

import ts from 'typescript';
registerHooks({ load(url, context, nextLoad) {
  if (!url.endsWith('.ts')) return nextLoad(url, context);
  return { format: 'module', shortCircuit: true, source: ts.transpileModule(readFileSync(new URL(url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2023 },
  }).outputText };
} });
import { createHash } from 'node:crypto';
// SQL expression snapshots from the pre-migration implementation at 29fda64.
const originalSqlHashes = {
  "grading/grading": "29c0b6f5808f6d8268eb4b0223d76861d7a8b263ca65f40876ffad17484cc38c",
  "grading/grade-publication": "e288984198f6e32f08c1f68ea495b7888d1ad46782d64017bcb193de7f166279",
  "grading/grade-corrections": "648819d415d18ae7198882f5122df426c86d0045448ed70ffefef9a689c5c917",
  "grading/progress": "ef8920b400e5c667596d813b71ba14994a55d6e30fabf3c1cd7297c83fbd170e",
  "grading/grading-ai/service": "e12a2b3f5e54499cfd71126011f7e0549760a95205fd8ecb01f1efe8c71db858",
  "participation/activity-session": "ba23e0e77db5f89b7b8959b45b205a3f28ebbd7d1995da39d2e4392c715dc39e",
  "participation/activity-eligibility": "b8a2cc86f1dca0ec90c7293d978f79afdd9767a7e43d2a974910f12943ed4c79",
  "participation/activity-events": "5259861d528955783e52fecc9d14bf272b926c4eee8e5062772434450bdb4c24",
  "participation/attempt-access": "1fe1244d38c7cd31453bf0e6c25e8280f84f18b59d6968f0f5f1035c8daa95ef",
  "participation/activity-participation": "fb2ef411acbb180d56870f2ef1ec2d46d8a0a2e1937c51b8d14d17f92ece81b8",
  "participation/activity-history": "5404210bafab978c7850bd8753f69c9d203c0d298b81799fbb5ac6db00385d4e",
  "participation/questionnaire-attempts": "487e21a89e97046c22d320e35d89d743e3a09e0990f861508efbdc7e860ad691",
  "participation/practical-submissions": "cb6ddcef7d97136afb8d3522a9c84c70bf6841f0d360b4fa2d8b7fb250b2c997",
  "participation/attempt-attachments": "bfd96010428eaeb70fdecd0d30c53dc55370540be9ceeb7e76f70615208205e1"
};
for (const [key, expected] of Object.entries(originalSqlHashes)) test(`${key} preserves original SQL expressions and lock modes`, () => {
 const [module, ...parts] = key.split('/');
 const file = parts.join('/');
 const source = readFileSync(new URL(`../apps/api/src/modules/${module}/infrastructure/${file}-repository.ts`, import.meta.url), 'utf8');
 const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true), sql = [];
 function visit(node) { if (ts.isCallExpression(node) && node.expression.getText(ast) === 'tx.query') sql.push(node.arguments[0].getText(ast).replaceAll('\r\n','\n')); ts.forEachChild(node,visit); }
 visit(ast);
 assert.equal(createHash('sha256').update(JSON.stringify(sql)).digest('hex'), expected);
});

test('grading authority passes the caller transaction and lock mode without opening another transaction', async () => {
  const { GradingService } = await import('../apps/api/src/modules/grading/application/grading.ts');
  const tx = { query() { throw Error('Application SQL is forbidden'); } }, actor = { id: 'teacher' }, calls = [];
  const attempt = { id: 'attempt', status: 'SUBMITTED', activity_id: 'activity', student_activity_id: 'obligation' };
  const service = new GradingService({
    async run() {},
    async classroom(...args) { calls.push(['classroom', ...args]); return { revision: 3n }; },
  }, { async activity(...args) { calls.push(['activity', ...args]); return { id: 'activity' }; } }, {
    async lockAttempt(...args) { calls.push(['attempt', ...args]); return [attempt]; },
    async lockGrade(...args) { calls.push(['grade', ...args]); return []; },
  });
  const id = '10000000-0000-4000-8000-000000000000';
  const result = await service.gradingContext(tx, actor, 'room', id, false);
  assert.equal(result.attempt, attempt);
  assert.deepEqual(calls.map(([name]) => name), ['classroom', 'attempt', 'activity', 'grade']);
  assert.deepEqual(calls[0], ['classroom', tx, actor, 'room', false, true]);
  assert.equal(calls[1][1], tx);
  assert.equal(calls[1][2], false);
  assert.equal(calls[3][1], tx);
  assert.equal(calls[3][2], false);
});

test('publication rejects a fractional manual hundredth before any mutation', async () => {
  const { GradePublicationService } = await import('../apps/api/src/modules/grading/application/grade-publication.ts');
  const tx = {}, actor = {}, writes = [];
  const context = { room: { revision: 3n, timezone: 'UTC' }, grade: { id: 'grade', is_published: false }, attempt: {}, activity: { id: 'activity' } };
  const service = new GradePublicationService({ async classroom() {}, async run(request, write, fn) { assert.equal(write, true); return fn(tx, actor); } }, {
    async gradingContext(receivedTx) { assert.equal(receivedTx, tx); return context; },
    async activityView() { return { questions: [{ id: 'question', type: 'DEVELOPMENT', points: '1.00' }] }; },
  }, { async lockQuestionGrades(receivedTx) { assert.equal(receivedTx, tx); return [{ question_id: 'question', numerator: '1', denominator: '3' }]; },
    async publishGrade() { writes.push('publish'); },
  });
  await assert.rejects(service.publishAttemptGrade({}, 'room', 'attempt', { revision: '3', confirm: true }), error => error.code === 'CONFLICT');
  assert.deepEqual(writes, []);
});

test('published correction keeps audit, update, revision and notification in the caller transaction', async () => {
  const { GradeCorrectionService } = await import('../apps/api/src/modules/grading/application/grade-corrections.ts');
  const tx = {}, actor = { id: 'teacher' }, calls = [];
  const context = { room: { revision: 3n }, grade: { id: 'grade', is_published: true, final_grade: '6.10', published_at: new Date(0) },
    attempt: { id: 'attempt', student_id: 'student' }, activity: { id: 'activity' } };
  const op = (name, value) => async (...args) => { assert.equal(args[0], tx); calls.push([name, ...args.slice(1)]); return value; };
  const service = new GradeCorrectionService({ async run(request, write, fn) { assert.equal(write, true); return fn(tx, actor); } }, {
    async gradingContext() { return context; }, advanceRevision: op('revision'),
  }, { insertCorrection: op('audit', []), updatePublishedGrade: op('update', [{ ...context.grade, final_grade: '7.25' }]),
    notifyCorrection: op('notify', []), corrections: op('readAudit', []),
  });
  const result = await service.correctPublishedGrade({}, 'room', 'attempt', { revision: '3', newGrade: '7.25', reason: 'Reviewed evidence', confirm: true });
  assert.deepEqual(calls.map(([name]) => name), ['audit', 'update', 'revision', 'notify', 'readAudit']);
  assert.deepEqual(calls[0], ['audit', 'grade', '6.10', '7.25', 'Reviewed evidence', 'teacher']);
  assert.equal(result.grade.finalGrade, '7.25');
  assert.equal(result.revision, '4');
});

test('attempt writes reject a student without an expected obligation before editor authorization', async () => {
  const { assertAttemptWrite } = await import('../apps/api/src/modules/participation/application/attempt-access.ts');
  const tx = {}, user = '10000000-0000-4000-8000-000000000001', room = '10000000-0000-4000-8000-000000000002';
  const attemptId = '10000000-0000-4000-8000-000000000003';
  let checkedEditor = false;
  const repository = {
    async lockClassroom() { return [{ archived_at: null }]; },
    async lockAttempt() { return [{ student_id: user, student_activity_id: 'obligation', status: 'DRAFT', activity_status: 'PUBLISHED',
      is_expected: false, deadline_at: null, individual_deadline_at: null, allow_late_submissions: true }]; },
    async membership() { return [{}]; }, async clock() { return [{ now: new Date(0) }]; },
    matchesEditor() { checkedEditor = true; return true; },
  };
  await assert.rejects(assertAttemptWrite(repository, tx, user, room, attemptId, { token: 'a'.repeat(43), epoch: '1' }), error => error.code === 'CONFLICT');
  assert.equal(checkedEditor, false);
});

test('submission revalidates after reads and persists the trusted receipt using the same transaction', async () => {
  const { QuestionnaireAttemptService } = await import('../apps/api/src/modules/participation/application/questionnaire-attempts.ts');
  const tx = {}, actor = { id: 'student' }, receipt = new Date('2026-11-10T12:00:00Z'), calls = [];
  const deadline = new Date('2026-11-10T11:59:00Z');
  const service = new QuestionnaireAttemptService({ ports: { gradingAiAvailable: true },
    async run(request, write, fn) { assert.equal(write, true); return fn(tx, actor); }, async classroom() {},
  }, {
    submissionReceipt() { return receipt; },
    async assertAttemptWrite(receivedTx, user, classroom, attempt, capability, revision, receivedAt) {
      assert.equal(receivedTx, tx); assert.equal(receivedAt, receipt); calls.push('authority');
      return { attempt: { activity_type: 'QUESTIONNAIRE', activity_id: 'activity' }, reception: { deadline, late: true } };
    },
    async questionnaireUnanswered(receivedTx) { assert.equal(receivedTx, tx); calls.push('answers'); return 1; },
    async submitAttempt(receivedTx, attemptId, receivedAt, appliedDeadline, late) {
      assert.equal(receivedTx, tx); assert.equal(receivedAt, receipt); assert.equal(appliedDeadline, deadline); assert.equal(late, true); calls.push('save');
      return [{ id: attemptId, submitted_at: receivedAt, applied_deadline_at: appliedDeadline, submitted_late: late, revision: 5n }];
    },
    async enqueueSubmittedAttemptGradingAi(receivedTx) { assert.equal(receivedTx, tx); calls.push('enqueue'); },
    async activityEvent(receivedTx) { assert.equal(receivedTx, tx); calls.push('event'); },
  });
  const result = await service.submitQuestionnaireAttempt({ headers: { 'x-attempt-editor': 'a'.repeat(43), 'x-attempt-epoch': '1' } }, 'room', 'attempt',
    { revision: '4', confirm: true, confirmIncomplete: true });
  assert.deepEqual(calls, ['authority', 'answers', 'authority', 'save', 'enqueue', 'event']);
  assert.equal(result.submittedAt, receipt);
  assert.equal(result.submittedLate, true);
});
