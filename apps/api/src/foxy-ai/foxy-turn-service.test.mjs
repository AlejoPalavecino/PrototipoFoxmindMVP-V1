import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const isCode = (...codes) => error => codes.includes(error?.code);
const message = (revision = '0') => ({ requestId: randomUUID(), revision, purpose: 'SUMMARY', text: 'Resume', selection: { topicIds: [], sourceIds: [] } });
function privateFree(value) {
  const serialized = JSON.stringify(value);
  for (const field of ['snapshot', 'leaseNonce', 'lease_nonce', 'inputHash', 'input_hash', 'reserved_microusd', 'dispatch_count', 'metadata'])
    assert.equal(serialized.includes(field), false, field);
}
async function fixture(pool) {
  const api = await import('./index.ts'); assert.equal(typeof api.createFoxyTurnService, 'function');
  const query = async (sql, ...args) => (await pool.query(sql, args)).rows, f = await homeFixture(query), database = transactionDatabase(pool);
  const uow = api.createFoxyUnitOfWork({ database, authenticate: async (_tx, req) => { if (req.revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code: 'AUTH_REQUIRED' }); return req.id; } });
  const conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const service = enabled => api.createFoxyTurnService({ uow, conversations, turns, configuration: { enabled, model: 'synthetic-model' } });
  const owner = { id: f.teacherActor }, other = { id: f.other }, student = { id: f.pupil };
  const make = async context => (await uow.run(owner, true, (tx, actor) => conversations.create(tx, actor.id,
    { requestId: randomUUID(), title: 'Chat', context }, 'a'.repeat(64)))).conversation;
  return { service, owner, other, student, make, f, query };
}

test('send is idempotent before availability and replay never rebuilds context', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const { service, owner, make, query } = await fixture(pool), c = await make({ kind: 'GENERAL' }), input = message();
    const sent = await service(true).send(owner, c.id, input); assert.equal(sent.created, true); assert.equal(sent.conversationRevision, '1'); privateFree(sent);
    const replay = await service(false).send(owner, c.id, { ...input, selection: { sourceIds: [], topicIds: [] } });
    assert.equal(replay.created, false); assert.equal(replay.turn.id, sent.turn.id);
    await assert.rejects(service(false).send(owner, c.id, { ...input, text: 'Otro' }), isCode('CONFLICT'));
    await assert.rejects(service(false).send(owner, c.id, message('1')), isCode('AI_UNAVAILABLE'));
    const [row] = await query('SELECT count(*)::int n FROM foxy_turns WHERE conversation_id=$1::uuid', c.id); assert.equal(row.n, 1);
    const fetched = await service(false).get(owner, c.id, sent.turn.id); privateFree(fetched);
    const list = await service(false).list(owner, c.id, { afterSequence: 0, limit: 10 }); privateFree(list);
    assert.equal(list.length, 1); assert.equal(list[0].id, sent.turn.id);
  });
});

test('sending fences owner, revision and active turn and denies student or revoked session', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, other, student, make } = await fixture(pool), c = await make({ kind: 'GENERAL' });
    await assert.rejects(service(true).send(other, c.id, message()), isCode('FORBIDDEN', 'NOT_FOUND'));
    await assert.rejects(service(true).send(student, c.id, message()), isCode('FORBIDDEN'));
    await assert.rejects(service(true).send({ ...owner, revoked: true }, c.id, message()), isCode('AUTH_REQUIRED', 'FORBIDDEN'));
    const sent = await service(true).send(owner, c.id, message());
    await assert.rejects(service(true).send(owner, c.id, message('0')), isCode('CONFLICT'));
    await assert.rejects(service(true).send(owner, c.id, message('1')), isCode('CONFLICT'));
    await assert.rejects(service(true).get(other, c.id, sent.turn.id), isCode('NOT_FOUND', 'FORBIDDEN'));
  });
});

test('classroom is revalidated before new send and archived context remains readable', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, make, f, query } = await fixture(pool), c = await make({ kind: 'CLASSROOM', classroomId: f.rooms.teach.id });
    const input = message(), sent = await service(true).send(owner, c.id, input);
    await query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid', f.rooms.teach.id);
    const replay = await service(false).send(owner, c.id, input); assert.equal(replay.created, false); assert.equal(replay.turn.id, sent.turn.id);
    privateFree(await service(false).get(owner, c.id, sent.turn.id));
    await assert.rejects(service(true).send(owner, c.id, message('1')), isCode('FORBIDDEN', 'CONFLICT'));
  });
});

test('owner reads complete paginated turn DTOs with exact citations and without private fields', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const { service, owner, other, student, make, query } = await fixture(pool), c = await make({ kind: 'GENERAL' });
    const sourceId = `activity:${randomUUID()}`, citation = { sourceId, documentKey: 'd2', page: 1 };
    const answer = { schemaVersion: 'foxy-answer-v1', title: 'Síntesis', markdown: 'Contenido', references: [{ sourceId, page: 1 }], warnings: [], missingInformation: [] };
    const report = [{ sourceKey: 's1', title: 'Actividad', kind: 'ACTIVITY', documentKeys: ['d1','d2'], citations: [citation] }];
    const ids = [];
    for (let i = 0; i < 4; i++) {
      const sent = await service(true).send(owner, c.id, { ...message(String(i)), text: `Consulta ${i}` }); ids.push(sent.turn.id);
      if (i === 0 || i === 2) {
        const stored = i === 0 ? answer : { ...answer, markdown: 'Falta información', references: [], missingInformation: ['Falta información'] };
        await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map=$3::jsonb,source_report=$4::jsonb WHERE id=$1::uuid",
          ids[i], JSON.stringify(stored), JSON.stringify(i === 0 ? [{ sourceKey: 's1', sourceId, documentKeys: ['d1','d2'] }] : []), JSON.stringify(i === 0 ? report : []));
      } else if (i === 1) await query("UPDATE foxy_turns SET state='FAILED',error_code='AI_UNAVAILABLE' WHERE id=$1::uuid", ids[i]);
    }
    const ready = await service(false).get(owner, c.id, ids[0]); privateFree(ready);
    assert.equal(ready.purpose, 'SUMMARY'); assert.equal(ready.message, 'Consulta 0'); assert.equal(ready.state, 'READY');
    assert.deepEqual(ready.answer, answer); assert.equal(ready.errorCode, null); assert.deepEqual(ready.citations, [citation]);
    assert.equal(new Date(ready.createdAt).toISOString(), ready.createdAt);
    const failed = await service(false).get(owner, c.id, ids[1]); privateFree(failed);
    assert.equal(failed.state, 'FAILED'); assert.equal(failed.errorCode, 'AI_UNAVAILABLE'); assert.equal(failed.answer, null); assert.deepEqual(failed.citations, []);
    const insufficient = await service(false).get(owner, c.id, ids[2]); privateFree(insufficient);
    assert.deepEqual(insufficient.answer.missingInformation, ['Falta información']);
    const pending = await service(false).get(owner, c.id, ids[3]); privateFree(pending);
    assert.equal(pending.state, 'QUEUED'); assert.equal(pending.answer, null); assert.equal(pending.errorCode, null);
    const first = await service(false).list(owner, c.id, { afterSequence: 0, limit: 2 });
    const second = await service(false).list(owner, c.id, { afterSequence: first.at(-1).sequence, limit: 2 });
    assert.deepEqual([...first, ...second].map(x => x.id), ids); for (const turn of [...first, ...second]) { privateFree(turn); assert.equal(typeof turn.message, 'string'); }
    await assert.rejects(service(false).get(other, c.id, ids[0]), isCode('NOT_FOUND', 'FORBIDDEN'));
    await assert.rejects(service(false).get(student, c.id, ids[0]), isCode('FORBIDDEN'));
  });
});
