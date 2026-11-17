import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';

test('Library atomically persists file description and authorized activity links', { timeout: 120000 }, () =>
  withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local), fileId = randomUUID(), digest = 'a'.repeat(64);
    const foreign = await fixture(local), post = (actor, operation) =>
      f.revision().then(revision => f.classrooms.changeLibrary(actor, f.room, { revision, operation }));
    const create = owner => owner.revision().then(revision => owner.classrooms.changeActivities(owner.T, owner.room, {
      revision, operation: { action: 'create', type: 'ASSIGNMENT' },
    })).then(answer => answer.id);
    const activityId = await create(f), foreignId = await create(foreign), otherActivity = await create(f);
    await local.pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,
      validation_status,scan_status,validated_at,scanned_at,detected_mime_type)
      VALUES($1,now(),$2,$3,$4,'guia.pdf','pdf',10,'APPROVED','CLEAN',now(),now(),'application/pdf')`,
      [fileId, f.room, f.teacher, `p4/${fileId}/blob`]);
    await local.pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at)
      VALUES($1,now(),$2,'COMPLETED',10,now())`, [randomUUID(), fileId]);
    await local.pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
      VALUES($1,'material','ready',$2,$2,$2)`, [fileId, digest]);
    const publish = { action: 'publish', title: 'Guía', fileId, unitId: null, topicId: null, description: 'Para repasar',
      activityIds: [activityId] };
    const before = await f.revision();
    await assert.rejects(post(f.S, publish), { code: 'FORBIDDEN' });
    await assert.rejects(post(f.T, { ...publish, activityIds: [activityId, foreignId] }), { code: 'FORBIDDEN' });
    assert.equal(await f.revision(), before);
    assert.deepEqual(await f.classrooms.listMaterials(f.T, f.room), []);
    await post(f.T, publish);

    const [teacher] = await f.classrooms.listMaterials(f.T, f.room);
    const [student] = await f.classrooms.listMaterials(f.S, f.room);
    assert.equal(teacher.description, publish.description);
    assert.deepEqual(teacher.activityIds, [activityId]);
    assert.deepEqual(student.activityIds, []);
    assert.deepEqual((await f.classrooms.activityDetail(f.T, f.room, activityId)).activity.materials.map(x => x.id), [teacher.id]);

    const change = operation => f.revision().then(revision => f.classrooms.changeActivities(f.T, f.room, { revision, operation }));
    await change({ action: 'save', id: activityId, payload: { title: 'Actividad', unitId: f.unitId, topicIds: f.topicIds,
      instructions: 'Revisá el material.', attachmentRequired: false, instructionFileIds: [], materialIds: [teacher.id],
      questions: [], deadline: null, allowLate: false } });
    await change({ action: 'publish', id: activityId });
    assert.deepEqual((await f.classrooms.listMaterials(f.S, f.room))[0].activityIds, [activityId]);
    await f.classrooms.startActivity(f.S, f.room, activityId, {});
    const edit = { action: 'organize', id: teacher.id, title: teacher.title, unitId: null, topicId: null, description: 'Actualizada' };
    await assert.rejects(post(f.T, { ...edit, activityIds: [otherActivity] }), { code: 'CONFLICT' });
    assert.equal((await f.classrooms.listMaterials(f.T, f.room))[0].description, publish.description);
    await post(f.T, { ...edit, activityIds: [activityId, otherActivity] });
    await post(f.T, { ...edit, description: null });
    const [final] = await f.classrooms.listMaterials(f.T, f.room);
    assert.equal(final.description, null);
    assert.deepEqual(new Set(final.activityIds), new Set([activityId, otherActivity]));
  })));

test('FILE body descriptions survive metadata edits and clear atomically on explicit replacement', { timeout: 120000 }, () =>
  withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const { ClassroomService } = await import('./helpers/academic-fixture.ts');
    const f = await fixture(local);
    const service = new ClassroomService(f.classrooms.ports);
    const fileId = randomUUID(), digest = 'a'.repeat(64);
    await local.pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,
      validation_status,scan_status,validated_at,scanned_at,detected_mime_type)
      VALUES($1,now(),$2,$3,$4,'guia.pdf','pdf',10,'APPROVED','CLEAN',now(),now(),'application/pdf')`,
      [fileId, f.room, f.teacher, `p4/${fileId}/blob`]);
    await local.pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at)
      VALUES($1,now(),$2,'COMPLETED',10,now())`, [randomUUID(), fileId]);
    await local.pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
      VALUES($1,'material','ready',$2,$2,$2)`, [fileId, digest]);

    const original = 'Descripcion previa '.repeat(120);
    const post = async operation => service.changeLibrary(f.T, f.room, { revision: await f.revision(), operation });
    const list = () => service.listMaterials(f.T, f.room);
    const base = { title:'Material',unitId:null,topicId:null,contentKind:'FILE' };
    await post({ action:'publish', ...base, fileId, body: original });
    const [legacy] = await list();
    assert.equal(legacy.description, original);
    const raw = async () => (await local.pool.query('SELECT body,description FROM materials WHERE id=$1', [legacy.id])).rows[0];
    const edit = { action:'edit', ...base, id:legacy.id };
    await post({ ...edit, title:'Nuevo titulo' });
    assert.deepEqual(await raw(), {body:original,description:null});
    await assert.rejects(post({ ...edit, description:original }), {code:'INVALID_INPUT'});
    const revision = await f.revision();
    await assert.rejects(post({ ...edit, description:null, activityIds:[randomUUID()] }), {code:'FORBIDDEN'});
    assert.equal(await f.revision(), revision);
    assert.deepEqual(await raw(), {body:original,description:null});

    await post({ ...edit, description:'Actualizada' });
    assert.deepEqual(await raw(), {body:null,description:'Actualizada'});
    assert.equal((await list())[0].description, 'Actualizada');
    await post({ ...edit, body:'Editor anterior' });
    assert.deepEqual(await raw(), {body:'Editor anterior',description:null});
    assert.equal((await list())[0].description, 'Editor anterior');
    await post({ ...edit, description:null });
    assert.deepEqual(await raw(), {body:null,description:null});
    assert.equal((await list())[0].description, null);
    await local.pool.query('UPDATE materials SET body=$2 WHERE id=$1', [legacy.id, original]);
    await post({ ...edit, description:null });
    assert.deepEqual(await raw(), {body:null,description:null});
    assert.equal((await list())[0].description, null);
  })));
