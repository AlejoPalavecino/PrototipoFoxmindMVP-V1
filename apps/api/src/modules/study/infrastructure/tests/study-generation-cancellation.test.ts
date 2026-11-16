import assert from 'node:assert/strict';
import test from 'node:test';
import { createStudyService } from '../../application/service.ts';
import type { FolderRow } from '../../application/contracts.ts';

function deferred<T>() {
  let resolve!: (value:T)=>void;
  const promise=new Promise<T>(accept=>{resolve=accept;});
  return {promise,resolve};
}
test('a cancelled study generation retains its receipt and cannot apply a late answer', async () => {
  const folderId=crypto.randomUUID(), owner=crypto.randomUUID(), requestId=crypto.randomUUID();
  const conversationId=crypto.randomUUID();
  const row: FolderRow={id:folderId,owner_id:owner,revision:1n,status:'ACTIVE',created_at:new Date(),updated_at:new Date(),
    state:{version:1,fields:{name:'Estudio',academicYear:2026,bannerKey:'general',units:[],linkedClassroomId:null,planFileId:null},
      conversations:[{id:conversationId,title:'Consulta',turns:[]}],materials:[],creations:[],practices:[],exams:[],memory:{},receipts:{}}};
  const providerReady=deferred<void>(), finish=deferred<unknown>();
  const tx={query:async()=>[]};
  const study=createStudyService({
    uow:{run:async (_req,_write,operation)=>operation(tx,owner)},
    folders:{load:async()=>structuredClone(row),list:async()=>[],count:async()=>0n,
      create:async()=>row,save:async(_tx,_row,serialized)=>{
        row.state=JSON.parse(serialized); row.revision++; return structuredClone(row);
      }},
    newId:()=>crypto.randomUUID(),sources:async()=>[],linkedClassrooms:async()=>[],verifyLink:async()=>{},
    digest:s=>s,importPlan:async()=>null,
    generate:async()=>{ providerReady.resolve(); return finish.promise; },
  });
  const input={revision:'1',action:'CHAT',requestId,conversationId,message:'Hola',topicIds:[]};
  const waiting=study.command({},folderId,input);
  await providerReady.promise;
  const cancelled=await study.command({},folderId,{action:'CANCEL_GENERATION',targetRequestId:requestId});
  assert.deepEqual(cancelled.result,{status:'CANCELLED',requestId});
  const replay=await study.command({},folderId,{action:'CANCEL_GENERATION',targetRequestId:requestId});
  assert.deepEqual(replay,cancelled);
  finish.resolve({status:'COMPLETE',title:'Respuesta',markdown:'Tarde',sourceRefs:[]});
  assert.deepEqual((await waiting).result,cancelled.result);
  assert.deepEqual(row.state.conversations[0]!.turns,[]);
  assert.deepEqual((await study.command({},folderId,input)).result,cancelled.result);
});
