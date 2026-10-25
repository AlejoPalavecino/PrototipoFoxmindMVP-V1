import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { hookView } from './agenda-ui-helpers.test.mjs';

const id = '11111111-1111-4111-8111-111111111111';
for (const [type, canStart, expected] of [['ASSIGNMENT', true, 1], ['ASSIGNMENT', false, 0], ['QUESTIONNAIRE', true, 0], ['EVALUATION', true, 0]])
  test(`D9 explicit ${type} target canStart=${canStart} preserves ordinary attempt-opening semantics`, async () => {
    const { Activities } = loadTsModule('apps/classrooms-ui/Activities.tsx');
    const starts = [], session = { activity: { id, title: 'Actividad dirigida', type, questions: [] }, canStart, attempt: null };
    const api = { call: async path => path.endsWith('/activities') ? { activities: [] } : session,
      attempt: async (...args) => { starts.push(args); return { ...session, canStart: false, attempt: { id: 'attempt', status: 'DRAFT' } }; } };
    const view = hookView(Activities, { api, room: { id, role: 'student', archived: false, units: [], timezone: 'UTC' },
      reload: async () => {}, target: { kind: 'activity', classroomId: id, activityId: id } });
    try {
      await view.flush(); assert.equal(starts.length, expected);
      if (expected) { assert.equal(starts[0][0], `/${id}/activities/${id}/start`); assert.deepEqual(starts[0][1], {}); }
    } finally { view.close(); }
  });
