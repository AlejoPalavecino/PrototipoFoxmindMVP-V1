import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createTextDocument } from '../src/core/domain/documents/text-document.ts';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';

async function approvedText(local, owner, title, body) {
  const id = randomUUID();
  const bytes = createTextDocument(title, body);
  const digest = createHash('sha256').update(bytes).digest('hex');
  await local.pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,
    validation_status,scan_status,validated_at,scanned_at,detected_mime_type)
    VALUES($1,now(),$2,$3,$4,'material.docx','docx',$5,'APPROVED','CLEAN',now(),now(),
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document')`,
    [id, owner.room, owner.teacher, `p4/${id}/blob`, bytes.byteLength]);
  await local.pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at)
    VALUES($1,now(),$2,'COMPLETED',$3,now())`, [randomUUID(), id, bytes.byteLength]);
  await local.pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
    VALUES($1,'material','ready',$2,$2,$2)`, [id, digest]);
  return id;
}

test('written revisions with metadata preserve started references and roll back invalid links', { timeout: 120000 }, () =>
  withAiDatabase(({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), foreign = await fixture(local);
    const change = async (owner, operation) => owner.classrooms.changeActivities(owner.T, owner.room, {
      revision: await owner.revision(), operation,
    });
    const create = async owner => (await change(owner, { action: 'create', type: 'ASSIGNMENT' })).id;
    const started = await create(f), editable = await create(f), withdrawn = await create(f), foreignId = await create(foreign);
    const titles = ['Lectura original', 'Lectura revisada'];
    const bodies = ['Exposición y luz.', 'Exposición, luz y movimiento.'];
    const originalFile = await approvedText(local, f, titles[0], bodies[0]);
    const newFile = await approvedText(local, f, titles[1], bodies[1]);
    const metadata = { unitId: null, topicId: null, contentKind: 'TEXT', resourceUse: 'STUDY' };
    await f.classrooms.changeLibrary(f.T, f.room, { revision: await f.revision(), operation: {
      action: 'publish', fileId: originalFile, title: titles[0], body: bodies[0],
      description: 'Original', activityIds: [started, editable, withdrawn], ...metadata,
    } });
    const list = () => f.classrooms.listMaterials(f.T, f.room);
    const [original] = await list();
    const publishActivity = async (id, title) => {
      await change(f, { action: 'save', id, payload: { title,
        unitId: f.unitId, topicIds: f.topicIds, instructions: 'Leé el material.',
        attachmentRequired: false, instructionFileIds: [], materialIds: [original.id], questions: [],
        deadline: null, allowLate: false } });
      await change(f, { action: 'publish', id });
    };
    await publishActivity(started, 'Actividad con intento');
    await publishActivity(withdrawn, 'Actividad retirada');
    await change(f, { action: 'withdraw', id: withdrawn });
    await f.classrooms.startActivity(f.S, f.room, started, {});

    const revision = await f.revision();
    const operation = { action: 'revise', id: original.id, fileId: newFile, title: titles[1], body: bodies[1],
      description: 'Actualizada', activityIds: [started, editable, withdrawn], ...metadata };
    const revise = (actor, changes = {}) => f.classrooms.changeLibrary(actor, f.room, {
      revision, operation: { ...operation, ...changes },
    });
    const snapshot = await list();
    await assert.rejects(revise(f.S), { code: 'FORBIDDEN' });
    await assert.rejects(revise(f.T, { activityIds: [started, foreignId] }), { code: 'FORBIDDEN' });
    await assert.rejects(revise(f.T, { activityIds: [editable] }), { code: 'CONFLICT' });
    assert.equal(await f.revision(), revision);
    assert.deepEqual(await list(), snapshot);

    const result = await revise(f.T);
    assert.deepEqual(await revise(f.T), result);
    const materials = await list();
    const previous = materials.find(item => item.id === original.id);
    const current = materials.find(item => item.id === result.materialId);
    assert.deepEqual({ file: previous.fileId, body: previous.body, description: previous.description,
      supersededBy: previous.supersededBy, links: previous.activityIds }, {
      file: originalFile, body: bodies[0], description: 'Original', supersededBy: current.id, links: [started, withdrawn],
    });
    assert.deepEqual({ file: current.fileId, body: current.body, description: current.description, links: current.activityIds },
      { file: newFile, body: bodies[1], description: 'Actualizada', links: [editable] });
    const attemptMaterial = (await f.classrooms.activityDetail(f.S, f.room, started)).activity.materials[0];
    assert.equal(attemptMaterial.fileId, originalFile);
  })));

