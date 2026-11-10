import { correctionsView } from './helpers/audit-grade-dto.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createClassroomClient } from '../apps/web/src/application/academic-client.ts';
const id = 'a1111111-1111-4111-8111-111111111111';

test('correction client sends only final grade/reason/revision/confirmation with fresh CSRF; audit read has no body/editor', async () => {
  const calls = []; let csrf = 0;
  const client = createClassroomClient({ csrfToken: async () => String(++csrf), fetch: async (path, options) => { calls.push({ path, ...options }); return Response.json(correctionsView); } });
  const body = { revision: '5', newGrade: '0', reason: 'Reason', confirm: true };
  await client.call(`/${id}/attempts/${id}/grade-corrections`, 'POST', body);
  assert.equal(calls[0].body, JSON.stringify(body)); assert.equal(calls[0].headers['X-CSRF-Token'], '1'); assert.equal(calls[0].headers['X-Attempt-Editor'], undefined);
  await client.call(`/${id}/attempts/${id}/grade-corrections`); assert.equal(calls[1].method, 'GET'); assert.equal(calls[1].body, undefined);
  const malformed = createClassroomClient({ csrfToken: async () => 'fixture', fetch: async () => Response.json({}) });
  await assert.rejects(() => malformed.call(`/${id}/attempts/${id}/grade-corrections`), { code: 'SERVICE_UNAVAILABLE' });
});

test('teacher correction component is reachable only from published grading and waits for fresh read before success', async () => {
  const source = await readFile(new URL('../apps/web/src/features/grading/ui/PublishedGradeCorrection.tsx', import.meta.url), 'utf8');
  const editor = await readFile(new URL('../apps/web/src/features/grading/ui/GradingEditor.tsx', import.meta.url), 'utf8');
  const result = await readFile(new URL('../apps/web/src/features/grading/ui/PublishedResult.tsx', import.meta.url), 'utf8');
  assert.match(editor, /data.grade.isPublished \? <PublishedGradeCorrection/); assert.match(source, /Cancelar rectificación/);
  assert.match(source, /disabled=\{!writable \|\| !valid\}/); assert.match(source, /const fresh = await load\(\)/);
  assert.match(source, /fresh.revision !== corrected.revision/); assert.match(source, /await onChanged\(\);.*setSaved\(true\)/);
  assert.ok(!/grade-corrections|corrections|actor|reason/.test(result));
});
