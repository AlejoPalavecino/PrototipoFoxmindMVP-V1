import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createStudyService } from '../../../folders/application/service.ts';
import { createStudentUnitOfWork } from '../../../folders/infrastructure/unit-of-work.ts';
import { createFolderRepository } from '../../../folders/infrastructure/folder-repository.ts';
import type { FolderRow, StudyDatabase, StudySource } from '../../../application/contracts.ts';
import { executeStudy, type StudyInput, type StudyResult } from '../../../../../../../../src/core/domain/study/engine.ts';

function deferred<T>() {
  let resolve!: (value: T) => void, reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
type Generation = { requestId: string; kind: string; topicIds: string[]; sourceIds?: string[]; questionCount: number;
  difficulty: string; status: string; reason?: string; missingInformation?: string[] };
type Turn = { id: string; role: string; text?: string; generation?: Generation; generationRequestId?: string;
  creationId?: string; practiceId?: string; sourceRefs?: { id: string; version: string }[]; sourceUnavailable?: boolean };
function fixture() {
  const owner = randomUUID(), conversationId = randomUUID(), topicId = randomUUID(), sourceId = randomUUID();
  let row: FolderRow = { id: randomUUID(), owner_id: owner, revision: 1n, status: 'ACTIVE', created_at: new Date(), updated_at: new Date(),
    state: { version: 1, fields: { name: 'Privada', subject: 'Historia', academicYear: 2026, bannerKey: 'general',
      units: [{ id: randomUUID(), title: 'Unidad', topics: [{ id: topicId, title: 'Tema' }] }], linkedClassroomId: null, planFileId: null },
      conversations: [{ id: conversationId, title: 'Anterior', turns: [] }], materials: [], creations: [], practices: [], exams: [], memory: {}, receipts: {} } };
  const source: StudySource = { id: sourceId, version: sourceId, fileId: sourceId, title: 'Fuente sintética', origin: 'OWN', available: true, text: 'Información autorizada' };
  let available = true, attachmentOnly = false, role = 'student', verified = true, generated = 0, provider: (input: StudyInput) => Promise<StudyResult> = async () => note();
  const inputs: StudyInput[] = [], ready = deferred<void>();
  const query = async (sql: string, ...values: unknown[]) => {
    if (sql.includes('FROM users')) return [{ account_role: role, email_verified_at: verified ? new Date() : null }];
    if (sql.includes('FROM study_folders')) return values[0] === row.id && values[1] === row.owner_id && row.status !== 'DELETED' ? [structuredClone(row)] : [];
    if (sql.includes('UPDATE study_folders')) {
      assert.equal(values[0], row.id); assert.equal(values[1], row.owner_id);
      row = { ...row, state: JSON.parse(String(values[2])), status: values[3] as FolderRow['status'], revision: row.revision + 1n };
      return [structuredClone(row)];
    }
    return [];
  };
  const database: StudyDatabase = { async $transaction(operation) {
    const before = structuredClone(row);
    try { return await operation({ $queryRawUnsafe: async <T>(sql: string, ...values: unknown[]) => await query(sql, ...values) as T }); }
    catch (error) { row = before; throw error; }
  } };
  const authenticate = async (_tx: unknown, request: unknown) => (request as { owner?: string }).owner ?? owner;
  const makeService = () => createStudyService({ uow: createStudentUnitOfWork({ database, authenticate }), folders: createFolderRepository(),
    newId: randomUUID, digest: value => createHash('sha256').update(value).digest('hex'),
    sources: async () => available && !attachmentOnly ? [structuredClone(source)] : [], linkedClassrooms: async () => [], verifyLink: async () => {}, importPlan: async () => null,
    files: { assertOwn: async () => {}, chatSources: async (_tx, id, folderId, chatId) => {
      assert.equal(id, owner); assert.equal(folderId, row.id);
      return available && attachmentOnly && (!chatId || chatId === conversationId) ? [{ ...source, conversationId }] : [];
    } },
    feedback: async input => { assert.deepEqual(input.sources.map(s => s.id), [sourceId]); return { orientative: true, status: 'COMPLETE', title: 'Devoluci�n', markdown: 'Devoluci�n sint�tica', sourceRefs: [{ id: sourceId, version: sourceId }], missingInformation: [] }; },
    generate: async (input, context) => {
      await context?.authorize?.(); generated++; inputs.push(structuredClone(input as StudyInput)); ready.resolve(); return provider(input as StudyInput);
    } });
  function note(): StudyResult { return { status: 'COMPLETE', title: 'Apunte real', markdown: 'Contenido del proveedor sintético.', sourceRefs: [{ id: sourceId, version: sourceId }], missingInformation: [] }; }
  const service = makeService();
  return { service, makeService, ready, inputs, owner, conversationId, topicId, sourceId, note,
    get row() { return row; }, get generated() { return generated; }, revoke() { available = false; }, attachOnly() { attachmentOnly = true; },
    actor(next: string, isVerified = true) { role = next; verified = isVerified; }, provider(next: typeof provider) { provider = next; },
    input(extra: Record<string, unknown> = {}) { return { action: 'GENERATE', revision: String(row.revision), requestId: randomUUID(),
      conversationId, kind: 'NOTE', message: 'Prepará un apunte con ejemplos.', topicIds: [topicId], ...extra }; } };
}
function turns(detail: Awaited<ReturnType<ReturnType<typeof createStudyService>['get']>>, index = 0) {
  return detail.conversations[index]!.turns as unknown as Turn[];
}
async function started(f: ReturnType<typeof fixture>, operation: Promise<unknown>) {
  await Promise.race([f.ready.promise, operation.then(() => { throw new Error('Provider did not reach pending state'); })]);
}

test('PENDING survives a new service/read and COMPLETE links exactly one persisted resource without fake assistant text', async () => {
  const f = fixture(), finish = deferred<StudyResult>(); f.provider(() => finish.promise);
  const original = [{ id: randomUUID(), role: 'user', text: 'Consulta anterior', sourceRefs: [{ id: f.sourceId, version: f.sourceId }] }];
  f.row.state.conversations[0]!.turns = structuredClone(original);
  const input = f.input(), waiting = f.service.command({}, f.row.id, input); await started(f, waiting);
  const pending = turns(await f.makeService().get({}, f.row.id));
  assert.equal(pending.length, 2); assert.deepEqual(pending[0], { ...original[0], sourceUnavailable: false });
  assert.equal(pending[1]!.text, input.message);
  assert.deepEqual(pending[1]!.generation, { requestId: input.requestId, kind: 'NOTE', topicIds: [f.topicId], questionCount: 5, difficulty: 'MEDIUM', status: 'PENDING' });
  assert.deepEqual((await f.service.command({}, f.row.id, input)).result, { status: 'PENDING', requestId: input.requestId });
  assert.equal(f.generated, 1);
  finish.resolve(f.note()); const complete = await waiting;
  const detail = await f.makeService().get({}, f.row.id), result = turns(detail), card = result[2]!;
  assert.equal(result[1]!.generation!.status, 'COMPLETE'); assert.equal(result.length, 3);
  assert.equal(card.generationRequestId, input.requestId); assert.equal(card.creationId, (detail.creations[0]! as Record<string, unknown>).id);
  assert.equal(card.role, 'assistant'); assert.equal(Object.hasOwn(card, 'text'), false); assert.equal(Object.hasOwn(card, 'practiceId'), false);
  assert.equal(detail.creations.length, 1); assert.deepEqual(f.inputs[0]!.history, original);
  const snapshot = structuredClone(f.row);
  assert.deepEqual(await f.service.command({}, f.row.id, input), complete); assert.deepEqual(f.row, snapshot); assert.equal(f.generated, 1);
  await assert.rejects(f.service.command({}, f.row.id, { ...input, message: 'Otro contenido' }), { code: 'CONFLICT' });
});

test('practice card and request expose no answer key, explanation or private generated markdown', async () => {
  const f = fixture(); f.provider(async () => ({ ...f.note(), markdown: 'PRIVATE_MARKDOWN', practice: { title: 'Práctica', questions: [{
    id: 'q1', topicId: f.topicId, type: 'SINGLE', prompt: 'Elegí una opción', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }],
    correctOptionIds: ['a'], explanation: 'PRIVATE_EXPLANATION', sourceRefs: [{ id: f.sourceId, version: f.sourceId }] }] } }));
  const input = f.input({ kind: 'QUIZ', questionCount: 1 }); const response = await f.service.command({}, f.row.id, input);
  const detail = await f.makeService().get({}, f.row.id), card = turns(detail)[1]!;
  assert.equal(card.practiceId, (detail.practices[0]! as Record<string, unknown>).id); assert.equal(card.generationRequestId, input.requestId);
  assert.equal(Object.hasOwn(card, 'creationId'), false); assert.equal(Object.hasOwn(card, 'text'), false);
  assert.doesNotMatch(JSON.stringify({ response, detail }), /PRIVATE_MARKDOWN|PRIVATE_EXPLANATION|correctOptionIds|privatePractice/);
});

test('cancellation after reservation survives reload, preserves the request and discards late output and replay', async () => {
  const f = fixture(), finish = deferred<StudyResult>(); f.provider(() => finish.promise);
  const input = f.input(), waiting = f.service.command({}, f.row.id, input); await started(f, waiting);
  await assert.rejects(f.service.command({ owner: randomUUID() }, f.row.id, { action: 'CANCEL_GENERATION', targetRequestId: input.requestId }), { code: 'FORBIDDEN' });
  const cancelled = await f.service.command({}, f.row.id, { action: 'CANCEL_GENERATION', targetRequestId: input.requestId });
  assert.equal(turns(await f.makeService().get({}, f.row.id))[0]!.generation!.status, 'CANCELLED');
  finish.resolve(f.note()); assert.deepEqual((await waiting).result, cancelled.result);
  assert.deepEqual((await f.service.command({}, f.row.id, input)).result, cancelled.result);
  assert.equal(f.generated, 1); assert.equal(f.row.state.creations.length, 0); assert.equal((f.row.state.conversations[0]!.turns as unknown[]).length, 1);
});

test('failure/insufficiency stay visible without cards and terminal retry requires a new request', async () => {
  for (const outcome of ['FAILED', 'INSUFFICIENT']) {
    const f = fixture(); f.provider(async () => { if (outcome === 'FAILED') throw new Error('Synthetic failure');
      return { status: 'INSUFFICIENT', title: 'Faltan fuentes', markdown: '', sourceRefs: [], missingInformation: ['Agregá material.'] }; });
    const input = f.input(), attempt = f.service.command({}, f.row.id, input);
    if (outcome === 'FAILED') await assert.rejects(attempt, /Synthetic failure/); else await attempt;
    let detail = await f.makeService().get({}, f.row.id);
    assert.equal(turns(detail)[0]!.generation!.status, outcome); assert.equal(turns(detail).length, 1);
    if (outcome === 'INSUFFICIENT') assert.deepEqual(turns(detail)[0]!.generation!.missingInformation, ['Agregá material.']);
    await f.service.command({}, f.row.id, input); assert.equal(f.generated, 1);
    f.provider(async () => f.note()); await f.service.command({}, f.row.id, f.input());
    detail = await f.makeService().get({}, f.row.id);
    assert.equal(turns(detail).length, 3); assert.equal(turns(detail)[0]!.generation!.status, outcome);
    assert.equal(turns(detail)[1]!.generation!.status, 'COMPLETE'); assert.equal(detail.creations.length, 1);
    assert.deepEqual(f.inputs[1]!.history, []);
  }
});

test('expired pending reads project INTERRUPTED without mutation; fresh explicit retry blocks the old response', async () => {
  const f = fixture(), finish = deferred<StudyResult>(); f.provider(() => finish.promise);
  const input = f.input(), waiting = f.service.command({}, f.row.id, input); await started(f, waiting);
  f.row.state.receipts[input.requestId]!.pendingAt = new Date(Date.now() - 700000).toISOString();
  const snapshot = structuredClone(f.row), expired = turns(await f.makeService().get({}, f.row.id))[0]!.generation!;
  assert.equal(expired.status, 'FAILED'); assert.equal(expired.reason, 'INTERRUPTED'); assert.deepEqual(f.row, snapshot);
  f.provider(async () => f.note()); await f.service.command({}, f.row.id, f.input());
  finish.resolve(f.note()); await assert.rejects(waiting, { code: 'CONFLICT' });
  assert.equal(f.row.state.creations.length, 1); assert.equal(turns(await f.service.get({}, f.row.id)).filter(t => t.creationId).length, 1);
});

for (const expired of [true, false]) test(`a late ${expired ? 'expired' : 'superseded'} attempt cannot advance revision and invalidate its still-pending replacement`, async () => {
  const f = fixture(), oldFinish = deferred<StudyResult>(); f.provider(() => oldFinish.promise);
  const oldInput = f.input(), oldWaiting = f.service.command({}, f.row.id, oldInput); await started(f, oldWaiting);
  if (expired) f.row.state.receipts[oldInput.requestId]!.pendingAt = new Date(Date.now() - 700000).toISOString();
  const nextReady = deferred<void>(), nextFinish = deferred<StudyResult>();
  f.provider(() => { nextReady.resolve(); return nextFinish.promise; });
  const nextInput = f.input(), nextWaiting = f.service.command({}, f.row.id, nextInput);
  await Promise.race([nextReady.promise, nextWaiting.then(() => { throw new Error('Retry did not reach provider'); })]);
  const retryRevision = f.row.revision;
  oldFinish.resolve(f.note()); await assert.rejects(oldWaiting, { code: 'CONFLICT' });
  assert.equal(f.row.revision, retryRevision, 'late failure must not mutate the newer reservation');
  nextFinish.resolve(f.note()); await nextWaiting;
  const detail = await f.service.get({}, f.row.id);
  assert.equal(detail.creations.length, 1); assert.equal(turns(detail)[0]!.generation!.status, 'FAILED');
  assert.equal(turns(detail)[0]!.generation!.reason, expired ? 'INTERRUPTED' : undefined);
  assert.equal(turns(detail)[1]!.generation!.status, 'COMPLETE');
  assert.equal(turns(detail)[2]!.generationRequestId, nextInput.requestId);
});

test('ownership, role, conversation scope, payload and quotas reject before reservation/provider', async () => {
  for (const scenario of ['owner', 'teacher', 'unverified', 'foreign-conversation', 'invalid-id', 'empty-message', 'plan', 'draft', 'turn-quota', 'byte-quota']) {
    const f = fixture(), input = f.input(), request: { owner?: string } = {};
    let code = 'INVALID_INPUT';
    if (scenario === 'owner') { request.owner = randomUUID(); code = 'FORBIDDEN'; }
    if (scenario === 'teacher') { f.actor('teacher'); code = 'FORBIDDEN'; }
    if (scenario === 'unverified') { f.actor('student', false); code = 'FORBIDDEN'; }
    if (scenario === 'foreign-conversation') { input.conversationId = randomUUID(); code = 'FORBIDDEN'; }
    if (scenario === 'invalid-id') Object.assign(input, { conversationId: 'invalid' });
    if (scenario === 'empty-message') input.message = '';
    if (scenario === 'plan') input.kind = 'PLAN';
    if (scenario === 'draft') { f.row.status = 'DRAFT'; code = 'CONFLICT'; }
    if (scenario === 'turn-quota') { f.row.state.conversations[0]!.turns = Array.from({ length: 199 }, () => ({ role: 'user', text: 'A', sourceRefs: [] })); code = 'QUOTA_EXCEEDED'; }
    if (scenario === 'byte-quota') { f.row.state.memory = { text: 'a'.repeat(3_000_000) }; code = 'QUOTA_EXCEEDED'; }
    const snapshot = structuredClone(f.row);
    await assert.rejects(f.service.command(request, f.row.id, input), { code });
    assert.equal(f.generated, 0, scenario); assert.deepEqual(f.row, snapshot, scenario);
  }
});

test('new conversation keeps earlier chats intact, with generated cards excluded from later provider history', async () => {
  const f = fixture();
  const next = await f.service.command({}, f.row.id, { action: 'NEW_CONVERSATION', title: 'Nueva', revision: '1', requestId: randomUUID() });
  const conversationId = (next.result as { conversation: { id: string } }).conversation.id;
  await f.service.command({}, f.row.id, f.input({ conversationId }));
  await f.service.command({}, f.row.id, f.input({ conversationId, kind: 'OUTLINE' }));
  const detail = await f.service.get({}, f.row.id);
  assert.equal(turns(detail, 0).length, 0); assert.equal(turns(detail, 1).length, 4);
  assert.deepEqual(f.inputs.map(input => input.history), [[], []]); assert.equal(detail.creations.length, 2);
});

test('revoked sources cannot apply late resources and prior cards carry the availability warning', async () => {
  const f = fixture(); await f.service.command({}, f.row.id, f.input());
  const finish = deferred<StudyResult>(), secondReady = deferred<void>(); f.provider(() => { secondReady.resolve(); return finish.promise; });
  const waiting = f.service.command({}, f.row.id, f.input());
  await Promise.race([secondReady.promise, waiting.then(() => { throw new Error('Second generation did not reach provider'); })]);
  f.revoke(); finish.resolve(f.note()); await assert.rejects(waiting, { code: 'SOURCE_UNAVAILABLE' });
  const detail = await f.service.get({}, f.row.id);
  assert.equal(detail.creations.length, 1); assert.equal(turns(detail)[1]!.sourceUnavailable, true);
  assert.equal(turns(detail)[2]!.generation!.status, 'FAILED');
});

test('GENERATE without conversation and PLAN preserve their legacy response and do not add chat turns', async () => {
  const f = fixture(); const legacy = f.input(); delete (legacy as { conversationId?: string }).conversationId;
  await f.service.command({}, f.row.id, legacy);
  f.provider(async () => ({ ...f.note(), units: [{ title: 'Unidad importada', topics: ['Tema importado'] }] }));
  const plan = f.input({ kind: 'PLAN' }); delete (plan as { conversationId?: string }).conversationId;
  const response = await f.service.command({}, f.row.id, plan);
  assert.ok((response.result as { units: unknown[] }).units.length);
  assert.equal(turns(await f.service.get({}, f.row.id)).length, 0); assert.equal(f.row.state.creations.length, 1);
});

test('conversation attachments stay private and authorize creation warnings, practice retry and feedback', async () => {
  const f = fixture(); f.attachOnly();
  await f.service.command({}, f.row.id, f.input({ sourceIds: [f.sourceId] }));
  assert.equal((await f.service.get({}, f.row.id)).creations[0]!.sourceUnavailable, false);
  f.provider(async () => ({ ...f.note(), markdown: '', practice: { title: 'Práctica', questions: [{ id: 'q1', topicId: f.topicId,
    type: 'SINGLE', prompt: 'Elegí A', options: [{ id: 'a', text: 'A' }, { id: 'b', text: 'B' }], correctOptionIds: ['a'],
    explanation: 'Privada', sourceRefs: [{ id: f.sourceId, version: f.sourceId }] }] } }));
  await f.service.command({}, f.row.id, f.input({ kind: 'QUIZ', questionCount: 1 }));
  const previous = f.row.state.practices[0]!; previous.status = 'FINALIZED'; previous.answers = { q1: ['a'] };
  const retry = await f.service.command({}, f.row.id, { action: 'NEW_ATTEMPT', practiceId: previous.id, revision: String(f.row.revision), requestId: randomUUID() });
  assert.equal((retry.result as { practice: { conversationId: string } }).practice.conversationId, f.conversationId);
  await f.service.command({}, f.row.id, { action: 'RETRY_FEEDBACK', practiceId: previous.id, revision: String(f.row.revision), requestId: randomUUID() });
  const foreign = await f.service.command({}, f.row.id, { action: 'NEW_CONVERSATION', title: 'Sin adjunto', revision: String(f.row.revision), requestId: randomUUID() });
  const otherConversationId = (foreign.result as { conversation: { id: string } }).conversation.id, beforeCalls = f.generated;
  await assert.rejects(f.service.command({}, f.row.id, f.input({ conversationId: otherConversationId, sourceIds: [f.sourceId] })), { code: 'SOURCE_UNAVAILABLE' });
  assert.equal(f.generated, beforeCalls);
  f.revoke();
  await assert.rejects(f.service.command({}, f.row.id, { action: 'NEW_ATTEMPT', practiceId: previous.id, revision: String(f.row.revision), requestId: randomUUID() }), { code: 'SOURCE_UNAVAILABLE' });
  assert.equal((await f.service.get({}, f.row.id)).creations[0]!.sourceUnavailable, true);
});

test('a later CHAT passes the real engine contract without forwarding result markers or generation requests', async () => {
  const f = fixture(); await f.service.command({}, f.row.id, f.input());
  f.provider(async input => executeStudy(input, { generate: async () => f.note() }));
  await f.service.command({}, f.row.id, { action: 'CHAT', conversationId: f.conversationId, message: 'Explicalo de otra forma.',
    revision: String(f.row.revision), requestId: randomUUID() });
  assert.deepEqual(f.inputs[1]!.history, []);
  assert.equal(turns(await f.service.get({}, f.row.id)).length, 4);
});

test('a cancelled generation at 198 turns leaves 199 and CHAT rejects its two-turn cost before provider', async () => {
  const f = fixture(), finish = deferred<StudyResult>(); f.provider(() => finish.promise);
  f.row.state.conversations[0]!.turns = Array.from({ length: 198 }, () => ({ id: randomUUID(), role: 'user', text: 'Consulta anterior', sourceRefs: [] }));
  const input = f.input(), waiting = f.service.command({}, f.row.id, input); await started(f, waiting);
  await f.service.command({}, f.row.id, { action: 'CANCEL_GENERATION', targetRequestId: input.requestId });
  finish.resolve(f.note()); await waiting;
  assert.equal(turns(await f.service.get({}, f.row.id)).length, 199);
  const snapshot = structuredClone(f.row), calls = f.generated;
  await assert.rejects(f.service.command({}, f.row.id, { action: 'CHAT', conversationId: f.conversationId, message: 'Otro mensaje',
    revision: String(f.row.revision), requestId: randomUUID() }), { code: 'QUOTA_EXCEEDED' });
  assert.equal(f.generated, calls); assert.deepEqual(f.row, snapshot);
});
