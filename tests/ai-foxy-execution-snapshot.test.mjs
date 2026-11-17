import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyTurnPreparation } from '../apps/api/src/modules/foxy/turns/infrastructure/turn-preparation.ts';
import { createFoxyTurnRepository } from '../apps/api/src/modules/foxy/turns/infrastructure/turn-repository.ts';
import { readFile } from 'node:fs/promises';
import { createFoxyTextBudget } from '../apps/api/src/modules/foxy/turns/infrastructure/text-budget.ts';
import { createFoxyTurnQueue } from '../apps/api/src/modules/foxy/turns/infrastructure/turn-queue.ts';
import { createFoxyTextWorker } from '../apps/api/src/modules/foxy/turns/infrastructure/worker.ts';

const pinned = { format: 'ai-execution-v1', task: 'foxy', provider: 'anthropic', model: 'pinned-claude',
  profileId: 'foxy-text', profileVersion: '1', promptVersion: 'foxy-chat-v2', responseVersion: 'foxy-answer-v1',
  maxInputTokens: 90, maxOutputTokens: 80, deadlineMs: 400, maxDocumentBytes: 1000,
  inputUsdPerMillion: 4, outputUsdPerMillion: 8 };
function fixture(snapshot = pinned) {
  const counted = new WeakSet(), calls = [];
  const selected = { countTokens: async input => { counted.add(input); calls.push('count'); return 70; },
    generate: async input => { assert.ok(counted.has(input)); calls.push('generate'); return {}; } };
  const configuration = { model: 'changed-global', maxInputTokens: 60, maxOutputTokens: 30, deadlineMs: 100,
    maxDocumentBytes: 900, inputUsdPerMillion: 1, outputUsdPerMillion: 2 };
  const options = { configuration,
    turns: { loadClaimed: async () => ({ purpose: 'CHAT', message: 'Synthetic', executionProfile: snapshot,
      metadata: { model: snapshot?.model ?? configuration.model, promptVersion: 'foxy-chat-v2', schemaVersion: 'foxy-answer-v1' } }) },
    authority: { open: async () => ({ capability: {}, snapshot: { context: { kind: 'GENERAL' } } }), close() {} },
    loader: { load: async () => ({ context: { kind: 'GENERAL' }, curriculum: null, documents: [], sources: [], referenceMap: [], warnings: [] }) },
    provider: { countTokens: async () => { throw Error('global provider must not dispatch'); } },
    providerForExecution: config => { calls.push(config); return selected; },
  };
  return { options, selected, calls, configuration };
}

test('Foxy prepares with persisted provider/model/limits and retains exact preflight provider/input', async () => {
  const f = fixture();
  const result = await createFoxyTurnPreparation(f.options).prepare({}, new AbortController().signal);
  assert.equal(result.provider, f.selected);
  assert.equal(result.configuration.model, pinned.model);
  assert.equal(result.configuration.deadlineMs, pinned.deadlineMs);
  assert.equal(result.configuration.inputUsdPerMillion, pinned.inputUsdPerMillion);
  await result.provider.generate(result.input);
  assert.deepEqual(f.calls.slice(1), ['count', 'generate']);
  assert.equal(f.configuration.model, 'changed-global');
});

test('Foxy rejects unsupported prompt snapshot before constructing or dispatching provider', async () => {
  const f = fixture({ ...pinned, promptVersion: 'unapproved-version' });
  await assert.rejects(createFoxyTurnPreparation(f.options).prepare({}, new AbortController().signal));
  assert.deepEqual(f.calls, []);
});

test('Foxy legacy turn uses approved baseline instead of a newly active profile', async () => {
  const baseline = { ...pinned, provider: 'gemini', model: 'legacy-gemini' };
  const f = fixture(null);
  f.options.configuration.legacyExecutionProfiles = { foxy: baseline };
  f.options.configuration.executionProfiles = { foxy: pinned };
  f.options.turns.loadClaimed = async () => ({ purpose: 'CHAT', message: 'Synthetic legacy', executionProfile: null,
    metadata: { model: baseline.model, promptVersion: baseline.promptVersion, schemaVersion: baseline.responseVersion } });
  const result = await createFoxyTurnPreparation(f.options).prepare({}, new AbortController().signal);
  assert.equal(result.configuration.model, baseline.model);
  assert.equal(result.configuration.executionProfile.provider, 'gemini');
});

test('Foxy snapshot SQL is atomic and preserves existing positional parameters', async () => {
  const source = await readFile(new URL('../apps/api/src/modules/foxy/turns/infrastructure/turn-repository.ts', import.meta.url), 'utf8');
  assert.match(source, /INSERT INTO foxy_turns\([^`]*execution_profile/u);
  assert.match(source, /active_profiles\s*->\s*'foxy'/u);
  assert.match(source, /jsonb_set\(\$10::jsonb/u);
  assert.equal(typeof createFoxyTurnRepository, 'function');
});

test('Foxy reservation persists snapshot rates and output limit rather than current global rates', async () => {
  const calls = [], row = { id: 'synthetic', owner_id: 'synthetic-owner', dispatch_count: 0, execution_profile: pinned };
  const tx = { query: async (sql, ...args) => {
    calls.push({ sql, args });
    if (sql.includes('SELECT t.*')) return [row];
    if (sql.includes('SELECT dispatch_count')) return [{ dispatch_count: 0 }];
    if (sql.includes('SELECT request_count')) return [{ request_count: 0, total: '0' }];
    return [];
  } };
  const budget = createFoxyTextBudget({ configuration: { maxOutputTokens: 1, inputUsdPerMillion: 1, outputUsdPerMillion: 1,
    dailyBudgetUsd: 100, dailyActorRequests: 10, dailyGlobalRequests: 10 } });
  assert.equal(await budget.reserve(tx, {}, 70), 'RESERVED');
  assert.deepEqual(calls.find(call => call.sql.includes('SET input_usd_per_million')).args, ['synthetic', 4, 8]);
  assert.equal(calls.find(call => call.sql.includes('SET reserved_microusd=')).args[1], '920');
});

test('Foxy claim lease uses persisted deadline', async () => {
  let leaseMs;
  const row = { id: 'synthetic', owner_id: 'owner', conversation_id: 'conversation', execution_profile: pinned };
  const query = async (sql, ...args) => {
    if (sql.includes('AS pending')) return [{ pending: true }];
    if (sql.includes('count(*)::int')) return [{ count: 0 }];
    if (sql.includes('SELECT t.id,t.owner_id,t.conversation_id')) return [row];
    if (sql.includes("SET state='RUNNING'")) { leaseMs = args[2]; return [row]; }
    return [];
  };
  const queue = createFoxyTurnQueue({ database: { $transaction: fn => fn({ $queryRawUnsafe: query }) },
    configuration: { deadlineMs: 9000, maxConcurrency: 2, maxJobAgeMs: 10000 } });
  const lease = await queue.claim();
  assert.equal(lease.deadlineMs, pinned.deadlineMs);
  assert.equal(leaseMs, pinned.deadlineMs + 10000);
});

test('Foxy worker generates using the same pinned provider and exact validated input', async () => {
  const f = fixture();
  f.selected.generate = async input => {
    f.calls.push('generate');
    assert.equal(input, f.lastCounted);
    return { json: { schemaVersion: 'foxy-text-response-v1', status: 'READY', title: 'Synthetic', markdown: 'Public text', references: [], warnings: [], missingInformation: [] }, inputTokens: 70, outputTokens: 10 };
  };
  const count = f.selected.countTokens;
  f.selected.countTokens = input => { f.lastCounted = input; return count(input); };
  let outcome;
  const worker = createFoxyTextWorker({ ...f.options,
    configuration: { ...f.configuration, deadlineMs: 1000, maxConcurrency: 1, maxJobAgeMs: 10000 },
    queue: { claim: async () => ({}) }, database: { $transaction: fn => fn({ $queryRawUnsafe: async () => [] }) },
    authority: { ...f.options.authority, revalidateGrounding: async () => true },
    budget: { reserve: async () => 'RESERVED' }, completion: { finish: async (_lease, value) => { outcome = value; return true; } },
  });
  await worker.runOnce();
  assert.equal(outcome.state, 'READY');
  assert.deepEqual(f.calls.slice(1), ['count', 'generate']);
});

test('Foxy worker applies the pinned total deadline before counting', async () => {
  const f = fixture({ ...pinned, deadlineMs: 25 });
  f.selected.countTokens = input => new Promise((_, reject) => input.signal.addEventListener('abort', () => reject(Error('aborted')), { once: true }));
  let outcome;
  const worker = createFoxyTextWorker({ ...f.options,
    configuration: { ...f.configuration, deadlineMs: 10000, maxConcurrency: 1, maxJobAgeMs: 10000 },
    queue: { claim: async () => ({}) }, database: { $transaction: fn => fn({ $queryRawUnsafe: async () => [] }) },
    budget: { reserve: async () => { throw Error('must not reserve'); } },
    completion: { finish: async (_lease, value) => { outcome = value; return true; } },
  });
  await worker.runOnce();
  assert.equal(outcome.errorCode, 'AI_TIMEOUT');
});
