import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs';

async function setup(query){
  const {FileService}=await import('../service.ts'),{createFileAccess}=await import('../access.ts'),f=await homeFixture(query),calls=[];
  const access=createFileAccess({authenticate:async(_tx,request)=>request.id,authorizeAttemptWrite:async()=>{throw Error('not allowed');}});
  const database={$transaction:async()=>{calls.push('nested');throw Error('nested transaction');}};
  const storage={put:async()=>calls.push('put'),get:async()=>calls.push('get'),delete:async()=>calls.push('delete')};
  const scanner={scan:async()=>calls.push('scan')}, service=new FileService({database,access,storage,scanner,draftQuotaBytes:1000000n});
  return {f,service,calls,tx:{query},scope:{kind:'classroom',id:f.rooms.teach.id},owner:{id:f.teacherActor}};
}
const intent={purpose:'material',name:'recurso.pdf',bytes:100};

test('begin in caller transaction creates file, upload and custody and rolls back quota together', {timeout:120000},async()=>{
  await withAgendaDatabase(async({pool,transaction})=>{assert.match((await pool.query('SELECT current_database() name')).rows[0].name,/_test$/);
    await transaction(async({query})=>{const x=await setup(query);assert.equal(typeof x.service.beginInTransaction,'function');await query('SAVEPOINT before_begin');
      const result=await x.service.beginInTransaction(x.tx,x.owner,x.scope,intent);assert.equal(result.name,'recurso.pdf');assert.equal(result.sizeBytes,100);
      const rows=await query(`SELECT f.id,u.reserved_bytes::text AS reserved,c.purpose,c.target_id FROM files f
        JOIN uploads u ON u.file_id=f.id JOIN file_custodies c ON c.file_id=f.id WHERE f.id=$1::uuid`,result.id);
      assert.equal(rows.length,1);assert.equal(rows[0].reserved,'100');assert.equal(rows[0].purpose,'material');assert.equal(rows[0].target_id,null);
      assert.equal(await x.service.store.usage(x.tx,x.scope),100n);assert.deepEqual(x.calls,[]);
      await query('ROLLBACK TO SAVEPOINT before_begin');assert.equal((await query('SELECT id FROM files WHERE id=$1::uuid',result.id)).length,0);
      assert.equal(await x.service.store.usage(x.tx,x.scope),0n);assert.deepEqual(x.calls,[]);
    });
  });
});

test('transactional begin matches authorization, quota, archive, target and intent policy', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{const x=await setup(query);assert.equal(typeof x.service.beginInTransaction,'function');
    await query('UPDATE classrooms SET storage_quota_bytes=100 WHERE id=$1::uuid',x.scope.id);
    await assert.rejects(x.service.beginInTransaction(x.tx,x.owner,x.scope,{...intent,bytes:101}),{code:'QUOTA_EXCEEDED'});
    for(const [request,scope,upload,target] of [
      [{id:x.f.other},x.scope,intent,null], [x.owner,{kind:'classroom',id:x.f.rooms.archived.id},intent,null], [x.owner,x.scope,{...intent,purpose:'instructions'},null],
      [x.owner,x.scope,intent,randomUUID()], [x.owner,x.scope,{...intent,name:'script.exe'},null],
    ]) await assert.rejects(x.service.beginInTransaction(x.tx,request,scope,upload,target));
    assert.equal(await x.service.store.usage(x.tx,x.scope),0n);assert.deepEqual(x.calls,[]);
  }));
});

test('original begin snapshots mutable scope and intent before waiting for transaction', {timeout:120000},async()=>{
  await withAgendaDatabase(async({transaction})=>transaction(async({query})=>{
    const x=await setup(query),{FileService}=await import('../service.ts');let release;
    const gate=new Promise(resolve=>{release=resolve;});
    const database={$transaction:async fn=>{await gate;return fn({$queryRawUnsafe:query});}};
    const service=new FileService({database,access:x.service.store.access,storage:x.service.storage,scanner:x.service.scanner,draftQuotaBytes:1000000n});
    const scope={...x.scope},body={...intent},pending=service.begin(x.owner,scope,body);
    scope.id=x.f.rooms.foreign.id;body.name='alterado.pdf';body.bytes=99999999;release();
    const result=await pending;assert.equal(result.name,'recurso.pdf');assert.equal(result.sizeBytes,100);
    const [row]=await query('SELECT classroom_id FROM files WHERE id=$1::uuid',result.id);assert.equal(row.classroom_id,x.scope.id);
  }));
});
