import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const id=randomUUID(),resourceId=randomUUID(),classroomId=randomUUID(),owner=randomUUID(),request={session:'synthetic'},tx={name:'transaction'};
const prepare={requestId:randomUUID(),resourceRevision:'0',classroomId,title:'Guía',unitId:null,topicId:null};
const confirm={requestId:randomUUID(),publicationRevision:'0',classroomRevision:'0',confirm:true};
const publication={id,resourceId,resourceRevision:'0',classroomId,unitId:null,topicId:null,title:'Guía',state:'PREPARING',revision:'0'};
function fixture(){const calls=[],options={uow:{run:async(req,write,fn)=>{calls.push(['uow',req,write]);return fn(tx,{id:owner,accountRole:'teacher'});}},
 publications:{prepare:async(...args)=>{calls.push(['prepare',...args]);return {created:true,publication};},inspect:async(...args)=>{calls.push(['inspect',...args]);return {publication,classroomRevision:'2',classroomArchived:false,errorCode:null};}},
 confirmations:{confirm:async(...args)=>{calls.push(['confirm',...args]);return {publicationId:id,materialId:randomUUID(),publicationRevision:'1',classroomRevision:'3'};}}};return {options,calls};}
async function create(f){const {createFoxyPublicationService}=await import('./publication-service.ts');return createFoxyPublicationService(f.options);}
test('prepare and confirm use verified UoW write with real request, transaction and actor',async()=>{const f=fixture(),s=await create(f);
 const p=await s.prepare(request,resourceId,prepare),c=await s.confirm(request,id,confirm);assert.equal(p.created,true);assert.equal(c.publicationId,id);
 assert.deepEqual(f.calls.filter(a=>a[0]==='uow').map(a=>a.slice(1)),[[request,true],[request,true]]);
 const prep=f.calls.find(a=>a[0]==='prepare'),conf=f.calls.find(a=>a[0]==='confirm');assert.deepEqual(prep.slice(1,4),[tx,owner,resourceId]);assert.deepEqual(conf.slice(1,5),[tx,request,owner,id]);
});
test('inspect uses a read UoW and only the authorized public projection',async()=>{const f=fixture(),s=await create(f),v=await s.inspect(request,id);
 assert.deepEqual(f.calls[0],['uow',request,false]);assert.deepEqual(f.calls[1],['inspect',tx,owner,id]);
 assert.deepEqual(Object.keys(v).sort(),['publication','classroomRevision','classroomArchived','errorCode'].sort());assert.deepEqual(v.publication,publication);
});
test('inspect maps unknown FAILED errors to FILE_NOT_READY and retains only approved domain codes',async()=>{for(const [input,output] of [['AI_INPUT_LIMIT','AI_INPUT_LIMIT'],['INVALID_INPUT','INVALID_INPUT'],['FILE_NOT_READY','FILE_NOT_READY'],['secret driver error','FILE_NOT_READY']]){
 const f=fixture();f.options.publications.inspect=async()=>({publication:{...publication,state:'FAILED'},classroomRevision:'0',classroomArchived:false,errorCode:input});
 const s=await create(f);assert.equal((await s.inspect(request,id)).errorCode,output);
}});
test('invalid input or denied identity never reaches repository operations',async()=>{const f=fixture(),s=await create(f);
 await assert.rejects(s.prepare(request,resourceId,{...prepare,extra:true}));await assert.rejects(s.confirm(request,id,{...confirm,confirm:false}));
 f.options.uow.run=async()=>{throw Object.assign(Error('FORBIDDEN'),{code:'FORBIDDEN'});};await assert.rejects(s.inspect(request,id),e=>e?.code==='FORBIDDEN');
 assert.ok(!f.calls.some(a=>['prepare','confirm','inspect'].includes(a[0])));
});

test('list resource publications uses read UoW and returns cursor without private fields',async()=>{
 const f=fixture(),s=await create(f);f.options.publications.list=async(...args)=>{f.calls.push(['list',...args]);return {items:[publication],nextAfterId:id};};
 const page=await s.list(request,resourceId,{limit:20,afterId:null});assert.deepEqual(f.calls[0],['uow',request,false]);
 assert.deepEqual(f.calls[1],['list',tx,owner,resourceId,{limit:20,afterId:null}]);assert.deepEqual(page,{items:[publication],nextAfterId:id});
});
