import test from 'node:test';
import assert from 'node:assert/strict';
import { createFoxyPublicationRepository } from '../publication-repository.ts';

test('the same creation revision in the same classroom returns the already prepared publication',async()=>{
  const owner=crypto.randomUUID(), resource=crypto.randomUUID(), classroom=crypto.randomUUID(), id=crypto.randomUUID();
  const existing={id,resource_id:resource,resource_revision:1n,classroom_id:classroom,unit_id:null,topic_id:null,title:'Edición publicada',state:'PUBLISHED',revision:3n};
  const tx={query:async (sql,...args)=>{
    if(sql.includes('FROM users'))return [{id:owner}];
    if(sql.includes('FROM foxy_resources'))return [{title:'Edición',markdown:'Texto',revision:1n}];
    if(sql.includes('request_id=$2'))return [];
    if(sql.includes('FROM classrooms c WHERE'))return [{id:classroom}];
    if(sql.includes('FROM foxy_publications')&&sql.includes('resource_revision')) {
      assert.deepEqual(args,[owner,resource,'1',classroom]); return [existing];
    }
    if(sql.includes('INSERT'))throw new Error('Unexpected duplicate publication');
    return [];
  }};
  const result=await createFoxyPublicationRepository().prepare(tx,owner,resource,
    {requestId:crypto.randomUUID(),resourceRevision:'1',classroomId:classroom,title:'Otro título',unitId:null,topicId:null});
  assert.equal(result.created,false);
  assert.equal(result.publication.id,id);
});
