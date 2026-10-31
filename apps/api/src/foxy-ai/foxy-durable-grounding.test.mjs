import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const hash = 'a'.repeat(64), metadata = { model: 'synthetic', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const cfg = { maxConcurrency: 1, deadlineMs: 30000, maxJobAgeMs: 300000, dailyActorRequests: 5, dailyGlobalRequests: 20,
  maxOutputTokens: 100, inputUsdPerMillion: 2, outputUsdPerMillion: 3, dailyBudgetUsd: 1 };
async function file(query, room, purpose, targetId = null) {
  const id = randomUUID();
  await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
    validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,
  id, room.id, room.teacher, `test-durable-grounding/${id}`);
  await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), id);
  await query(`INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest)
    VALUES($1,$2,$3,'ready',$4,$4,$4)`, id, purpose, targetId, hash);
  return id;
}
function host(query, owner) {
  return { run: async (_req, _write, fn) => fn({ query }, { id: owner, account_role: 'teacher' }),
    classroom: async (_tx, actor, id, _write, teacherOnly) => {
      assert.equal(teacherOnly, true); const [room] = await query('SELECT * FROM classrooms WHERE id=$1::uuid', id);
      if (!room || room.teacher_id !== actor.id) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); return room;
    } };
}
async function setup(api, query, f) {
  const room = f.rooms.teach, materialId = randomUUID(), materialFile = await file(query, room, 'material');
  await query("INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id) VALUES($1,now(),$2,'Material anterior',$3,$4)", materialId, room.id, materialFile, f.teacherActor);
  const plans = [];
  for (const version of [1, 2]) {
    const planFile = await file(query, room, 'plan'), id = randomUUID();
    await query('INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id) VALUES($1,now(),$2,$3,$4,$5)', id, room.id, version, planFile, f.teacherActor);
    plans.push({ id, fileId: planFile });
  }
  const activity = await f.activity('teach');
  await query("UPDATE activities SET instructions_text='Consigna pública',ai_grading_rubric='RUBRICA_PRIVADA' WHERE id=$1", activity.id);
  const conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository(), tx = { query };
  const context = { kind: 'CLASSROOM', classroomId: room.id };
  const { conversation } = await conversations.create(tx, f.teacherActor, { requestId: randomUUID(), title: 'D2', context }, hash);
  const selection = { topicIds: [room.topic], sourceIds: [`plan:${plans[0].id}`, `material:${materialId}`, `activity:${activity.id}`] };
  const snapshotter = new api.FoxyGroundingSnapshotService(host(query, f.teacherActor), conversations), snapshot = await snapshotter.capture({}, conversation.id, selection);
  const { turn } = await turns.enqueue(tx, f.teacherActor, conversation.id,
    { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Consulta', selection }, snapshot, hash, metadata);
  let transactions = 0;
  const database = { $transaction: async fn => { transactions++; return fn({ $queryRawUnsafe: query }); } };
  const queue = api.createFoxyTurnQueue({ database, configuration: cfg }), lease = await queue.claim(); assert.equal(lease.turnId, turn.id);
  const authority = api.createFoxyClaimAuthority({ database, maxJobAgeMs: cfg.maxJobAgeMs }), controller = new AbortController();
  const scope = await authority.open(lease, controller.signal);
  return { tx, authority, lease, scope, signal: controller.signal, controller, materialId, materialFile, plans, activity, snapshot, calls: () => transactions };
}

test('durable grounding rechecks the live selected source data with lease authority', { timeout: 120000 }, async t => {
  const api = await import('./index.ts');
  assert.equal(typeof api.createFoxyClaimAuthority, 'function');
  const shape = api.createFoxyClaimAuthority({ database: { $transaction: async () => {} }, maxJobAgeMs: cfg.maxJobAgeMs });
  assert.equal(typeof shape.revalidateGrounding, 'function');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    const check = (name, operation) => t.test(name, () => transaction(async ({ query }) => {
      const f = await homeFixture(query), x = await setup(api, query, f); await operation({ f, query, ...x });
    }));

    await check('historical plan remains valid and private rubric never enters snapshot', async ({ authority, scope, signal, snapshot }) => {
      assert.equal(await authority.revalidateGrounding(scope.capability, signal), true);
      assert.equal(JSON.stringify(snapshot).includes('RUBRICA_PRIVADA'), false);
      assert.equal(snapshot.sources[0].title, 'Plan 1');
    });
    await check('injected transaction is reused', async ({ authority, scope, signal, tx, calls }) => {
      const before = calls(); assert.equal(await authority.revalidateGrounding(scope.capability, signal, tx), true); assert.equal(calls(), before);
    });
    for (const mutation of ['topic', 'material', 'activity', 'file', 'historical-plan-file']) await check(`${mutation} change invalidates snapshot`, async ({ f, query, authority, scope, signal, materialId, materialFile, plans, activity }) => {
      if (mutation === 'topic') await query("UPDATE topics SET name='Tema modificado' WHERE id=$1::uuid", f.rooms.teach.topic);
      if (mutation === 'material') await query("UPDATE materials SET title='Material modificado' WHERE id=$1::uuid", materialId);
      if (mutation === 'activity') await query("UPDATE activities SET instructions_text='Consigna modificada' WHERE id=$1::uuid", activity.id);
      if (mutation === 'file') await query("UPDATE files SET scan_status='PENDING' WHERE id=$1::uuid", materialFile);
      if (mutation === 'historical-plan-file') await query("UPDATE files SET scan_status='PENDING' WHERE id=$1::uuid", plans[0].fileId);
      assert.equal(await authority.revalidateGrounding(scope.capability, signal), false);
    });
    await check('unrelated classroom revision and private rubric changes do not invalidate', async ({ f, query, authority, scope, signal, activity }) => {
      await query('UPDATE classrooms SET revision=revision+1 WHERE id=$1::uuid', f.rooms.teach.id);
      await query("UPDATE activities SET ai_grading_rubric='OTRA_RUBRICA_PRIVADA' WHERE id=$1::uuid", activity.id);
      assert.equal(await authority.revalidateGrounding(scope.capability, signal), true);
    });
    for (const mode of ['forged', 'expired', 'unverified', 'deleted', 'archived', 'abort']) await check(`${mode} authority is denied`, async ({ f, query, authority, lease, scope, signal, controller }) => {
      if (mode === 'expired') await query("UPDATE foxy_turns SET lease_until=clock_timestamp()-interval '1 second' WHERE id=$1::uuid", lease.turnId);
      if (mode === 'unverified') await query('UPDATE users SET email_verified_at=NULL WHERE id=$1::uuid', f.teacherActor);
      if (mode === 'deleted') await query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1::uuid', lease.conversationId);
      if (mode === 'archived') await query('UPDATE classrooms SET archived_at=now() WHERE id=$1::uuid', f.rooms.teach.id);
      if (mode === 'abort') controller.abort();
      await assert.rejects(authority.revalidateGrounding(mode === 'forged' ? {} : scope.capability, signal));
    });
  });
});
