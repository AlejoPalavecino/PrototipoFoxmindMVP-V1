import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
function deferred(){let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};}
function fixture(){const calls=[],notifications=[],observers=[];let identityFoxy,identityClassroom;const room={id:randomUUID(),name:'Aula',role:'teacher',archived:false};
 const foxy={capabilities:async(...a)=>{calls.push(['capabilities',...a]);return {textGeneration:{enabled:false},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}};},
 listConversations:async(...a)=>{calls.push(['listConversations',...a]);return {items:[],next:null};}};
 const classroom={call:async(...args)=>{calls.push(['classroom',...args]);return args[0]===''?{teach:[room],study:[]}:room;}};
 const options={subjectId:randomUUID(),createFoxyClient:callback=>{identityFoxy=callback;return foxy;},createClassroomClient:callback=>{identityClassroom=callback;return classroom;},
 onChange:state=>observers.push(state),onIdentityRequired:code=>notifications.push(code)};
 return {options,calls,notifications,observers,room,foxy,classroom,foxyIdentity:code=>identityFoxy(code),classroomIdentity:code=>identityClassroom(code)};}
function create(f){const api=loadTsModule('apps/web/src/lib/foxy-workspace-runtime.ts');assert.equal(typeof api.createFoxyWorkspaceRuntime,'function');return api.createFoxyWorkspaceRuntime(f.options);}
test('construction has no I/O; init is idempotent and loads teacher classrooms',async()=>{const f=fixture(),runtime=create(f);assert.deepEqual(f.calls,[]);const s=runtime.getState();assert.equal(s.subjectId,f.options.subjectId);assert.equal(s.closed,false);
 for(const key of ['chat','resource','preparation','history','confirmation'])assert.ok(s[key]);await Promise.all([runtime.init(),runtime.init()]);
 assert.equal(f.calls.filter(x=>x[0]==='capabilities').length,1);assert.equal(f.calls.filter(x=>x[0]==='listConversations').length,1);assert.equal(f.calls.filter(x=>x[0]==='classroom').length,1);assert.equal(runtime.getState().classrooms[0].id,f.room.id);runtime.dispose();});
test('detail loading uses real classroom client and same abort signal',async()=>{const f=fixture(),runtime=create(f);await runtime.init();const controller=new AbortController();const detail=await runtime.loadClassroom(f.room.id,controller.signal);assert.equal(detail.id,f.room.id);
 const call=f.calls.filter(x=>x[0]==='classroom').at(-1);assert.equal(call[1],`/${f.room.id}`);assert.ok(call.at(-1) instanceof AbortSignal);runtime.dispose();});
test('identity expiry tears down all state before notifying once and no calls occur after close',async()=>{const f=fixture(),runtime=create(f);await runtime.init();let atNotification;
 f.options.onIdentityRequired=code=>{atNotification=runtime.getState();f.notifications.push(code);};f.foxyIdentity('AUTH_REQUIRED');f.classroomIdentity('AUTH_REQUIRED');
 assert.equal(atNotification.closed,true);assert.deepEqual(atNotification.classrooms,[]);assert.equal(atNotification.resource?.resource??null,null);assert.deepEqual(f.notifications,['AUTH_REQUIRED']);
 const before=f.calls.length;await runtime.init();await runtime.reloadClassrooms();await runtime.loadClassroom(f.room.id);assert.equal(f.calls.length,before);runtime.dispose();});
test('dispose aborts pending classroom work and late results cannot repopulate state',async()=>{const f=fixture(),gate=deferred();let signal;f.classroom.call=async(_path,_method,_body,s)=>{signal=s;return gate.promise;};
 const runtime=create(f),pending=runtime.init();await Promise.resolve();runtime.dispose();assert.equal(signal.aborted,true);gate.resolve({teach:[f.room]});await pending;
 assert.equal(runtime.getState().closed,true);assert.deepEqual(runtime.getState().classrooms,[]);const count=f.observers.length;await runtime.reloadClassrooms();assert.equal(f.observers.length,count);});

test('reentrant init from observer performs one initialization',async()=>{
 const f=fixture();let runtime,reentered=false;f.options.onChange=()=>{if(!reentered){reentered=true;void runtime.init();}};runtime=create(f);await runtime.init();
 assert.equal(f.calls.filter(x=>x[0]==='capabilities').length,1);assert.equal(f.calls.filter(x=>x[0]==='listConversations').length,1);assert.equal(f.calls.filter(x=>x[0]==='classroom').length,1);runtime.dispose();
});

test('mutating public chat snapshots cannot change runtime internal state',async()=>{
 const f=fixture(),runtime=create(f);await runtime.init();const first=runtime.getState();try{first.chat.conversations.push({id:randomUUID(),title:'Ajeno'});}catch{}
 assert.deepEqual(runtime.getState().chat.conversations,[]);runtime.dispose();
});

test('older classroom reload response cannot overwrite a newer response',async()=>{
 const f=fixture(),first=deferred(),second=deferred();let index=0;f.classroom.call=async()=>++index===1?first.promise:second.promise;
 const runtime=create(f),a=runtime.reloadClassrooms(),b=runtime.reloadClassrooms(),newRoom={...f.room,id:randomUUID(),name:'Nuevo'};
 second.resolve({teach:[newRoom]});await b;first.resolve({teach:[f.room]});await a;assert.equal(runtime.getState().classrooms[0].id,newRoom.id);runtime.dispose();
});

test('loadClassroom resolving after dispose returns no private detail',async()=>{
 const f=fixture(),gate=deferred();f.classroom.call=async()=>gate.promise;const runtime=create(f),loading=runtime.loadClassroom(f.room.id);runtime.dispose();gate.resolve(f.room);
 assert.equal(await loading,undefined);assert.equal(runtime.getState().closed,true);
});

test('runtime snapshots immutable subject identity from construction',async()=>{
 const f=fixture(),subject=f.options.subjectId,runtime=create(f);f.options.subjectId=randomUUID();assert.equal(runtime.getState().subjectId,subject);runtime.dispose();
});

for(const reason of ['dispose','identity'])test(`direct chat getter clears private conversations after ${reason}`,async()=>{
 const f=fixture(),cid=randomUUID();f.foxy.listConversations=async()=>({items:[{id:cid,title:'Privado',context:{kind:'GENERAL'},revision:'0'}],next:null});
 const runtime=create(f);await runtime.init();assert.equal(runtime.chat.getState().conversations[0].title,'Privado');
 if(reason==='dispose')runtime.dispose();else f.foxyIdentity('AUTH_REQUIRED');
 const direct=runtime.chat.getState();assert.deepEqual(direct.conversations,[]);assert.equal(direct.current,null);assert.deepEqual(direct.turns,[]);
 assert.equal(JSON.stringify(runtime.getState()).includes('Privado'),false);
});

test('receipt refresh microtask is fenced when selection changes P to B and back to P',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),pid=randomUUID(),bid=randomUUID(),room=f.room.id;let switched=false,runtime;
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guía',markdown:'Texto',revision:'1'};
 const pub=id=>({id,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Guía',unitId:null,topicId:null,state:'READY',revision:'2'});
 const detail={...f.room,subject:'Ciencias',division:'A',academicYear:2026,timezone:'UTC',coverKey:'explore',teacher:'Docente',revision:'3',units:[],plans:[]};
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),getResource:async()=>resource,
  listPublications:async(...args)=>{f.calls.push(['publications',...args]);return {items:[pub(pid),pub(bid)],nextAfterId:null};},
  inspectPublication:async id=>({publication:pub(id),classroomRevision:'3',classroomArchived:false,errorCode:null}),
  confirmPublication:async()=>({publicationId:pid,materialId:randomUUID(),publicationRevision:'3',classroomRevision:'4'})});
 f.classroom.call=async(path)=>path===''?{teach:[detail]}:detail;
 f.options.onChange=state=>{if(state.confirmation?.receipt&&!switched){switched=true;void runtime.history.select(bid);void runtime.history.select(pid);}};
 runtime=create(f);await runtime.resource.open(cid,tid);await runtime.history.select(pid);await runtime.confirmation.review();runtime.confirmation.setReviewed(true);
 const before=f.calls.filter(x=>x[0]==='publications').length;await runtime.confirmation.confirm();await new Promise(r=>setImmediate(r));
 assert.equal(switched,true);assert.equal(f.calls.filter(x=>x[0]==='publications').length,before);runtime.dispose();
});


test('runtime composes one management controller without I/O and clears it on identity loss',async()=>{
 const f=fixture(),runtime=create(f);assert.ok(runtime.management);assert.ok(runtime.getState().management);assert.equal(f.calls.length,0);
 await runtime.init();f.foxyIdentity('AUTH_REQUIRED');assert.equal(runtime.getState().management,null);assert.equal(runtime.getState().closed,true);runtime.dispose();
});

test('selected publication triggers one bounded management read, no refresh on draft edits',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),pid=randomUUID();let managementGets=0;
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guía',markdown:'Texto',revision:'1'},pub={id:pid,resourceId:rid,resourceRevision:'1',classroomId:f.room.id,title:'Guía',unitId:null,topicId:null,state:'FAILED',revision:'2'};
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),inspectPublication:async()=>({publication:pub,classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'}),
  inspectPublicationManagement:async()=>{managementGets++;return {publicationId:pid,publicationRevision:'2',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'};}});
 const runtime=create(f);await runtime.resource.open(cid,tid);await runtime.history.select(pid);await new Promise(r=>setImmediate(r));assert.equal(managementGets,1);
 runtime.resource.updateDraft({title:'Escrito',markdown:'Texto'});await new Promise(r=>setImmediate(r));assert.equal(managementGets,1);runtime.dispose();
});

test('management read from old selection cannot overwrite current selection, including A to B to A',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),a=randomUUID(),b=randomUUID(),room=f.room.id,first=deferred();let readCount=0,firstSignal;
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guia',markdown:'Texto',revision:'1'};
 const pub=id=>({id,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Guia',unitId:null,topicId:null,state:'FAILED',revision:'2'});
 const mg=id=>({publicationId:id,publicationRevision:'2',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'});
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),listPublications:async()=>({items:[pub(a),pub(b)],nextAfterId:null}),
  inspectPublication:async id=>({publication:pub(id),classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'}),
  inspectPublicationManagement:async(id,signal)=>{readCount++;if(readCount===1){firstSignal=signal;return first.promise;}return mg(id);}});
 const runtime=create(f);await runtime.resource.open(cid,tid);await runtime.history.select(a);await new Promise(r=>setImmediate(r));
 await runtime.history.select(b);await new Promise(r=>setImmediate(r));await runtime.history.select(a);await new Promise(r=>setImmediate(r));
 assert.equal(firstSignal.aborted,true);assert.equal(runtime.getState().management.management.publicationId,a);const count=readCount;
 first.resolve({...mg(b),publicationRevision:'99'});await new Promise(r=>setImmediate(r));assert.equal(runtime.getState().management.management.publicationId,a);assert.equal(readCount,count);runtime.dispose();
});

test('uncertain management retry preserves the same request and unsaved draft while reads remain available',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),pid=randomUUID(),room=f.room.id,calls=[];let attempts=0;
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guia',markdown:'Texto',revision:'1'},pub={id:pid,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Guia',unitId:null,topicId:null,state:'FAILED',revision:'2'};
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),listPublications:async()=>({items:[pub],nextAfterId:null}),
  inspectPublication:async()=>({publication:pub,classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'}),
  inspectPublicationManagement:async()=>({publicationId:pid,publicationRevision:'2',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'}),
  retryPublication:async(id,input)=>{calls.push([id,structuredClone(input)]);if(++attempts===1)throw Object.assign(Error('synthetic'),{code:'SERVICE_UNAVAILABLE',status:503});return {publicationId:pid,action:'RETRY',publicationRevision:'3'};}});
 const runtime=create(f);await runtime.resource.open(cid,tid);runtime.resource.updateDraft({title:'Borrador',markdown:'Sin guardar'});await runtime.history.select(pid);await new Promise(r=>setImmediate(r));
 assert.equal(await runtime.management.retryPreparation(),'uncertain');assert.equal(runtime.getState().management.pending,'RETRY');
 await runtime.history.refreshList();assert.equal(runtime.getState().resource.draft.markdown,'Sin guardar');assert.equal(await runtime.management.retryRequest(),'applied');
 assert.deepEqual(calls[0],calls[1]);assert.equal(runtime.getState().resource.draft.markdown,'Sin guardar');runtime.dispose();
});

test('accepted management command coalesces reconciliation and never erases a dirty draft',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),pid=randomUUID(),room=f.room.id;let phase='FAILED',revision='2',listCalls=0,inspectCalls=0,managementCalls=0;
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guia',markdown:'Texto',revision:'1'};
 const pub=()=>({id:pid,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Guia',unitId:null,topicId:null,state:phase,revision});
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),listPublications:async()=>{listCalls++;return {items:[pub()],nextAfterId:null};},
  inspectPublication:async()=>{inspectCalls++;return {publication:pub(),classroomRevision:'3',classroomArchived:false,errorCode:phase==='FAILED'?'FILE_NOT_READY':null};},
  inspectPublicationManagement:async()=>{managementCalls++;return {publicationId:pid,publicationRevision:revision,canRetry:phase==='FAILED',retryReason:phase==='FAILED'?null:'STATE',canDiscard:true,cleanupState:'NOT_REQUESTED'};},
  retryPublication:async()=>{phase='PREPARING';revision='3';return {publicationId:pid,action:'RETRY',publicationRevision:'3'};}});
 const runtime=create(f);await runtime.resource.open(cid,tid);runtime.resource.updateDraft({title:'Borrador',markdown:'Contenido local'});await runtime.history.select(pid);await new Promise(r=>setImmediate(r));
 const before={listCalls,inspectCalls,managementCalls};assert.equal(await runtime.management.retryPreparation(),'applied');await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(listCalls-before.listCalls,1);assert.equal(inspectCalls-before.inspectCalls,1);assert.equal(managementCalls-before.managementCalls,1,'management reconciliation must issue one current read');
 assert.equal(runtime.getState().resource.draft.markdown,'Contenido local');runtime.dispose();
});

test('reconciliation for new selection is not lost while previous selection refresh is in flight',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),a=randomUUID(),b=randomUUID(),room=f.room.id,gate=deferred();let blockA=false,releaseA=false;const inspected=[],listed=[];
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guia',markdown:'Texto',revision:'1'};
 const pub=id=>({id,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Guia',unitId:null,topicId:null,state:'FAILED',revision:'2'});
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),listPublications:async()=>{listed.push('list');return {items:[pub(a),pub(b)],nextAfterId:null};},
  inspectPublication:async id=>{inspected.push(id);if(id===a&&blockA&&!releaseA){await gate.promise;}return {publication:pub(id),classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'};},
  inspectPublicationManagement:async id=>({publicationId:id,publicationRevision:id===b?'3':'2',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'}),
  retryPublication:async()=>({publicationId:a,action:'RETRY',publicationRevision:'3'})});
 const runtime=create(f);await runtime.resource.open(cid,tid);await runtime.history.select(a);await new Promise(r=>setImmediate(r));
 blockA=true;await runtime.management.retryPreparation();await new Promise(r=>setImmediate(r));assert.equal(inspected.filter(id=>id===a).length,2);
 await runtime.history.select(b);await new Promise(r=>setImmediate(r));const beforeB=inspected.filter(id=>id===b).length;
 releaseA=true;gate.resolve();await new Promise(r=>setImmediate(r));await new Promise(r=>setImmediate(r));
 assert.equal(runtime.getState().history.selectedId,b);assert.ok(inspected.filter(id=>id===b).length>beforeB,'new selection mismatch must eventually reconcile');runtime.dispose();
});

test('identity loss aborts pending management command and suppresses late receipt and reconciliation',async()=>{
 const f=fixture(),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),pid=randomUUID(),room=f.room.id,gate=deferred();let commandSignal,lists=0;
 const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Guia',markdown:'Texto',revision:'1'},pub={id:pid,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Guia',unitId:null,topicId:null,state:'FAILED',revision:'2'};
 Object.assign(f.foxy,{resourceFromTurn:async()=>({created:false,resource}),listPublications:async()=>{lists++;return {items:[pub],nextAfterId:null};},
  inspectPublication:async()=>({publication:pub,classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'}),
  inspectPublicationManagement:async()=>({publicationId:pid,publicationRevision:'2',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'}),
  retryPublication:async(_id,_input,signal)=>{commandSignal=signal;return gate.promise;}});
 const runtime=create(f);await runtime.resource.open(cid,tid);await runtime.history.select(pid);await new Promise(r=>setImmediate(r));const pending=runtime.management.retryPreparation();await Promise.resolve();
 f.foxyIdentity('AUTH_REQUIRED');assert.equal(commandSignal.aborted,true);const before=lists;gate.resolve({publicationId:pid,action:'RETRY',publicationRevision:'3'});await pending;await new Promise(r=>setImmediate(r));
 assert.equal(runtime.getState().closed,true);assert.equal(runtime.getState().management,null);assert.equal(lists,before);runtime.dispose();
});
