import test from 'node:test';
import assert from 'node:assert/strict';
import { deferred } from './agenda-ui-helpers.test.mjs';
import { editorView, privateEvent, installWindow, day } from './agenda-event-form-helpers.test.mjs';

test('create remains idempotent during pending writes and preserves its ID after a recoverable error', async () => {
  const pending = deferred(), calls = [], saved = [];
  const restore = installWindow();
  let attempt = 0;
  const view = await editorView({ async put(id, payload) {
    calls.push({ id, payload }); if (++attempt === 1) return pending.promise;
    return privateEvent({ id, ...payload });
  } }, undefined, value => saved.push(value));
  try {
    view.tree.setDraft({ ...view.tree.draft, title: 'Evaluación' }); await view.flush();
    const first = view.tree.save(), duplicate = view.tree.save(); await view.flush();
    assert.equal(calls.length, 1); assert.equal(view.tree.busy, true);
    pending.reject({ code: 'SERVICE_UNAVAILABLE', message: 'Conservamos tus cambios.' });
    await Promise.all([first, duplicate]); await view.flush();
    assert.equal(view.tree.draft.title, 'Evaluación'); assert.equal(saved.length, 0);
    assert.equal(view.tree.busy, false); assert.ok(view.tree.error);
    await view.tree.save(); await view.flush();
    assert.equal(calls.length, 2); assert.equal(calls[0].id, calls[1].id);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].kind, 'saved'); assert.equal(saved[0].mode, 'created');
    assert.equal(saved[0].event.id, calls[1].id); assert.equal(saved[0].event.title, 'Evaluación');
  } finally { view.close(); restore(); }
});

test('invalid draft publishes ordered inline issues without any API call', async () => {
  let writes = 0;
  const view = await editorView({ async put() { writes++; } });
  try {
    await view.tree.save(); await view.flush();
    assert.equal(writes, 0); assert.equal(view.tree.issues[0].field, 'title');
    assert.equal(view.tree.draft.title, ''); assert.equal(view.tree.busy, false);
  } finally { view.close(); }
});

test('close is blocked while busy and dirty choice can reject or accept discard', async () => {
  const pending = deferred(); let confirms = 0, accept = false;
  const restore = installWindow(() => { confirms++; return accept; });
  const view = await editorView({ async put() { return pending.promise; } });
  try {
    assert.equal(view.tree.requestClose(), true); assert.equal(confirms, 0);
    const baseline = view.tree.draft;
    view.tree.setDraft({ ...baseline, title: 'Mi plan' }); await view.flush();
    assert.equal(view.tree.dirty, true); assert.equal(view.tree.requestClose(), false);
    accept = true; assert.equal(view.tree.requestClose(), true); assert.equal(confirms, 2);
    const saving = view.tree.save(); await view.flush();
    assert.equal(view.tree.requestClose(), false); assert.equal(confirms, 2);
    pending.resolve(privateEvent()); await saving; await view.flush();
    view.tree.setDraft(baseline); await view.flush(); assert.equal(view.tree.dirty, false);
  } finally { view.close(); restore(); }
});

test('weekly create needs no past-series confirmation but editing does and cancellation preserves changes', async () => {
  let confirmations = 0, writes = 0;
  const restore = installWindow(() => { confirmations++; return false; });
  const created = await editorView({ async put(id, payload) { writes++; return privateEvent({ id, ...payload }); } });
  const original = privateEvent({ repeat: { kind: 'WEEKLY', untilDate: '2026-11-24' } });
  const edited = await editorView({ async replace() { writes++; } }, original);
  try {
    created.tree.setDraft({ ...created.tree.draft, title: 'Clase semanal', weekly: true }); await created.flush();
    await created.tree.save(); await created.flush(); assert.equal(writes, 1); assert.equal(confirmations, 0);
    edited.tree.setDraft({ ...edited.tree.draft, title: 'Mis cambios' }); await edited.flush();
    await edited.tree.save(); await edited.flush();
    assert.equal(confirmations, 1); assert.equal(writes, 1); assert.equal(edited.tree.draft.title, 'Mis cambios');
  } finally { created.close(); edited.close(); restore(); }
});

test('delete checks current revision and emits only a confirmed removed outcome', async () => {
  const original = privateEvent(), calls = [], outcomes = [], restore = installWindow();
  let revision = 'newer';
  const view = await editorView({
    async get() { return { ...original, revision }; },
    async remove(id, value) { calls.push({ id, revision: value }); },
  }, original, value => outcomes.push(value));
  try {
    await view.tree.remove(); await view.flush();
    assert.equal(view.tree.conflict, true); assert.equal(calls.length, 0); assert.equal(outcomes.length, 0);
    await view.tree.remove(); await view.flush(); assert.equal(calls.length, 0);
    await view.tree.review(); await view.flush();
    await view.tree.remove(); await view.flush();
    assert.deepEqual(calls, [{ id: original.id, revision }]);
    assert.deepEqual(outcomes, [{ kind: 'removed', id: original.id }]);
  } finally { view.close(); restore(); }
});

test('CAS conflict retains draft, blocks overwrite until review and uses the reviewed revision', async () => {
  const original = privateEvent(), latest = privateEvent({ ...original, revision: 'revision-2', title: 'Otra pestaña' });
  const calls = [], saved = [], restore = installWindow();
  const view = await editorView({
    async replace(id, revision, payload) {
      calls.push({ id, revision, payload });
      if (revision === original.revision) throw { code: 'CONFLICT', message: 'El evento cambió.' };
      return { ...latest, ...payload };
    }, async get(id) { assert.equal(id, original.id); return latest; },
  }, original, result => saved.push(result));
  try {
    view.tree.setDraft({ ...view.tree.draft, title: 'Mis cambios' }); await view.flush();
    await view.tree.save(); await view.flush();
    assert.equal(view.tree.conflict, true); assert.equal(view.tree.draft.title, 'Mis cambios');
    await view.tree.save(); await view.flush();
    assert.equal(calls.length, 1, 'Conflict must block even programmatic duplicate saves before review');
    await view.tree.review(); await view.flush();
    assert.equal(view.tree.conflict, false); assert.equal(view.tree.stored.title, 'Otra pestaña');
    assert.equal(view.tree.draft.title, 'Mis cambios');
    await view.tree.save(); await view.flush();
    assert.equal(calls.at(-1).revision, latest.revision);
    assert.equal(calls.at(-1).payload.title, 'Mis cambios'); assert.equal(saved.length, 1);
  } finally { view.close(); restore(); }
});

test('CAS review of a remote weekly conversion requires whole-series consent before replacing', async () => {
  const original = privateEvent(), latest = { ...original, revision: 'weekly-revision',
    repeat: { kind: 'WEEKLY', untilDate: '2026-11-24' } };
  const calls = [], outcomes = [], confirmations = [];
  const restore = installWindow(message => { confirmations.push(message); return false; });
  const view = await editorView({
    async replace(id, revision, payload) {
      calls.push({ id, revision, payload });
      if (revision === original.revision) throw { code: 'CONFLICT', message: 'El evento cambió.' };
      return { ...latest, ...payload };
    }, async get() { return latest; },
  }, original, outcome => outcomes.push(outcome));
  try {
    view.tree.setDraft({ ...view.tree.draft, title: 'Mis cambios locales' }); await view.flush();
    await view.tree.save(); await view.flush();
    assert.equal(view.tree.conflict, true); assert.equal(calls.length, 1);
    await view.tree.review(); await view.flush();
    assert.equal(view.tree.stored.repeat.kind, 'WEEKLY');
    assert.equal(view.tree.draft.weekly, false, 'Review preserves the local single-event draft');
    const preserved = structuredClone(view.tree.draft);
    await view.tree.save(); await view.flush();
    assert.equal(confirmations.length, 1, 'The reviewed saved series determines the destructive scope');
    assert.match(confirmations[0], /toda la serie/i); assert.match(confirmations[0], /pasadas/i);
    assert.equal(calls.length, 1, 'Declining consent must not replace or collapse the remote series');
    assert.equal(outcomes.length, 0); assert.deepEqual(view.tree.draft, preserved);
    assert.equal(view.tree.stored.revision, latest.revision);
  } finally { view.close(); restore(); }
});
