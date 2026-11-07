import test from 'node:test';
import assert from 'node:assert/strict';
import { withAiDatabase, rollbackCase, aiFixture } from './classroom-ai-database.test.mjs';
import { FileStore } from '../.build/api/apps/api/src/files/store.js';
import { ClassroomService } from '../.build/api/apps/api/src/classrooms/service.js';

test('aula con plan manual persiste sin archivo, plan vacío y archivo pendiente se rechazan atómicamente', { timeout: 120000 }, async t => {
  await withAiDatabase(async ({ pool }) => {
    const run = (name, operation) => t.test(name, () => rollbackCase(pool, async local => {
      const f = await aiFixture(local.pool);
      const authenticate = async (_tx, request) => request.actor;
      const files = new FileStore(local.database, { authenticate, authorize: async () => {} }, 100000000n);
      const service = new ClassroomService({ database: local.database, files, authenticate, classroomQuotaBytes: 100000000n,
        signingKey: Buffer.alloc(32, 3), deliveryKey: Buffer.alloc(32, 4), webOrigin: 'http://127.0.0.1:3005' });
      await operation({ ...local, ...f, service });
    }));
    await run('plan manual sin archivo crea unidades y temas sin versión de archivo', async f => {
      const payload = { ...f.payload }; delete payload.planFileId;
      const saved = await f.service.saveDraft(f.request, f.draftId, { revision: '1', payload });
      const result = await f.service.publishDraft(f.request, f.draftId, { revision: saved.revision });
      const detail = await f.service.detail(f.request, result.id);
      assert.equal(detail.units.length, 1); assert.equal(detail.units[0].topics[0].name, 'Docente');
      assert.equal(detail.plans.length, 0);
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM study_plan_versions WHERE classroom_id=$1', [result.id])).rows[0].n, 0);
      assert.equal((await f.pool.query('SELECT classroom_draft_id,classroom_id FROM files WHERE id=$1', [f.fileId])).rows[0].classroom_draft_id, f.draftId);
      const retry = await f.service.publishDraft(f.request, f.draftId, { revision: saved.revision });
      assert.equal(retry.id, result.id);
    });
    await run('plan vacío sigue sin publicar ni dejar aula parcial', async f => {
      const payload = { ...f.payload, units: [] }; delete payload.planFileId;
      const saved = await f.service.saveDraft(f.request, f.draftId, { revision: '1', payload });
      await assert.rejects(f.service.publishDraft(f.request, f.draftId, { revision: saved.revision }), { code: 'INVALID_INPUT' });
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM classrooms')).rows[0].n, 0);
      assert.equal((await f.service.getDraft(f.request, f.draftId)).publishedClassroomId, null);
    });
    await run('archivo pendiente no elude escaneo aunque el plan escrito esté completo', async f => {
      await f.pool.query("UPDATE files SET scan_status='PENDING',scanned_at=NULL WHERE id=$1", [f.fileId]);
      await assert.rejects(f.service.publishDraft(f.request, f.draftId, { revision: '1' }));
      assert.equal((await f.pool.query('SELECT count(*)::int n FROM classrooms')).rows[0].n, 0);
      assert.equal((await f.service.getDraft(f.request, f.draftId)).publishedClassroomId, null);
    });
    await run('archivo aprobado conserva promoción y versión del plan', async f => {
      const result = await f.service.publishDraft(f.request, f.draftId, { revision: '1' });
      assert.equal((await f.service.detail(f.request, result.id)).plans.length, 1);
      const file = (await f.pool.query('SELECT classroom_draft_id,classroom_id FROM files WHERE id=$1', [f.fileId])).rows[0];
      assert.equal(file.classroom_id, result.id); assert.equal(file.classroom_draft_id, null);
    });
    await run('revisión editada conserva nombres Unicode y orden exacto en colección y Plan al reabrir', async f => {
      const units = [
        { name: 'Medidas: revisión final', topics: [{ name: 'Unidad de longitud' }, { name: 'Razón · proporción' }] },
        { name: 'Ambiente y célula', topics: [{ name: 'Cuidado del agua' }] },
      ];
      const payload = { ...f.payload, name: 'Aula revisada', coverKey: 'creative', units };
      const saved = await f.service.saveDraft(f.request, f.draftId, { revision: '1', payload });
      const result = await f.service.publishDraft(f.request, f.draftId, { revision: saved.revision });
      for (let reload = 0; reload < 2; reload++) {
        const room = await f.service.detail(f.request, result.id);
        assert.equal(room.name, payload.name); assert.equal(room.coverKey, payload.coverKey);
        assert.deepEqual(room.units.map(unit => ({ name: unit.name, topics: unit.topics.map(topic => ({ name: topic.name })) })), units);
      }
    });
  });
});
