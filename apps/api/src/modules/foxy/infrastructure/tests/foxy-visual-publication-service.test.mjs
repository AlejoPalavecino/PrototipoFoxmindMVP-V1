import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const owner=randomUUID(),assetId=randomUUID(),classroomId=randomUUID(),id=randomUUID(),request={session:'synthetic'},tx={};
const input={requestId:randomUUID(),assetRevision:'2',classroomId,title:'Ilustración revisada',unitId:null,topicId:null};
const publication={id,sourceKind:'VISUAL',assetId,assetRevision:'2',classroomId,title:input.title,unitId:null,topicId:null,state:'PREPARING',revision:'0'};
function fixture(){const calls=[];let first=true;const options={uow:{run:async(req,write,fn)=>{calls.push(['uow',req,write]);return fn(tx,{id:owner,accountRole:'teacher'});}},visualPublications:{prepare:async(...args)=>{calls.push(['prepare',...args]);const created=first;first=false;return {created,publication};},list:async(...args)=>{calls.push(['list',...args]);return {items:[publication],nextAfterId:null};}},confirmations:{confirm:async(...args)=>{calls.push(['confirm',...args]);return {publicationId:id,materialId:randomUUID(),publicationRevision:'3',classroomRevision:'2'};}}};return {options,calls};}
test('visual prepare and exact replay retain asset identity and do not publish automatically',async()=>{
 const {createFoxyPublicationService}=await import("../../application/publication-service.ts"),f=fixture(),s=createFoxyPublicationService(f.options);
 const a=await s.prepareVisual(request,assetId,input),b=await s.prepareVisual(request,assetId,input);assert.equal(a.created,true);assert.equal(b.created,false);assert.deepEqual(a.publication,b.publication);assert.equal(a.publication.sourceKind,'VISUAL');
 assert.deepEqual(f.calls.filter(c=>c[0]==='prepare').map(c=>c.slice(1,4)),[[tx,owner,assetId],[tx,owner,assetId]]);assert.equal(f.calls.filter(c=>c[0]==='confirm').length,0);
});
test('visual publications list uses owner read transaction and strict inputs fail before writes',async()=>{
 const {createFoxyPublicationService}=await import("../../application/publication-service.ts"),f=fixture(),s=createFoxyPublicationService(f.options);
 assert.deepEqual(await s.listVisual(request,assetId,{limit:10,afterId:null}),{items:[publication],nextAfterId:null});assert.deepEqual(f.calls[0],['uow',request,false]);assert.deepEqual(f.calls[1],['list',tx,owner,assetId,{limit:10,afterId:null}]);
 for(const bad of [{...input,extra:true},{...input,title:'\n'},{...input,assetRevision:'bad'}])await assert.rejects(s.prepareVisual(request,assetId,bad));assert.equal(f.calls.filter(c=>c[0]==='prepare').length,0);
});
