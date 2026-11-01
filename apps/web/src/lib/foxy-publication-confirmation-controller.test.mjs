import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
const rid=randomUUID(),pid=randomUUID(),room=randomUUID(),unit=randomUUID(),topic=randomUUID(),reqid=randomUUID();
const resource={id:rid,conversationId:randomUUID(),sourceTurnId:randomUUID(),revision:'7',title:'Guía',markdown:'Texto'};
const publication={id:pid,resourceId:rid,resourceRevision:'7',classroomId:room,title:'Guía',unitId:unit,topicId:topic,state:'READY',revision:'5'};
const detail={id:room,name:'Biología',subject:'Ciencias',division:'A',academicYear:2026,timezone:'UTC',coverKey:'explore',archived:false,teacher:'Docente',role:'teacher',revision:'12',units:[{id:unit,name:'Unidad',position:0,topics:[{id:topic,name:'Tema',status:'PENDING'}]}],plans:[]};
const inspection={publication,classroomRevision:'12',classroomArchived:false,errorCode:null};
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture(){let editor={resource,dirty:false,busy:false,pending:null,conflict:null},history={selectedId:pid,inspection,staleResource:false},preparation={pending:null,busy:false};const calls=[],queue=[];
 const client={getResource:async(...args)=>{calls.push(['resource',...args]);return resource;},inspectPublication:async(...args)=>{calls.push(['inspect',...args]);return inspection;},confirmPublication:async(...args)=>{calls.push(['confirm',...args]);const v=queue.shift();if(v instanceof Error)throw v;return v??{publicationId:pid,materialId:randomUUID(),publicationRevision:'6',classroomRevision:'13'};}};
 const options={client,resource:{getState:()=>editor},history:{getState:()=>history},preparation:{getState:()=>preparation},loadClassroom:async(...args)=>{calls.push(['classroom',...args]);return detail;},onChange:()=>{},uuid:()=>reqid};
 return {options,calls,queue,setEditor:v=>editor=v,setHistory:v=>history=v,setPreparation:v=>preparation=v};}
function create(f){const api=loadTsModule('apps/web/src/lib/foxy-publication-confirmation-controller.ts');assert.equal(typeof api.createFoxyPublicationConfirmationController,'function');return api.createFoxyPublicationConfirmationController(f.options);}
const err=(code,status)=>Object.assign(Error(code),{code,status});
test('review performs only current reads and freezes unchecked publication and classroom revisions',async()=>{const f=fixture(),c=create(f);c.syncContext();await c.review();const s=c.getState();assert.ok(s.review);assert.equal(s.reviewed,false);assert.equal(s.canConfirm,false);
 assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);assert.deepEqual(f.calls.map(x=>x[0]).sort(),['classroom','inspect','resource']);c.dispose();});
test('explicit checkbox and double confirm dispatch one exact CAS body',async()=>{const f=fixture(),gate=deferred();f.options.client.confirmPublication=async(...args)=>{f.calls.push(['confirm',...args]);return gate.promise;};const c=create(f);c.syncContext();await c.review();await c.confirm();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);
 c.setReviewed(true);const a=c.confirm(),b=c.confirm();await Promise.resolve();const writes=f.calls.filter(x=>x[0]==='confirm');assert.equal(writes.length,1);assert.deepEqual(writes[0][2],{requestId:reqid,publicationRevision:'5',classroomRevision:'12',confirm:true});
 gate.resolve({publicationId:pid,materialId:randomUUID(),publicationRevision:'6',classroomRevision:'13'});await Promise.all([a,b]);assert.ok(c.getState().receipt);c.dispose();});
test('review rejects stale resource, archived/student destination, missing hierarchy and revision mismatch',async()=>{
 for(const cause of ['stale','archived','student','unit','topic','classRevision']){const f=fixture();if(cause==='stale')f.options.client.getResource=async()=>({...resource,revision:'8'});
  if(cause==='archived')f.options.loadClassroom=async()=>({...detail,archived:true});if(cause==='student')f.options.loadClassroom=async()=>({...detail,role:'student'});
  if(cause==='unit')f.options.loadClassroom=async()=>({...detail,units:[]});if(cause==='topic')f.options.loadClassroom=async()=>({...detail,units:[{...detail.units[0],topics:[]}]});
  if(cause==='classRevision')f.options.loadClassroom=async()=>({...detail,revision:'13'});const c=create(f);c.syncContext();await c.review();assert.equal(c.getState().canConfirm,false,cause);assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);c.dispose();}
});
test('uncertain confirm manual retry preserves request despite server PUBLISHED',async()=>{const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.queue.push(err('SERVICE_UNAVAILABLE',503));await c.confirm();assert.equal(c.getState().pending,'CONFIRM');
 const prior=structuredClone(f.calls.find(x=>x[0]==='confirm')[2]);f.setHistory({selectedId:pid,inspection:{...inspection,publication:{...publication,state:'PUBLISHED',revision:'6'}},staleResource:false});c.syncContext();await c.retry();
 const calls=f.calls.filter(x=>x[0]==='confirm');assert.equal(calls.length,2);assert.deepEqual(calls[1][2],prior);c.dispose();});
test('context change or dispose ignores late review and prevents confirmation',async()=>{const f=fixture(),gate=deferred(),c=create(f);f.options.client.inspectPublication=async()=>gate.promise;c.syncContext();const pending=c.review();f.setHistory({selectedId:randomUUID(),inspection:null,staleResource:false});c.syncContext();gate.resolve(inspection);await pending;
 assert.equal(c.getState().review,null);await c.confirm();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);c.dispose();await c.review();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);});

test('malformed success receipt never invents publication success and retains uncertain intent',async()=>{
 for(const value of [{publicationId:pid},{publicationId:pid,materialId:'bad',publicationRevision:'x',classroomRevision:'13'},{publicationId:randomUUID(),materialId:randomUUID(),publicationRevision:'6',classroomRevision:'13'}]){
  const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.queue.push(value);await c.confirm();assert.equal(c.getState().receipt,null);assert.equal(c.getState().pending,'CONFIRM');c.dispose();}
});

test('preparation metadata or destination changes invalidate checked review',async()=>{
 for(const change of [{metadata:{title:'Otro',unitId:unit,topicId:topic}},{destination:{...detail,id:randomUUID()}},{result:{...publication,id:randomUUID()}}]){
  const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.setPreparation({busy:false,pending:null,...change});c.syncContext();
  assert.equal(c.getState().review,null);assert.equal(c.getState().canConfirm,false);await c.confirm();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);c.dispose();}
});

test('inspection error or newer selected history and preparation states block stale review',async()=>{
 for(const update of [{inspectionError:'falló'},{items:[{...publication,state:'PUBLISHED',revision:'6'}]},{items:[{...publication,state:'READY',revision:'6'}]}]){
  const f=fixture();f.setHistory({selectedId:pid,inspection,staleResource:false,...update});const c=create(f);c.syncContext();await c.review();assert.equal(c.getState().canConfirm,false);assert.equal(c.getState().review,null);c.dispose();}
 const f=fixture();f.setPreparation({busy:false,pending:null,result:{...publication,state:'PUBLISHED',revision:'6'}});const c=create(f);c.syncContext();await c.review();assert.equal(c.getState().canConfirm,false);assert.equal(c.getState().review,null);c.dispose();
});

test('uncertain confirmation cannot retry after switching resource or publication identity',async()=>{
 for(const kind of ['resource','publication']){const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.queue.push(err('SERVICE_UNAVAILABLE',503));await c.confirm();assert.equal(c.getState().pending,'CONFIRM');
  if(kind==='resource')f.setEditor({resource:{...resource,id:randomUUID()},dirty:false,busy:false,pending:null,conflict:null});else f.setHistory({selectedId:randomUUID(),inspection:null,staleResource:false});
  c.syncContext();await c.retry();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,1);assert.equal(c.getState().pending,null);c.dispose();}
});

test('review rejects fresh reads older than known publication or classroom high-water',async()=>{
 for(const cause of ['publication','classroom']){const f=fixture(),c=create(f);f.setHistory({selectedId:pid,inspection:{...inspection,classroomRevision:'12',publication:{...publication,revision:'5'}},staleResource:false});
  if(cause==='publication')f.options.client.inspectPublication=async()=>({...inspection,publication:{...publication,revision:'4'}});
  else{f.options.client.inspectPublication=async()=>({...inspection,classroomRevision:'11'});f.options.loadClassroom=async()=>({...detail,revision:'11'});}
  c.syncContext();await c.review();assert.equal(c.getState().review,null,cause);assert.equal(c.getState().canConfirm,false,cause);c.dispose();}
});

test('history catch-up to already reviewed classroom revision preserves checkbox',async()=>{
 const f=fixture();f.setHistory({selectedId:pid,inspection:{...inspection,classroomRevision:'11'},items:[publication],staleResource:false});const c=create(f);c.syncContext();await c.review();c.setReviewed(true);
 f.setHistory({selectedId:pid,inspection:{...inspection,classroomRevision:'12'},items:[publication],staleResource:false});c.syncContext();assert.ok(c.getState().review);assert.equal(c.getState().reviewed,true);c.dispose();
});

test('matching published history update preserves successful confirmation receipt',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);await c.confirm();const receipt=c.getState().receipt;assert.ok(receipt);
 f.setHistory({selectedId:pid,inspection:{...inspection,publication:{...publication,state:'PUBLISHED',revision:receipt.publicationRevision},classroomRevision:receipt.classroomRevision},items:[],staleResource:false});c.syncContext();
 assert.deepEqual(c.getState().receipt,receipt);c.dispose();
});

test('unrelated history item changes do not invalidate checked review of selected publication',async()=>{
 const f=fixture(),other=randomUUID(),c=create(f);f.setHistory({selectedId:pid,inspection,items:[publication,{...publication,id:other,revision:'1'}],staleResource:false});c.syncContext();await c.review();c.setReviewed(true);
 f.setHistory({selectedId:pid,inspection,items:[publication,{...publication,id:other,revision:'2',state:'PUBLISHED'}],staleResource:false});c.syncContext();assert.ok(c.getState().review);assert.equal(c.getState().reviewed,true);c.dispose();
});

test('classroom advancement beyond reviewed revision invalidates confirmation',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.setHistory({selectedId:pid,inspection:{...inspection,classroomRevision:'13'},items:[publication],staleResource:false});c.syncContext();
 assert.equal(c.getState().review,null);assert.equal(c.getState().canConfirm,false);c.dispose();
});

test('confirm rechecks dirty editor even without explicit syncContext',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.setEditor({resource,dirty:true,busy:false,pending:null,conflict:null});
 await c.confirm();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);c.dispose();
});

test('reset cannot discard uncertain confirmation and retry preserves its exact intent',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.queue.push(err('SERVICE_UNAVAILABLE',503));await c.confirm();assert.equal(c.getState().pending,'CONFIRM');
 const before=structuredClone(f.calls.find(x=>x[0]==='confirm')[2]);c.reset();assert.equal(c.getState().pending,'CONFIRM');await c.retry();
 const writes=f.calls.filter(x=>x[0]==='confirm');assert.equal(writes.length,2);assert.deepEqual(writes[1][2],before);c.dispose();
});

test('receipt projection omits unexpected private fields',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);f.queue.push({publicationId:pid,materialId:randomUUID(),publicationRevision:'6',classroomRevision:'13',fileId:'private',digest:'private'});
 await c.confirm();assert.deepEqual(Object.keys(c.getState().receipt).sort(),['classroomRevision','materialId','publicationId','publicationRevision']);c.dispose();
});

test('nonincrementable int64 CAS must not be confirmed',async()=>{
 for(const which of ['publication','classroom']){const f=fixture(),max='9223372036854775807';
  if(which==='publication'){const p={...publication,revision:max};f.setHistory({selectedId:pid,inspection:{...inspection,publication:p},staleResource:false});f.options.client.inspectPublication=async()=>({...inspection,publication:p});}
  else{f.setHistory({selectedId:pid,inspection:{...inspection,classroomRevision:max},staleResource:false});f.options.client.inspectPublication=async()=>({...inspection,classroomRevision:max});f.options.loadClassroom=async()=>({...detail,revision:max});}
  const c=create(f);c.syncContext();await c.review();c.setReviewed(true);await c.confirm();assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0,which);c.dispose();}
});

test('fresh inspection with same revision but changed immutable metadata cannot be reviewed',async()=>{
 const f=fixture(),c=create(f);f.options.client.inspectPublication=async()=>({...inspection,publication:{...publication,title:'Alterado'}});c.syncContext();await c.review();assert.equal(c.getState().review,null);assert.equal(c.getState().canConfirm,false);c.dispose();
});

test('review is blocked while inspection loads or a previous receipt already exists',async()=>{
 const f=fixture();f.setHistory({selectedId:pid,inspection,inspectionLoading:true,staleResource:false});const c=create(f);c.syncContext();await c.review();assert.equal(c.getState().review,null);assert.equal(f.calls.length,0);
 f.setHistory({selectedId:pid,inspection,inspectionLoading:false,staleResource:false});c.syncContext();await c.review();c.setReviewed(true);await c.confirm();assert.ok(c.getState().receipt);
 const before=f.calls.length;await c.review();assert.equal(f.calls.length,before);c.dispose();
});

test('late confirm ACK after resource changes without sync is ignored',async()=>{
 const f=fixture(),gate=deferred(),c=create(f);f.options.client.confirmPublication=async(...args)=>{f.calls.push(['confirm',...args]);return gate.promise;};
 c.syncContext();await c.review();c.setReviewed(true);const pending=c.confirm();await Promise.resolve();f.setEditor({resource:{...resource,id:randomUUID()},dirty:false,busy:false,pending:null,conflict:null});
 gate.resolve({publicationId:pid,materialId:randomUUID(),publicationRevision:'6',classroomRevision:'13'});await pending;assert.equal(c.getState().receipt,null);c.dispose();
});

test('stale review resolving after editor becomes dirty clears reviewing without sync',async()=>{
 const f=fixture(),gate=deferred(),c=create(f);f.options.client.inspectPublication=async()=>gate.promise;c.syncContext();const pending=c.review();await Promise.resolve();
 f.setEditor({resource,dirty:true,busy:false,pending:null,conflict:null});gate.resolve(inspection);await pending;assert.equal(c.getState().reviewing,false);assert.equal(c.getState().review,null);assert.equal(c.getState().canConfirm,false);c.dispose();
});

test('review retains independent classroom revision floors across selections',async()=>{
 const f=fixture(),c=create(f),roomB=randomUUID(),pubB={...publication,id:randomUUID(),classroomId:roomB};let selected=inspection;
 f.options.client.inspectPublication=async()=>selected;f.options.loadClassroom=async id=>id===roomB?{...detail,id:roomB,revision:'1'}:{...detail,revision:selected.classroomRevision};
 c.syncContext();await c.review();assert.equal(c.getState().review.classroomRevision,'12');
 selected={...inspection,publication:pubB,classroomRevision:'1'};f.setHistory({selectedId:pubB.id,inspection:selected,staleResource:false});c.syncContext();await c.review();assert.equal(c.getState().review.classroomRevision,'1');
 selected={...inspection,classroomRevision:'11'};f.setHistory({selectedId:pid,inspection:{...inspection,classroomRevision:'1'},staleResource:false});c.syncContext();await c.review();
 assert.equal(c.getState().review,null);assert.equal(c.getState().canConfirm,false);c.dispose();
});

test('successful receipt disables public canReview and review performs no I/O',async()=>{
 const f=fixture(),c=create(f);c.syncContext();await c.review();c.setReviewed(true);await c.confirm();assert.ok(c.getState().receipt);
 assert.equal(c.getState().canReview,false);const before=f.calls.length;await c.review();assert.equal(f.calls.length,before);c.dispose();
});

test('text review rejects VISUAL inspection without confirming',async()=>{
 const f=fixture(),visual={id:pid,sourceKind:'VISUAL',assetId:randomUUID(),assetRevision:'2',classroomId:room,title:'Imagen',unitId:unit,topicId:topic,state:'READY',revision:'5'};
 f.setHistory({selectedId:pid,inspection:{...inspection,publication:visual},staleResource:false});f.options.client.inspectPublication=async()=>({...inspection,publication:visual});const c=create(f);c.syncContext();await c.review();c.setReviewed(true);await c.confirm();
 assert.equal(c.getState().review,null);assert.equal(c.getState().canConfirm,false);assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);c.dispose();
});
