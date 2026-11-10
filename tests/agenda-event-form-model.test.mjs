import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { privateEvent, day, zone } from './agenda-event-form-helpers.test.mjs';

const model = () => loadTsModule('apps/web/src/features/agenda/index.ts');
const fresh = api => api.eventDraft(undefined, day, zone);
test('new/edit drafts preserve calendar defaults and exact payload without local metadata', () => {
  const api = model(), draft = fresh(api);
  assert.equal(draft.startDate, day); assert.equal(draft.startTime, '09:00');
  assert.equal(draft.endTime, '10:00'); assert.equal(draft.zone, zone);
  assert.equal(draft.weekly, false); assert.equal(draft.endMode, 'DURATION');
  const event = privateEvent({ schedule: { kind: 'TIMED', timeZone: 'Europe/Madrid',
    startLocal: '2026-10-25T02:10', endLocal: '2026-10-25T02:40', startOffsetMinutes: 120, endOffsetMinutes: 120 } });
  const edited = api.eventDraft(event, '2026-11-01', 'UTC');
  assert.equal(edited.endMode, 'MANUAL');
  assert.deepEqual(api.draftPayload(edited), { title: event.title, description: '', category: 'CLASS',
    schedule: event.schedule, repeat: { kind: 'NONE' } });
});

for (const minutes of [30, 60, 90]) test(`duration ${minutes} crosses midnight and follows changes to start`, () => {
  const api = model();
  let draft = api.changeDraftStart(fresh(api), { time: '23:30' });
  draft = api.setDraftDuration(draft, minutes);
  assert.equal(draft.endDate, '2026-10-28');
  assert.equal(draft.endTime, ({ 30: '00:00', 60: '00:30', 90: '01:00' })[minutes]);
  draft = api.changeDraftStart(draft, { date: '2026-10-29', time: '18:00' });
  assert.equal(draft.endDate, '2026-10-29');
  assert.equal(draft.endTime, ({ 30: '18:30', 60: '19:00', 90: '19:30' })[minutes]);
});

test('manual end remains fixed and offset invalidation follows affected endpoints', () => {
  const api = model();
  const original = { ...fresh(api), startOffset: -180, endOffset: -180 };
  const manual = api.changeDraftEnd(original, { date: '2026-10-28', time: '01:00' });
  assert.equal(manual.endMode, 'MANUAL'); assert.equal(manual.startOffset, -180);
  assert.equal(manual.endOffset, undefined);
  const moved = api.changeDraftStart(manual, { time: '23:30' });
  assert.equal(moved.endDate, '2026-10-28'); assert.equal(moved.endTime, '01:00');
  assert.equal(moved.startOffset, undefined);
  const zoned = api.changeDraftZone(original, 'Europe/Madrid');
  assert.equal(zoned.startTime, original.startTime); assert.equal(zoned.endTime, original.endTime);
  assert.equal(zoned.startOffset, undefined); assert.equal(zoned.endOffset, undefined);
  const automatic = api.changeDraftStart(original, { time: '18:15' });
  assert.equal(automatic.startOffset, undefined); assert.equal(automatic.endOffset, undefined);
});

test('ALL_DAY round trip preserves hours, dates and explicit offsets with exclusive payload end', () => {
  const api = model(), original = { ...fresh(api), title: 'Mi plan', startTime: '18:15',
    endDate: '2026-10-28', endTime: '19:45', startOffset: -180, endOffset: -180 };
  const allDay = api.toggleAllDay(original, true);
  assert.deepEqual(api.draftPayload(allDay).schedule,
    { kind: 'ALL_DAY', startDate: day, endDateExclusive: '2026-10-29' });
  const restored = api.toggleAllDay(allDay, false);
  for (const field of ['startDate', 'endDate', 'startTime', 'endTime', 'startOffset', 'endOffset'])
    assert.equal(restored[field], original[field]);
  const loaded = api.eventDraft(privateEvent({ schedule: { kind: 'ALL_DAY', startDate: day,
    endDateExclusive: '2026-10-29' } }), day, zone);
  assert.equal(api.toggleAllDay(loaded, false).startTime, '09:00');
  assert.equal(api.toggleAllDay(loaded, false).endTime, '10:00');
});

test('weekly preview suggests five inclusive dates, tracks untouched until and does not clamp 54', () => {
  const api = model();
  let draft = { ...fresh(api), title: 'Historia', weekly: true };
  assert.deepEqual(api.repeatPreview(draft), { count: 5, firstDate: day, lastDate: '2026-11-24',
    untilDate: '2026-11-24', overLimit: false });
  draft = api.changeDraftStart(draft, { date: '2026-10-28' });
  assert.equal(draft.until, '2026-11-25');
  draft = api.changeDraftUntil(draft, '2026-12-01');
  assert.equal(api.changeDraftStart(draft, { date: '2026-10-29' }).until, '2026-12-01');
  for (const [until, count, overLimit] of [[day, 1, false], ['2027-10-26', 53, false], ['2027-11-02', 54, true]]) {
    const candidate = api.changeDraftUntil({ ...fresh(api), title: 'Clase', weekly: true }, until);
    assert.equal(api.repeatPreview(candidate).count, count); assert.equal(api.repeatPreview(candidate).overLimit, overLimit);
    assert.equal(api.validateDraft(candidate).ok, !overLimit);
  }
  const invalid = api.validateDraft({ ...draft, until: '2026-10-01' });
  assert.equal(invalid.ok, false); assert.ok(invalid.issues.some(issue => issue.field === 'until'));
  assert.match(api.draftSummary({ ...fresh(api), title: 'Historia', weekly: true }), /martes/i);
  assert.match(api.draftSummary({ ...fresh(api), title: 'Historia', weekly: true }), /5/);
  assert.doesNotThrow(() => api.draftSummary({ ...draft, startDate: '', endTime: '' }));
});

test('dirty comparison follows payload data and permits restoring an invalid or valid draft', () => {
  const api = model(), baseline = fresh(api);
  assert.equal(api.isDraftDirty({ ...baseline, until: '', untilEdited: true, endMode: 'MANUAL', durationMinutes: 90 }, baseline), false);
  assert.equal(api.isDraftDirty({ ...baseline, title: 'Mi plan' }, baseline), true);
  assert.equal(api.isDraftDirty({ ...baseline, title: '   ' }, baseline), false);
  const allDay = api.toggleAllDay(baseline, true);
  assert.equal(api.isDraftDirty({ ...allDay, startTime: '', zone: 'UTC', startOffset: 0 }, allDay), false);
});

test('validation orders fields and exposes first DST choices without accepting an arbitrary offset', () => {
  const api = model(), draft = { ...fresh(api), title: 'Clase', zone: 'America/New_York',
    startDate: '2026-11-01', endDate: '2026-11-01', startTime: '01:30', endTime: '02:30' };
  const result = api.validateDraft(draft);
  assert.equal(result.ok, false);
  const issue = result.issues.find(value => value.field === 'startTime');
  assert.equal(issue.choices.length, 2); assert.deepEqual(issue.choices.map(value => value.offsetMinutes), [-240, -300]);
  assert.ok(issue.choices.every(value => value.label.includes('01:30')));
  assert.equal(draft.startOffset, undefined);
  for (const offset of [-240, -300]) assert.equal(api.validateDraft({ ...draft, startOffset: offset }).payload.schedule.startOffsetMinutes, offset);
  assert.equal(api.validateDraft({ ...draft, startOffset: 999 }).ok, false);
  const missing = api.validateDraft({ ...draft, title: '', startDate: '' });
  assert.equal(missing.issues[0].field, 'title');
});

for (const [startDate, until, time] of [['2026-10-25', '2026-11-08', '01:30'], ['2026-03-01', '2026-03-15', '02:30']])
  test(`future DST issue from ${startDate} is attached to until without an unrepresentable offset choice`, () => {
    const api = model(), draft = { ...fresh(api), title: 'Clase', zone: 'America/New_York',
      startDate, endDate: startDate, startTime: time, endTime: '03:30', weekly: true, until };
    const result = api.validateDraft(draft); assert.equal(result.ok, false);
    const issue = result.issues.find(value => value.field === 'until');
    assert.ok(issue); assert.ok(!issue.choices?.length);
    const failure = api.eventFailure({ code: 'INVALID_INPUT', details: { local: '2026-11-01T01:30',
      timeZone: 'America/New_York', choices: [{ offsetMinutes: -240, instant: '2026-11-01T05:30:00.000Z' }] } }, draft);
    assert.ok(!JSON.stringify(failure).includes('offsetMinutes'));
    assert.ok(!failure.message.includes('{')); assert.ok(!failure.message.includes('America/New_York'));
  });

test('nonexistent DST time offers no invented choice and zones remain readable and preserve inherited values', () => {
  const api = model(), draft = { ...fresh(api), title: 'Plan', zone: 'America/New_York',
    startDate: '2026-03-08', endDate: '2026-03-08', startTime: '02:30', endTime: '03:30' };
  const result = api.validateDraft(draft); assert.equal(result.ok, false);
  assert.ok(!result.issues.find(issue => issue.field === 'startTime').choices?.length);
  const choices = api.zoneChoices('Asia/Tokyo');
  assert.equal(new Set(choices.map(choice => choice.value)).size, choices.length);
  assert.ok(choices.some(choice => choice.value === 'Asia/Tokyo' && /Tokyo/i.test(choice.label)));
  assert.ok(choices.some(choice => choice.value === zone && /Buenos Aires/.test(choice.label)));
  assert.equal(api.zoneLabel('UTC'), 'Hora universal'); assert.match(api.zoneLabel(zone), /Hora de Buenos Aires/);
});

test('focus day converts timed events to the calendar zone and keeps ALL_DAY dates', () => {
  const api = model(), event = privateEvent({ schedule: { kind: 'TIMED', timeZone: 'Asia/Tokyo',
    startLocal: '2026-11-01T00:30', endLocal: '2026-11-01T01:30' } });
  assert.equal(api.eventFocusDay(event, zone), '2026-10-31');
  assert.equal(api.eventFocusDay(privateEvent({ schedule: { kind: 'ALL_DAY', startDate: '2026-11-01',
    endDateExclusive: '2026-11-02' } }), zone), '2026-11-01');
});

test('both ambiguous endpoints can be resolved successively without losing the first choice', () => {
  const api = model(), draft = { ...fresh(api), title: 'Turno', zone: 'America/New_York',
    startDate: '2026-11-01', endDate: '2026-11-01', startTime: '01:10', endTime: '01:40', startOffset: -240 };
  const result = api.validateDraft(draft);
  assert.equal(result.ok, false);
  const issue = result.issues.find(value => value.field === 'endTime');
  assert.deepEqual(issue.choices.map(value => value.offsetMinutes), [-240, -300]);
  const resolved = api.validateDraft({ ...draft, endOffset: -300 });
  assert.equal(resolved.ok, true);
  assert.equal(resolved.payload.schedule.startOffsetMinutes, -240);
  assert.equal(resolved.payload.schedule.endOffsetMinutes, -300);
});

test('manual invalid end and incomplete dates stay attached to their controls without normalization', () => {
  const api = model(), draft = { ...fresh(api), title: 'Plan', endMode: 'MANUAL' };
  for (const [changed, field] of [[{ endTime: '08:00' }, 'endTime'],
    [{ endDate: '2026-10-26' }, 'endDate'], [{ startDate: '2026-02-30' }, 'startDate']]) {
    const result = api.validateDraft({ ...draft, ...changed });
    assert.equal(result.ok, false); assert.ok(result.issues.some(issue => issue.field === field));
  }
  for (const failure of [null, {}, { code: 'INVALID_INPUT', details: {} },
    { code: 'INVALID_INPUT', details: { choices: 'invalid' } }])
    assert.doesNotThrow(() => api.eventFailure(failure, draft));
});

for (const [startDate, until, time, conflictDay, month] of [
  ['2026-10-25', '2026-11-08', '01:30', '1', 'noviembre'],
  ['2026-03-01', '2026-03-15', '02:30', '8', 'marzo'],
]) test(`future DST message identifies ${month} conflict date and human city`, () => {
  const api = model(), draft = { ...fresh(api), title: 'Clase', zone: 'America/New_York',
    startDate, endDate: startDate, startTime: time, endTime: '03:30', weekly: true, until };
  const result = api.validateDraft(draft); assert.equal(result.ok, false);
  const issue = result.issues.find(value => value.field === 'until'); assert.ok(issue);
  assert.match(issue.message, new RegExp(`\\b${conflictDay}\\b.*${month}`, 'i'));
  assert.match(issue.message, /Nueva York/i); assert.match(issue.message, /2026/);
  assert.ok(!issue.choices?.length); assert.ok(!issue.message.includes('America/New_York'));
});

test('first ambiguous time choices name first and second occurrence in instant order without technical offsets', () => {
  const api = model(), draft = { ...fresh(api), title: 'Turno', zone: 'America/New_York',
    startDate: '2026-11-01', endDate: '2026-11-01', startTime: '01:30', endTime: '02:30' };
  const result = api.validateDraft(draft); assert.equal(result.ok, false);
  const choices = result.issues.find(issue => issue.field === 'startTime').choices;
  assert.equal(choices.length, 2);
  assert.deepEqual(choices.map(choice => choice.instant), ['2026-11-01T05:30:00.000Z', '2026-11-01T06:30:00.000Z']);
  assert.match(choices[0].label, /primera.*01:30/i); assert.match(choices[1].label, /segunda.*01:30/i);
  for (const choice of choices) assert.doesNotMatch(choice.label, /UTC|GMT|offset|[−+-]0[45]:00|-240|-300|America\//i);
  assert.equal(draft.startOffset, undefined);
});
