import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudyClient } from '../apps/web/src/features/study/api/study-http.ts';
import { extractionMessage } from '../apps/web/src/features/curriculum/extraction/extraction-messages.ts';

test('monthly rejection preserves the cause, input and ability to submit after renewal', async () => {
  const ids = [];
  const client = createStudyClient(async (url, init) => {
    if (url.endsWith('/csrf')) return Response.json({ csrfToken: 'synthetic' });
    const command = JSON.parse(init.body);
    assert.equal(command.message, 'Explicá la fotosíntesis');
    ids.push(command.requestId);
    if (ids.length === 1) return Response.json({ error: { code: 'AI_MONTHLY_BUDGET_EXCEEDED' } }, { status: 429 });
    return Response.json({ result: { status: 'COMPLETED' } });
  });
  const submit = () => client.command('test', '1', 'CHAT', { message: 'Explicá la fotosíntesis' });
  await assert.rejects(submit(), { code: 'AI_MONTHLY_BUDGET_EXCEEDED', message: /saldo mensual/i });
  await submit();
  assert.notEqual(ids[0], ids[1]);
  assert.match(extractionMessage('AI_MONTHLY_BUDGET_EXCEEDED'), /saldo mensual/i);
});
