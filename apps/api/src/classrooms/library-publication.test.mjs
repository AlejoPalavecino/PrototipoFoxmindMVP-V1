import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAgendaDatabase} from '../../../../tests/agenda-database-helpers.test.mjs';
import {transactionDatabase} from '../../../../tests/classroom-ai-database.test.mjs';
import {homeFixture} from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

async function setup(pool){
 const query=async(sql,...args)=>(await pool.query(sql,args)).rows,database=transactionDatabase(pool),f=await homeFixture(query),id=randomUUID(),digest='a'.repeat(64);
 await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
 VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,id,f.rooms.teach.id,f.teacherActor,`synthetic/${id}`);
 await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())",randomUUID(),id);
 await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",id,digest);
 const {FileStore}=await import('../files/store.ts');const files=new FileStore(database,{authenticate:async(_tx,request)=>request.id,authorize:async()=>{}},100000n);
 const {createLibraryMaterialPublisher}=await import('./library-publication.ts');const publisher=createLibraryMaterialPublisher({files});
 const [room]=await query('SELECT revision FROM classrooms WHERE id=$1',f.rooms.teach.id);
 const input={classroomId:f.rooms.teach.id,revision:String(room.revision),title:'Guía sintética',fileId:id,unitId:null,topicId:null};
 const run=(request,actor,body=input)=>database.$transaction(raw=>publisher.publish({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},request,actor,body));
 return {query,f,id,input,run,database,publisher};
}
test('publishes ready classroom file atomically and exposes the library row', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool),result=await x.run({id:x.f.teacherActor},x.f.teacherActor);
  assert.ok(result.materialId);assert.equal(result.classroomRevision,String(BigInt(x.input.revision)+1n));
  const [row]=await x.query('SELECT title,file_id,classroom_id,deleted_at FROM materials WHERE id=$1',result.materialId);
  assert.equal(row.title,x.input.title);assert.equal(row.file_id,x.id);assert.equal(row.classroom_id,x.input.classroomId);assert.equal(row.deleted_at,null);
 });
});
test('caller rollback removes material and restores classroom revision', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool);await assert.rejects(x.database.$transaction(async raw=>{
   await x.publisher.publish({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},{id:x.f.teacherActor},x.f.teacherActor,x.input);throw Error('rollback synthetic');}));
  const [row]=await x.query('SELECT revision FROM classrooms WHERE id=$1',x.input.classroomId);assert.equal(String(row.revision),x.input.revision);
  const [count]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.id);assert.equal(count.n,0);
 });
});
test('rejects wrong owner, stale revision and any reused file including tombstones', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool);
  await assert.rejects(x.run({id:x.f.other},x.f.other));await assert.rejects(x.run({id:x.f.teacherActor},x.f.teacherActor,{...x.input,revision:'999'}));
  await x.query("INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,deleted_at) VALUES($1,now(),$2,'Deleted',$3,$4,now())",randomUUID(),x.input.classroomId,x.id,x.f.teacherActor);
  await assert.rejects(x.run({id:x.f.teacherActor},x.f.teacherActor));const [count]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.id);assert.equal(count.n,1);
 });
});

test('concurrent legacy library publication and publisher serialize classroom revision with one winner', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool),{LibraryService}=await import('./library.ts');
  const context={run:async(request,_write,op)=>x.database.$transaction(raw=>op({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},{id:request.id})),
   classroom:async(tx,actor,id)=>{const [room]=await tx.query('SELECT * FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR UPDATE',id,actor.id);if(!room)throw Error('FORBIDDEN');return room;}};
  const legacy=new LibraryService(context,{readyClassroomFile:async(tx,_request,_classroomId,fileId)=>({id:fileId,blob_deleted_at:null}),
   advanceRevision:async(tx,id,revision)=>{await tx.query('UPDATE classrooms SET revision=revision+1 WHERE id=$1::uuid AND revision=$2 RETURNING id',id,revision);return String(BigInt(revision)+1n);}});
  const request={id:x.f.teacherActor},results=await Promise.allSettled([
   x.run(request,x.f.teacherActor),legacy.changeLibrary(request,x.input.classroomId,{revision:x.input.revision,operation:{action:'publish',title:x.input.title,fileId:x.id,unitId:null,topicId:null}})]);
  assert.equal(results.filter(r=>r.status==='fulfilled').length,1);const [count]=await x.query('SELECT count(*)::int n FROM materials WHERE file_id=$1',x.id);assert.equal(count.n,1);
  const [room]=await x.query('SELECT revision FROM classrooms WHERE id=$1',x.input.classroomId);assert.equal(String(room.revision),String(BigInt(x.input.revision)+1n));
 });
});

test('publisher supports valid nineteen digit classroom revisions without legacy parser truncation', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool),revision='1000000000000000000';
  await x.query('UPDATE classrooms SET revision=$2::bigint WHERE id=$1::uuid',x.input.classroomId,revision);
  const result=await x.run({id:x.f.teacherActor},x.f.teacherActor,{...x.input,revision});
  assert.equal(result.classroomRevision,'1000000000000000001');
 });
});

test('public classroom publisher barrel loads independently without Nest composition or decorators',async()=>{
 const api=await import('./public/index.ts');assert.equal(typeof api.createLibraryMaterialPublisher,'function');
});

test('publisher snapshots its input before awaiting the classroom lock', {timeout:120000},async()=>{
 await withAgendaDatabase(async({pool})=>{const x=await setup(pool),roomB=randomUUID(),fileB=randomUUID(),digest='b'.repeat(64);
  await x.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes,revision)
    VALUES($1,now(),$2,'Otra','Ciencias','A',2026,'UTC','explore',1000000,17)`,roomB,x.f.teacherActor);
  await x.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,validation_status,scan_status,validated_at,scanned_at)
    VALUES($1,now(),$2,$3,$4,'other.pdf','pdf','application/pdf',14,'APPROVED','CLEAN',now(),now())`,fileB,roomB,x.f.teacherActor,`synthetic/${fileB}`);
  await x.query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',14,now())",randomUUID(),fileB);
  await x.query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",fileB,digest);
  let entered,release;const reached=new Promise(r=>entered=r),gate=new Promise(r=>release=r),mutable={...x.input};
  const running=x.database.$transaction(raw=>x.publisher.publish({query:async(sql,...args)=>{if(sql.includes('SELECT revision FROM classrooms')){entered();await gate;}return raw.$queryRawUnsafe(sql,...args);}},
    {id:x.f.teacherActor},x.f.teacherActor,mutable));
  await reached;Object.assign(mutable,{classroomId:roomB,fileId:fileB,revision:'17'});release();
  const result=await running;const [material]=await x.query('SELECT classroom_id,file_id FROM materials WHERE id=$1::uuid',result.materialId);
  assert.equal(material.classroom_id,x.input.classroomId);assert.equal(material.file_id,x.id);
  const [b]=await x.query('SELECT revision FROM classrooms WHERE id=$1::uuid',roomB);assert.equal(String(b.revision),'17');
 });
});
