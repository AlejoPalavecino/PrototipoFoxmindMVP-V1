import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { openClassroom, planPdf, upload } from './p6-integration-helpers.mjs';

// Do not retain headers, query strings, tokens, account bodies or verification URLs.
const nativePath = path => /^\/api\/v1\/classrooms\/[^/]+(?:\/plan)?$/.test(path) || path === '/api/v1/auth/csrf';
const planPath = path => /^\/api\/v1\/classrooms\/[^/]+\/plan$/.test(path);
const safeText = value => String(value ?? '').replace(/https?:\/\/\S+/g, '[url]').slice(0, 500);
function safeOperation(body) {
  if (!body || typeof body !== 'object') return null;
  const operation = body.operation;
  return { revision: body.revision, ...(operation && typeof operation === 'object' ? { operation: {
    action: operation.action, id: operation.id, status: operation.status, fileId: operation.fileId,
  } } : {}) };
}
function safeDetail(body) {
  if (!body || typeof body !== 'object') return null;
  return { id: body.id, role: body.role, revision: body.revision, archived: body.archived,
    errorCode: body.error?.code,
    units: body.units?.map(unit => ({ id: unit.id, name: unit.name, position: unit.position,
      topics: unit.topics?.map(topic => ({ id: topic.id, name: topic.name, status: topic.status })) })),
    plans: body.plans?.map(plan => ({ id: plan.id, fileId: plan.fileId, version: plan.version })) };
}
async function public200(page, method, path, body) {
  const response = await api(page, method, path, body);
  assert.equal(response.status, 200, `${method} ${path} setup: ${response.body?.error?.code ?? ''}`);
  return response.body;
}
async function controlState(page) {
  const plan = page.getByRole('region', { name: 'Plan de estudio', exact: true });
  const locator = plan.getByLabel('Estado de First topic'), count = await locator.count();
  const exactCount = await plan.getByLabel('Estado de First topic', { exact: true }).count();
  const describe = nodes => nodes.map(node => {
    const rect = node.getBoundingClientRect(), label = node.closest('label');
    return { tag: node.tagName, rawLabelText: label?.textContent?.replace(/\s+/g, ' ').trim(), value: node.value,
      disabled: node.matches(':disabled'), visible: rect.width > 0 && rect.height > 0,
      options: [...node.options].map(option => ({ value: option.value, label: option.textContent, selected: option.selected })),
      topicText: node.closest('li')?.querySelector('span')?.textContent,
      unitHeading: node.closest('section.p5-unit')?.querySelector('h3')?.textContent };
  });
  return { count, exactCount, controls: await locator.evaluateAll(describe),
    allControls: await plan.locator('select').evaluateAll(describe) };
}
async function alerts(page) {
  const rows = await page.getByRole('alert').evaluateAll(nodes => nodes.map(node => ({ id: node.id, tag: node.tagName,
    live: node.getAttribute('aria-live'), text: node.textContent,
    owner: node.closest('section[aria-label]')?.getAttribute('aria-label') ?? null })));
  return rows.map(row => ({ ...row, text: safeText(row.text), routeAnnouncement: row.id === '__next-route-announcer__'
    && row.tag === 'P' && row.live === 'assertive' }));
}

test('P9 single isolated Plan diagnostic: two-version identities, native NEXT action, complete network/DOM/SQL evidence', { timeout: 330000 }, async () => {
  await withP4IntegrationRuntime(async runtime => {
    const scratch = await mkdtemp(join(tmpdir(), 'foxmind-p9-plan-diagnostic-'));
    console.log(`P9 isolated Plan retained evidence: ${scratch}`);
    const browser = await chromium.launch({ headless: true }), evidence = { snapshots: [], network: [], pageErrors: [] };
    const page = await (await browser.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
    page.setDefaultTimeout(12000);
    let phase = 'account-setup', roomId, draftId, firstTopicId, cachedRevision;
    const pendingBodies = new Set();
    const persist = () => writeFile(join(scratch, 'safe-evidence.json'), `${JSON.stringify(evidence, null, 2)}\n`);
    const requestEvent = request => {
      const path = new URL(request.url()).pathname;
      if (!nativePath(path)) return;
      let body;
      if (planPath(path) && request.method() === 'POST') {
        try { body = safeOperation(request.postDataJSON()); } catch { body = { malformedJson: true }; }
      }
      evidence.network.push({ kind: 'request', phase, method: request.method(), path, ...(body ? { body } : {}) });
    };
    const responseEvent = response => {
      const path = new URL(response.url()).pathname;
      if (!nativePath(path)) return;
      const row = { kind: 'response', phase, method: response.request().method(), path, status: response.status(), complete: false };
      evidence.network.push(row);
      const task = (async () => {
        try {
          const body = await response.json(); row.complete = true;
          // CSRF bodies are intentionally never retained, even on failure.
          if (path !== '/api/v1/auth/csrf') row.body = safeDetail(body);
        } catch { row.bodyUnavailable = true; }
      })();
      pendingBodies.add(task); void task.finally(() => pendingBodies.delete(task));
    };
    const failedEvent = request => {
      const path = new URL(request.url()).pathname;
      if (nativePath(path)) evidence.network.push({ kind: 'requestfailed', phase, method: request.method(), path,
        failure: safeText(request.failure()?.errorText) });
    };
    page.on('request', requestEvent); page.on('response', responseEvent); page.on('requestfailed', failedEvent);
    page.on('pageerror', error => evidence.pageErrors.push(safeText(error.message)));
    const snapshot = async label => {
      const body = roomId ? await public200(page, 'GET', `/classrooms/${roomId}`) : null;
      const room = roomId ? (await runtime.db.query(`SELECT id,revision::text,archived_at IS NOT NULL AS archived,
        teacher_id FROM classrooms WHERE id=$1`, [roomId])).rows : [];
      const units = roomId ? (await runtime.db.query(`SELECT u.id,u.name,u.position,t.id AS topic_id,t.name AS topic_name,
        t.position AS topic_position,t.status::text AS topic_status FROM units u LEFT JOIN topics t ON t.unit_id=u.id
        WHERE u.classroom_id=$1 ORDER BY u.position,u.id,t.position,t.id`, [roomId])).rows : [];
      const versions = roomId ? (await runtime.db.query(`SELECT id,file_id,version_number FROM study_plan_versions
        WHERE classroom_id=$1 ORDER BY version_number,id`, [roomId])).rows : [];
      const row = { label, public: safeDetail(body), sql: { room, units, versions }, cached: { roomId, firstTopicId, revision: cachedRevision } };
      evidence.snapshots.push(row); await persist(); return row;
    };
    try {
      await account(page, runtime.origin, runtime.inbox, `p9-plan-diagnostic-${Date.now()}@example.test`);
      phase = 'first-version-setup';
      const draft = await public200(page, 'POST', '/classrooms/drafts', {}); draftId = draft.id;
      const firstFile = await upload(page, { kind: 'draft', id: draftId }, await planPdf('P9 diagnostic original plan'));
      const saved = await public200(page, 'PATCH', `/classrooms/drafts/${draftId}`, { revision: draft.revision,
        payload: { name: 'P9 isolated Plan classroom', subject: 'Science', division: 'A', academicYear: 2026,
          timezone: 'UTC', coverKey: 'explore', planFileId: firstFile.id,
          units: [{ name: 'First unit', topics: [{ name: 'First topic' }, { name: 'Second topic' }] }] } });
      await snapshot('before-first-version-publication');
      const published = await public200(page, 'POST', `/classrooms/drafts/${draftId}/publish`, { revision: saved.revision });
      roomId = published.id;
      const first = await snapshot('after-first-version-publication');
      firstTopicId = first.public.units[0].topics[0].id; cachedRevision = first.public.revision;
      phase = 'second-version-setup';
      const secondFile = await upload(page, { kind: 'classroom', id: roomId }, await planPdf('P9 diagnostic second plan'));
      const beforeSecond = await snapshot('before-second-version-append');
      await public200(page, 'POST', `/classrooms/${roomId}/plan`, { revision: beforeSecond.public.revision,
        operation: { action: 'appendVersion', fileId: secondFile.id } });
      await snapshot('after-second-version-append');
      phase = 'plan-navigation';
      await openClassroom(page, runtime.origin, 'P9 isolated Plan classroom');
      await page.getByRole('button', { name: 'Plan', exact: true }).click();
      await page.getByRole('heading', { name: 'Plan de estudio', exact: true }).waitFor();
      await page.waitForFunction(() => {
        const region = document.querySelector('section[aria-label="Plan de estudio"]');
        return region && [...region.querySelectorAll('select')].length > 0 && !region.querySelector('fieldset[disabled]');
      });
      phase = 'before-native-select';
      const before = await snapshot('before-native-select');
      evidence.beforeControl = await controlState(page); evidence.beforeAlerts = await alerts(page);
      evidence.identity = { expectedRoomId: roomId, oldCachedTopicId: firstTopicId,
        currentTopicCandidates: before.public.units.flatMap(unit => unit.topics).filter(topic => topic.name === 'First topic'),
        visibleNameBinding: evidence.beforeControl.controls.map(control => ({ unit: control.unitHeading, topic: control.topicText })) };
      await page.screenshot({ path: join(scratch, 'before-select.png'), fullPage: true }); await persist();
      assert.equal(before.public.role, 'teacher'); assert.equal(evidence.beforeControl.count, 1);
      assert.equal(evidence.beforeControl.exactCount, 0, 'Retain the observed old exact-label mismatch');
      assert.equal(evidence.beforeControl.controls[0].disabled, false);
      const expectedPath = `/api/v1/classrooms/${roomId}/plan`, beforeValue = evidence.beforeControl.controls[0].value;
      assert.equal(beforeValue, 'PENDING', 'Diagnostic must prove the real PENDING-to-NEXT mutation, not a no-op');
      // Arm before the ONE native user action; observe every actual Plan POST, not just an old-ID predicate.
      const observation = page.waitForResponse(response => planPath(new URL(response.url()).pathname)
        && response.request().method() === 'POST', { timeout: 12000 }).then(async response => ({
          observed: true, method: response.request().method(), path: new URL(response.url()).pathname,
          expectedPredicateMatch: new URL(response.url()).pathname === expectedPath,
          status: response.status(), body: safeDetail(await response.json()), complete: true,
        })).catch(() => ({ observed: false, reason: 'No Plan POST response observed within the existing12000ms observation bound' }));
      phase = 'native-select-NEXT';
      try {
        const locator = page.getByRole('region', { name: 'Plan de estudio', exact: true }).getByLabel('Estado de First topic');
        assert.equal(await locator.count(), 1, 'One scoped First-topic state control is required');
        evidence.action = { selected: await locator.selectOption('NEXT') };
      }
      catch (error) { evidence.action = { error: safeText(error.message) }; }
      evidence.immediateControl = await controlState(page); await persist();
      evidence.observation = await observation;
      if (evidence.observation.observed && evidence.observation.status === 200) {
        try {
          await page.getByRole('region', { name: 'Plan de estudio', exact: true }).getByText('Plan actualizado.', { exact: true }).waitFor();
          evidence.settledUi = true;
        } catch { evidence.settledUi = false; }
      } else evidence.settledUi = false;
      phase = 'after-native-select';
      evidence.afterControl = await controlState(page); evidence.afterAlerts = await alerts(page);
      const after = await snapshot('after-native-select');
      await Promise.all([...pendingBodies]);
      const current = after.sql.units.find(row => row.topic_name === 'First topic');
      evidence.outcome = { beforeValue, afterValue: evidence.afterControl.controls[0]?.value,
        persistedTopicId: current?.topic_id, persistedStatus: current?.topic_status,
        sameCachedTopic: current?.topic_id === firstTopicId,
        applicationAlerts: evidence.afterAlerts.filter(row => !row.routeAnnouncement),
        classification: beforeValue === 'NEXT' ? 'already-NEXT-no-op' : evidence.observation.observed
          && evidence.observation.status === 200 && current?.topic_status === 'NEXT' && evidence.settledUi ? 'mutation-confirmed' : 'unconfirmed' };
      await page.screenshot({ path: join(scratch, 'after-select.png'), fullPage: true }); await persist();
      console.log('P9 isolated Plan diagnostic outcome', JSON.stringify(evidence.outcome));
      console.log('P9 isolated Plan diagnostic observation', JSON.stringify(evidence.observation));
      assert.equal(evidence.action.error, undefined);
      assert.equal(evidence.outcome.classification, 'mutation-confirmed');
      assert.equal(evidence.observation.status, 200); assert.equal(evidence.observation.complete, true);
      assert.equal(evidence.observation.expectedPredicateMatch, true);
      assert.equal(evidence.afterControl.count, 1); assert.equal(evidence.outcome.afterValue, 'NEXT');
      assert.equal(evidence.outcome.sameCachedTopic, true); assert.equal(evidence.outcome.persistedStatus, 'NEXT');
      assert.equal(BigInt(after.public.revision), BigInt(before.public.revision) + 1n);
      assert.deepEqual(evidence.outcome.applicationAlerts, []);
      assert.deepEqual(evidence.pageErrors, []);
    } finally {
      await Promise.all([...pendingBodies]); await persist();
      page.off('request', requestEvent); page.off('response', responseEvent); page.off('requestfailed', failedEvent);
      await browser.close();
    }
  }, { classrooms: true });
});
