import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from './agenda-database-helpers.test.mjs';
import { createGeminiStudyProvider } from '../apps/api/src/modules/study/generation/infrastructure/providers/study-adapter.ts';
import { initializeAiExecutionPolicy } from '../apps/api/src/platform/ai/execution-policy.ts';
import { snapshotForTask } from '../apps/api/src/platform/ai/execution-snapshot.ts';

const configuration = () => ({ backend: 'gemini-developer', model: 'synthetic-gemini-study', apiKey: 'synthetic-only-gemini',
  maxInputTokens: 1000, maxOutputTokens: 100, deadlineMs: 10000, maxConcurrency: 2, maxDispatches: 1, maxJobAgeMs: 60000,
  inputUsdPerMillion: 1, outputUsdPerMillion: 2, dailyBudgetUsd: 10, dailyActorRequests: 100, dailyGlobalRequests: 100 });
function databaseFor(pool) {
  return { async $transaction(operation) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await operation({ $queryRawUnsafe: async (sql, ...values) => (await client.query(sql, values)).rows });
      await client.query('COMMIT'); return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  } };
}
const sourceRef = { id: 'synthetic-source', version: 'v1' };
const answer = { status: 'COMPLETE', title: 'Respuesta sintética', markdown: 'La célula es la unidad de estudio.',
  sourceRefs: [sourceRef], missingInformation: [] };
const input = { system: 'Usá sólo la fuente sintética autorizada.',
  prompt: JSON.stringify({ action: 'CHAT', message: 'Explicá el concepto.', topics: [], sources: [sourceRef] }),
  documents: [{ sourceRef, document: { kind: 'text', text: 'La célula es la unidad de estudio.' } }] };

test('Study persists selected Gemini/Claude profiles and prices through real SQL without external calls', { timeout: 120000 }, async t => {
  const calls = [], events = [];
  let selected = 'gemini', live;
  // Install before either SDK/client is constructed. Every outbound fetch terminates here.
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    const address = String(url), body = JSON.parse(options.body);
    const provider = address.includes('generativelanguage.googleapis.com') ? 'gemini'
      : address.includes('api.anthropic.com') ? 'anthropic' : 'unexpected';
    assert.equal(provider, selected, 'no fallback or unknown endpoint may be contacted');
    const count = address.includes('countTokens') || address.includes('count_tokens');
    assert.ok(count || address.includes('generateContent') || /\/messages(?:\?|$)/u.test(address));
    calls.push({ provider, stage: count ? 'count' : 'generate', url: address, body }); events.push(count ? 'count' : 'generate');
    if (count) Object.assign(live, { model: 'mutated-live-model', maxOutputTokens: 900, inputUsdPerMillion: 90, outputUsdPerMillion: 90 });
    if (provider === 'gemini') return Response.json(count ? { totalTokens: 40 } : {
      candidates: [{ content: { role: 'model', parts: [{ text: JSON.stringify(answer) }] }, finishReason: 'STOP' }],
      usageMetadata: { promptTokenCount: 40, candidatesTokenCount: 7, thoughtsTokenCount: 3 },
    });
    return Response.json(count ? { input_tokens: 40 } : { id: 'synthetic-study-message', type: 'message', role: 'assistant',
      model: 'synthetic-claude-study', stop_reason: 'end_turn', content: [{ type: 'text', text: JSON.stringify(answer) }],
      usage: { input_tokens: 35, cache_read_input_tokens: 5, output_tokens: 10, output_tokens_details: { thinking_tokens: 3 } },
    });
  });
  await withAgendaDatabase(async ({ pool }) => {
    const db = databaseFor(pool), owner = randomUUID();
    await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Student','no-login',now(),'student')`, [owner, `${owner}@example.invalid`]);
    const usage = async () => (await pool.query(`SELECT request_count,reserved_microusd::text AS reserved,consumed_microusd::text AS consumed
      FROM ai_usage_daily WHERE scope=$1 AND capability='study-plan-v1'`, [owner])).rows[0];
    const dispatch = async request => (await pool.query('SELECT * FROM study_ai_dispatches WHERE owner_id=$1 AND request_id=$2', [owner, request])).rows[0];
    async function exercise(expected, expectedCost) {
      const request = randomUUID(), before = await usage(), start = calls.length;
      events.length = 0;
      const provider = createGeminiStudyProvider(live, db, owner, request, async () => { events.push('authorize'); });
      assert.deepEqual(await provider.generate(input), answer);
      assert.deepEqual(events, ['authorize', 'count', 'authorize', 'generate', 'authorize']);
      const network = calls.slice(start);
      assert.equal(network.length, 2); assert.deepEqual(network.map(call => call.stage), ['count', 'generate']);
      assert.ok(network.every(call => call.provider === expected.provider));
      for (const call of network) {
        assert.ok(call.url.includes(expected.model) || call.body.model === expected.model, 'count and generate use the persisted model');
        assert.ok(JSON.stringify(call.body).includes('synthetic-source'));
      }
      assert.ok(JSON.stringify(network[1].body).includes('additionalProperties'));
      const row = await dispatch(request);
      assert.equal(row.state, 'DONE'); assert.equal(row.dispatch_count, 1);
      assert.deepEqual(row.execution_profile, expected);
      assert.equal(String(row.input_tokens), '40'); assert.equal(String(row.output_tokens), '10');
      assert.equal(String(row.reserved_microusd), '0');
      const after = await usage();
      assert.equal(after.request_count, (before?.request_count ?? 0) + 1);
      assert.equal(BigInt(after.consumed) - BigInt(before?.consumed ?? 0), BigInt(expectedCost));
      assert.equal(after.reserved, '0');
      assert.equal(live.model, 'mutated-live-model', 'fixture actually changed live configuration during count');
    }
    await t.test('Gemini uses the persisted model and inclusive reasoning output at saved prices', async () => {
      live = configuration(); selected = 'gemini';
      const expected = snapshotForTask(live, 'study');
      await initializeAiExecutionPolicy(db, live);
      await exercise(expected, 60); // 40 input * 1 + (7 candidate + 3 reasoning) * 2
    });
    await t.test('Claude selection uses only Anthropic SDK endpoints and its saved prices', async () => {
      live = configuration(); selected = 'anthropic';
      const expected = { ...snapshotForTask(live, 'study'), provider: 'anthropic', model: 'synthetic-claude-study',
        profileId: 'study-anthropic-test', inputUsdPerMillion: 3, outputUsdPerMillion: 5 };
      live.executionProfiles = { study: expected }; live.anthropicApiKey = 'synthetic-only-anthropic';
      await initializeAiExecutionPolicy(db, live);
      await exercise(expected, 170); // (35 fresh + 5 cached) * 3 + 10 inclusive output * 5
      const baseline = (await pool.query('SELECT baseline_profiles FROM ai_execution_policy WHERE singleton')).rows[0].baseline_profiles;
      assert.equal(baseline.study.provider, 'gemini'); assert.equal(baseline.study.model, 'synthetic-gemini-study');
    });
    await t.test('missing Claude credential fails before fetch or budget without Gemini fallback', async () => {
      const before = await usage(), start = calls.length, request = randomUUID();
      let authorizations = 0;
      live = configuration();
      const provider = createGeminiStudyProvider(live, db, owner, request, async () => { authorizations++; });
      await assert.rejects(provider.generate(input), { code: 'AI_UNAVAILABLE' });
      assert.equal(calls.length, start);
      assert.equal(authorizations, 0, 'authorization must not begin without configured transport');
      assert.deepEqual(await usage(), before);
      const row = await dispatch(request);
      assert.equal(row.state, 'FAILED'); assert.equal(row.dispatch_count, 0);
      assert.equal(row.execution_profile.provider, 'anthropic'); assert.equal(String(row.reserved_microusd), '0');
    });
  });
});
