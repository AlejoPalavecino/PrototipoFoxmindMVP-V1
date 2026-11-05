import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAiDatabase, rollbackCase } from './classroom-ai-database.test.mjs';
import { fixture } from './activity-ai-fixture.test.mjs';

test('búsqueda SQL limita páginas, conserva privacidad y revalida membresía en cada consulta', { timeout: 120000 }, async t => {
  await withAiDatabase(async ({ pool }) => rollbackCase(pool, async local => {
    const f = await fixture(local);
    await local.pool.query("UPDATE classrooms SET name='Biología',subject='Ciencias' WHERE id=$1", [f.room]);
    for (let n=0;n<20;n++) await local.pool.query('INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) VALUES($1,now(),$2,$3,$4,$5)', [randomUUID(),f.room,f.unitId,`Célula ${n}`,n+1]);
    const draft = randomUUID(), published = randomUUID(), withdrawn = randomUUID();
    for (const [id,status,title] of [[draft,'DRAFT','Actividad privada'],[published,'PUBLISHED','Actividad publicada'],[withdrawn,'WITHDRAWN','Actividad retirada']]) {
      await local.pool.query(`INSERT INTO activities(id,updated_at,classroom_id,type,status,title,instructions_text,unit_id,topic_id,ai_grading_rubric,published_at)
        VALUES($1,now(),$2,'ASSIGNMENT',$3::"ActivityStatus",$4,'Consigna',$5,$6,'RUBRIC_PRIVATE',CASE WHEN $3::text='PUBLISHED' THEN now() ELSE NULL END)`, [id,f.room,status,title,f.unitId,f.topicIds[0]]);
    }
    const material = randomUUID(), file = randomUUID();
    await local.pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
      VALUES($1,now(),$2,$3,$4,'cell.pdf','pdf','application/pdf',1,'APPROVED','CLEAN',now(),now())`, [file,f.room,f.teacher,`fixture/${file}`]);
    await local.pool.query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',1,now())", [randomUUID(),file]);
    await local.pool.query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)", [file,'a'.repeat(64)]);
    await local.pool.query('INSERT INTO materials(id,updated_at,classroom_id,file_id,title,created_by_id) VALUES($1,now(),$2,$3,$4,$5)', [material,f.room,file,'Material de lectura',f.teacher]);
    const search = (actor,q='',cursor=null) => f.classrooms.search(actor,{q,cursor});
    await t.test('docente y alumno ven aula y tema exactos sin acentos, extraño no ve datos', async () => {
      const topics = await search(f.S,'celula');
      assert.equal(topics.items.length,12); assert.ok(topics.nextCursor);
      assert.ok(topics.items.every(item => item.kind === 'topic' && item.target.topicId === item.id));
      assert.equal((await search(f.T,'biologia')).items[0].kind,'classroom');
      assert.deepEqual((await search(f.O)).items,[]);
      assert.deepEqual((await search(f.S,'%')).items,[], 'comodines se buscan literalmente');
    });
    await t.test('paginación completa no duplica ni pierde resultados y cursor está ligado a actor y consulta', async () => {
      const first=await search(f.S,'celula'), second=await search(f.S,'celula',first.nextCursor);
      assert.equal(second.items.length,8);assert.equal(second.nextCursor,null);
      assert.equal(new Set([...first.items,...second.items].map(item=>item.id)).size,20);
      await assert.rejects(search(f.T,'celula',first.nextCursor),{code:'INVALID_INPUT'});
      await assert.rejects(search(f.S,'otra',first.nextCursor),{code:'INVALID_INPUT'});
      await assert.rejects(search(f.S,'celula',first.nextCursor.slice(0,-1)+'X'),{code:'INVALID_INPUT'});
    });
    await t.test('alumno sólo actividades publicadas, docente borradores propios; ninguna rúbrica cruza', async () => {
      const student=await search(f.S,'actividad'),teacher=await search(f.T,'actividad');
      assert.deepEqual(student.items.map(item=>item.id),[published]);
      assert.equal(teacher.items.length,3);
      assert.doesNotMatch(JSON.stringify(teacher),/RUBRIC_PRIVATE|instructions|aiGradingRubric/);
    });
    await t.test('material sólo se encuentra disponible y no borrado', async () => {
      assert.equal((await search(f.S,'material')).items[0].id,material);
      await local.pool.query("UPDATE files SET scan_status='PENDING' WHERE id=$1",[file]);
      assert.deepEqual((await search(f.T,'material')).items,[]);
      await local.pool.query("UPDATE files SET scan_status='CLEAN' WHERE id=$1",[file]);
      await local.pool.query('UPDATE materials SET deleted_at=now() WHERE id=$1',[material]);
      assert.deepEqual((await search(f.S,'material')).items,[]);
    });
    await t.test('revocación elimina resultados incluso con cursor válido anterior', async () => {
      const first=await search(f.S,'celula');
      await f.classrooms.remove(f.T,f.room,f.student);
      assert.deepEqual((await search(f.S,'celula',first.nextCursor)).items,[]);
      assert.deepEqual((await search(f.S)).items,[]);
      assert.ok((await search(f.T)).items.length);
    });
  }));
});
