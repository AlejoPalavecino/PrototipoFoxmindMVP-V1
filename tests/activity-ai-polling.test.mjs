import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

test('polling a completed generation synchronizes the open view and its existing recent-history row', async () => {
  const { useActivityGeneration } = loadTsModule('apps/classrooms-ui/use-activity-generation.ts');
  const job = { id: '11111111-1111-4111-8111-111111111111', classroomId: '22222222-2222-4222-8222-222222222222',
    baseRevision: '2', state: 'QUEUED', type: 'ASSIGNMENT', proposal: null, error: null, retryable: false,
    missingInformation: [], sourceReport: [], appliedActivityId: null, createdAt: '2026-10-25T12:00:00Z' };
  const proposal = { schemaVersion: 'activity-proposal-v1', type: 'ASSIGNMENT', title: 'Ready after polling', objective: 'Compare',
    instructions: 'Resolve.', assignmentPrompts: ['Compare cases.'], questions: [], evidence: [], warnings: [] };
  const ready = { ...job, state: 'READY', proposal }, calls = []; let jobReads = 0, poll;
  const api = { call: async (...args) => {
    calls.push(args); const [path] = args;
    if (path.endsWith('/sources')) return { revision: '2', sources: [] };
    if (path.endsWith('/activity-generations')) return { jobs: [job] };
    return jobReads++ === 0 ? job : ready;
  } };
  const priorTimeout = globalThis.setTimeout, priorClear = globalThis.clearTimeout, handle = {};
  globalThis.setTimeout = (callback, delay, ...args) => {
    if (delay === 1500) { poll = callback; return handle; }
    return priorTimeout(callback, delay, ...args);
  };
  globalThis.clearTimeout = timer => { if (timer !== handle) priorClear(timer); };
  const Host = () => React.createElement('output', { state: useActivityGeneration(api, { id: job.classroomId, revision: '2' }, async () => {}) });
  const view = hookView(Host, {});
  try {
    await view.flush();
    await view.tree.props.state.open(job.id); await view.flush();
    assert.equal(view.tree.props.state.jobs[0].state, 'QUEUED'); assert.equal(typeof poll, 'function');
    poll(); await view.flush();
    const state = view.tree.props.state;
    assert.equal(state.view.state, 'READY'); assert.deepEqual(state.view.proposal, proposal);
    assert.equal(state.jobs.length, 1); assert.equal(state.jobs[0].id, job.id);
    assert.equal(state.jobs[0].state, 'READY', 'Recent generation must stop displaying En cola when its open result is ready');
    assert.deepEqual(state.jobs[0].proposal, proposal);
    assert.equal(calls.filter(([, method]) => method === 'POST').length, 0);
  } finally {
    view.close(); globalThis.setTimeout = priorTimeout; globalThis.clearTimeout = priorClear;
  }
});
