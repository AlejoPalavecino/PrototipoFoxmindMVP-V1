import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, domainSnapshot } from './p6-integration-helpers.mjs';

// Permanent regression derived from the independent B1 public HTTP/browser reproduction.
// Run with existing fresh API/Next preparation; this is targeted proof, not the full P7 runner.
test('B1 actual TP consultation locks content for late enrollment and preserves initial authorization/archive', { timeout: 330000 }, async () => {
  await withP4IntegrationRuntime(async runtime => {
    const browser = await chromium.launch({ headless: true });
    try {
      const teacher = await (await browser.newContext()).newPage(), student = await (await browser.newContext()).newPage();
      const suffix = Date.now(), name = 'Consultation-only content lock';
      await account(teacher, runtime.origin, runtime.inbox, `p7-consultation-teacher-${suffix}@example.test`);
      await account(student, runtime.origin, runtime.inbox, `p7-consultation-student-${suffix}@example.test`);
      const room = await classroom(teacher, null, name), base = `/classrooms/${room.id}`;
      const detail = async () => { const result = await api(teacher, 'GET', base); assert.equal(result.status, 200); return result.body; };
      const current = await detail(), unit = current.units[0].id, topic = current.units[0].topics[0].id;
      const change = async operation => api(teacher, 'POST', `${base}/activities`, { revision: (await detail()).revision, operation });
      const create = async title => {
        const created = await change({ action: 'create', type: 'ASSIGNMENT' }); assert.equal(created.status, 200);
        const id = created.body.id;
        const payload = { title, unitId: unit, topicId: topic, instructions: `Original instructions: ${title}`, attachmentRequired: false,
          instructionFileIds: [], materialIds: [], questions: [], deadline: { local: '2020-01-01T18:00' }, allowLate: true };
        assert.equal((await change({ action: 'save', id, payload })).status, 200);
        assert.equal((await change({ action: 'publish', id })).status, 200); return { id, payload };
      };
      const activity = await create('Expired consultation instructions'), archived = await create('Unread archived instructions');
      const preview = await api(student, 'POST', '/classrooms/codes/preview', { code: room.code }); assert.equal(preview.status, 200);
      assert.equal((await api(student, 'POST', '/classrooms/codes/confirm', { confirmation: preview.body.confirmation })).status, 200);
      const path = `${base}/activities/${activity.id}`, session = async () => {
        const result = await api(student, 'GET', `${path}/session`); assert.equal(result.status, 200); return result.body;
      };
      const beforeRead = await domainSnapshot(runtime.db), overview = await session();
      assert.equal(overview.expected, false); assert.equal(overview.canStart, true); assert.equal(overview.attempt, null);
      assert.equal(overview.activity.instructions, null); assert.equal(await domainSnapshot(runtime.db), beforeRead);
      await openClassroom(student, runtime.origin, name);
      await student.getByRole('button', { name: 'Actividades', exact: true }).click();
      const start = student.waitForResponse(response => response.request().method() === 'POST' && response.url().endsWith(`/activities/${activity.id}/start`));
      await student.getByRole('article', { name: activity.payload.title, exact: true }).getByRole('button', { name: 'Abrir trabajo práctico', exact: true }).click();
      const started = await start; assert.equal(started.status(), 200); assert.equal((await started.json()).editor, undefined);
      await student.getByText(activity.payload.instructions, { exact: true }).waitFor();
      const state = await session(), first = state.attempt;
      assert.equal(state.expected, false); assert.equal(state.canTransfer, false); assert.equal(state.activity.locked, true);
      assert.equal(first.number, 1); assert.equal(first.status, 'DRAFT'); assert.equal(first.submittedAt, null); assert.equal(first.epoch, '0');
      const rows = (await runtime.db.query('SELECT * FROM attempts WHERE activity_id=$1', [activity.id])).rows;
      assert.equal(rows.length, 1); assert.equal(rows[0].editor_token_hash, null);
      assert.ok((await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1', [activity.id])).rows[0].first_started_at);
      const beforeSave = await domainSnapshot(runtime.db);
      const changed = await change({ action: 'save', id: activity.id, payload: { ...activity.payload, instructions: 'Changed after actual instruction opening' } });
      assert.equal(changed.status, 409, 'Actual first TP instruction opening locks content independently of submission eligibility');
      assert.equal(await domainSnapshot(runtime.db), beforeSave, 'Rejected content edit preserves the exact domain hash');
      const eligibility = await api(teacher, 'GET', `${path}/eligibility`); assert.equal(eligibility.status, 200);
      assert.equal(eligibility.body.students.length, 1);
      const authorized = await api(teacher, 'POST', `${path}/authorize-first`, { revision: (await detail()).revision,
        studentId: eligibility.body.students[0].studentId, deadline: { local: '2031-01-01T12:00' } });
      assert.equal(authorized.status, 200);
      const enabled = await session(); assert.equal(enabled.expected, true); assert.equal(enabled.editor, undefined);
      assert.equal(enabled.attempt.id, first.id); assert.equal(enabled.attempt.number, 1); assert.equal(enabled.canTransfer, true);
      const transferred = await api(student, 'POST', `${base}/attempts/${first.id}/transfer`, { revision: enabled.attempt.revision });
      assert.equal(transferred.status, 200); assert.ok(transferred.body.editor); assert.equal(transferred.body.attempt.id, first.id);
      const archive = await api(teacher, 'POST', `${base}/archive`, { revision: (await detail()).revision, archived: true });
      assert.equal(archive.status, 200);
      const beforeArchiveRead = await domainSnapshot(runtime.db);
      const archiveRead = await api(student, 'GET', `${base}/activities/${archived.id}/session`); assert.equal(archiveRead.status, 200);
      assert.equal(archiveRead.body.canStart, false); assert.equal(archiveRead.body.attempt, null); assert.equal(archiveRead.body.activity.instructions, archived.payload.instructions);
      assert.equal(await domainSnapshot(runtime.db), beforeArchiveRead);
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts WHERE activity_id=$1', [archived.id])).rows[0].n, 0);
      assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n, 0);
    } finally { await browser.close(); }
  }, { classrooms: true });
});
