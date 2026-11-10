import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAiDatabase} from "../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

const bytes=10485760n,hash='a'.repeat(64);
const code=expected=>error=>error?.code===expected;
const input=(changes={})=>({requestId:randomUUID(),conversationRevision:'0',kind:'DIAGRAM',aspectRatio:'1:1',...changes});
test('private visual reservation, authorization, quota and database guards', {timeout:120000},async t=>{
 const [{createFoxyPrivateAssetRepository},{createFoxyConversationRepository}]=await Promise.all([import("../private-asset-repository.ts"),import("../conversation-repository.ts")]);
 assert.equal(typeof createFoxyPrivateAssetRepository,'function');
 await withAiDatabase(async({pool,database,databaseUrl})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query),repo=createFoxyPrivateAssetRepository();
  const transact=fn=>database.$transaction(raw=>fn({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));
  const makeConversation=(owner,context)=>transact(async tx=>(await createFoxyConversationRepository().create(tx,owner,{requestId:randomUUID(),title:'Sintético',context},hash)).conversation);
  const general=await makeConversation(f.teacherActor,{kind:'GENERAL'}), classroom=await makeConversation(f.teacherActor,{kind:'CLASSROOM',classroomId:f.rooms.teach.id}),other=await makeConversation(f.other,{kind:'GENERAL'});
  const reserve=(actor,conv,body,quota=bytes)=>transact(tx=>repo.reserve(tx,actor,conv,body,quota));
  const usage=actor=>transact(tx=>repo.usage(tx,actor));
  await t.test('GENERAL reservation uses private owner quota without touching files or classroom quota',async()=>{
   const before=await query('SELECT (SELECT count(*) FROM files)::text files,(SELECT COALESCE(sum(u.reserved_bytes),0) FROM uploads u JOIN files x ON x.id=u.file_id WHERE x.classroom_id=$1::uuid)::text used',f.rooms.teach.id);
   const command=input(),first=await reserve(f.teacherActor,general.id,command,bytes*10n);
   assert.equal(first.created,true);assert.deepEqual(Object.keys(first.asset).sort(),['aspectRatio','conversationId','id','kind','revision','state']);
   assert.equal(first.asset.state,'RESERVED');assert.equal(first.asset.revision,'0');assert.equal((await usage(f.teacherActor)).usedBytes,bytes);
   const [row]=await query('SELECT * FROM foxy_visual_assets WHERE id=$1::uuid',first.asset.id);
   assert.equal(row.storage_key,`foxy-assets/${f.teacherActor}/${first.asset.id}`);assert.equal(BigInt(row.reserved_bytes),bytes);assert.equal(BigInt(row.charge_bytes),bytes);
   assert.deepEqual(await query('SELECT (SELECT count(*) FROM files)::text files,(SELECT COALESCE(sum(u.reserved_bytes),0) FROM uploads u JOIN files x ON x.id=u.file_id WHERE x.classroom_id=$1::uuid)::text used',f.rooms.teach.id),before);
   await query('UPDATE foxy_conversations SET revision=revision+1 WHERE id=$1::uuid',general.id);
   const replay=await reserve(f.teacherActor,general.id,command,0n);assert.equal(replay.created,false);assert.equal(replay.asset.id,first.asset.id);
   await assert.rejects(reserve(f.teacherActor,general.id,{...command,aspectRatio:'4:3'},bytes*10n),code('CONFLICT'));
   await assert.rejects(reserve(f.teacherActor,general.id,input(),bytes*10n),code('CONFLICT'));
  });
  await t.test('same request races to one row and one charge; quota prevents distinct simultaneous claims',async()=>{
   const request=input(),r=await Promise.all([reserve(f.other,other.id,request),reserve(f.other,other.id,request)]);
   assert.deepEqual(r.map(x=>x.created).sort(),[false,true]);assert.equal(r[0].asset.id,r[1].asset.id);assert.equal((await usage(f.other)).usedBytes,bytes);
   const next=input(),next2=input();const outcomes=await Promise.allSettled([reserve(f.other,other.id,next,bytes*2n),reserve(f.other,other.id,next2,bytes*2n)]);
   assert.equal(outcomes.filter(x=>x.status==='fulfilled').length,1);assert.equal(outcomes.filter(x=>x.status==='rejected'&&x.reason?.code==='QUOTA_EXCEEDED').length,1);assert.equal((await usage(f.other)).usedBytes,bytes*2n);
   assert.equal((await usage(f.teacherActor)).usedBytes,bytes);
  });
  await t.test('input is strict and exact bigint quota boundaries apply',async()=>{
   for(const patch of [{kind:'VIDEO'},{aspectRatio:'9:16'},{conversationRevision:'01'},{conversationRevision:'9223372036854775808'},{requestId:'bad'}, {extra:true}])
    await assert.rejects(reserve(f.other,other.id,input(patch),100000000000000000n),code('INVALID_INPUT'));
   await assert.rejects(reserve(f.other,other.id,input(),bytes*3n-1n),code('QUOTA_EXCEEDED'));
   const request=input(),before=structuredClone(request),result=await reserve(f.other,other.id,request,100000000000000000n);
   assert.deepEqual(request,before);const replay=await reserve(f.other.toUpperCase(),other.id.toUpperCase(),{...request,requestId:request.requestId.toUpperCase()},0n);
   assert.equal(replay.created,false);assert.equal(replay.asset.id,result.asset.id);
  });
  await t.test('active classroom and current authorization are required including on replay',async()=>{
   const cmd=input(),result=await reserve(f.teacherActor,classroom.id,cmd,bytes*10n);assert.equal(result.asset.state,'RESERVED');
   await assert.rejects(reserve(f.other,classroom.id,input(),bytes*10n),code('NOT_FOUND'));
   await assert.rejects(reserve(f.pupil,classroom.id,input(),bytes*10n),code('NOT_FOUND'));
   await query('UPDATE users SET email_verified_at=NULL WHERE id=$1',f.teacherActor);
   await assert.rejects(reserve(f.teacherActor,classroom.id,cmd,bytes*10n),code('NOT_FOUND'));
   await query('UPDATE users SET email_verified_at=now() WHERE id=$1',f.teacherActor);
   await query('UPDATE classrooms SET archived_at=now() WHERE id=$1',f.rooms.teach.id);
   await assert.rejects(reserve(f.teacherActor,classroom.id,cmd,bytes*10n),code('NOT_FOUND'));
   await query('UPDATE classrooms SET archived_at=NULL WHERE id=$1',f.rooms.teach.id);
   await query('UPDATE foxy_conversations SET deleted_at=now() WHERE id=$1',classroom.id);
   await assert.rejects(reserve(f.teacherActor,classroom.id,cmd,bytes*10n),code('NOT_FOUND'));
  });
  await t.test('bigint totals above safe integer remain exact at the reservation boundary',async()=>{
   const huge=9007199254740993n,token=input();
   const run=quota=>transact(tx=>repo.reserve({query:(sql,...args)=>sql.includes('sum(charge_bytes)')?Promise.resolve([{used:String(huge)}]):tx.query(sql,...args)},f.other,other.id,token,quota));
   await assert.rejects(run(huge+bytes-1n),code('QUOTA_EXCEEDED'));
   const accepted=await run(huge+bytes);assert.equal(accepted.created,true);
   const usageResult=await repo.usage({query:async()=>[{used:String(huge)}]},f.other);assert.equal(usageResult.usedBytes,huge);
  });
  await t.test('real Prisma transactions serialize competing quota claims',async()=>{
   const [{PrismaPg},{PrismaClient}]=await Promise.all([import('@prisma/adapter-pg'),import("../../../../../../../.build/api/.generated/prisma/client.js")]);
   const prisma=new PrismaClient({adapter:new PrismaPg({connectionString:databaseUrl,max:4,connectionTimeoutMillis:1000})});
   try{
    const owner=f.teacherActor,conversation=await makeConversation(owner,{kind:'GENERAL'}),used=(await usage(owner)).usedBytes;
    const run=command=>prisma.$transaction(raw=>repo.reserve({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)},owner,conversation.id,command,used+bytes));
    const results=await Promise.allSettled([run(input()),run(input())]);
    assert.equal(results.filter(x=>x.status==='fulfilled').length,1);assert.equal(results.filter(x=>x.status==='rejected'&&x.reason?.code==='QUOTA_EXCEEDED').length,1);
    assert.equal((await usage(owner)).usedBytes,used+bytes);
   }finally{await prisma.$disconnect();}
  });
  await t.test('payload and lease fences reject replacement, active release and stale renewal',async()=>{
   const id=(await reserve(f.other,other.id,input(),bytes*10n)).asset.id,nonce=randomUUID();
   await query("UPDATE foxy_visual_assets SET state='PROCESSING',revision=revision+1,lease_nonce=$2,lease_until=now()+interval '1 hour' WHERE id=$1",id,nonce);
   await assert.rejects(pool.query('UPDATE foxy_visual_assets SET lease_nonce=$2 WHERE id=$1',[id,randomUUID()]));
   await assert.rejects(pool.query('UPDATE foxy_visual_assets SET lease_nonce=NULL,lease_until=NULL WHERE id=$1',[id]));
   const descriptor={schemaVersion:'foxy-diagram-v1',title:'Test',description:'Test',direction:'TOP_DOWN',nodes:[{id:'n',label:'Nodo'}],edges:[]};
   await query("UPDATE foxy_visual_assets SET digest=$2,size_bytes=100,mime_type='image/png',width=100,height=100,producer_version='foxy-diagram-png-v1',title='Test',description='Test',diagram=$3::jsonb WHERE id=$1",id,'b'.repeat(64),JSON.stringify(descriptor));
   await assert.rejects(pool.query('UPDATE foxy_visual_assets SET title=$2 WHERE id=$1',[id,'Replaced']));
   await assert.rejects(pool.query('UPDATE foxy_visual_assets SET diagram=$2::jsonb WHERE id=$1',[id,JSON.stringify({...descriptor,nodes:[]})]));
   await assert.rejects(pool.query("UPDATE foxy_visual_assets SET state='READY',charge_bytes=100,validated_digest=$2,scanned_digest=$3,validated_at=now(),scanned_at=now() WHERE id=$1",[id,'b'.repeat(64),'c'.repeat(64)]));
  });
  await t.test('schema blocks unauthorized identity, forged READY, release and deletion',async()=>{
   const asset=(await reserve(f.other,other.id,input(),bytes*6n)).asset;
   const illegal=[['UPDATE foxy_visual_assets SET owner_id=$2 WHERE id=$1',f.teacherActor],['UPDATE foxy_visual_assets SET request_id=$2 WHERE id=$1',randomUUID()],
    ['UPDATE foxy_visual_assets SET storage_key=$2 WHERE id=$1','foxy-assets/forged'],['UPDATE foxy_visual_assets SET reserved_bytes=$2 WHERE id=$1',1],
    ['UPDATE foxy_visual_assets SET state=$2 WHERE id=$1','READY'],['UPDATE foxy_visual_assets SET charge_bytes=$2 WHERE id=$1',0],
    ["UPDATE foxy_visual_assets SET charge_bytes=0,blob_deleted_at=now(),quota_released_at=now() WHERE id=$1 AND $2::int=0",0],
    ['UPDATE foxy_visual_assets SET conversation_id=$2 WHERE id=$1',general.id],['DELETE FROM foxy_visual_assets WHERE id=$1',undefined]];
   for(const [sql,value] of illegal)await assert.rejects(value===undefined?pool.query(sql,[asset.id]):pool.query(sql,[asset.id,value]));
   await query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=clock_timestamp(),revision=revision+1 WHERE id=$1",asset.id);
   await assert.rejects(pool.query("UPDATE foxy_visual_assets SET state='RESERVED',discarded_at=NULL,revision=revision+1 WHERE id=$1",[asset.id]));
   assert.equal((await usage(f.other)).usedBytes,bytes*6n);
  });
  await t.test('SQL rejects an empty diagram descriptor instead of accepting UNKNOWN',async()=>{
   const id=(await reserve(f.other,other.id,input(),bytes*20n)).asset.id;
   await assert.rejects(pool.query("UPDATE foxy_visual_assets SET digest=$2,size_bytes=1,mime_type='image/png',width=1,height=1,producer_version='foxy-diagram-png-v1',title='Synthetic',description='',diagram='{}'::jsonb WHERE id=$1",[id,'a'.repeat(64)]));
  });
  await t.test('expired lease cannot be erased without a fresh fenced reclaim',async()=>{
   const id=(await reserve(f.other,other.id,input(),bytes*20n)).asset.id;
   await query("UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2,lease_until=now()-interval '1 minute',revision=revision+1 WHERE id=$1",id,randomUUID());
   await assert.rejects(pool.query('UPDATE foxy_visual_assets SET lease_nonce=NULL,lease_until=NULL WHERE id=$1',[id]));
  });
  await t.test('expired lease cannot be renewed with its old nonce',async()=>{
   const id=(await reserve(f.other,other.id,input(),bytes*20n)).asset.id;
   await query("UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2,lease_until=now()-interval '1 minute',revision=revision+1 WHERE id=$1",id,randomUUID());
   await assert.rejects(pool.query("UPDATE foxy_visual_assets SET lease_until=now()+interval '1 hour' WHERE id=$1",[id]));
   await query("UPDATE foxy_visual_assets SET lease_nonce=$2,lease_until=now()+interval '1 hour' WHERE id=$1",id,randomUUID());
  });
  await t.test('discarded asset with live writer retains charge until fenced removal',async()=>{
   const id=(await reserve(f.other,other.id,input(),bytes*20n)).asset.id;
   await query("UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2,lease_until=now()+interval '1 hour',revision=revision+1 WHERE id=$1",id,randomUUID());
   await query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=now(),revision=revision+1 WHERE id=$1",id);
   await assert.rejects(pool.query('UPDATE foxy_visual_assets SET blob_deleted_at=now(),quota_released_at=now(),charge_bytes=0 WHERE id=$1',[id]));
  });
  await t.test('discard cannot erase a live writer lease in the same transition',async()=>{
   const id=(await reserve(f.other,other.id,input(),bytes*20n)).asset.id;
   await query("UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2,lease_until=now()+interval '1 hour',revision=revision+1 WHERE id=$1",id,randomUUID());
   await assert.rejects(pool.query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=now(),lease_nonce=NULL,lease_until=NULL,revision=revision+1 WHERE id=$1",[id]));
   await assert.rejects(pool.query("UPDATE foxy_visual_assets SET state='DISCARDED',discarded_at=now(),lease_until=now()-interval '1 minute',revision=revision+1 WHERE id=$1",[id]));
  });
 });
});
