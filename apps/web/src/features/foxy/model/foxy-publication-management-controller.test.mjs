import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from "../../../../../../tests/helpers/load-ts-module.mjs";
const rid=randomUUID(),pid=randomUUID(),room=randomUUID(),reqid=randomUUID();
const resource={id:rid,conversationId:randomUUID(),sourceTurnId:randomUUID(),revision:'7',title:'Guía',markdown:'Texto'};
const publication={id:pid,resourceId:rid,resourceRevision:'7',classroomId:room,title:'Guía',unitId:null,topicId:null,state:'FAILED',revision:'5'};
const inspection={publication,classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'};
const management={publicationId:pid,publicationRevision:'5',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'};
const err=(code,status)=>Object.assign(Error('synthetic private diagnostic'),{code,status});
function fixture(){let editor={resource,dirty:true,busy:false,pending:null,conflict:null,draft:{title:'Sin guardar',markdown:'Borrador'}},history={selectedId:pid,inspection,items:[publication],staleResource:false},preparation={busy:false,pending:null},confirmation={busy:false,pending:null};
 const calls=[],reconciles=[],timers=[],responses=[],client={inspectPublicationManagement:async(...args)=>{calls.push(['get',...args]);return responses.shift()??management;},
 retryPublication:async(...args)=>{calls.push(['retry',...args]);const result=responses.shift();if(result instanceof Error)throw result;return result??{publicationId:pid,action:'RETRY',publicationRevision:'6'};},
 discardPublication:async(...args)=>{calls.push(['discard',...args]);const result=responses.shift();if(result instanceof Error)throw result;return result??{publicationId:pid,action:'DISCARD',publicationRevision:'6'};}};
 const options={client,resource:{getState:()=>editor},history:{getState:()=>history},preparation:{getState:()=>preparation},confirmation:{getState:()=>confirmation},onChange:()=>{},onReconcile:()=>reconciles.push('reconcile'),uuid:()=>reqid,
 setTimeout:(fn,ms)=>{const t={fn,ms,cleared:false};timers.push(t);return t;},clearTimeout:t=>{t.cleared=true;}};
 return {options,calls,reconciles,timers,responses,setHistory:v=>history=v,setEditor:v=>editor=v,setPreparation:v=>preparation=v,setConfirmation:v=>confirmation=v,getEditor:()=>editor};}
function create(f){const {createFoxyPublicationManagementController}=loadTsModule("apps/web/src/features/foxy/model/foxy-publication-management-controller.ts");return createFoxyPublicationManagementController(f.options);}
test('constructor is idle, refresh projects capabilities, retry retains dirty editor',async()=>{const f=fixture(),c=create(f);assert.equal(f.calls.length,0);c.syncContext();await c.refresh();assert.equal(c.getState().canRetry,true);
 assert.equal(await c.retryPreparation(),'applied');assert.deepEqual(f.calls.filter(x=>x[0]==='retry')[0].slice(1,3),[pid,{requestId:reqid,publicationRevision:'5'}]);assert.equal(f.getEditor().draft.markdown,'Borrador');assert.equal(f.reconciles.length,1);c.dispose();});
test('discard requires an explicit unchecked review and never erases editor',async()=>{const f=fixture(),c=create(f);c.syncContext();await c.refresh();c.reviewDiscard();assert.equal(c.getState().discardReviewed,false);await c.discard();assert.equal(f.calls.filter(x=>x[0]==='discard').length,0);
 c.setDiscardReviewed(true);assert.equal(await c.discard(),'applied');assert.deepEqual(f.calls.find(x=>x[0]==='discard')[2],{requestId:reqid,publicationRevision:'5',confirm:true});assert.equal(f.getEditor().draft.markdown,'Borrador');c.dispose();});
test('uncertain retry retains exact private intent across same-publication state advance',async()=>{const f=fixture(),c=create(f);c.syncContext();await c.refresh();f.responses.push(err('SERVICE_UNAVAILABLE',503));assert.equal(await c.retryPreparation(),'uncertain');assert.equal(c.getState().pending,'RETRY');
 const body=structuredClone(f.calls.find(x=>x[0]==='retry')[2]);f.setHistory({selectedId:pid,inspection:{...inspection,publication:{...publication,state:'PREPARING',revision:'6'}},items:[],staleResource:false});c.syncContext();assert.equal(await c.retryRequest(),'applied');assert.deepEqual(f.calls.filter(x=>x[0]==='retry')[1][2],body);c.dispose();});
test('malformed response never exposes private fields or enables action',async()=>{for(const value of [{...management,publicationId:randomUUID()},{...management,retryReason:'UNKNOWN'},{...management,canRetry:true,retryReason:'STATE'}]){const f=fixture(),c=create(f);f.responses.push(value);c.syncContext();await c.refresh();assert.equal(c.getState().canRetry,false);await c.retryPreparation();assert.equal(f.calls.filter(x=>x[0]==='retry').length,0);c.dispose();}});
test('discarded cleanup polls at five seconds until real DONE and never posts',async()=>{const f=fixture(),p={...publication,state:'DISCARDED',revision:'6'};f.setHistory({selectedId:pid,inspection:{...inspection,publication:p},items:[p],staleResource:false});
 f.responses.push({...management,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:false,cleanupState:'PENDING'},{...management,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:false,cleanupState:'DONE'});
 const c=create(f);c.syncContext();await c.refresh();const timer=f.timers.find(t=>!t.cleared);assert.equal(timer.ms,5000);timer.fn();await new Promise(resolve=>setImmediate(resolve));assert.equal(c.getState().management.cleanupState,'DONE');assert.equal(f.calls.some(x=>x[0]==='retry'||x[0]==='discard'),false);c.dispose();});


test('duplicate command is single-flight and malformed receipt keeps the original intent',async()=>{const f=fixture();let release;const gate=new Promise(r=>release=r);f.options.client.retryPublication=async(...args)=>{f.calls.push(['retry',...args]);return gate;};
 const c=create(f);c.syncContext();await c.refresh();const one=c.retryPreparation(),two=c.retryPreparation();await Promise.resolve();assert.equal(f.calls.filter(x=>x[0]==='retry').length,1);
 release({publicationId:randomUUID(),action:'RETRY',publicationRevision:'6'});assert.equal(await one,'uncertain');await two;assert.equal(c.getState().pending,'RETRY');assert.equal(c.getState().receipt,null);c.dispose();});
test('changed selection and disposal suppress late reads and future mutations',async()=>{const f=fixture();let release;const gate=new Promise(r=>release=r);f.options.client.inspectPublicationManagement=async(...args)=>{f.calls.push(['get',...args]);return gate;};
 const c=create(f);c.syncContext();const pending=c.refresh();f.setHistory({selectedId:randomUUID(),inspection:null,items:[],staleResource:false});c.syncContext();release(management);await pending;assert.equal(c.getState().management,null);await c.retryPreparation();assert.equal(f.calls.filter(x=>x[0]==='retry').length,0);c.dispose();await c.refresh();assert.equal(f.calls.filter(x=>x[0]==='get').length,1);});
test('definite conflict clears intent and requests reconciliation without repeating mutation',async()=>{const f=fixture(),c=create(f);c.syncContext();await c.refresh();f.responses.push(err('CONFLICT',409));assert.equal(await c.retryPreparation(),'conflict');
 assert.equal(c.getState().pending,null);assert.equal(c.getState().canRetry,false);assert.equal(f.reconciles.length,1);await c.retryRequest();assert.equal(f.calls.filter(x=>x[0]==='retry').length,1);assert.equal(f.getEditor().draft.markdown,'Borrador');c.dispose();});


test('mutations recheck live conflicting state and selection even without syncContext',async()=>{
 for(const change of ['selection','save','prepare','confirm']){const f=fixture(),c=create(f);c.syncContext();await c.refresh();
  if(change==='selection')f.setHistory({selectedId:randomUUID(),inspection:null,items:[],staleResource:false});
  if(change==='save')f.setEditor({...f.getEditor(),busy:true,pending:'SAVE'});if(change==='prepare')f.setPreparation({busy:true,pending:'PREPARE'});if(change==='confirm')f.setConfirmation({busy:true,pending:'CONFIRM'});
  await c.retryPreparation();assert.equal(f.calls.filter(x=>x[0]==='retry').length,0,change);c.dispose();}
});
test('newer management revision establishes floor and reconciles once, even when older read arrives',async()=>{
 const f=fixture(),c=create(f);c.syncContext();f.responses.push({...management,publicationRevision:'6'});await c.refresh();assert.equal(f.reconciles.length,1);
 f.responses.push(management);await c.refresh();assert.equal(c.getState().canRetry,false);f.responses.push({...management,publicationRevision:'6'});await c.refresh();assert.equal(f.reconciles.length,1);c.dispose();
});
test('refresh is single-flight during synchronous observer reentry',async()=>{
 const f=fixture();let c,reentered=false;f.options.onChange=state=>{if(state.loading&&!reentered){reentered=true;void c.refresh();}};c=create(f);c.syncContext();await c.refresh();assert.equal(f.calls.filter(x=>x[0]==='get').length,1);c.dispose();
});
test('reconcile callback changing selection cannot let old response mutate new state',async()=>{
 const f=fixture(),newId=randomUUID();let c;f.options.onReconcile=()=>{f.setHistory({selectedId:newId,inspection:null,items:[],staleResource:false});c.syncContext();};
 c=create(f);c.syncContext();f.responses.push({...management,publicationRevision:'6'});await c.refresh();assert.equal(c.getState().management,null);assert.equal(c.getState().error,null);c.dispose();
});
for(const mode of ['max','published','history'])test(`management cannot enable mutation for ${mode}`,async()=>{
 {const f=fixture();let p={...publication};let m={...management};
  if(mode==='max'){p.revision='9223372036854775807';m.publicationRevision=p.revision;}
  if(mode==='published')p.state='PUBLISHED';if(mode==='history')f.setHistory({selectedId:pid,inspection,items:[{...publication,state:'PUBLISHED',revision:'5'}],staleResource:false});
  if(mode!=='history')f.setHistory({selectedId:pid,inspection:{...inspection,publication:p},items:[p],staleResource:false});f.responses.push(m);
  const c=create(f);c.syncContext();await c.refresh();assert.equal(c.getState().canRetry,false,mode);assert.equal(c.getState().canReviewDiscard,false,mode);await c.retryPreparation();assert.equal(f.calls.filter(x=>x[0]==='retry').length,0,mode);c.dispose();}
});


for(const change of [{title:'Otro título'},{classroomId:randomUUID()}])test(`discard review invalidates same-revision metadata change ${Object.keys(change)[0]}`,async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.refresh();c.reviewDiscard();c.setDiscardReviewed(true);assert.equal(c.getState().canDiscard,true);
 const changed={...publication,...change};f.setHistory({selectedId:pid,inspection:{...inspection,publication:changed},items:[changed],staleResource:false});c.syncContext();
 assert.equal(c.getState().discardReview,null);assert.equal(c.getState().canDiscard,false);await c.discard();assert.equal(f.calls.filter(x=>x[0]==='discard').length,0);c.dispose();
});
test('asynchronous reconciliation rejection is handled and preserves accepted receipt',async()=>{
 const f=fixture(),unhandled=[];const listener=e=>unhandled.push(e);process.on('unhandledRejection',listener);
 try{f.options.onReconcile=()=>Promise.reject(Error('synthetic private reconcile failure'));const c=create(f);c.syncContext();await c.refresh();assert.equal(await c.retryPreparation(),'applied');
  await new Promise(resolve=>setImmediate(resolve));assert.equal(unhandled.length,0);assert.deepEqual(c.getState().receipt,{publicationId:pid,action:'RETRY',publicationRevision:'6'});c.dispose();
 }finally{process.off('unhandledRejection',listener);}
});


for(const action of ['RETRY','DISCARD'])test(`management ${action} reserves busy and pending synchronously before reentry`,async()=>{
 const f=fixture();let uuidCalls=0,resolve;f.options.uuid=()=>{uuidCalls++;return reqid;};const gate=new Promise(r=>resolve=r);
 f.options.client[action==='RETRY'?'retryPublication':'discardPublication']=async(...args)=>{f.calls.push([action,...args]);return gate;};
 const c=create(f);c.syncContext();await c.refresh();if(action==='DISCARD'){c.reviewDiscard();c.setDiscardReviewed(true);}
 const first=action==='RETRY'?c.retryPreparation():c.discard();assert.equal(c.getState().busy,true);assert.equal(c.getState().pending,action);
 const second=action==='RETRY'?c.retryPreparation():c.discard();await Promise.resolve();assert.equal(uuidCalls,1);assert.equal(f.calls.filter(x=>x[0]===action).length,1);
 resolve({publicationId:pid,action,publicationRevision:'6'});await Promise.all([first,second]);c.dispose();
});


test('DONE floor survives selection A→B→A within one resource and rejects old pending state',async()=>{
 const f=fixture(),a={...publication,state:'DISCARDED',revision:'6'},bid=randomUUID(),b={...a,id:bid};
 const state=p=>({selectedId:p.id,inspection:{...inspection,publication:p},items:[p],staleResource:false});
 const done={...management,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:false,cleanupState:'DONE'},pending={...done,cleanupState:'PENDING'};
 f.setHistory(state(a));const c=create(f);c.syncContext();f.responses.push(done);await c.refresh();assert.equal(c.getState().management.cleanupState,'DONE');
 f.setHistory(state(b));c.syncContext();f.setHistory(state(a));c.syncContext();f.responses.push(pending);await c.refresh();
 assert.equal(c.getState().management,null);assert.equal(c.getState().canRetry,false);assert.equal(c.getState().canReviewDiscard,false);assert.equal(f.timers.filter(t=>!t.cleared).length,0);
 f.responses.push(done);await c.refresh();assert.equal(c.getState().management.cleanupState,'DONE');c.dispose();
});
test('DONE floor does not contaminate a new resource even if selection id is repeated',async()=>{
 const f=fixture(),a={...publication,state:'DISCARDED',revision:'6'},done={...management,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:false,cleanupState:'DONE'};
 f.setHistory({selectedId:pid,inspection:{...inspection,publication:a},items:[a],staleResource:false});const c=create(f);c.syncContext();f.responses.push(done);await c.refresh();
 const nextResource={...resource,id:randomUUID()},nextPublication={...a,resourceId:nextResource.id};f.setEditor({...f.getEditor(),resource:nextResource});f.setHistory({selectedId:pid,inspection:{...inspection,publication:nextPublication},items:[nextPublication],staleResource:false});c.syncContext();
 f.responses.push({...done,cleanupState:'PENDING'});await c.refresh();assert.equal(c.getState().management.cleanupState,'PENDING');assert.ok(f.timers.some(t=>!t.cleared&&t.ms===5000));c.dispose();
});


test('ack observer changing selection prevents reconcile of the new selection',async()=>{
 const f=fixture(),newId=randomUUID();let c;f.options.onChange=state=>{if(state.receipt){f.setHistory({selectedId:newId,inspection:null,items:[],staleResource:false});c.syncContext();}};
 c=create(f);c.syncContext();await c.refresh();await c.retryPreparation();assert.equal(f.reconciles.length,0);assert.equal(c.getState().receipt,null);c.dispose();
});
test('each observed newer management floor reconciles once even for 6→7→6',async()=>{
 const f=fixture(),c=create(f);c.syncContext();for(const revision of ['6','7','6']){f.responses.push({...management,publicationRevision:revision});await c.refresh();}
 assert.equal(f.reconciles.length,2);assert.equal(c.getState().canRetry,false);c.dispose();
});
test('accepted receipt advances floor so older in-flight management read cannot reactivate retry',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.refresh();let finishWrite,finishRead;
 const write=new Promise(r=>finishWrite=r),read=new Promise(r=>finishRead=r);f.options.client.retryPublication=async(...args)=>{f.calls.push(['retry',...args]);return write;};
 f.options.client.inspectPublicationManagement=async(...args)=>{f.calls.push(['get',...args]);return read;};const posting=c.retryPreparation(),reading=c.refresh();
 finishWrite({publicationId:pid,action:'RETRY',publicationRevision:'6'});assert.equal(await posting,'applied');finishRead(management);await reading;
 assert.equal(c.getState().canRetry,false);assert.equal(c.getState().management,null);await c.retryPreparation();assert.equal(f.calls.filter(x=>x[0]==='retry').length,1);c.dispose();
});


for(const state of ['PUBLISHED','DISCARDED'])test(`terminal preparation ${state} at same revision blocks stale management actions`,async()=>{
 const f=fixture();f.setPreparation({busy:false,pending:null,result:{...publication,state}});const c=create(f);c.syncContext();await c.refresh();
 assert.equal(c.getState().canRetry,false);assert.equal(c.getState().canReviewDiscard,false);await c.retryPreparation();c.reviewDiscard();assert.equal(f.calls.filter(x=>x[0]==='retry').length,0);c.dispose();
});


test('historical retry receipt never lowers an already observed higher management floor',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.refresh();f.responses.push(err('SERVICE_UNAVAILABLE',503));assert.equal(await c.retryPreparation(),'uncertain');
 f.responses.push({...management,publicationRevision:'20'});await c.refresh();assert.equal(f.reconciles.length,1);
 f.responses.push({publicationId:pid,action:'RETRY',publicationRevision:'6'});assert.equal(await c.retryRequest(),'applied');assert.equal(c.getState().receipt.publicationRevision,'6');
 const p={...publication,state:'PREPARING',revision:'6'};f.setHistory({selectedId:pid,inspection:{...inspection,publication:p},items:[p],staleResource:false});c.syncContext();
 f.responses.push({...management,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:true});await c.refresh();
 assert.equal(c.getState().management,null);assert.equal(c.getState().canRetry,false);assert.equal(c.getState().canReviewDiscard,false);assert.equal(c.getState().receipt.publicationRevision,'6');c.dispose();
});


test('DONE floor survives deselection and reselection while resource remains open',async()=>{
 const f=fixture(),a={...publication,state:'DISCARDED',revision:'6'},done={...management,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:false,cleanupState:'DONE'};
 const selected={selectedId:pid,inspection:{...inspection,publication:a},items:[a],staleResource:false};f.setHistory(selected);const c=create(f);c.syncContext();f.responses.push(done);await c.refresh();assert.equal(c.getState().management.cleanupState,'DONE');
 f.setHistory({selectedId:null,inspection:null,items:[],staleResource:false});c.syncContext();f.setHistory(selected);c.syncContext();f.responses.push({...done,cleanupState:'PENDING'});await c.refresh();
 assert.equal(c.getState().management,null);assert.equal(c.getState().canRetry,false);assert.equal(c.getState().canReviewDiscard,false);assert.equal(f.timers.filter(t=>!t.cleared).length,0);c.dispose();
});


for(const change of [{title:'No revisado'},{classroomId:randomUUID()}])test(`discard revalidates frozen review before POST without sync: ${Object.keys(change)[0]}`,async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.refresh();c.reviewDiscard();c.setDiscardReviewed(true);assert.equal(c.getState().canDiscard,true);
 const changed={...publication,...change};f.setHistory({selectedId:pid,inspection:{...inspection,publication:changed},items:[changed],staleResource:false});
 await c.discard();assert.equal(f.calls.filter(x=>x[0]==='discard').length,0);c.dispose();
});


test('checkbox cannot acknowledge stale frozen discard review without sync',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.refresh();c.reviewDiscard();assert.equal(c.getState().discardReviewed,false);
 const changed={...publication,title:'Título no revisado'};f.setHistory({selectedId:pid,inspection:{...inspection,publication:changed},items:[changed],staleResource:false});
 c.setDiscardReviewed(true);assert.equal(c.getState().discardReviewed,false);assert.equal(c.getState().canDiscard,false);assert.equal(f.calls.filter(x=>x[0]==='discard').length,0);c.dispose();
});

test('text management does not retry or discard a VISUAL inspection',async()=>{
 const f=fixture(),visual={id:pid,sourceKind:'VISUAL',assetId:randomUUID(),assetRevision:'2',classroomId:room,title:'Imagen',unitId:null,topicId:null,state:'FAILED',revision:'5'};
 f.setHistory({selectedId:pid,inspection:{...inspection,publication:visual},items:[visual],staleResource:false});const c=create(f);c.syncContext();await c.refresh();await c.retryPreparation();c.reviewDiscard();c.setDiscardReviewed(true);await c.discard();
 assert.equal(c.getState().canRetry,false);assert.equal(f.calls.filter(x=>x[0]==='retry'||x[0]==='discard').length,0);c.dispose();
});
