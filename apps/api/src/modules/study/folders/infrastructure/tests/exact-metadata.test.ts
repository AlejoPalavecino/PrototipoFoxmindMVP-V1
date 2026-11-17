import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyService } from '../../../../../bootstrap/study-composition.ts';
import type { FolderRow, StudyDatabase, StudyFolder, StudyState } from '../../../application/contracts.ts';

const ownerId = crypto.randomUUID(), otherOwnerId = crypto.randomUUID(), planId = crypto.randomUUID();
const units = [{ id: crypto.randomUUID(), title: 'Unidad', topics: [{ id: crypto.randomUUID(), title: 'Tema' }] }];
function fixture() {
  const rows = new Map<string, FolderRow>();
  let role = 'student', verified = true;
  const query = async (sql: string, ...values: unknown[]) => {
    if (sql.includes('FROM users')) return [{ account_role: role, email_verified_at: verified ? new Date() : null }];
    if (sql.includes('count(*)')) return [{ count: BigInt([...rows.values()].filter(r => r.owner_id === values[0]).length) }];
    if (sql.includes('INSERT INTO study_folders')) {
      const row: FolderRow = { id: String(values[0]), owner_id: String(values[1]), status: values[2] as FolderRow['status'],
        revision: 1n, state: JSON.parse(String(values[3])) as StudyState, created_at: new Date(), updated_at: new Date() };
      rows.set(row.id, row); return [structuredClone(row)];
    }
    if (sql.includes('UPDATE study_folders')) {
      const previous = rows.get(String(values[0]));
      if (!previous || previous.owner_id !== values[1]) return [];
      const row = { ...previous, state: JSON.parse(String(values[2])) as StudyState,
        status: values[3] as FolderRow['status'], revision: previous.revision + 1n };
      rows.set(row.id, row); return [structuredClone(row)];
    }
    if (sql.includes('FROM study_folders') && sql.includes('AS fields')) {
      return [...rows.values()].filter(r => r.owner_id === values[0] && r.status !== 'DELETED').map(row => {
        const { units: _, ...fields } = row.state.fields;
        const { state: __, ...summary } = row;
        return structuredClone({ ...summary, fields });
      });
    }
    if (sql.includes('FROM study_folders')) {
      const row = rows.get(String(values[0]));
      return row && row.owner_id === values[1] && row.status !== 'DELETED' ? [structuredClone(row)] : [];
    }
    return [];
  };
  const database: StudyDatabase = { async $transaction(operation) {
    const before = structuredClone(rows);
    try { return await operation({ $queryRawUnsafe: async <T>(sql: string, ...values: unknown[]) => await query(sql, ...values) as T }); }
    catch (error) { rows.clear(); for (const [key, row] of before) rows.set(key, row); throw error; }
  } };
  const service = createStudyService({ database,
    authenticate: async (_tx, request) => (request as { ownerId?: string }).ownerId ?? ownerId,
    files: { async assertOwn(_tx, _owner, _folder, fileId) { assert.equal(fileId, planId); } } });
  return { service, rows, actor(nextRole: string, nextVerified = true) { role = nextRole; verified = nextVerified; } };
}
async function active(f: ReturnType<typeof fixture>) {
  return (await f.service.create({}, { name: 'Anterior', units, planFileId: planId, status: 'ACTIVE' })).folder;
}
function rename(folder: StudyFolder, conversationId: string, title: unknown = 'Nuevo título') {
  return { revision: folder.revision, requestId: crypto.randomUUID(), action: 'RENAME_CONVERSATION', conversationId, title };
}

test('metadata survives serialized create, patch, list and detail; omitted patch fields preserve it', async () => {
  const f = fixture();
  let { folder } = await f.service.create({}, { name: 'Mi carpeta', subject: '  Biología ', wizardStep: 2 });
  assert.equal(folder.subject, 'Biología'); assert.equal(folder.wizardStep, 2);
  ({ folder } = await f.service.patch({}, folder.id, { revision: folder.revision, name: 'Mi carpeta revisada' }));
  for (const read of [(await f.service.get({}, folder.id)).folder, (await f.service.list({})).items[0]!]) {
    assert.equal(read.subject, 'Biología'); assert.equal(read.wizardStep, 2);
  }
  ({ folder } = await f.service.patch({}, folder.id, { revision: folder.revision, subject: '', wizardStep: 0 }));
  assert.equal(folder.subject, ''); assert.equal(folder.wizardStep, 0);
});

test('legacy drafts and active folders remain readable/editable without altering existing content', async () => {
  const f = fixture();
  for (const status of ['DRAFT', 'ACTIVE'] as const) {
    const { folder } = await f.service.create({}, { name: 'Anterior', units, planFileId: planId, status });
    const stored = f.rows.get(folder.id)!;
    delete stored.state.fields.subject; delete stored.state.fields.wizardStep;
    stored.state.memory = { legacy: 'intacto' };
    const before = structuredClone(stored.state);
    const read = (await f.service.get({}, folder.id)).folder;
    assert.equal(read.subject, ''); assert.equal(read.wizardStep, status === 'DRAFT' ? 0 : undefined);
    assert.deepEqual(f.rows.get(folder.id)!.state, before, 'reading does not rewrite legacy data');
    await f.service.patch({}, folder.id, { revision: folder.revision, name: 'Actualizada' });
    const after = f.rows.get(folder.id)!.state;
    assert.deepEqual(after.fields.units, before.fields.units); assert.deepEqual(after.memory, before.memory);
  }
});

test('activation through create, patch or command clears the saved step and retains the subject', async () => {
  const f = fixture(), fields = { name: 'Mi carpeta', subject: 'Historia', wizardStep: 3, units, planFileId: planId };
  const created = (await f.service.create({}, { ...fields, status: 'ACTIVE' })).folder;
  let patched = (await f.service.create({}, fields)).folder;
  patched = (await f.service.patch({}, patched.id, { revision: patched.revision, status: 'ACTIVE' })).folder;
  let confirmed = (await f.service.create({}, fields)).folder;
  confirmed = (await f.service.command({}, confirmed.id, { revision: confirmed.revision, requestId: crypto.randomUUID(), action: 'CONFIRM_FOLDER' })).folder;
  for (const folder of [created, patched, confirmed]) {
    assert.equal(folder.subject, 'Historia'); assert.equal(Object.hasOwn(folder, 'wizardStep'), false);
    assert.equal(Object.hasOwn(f.rows.get(folder.id)!.state.fields, 'wizardStep'), false);
  }
});

test('invalid metadata, stale revision, foreign ownership and unverified actor preserve stored state', async () => {
  const f = fixture(), { folder } = await f.service.create({}, { subject: 'Química', wizardStep: 1 });
  const before = structuredClone(f.rows.get(folder.id));
  for (const invalid of [{ subject: null }, { subject: 'a'.repeat(101) }, { wizardStep: 4 }, { wizardStep: '1' }]) {
    await assert.rejects(f.service.patch({}, folder.id, { revision: folder.revision, ...invalid }), { code: 'INVALID_INPUT' });
    assert.deepEqual(f.rows.get(folder.id), before);
  }
  await assert.rejects(f.service.patch({}, folder.id, { revision: '7', subject: 'Otra' }), { code: 'CONFLICT' });
  await assert.rejects(f.service.patch({ ownerId: otherOwnerId }, folder.id, { revision: folder.revision, subject: 'Otra' }), { code: 'FORBIDDEN' });
  f.actor('student', false);
  await assert.rejects(f.service.patch({}, folder.id, { revision: folder.revision, subject: 'Otra' }), { code: 'FORBIDDEN' });
  assert.deepEqual(f.rows.get(folder.id), before);
});

test('renaming preserves full turns and only the target conversation; retry is idempotent', async () => {
  const f = fixture(); let folder = await active(f);
  const first = await f.service.command({}, folder.id, { revision: folder.revision, requestId: crypto.randomUUID(), action: 'NEW_CONVERSATION', title: 'Original' });
  folder = first.folder;
  const conversationId = String((first.result as { conversation: { id: string } }).conversation.id);
  const stored = f.rows.get(folder.id)!;
  const turns = [{ id: crypto.randomUUID(), role: 'user', text: 'Pregunta original', attachmentIds: [planId], sourceRefs: [] }];
  stored.state.conversations[0]!.turns = structuredClone(turns);
  stored.state.conversations.push({ id: crypto.randomUUID(), title: 'Sin cambios', turns: [] });
  const others = structuredClone(stored.state.conversations[1]);
  const input = rename(folder, conversationId, '  Repaso de células  ');
  const updated = await f.service.command({}, folder.id, input);
  assert.deepEqual(updated.result, { conversation: { id: conversationId, title: 'Repaso de células' } });
  assert.equal(updated.folder.revision, String(BigInt(folder.revision) + 1n));
  assert.deepEqual(f.rows.get(folder.id)!.state.conversations[0]!.turns, turns);
  assert.deepEqual(f.rows.get(folder.id)!.state.conversations[1], others);
  assert.deepEqual(await f.service.command({}, folder.id, input), updated);
  assert.equal(f.rows.get(folder.id)!.revision, BigInt(updated.folder.revision));
  const read = await f.service.get({}, folder.id);
  assert.equal((read.conversations[0]! as Record<string, unknown>).title, 'Repaso de células');
  await assert.rejects(f.service.command({}, folder.id, { ...input, title: 'Reuso distinto' }), { code: 'CONFLICT' });
});

test('rename enforces owner, conversation scope, revision, title and command shape atomically', async () => {
  const f = fixture(), folder = await active(f), foreignFolder = await active(f);
  const conversationId = crypto.randomUUID(), foreignConversationId = crypto.randomUUID();
  f.rows.get(folder.id)!.state.conversations = [{ id: conversationId, title: 'Anterior', turns: [] }];
  f.rows.get(foreignFolder.id)!.state.conversations = [{ id: foreignConversationId, title: 'Ajena', turns: [] }];
  const before = structuredClone(f.rows);
  for (const title of ['', '   ', null, 42, [], 'a'.repeat(121)]) {
    await assert.rejects(f.service.command({}, folder.id, rename(folder, conversationId, title)), { code: 'INVALID_INPUT' });
    assert.deepEqual(f.rows, before);
  }
  await assert.rejects(f.service.command({}, folder.id, { ...rename(folder, conversationId), turns: [] }), { code: 'INVALID_INPUT' });
  await assert.rejects(f.service.command({}, folder.id, rename(folder, 'not-a-uuid')), { code: 'INVALID_INPUT' });
  await assert.rejects(f.service.command({}, folder.id, rename(folder, foreignConversationId)), { code: 'FORBIDDEN' });
  await assert.rejects(f.service.command({}, folder.id, { ...rename(folder, conversationId), revision: '9' }), { code: 'CONFLICT' });
  await assert.rejects(f.service.command({ ownerId: otherOwnerId }, folder.id, rename(folder, conversationId)), { code: 'FORBIDDEN' });
  f.actor('teacher');
  await assert.rejects(f.service.command({}, folder.id, rename(folder, conversationId)), { code: 'FORBIDDEN' });
  assert.deepEqual(f.rows, before);
});

test('rename follows NEW_CONVERSATION status restrictions for drafts, archived and deleted folders', async () => {
  const f = fixture(), folder = await active(f), conversationId = crypto.randomUUID();
  f.rows.get(folder.id)!.state.conversations = [{ id: conversationId, title: 'Anterior', turns: [] }];
  for (const status of ['DRAFT', 'ARCHIVED', 'DELETED'] as const) {
    f.rows.get(folder.id)!.status = status;
    const before = structuredClone(f.rows.get(folder.id));
    await assert.rejects(f.service.command({}, folder.id, rename(folder, conversationId)), { code: status === 'DELETED' ? 'FORBIDDEN' : 'CONFLICT' });
    assert.deepEqual(f.rows.get(folder.id), before);
  }
});
