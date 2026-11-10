import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withGradingFixture } from './p8-grading-helpers.mjs';
import { GradingAiRuntime } from '../apps/api/src/modules/grading/infrastructure/grading-ai/runtime.ts';

const configuration = { maxConcurrency: 2, deadlineMs: 30000, dailyActorRequests: 20, dailyGlobalRequests: 20,
  maxInputTokens: 10000, maxOutputTokens: 200, inputUsdPerMillion: 1, outputUsdPerMillion: 1, dailyBudgetUsd: 5 };
const reader = { read: async () => { throw new Error('fixture sin archivos'); } };

test('entrega por servicio hasta resultado publicado con IA sintética y PostgreSQL efímero', { timeout: 150000 }, async t => {
  await withGradingFixture(async f => {
    const { pool, database, service, room, teacher, student, T, S, create } = f;
    service.ports.gradingAiAvailable = true;
    await pool.query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1', [room]);
    const calls = [], provider = {
      countGradingAiTokens: async input => { calls.push(['count', input]); return 30; },
      generateGradingAi: async input => {
        calls.push(['generate', input]);
        const evidence = input.evidence;
        return { json: { schemaVersion: 'grading-proposal-v1', overallGrade: evidence.type === 'ASSIGNMENT' ? '7.00' : null,
          overallFeedback: 'Devolución propuesta', questions: evidence.questions.map(q => ({ ref: q.ref,
            points: q.manual ? '1.00' : null, feedback: 'Comentario por pregunta' })), warnings: [] }, inputTokens: 30, outputTokens: 20 };
      },
    };
    const runtime = new GradingAiRuntime({ database, configuration, provider, reader, instructionReader: reader });
    try {
      for (const type of ['ASSIGNMENT', 'QUESTIONNAIRE', 'EVALUATION']) await t.test(type, async () => {
        const activity = await create(type); // actual service creates, publishes, opens and submits
        const queued = (await pool.query('SELECT id,state FROM grading_ai_jobs WHERE attempt_id=$1', [activity.attempt])).rows[0];
        assert.ok(queued); assert.equal(queued.state, 'QUEUED');
        assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE attempt_id=$1 AND event_type='GRADE_PUBLISHED'", [activity.attempt])).rows[0].n, 0);
        assert.equal(await runtime.runOnce(), true);
        const view = await service.getGradingAi(T, room, activity.attempt);
        assert.equal(view.id, queued.id); assert.equal(view.state, 'READY'); assert.ok(view.proposal); assert.ok(view.snapshotHash);
        assert.equal((await pool.query('SELECT count(*)::int n FROM attempt_grades WHERE attempt_id=$1', [activity.attempt])).rows[0].n, 0);
        assert.equal((await service.getAttemptResult(S, room, activity.attempt)).status, 'pending');
        assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE attempt_id=$1 AND event_type='GRADE_PUBLISHED'", [activity.attempt])).rows[0].n, 0);
        const gradeBefore = await service.getAttemptGrading(T, room, activity.attempt), edited = structuredClone(view.proposal);
        edited.overallFeedback = 'Revisada y aprobada por docente';
        const receipt = await service.applyGradingAi(T, room, activity.attempt, view.id,
          { requestId: randomUUID(), revision: gradeBefore.revision, snapshotHash: view.snapshotHash, proposal: edited });
        assert.equal(receipt.applied, true);
        const privateGrade = await service.getAttemptGrading(T, room, activity.attempt);
        assert.equal(privateGrade.grade.isPublished, false); assert.equal(privateGrade.grade.overallFeedback, 'Revisada y aprobada por docente');
        assert.equal((await service.getAttemptResult(S, room, activity.attempt)).status, 'pending');
        assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE attempt_id=$1 AND event_type='GRADE_PUBLISHED'", [activity.attempt])).rows[0].n, 0);
        await service.publishAttemptGrade(T, room, activity.attempt, { revision: privateGrade.revision, confirm: true });
        const published = await service.getAttemptResult(S, room, activity.attempt);
        assert.equal(published.status, 'published'); assert.equal(published.grade.overallFeedback, 'Revisada y aprobada por docente');
        assert.equal((await pool.query("SELECT count(*)::int n FROM notifications WHERE attempt_id=$1 AND event_type='GRADE_PUBLISHED'", [activity.attempt])).rows[0].n, 1);
        const providerInput = calls.filter(c => c[0] === 'generate').at(-1)[1].evidence;
        const serialized = JSON.stringify(providerInput); assert.ok(!serialized.includes(student)); assert.ok(!serialized.includes(teacher));
      });
    } finally { await runtime.onModuleDestroy(); }
  });
});
