import test from 'node:test';
import assert from 'node:assert/strict';
const ready={phase:'ready',uploadStatus:'COMPLETED',reservationReleased:false,blobDeleted:false,proofValid:true,leaseActive:false,rendererCompatible:true};
const facts=(changes={})=>({state:'FAILED',errorCode:'FILE_NOT_READY',sourceCurrent:true,destinationUsable:true,associationsValid:true,file:null,referenced:false,cleanupError:null,...changes});
async function decide(value){const api=await import("../../domain/management-policy.ts");assert.equal(typeof api.decideFoxyPublicationManagement,'function');return api.decideFoxyPublicationManagement(value);}
test('retry is available only for FAILED and usable context with recoverable artifact',async()=>{
 const yes=[facts(),facts({file:ready}),facts({file:{...ready,phase:'reserved',uploadStatus:'STARTED',proofValid:false}}),
  facts({file:{...ready,phase:'receiving',uploadStatus:'UPLOADING',proofValid:false}}),facts({file:{...ready,phase:'inspecting',uploadStatus:'UPLOADING',proofValid:false}})];
 for(const value of yes)assert.equal((await decide(value)).canRetry,true,JSON.stringify(value));
 for(const value of [facts({state:'PREPARING'}),facts({state:'READY'}),facts({state:'PUBLISHED'}),facts({state:'DISCARDED'}),facts({sourceCurrent:false}),facts({destinationUsable:false}),facts({associationsValid:false}),facts({referenced:true}),facts({errorCode:'AI_INPUT_LIMIT'}),facts({errorCode:'INVALID_INPUT'})])
  assert.equal((await decide(value)).canRetry,false,JSON.stringify(value));
});
test('retry fails closed for deleted, rejected, active or incompatible file custody',async()=>{
 for(const change of [{phase:'rejected'},{phase:'deleting'},{phase:'deleted'},{blobDeleted:true},{phase:'receiving',leaseActive:true},{phase:'inspecting',leaseActive:true},{phase:'reserved',rendererCompatible:false},{phase:'ready',proofValid:false}])
  assert.equal((await decide(facts({file:{...ready,...change}}))).canRetry,false,JSON.stringify(change));
});
test('discard is available before publication even with stale or archived source; references block it',async()=>{
 for(const state of ['PREPARING','READY','FAILED'])for(const changes of [{},{sourceCurrent:false},{destinationUsable:false},{associationsValid:false}])
  assert.equal((await decide(facts({state,...changes}))).canDiscard,true,`${state} ${JSON.stringify(changes)}`);
 for(const state of ['PUBLISHED','DISCARDED'])assert.equal((await decide(facts({state}))).canDiscard,false,state);
 for(const state of ['PREPARING','READY','FAILED'])assert.equal((await decide(facts({state,referenced:true}))).canDiscard,false,state);
});


test('retryReason follows documented precedence and never exposes arbitrary error strings',async()=>{
 const cases=[[facts({state:'READY',sourceCurrent:false}),'STATE'],[facts({sourceCurrent:false,destinationUsable:false}),'SOURCE_CHANGED'],
  [facts({destinationUsable:false,errorCode:'INVALID_INPUT'}),'DESTINATION_UNAVAILABLE'],[facts({associationsValid:false}),'DESTINATION_UNAVAILABLE'],
  [facts({errorCode:'AI_INPUT_LIMIT',referenced:true}),'INVALID_RESOURCE'],[facts({errorCode:'INVALID_INPUT'}),'INVALID_RESOURCE'],
  [facts({referenced:true,file:{...ready,leaseActive:true}}),'REFERENCED'],[facts({file:{...ready,phase:'receiving',leaseActive:true}}),'BUSY'],
  [facts({file:{...ready,phase:'rejected'}}),'CONTENT_REJECTED'],[facts({file:{...ready,phase:'deleted'}}),'FILE_UNAVAILABLE'],[facts(),null]];
 for(const [value,reason] of cases)assert.equal((await decide(value)).retryReason,reason,JSON.stringify(value));
});

test('cleanupState is not requested until discarded and tracks absent, deleted or failed cleanup',async()=>{
 for(const state of ['PREPARING','READY','FAILED','PUBLISHED'])assert.equal((await decide(facts({state,cleanupError:'FILE_NOT_READY'}))).cleanupState,'NOT_REQUESTED');
 for(const [value,expected] of [[facts({state:'DISCARDED',file:null}),'DONE'],[facts({state:'DISCARDED',file:{...ready,blobDeleted:true}}),'DONE'],
  [facts({state:'DISCARDED',file:ready,cleanupError:'FILE_NOT_READY'}),'FAILED'],[facts({state:'DISCARDED',file:ready,cleanupError:null}),'PENDING']])assert.equal((await decide(value)).cleanupState,expected);
});

test('retry error allowlist accepts only FILE_NOT_READY and rejects missing or unknown codes',async()=>{
 assert.equal((await decide(facts({errorCode:'FILE_NOT_READY'}))).canRetry,true);
 for(const code of [null,'UNKNOWN','SERVICE_UNAVAILABLE','AI_INPUT_LIMIT','INVALID_INPUT']){
  const value=await decide(facts({errorCode:code}));assert.equal(value.canRetry,false,String(code));assert.equal(value.retryReason,'INVALID_RESOURCE',String(code));
 }
});


test('file retry requires exact phase and upload state with live reservation',async()=>{
 for(const phase of ['reserved','receiving','inspecting'])for(const status of ['STARTED','UPLOADING','FAILED'])
  assert.equal((await decide(facts({file:{...ready,phase,uploadStatus:status,proofValid:false}}))).canRetry,true,`${phase}/${status}`);
 for(const phase of ['reserved','receiving','inspecting'])for(const status of ['COMPLETED','CANCELLED','UNKNOWN']){
  const result=await decide(facts({file:{...ready,phase,uploadStatus:status,proofValid:false}}));assert.equal(result.canRetry,false,`${phase}/${status}`);assert.equal(result.retryReason,'FILE_UNAVAILABLE');}
 for(const change of [{phase:'reserved',uploadStatus:'STARTED',reservationReleased:true},{phase:'receiving',uploadStatus:'UPLOADING',reservationReleased:true},{phase:'mystery'},{phase:'ready',uploadStatus:'FAILED'},{phase:'ready',uploadStatus:'CANCELLED'}]){
  const result=await decide(facts({file:{...ready,...change}}));assert.equal(result.canRetry,false,JSON.stringify(change));assert.equal(result.retryReason,'FILE_UNAVAILABLE');}
 assert.equal((await decide(facts({file:{...ready,rendererCompatible:false}}))).canRetry,true,'ready proof does not depend on renderer version');
});

test('released reservation and unknown upload status never qualify for retry',async()=>{
 for(const change of [{phase:'reserved',uploadStatus:'STARTED',reservationReleased:true},{phase:'receiving',uploadStatus:'UPLOADING',reservationReleased:true},{phase:'reserved',uploadStatus:'UNKNOWN',reservationReleased:false}]){
  const result=await decide(facts({file:{...ready,...change}}));assert.equal(result.canRetry,false,JSON.stringify(change));assert.equal(result.retryReason,'FILE_UNAVAILABLE');}
});

test('valid READY file remains reusable when renderer version changes',async()=>{
 const result=await decide(facts({file:{...ready,rendererCompatible:false}}));assert.equal(result.canRetry,true);assert.equal(result.retryReason,null);
});


test('any non-null cleanup error including empty string is FAILED',async()=>{
 const result=await decide(facts({state:'DISCARDED',file:ready,cleanupError:''}));assert.equal(result.cleanupState,'FAILED');
});
