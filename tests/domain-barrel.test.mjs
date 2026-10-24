import test from 'node:test';
import assert from 'node:assert/strict';

test('Node directly imports the shared agenda/AI domain barrel and preserves error identity', async () => {
  const domain = await import('../src/core/domain/index.ts');
  const event = { title: 'Shared domain', description: '', category: 'CLASS', color: 'PURPLE',
    schedule: { kind: 'ALL_DAY', startDate: '2026-11-02', endDateExclusive: '2026-11-03' }, repeat: { kind: 'NONE' } };
  assert.deepEqual(domain.parseAgendaEvent(event), event);
  const extraction = { revision: '1', planFileId: '11111111-1111-4111-8111-111111111111' };
  assert.deepEqual(domain.parseStartExtraction(extraction), extraction);
  const details = { revision: '2' };
  for (const code of ['INVALID_INPUT', 'CONFLICT', 'FORBIDDEN', 'SERVICE_UNAVAILABLE']) {
    const error = new domain.AgendaError(code, details);
    assert.ok(error instanceof Error);
    assert.ok(error instanceof domain.AgendaError);
    assert.equal(error.code, code);
    assert.equal(error.message, code);
    assert.equal(error.details, details);
  }
  assert.equal(new domain.AgendaError('INVALID_INPUT').details, undefined);
});