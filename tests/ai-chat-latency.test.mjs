import test from 'node:test';
import assert from 'node:assert/strict';
import { createAiTextMetricSink } from '../apps/api/src/platform/ai/text-metrics.ts';
import { clearChatTiming, commitChatTiming, trackChatTiming } from '../apps/web/src/shared/chat-timing.ts';

test('a chat stage only records duration, flow, and a safe outcome', () => {
  const lines = [];
  const record = createAiTextMetricSink(line => lines.push(JSON.parse(line)));
  const base = { task: 'foxy', flow: 'chat', durationMs: 35, code: 'COMPLETED', outcome: 'success' };
  for (const stage of ['queue', 'admission', 'prepare', 'count', 'generate', 'persist', 'first_text']) {
    record({ ...base, stage, contents: 'private', requestId: 'private', model: 'private' });
  }
  record({ ...base, flow: 'private', stage: 'queue' });
  record({ ...base, stage: 'private' });
  assert.deepEqual(lines, ['queue', 'admission', 'prepare', 'count', 'generate', 'persist', 'first_text']
    .map(stage => ({ ...base, stage })));
});

test('browser first text and final render are measured once with no identifiers in User Timing', () => {
  const entries = [], now = 90;
  globalThis.window = { performance: { now: () => now, getEntriesByName: () => [],
    measure: (name, { start, end }) => entries.push({ name, duration: end - start }) } };
  try {
    trackChatTiming('foxy', 'private-claim-id', 12);
    commitChatTiming('foxy', 'another-claim', 'first_text');
    commitChatTiming('foxy', 'private-claim-id', 'first_text');
    commitChatTiming('foxy', 'private-claim-id', 'first_text');
    commitChatTiming('foxy', 'private-claim-id', 'final');
    commitChatTiming('foxy', 'private-claim-id', 'final');
    trackChatTiming('study', 'cancelled-chat', 35);
    clearChatTiming('study', 'cancelled-chat');
    commitChatTiming('study', 'cancelled-chat', 'first_text');
    trackChatTiming('study.feedback', 'private-practice-id', 55);
    commitChatTiming('study.feedback', 'private-practice-id', 'first_text');
    commitChatTiming('study.feedback', 'private-practice-id', 'final');
    assert.deepEqual(entries, [
      { name: 'foxmind.ai.foxy.presentation.first_text', duration: 78 },
      { name: 'foxmind.ai.foxy.presentation.final', duration: 78 },
      { name: 'foxmind.ai.study.feedback.presentation.first_text', duration: 35 },
      { name: 'foxmind.ai.study.feedback.presentation.final', duration: 35 },
    ]);
  } finally { delete globalThis.window; }
});
