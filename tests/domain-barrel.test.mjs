import test from 'node:test';
import assert from 'node:assert/strict';

test('Agenda scoped domain and compatibility entries share rules and error identity', async () => {
  const agenda = await import('../src/core/domain/agenda/index.ts');
  const legacy = await import('../src/core/domain/agenda.ts');
  const root = await import('../src/core/domain/index.ts');
  const time = await import('../src/core/domain/agenda-time.ts');
  assert.equal(agenda.AgendaError, legacy.AgendaError);
  assert.equal(agenda.AgendaError, root.AgendaError);
  assert.equal(agenda.parseAgendaEvent, root.parseAgendaEvent);
  assert.equal(agenda.resolveAgendaMinute, time.resolveAgendaMinute);
  assert.throws(() => agenda.resolveAgendaMinute('2026-11-01T01:30', 'America/New_York'), error => error instanceof legacy.AgendaError && error.code === 'INVALID_INPUT');
});

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
