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
