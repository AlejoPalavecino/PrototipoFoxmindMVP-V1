import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withP5Database } from '../scripts/p5-database.mjs';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { businessSource } from '../.build/api/apps/api/src/classrooms/ai/worker-source.js';
const rejects = (promise, code) => assert.rejects(promise, e => e.code === code);

test('pending deletion persists, enforces ownership/revision and serializes publication', { timeout: 120000 }, async () => {
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), other = randomUUID(), student = randomUUID(), unverified = randomUUID();
    for (const id of [teacher, other, student, unverified]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Synthetic','Test','fixture-only',CASE WHEN $3 THEN now() ELSE NULL END,$4)`,
      [id, `${id}@example.test`, id !== unverified, id === student ? 'student' : 'teacher']);
    const authenticate = async (_tx, request) => request.actor;
    const files = new FileStore(database, { authenticate, authorize: async () => {} }, 1000000n);
    const options = { database, authenticate, files, classroomQuotaBytes: 1000000n, signingKey: Buffer.alloc(32, 9), deliveryKey: Buffer.alloc(32, 8), webOrigin: 'http://127.0.0.1:3005' };
    let service = new ClassroomService(options);
    const request = { actor: teacher };
    const draft = await service.createDraft(request);
    const input = { revision: draft.revision, confirm: true };
    for (const actor of [other, student, unverified]) await rejects(service.deleteDraft({ actor }, draft.id, input), 'FORBIDDEN');
    await rejects(service.deleteDraft(request, draft.id, { ...input, confirm: false }), 'INVALID_INPUT');
    await rejects(service.deleteDraft(request, draft.id, { ...input, revision: '99' }), 'CONFLICT');
    await service.deleteDraft(request, draft.id, input);
    service = new ClassroomService(options);
    assert.deepEqual(await service.listDrafts(request), []);
    await rejects(service.getDraft(request, draft.id), 'FORBIDDEN');
    await rejects(service.saveDraft(request, draft.id, { revision: '0', payload: {} }), 'FORBIDDEN');
    await rejects(service.publishDraft(request, draft.id, { revision: '0' }), 'FORBIDDEN');
    await rejects(service.deleteDraft(request, draft.id, input), 'FORBIDDEN');
    const tx = { query: async (sql, ...args) => (await pool.query(sql, args)).rows };
    await rejects(files.lockScope(tx, { kind: 'draft', id: draft.id }), 'FORBIDDEN');
    assert.equal((await files.lockScope(tx, { kind: 'draft', id: draft.id }, true)).owner, teacher);
    assert.equal(await businessSource(tx, { owner_id: teacher, draft_id: draft.id, file_id: randomUUID() }), false);
    assert.ok((await pool.query('SELECT deleted_at FROM classroom_drafts WHERE id=$1', [draft.id])).rows[0].deleted_at);
    const create = async () => {
      const d = await service.createDraft(request);
      return service.saveDraft(request, d.id, { revision: d.revision, payload: { name: 'Aula sintética', subject: 'Ciencias', division: 'A', academicYear: 2026, timezone: 'America/Argentina/Buenos_Aires', coverKey: 'biology', units: [{ name: 'Unidad', topics: [{ name: 'Tema' }] }] } });
    };
    const published = await create();
    const classroom = await service.publishDraft(request, published.id, { revision: published.revision });
    await rejects(service.deleteDraft(request, published.id, { revision: String(Number(published.revision) + 1), confirm: true }), 'CONFLICT');
    assert.ok((await service.mine(request)).teach.some(room => room.id === classroom.id));
    const racing = await create();
    const results = await Promise.allSettled([
      service.deleteDraft(request, racing.id, { revision: racing.revision, confirm: true }),
      service.publishDraft(request, racing.id, { revision: racing.revision }),
    ]);
    assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
    const row = (await pool.query('SELECT deleted_at,published_classroom_id FROM classroom_drafts WHERE id=$1', [racing.id])).rows[0];
    assert.notEqual(Boolean(row.deleted_at), Boolean(row.published_classroom_id));
    assert.equal((await pool.query('SELECT count(*)::int AS n FROM classrooms WHERE teacher_id=$1', [teacher])).rows[0].n, row.deleted_at ? 1 : 2);
  });
});
