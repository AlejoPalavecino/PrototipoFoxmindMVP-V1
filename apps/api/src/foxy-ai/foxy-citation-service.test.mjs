import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const isCode = (...codes) => e => codes.includes(e?.code);
async function fixture(pool, kind = 'MATERIAL') {
  const api = await import('./index.ts'); assert.equal(typeof api.createFoxyCitationService, 'function');
  const query = async (sql, ...args) => (await pool.query(sql,args)).rows, f = await homeFixture(query), room = f.rooms.teach;
  let source, fileId;
  if (kind === 'MATERIAL') {
    source = await f.material('teach'); [{ file_id: fileId }] = await query('SELECT file_id FROM materials WHERE id=$1::uuid', source);
  } else {
    source = randomUUID(); fileId = randomUUID(); const digest = 'a'.repeat(64);
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'plan.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,
      fileId, room.id, room.teacher, `synthetic/${fileId}`);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), fileId);
    await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'plan','ready',$2,$2,$2)", fileId, digest);
    await query('INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id) VALUES($1,now(),$2,1,$3,$4)', source, room.id, fileId, room.teacher);
  }
  const sourceId = `${kind.toLowerCase()}:${source}`;
  const database = transactionDatabase(pool), uow = api.createFoxyUnitOfWork({ database, authenticate: async (_tx, req) => req.id });
  const conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository(), owner = { id: f.teacherActor };
  const c = await uow.run(owner, true, (tx, actor) => conversations.create(tx, actor.id,
    { requestId: randomUUID(), title: 'Chat', context: { kind: 'CLASSROOM', classroomId: room.id } }, 'a'.repeat(64)));
  const service = api.createFoxyTurnService({ uow, conversations, turns, configuration: { enabled: true, model: 'synthetic' } });
  const sent = await service.send(owner, c.conversation.id, { requestId: randomUUID(), revision: '0', purpose: 'SUMMARY', text: 'Resumen', selection: { topicIds: [], sourceIds: [sourceId] } });
  const answer = { schemaVersion: 'foxy-answer-v1', title: 'Resumen', markdown: 'Texto', references: [{ sourceId, page: 1 }], warnings: [], missingInformation: [] };
  const title = kind === 'MATERIAL' ? 'Material sintético' : 'Plan de estudio';
  const [row] = await query('SELECT snapshot FROM foxy_turns WHERE id=$1::uuid', sent.turn.id);
  const actualTitle = row.snapshot.sources[0].title;
  const referenceMap = [{ sourceKey: 's1', sourceId, documentKeys: ['d1'] }];
  const report = [{ sourceKey: 's1', title: actualTitle, kind, documentKeys: ['d1'], citations: [{ sourceId, documentKey: 'd1', page: 1 }] }];
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map=$3::jsonb,source_report=$4::jsonb WHERE id=$1::uuid", sent.turn.id, JSON.stringify(answer), JSON.stringify(referenceMap), JSON.stringify(report));
  let storageReads = 0; const files = { read: async () => { storageReads++; throw Error('unexpected storage read'); } };
  const citations = api.createFoxyCitationService({ uow, files });
  return { api, f, owner, other: { id: f.other }, student: { id: f.pupil }, query, source, sourceId, fileId, c: c.conversation, turnId: sent.turn.id, citations, storageReads: () => storageReads, title };
}
function safe(entry, f) {
  assert.deepEqual(Object.keys(entry).sort(), ['availability','documentTitle','href','id','page','sourceKind','sourceTitle']);
  const json = JSON.stringify(entry); for (const secret of [f.sourceId, f.source, f.fileId]) assert.equal(json.includes(secret), false);
}

test('owner can list an authorized material citation without exposing IDs or reading storage', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool), result = await f.citations.list(f.owner, f.c.id, f.turnId);
    assert.equal(result.length, 1); const citation = result[0]; safe(citation, f);
    assert.equal(citation.id, 'c1'); assert.equal(citation.sourceKind, 'MATERIAL'); assert.equal(citation.page, 1);
    assert.equal(citation.availability, 'AVAILABLE'); assert.equal(typeof citation.documentTitle, 'string');
    assert.equal(typeof citation.href, 'string'); assert.equal(citation.href, `/api/v1/foxy-ai/conversations/${f.c.id}/turns/${f.turnId}/citations/c1/file`); assert.equal(f.storageReads(), 0);
    await assert.rejects(f.citations.list(f.other, f.c.id, f.turnId), isCode('FORBIDDEN', 'NOT_FOUND'));
    await assert.rejects(f.citations.list(f.student, f.c.id, f.turnId), isCode('FORBIDDEN'));
    await f.query('UPDATE classrooms SET archived_at=clock_timestamp() WHERE id=$1::uuid', f.f.rooms.teach.id);
    assert.equal((await f.citations.list(f.owner, f.c.id, f.turnId))[0].availability, 'AVAILABLE');
  });
});

test('removed material or changed file custody makes a historical citation unavailable', { timeout: 120000 }, async () => {
  for (const change of ['removed', 'file']) await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool);
    if (change === 'removed') await f.query('UPDATE materials SET deleted_at=clock_timestamp() WHERE id=$1::uuid', f.source);
    else await f.query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid", f.fileId);
    const [citation] = await f.citations.list(f.owner, f.c.id, f.turnId); safe(citation, f);
    assert.equal(citation.availability, 'UNAVAILABLE'); assert.equal(citation.href, null); assert.equal(f.storageReads(), 0);
  });
});

test('an older authorized plan version remains available after a later version exists', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool, 'PLAN');
    const newFile = randomUUID(), newVersion = randomUUID(), digest = 'b'.repeat(64), room = f.f.rooms.teach;
    await f.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'new-plan.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,
      newFile, room.id, room.teacher, `synthetic/${newFile}`);
    await f.query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())", randomUUID(), newFile);
    await f.query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'plan','ready',$2,$2,$2)", newFile, digest);
    await f.query('INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id) VALUES($1,now(),$2,2,$3,$4)', newVersion, room.id, newFile, room.teacher);
    const [citation] = await f.citations.list(f.owner, f.c.id, f.turnId); safe(citation, f);
    assert.equal(citation.sourceKind, 'PLAN'); assert.equal(citation.availability, 'AVAILABLE'); assert.equal(f.storageReads(), 0);
  });
});

test('authorized text-only activity citation is TEXT_ONLY and becomes unavailable when withdrawn', { timeout: 120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const api = await import('./index.ts'), query = async (sql, ...args) => (await pool.query(sql,args)).rows;
    const f = await homeFixture(query), activity = await f.activity('teach');
    await query("UPDATE activities SET instructions_text='Texto docente' WHERE id=$1::uuid", activity.id);
    const uow = api.createFoxyUnitOfWork({ database: transactionDatabase(pool), authenticate: async (_tx, req) => req.id });
    const owner = { id: f.teacherActor }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
    const { conversation } = await uow.run(owner, true, (tx, actor) => conversations.create(tx, actor.id,
      { requestId:randomUUID(), title:'Chat', context:{ kind:'CLASSROOM', classroomId:f.rooms.teach.id } }, 'a'.repeat(64)));
    const turnService = api.createFoxyTurnService({ uow, conversations, turns, configuration:{ enabled:true, model:'synthetic' } });
    const sourceId = `activity:${activity.id}`, sent = await turnService.send(owner, conversation.id,
      { requestId:randomUUID(), revision:'0', purpose:'CHAT', text:'Hola', selection:{ topicIds:[], sourceIds:[sourceId] } });
    const [row] = await query('SELECT snapshot FROM foxy_turns WHERE id=$1::uuid', sent.turn.id);
    const answer = { schemaVersion:'foxy-answer-v1', title:'Resumen', markdown:'Texto', references:[{sourceId,page:null}], warnings:[], missingInformation:[] };
    const referenceMap = [{ sourceKey:'s1', sourceId, documentKeys:[] }];
    const report = [{ sourceKey:'s1', title:row.snapshot.sources[0].title, kind:'ACTIVITY', documentKeys:[], citations:[{sourceId,documentKey:null,page:null}] }];
    await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map=$3::jsonb,source_report=$4::jsonb WHERE id=$1::uuid", sent.turn.id, JSON.stringify(answer), JSON.stringify(referenceMap), JSON.stringify(report));
    let reads = 0; const citations = api.createFoxyCitationService({ uow, files:{ read:async () => { reads++; throw Error('unexpected'); } } });
    const [entry] = await citations.list(owner, conversation.id, sent.turn.id);
    assert.equal(entry.id, 'c1'); assert.equal(entry.availability, 'TEXT_ONLY'); assert.equal(entry.href, null); assert.equal(entry.page, null);
    assert.equal(entry.documentTitle, null); assert.equal(JSON.stringify(entry).includes(activity.id), false); assert.equal(reads, 0);
    await query("UPDATE activities SET status='WITHDRAWN' WHERE id=$1::uuid", activity.id);
    const [withdrawn] = await citations.list(owner, conversation.id, sent.turn.id);
    assert.equal(withdrawn.availability, 'UNAVAILABLE'); assert.equal(withdrawn.href, null);
  });
});
