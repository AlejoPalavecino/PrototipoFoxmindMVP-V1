import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
const rid=randomUUID(),room=randomUUID(),unit=randomUUID(),topic=randomUUID(),requestId=randomUUID();
function deferred(){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};}
function fixture(){let resourceState={resource:{id:rid,revision:'7',title:'Guía',markdown:'Texto'},dirty:false,busy:false,pending:null,conflict:null};const calls=[],queue=[];
 const detail={id:room,name:'Biología',subject:'Ciencias',division:'A',academicYear:2026,timezone:'UTC',coverKey:'explore',archived:false,teacher:'Docente',role:'teacher',aiGradingEnabled:false,aiGradingAvailable:false,revision:'3',units:[{id:unit,name:'Unidad',position:0,topics:[{id:topic,name:'Tema',status:'PENDING'}]}],plans:[]};
 const client={preparePublication:async(...args)=>{calls.push(['prepare',...args]);const value=queue.shift();if(value instanceof Error)throw value;return value??{created:true,publication:{id:randomUUID(),resourceId:rid,resourceRevision:'7',classroomId:room,title:'Guía',unitId:null,topicId:null,state:'PREPARING',revision:'0'}};}};
 const options={client,resource:{getState:()=>resourceState},loadClassroom:async(...args)=>{calls.push(['classroom',...args]);return detail;},onChange:()=>{},uuid:()=>requestId};
 return {options,calls,queue,detail,setResource:value=>resourceState=value,getResource:()=>resourceState};}
function create(f){const api=loadTsModule('apps/web/src/lib/foxy-preparation-controller.ts');assert.equal(typeof api.createFoxyPreparationController,'function');return api.createFoxyPreparationController(f.options);}
const error=(code,status)=>Object.assign(Error(code),{code,status});
test('requires saved clean resource and actual active destination',async()=>{const f=fixture(),c=create(f);c.syncResource();assert.equal(c.getState().canPrepare,false);await c.selectDestination(room);
 assert.equal(c.getState().canPrepare,true);for(const key of ['dirty','busy','pending','conflict']){const before=f.getResource();f.setResource({...before,[key]:key==='pending'?'SAVE':key==='conflict'?{}:true});c.syncResource();assert.equal(c.getState().canPrepare,false,key);f.setResource(before);c.syncResource();}
 c.dispose();});
test('destination and unit changes reset hierarchy and reject foreign topic selections',async()=>{const f=fixture(),c=create(f);c.syncResource();await c.selectDestination(room);c.selectUnit(unit);c.selectTopic(topic);assert.equal(c.getState().metadata.topicId,topic);
 c.selectUnit(null);assert.equal(c.getState().metadata.topicId,null);c.selectUnit(unit);c.selectTopic(randomUUID());assert.equal(c.getState().metadata.topicId,null);
 const other=randomUUID();f.options.loadClassroom=async()=>({...f.detail,id:other,units:[]});await c.selectDestination(other);assert.equal(c.getState().metadata.unitId,null);assert.equal(c.getState().metadata.topicId,null);c.dispose();});
test('prepare snapshots exact saved revision and double click produces one POST',async()=>{const f=fixture(),gate=deferred(),c=create(f);f.options.client.preparePublication=async(...args)=>{f.calls.push(['prepare',...args]);return gate.promise;};c.syncResource();await c.selectDestination(room);c.setTitle('Material');c.selectUnit(unit);c.selectTopic(topic);
 const a=c.prepare(),b=c.prepare();await Promise.resolve();const writes=f.calls.filter(c=>c[0]==='prepare');assert.equal(writes.length,1);assert.deepEqual(writes[0][2],{requestId,resourceRevision:'7',classroomId:room,title:'Material',unitId:unit,topicId:topic});
 gate.resolve({created:true,publication:{id:randomUUID(),resourceId:rid,resourceRevision:'7',classroomId:room,title:'Material',unitId:unit,topicId:topic,state:'PREPARING',revision:'0'}});await Promise.all([a,b]);assert.ok(c.getState().result);c.dispose();});
test('uncertain preparation retry retains exact private body despite later resource revision',async()=>{const f=fixture(),c=create(f);c.syncResource();await c.selectDestination(room);f.queue.push(error('SERVICE_UNAVAILABLE',503));await c.prepare();assert.equal(c.getState().pending,'PREPARE');
 const before=structuredClone(f.calls.find(x=>x[0]==='prepare')[2]);f.setResource({...f.getResource(),resource:{...f.getResource().resource,revision:'8'}});c.syncResource();await c.retry();const writes=f.calls.filter(x=>x[0]==='prepare');assert.equal(writes.length,2);assert.deepEqual(writes[1][2],before);c.dispose();});
test('invalid Unicode control, blank title and archived destination never dispatch',async()=>{const f=fixture(),c=create(f);c.syncResource();await c.selectDestination(room);for(const title of ['  ','x\u0085','a'.repeat(201)]){c.setTitle(title);await c.prepare();}assert.equal(f.calls.filter(x=>x[0]==='prepare').length,0);
 f.options.loadClassroom=async()=>({...f.detail,archived:true});await c.selectDestination(room);c.setTitle('Válido');assert.equal(c.getState().canPrepare,false);await c.prepare();assert.equal(f.calls.filter(x=>x[0]==='prepare').length,0);c.dispose();});
test('late destination results after resource change or disposal are ignored',async()=>{const f=fixture(),gate=deferred();f.options.loadClassroom=()=>gate.promise;const c=create(f);c.syncResource();const pending=c.selectDestination(room);f.setResource({...f.getResource(),resource:{...f.getResource().resource,id:randomUUID()}});c.syncResource();gate.resolve(f.detail);await pending;assert.notEqual(c.getState().destination?.id,room);c.dispose();const count=f.calls.length;await c.prepare();await c.retry();assert.equal(f.calls.length,count);});

test('missing or duplicate curriculum IDs cannot be selected or fabricated',async()=>{const f=fixture(),c=create(f);c.syncResource();
 f.options.loadClassroom=async()=>({...f.detail,units:[{name:'Sin id',topics:[{name:'Sin id'}]},{id:unit,name:'Duplicada',topics:[{id:topic,name:'Uno'},{id:topic,name:'Dos'}]},{id:unit,name:'Duplicada otra',topics:[]}]});
 await c.selectDestination(room);c.selectUnit(unit);c.selectTopic(topic);assert.equal(c.getState().metadata.unitId,null);assert.equal(c.getState().metadata.topicId,null);c.dispose();});

test('real editor unresolved conflict blocks preparation even when draft matches old base',async()=>{
 const f=fixture(),editorApi=loadTsModule('apps/web/src/lib/foxy-resource-controller.ts');let uuidCalls=0;
 const original={id:rid,conversationId:randomUUID(),sourceTurnId:randomUUID(),title:'Guía',markdown:'Texto',revision:'7'};
 const resource=editorApi.createFoxyResourceController({client:{resourceFromTurn:async()=>({created:false,resource:original}),editResource:async()=>{throw error('CONFLICT',409);},getResource:async()=>{throw error('SERVICE_UNAVAILABLE',503);}},onChange:()=>{},uuid:()=>randomUUID()});
 await resource.open(original.conversationId,original.sourceTurnId);resource.updateDraft({title:'Editado',markdown:'Texto'});assert.equal(await resource.save(),'conflict');
 resource.updateDraft({title:'Guía',markdown:'Texto'});assert.equal(resource.getState().dirty,false);assert.equal(resource.getState().conflict,null);assert.equal(resource.getState().errorCode,'CONFLICT');
 f.options.resource=resource;f.options.uuid=()=>{uuidCalls++;return randomUUID();};const c=create(f);c.syncResource();await c.selectDestination(room);
 assert.equal(c.getState().canPrepare,false);await c.prepare();assert.equal(uuidCalls,0);assert.equal(f.calls.filter(x=>x[0]==='prepare').length,0);c.dispose();resource.dispose();
});

for(const code of ['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN','NOT_FOUND'])for(const phase of ['loader','prepare'])test(`${code} during ${phase} clears preparation state without erasing editor`,async()=>{
 const f=fixture(),original=f.getResource(),c=create(f);c.syncResource();
 if(phase==='loader')f.options.loadClassroom=async()=>{throw error(code,code==='AUTH_REQUIRED'?401:403);};
 if(phase==='prepare')f.queue.push(error(code,code==='AUTH_REQUIRED'?401:403));
 await c.selectDestination(room);if(phase==='prepare')await c.prepare();
 const state=c.getState();assert.equal(state.destination,null);assert.equal(state.pending,null);assert.equal(state.result,null);assert.equal(state.canPrepare,false);assert.equal(state.errorCode,code);
 if(['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'].includes(code))assert.equal(state.metadata.title,'');
 assert.deepEqual(f.getResource(),original);const count=f.calls.filter(x=>x[0]==='prepare').length;await c.retry();assert.equal(f.calls.filter(x=>x[0]==='prepare').length,count);c.dispose();
});

for(const code of ['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'])for(const phase of ['loader','prepare'])test(`${code} during ${phase} prevents stale editor rebinding until new composition`,async()=>{
 const f=fixture(),c=create(f);c.syncResource();if(phase==='loader')f.options.loadClassroom=async()=>{throw error(code,401);};
 else{await c.selectDestination(room);f.queue.push(error(code,401));await c.prepare();}
 if(phase==='loader')await c.selectDestination(room);
 let loads=0;f.options.loadClassroom=async()=>{loads++;return f.detail;};const sent=f.calls.filter(x=>x[0]==='prepare').length;
 c.syncResource();await c.selectDestination(room);await c.prepare();assert.equal(c.getState().canPrepare,false);assert.equal(c.getState().destination,null);
 assert.equal(c.getState().metadata.title,'');assert.equal(loads,0);assert.equal(f.calls.filter(x=>x[0]==='prepare').length,sent);c.dispose();
});

test('forbidden destination can be replaced without clearing the editor',async()=>{
 const f=fixture(),c=create(f),saved=f.getResource();c.syncResource();f.options.loadClassroom=async()=>{throw error('FORBIDDEN',403);};await c.selectDestination(room);
 f.options.loadClassroom=async()=>f.detail;await c.selectDestination(room);assert.equal(c.getState().canPrepare,true);assert.deepEqual(f.getResource(),saved);c.dispose();
});
