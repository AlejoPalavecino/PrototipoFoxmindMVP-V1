import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID,createHash } from 'node:crypto';
import {loadTsModule} from './helpers/load-ts-module.mjs';
const {createTextDocument}=loadTsModule('apps/shared-ui/text-document.ts');
import { createServer } from 'node:http';
import { withP5Database } from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/modules/files/infrastructure/store.js';
import { createFileAccess } from '../.build/api/apps/api/src/modules/files/infrastructure/access.js';
import { ClassroomService } from '../.build/api/apps/api/src/bootstrap/academic-composition.js';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';

test('P6 Library scoped publication, metadata, private files and durable explicit deletion', { timeout: 120000 }, async t => {
  await withP5Database(async ({ pool, database }) => {
    const teacher = randomUUID(), student = randomUUID(), other = randomUUID(), room = randomUUID(), foreignRoom = randomUUID();
    for (const id of [teacher, student, other]) await pool.query(`INSERT INTO users
      (id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
      VALUES($1,now(),$2,$2,'Library','Fixture','fixture',now(),$3)`, [id, `${id}@example.test`, id === student ? 'student' : 'teacher']);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Library','Subject','A',2026,'UTC','explore',100000000)`, [room, teacher]);
    await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
      VALUES($1,now(),$2,'Foreign Library','Subject','A',2026,'UTC','explore',100000000)`, [foreignRoom, other]);
    const enrollment = randomUUID();
    await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)', [enrollment, room, student]);
    await pool.query(`INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')`, [randomUUID(), enrollment, room]);
    const unit = randomUUID(), topic = randomUUID(), secondUnit = randomUUID();
    for (const id of [unit, secondUnit]) await pool.query(`INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1,now(),$2,'Unit',0)`, [id, room]);
    await pool.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,'Topic',0)`, [topic, room, unit]);
    const authenticate = async (_tx, req) => req.actor;
    const access = createFileAccess({ authenticate, authorizeAttemptWrite: async () => { throw new Error('Unsupported'); } });
    const files = new FileStore(database, access, 100000000n);
    const service = new ClassroomService({ database, files, authenticate, signingKey: Buffer.alloc(32, 1),
      deliveryKey: Buffer.alloc(32, 2), classroomQuotaBytes: 100000000n, webOrigin: 'http://127.0.0.1:3005' });
    const T = { actor: teacher }, S = { actor: student }, O = { actor: other };
    const snapshot = async () => JSON.stringify((await pool.query(`SELECT
      (SELECT jsonb_agg(to_jsonb(m) ORDER BY id) FROM materials m) AS materials,
      (SELECT jsonb_agg(to_jsonb(f) ORDER BY id) FROM files f) AS files,
      (SELECT revision FROM classrooms WHERE id=$1) AS revision`, [room])).rows);
    const current = async () => (await service.detail(T, room)).revision;
    const change = async operation => service.changeLibrary(T, room, { revision: await current(), operation });
    const deny = async (actor, operation, code, rev) => {
      const before = await snapshot();
      await assert.rejects(service.changeLibrary(actor, room, { revision: rev ?? await current(), operation }), e => e.code === code);
      assert.equal(await snapshot(), before);
    };
    const makeFile = async (purpose = 'material', ready = true, scope = room, textDocument) => {
      const id = randomUUID(), digest = textDocument ? createHash('sha256').update(createTextDocument(...textDocument)).digest('hex') : 'a'.repeat(64);
      await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,validation_status,scan_status,validated_at,scanned_at,detected_mime_type)
        VALUES($1,now(),$2,$3,$4,'Guide.pdf',$6,100,'APPROVED',$5,now(),now(),'application/pdf')`, [id, scope, teacher, `p4/${id}/blob`, ready ? 'CLEAN' : 'ERROR',textDocument?'docx':'pdf']);
      await pool.query(`INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',100,now())`, [randomUUID(), id]);
      await pool.query(`INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest)
        VALUES($1,$2,$3,$4,$4,$4)`, [id, purpose, ready ? 'ready' : 'rejected', digest]);
      return id;
    };
    let material, firstFile, linked;
    await t.test('teacher publishes approved P4 material and students read extra material without activity links', async () => {
      assert.deepEqual(await service.listMaterials(T, room), []);
      firstFile = await makeFile();
      await change({ action: 'publish', title: 'Extra reading', fileId: firstFile, unitId: null, topicId: null });
      const list = await service.listMaterials(S, room); assert.equal(list.length, 1);
      material = list[0].id; assert.equal(list[0].title, 'Extra reading'); assert.equal(list[0].fileId, firstFile);
      assert.equal(list[0].previewable, true); assert.equal(list[0].unitId, null);
      assert.equal((await files.transaction(tx => files.loadAuthorized(tx, S, firstFile, 'read'))).id, firstFile);
      await assert.rejects(files.transaction(tx => files.loadAuthorized(tx, T, firstFile, 'upload')), { code: 'FORBIDDEN' });
      assert.equal((await service.detail(T, room)).units.length, 2);
    });
    await t.test('metadata and extra/unit/unit-topic associations preserve file and material identities, even with activity link', async () => {
      await change({ action: 'edit', id: material, title: 'Unit guide', unitId: unit, topicId: null });
      await change({ action: 'edit', id: material, title: 'Topic guide', unitId: unit, topicId: topic });
      const activity = randomUUID();
      await pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,title) VALUES($1,now(),$2,'ASSIGNMENT','Existing activity')`, [activity, room]);
      await pool.query('INSERT INTO activity_materials(activity_id,classroom_id,material_id) VALUES($1,$2,$3)', [activity, room, material]);
      linked = activity;
      await change({ action: 'edit', id: material, title: 'Reorganized guide', unitId: null, topicId: null });
      const [row] = await service.listMaterials(T, room);
      assert.equal(row.id, material); assert.equal(row.fileId, firstFile); assert.equal(row.linked, true);
      assert.equal((await pool.query('SELECT file_id FROM materials WHERE id=$1', [material])).rows[0].file_id, firstFile);
      await deny(T, { action: 'delete', id: material, confirm: true }, 'CONFLICT');
      await deny(T, { action: 'edit', id: material, title: 'Replace', unitId: null, topicId: null, fileId: randomUUID() }, 'INVALID_INPUT');
    });
    await t.test('invalid associations, unsafe/wrong files, stale and unauthorized mutations leave persisted data unchanged', async () => {
      await deny(T,{action:'edit',id:material,title:'Converted',unitId:null,topicId:null,body:'Unrelated text',contentKind:'TEXT'},'CONFLICT');
      await deny(T, { action: 'edit', id: material, title: 'Mismatch', unitId: secondUnit, topicId: topic }, 'FORBIDDEN');
      await deny(T, { action: 'edit', id: material, title: 'No unit', unitId: null, topicId: topic }, 'INVALID_INPUT');
      await deny(T, { action: 'edit', id: material, title: 'Foreign', unitId: randomUUID(), topicId: null }, 'FORBIDDEN');
      await deny(T, { action: 'edit', id: material, title: 'x'.repeat(201), unitId: null, topicId: null }, 'INVALID_INPUT');
      await deny(T, { action: 'publish', title: 'Duplicate', fileId: firstFile, unitId: null, topicId: null }, 'CONFLICT');
      await deny(T, { action: 'publish', title: 'Pending', fileId: await makeFile('material', false), unitId: null, topicId: null }, 'CONFLICT');
      await deny(T, { action: 'publish', title: 'Wrong purpose', fileId: await makeFile('plan'), unitId: null, topicId: null }, 'FORBIDDEN');
      await deny(T, { action: 'publish', title: 'Foreign scope', fileId: await makeFile('material', true, foreignRoom), unitId: null, topicId: null }, 'FORBIDDEN');
      for (const actor of [S, O]) await deny(actor, { action: 'delete', id: material, confirm: true }, 'FORBIDDEN');
      await assert.rejects(service.listMaterials(O, room), { code: 'FORBIDDEN' });
      await deny(T, { action: 'edit', id: material, title: 'Stale', unitId: null, topicId: null }, 'CONFLICT', '0');
      await service.setArchive(T, room, { revision: await current(), archived: true });
      await deny(T, { action: 'delete', id: material, confirm: true }, 'CONFLICT');
      assert.equal((await service.listMaterials(S, room)).length, 1);
      await service.setArchive(T, room, { revision: await current(), archived: false });
    });
    await t.test('concurrent publishers share classroom revision and never duplicate the same file', async () => {
      const id = await makeFile(), revision = await current();
      const results = await Promise.allSettled([1, 2].map(() => service.changeLibrary(T, room, { revision,
        operation: { action: 'publish', title: 'Concurrent', fileId: id, unitId: unit, topicId: topic } })));
      assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
      assert.equal((await pool.query('SELECT count(*)::int AS n FROM materials WHERE file_id=$1', [id])).rows[0].n, 1);
    });
    await t.test('explicit deletion revokes reads immediately, retries durably and releases quota only after confirmed blob removal', async () => {
      const { LibraryCleanupWorker } = await import("../.build/api/apps/api/src/modules/materials/infrastructure/library-cleanup.js");
      await deny(T, { action: 'delete', id: material, confirm: false }, 'INVALID_INPUT');
      await pool.query('DELETE FROM activity_materials WHERE activity_id=$1', [linked]);
      const usage = async () => BigInt(await files.transaction(tx => files.usage(tx, { kind: 'classroom', id: room })));
      const nextFile = await makeFile();
      await change({ action: 'publish', title: 'Second cleanup candidate', fileId: nextFile, unitId: null, topicId: null });
      const next = (await service.listMaterials(T, room)).find(row => row.fileId === nextFile);
      const before = await usage();
      await change({ action: 'delete', id: material, confirm: true });
      await change({ action: 'delete', id: next.id, confirm: true });
      assert.ok(!(await service.listMaterials(S, room)).some(row => row.id === material));
      for (const actor of [T, S]) await assert.rejects(files.transaction(tx => files.loadAuthorized(tx, actor, firstFile, 'read')), { code: 'FORBIDDEN' });
      assert.equal(await usage(), before);
      const attempts = [];
      const failing = new LibraryCleanupWorker(database, { async remove(key) {
        attempts.push(key);
        if (key === `p4/${firstFile}/blob`) throw new Error('private storage outage');
      } });
      await failing.sweep();
      assert.equal(await usage(), before);
      assert.equal((await pool.query('SELECT deletion_error_code FROM materials WHERE id=$1', [material])).rows[0].deletion_error_code, 'STORAGE_UNAVAILABLE');
      await failing.sweep();
      assert.deepEqual(attempts, [`p4/${firstFile}/blob`, `p4/${nextFile}/blob`]);
      assert.ok((await pool.query('SELECT blob_deleted_at FROM files WHERE id=$1', [nextFile])).rows[0].blob_deleted_at);
      assert.equal(await usage(), before - 100n);
      const retryDelay = async () => (await pool.query(`SELECT ROUND(EXTRACT(EPOCH FROM deletion_retry_at-updated_at))::int AS seconds
        FROM materials WHERE id=$1`, [material])).rows[0].seconds;
      const makeRetryDue = () => pool.query("UPDATE materials SET deletion_retry_at=clock_timestamp() - interval '1 second' WHERE id=$1", [material]);
      assert.equal(await retryDelay(), 10);
      await makeRetryDue();
      await failing.sweep();
      assert.equal(attempts.at(-1), `p4/${firstFile}/blob`);
      assert.equal(attempts.length, 3);
      assert.equal(await retryDelay(), 20);
      await failing.onModuleDestroy();
      await makeRetryDue();
      let removed = 0; const restarted = new LibraryCleanupWorker(database, { async remove(key) { removed++; assert.equal(key, `p4/${firstFile}/blob`); } });
      await restarted.sweep(); await restarted.sweep(); await restarted.onModuleDestroy();
      assert.equal(removed, 1); assert.equal(await usage(), before - 200n);
      assert.ok((await pool.query('SELECT blob_deleted_at FROM files WHERE id=$1', [firstFile])).rows[0].blob_deleted_at);
      await deny(T, { action: 'publish', title: 'Resurrect', fileId: firstFile, unitId: null, topicId: null }, 'CONFLICT');
      await assert.rejects(pool.query('UPDATE materials SET deleted_at=NULL WHERE id=$1', [material]));
      await assert.rejects(pool.query('UPDATE materials SET file_id=$2 WHERE id=$1', [material, await makeFile()]));
    });
    await t.test('shared file references forbid deletion; concurrent workers lease one object and shutdown drains it', async () => {
      const { LibraryCleanupWorker } = await import("../.build/api/apps/api/src/modules/materials/infrastructure/library-cleanup.js");
      const second = (await service.listMaterials(S, room))[0], shared = randomUUID();
      await pool.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id)
        VALUES($1,now(),$2,'Historical shared reference',$3,$4)`, [shared, room, second.fileId, teacher]);
      await deny(T, { action: 'delete', id: second.id, confirm: true }, 'CONFLICT');
      await pool.query('DELETE FROM materials WHERE id=$1', [shared]);
      await change({ action: 'delete', id: second.id, confirm: true });
      let release, entered; const sending = new Promise(resolve => { entered = resolve; }); let removes = 0;
      const worker = new LibraryCleanupWorker(database, { async remove() { removes++; entered(); await new Promise(resolve => { release = resolve; }); } });
      const first = worker.sweep(); await sending;
      const peer = new LibraryCleanupWorker(database, { async remove() { removes++; } });
      await peer.sweep(); assert.equal(removes, 1);
      let drained = false; const closing = worker.onModuleDestroy().then(() => { drained = true; });
      await new Promise(resolve => setImmediate(resolve)); assert.equal(drained, false);
      release(); await Promise.all([first, closing]); await peer.onModuleDestroy();
      assert.equal(drained, true); assert.equal(removes, 1);
      await worker.sweep(); worker.onModuleInit(); assert.equal(removes, 1);
      // Create another currently usable material so former-member checks exercise a real file.
      await change({ action: 'publish', title: 'Final material', fileId: await makeFile(), unitId: null, topicId: null });
    });
    await t.test('written revisions preserve immutable files, links, permissions and retry identity',async()=>{
      const scanned=async(title,body)=>makeFile('material',true,room,[title,body]);
      const title='Texto de clase',body='Una célula\nTexto propio 🦊',id=await scanned(title,body);
      await change({action:'publish',title,fileId:id,unitId:unit,topicId:topic,body,resourceUse:'COMPLEMENTARY',contentKind:'TEXT'});
      const entry=(await service.listMaterials(S,room)).find(item=>item.fileId===id);assert.equal(entry.body,body);
      await change({action:'edit',id:entry.id,title,unitId:unit,topicId:topic,resourceUse:'RECOMMENDED'});
      await deny(T,{action:'edit',id:entry.id,title,unitId:unit,topicId:topic,body:'Otro contenido',contentKind:'TEXT'},'CONFLICT');
      const newBody='Nueva explicación\nCon acentos y 🦊',newTitle='Texto revisado',nextFile=await scanned(newTitle,newBody);
      const operation={action:'revise',id:entry.id,title:newTitle,fileId:nextFile,unitId:unit,topicId:topic,body:newBody,resourceUse:'STUDY',contentKind:'TEXT'};
      await deny(S,operation,'FORBIDDEN');await deny(O,operation,'FORBIDDEN');
      await deny(T,{...operation,body:'Texto que no corresponde al archivo'},'CONFLICT');
      const activity=randomUUID();await pool.query("INSERT INTO activities(id,updated_at,classroom_id,type,title) VALUES($1,now(),$2,'ASSIGNMENT','Historical text reference')",[activity,room]);await pool.query('INSERT INTO activity_materials(activity_id,classroom_id,material_id) VALUES($1,$2,$3)',[activity,room,entry.id]);
      const rev=await current(),before=(await service.listMaterials(S,room)).length;
      const result=await service.changeLibrary(T,room,{revision:rev,operation});
      assert.ok(result.materialId);assert.notEqual(result.materialId,entry.id);
      const list=await service.listMaterials(S,room);assert.equal(list.length,before+1);
      assert.equal(list.find(m=>m.id===entry.id).supersededBy,result.materialId);
      assert.equal(list.find(m=>m.id===result.materialId).body,newBody);
      const {loadSources}=await import("../.build/api/apps/api/src/modules/foxy/infrastructure/context-sources.js");
      const sources=await loadSources({query:async(sql,...args)=>(await pool.query(sql,args)).rows},room,{kind:'MATERIAL',limit:100});
      assert.equal(sources.items.some(m=>m.sourceId===`material:${entry.id}`),false);
      assert.ok(sources.items.some(m=>m.sourceId===`material:${result.materialId}`));
      assert.equal((await pool.query('SELECT m.file_id FROM activity_materials a JOIN materials m ON m.id=a.material_id WHERE a.activity_id=$1',[activity])).rows[0].file_id,id);
      assert.equal((await files.transaction(tx=>files.loadAuthorized(tx,S,id,'read'))).id,id);
      const retry=await service.changeLibrary(T,room,{revision:rev,operation});assert.deepEqual(retry,result);
      await change({action:'edit',id:result.materialId,title:newTitle,unitId:null,topicId:null,resourceUse:'COMPLEMENTARY'});
      assert.deepEqual(await service.changeLibrary(T,room,{revision:rev,operation}),result,'Receipt survives later metadata changes');
      await deny(T,{...operation,fileId:await scanned('Concurrent','Other text'),title:'Concurrent',body:'Other text'},'CONFLICT');
      await deny(T,{action:'delete',id:entry.id,confirm:true},'CONFLICT');
      assert.equal((await service.listMaterials(S,room)).length,before+1);
    });
    await t.test('former and unverified members cannot access Library or the underlying file', async () => {
      const remaining = (await service.listMaterials(S, room))[0];
      await service.leave(S, room);
      await assert.rejects(service.listMaterials(S, room), { code: 'FORBIDDEN' });
      await assert.rejects(files.transaction(tx => files.loadAuthorized(tx, S, remaining.fileId, 'read')), { code: 'FORBIDDEN' });
      await pool.query('UPDATE users SET email_verified_at=NULL WHERE id=$1', [teacher]);
      await assert.rejects(service.listMaterials(T, room), { code: 'FORBIDDEN' });
    });
  });
});

test('Library HTTP rejects forged fields and invokes the public list/change methods', async t => {
  const room = randomUUID(), calls = [];
  const handler = createClassroomsHandler({ listMaterials: async () => [], changeLibrary: async (_req, id, body) => {
    calls.push({ id, body }); return { revision: '2' };
  } }, { admit: async () => {} });
  const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 404; res.end(); }));
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const url = `http://127.0.0.1:${server.address().port}/classrooms/${room}/library`;
  assert.equal((await fetch(url)).status, 200);
  const response = await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revision: '1', operation: { action: 'publish' } }) });
  assert.equal(response.status, 200); assert.deepEqual(await response.json(), { revision: '2' }); assert.equal(calls.length, 1);
  assert.equal((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"revision":"1","operation":{},"owner":"forged"}' })).status, 400);
  assert.equal(calls.length, 1);
});
