import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { transactionDatabase } from '../../../../tests/classroom-ai-database.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

async function fixture(pool, changes = {}) {
  const api = await import('./index.ts'), query = async (sql, ...args) => (await pool.query(sql,args)).rows, f = await homeFixture(query);
  const room = f.rooms.teach, activity = await f.activity('teach');
  await query("UPDATE activities SET instructions_text='Consigna' WHERE id=$1::uuid", activity.id);
  const documents = [];
  for (const label of ['primero', 'segundo']) {
    const id = randomUUID(), bytes = Buffer.from(`%PDF-${label}-synthetic`), digest = createHash('sha256').update(bytes).digest('hex');
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,$5,'pdf','application/pdf',$6,'APPROVED','CLEAN',now(),now())`,
      id, room.id, room.teacher, `synthetic/${id}`, `${label}.pdf`, bytes.length);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',$3,now())", randomUUID(), id, bytes.length);
    await query("INSERT INTO file_custodies(file_id,purpose,target_id,phase,digest,validated_digest,scanned_digest) VALUES($1,'instructions',$2,'ready',$3,$3,$3)", id, activity.id, digest);
    await query('INSERT INTO activity_instruction_files(activity_id,classroom_id,file_id) VALUES($1,$2,$3)', activity.id, room.id, id);
    documents.push({ id, bytes, digest });
  }
  const uow = api.createFoxyUnitOfWork({ database: transactionDatabase(pool), authenticate: async (_tx, req) => { if (req.revoked) throw Object.assign(Error('AUTH_REQUIRED'), { code:'AUTH_REQUIRED' }); return req.id; } });
  const owner = { id: f.teacherActor }, conversations = api.createFoxyConversationRepository(), turns = api.createFoxyTurnRepository();
  const { conversation } = await uow.run(owner, true, (tx, actor) => conversations.create(tx, actor.id,
    { requestId: randomUUID(), title:'Chat', context:{ kind:'CLASSROOM', classroomId:room.id } }, 'a'.repeat(64)));
  const turnService = api.createFoxyTurnService({ uow, conversations, turns, configuration:{ enabled:true, model:'synthetic' } });
  const sourceId = `activity:${activity.id}`, sent = await turnService.send(owner, conversation.id,
    { requestId:randomUUID(), revision:'0', purpose:'CHAT', text:'Hola', selection:{ topicIds:[], sourceIds:[sourceId] } });
  const [row] = await query('SELECT snapshot FROM foxy_turns WHERE id=$1::uuid', sent.turn.id), snapshotFiles = row.snapshot.sources[0].files;
  const cited = snapshotFiles[1], chosen = documents.find(d => d.id === cited.fileId);
  const answer = { schemaVersion:'foxy-answer-v1', title:'Resumen', markdown:'Texto', references:[{sourceId,page:1}], warnings:[], missingInformation:[] };
  const referenceMap = [{ sourceKey:'s1', sourceId, documentKeys:['d1','d2'] }];
  const report = [{ sourceKey:'s1', title:row.snapshot.sources[0].title, kind:'ACTIVITY', documentKeys:['d1','d2'], citations:[{sourceId,documentKey:'d2',page:1}] }];
  await query("UPDATE foxy_turns SET state='READY',answer=$2::jsonb,reference_map=$3::jsonb,source_report=$4::jsonb WHERE id=$1::uuid", sent.turn.id, JSON.stringify(answer), JSON.stringify(referenceMap), JSON.stringify(report));
  const calls = [], files = { read: async (request, id, mode) => { calls.push({ request,id,mode }); if (changes.onRead) await changes.onRead({ query, f, activity, chosen });
    return { bytes: changes.bytes ?? chosen.bytes, headers: { 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff', 'Content-Type':'application/pdf' } }; } };
  const citations = api.createFoxyCitationService({ uow, files });
  return { citations, owner, conversation, turnId:sent.turn.id, chosen, documents, calls, query, f, activity };
}

test('authorized citation reads exactly its second PDF with safe headers', { timeout:120000 }, async () => {
  await withAgendaDatabase(async ({ pool }) => {
    const f = await fixture(pool); assert.equal(typeof f.citations.readFile, 'function');
    const result = await f.citations.readFile(f.owner, f.conversation.id, f.turnId, 'c1', 'preview');
    assert.deepEqual(Buffer.from(result.bytes), f.chosen.bytes); assert.equal(f.calls.length, 1);
    assert.equal(f.calls[0].request, f.owner); assert.equal(f.calls[0].id, f.chosen.id); assert.equal(f.calls[0].mode, 'preview');
    assert.equal(result.headers['Cache-Control'], 'no-store'); assert.equal(result.headers['X-Content-Type-Options'], 'nosniff');
    assert.equal(result.headers.Location, undefined);
    await assert.rejects(f.citations.readFile(f.owner, f.conversation.id, f.turnId, f.documents[0].id, 'preview'));
    assert.equal(f.calls.length, 1);
  });
});

test('revocation before or during file read and historical byte mismatch return no bytes', { timeout:120000 }, async () => {
  for (const cause of ['before','during','digest','size']) await withAgendaDatabase(async ({ pool }) => {
    const changes = cause === 'during' ? { onRead: async ({ query, chosen }) => query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid", chosen.id) }
      : cause === 'digest' ? { bytes: Buffer.from('invalid-synthetic') } : cause === 'size' ? { bytes: Buffer.alloc(1) } : {};
    const f = await fixture(pool, changes); assert.equal(typeof f.citations.readFile, 'function');
    if (cause === 'before') await f.query("UPDATE files SET scan_status='ERROR' WHERE id=$1::uuid", f.chosen.id);
    await assert.rejects(f.citations.readFile(f.owner, f.conversation.id, f.turnId, 'c1', 'download'));
    assert.equal(f.calls.length, cause === 'before' ? 0 : 1);
  });
});
