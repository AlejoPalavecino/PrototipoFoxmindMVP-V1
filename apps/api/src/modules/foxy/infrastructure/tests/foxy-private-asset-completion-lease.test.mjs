import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAiDatabase} from "../../../../../../../tests/classroom-ai-database.test.mjs";
import {homeFixture} from "../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs";

test('terminal processing transitions require a live lease and clear it atomically', {timeout:120000},async t=>{
 const [{createFoxyConversationRepository},{createFoxyPrivateAssetRepository}]=await Promise.all([import("../conversation-repository.ts"),import("../private-asset-repository.ts")]);
 await withAiDatabase(async({pool,database})=>{
  const query=async(sql,...args)=>(await pool.query(sql,args)).rows,f=await homeFixture(query);
  const transact=run=>database.$transaction(raw=>run({query:(sql,...args)=>raw.$queryRawUnsafe(sql,...args)}));
  const conversation=(await transact(tx=>createFoxyConversationRepository().create(tx,f.teacherActor,{requestId:randomUUID(),title:'Lease synthetic',context:{kind:'GENERAL'}},'a'.repeat(64)))).conversation;
  async function processing(expired=false){
   const {asset}=await transact(tx=>createFoxyPrivateAssetRepository().reserve(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),conversationRevision:'0',kind:'IMAGE',aspectRatio:'1:1'},104857600n));
   const nonce=randomUUID();await query(`UPDATE foxy_visual_assets SET state='PROCESSING',lease_nonce=$2,lease_until=clock_timestamp()+${expired?"interval '-1 minute'":"interval '1 hour'"},revision=revision+1 WHERE id=$1`,asset.id,nonce);
   await query("UPDATE foxy_visual_assets SET digest=$2,size_bytes=100,mime_type='image/png',width=10,height=10,producer_version='foxy-image-original-v1',title='Synthetic',description='' WHERE id=$1",asset.id,'b'.repeat(64));
   return {id:asset.id,nonce};
  }
  const ready=`UPDATE foxy_visual_assets SET state='READY',charge_bytes=100,validated_digest=$2,scanned_digest=$2,validated_at=clock_timestamp(),scanned_at=clock_timestamp(),lease_nonce=NULL,lease_until=NULL,revision=revision+1 WHERE id=$1`;
  const rejected="UPDATE foxy_visual_assets SET state='REJECTED',error_code='INVALID_CONTENT',lease_nonce=NULL,lease_until=NULL,revision=revision+1 WHERE id=$1";
  await t.test('READY with matching proof clears an active lease',async()=>{
   const x=await processing();await query(ready,x.id,'b'.repeat(64));const [r]=await query('SELECT state,lease_nonce,lease_until,charge_bytes FROM foxy_visual_assets WHERE id=$1',x.id);
   assert.equal(r.state,'READY');assert.equal(r.lease_nonce,null);assert.equal(r.lease_until,null);assert.equal(BigInt(r.charge_bytes),100n);
  });
  await t.test('REJECTED clears an active lease and preserves the reserved charge',async()=>{
   const x=await processing();await query(rejected,x.id);const [r]=await query('SELECT state,lease_nonce,lease_until,charge_bytes FROM foxy_visual_assets WHERE id=$1',x.id);
   assert.equal(r.state,'REJECTED');assert.equal(r.lease_nonce,null);assert.equal(r.lease_until,null);assert.equal(BigInt(r.charge_bytes),10485760n);
  });
  for(const state of ['READY','REJECTED'])await t.test(`${state} cannot finalize from an expired lease`,async()=>{
   const x=await processing(true);await assert.rejects(state==='READY'?pool.query(ready,[x.id,'b'.repeat(64)]):pool.query(rejected,[x.id]));
   const [r]=await query('SELECT state,lease_nonce,charge_bytes FROM foxy_visual_assets WHERE id=$1',x.id);assert.equal(r.state,'PROCESSING');assert.equal(r.lease_nonce,x.nonce);assert.equal(BigInt(r.charge_bytes),10485760n);
  });
  await t.test('terminal transition without revision increment is forbidden',async()=>{
   const x=await processing();await assert.rejects(pool.query("UPDATE foxy_visual_assets SET state='REJECTED',error_code='INVALID_CONTENT',lease_nonce=NULL,lease_until=NULL WHERE id=$1",[x.id]));
  });
  await t.test('reclaimed operation rejects a previous nonce in conditional completion',async()=>{
   const x=await processing(true),fresh=randomUUID();await query("UPDATE foxy_visual_assets SET lease_nonce=$2,lease_until=clock_timestamp()+interval '1 hour' WHERE id=$1",x.id,fresh);
   const result=await pool.query("UPDATE foxy_visual_assets SET state='REJECTED',error_code='INVALID_CONTENT',lease_nonce=NULL,lease_until=NULL,revision=revision+1 WHERE id=$1 AND lease_nonce=$2 AND lease_until>clock_timestamp() RETURNING id",[x.id,x.nonce]);
   assert.equal(result.rowCount,0);const [r]=await query('SELECT state,lease_nonce FROM foxy_visual_assets WHERE id=$1',x.id);assert.equal(r.state,'PROCESSING');assert.equal(r.lease_nonce,fresh);
  });
 });
});
