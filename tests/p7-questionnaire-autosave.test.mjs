import test from 'node:test';
import assert from 'node:assert/strict';
import { QuestionnaireDraft, ANSWER_IDLE_MS } from '../apps/classrooms-ui/questionnaire-draft.ts';

function fixture(save) {
  const scheduled = new Map(); let id = 0;
  const draft = new QuestionnaireDraft({ questionIds: ['a', 'b'], answers: [], revision: '0', save, changed: () => {},
    scheduler: { set: (callback, ms) => { scheduled.set(++id, { callback, ms }); return id; }, clear: key => scheduled.delete(key) } });
  return { draft, scheduled };
}
const answer = (questionId, text) => ({ questionId, text, optionIds: [] });
const confirmed = (input, revision) => ({ revision, answer: { ...input, savedAt: new Date().toISOString() } });
const turn = () => new Promise(resolve => setImmediate(resolve));

test('questionnaire draft exports a generation-aware serialized persistence queue', async () => {
  const { QuestionnaireDraft } = await import('../apps/classrooms-ui/questionnaire-draft.ts');
  assert.equal(typeof QuestionnaireDraft, 'function');
});

test('idle save resets exactly two seconds after the latest edit and never submits', async () => {
  const calls = [], { draft, scheduled } = fixture(async input => { calls.push(input); return confirmed(input, '1'); });
  draft.edit(answer('a', 'first')); const first = [...scheduled.keys()][0];
  draft.edit(answer('a', 'latest\nline')); assert.equal(scheduled.has(first), false);
  assert.equal(ANSWER_IDLE_MS, 2000); assert.equal(scheduled.size, 1);
  const timer = [...scheduled.values()][0]; assert.equal(timer.ms, 2000); assert.equal(calls.length, 0);
  assert.equal(draft.get('a').state, 'pending'); timer.callback(); await turn();
  assert.deepEqual(calls, [{ ...answer('a', 'latest\nline'), revision: '0' }]);
  assert.equal(draft.get('a').state, 'saved'); assert.equal(draft.dirty, false); assert.equal(draft.revision, '1');
});

test('navigation flush serializes revisions; a delayed acknowledgement never confirms a newer edit or loses it to focus', async () => {
  const calls = [], gates = [];
  const { draft } = fixture(input => { calls.push(input); return new Promise(resolve => gates.push(() => resolve(confirmed(input, String(calls.length))))); });
  draft.edit(answer('a', 'generation one')); const pending = draft.flush();
  assert.equal(calls.length, 1); assert.equal(draft.get('a').state, 'saving');
  draft.edit(answer('a', 'generation two')); draft.edit(answer('b', 'next question'));
  draft.receive('1', [{ ...answer('a', 'generation one'), savedAt: 'confirmed' }]);
  assert.equal(draft.get('a').value.text, 'generation two'); assert.equal(draft.revision, '0');
  gates.shift()(); await turn();
  assert.equal(draft.get('a').state, 'saving'); assert.equal(draft.dirty, true);
  assert.deepEqual(calls[1], { ...answer('a', 'generation two'), revision: '1' });
  gates.shift()(); await turn(); assert.deepEqual(calls[2], { ...answer('b', 'next question'), revision: '2' });
  gates.shift()(); await pending;
  assert.equal(draft.revision, '3'); assert.equal(draft.dirty, false); assert.equal(draft.get('a').value.text, 'generation two');
  draft.receive('0', [{ ...answer('a', 'stale focus'), savedAt: 'confirmed' }]);
  assert.equal(draft.revision, '3'); assert.equal(draft.get('a').value.text, 'generation two');
});

test('failed persistence remains editable and unsaved, cannot flush submission, and can be explicitly retried', async () => {
  let failing = true;
  const { draft } = fixture(async input => { if (failing) throw Error('Network unavailable'); return confirmed(input, '1'); });
  draft.edit(answer('a', 'keep this\nanswer'));
  await assert.rejects(draft.flush(), /Network unavailable/);
  assert.equal(draft.get('a').state, 'error'); assert.equal(draft.dirty, true); assert.equal(draft.revision, '0');
  draft.receive('0', []); assert.equal(draft.get('a').value.text, 'keep this\nanswer');
  failing = false; await draft.flush(); assert.equal(draft.get('a').state, 'saved'); assert.equal(draft.dirty, false);
});

test('authority loss invalidates queued saves and ignores a late acknowledgement; reload uses only confirmed input', async () => {
  let release; const calls = [];
  const { draft } = fixture(input => { calls.push(input); return new Promise(resolve => release = () => resolve(confirmed(input, '1'))); });
  draft.edit(answer('a', 'old session')); const pending = draft.flush(); draft.edit(answer('b', 'never transferred'));
  draft.invalidate(); release(); await assert.rejects(pending, /control de edición/);
  assert.equal(calls.length, 1); assert.equal(draft.revision, '0'); await assert.rejects(draft.flush(), /control de edición/);
  const reloaded = new QuestionnaireDraft({ questionIds: ['a', 'b'], answers: [{ ...answer('a', 'persisted only'), savedAt: 'confirmed' }],
    revision: '2', save: async () => { throw Error('read only'); }, changed: () => {} });
  assert.equal(reloaded.get('a').value.text, 'persisted only'); assert.equal(reloaded.get('b').value.text, '');
});

test('ambiguous committed save can refresh CAS and retry local edits without treating the lost acknowledgement as saved', async () => {
  let first = true; const calls = [];
  const { draft } = fixture(async input => {
    calls.push(input);
    if (first) { first = false; throw Error('Response lost after commit'); }
    return confirmed(input, '2');
  });
  draft.edit(answer('a', 'committed but not acknowledged')); await assert.rejects(draft.flush(), /Response lost/);
  draft.edit(answer('a', 'retain the newer intent'));
  draft.receive('1', [{ ...answer('a', 'committed but not acknowledged'), savedAt: 'confirmed' }]);
  assert.equal(draft.revision, '1'); assert.equal(draft.get('a').value.text, 'retain the newer intent'); assert.equal(draft.dirty, true);
  await draft.flush(); assert.equal(calls[1].revision, '1'); assert.equal(draft.get('a').state, 'saved'); assert.equal(draft.revision, '2');
});
