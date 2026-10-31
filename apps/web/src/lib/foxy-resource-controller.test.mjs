import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {loadTsModule} from '../../../../tests/helpers/load-ts-module.mjs';
const cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),requestId=randomUUID();
const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Original',markdown:'Texto',revision:'7'};
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
function fixture(){const calls=[],queue=[];const client={resourceFromTurn:async(...args)=>{calls.push(['open',...args]);return {created:false,resource:{...resource}};},
 getResource:async(...args)=>{calls.push(['get',...args]);return {...resource,revision:'8',title:'Servidor'};},editResource:async(...args)=>{calls.push(['edit',...args]);const value=queue.shift();if(value instanceof Error)throw value;if(value)return value;return {edited:true,resource:{...resource,...args[1],revision:'8'}};}};
 const options={client,onChange:()=>{},uuid:()=>requestId};return {client,calls,queue,options};}
function create(f){const api=loadTsModule('apps/web/src/lib/foxy-resource-controller.ts');assert.equal(typeof api.createFoxyResourceController,'function');return api.createFoxyResourceController(f.options);}
const err=(code,status)=>Object.assign(Error(code),{code,status});
test('open uses returned latest resource and blocks navigation with unsaved changes',async()=>{const f=fixture(),c=create(f);assert.equal(await c.open(cid,tid),'opened');assert.equal(c.getState().resource.revision,'7');
 c.updateDraft({title:'Editado',markdown:'Texto'});assert.equal(c.getState().dirty,true);assert.equal(await c.open(randomUUID(),randomUUID()),'blocked');assert.equal(c.close(),false);assert.equal(f.calls.filter(c=>c[0]==='open').length,1);c.discardAndClose();assert.equal(c.getState().resource,null);c.dispose();});
test('save snapshots request and only clears dirty when current draft matches ACK',async()=>{const f=fixture(),gate=deferred();f.client.editResource=async(...args)=>{f.calls.push(['edit',...args]);return gate.promise;};const c=create(f);await c.open(cid,tid);
 c.updateDraft({title:'Primero',markdown:'Contenido'});const a=c.save(),b=c.save();await Promise.resolve();assert.equal(f.calls.filter(c=>c[0]==='edit').length,1);
 const body=f.calls.find(c=>c[0]==='edit')[2];assert.deepEqual(body,{requestId,revision:'7',title:'Primero',markdown:'Contenido'});
 c.updateDraft({title:'Después',markdown:'Contenido'});gate.resolve({edited:true,resource:{...resource,title:'Primero',markdown:'Contenido',revision:'8'}});assert.equal(await a,'saved');await b;
 assert.equal(c.getState().draft.title,'Después');assert.equal(c.getState().dirty,true);c.dispose();});
test('invalid values do not send and 400 preserves editable draft without pending retry',async()=>{const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'   ',markdown:'Texto'});assert.equal(await c.save(),'invalid');
 c.updateDraft({title:'Guía',markdown:'invalido\u0085'});assert.equal(await c.save(),'invalid');assert.equal(f.calls.filter(c=>c[0]==='edit').length,0);
 c.updateDraft({title:'Guía',markdown:'Texto válido'});f.queue.push(err('INVALID_INPUT',400));assert.equal(await c.save(),'invalid');assert.equal(c.getState().draft.markdown,'Texto válido');assert.equal(c.getState().pending,null);c.dispose();});
test('conflict loads current resource without discarding user draft',async()=>{const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Mío',markdown:'Texto'});f.queue.push(err('CONFLICT',409));
 assert.equal(await c.save(),'conflict');assert.equal(f.calls.filter(c=>c[0]==='get').length,1);assert.equal(c.getState().draft.title,'Mío');assert.ok(c.getState().conflict);c.dispose();});
test('uncertain save retains exact intent and manual retry sends same UUID and revision',async()=>{const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Mío',markdown:'Texto'});f.queue.push(err('SERVICE_UNAVAILABLE',503));
 assert.equal(await c.save(),'uncertain');assert.equal(c.getState().pending,'SAVE');assert.equal(await c.save(),'uncertain');assert.equal(f.calls.filter(x=>x[0]==='edit').length,1);assert.equal(c.close(),false);assert.equal(await c.open(randomUUID(),randomUUID()),'blocked');
 await c.retry();const writes=f.calls.filter(c=>c[0]==='edit');assert.equal(writes.length,2);assert.deepEqual(writes[0][2],writes[1][2]);c.dispose();});
test('dispose aborts in-flight open, ignores late response and prevents later I/O',async()=>{const f=fixture(),gate=deferred();f.client.resourceFromTurn=async(...args)=>{f.calls.push(['open',...args]);return gate.promise;};const c=create(f),running=c.open(cid,tid);await Promise.resolve();c.dispose();gate.resolve({created:false,resource});await running;
 assert.equal(c.getState().resource,null);const count=f.calls.length;await c.open(cid,tid);await c.save();await c.retry();assert.equal(f.calls.length,count);});

test('mutating getState pending, resource and draft cannot change retry intent',async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Mío',markdown:'Texto original'});f.queue.push(err('SERVICE_UNAVAILABLE',503));assert.equal(await c.save(),'uncertain');
 const original=structuredClone(f.calls.find(x=>x[0]==='edit')[2]),view=c.getState();
 assert.equal(view.pending,'SAVE');try{view.resource.revision='999';}catch{} try{view.draft.markdown='Alterado';}catch{}
 await c.retry();const writes=f.calls.filter(x=>x[0]==='edit');assert.deepEqual(writes[1][2],original);assert.equal(c.getState().draft.markdown,'Texto original');c.dispose();
});

test('onChange observer cannot mutate private revision, pending intent or draft',async()=>{
 const f=fixture();f.options.onChange=state=>{try{if(state.resource)state.resource.revision='999';if(state.pending)state.pending.requestId=randomUUID();if(state.draft.title==='Mío')state.draft.title='Alterado';}catch{}};
 const c=create(f);await c.open(cid,tid);c.updateDraft({title:'Mío',markdown:'Texto'});f.queue.push(err('SERVICE_UNAVAILABLE',503));await c.save();await c.retry();
 const writes=f.calls.filter(x=>x[0]==='edit');for(const write of writes)assert.deepEqual(write[2],{requestId,revision:'7',title:'Mío',markdown:'Texto'});c.dispose();
});

test('client mutation of request object cannot alter retained retry intent',async()=>{
 const f=fixture(),sent=[];let calls=0;f.client.editResource=async(_id,body)=>{sent.push(structuredClone(body));calls++;if(calls===1){body.requestId=randomUUID();body.revision='999';body.title='Alterado';throw err('SERVICE_UNAVAILABLE',503);}return {edited:true,resource:{...resource,title:body.title,markdown:body.markdown,revision:'8'}};};
 const c=create(f);await c.open(cid,tid);c.updateDraft({title:'Mío',markdown:'Texto'});await c.save();await c.retry();assert.equal(sent.length,2);assert.deepEqual(sent[1],sent[0]);c.dispose();
});

test('conflict keep-local adopts server revision without sending and next save uses a new request',async()=>{
 const f=fixture(),ids=[randomUUID(),randomUUID()];f.options.uuid=()=>ids.shift();const c=create(f);await c.open(cid,tid);c.updateDraft({title:'Local',markdown:'Texto local'});f.queue.push(err('CONFLICT',409));
 assert.equal(await c.save(),'conflict');assert.equal(await c.save(),'conflict');assert.equal(f.calls.filter(x=>x[0]==='edit').length,1);
 assert.equal(c.resolveConflict('keep-local'),true);assert.equal(c.getState().draft.title,'Local');assert.equal(c.getState().resource.revision,'8');assert.equal(c.getState().conflict,null);assert.equal(f.calls.filter(x=>x[0]==='edit').length,1);
 await c.save();const writes=f.calls.filter(x=>x[0]==='edit');assert.equal(writes.length,2);assert.notEqual(writes[0][2].requestId,writes[1][2].requestId);assert.equal(writes[1][2].revision,'8');assert.equal(writes[1][2].title,'Local');c.dispose();
});

test('conflict use-server replaces draft, clears dirty and performs no extra write',async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Local',markdown:'Local'});f.queue.push(err('CONFLICT',409));await c.save();
 assert.equal(c.resolveConflict('use-server'),true);assert.equal(c.getState().draft.title,'Servidor');assert.equal(c.getState().resource.revision,'8');assert.equal(c.getState().dirty,false);assert.equal(f.calls.filter(x=>x[0]==='edit').length,1);c.dispose();
});

test('failed conflict lookup can be refreshed without losing draft; repeated conflict remains resolvable',async()=>{
 const f=fixture(),ids=[randomUUID(),randomUUID()];f.options.uuid=()=>ids.shift();let count=0;f.client.getResource=async(...args)=>{f.calls.push(['get',...args]);if(++count===1)throw err('SERVICE_UNAVAILABLE',503);return {...resource,revision:count===2?'8':'9',title:'Servidor'};};
 const c=create(f);await c.open(cid,tid);c.updateDraft({title:'Local',markdown:'Local'});f.queue.push(err('CONFLICT',409));assert.equal(await c.save(),'conflict');
 assert.equal(c.resolveConflict('keep-local'),false);assert.equal(c.getState().draft.title,'Local');await c.refreshConflict();assert.equal(c.getState().draft.title,'Local');assert.equal(c.resolveConflict('keep-local'),true);
 f.queue.push(err('CONFLICT',409));assert.equal(await c.save(),'conflict');assert.equal(c.getState().conflict.revision,'9');assert.equal(c.getState().draft.title,'Local');c.dispose();
});

test('conflict resolution is refused without conflict or while a save is pending',async()=>{
 const f=fixture(),gate=deferred(),c=create(f);await c.open(cid,tid);assert.equal(c.resolveConflict('keep-local'),false);
 c.updateDraft({title:'Local',markdown:'Texto'});f.client.editResource=async()=>gate.promise;const saving=c.save();await Promise.resolve();assert.equal(c.resolveConflict('use-server'),false);
 gate.resolve({edited:true,resource:{...resource,title:'Local',revision:'8'}});await saving;c.dispose();
});

test('save uses native crypto.randomUUID with its required receiver',async()=>{
 const f=fixture();delete f.options.uuid;const c=create(f);await c.open(cid,tid);c.updateDraft({title:'Nativo',markdown:'Texto'});
 assert.equal(await c.save(),'saved');const edit=f.calls.find(x=>x[0]==='edit');assert.match(edit[2].requestId,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);c.dispose();
});

for(const code of ['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN','NOT_FOUND'])test(`loss of access ${code} clears private editor and blocks retry`,async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Privado',markdown:'Contenido privado'});f.queue.push(err(code,code==='AUTH_REQUIRED'?401:403));
 await c.save();const state=c.getState();assert.equal(state.resource,null);assert.equal(state.draft.markdown,'');assert.equal(state.pending,null);assert.equal(state.conflict,null);
 const before=f.calls.length;await c.retry();assert.equal(f.calls.length,before);c.dispose();
});

test('open denies a resource bound to a different conversation or turn',async()=>{
 for(const field of ['conversationId','sourceTurnId']){const f=fixture();f.client.resourceFromTurn=async()=>({created:false,resource:{...resource,[field]:randomUUID(),markdown:'Dato ajeno'}});const c=create(f);
  assert.equal(await c.open(cid,tid),'failed');assert.equal(c.getState().resource,null);assert.notEqual(c.getState().draft.markdown,'Dato ajeno');c.dispose();}
});

test('save acknowledgement with different resource identity cannot replace editor',async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Local',markdown:'Texto local'});
 f.queue.push({edited:true,resource:{...resource,id:randomUUID(),markdown:'Dato ajeno',revision:'8'}});await c.save();
 assert.notEqual(c.getState().resource?.id,undefined);assert.notEqual(c.getState().resource?.markdown,'Dato ajeno');assert.equal(c.getState().draft.markdown,'Texto local');c.dispose();
});

test('conflict refresh rejects resource from another identity without exposing it',async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Local',markdown:'Texto'});f.queue.push(err('CONFLICT',409));
 f.client.getResource=async()=>({...resource,id:randomUUID(),markdown:'Dato ajeno',revision:'8'});await c.save();
 assert.notEqual(c.getState().conflict?.markdown,'Dato ajeno');assert.equal(c.getState().draft.title,'Local');c.dispose();
});

test('identity loss during conflict refresh clears private state and stops retry',async()=>{
 for(const code of ['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','FORBIDDEN','NOT_FOUND']){const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Privado',markdown:'Secreto'});
  f.queue.push(err('CONFLICT',409));f.client.getResource=async()=>{throw err(code,code==='AUTH_REQUIRED'?401:403);};await c.save();
  assert.equal(c.getState().resource,null,code);assert.equal(c.getState().draft.markdown,'',code);assert.equal(c.getState().pending,null,code);const count=f.calls.length;await c.retry();assert.equal(f.calls.length,count);c.dispose();}
});

test('identity loss opening a replacement cannot retain earlier private resource',async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);assert.equal(c.close(),true);f.client.resourceFromTurn=async()=>{throw err('AUTH_REQUIRED',401);};
 await c.open(cid,tid);assert.equal(c.getState().resource,null);assert.equal(c.getState().draft.markdown,'');c.dispose();
});

test('UUID identity comparisons accept case differences across open, save ACK and conflict refresh',async()=>{
 const f=fixture(),c=create(f);assert.equal(await c.open(cid.toUpperCase(),tid.toUpperCase()),'opened');
 c.updateDraft({title:'Local',markdown:'Texto'});f.queue.push({edited:true,resource:{...resource,id:rid.toUpperCase(),conversationId:cid.toUpperCase(),sourceTurnId:tid.toUpperCase(),title:'Local',revision:'8'}});
 assert.equal(await c.save(),'saved');c.updateDraft({title:'Otro',markdown:'Texto'});f.queue.push(err('CONFLICT',409));
 f.client.getResource=async()=>({...resource,id:rid.toLowerCase(),conversationId:cid.toLowerCase(),sourceTurnId:tid.toLowerCase(),title:'Servidor',revision:'9'});
 assert.equal(await c.save(),'conflict');assert.equal(c.getState().conflict?.revision,'9');c.dispose();
});

test('UUID identity comparison still rejects a truly distinct resource despite case normalization',async()=>{
 const f=fixture(),c=create(f);await c.open(cid,tid);c.updateDraft({title:'Local',markdown:'Texto'});
 f.queue.push({edited:true,resource:{...resource,id:randomUUID().toUpperCase(),markdown:'Ajeno',revision:'8'}});await c.save();assert.notEqual(c.getState().resource?.markdown,'Ajeno');c.dispose();
});
