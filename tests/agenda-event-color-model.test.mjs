import test from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './helpers/load-ts-module.mjs';
import { privateEvent, editorView, day, zone, installWindow } from './agenda-event-form-helpers.test.mjs';
import { deferred } from './agenda-ui-helpers.test.mjs';

test('AUTO is historical, explicit colors round trip and dirty compares choices for both schedule kinds', () => {
  const api = loadTsModule('apps/agenda-ui/index.ts');
  assert.equal(api.eventDraft(undefined, day, zone).color, 'GREEN');
  for (const allDay of [false, true]) {
    let event = privateEvent();
    if (allDay) event.schedule = { kind: 'ALL_DAY', startDate: day, endDateExclusive: '2026-10-28' };
    const base = api.eventDraft(event, day, zone);
    assert.equal(base.color, 'AUTO'); assert.equal(Object.hasOwn(api.draftPayload(base), 'color'), false);
    const changed = { ...base, color: 'PURPLE' };
    assert.equal(api.isDraftDirty(changed, base), true);
    assert.equal(api.isDraftDirty({ ...changed, color: 'AUTO' }, base), false);
    assert.equal(api.draftPayload(changed).color, 'PURPLE');
    assert.equal(api.eventDraft({ ...event, color: 'BLUE' }, day, zone).color, 'BLUE');
    for (const transformed of [api.toggleAllDay(changed, !allDay), api.setDraftDuration(changed, 90),
      api.changeDraftStart(changed, { time: '11:00' }), { ...changed, category: 'EVALUATION' }])
      assert.equal(transformed.color, 'PURPLE');
  }
});
test('invalid color produces a color issue and zero editor writes', async () => {
  let writes = 0;
  const view = await editorView({ async put() { writes++; } });
  try {
    view.tree.setDraft({ ...view.tree.draft, title: 'Plan', color: '#bad' }); await view.flush();
    await view.tree.save(); await view.flush();
    assert.equal(writes, 0); assert.ok(view.tree.issues.some(x => x.field === 'color' && x.message));
    assert.equal(view.tree.draft.color, '#bad');
  } finally { view.close(); }
});
test('pending and failed save preserve explicit choice and duplicate save is one write', async () => {
  const pending = deferred(), calls = [], restore = installWindow();
  const view = await editorView({ async put(id, event) { calls.push(event); return pending.promise; } });
  try {
    view.tree.setDraft({ ...view.tree.draft, title: 'Plan', color: 'GREEN' }); await view.flush();
    const first = view.tree.save(), duplicate = view.tree.save(); await view.flush();
    assert.equal(calls.length, 1); assert.equal(calls[0].color, 'GREEN');
    pending.reject({ code: 'SERVICE_UNAVAILABLE' }); await Promise.all([first, duplicate]); await view.flush();
    assert.equal(view.tree.draft.color, 'GREEN'); assert.ok(view.tree.error);
  } finally { view.close(); restore(); }
});
test('color-only CAS conflict retains local choice, review retains remote and next save uses new revision', async () => {
  const original = privateEvent({ color: 'BLUE' }), latest = { ...original, revision: '1', color: 'PINK' };
  const calls = [], restore = installWindow();
  const view = await editorView({ async replace(id, revision, event) {
    calls.push({ revision, event }); if (revision === original.revision) throw { code: 'CONFLICT' };
    return { ...latest, ...event };
  }, async get() { return latest; } }, original);
  try {
    view.tree.setDraft({ ...view.tree.draft, color: 'PURPLE' }); await view.flush();
    assert.equal(view.tree.dirty, true); await view.tree.save(); await view.flush();
    assert.equal(view.tree.conflict, true); assert.equal(view.tree.draft.color, 'PURPLE');
    await view.tree.save(); assert.equal(calls.length, 1);
    await view.tree.review(); await view.flush();
    assert.equal(view.tree.stored.color, 'PINK'); assert.equal(view.tree.draft.color, 'PURPLE');
    await view.tree.save(); await view.flush();
    assert.equal(calls.at(-1).revision, '1'); assert.equal(calls.at(-1).event.color, 'PURPLE');
  } finally { view.close(); restore(); }
});
