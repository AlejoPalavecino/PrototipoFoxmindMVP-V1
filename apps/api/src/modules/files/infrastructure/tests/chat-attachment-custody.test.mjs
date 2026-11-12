import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';
import pg from 'pg';
import { PDFDocument } from 'pdf-lib';
import { withAgendaDatabase } from '../../../../../../../tests/agenda-database-helpers.test.mjs';
import { createChatAttachmentService } from '../chat-attachment-service.ts';
import { attachmentKey, attachmentSources, readAttachment } from '../chat-attachment-repository.ts';

pg.types.setTypeParser(20, BigInt);

test('attachment ownership, replay, revocation and independent folder copy on PostgreSQL', { timeout: 90000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const teacher = randomUUID(), otherTeacher = randomUUID(), student = randomUUID(), otherStudent = randomUUID();
    for (const [id, role] of [[teacher, 'teacher'], [otherTeacher, 'teacher'], [student, 'student'], [otherStudent, 'student']]) {
      await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Cuenta','Sintética','fixture',now(),$3)`, [id, `${id}@example.test`, role]);
    }
    const teacherChat = randomUUID(), secondChat = randomUUID(), folderId = randomUUID(), studentChat = randomUUID();
    for (const id of [teacherChat, secondChat]) await pool.query(
      "INSERT INTO foxy_conversations(id,owner_id,title,context_kind) VALUES($1,$2,'Prueba','GENERAL')", [id, teacher]);
    const folderState = { version: 1, materials: [], conversations: [{ id: studentChat }] };
    await pool.query("INSERT INTO study_folders(id,owner_id,status,state) VALUES($1,$2,'ACTIVE',$3)", [folderId, student, folderState]);

    const database = { async $transaction(run) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const value = await run({ $queryRawUnsafe: async (sql, ...values) => (await client.query(sql, values)).rows });
        await client.query('COMMIT');
        return value;
      } catch (error) { await client.query('ROLLBACK'); throw error; }
      finally { client.release(); }
    } };
    const objects = new Map();
    const storage = {
      async put(key, bytes) {
        assert.ok(!objects.has(key), 'retries must not replace an approved object');
        objects.set(key, Buffer.from(bytes));
      },
      async get(key) { return Buffer.from(objects.get(key)); },
      async remove(key) { objects.delete(key); },
    };
    const auth = async (_tx, request) => request.owner;
    let scannerReady = true;
    const service = createChatAttachmentService({ database, storage, teacher: auth, student: auth,
      inspect: async () => 'application/pdf', scan: async () => {
        if (!scannerReady) throw Object.assign(new Error('Scanner unavailable'), { code: 'SERVICE_UNAVAILABLE' });
      } });
    const pdf = await PDFDocument.create();
    pdf.addPage().drawText('Documento sintético de prueba');
    const bytes = Buffer.from(await pdf.save());
    const intent = { name: 'guía.pdf', extension: 'pdf', copy: false }, id = randomUUID();
    const teacherTarget = { conversationId: teacherChat }, studentTarget = { conversationId: studentChat, folderId };
    const receipt = await service.upload({ owner: teacher }, teacherTarget, id, intent, bytes);
    scannerReady = false;
    assert.deepEqual(await service.upload({ owner: teacher }, teacherTarget, id, intent, bytes), receipt);
    await assert.rejects(service.list({ owner: otherTeacher }, teacherTarget), { code: 'FORBIDDEN' });
    await assert.rejects(service.remove({ owner: teacher }, { conversationId: secondChat }, id), { code: 'FORBIDDEN' });
    assert.deepEqual(await service.list({ owner: teacher }, { conversationId: secondChat }), []);
    const readSources = (ownerId, target) => database.$transaction(raw => attachmentSources({ query: raw.$queryRawUnsafe }, { ...target, ownerId }));
    const [source] = await readSources(teacher, teacherTarget);
    assert.deepEqual(Buffer.from((await readAttachment(storage, source, AbortSignal.timeout(5000))).document.bytes), bytes);
    await service.remove({ owner: teacher }, teacherTarget, id);
    assert.deepEqual(await readSources(teacher, teacherTarget), []);
    await assert.rejects(service.upload({ owner: teacher }, teacherTarget, id, intent, bytes), { code: 'CONFLICT' });
    await service.cleanup();
    assert.equal(objects.has(attachmentKey(id)), false);

    scannerReady = true;
    await assert.rejects(service.list({ owner: otherStudent }, studentTarget), { code: 'FORBIDDEN' });
    const copy = randomUUID();
    await service.upload({ owner: student }, studentTarget, copy, { ...intent, copy: true }, bytes);
    await service.remove({ owner: student }, studentTarget, copy);
    await service.cleanup();
    const state = (await pool.query('SELECT state FROM study_folders WHERE id=$1', [folderId])).rows[0].state;
    assert.deepEqual(state.materials, [{ id: copy, fileId: copy, title: intent.name, topicIds: [] }]);
    assert.equal(objects.has(attachmentKey(copy)), true);
    assert.deepEqual(await service.list({ owner: student }, studentTarget), []);
    await pool.query("UPDATE study_folders SET status='ARCHIVED' WHERE id=$1", [folderId]);
    await assert.rejects(service.upload({ owner: student }, studentTarget, randomUUID(), intent, bytes), { code: 'FORBIDDEN' });
  });
});
