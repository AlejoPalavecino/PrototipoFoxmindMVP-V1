import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const cfg = { maxConcurrency: 1, deadlineMs: 30000, dailyActorRequests: 5, dailyGlobalRequests: 20,
  maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 1 };
const metadata = { model: 'synthetic', promptVersion: 'foxy-chat-v1', schemaVersion: 'foxy-answer-v1' };
const fakeProgress = { completion: { expected: 1, delivered: 1, pending: 0, onTime: 1, late: 0, pendingResubmissions: 0, percentage: '100' },
  performance: { graded: 0, average: null }, activities: [{ id: randomUUID(), title: 'Sintética', type: 'ASSIGNMENT', expected: true,
    firstSubmission: { late: false }, pendingResubmission: false, grade: null }] };

async function candidate(kind, f, query, database, options) {
  const id = randomUUID();
  if (kind === 'extraction') {
    const [draft] = await query('SELECT id FROM classroom_drafts WHERE owner_id=$1::uuid LIMIT 1', f.teacherActor);
    const file = randomUUID();
    await query(`INSERT INTO files(id,updated_at,classroom_draft_id,uploaded_by_id,storage_key,original_name,extension,size_bytes)
      VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf',5)`, file, draft.id, f.teacherActor, `test-extraction/${file}`);
    await query(`INSERT INTO classroom_curriculum_extractions(id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model)
      VALUES($1,$2,$3,$4,$5,0,'study-plan-v1','synthetic','synthetic')`, id, f.teacherActor, draft.id, file, 'a'.repeat(64));
    const { claim } = await import('../classrooms/ai/queue.ts');
    return { claim: () => claim({ database, configuration: options }), reset: () => query("UPDATE classroom_curriculum_extractions SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1", id) };
  }
  if (kind === 'activity') {
    await query(`INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model)
      VALUES($1,$2,$3,$4,'ASSIGNMENT',0,$5,'{}','{}','[]','activity-proposal-v1','synthetic','synthetic')`,
    id, f.teacherActor, f.rooms.teach.id, f.rooms.teach.unit, 'a'.repeat(64));
    const { claim } = await import('../../../../.build/api/apps/api/src/classrooms/activity-ai/queue.js');
    return { claim: () => claim({ classrooms: { ports: { database } }, configuration: options }),
      reset: () => query("UPDATE activity_ai_generations SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1", id) };
  }
  if (kind === 'grading') {
    const activity = await f.activity('teach'), attempt = await f.attempt(activity);
    await query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1::uuid', f.rooms.teach.id);
    await query(`INSERT INTO grading_ai_jobs(id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch)
      VALUES($1,$2,$3,$4,$5,'Sintético',0)`, id, f.rooms.teach.id, activity.id, attempt, f.teacherActor);
    const { createGradingAiSqlQueue } = await import('../classrooms/grading-ai/sql-queue.ts');
    const q = createGradingAiSqlQueue({ database, configuration: options });
    return { claim: () => q.claim(), reset: () => query("UPDATE grading_ai_jobs SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1", id) };
  }
  const { StudentAiWorker } = await import('../classrooms/student-ai/worker.ts');
  const worker = new StudentAiWorker({ classrooms: { ports: { database }, progressView: async () => fakeProgress }, configuration: options, provider: {} });
  const member = { enrollment_id: f.rooms.teach.enrollment, classroom_id: f.rooms.teach.id, student_id: f.pupil, owner_id: f.teacherActor };
  const tx = { query };
  return { claim: () => worker.claim(tx, member), reset: () => query('DELETE FROM student_ai_reports WHERE enrollment_id=$1::uuid', member.enrollment_id) };
}
async function activeFoxy(api, f, query, owner) {
  const tx = { query }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const { conversation } = await conversations.create(tx, owner, { requestId: randomUUID(), title: 'Foxy', context: { kind: 'GENERAL' } }, 'a'.repeat(64));
  const body = { requestId: randomUUID(), revision: '0', purpose: 'CHAT', text: 'Hola', selection: { topicIds: [], sourceIds: [] } };
  const { turn } = await turns.enqueue(tx, owner, conversation.id, body, { context: { kind: 'GENERAL' }, curriculum: null, sources: [] }, 'b'.repeat(64), metadata);
  await query("UPDATE foxy_turns SET state='RUNNING',lease_nonce=$2::uuid,lease_until=clock_timestamp()+interval '1 minute' WHERE id=$1::uuid", turn.id, randomUUID());
}

test('existing AI claimers respect synthetic active Foxy work globally and per teacher', { timeout: 120000 }, async t => {
  const api = await import('./index.ts');
  await withAgendaDatabase(async ({ pool, transaction }) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name, /_test$/);
    for (const kind of ['extraction', 'activity', 'grading', 'student']) for (const scope of ['global', 'owner']) {
      await t.test(`${kind}: Foxy ${scope} admission`, () => transaction(async ({ query }) => {
        // F5B does not yet define a Foxy lease migration; these temporary columns permit testing
        // existing SQL admission logic. This setup must not be cited as migration evidence.
        await query('ALTER TABLE foxy_turns ADD COLUMN IF NOT EXISTS lease_nonce uuid');
        await query('ALTER TABLE foxy_turns ADD COLUMN IF NOT EXISTS lease_until timestamptz');
        const f = await homeFixture(query), database = { $transaction: fn => fn({ $queryRawUnsafe: query }) };
        const configuration = { ...cfg, maxConcurrency: scope === 'global' ? 1 : 2 };
        const pending = await candidate(kind, f, query, database, configuration);
        assert.ok(await pending.claim(), 'positive control proves the candidate can otherwise be claimed');
        await pending.reset();
        await activeFoxy(api, f, query, scope === 'global' ? f.other : f.teacherActor);
        assert.ok((await pending.claim()) === null, `${kind} must count running Foxy work for ${scope}`);
      }));
    }
  });
});
