import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from "../../../../../../tests/helpers/load-ts-module.mjs";
const assetId=randomUUID(),roomId=randomUUID(),pubId=randomUUID(),otherAsset=randomUUID();
const publication={id:pubId,sourceKind:'VISUAL',assetId,assetRevision:'2',classroomId:roomId,title:'Recurso',unitId:null,topicId:null,state:'READY',revision:'3'};
const inspection={publication,classroomRevision:'5',classroomArchived:false,errorCode:null,editorialSnapshot:{title:'Recurso',description:'Texto congelado',revision:'0'}};
async function fixture(){const calls=[];let failPrepare=false,failConfirm=false;const client={prepareVisualPublication:async(id,input)=>{calls.push(['prepare',id,input]);if(failPrepare){failPrepare=false;throw Object.assign(Error(),{code:'SERVICE_UNAVAILABLE'});}return {created:true,publication};},listVisualPublications:async()=>({items:[publication],nextAfterId:null}),inspectPublication:async id=>{calls.push(['inspect',id]);return inspection},confirmPublication:async(id,input)=>{calls.push(['confirm',id,input]);if(failConfirm){failConfirm=false;throw Object.assign(Error(),{code:'SERVICE_UNAVAILABLE'});}return {publicationId:pubId,materialId:randomUUID(),publicationRevision:'4',classroomRevision:'6'}}};
 const {createFoxyVisualPublicationController}=loadTsModule("apps/web/src/features/foxy/model/foxy-visual-publication-controller.ts");const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>({id:roomId,name:'BiologÃ­a',role:'teacher',archived:false,revision:'5',units:[]}),onChange:()=>{}});c.syncAsset(assetId,'2');await c.setClassroomId(roomId);c.setTitle('Recurso');return {c,calls,client,uncertainPrepare:()=>failPrepare=true,uncertainConfirm:()=>failConfirm=true};}
test('uncertain preparation retries the identical request and never auto-confirms',async()=>{const f=await fixture();try{f.uncertainPrepare();await f.c.prepare();assert.ok(f.c.getState().pending);await f.c.retry();const writes=f.calls.filter(x=>x[0]==='prepare');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);}finally{f.c.dispose();}});
test('review fetches current publication and requires explicit consent; uncertain confirmation retries identical request',async()=>{const f=await fixture();try{await f.c.prepare();await f.c.review();assert.ok(f.calls.some(c=>c[0]==='inspect'));await f.c.confirm();assert.equal(f.calls.filter(c=>c[0]==='confirm').length,0);f.c.setReviewed(true);f.uncertainConfirm();await f.c.confirm();assert.ok(f.c.getState().pending);await f.c.retry();const writes=f.calls.filter(x=>x[0]==='confirm');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);assert.ok(f.c.getState().receipt);}finally{f.c.dispose();}});
test('switching asset invalidates previous preview and pending commands',async()=>{const f=await fixture();try{f.uncertainPrepare();await f.c.prepare();f.c.syncAsset(otherAsset,'1');await f.c.retry();assert.equal(f.calls.filter(c=>c[0]==='prepare').length,1);assert.equal(f.c.getState().pending,null);assert.equal(f.c.getState().publication,null);}finally{f.c.dispose();}});

test('edited title cannot silently confirm a different prepared title',async()=>{
 const f=await fixture();try{await f.c.prepare();f.c.setTitle('TÃ­tulo nuevo');await f.c.review();f.c.setReviewed(true);await f.c.confirm();
  const state=f.c.getState();assert.ok(f.calls.filter(c=>c[0]==='confirm').length===0 || state.title===publication.title,'a different displayed title must never silently confirm the prepared title');
 }finally{f.c.dispose();}
});

test('failed reread removes private snapshot and authority denial clears the revoked preparation',async()=>{
 for(const operation of ['refresh','review'])for(const code of ['FORBIDDEN','NOT_FOUND','AUTH_REQUIRED','SERVICE_UNAVAILABLE']){
  const f=await fixture();try{await f.c.prepare();await f.c.review();f.c.setReviewed(true);assert.ok(f.c.getState().inspection.editorialSnapshot);
   f.client.inspectPublication=async()=>{throw Object.assign(Error(),{code});};await f.c[operation]();const state=f.c.getState();assert.equal(state.inspection,null);assert.equal(state.reviewed,false);assert.equal(state.reviewReady,false);
   if(code!=='SERVICE_UNAVAILABLE'){assert.equal(state.publication,null);assert.deepEqual(state.preparations,[]);}
   await f.c.confirm();assert.equal(f.calls.filter(call=>call[0]==='confirm').length,0);
  }finally{f.c.dispose();}
 }
});

test('controller cannot confirm a copy without its frozen content projection',async()=>{
 const f=await fixture();try{await f.c.prepare();f.client.inspectPublication=async()=>({...inspection,editorialSnapshot:undefined});await f.c.review();f.c.setReviewed(true);await f.c.confirm();assert.equal(f.calls.filter(call=>call[0]==='confirm').length,0);}finally{f.c.dispose();}
});

test('revoked publication fences an already authorized but delayed history page',async()=>{
 const {createFoxyVisualPublicationController}=loadTsModule('apps/web/src/features/foxy/model/foxy-visual-publication-controller.ts');
 let release,historySignal;const gate=new Promise(resolve=>release=resolve);
 const client={listVisualPublications:async(_id,page,signal)=>{if(!page.afterId)return {items:[publication],nextAfterId:pubId};historySignal=signal;return gate;},inspectPublication:async()=>inspection};
 const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>({id:roomId,role:'teacher',archived:false,revision:'5',units:[]}),onChange(){}});
 try{c.syncAsset(assetId,'2');await new Promise(resolve=>setImmediate(resolve));assert.ok(c.getState().inspection);
  const page=c.loadMore();client.inspectPublication=async()=>{throw Object.assign(Error(),{code:'NOT_FOUND'});};await c.refresh();assert.deepEqual(c.getState().preparations,[]);
  release({items:[{...publication,id:randomUUID(),title:'Título privado tardío'}],nextAfterId:null});await page;
  assert.deepEqual(c.getState().preparations,[]);assert.equal(c.getState().inspection,null);assert.equal(c.getState().publication,null);assert.equal(c.getState().loadingHistory,false);assert.equal(historySignal.aborted,true);
 }finally{release?.({items:[],nextAfterId:null});c.dispose();}
});

test('history page denial invalidates the selected private copy and review',async()=>{
 const {createFoxyVisualPublicationController}=loadTsModule('apps/web/src/features/foxy/model/foxy-visual-publication-controller.ts');
 for(const code of ['FORBIDDEN','NOT_FOUND','AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED']){
  const client={listVisualPublications:async(_id,page)=>{if(page.afterId)throw Object.assign(Error(),{code});return {items:[publication],nextAfterId:pubId};},inspectPublication:async()=>inspection};
  const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>({id:roomId,role:'teacher',archived:false,revision:'5',units:[]}),onChange(){}});
  try{c.syncAsset(assetId,'2');await new Promise(resolve=>setImmediate(resolve));await c.review();c.setReviewed(true);assert.ok(c.getState().inspection);await c.loadMore();
   const state=c.getState();assert.equal(state.inspection,null);assert.equal(state.publication,null);assert.deepEqual(state.preparations,[]);assert.equal(state.loadingHistory,false);assert.equal(state.reviewReady,false);assert.equal(state.reviewed,false);
  }finally{c.dispose();}
 }
});

test('older refresh cannot revive a discarded visual publication',async()=>{
 const f=await fixture();let resolve;const gate=new Promise(r=>resolve=r);let count=0;
 try{await f.c.prepare();f.client.inspectPublication=async()=>++count===1?gate:{...inspection,publication:{...publication,state:'DISCARDED',revision:'4'}};
  const old=f.c.refresh();await Promise.resolve();await f.c.refresh();resolve(inspection);await old;
  assert.equal(f.c.getState().publication.state,'DISCARDED');assert.equal(f.c.getState().publication.revision,'4');
 }finally{f.c.dispose();}
});

test('late classroom hydration cannot replace the destination verified by review',async()=>{
 let resolveOld;const old=new Promise(r=>resolveOld=r);let count=0;
 const room=name=>({id:roomId,name,role:'teacher',archived:false,revision:'5',units:[]});
 const client={listVisualPublications:async()=>({items:[publication],nextAfterId:null}),inspectPublication:async()=>inspection,prepareVisualPublication:async()=>{throw Error()},confirmPublication:async()=>{throw Error()}};
 const {createFoxyVisualPublicationController}=loadTsModule("apps/web/src/features/foxy/model/foxy-visual-publication-controller.ts");
 const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>++count===1?old:room('Fresh'),onChange:()=>{}});
 try{c.syncAsset(assetId,'2');await new Promise(r=>setTimeout(r,0));await c.review();assert.equal(c.getState().reviewReady,true);assert.equal(c.getState().destination.name,'Fresh');resolveOld(room('Old'));await new Promise(r=>setTimeout(r,0));assert.equal(c.getState().destination.name,'Fresh');}finally{resolveOld(room('Old'));c.dispose();}
});
