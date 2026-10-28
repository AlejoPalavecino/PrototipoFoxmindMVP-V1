import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
test('calendar views request complete visible periods across month and year boundaries', () => {
  const { calendarRange } = loadTsModule('apps/agenda-ui/calendar.ts');
  assert.deepEqual(calendarRange('WEEK', '2026-12-30', '2026-12', 'UTC'), { startDate: '2026-12-28', endDateExclusive: '2027-01-04', timeZone: 'UTC' });
  assert.deepEqual(calendarRange('DAY', '2026-12-31', '2026-12', 'UTC'), { startDate: '2026-12-31', endDateExclusive: '2027-01-01', timeZone: 'UTC' });
  assert.deepEqual(calendarRange('MONTH', '2026-11-01', '2026-11', 'UTC'), { startDate: '2026-10-26', endDateExclusive: '2026-12-07', timeZone: 'UTC' });
});
test('daily and monthly form choices serialize and reopen their actual recurrence', () => {
  const { eventDraft, draftPayload, isDraftDirty, repeatPreview } = loadTsModule('apps/agenda-ui/index.ts');
  const base=eventDraft(undefined,'2026-11-01','UTC');
  for(const frequency of ['DAILY','MONTHLY']) {
    const draft={...base,title:'Lectura',weekly:true,frequency,until:'2026-11-30'};
    const payload=draftPayload(draft), restored=eventDraft({...payload,id:'fixture',revision:'0'},'', 'UTC');
    assert.equal(payload.repeat.kind,frequency);assert.equal(restored.frequency,frequency);
    assert.equal(isDraftDirty(draft,base),true);
    assert.equal(repeatPreview(draft).count,frequency==='DAILY'?30:1);
  }
});
