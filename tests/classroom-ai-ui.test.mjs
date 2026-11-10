import test from 'node:test';
import assert from 'node:assert/strict';

const ui = () => import('../apps/web/src/features/curriculum/model/extraction-client.ts');
const fileId = '11111111-1111-4111-8111-111111111111';
const jobId = '22222222-2222-4222-8222-222222222222';
const requestId = '33333333-3333-4333-8333-333333333333';
const units = [{ name: 'Revisada', topics: [{ name: 'Tema docente' }] }];
const view = state => ({ id: jobId, draftId: 'draft', planFileId: fileId, baseRevision: '2', state,
  proposal: state === 'READY' ? { units, warnings: [] } : null, error: null, retryable: false });
async function fixture(call, { save } = {}) {
  const { createExtractionClient } = await ui();
  let draft = { id: 'draft', revision: '1', payload: { planFileId: fileId, units: [] }, publishedClassroomId: null };
  const calls = [], views = [], applied = [];
  const api = { call: async (...args) => { calls.push(args); return call ? call(...args) : view('QUEUED'); } };
  const client = createExtractionClient({ api, getDraft: () => draft, save: async () => {
    if (save) await save(); draft = { ...draft, revision: String(Number(draft.revision) + 1) };
  }, onView: next => views.push(next), onApplied: result => applied.push(result), requestId: () => requestId });
  return { client, calls, views, applied, getDraft: () => draft, setDraft: next => { draft = next; } };
}

test('C5 automatic start waits for acknowledged autosave and uses newest revision only', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = await fixture(undefined, { save: () => gate });
  const pending = f.client.start(fileId);
  await Promise.resolve(); assert.equal(f.calls.length, 0);
  release(); await pending;
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0][0], '/drafts/draft/curriculum-extractions');
  assert.equal(f.calls[0][1], 'POST');
  assert.deepEqual(f.calls[0][2], { revision: '2', planFileId: fileId });
  assert.ok(f.calls[0][3] instanceof AbortSignal);
  assert.equal(f.views.at(-1).state, 'QUEUED');
});

test('C5 rejected autosave never starts analysis and manual draft content remains available', async () => {
  const f = await fixture(undefined, { save: async () => { throw Object.assign(new Error('CONFLICT'), { code: 'CONFLICT' }); } });
  await assert.rejects(f.client.start(fileId), { code: 'CONFLICT' });
  assert.equal(f.calls.length, 0); assert.equal(f.applied.length, 0);
  assert.deepEqual(f.getDraft().payload.units, []);
});

test('C5 polling surfaces proposal separately and never overwrites manually edited units', async () => {
  const f = await fixture(path => path.endsWith(jobId) ? view('READY') : view('QUEUED'));
  await f.client.start(fileId);
  f.setDraft({ ...f.getDraft(), payload: { planFileId: fileId, units: [{ name: 'Edición manual', topics: [] }] } });
  await f.client.poll();
  assert.equal(f.calls.at(-1)[0], `/drafts/draft/curriculum-extractions/${jobId}`);
  assert.equal(f.views.at(-1).state, 'READY');
  assert.equal(f.getDraft().payload.units[0].name, 'Edición manual');
  assert.equal(f.applied.length, 0);
});

test('C5 cancel aborts polling and ignores results even if the transport completes late', async () => {
  let release; const gate = new Promise(resolve => { release = resolve; });
  const f = await fixture(path => path.endsWith(jobId) ? gate : view('QUEUED'));
  await f.client.start(fileId);
  const pending = f.client.poll(), before = f.views.length;
  await Promise.resolve(); const signal = f.calls.at(-1)[3];
  f.client.cancel(); assert.equal(signal.aborted, true);
  release(view('READY')); await pending;
  assert.equal(f.views.length, before); assert.equal(f.applied.length, 0);
});

test('C5 replacing source invalidates old proposal and stale polling cannot display it', async () => {
  const f = await fixture(path => path.endsWith(jobId) ? view('READY') : view('QUEUED'));
  await f.client.start(fileId);
  f.setDraft({ ...f.getDraft(), payload: { planFileId: 'other-file', units: [] } });
  const before = f.views.length;
  await f.client.poll();
  assert.equal(f.views.length, before);
  assert.equal(f.applied.length, 0);
});

test('C5 reviewed apply requires explicit replacement consent and never publishes classroom', async () => {
  const result = { extractionId: jobId, appliedRevision: '4', draft: { id: 'draft', revision: '4', payload: { planFileId: fileId, units }, publishedClassroomId: null } };
  const f = await fixture(path => path.endsWith('/apply') ? result : view('READY'));
  await f.client.start(fileId);
  f.setDraft({ ...f.getDraft(), payload: { planFileId: fileId, units: [{ name: 'Manual', topics: [] }] } });
  await assert.rejects(f.client.apply(units), { code: 'REPLACEMENT_CONFIRMATION_REQUIRED' });
  assert.equal(f.calls.filter(([path]) => path.endsWith('/apply')).length, 0);
  await f.client.apply(units, { replaceConfirmed: true });
  const command = f.calls.at(-1);
  assert.equal(command[0], `/drafts/draft/curriculum-extractions/${jobId}/apply`);
  assert.deepEqual(command[2], { revision: '3', requestId, units });
  assert.deepEqual(f.applied, [result]);
  assert.equal(f.calls.some(([path]) => path.endsWith('/publish')), false);
});

test('C5 retry is explicit, source-bound and does not automatically retry unknown billed outcome', async () => {
  const failed = { ...view('FAILED'), error: 'PROVIDER_OUTCOME_UNKNOWN', retryable: true };
  const f = await fixture(path => path.endsWith('/retry') ? view('QUEUED') : failed);
  await f.client.start(fileId);
  assert.equal(f.calls.length, 1);
  await f.client.retry();
  assert.equal(f.calls.at(-1)[0], `/drafts/draft/curriculum-extractions/${jobId}/retry`);
  assert.deepEqual(f.calls.at(-1)[2], { revision: '3', requestId });
});
