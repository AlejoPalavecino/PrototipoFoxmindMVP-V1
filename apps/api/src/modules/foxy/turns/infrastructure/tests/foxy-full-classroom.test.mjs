import test from 'node:test';
import assert from 'node:assert/strict';
import { rebuildGrounding } from '../grounding-rebuild.ts';
import { parseSendFoxyMessage } from '../../../../../../../../src/core/domain/foxy/validation.ts';

const context={kind:'CLASSROOM',classroomId:crypto.randomUUID()};
const full={mode:'ALL_CLASSROOM',topicIds:[],sourceIds:[]};
const topicId=crypto.randomUUID(), unitId=crypto.randomUUID(), planId=crypto.randomUUID(), materialId=crypto.randomUUID();
test('full classroom is resolved by the server and records unavailable sources', async()=>{
  const cmd={requestId:crypto.randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:full};
  assert.deepEqual(parseSendFoxyMessage(cmd,context).selection,full);
  assert.throws(()=>parseSendFoxyMessage(cmd,{kind:'GENERAL'}),{code:'INVALID_INPUT'});
  const now=new Date();
  const tx={query:async sql=>{
    if(sql.startsWith('SELECT id,name,position'))return [{id:unitId,name:'Unidad',position:1}];
    if(sql.startsWith('SELECT id,unit_id'))return [{id:topicId,unit_id:unitId,name:'Tema',position:1,status:'NEXT'}];
    if(sql.includes('FROM classrooms'))return [{revision:13n}];
    if(sql.includes('FROM activities a'))return [];
    if(sql.includes('FROM study_plan_versions s') && sql.includes('version_number AS plan_version'))
      return [{id:planId,title:'Plan',created_at:now,extension:'pdf',size_bytes:45n,ready:true,current_plan:true}];
    if(sql.includes('FROM materials s'))return [{id:materialId,title:'En preparación',created_at:now,extension:'pdf',size_bytes:45n,ready:false}];
    if(sql.includes('FROM study_plan_versions s'))return [{title:'Plan',file_id:planId,digest:'a'.repeat(64),extension:'pdf',size_bytes:45n,purpose:'plan',target_id:null,ready:true}];
    return [];
  }};
  const snapshot=await rebuildGrounding(tx,context,full);
  assert.deepEqual(snapshot.curriculum.selectedTopicIds,[topicId]);
  assert.deepEqual(snapshot.sources.map(x=>x.sourceId),['plan:'+planId]);
  assert.deepEqual(snapshot.classroomScope,{revision:'13',excluded:[{sourceId:'material:'+materialId,title:'En preparación',reason:'FILE_NOT_READY'}]});
});

test('academic and private documents share the aggregate limit without dropping either',async()=>{
  const {assertFoxyFileQuota}=await import('../grounding-rebuild.ts');
  const academic={fileId:crypto.randomUUID(),sizeBytes:12_000_000};
  const own={fileId:crypto.randomUUID(),sizeBytes:8_000_000};
  const snapshot={context,curriculum:null,sources:[{files:[academic]}],attachments:[own]};
  assert.doesNotThrow(()=>assertFoxyFileQuota(snapshot));
  assert.throws(()=>assertFoxyFileQuota({...snapshot,attachments:[{...own,sizeBytes:8_000_001}]}),{code:'AI_INPUT_LIMIT'});
  assert.throws(()=>assertFoxyFileQuota({...snapshot,attachments:Array.from({length:6},()=>({fileId:crypto.randomUUID(),sizeBytes:1}))}),{code:'AI_INPUT_LIMIT'});
});
