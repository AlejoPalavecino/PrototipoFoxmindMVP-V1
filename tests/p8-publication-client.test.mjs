import { gradingView, publishedResult } from './helpers/audit-grade-dto.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('separate publication client sends only revision confirmation and fresh CSRF, result GET has no body or editor', async () => {
  const calls = []; let csrf = 0;
  const client = createClassroomClient({ csrfToken: async () => String(++csrf), fetch: async (path, options) => { calls.push({ path, ...options }); return Response.json(path.endsWith('/result') ? publishedResult : gradingView); } });
  await client.call(`/${id}/attempts/${id}/publish-grade`, 'POST', { revision: '5', confirm: true });
  assert.equal(calls[0].body, JSON.stringify({ revision: '5', confirm: true })); assert.equal(calls[0].headers['X-CSRF-Token'], '1'); assert.equal(calls[0].headers['X-Attempt-Editor'], undefined);
  await client.call(`/${id}/attempts/${id}/result`); assert.equal(calls[1].method, 'GET'); assert.equal(calls[1].body, undefined);
  const malformed = createClassroomClient({ csrfToken: async () => 'fixture', fetch: async () => Response.json({}) });
  await assert.rejects(() => malformed.call(`/${id}/attempts/${id}/result`), { code: 'SERVICE_UNAVAILABLE' });
});

test('history and grade targets render an explicit safe result, not the teacher correction DTO', async () => {
  const result = await readFile(new URL('../apps/web/src/features/grading/ui/PublishedResult.tsx', import.meta.url), 'utf8');
  const history = await readFile(new URL('../apps/web/src/application/academic-AttemptHistory.tsx', import.meta.url), 'utf8');
  const activities = await readFile(new URL('../apps/web/src/application/academic-Activities.tsx', import.meta.url), 'utf8');
  assert.match(history, /status === 'SUBMITTED' \? <PublishedResult/); assert.match(result, /selectedOptions.map/);
  assert.match(result, /Resultado pendiente de publicación/); assert.match(result, /isEffective/);
  assert.ok(!/\.correct|scoringRule|manualPoints|audit/.test(result)); assert.match(activities, /target.kind !== 'activity'.*setHistory/);
});
