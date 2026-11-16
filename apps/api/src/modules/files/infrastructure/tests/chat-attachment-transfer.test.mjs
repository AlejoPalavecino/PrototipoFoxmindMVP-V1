import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { PDFDocument } from 'pdf-lib';
import { withAgendaDatabase } from '../../../../../../../tests/agenda-database-helpers.test.mjs';
import { parseCreateFoxyConversation } from '../../../../../../../src/core/domain/foxy/validation.ts';
import { createFoxyConversationRepository } from '../../../foxy/infrastructure/conversation-repository.ts';
import { createChatAttachmentService } from '../chat-attachment-service.ts';
import { attachmentKey, attachmentSources } from '../chat-attachment-repository.ts';
import { refreshFoxyAttachmentSnapshot } from '../../../foxy/infrastructure/claim-authority-check.ts';

pg.types.setTypeParser(20, BigInt);

test('carry contract canonicalizes IDs, rejects duplicate and unbounded selections', () => {
  const sourceConversationId = randomUUID(), first = randomUUID(), second = randomUUID();
  const base = { requestId: randomUUID(), title: 'Clase', context: { kind: 'GENERAL' } };
  const carryAttachments = { sourceConversationId, sourceRevision: '1', attachmentIds: [first, second] };
  assert.deepEqual(parseCreateFoxyConversation({ ...base, carryAttachments }).carryAttachments,
    { ...carryAttachments, attachmentIds: [first, second].sort() });
  for (const attachmentIds of [[], [first, first.toUpperCase()], Array.from({ length: 7 }, randomUUID)]) {
    assert.throws(() => parseCreateFoxyConversation({ ...base, carryAttachments: { ...carryAttachments, attachmentIds } }), { code: 'INVALID_INPUT' });
  }
});

async function fixture(pool) {
  const owner = randomUUID(), other = randomUUID(), chat = randomUUID();
  for (const id of [owner, other]) await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Cuenta','Sintetica','fixture',now(),'teacher')`, [id, `${id}@example.test`]);
  await pool.query("INSERT INTO foxy_conversations(id,owner_id,title,context_kind) VALUES($1,$2,'Origen','GENERAL')", [chat, owner]);
  const run = async fn => {
    const client = await pool.connect();
    try { await client.query('BEGIN'); const value = await fn({ query: async (sql, ...values) => (await client.query(sql, values)).rows }); await client.query('COMMIT'); return value; }
    catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
  };
  const database = { $transaction: fn => run(tx => fn({ $queryRawUnsafe: tx.query })) };
  const objects = new Map(), events = [];
  const hooks = {};
  const storage = {
    async put(key, bytes) { events.push(['put', key]); assert.ok(!objects.has(key)); objects.set(key, Buffer.from(bytes)); },
    async get(key) { await hooks.get?.(key); return Buffer.from(objects.get(key)); },
    async remove(key) { await hooks.remove?.(key); events.push(['remove', key]); objects.delete(key); },
  };
  const auth = async (_tx, request) => request.owner;
  const service = createChatAttachmentService({ database, storage, teacher: auth, student: auth, inspect: async () => 'application/pdf', scan: async () => {} });
  const document = await PDFDocument.create(); document.addPage().drawText('Documento privado de prueba');
  const bytes = Buffer.from(await document.save()), intent = { name: 'guía.pdf', extension: 'pdf', copy: false };
  const upload = async (conversationId = chat) => { const id = randomUUID(); await service.upload({ owner }, { conversationId }, id, intent, bytes); return id; };
  const repository = createFoxyConversationRepository();
  const create = (sourceConversationId, attachmentIds, options = {}) => {
    const input = parseCreateFoxyConversation({ requestId: options.requestId ?? randomUUID(), title: 'Destino', context: options.context ?? { kind: 'GENERAL' },
      carryAttachments: { sourceConversationId, sourceRevision: options.sourceRevision ?? '0', attachmentIds } });
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    return run(tx => repository.create(tx, options.owner ?? owner, input, hash));
  };
  const list = conversationId => service.list({ owner }, { conversationId });
  const sources = conversationId => run(tx => attachmentSources(tx, { ownerId: owner, conversationId }));
  return { owner, other, chat, run, service, objects, events, hooks, bytes, intent, upload, create, list, sources };
}

test('private opening reauthorizes after storage and verifies digest', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = await f.upload(), target = { conversationId: f.chat };
    const file = await f.service.read({ owner: f.owner }, target, id);
    assert.deepEqual(file.bytes, f.bytes); assert.equal(file.name, f.intent.name); assert.equal(file.extension, 'pdf');
    await assert.rejects(f.service.read({ owner: f.other }, target, id), { code: 'FORBIDDEN' });
    f.objects.set(attachmentKey(id), Buffer.from('wrong bytes'));
    await assert.rejects(f.service.read({ owner: f.owner }, target, id), { code: 'FILE_NOT_READY' });
    f.objects.set(attachmentKey(id), f.bytes);
    f.hooks.get = async () => { await pool.query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1', [f.chat]); };
    await assert.rejects(f.service.read({ owner: f.owner }, target, id), { code: 'FORBIDDEN' });
  });
});

test('carry is atomic, idempotent and keeps independent canonical custody', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = await f.upload(), requestId = randomUUID();
    await assert.rejects(f.create(f.chat, [id], { owner: f.other }), { code: 'FORBIDDEN' });
    await assert.rejects(f.create(f.chat, [id], { sourceRevision: '2' }), { code: 'CONFLICT' });
    const [one, two] = await Promise.all([f.create(f.chat, [id], { requestId }), f.create(f.chat, [id], { requestId })]);
    assert.equal(one.conversation.id, two.conversation.id);
    assert.notEqual(one.created, two.created);
    const destination = one.conversation.id;
    assert.deepEqual((await f.list(destination)).map(item => item.id), [id]);
    assert.equal(f.events.filter(([kind]) => kind === 'put').length, 1);
    const [source] = await f.sources(destination), current = {};
    await f.run(tx => refreshFoxyAttachmentSnapshot(tx, f.owner, destination, { attachments: [source] }, current));
    assert.deepEqual(current.attachments, [source]);
    await f.service.remove({ owner: f.owner }, { conversationId: f.chat }, id);
    await pool.query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1', [f.chat]);
    await f.service.cleanup();
    assert.ok(f.objects.has(attachmentKey(id)));
    assert.equal((await f.create(f.chat, [id], { requestId })).conversation.id, destination);
    const third = (await f.create(destination, [id])).conversation.id;
    await f.service.remove({ owner: f.owner }, { conversationId: destination }, id);
    const revoked = {};
    await f.run(tx => refreshFoxyAttachmentSnapshot(tx, f.owner, destination, { attachments: [source] }, revoked));
    assert.deepEqual(revoked.attachments, []);
    await f.service.cleanup(); assert.ok(f.objects.has(attachmentKey(id)));
    assert.deepEqual((await f.list(third)).map(item => item.id), [id]);
    await f.service.remove({ owner: f.owner }, { conversationId: third }, id);
    await f.service.cleanup(); assert.equal(f.objects.has(attachmentKey(id)), false);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM chat_attachments')).rows[0].n, 1);
  });
});

test('classroom and general keep private files, archived reads remain available and revoked scopes fail', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = await f.upload(), room = randomUUID();
    await pool.query(`INSERT INTO classrooms(id,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,$2,'Ciencias','Ciencias','A',2026,'America/Argentina/Buenos_Aires','sky',100000000)`, [room, f.owner]);
    const classroom = (await f.create(f.chat, [id], { context: { kind: 'CLASSROOM', classroomId: room } })).conversation.id;
    const general = (await f.create(classroom, [id])).conversation.id;
    assert.deepEqual((await f.list(general)).map(item => item.id), [id]);
    await pool.query('UPDATE classrooms SET archived_at=now() WHERE id=$1', [room]);
    assert.deepEqual((await f.service.read({ owner: f.owner }, { conversationId: classroom }, id)).bytes, f.bytes);
    await assert.rejects(f.create(classroom, [id]), { code: 'FORBIDDEN' });
    await assert.rejects(f.create(general, [id], { context: { kind: 'CLASSROOM', classroomId: room } }), { code: 'NOT_FOUND' });
    await pool.query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1', [classroom]);
    await assert.rejects(f.service.read({ owner: f.owner }, { conversationId: classroom }, id), { code: 'FORBIDDEN' });
    assert.deepEqual((await f.service.read({ owner: f.owner }, { conversationId: general }, id)).bytes, f.bytes);
  });
});

test('terminal cleanup claim prevents transfer and upload resurrection, failed deletes retry', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = await f.upload(), target = { conversationId: f.chat };
    await f.service.remove({ owner: f.owner }, target, id);
    let entered, release;
    const started = new Promise(resolve => entered = resolve), blocked = new Promise(resolve => release = resolve);
    f.hooks.remove = async () => { entered(); await blocked; throw new Error('Storage temporarily unavailable'); };
    const sweep = f.service.cleanup(); await started;
    const row = (await pool.query('SELECT cleanup_claimed_at,cleaned_at FROM chat_attachments WHERE id=$1', [id])).rows[0];
    assert.ok(row.cleanup_claimed_at); assert.equal(row.cleaned_at, null);
    await assert.rejects(f.create(f.chat, [id]), { code: 'CONFLICT' });
    await assert.rejects(f.service.upload({ owner: f.owner }, target, id, f.intent, f.bytes), { code: 'CONFLICT' });
    await assert.rejects(f.service.read({ owner: f.owner }, target, id), { code: 'FORBIDDEN' });
    release(); await sweep; assert.ok(f.objects.has(attachmentKey(id)));
    f.hooks.remove = undefined; await f.service.cleanup(); assert.equal(f.objects.has(attachmentKey(id)), false);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM foxy_conversations WHERE owner_id=$1', [f.owner])).rows[0].n, 1);
  });
});

test('concurrent carry, remove and cleanup yield either an atomic rejection or durable destination', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = await f.upload();
    const [carry] = await Promise.allSettled([f.create(f.chat, [id]), f.service.remove({ owner: f.owner }, { conversationId: f.chat }, id), f.service.cleanup()]);
    await f.service.cleanup();
    if (carry.status === 'fulfilled') {
      assert.deepEqual((await f.service.read({ owner: f.owner }, { conversationId: carry.value.conversation.id }, id)).bytes, f.bytes);
      assert.ok(f.objects.has(attachmentKey(id)));
    } else { assert.equal(carry.reason.code, 'CONFLICT'); assert.equal(f.objects.has(attachmentKey(id)), false); }
    assert.equal(f.events.filter(([kind]) => kind === 'put').length, 1);
  });
});

test('carry counts each link toward chat limits but does not add physical quota or write objects', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = await f.upload();
    // Existing unrelated physical reservations fill the owner quota; carrying costs no new bytes.
    for (let index = 0; index < 13; index++) await pool.query(`INSERT INTO chat_attachments
      (id,owner_id,conversation_id,name,extension,size_bytes,digest,save_to_folder)
      VALUES($1,$2,$3,'reserva.pdf','pdf',20000000,$4,false)`, [randomUUID(), f.owner, f.chat, 'a'.repeat(64)]);
    const target = (await f.create(f.chat, [id])).conversation.id;
    assert.equal((await f.list(target)).length, 1);
    await assert.rejects(f.upload(target), { code: 'QUOTA_EXCEEDED' });
    assert.equal(f.events.filter(([kind]) => kind === 'put').length, 1);
    await pool.query('DELETE FROM chat_attachments WHERE ready_at IS NULL');
    const ids = [id]; for (let index = 0; index < 5; index++) ids.push(await f.upload());
    const full = (await f.create(f.chat, ids)).conversation.id;
    await assert.rejects(f.upload(full), { code: 'QUOTA_EXCEEDED' });
    assert.equal(f.events.filter(([kind]) => kind === 'put').length, 6);
    await pool.query('UPDATE chat_attachments SET size_bytes=20000000 WHERE id=ANY($1::uuid[])', [ids.slice(0, 2)]);
    await assert.rejects(f.create(f.chat, ids.slice(0, 2)), { code: 'QUOTA_EXCEEDED' });
  });
});

test('migration backfills old teacher custody and preserves removed and orphaned records', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), id = randomUUID(), removed = randomUUID(), orphan = randomUUID();
    await pool.query('DROP TABLE foxy_chat_attachment_links; ALTER TABLE chat_attachments DROP COLUMN cleanup_claimed_at; ALTER TABLE chat_attachments DROP CONSTRAINT chat_attachments_id_owner_key');
    for (const attachment of [id, removed, orphan]) await pool.query(`INSERT INTO chat_attachments
      (id,owner_id,conversation_id,name,extension,size_bytes,digest,save_to_folder,ready_at,removed_at)
      VALUES($1,$2,$3,'legado.pdf','pdf',$4,$5,false,now(),$6)`,
      [attachment, f.owner, attachment === orphan ? randomUUID() : f.chat, f.bytes.length,
        createHash('sha256').update(f.bytes).digest('hex'), attachment === removed ? new Date() : null]);
    f.objects.set(attachmentKey(id), f.bytes);
    await pool.query(await readFile('prisma/migrations/202611160001_foxy_attachment_links/migration.sql', 'utf8'));
    assert.deepEqual((await f.list(f.chat)).map(item => item.id), [id]);
    assert.deepEqual((await f.service.read({ owner: f.owner }, { conversationId: f.chat }, id)).bytes, f.bytes);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM chat_attachments')).rows[0].n, 3);
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM foxy_chat_attachment_links')).rows[0].n, 2);
  });
});
