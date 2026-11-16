import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from "../../../../../../tests/helpers/load-ts-module.mjs";

const cid=randomUUID(),tid=randomUUID(),root='/api/v1/foxy-ai';
const conversation={requestId:randomUUID(),title:'Chat',context:{kind:'GENERAL'}};
const message={requestId:randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:{topicIds:[],sourceIds:[]}};
const create=(fetcher,notify)=>{const api=loadTsModule("apps/web/src/features/foxy/api/foxy-client.ts");assert.equal(typeof api.createWebFoxyClient,'function');return api.createWebFoxyClient(fetcher,notify);};

test('visual editorial PATCH preserves the idempotent request and refreshes CSRF',async()=>{
 const calls=[],input={expectedRevision:'3',requestId:randomUUID(),title:'Revisado',description:'Texto guardado'};
 const client=create(async(path,init)=>{calls.push({path,...init});return Response.json(path.includes('/auth/csrf')?{csrfToken:'synthetic'}:{asset:{id:cid},editorial:{revision:'4',title:input.title,description:input.description}});});
 const result=await client.updateVisualEditorial(cid,input);
 assert.equal(result.editorial.revision,'4');assert.equal(calls[0].path,'/api/v1/auth/csrf');assert.equal(calls[1].path,`${root}/assets/${cid}/editorial`);
 assert.equal(calls[1].method,'PATCH');assert.deepEqual(JSON.parse(calls[1].body),input);assert.equal(calls[1].headers['X-CSRF-Token'],'synthetic');assert.equal(calls[1].cache,'no-store');
});

test('web client routes reads and mutations with fresh CSRF and private fetch policy',async()=>{
  const calls=[];let csrf=0;
  const client=create(async(path,init)=>{calls.push({path,...init});if(String(path).includes('/auth/csrf'))return Response.json({csrfToken:`token-${++csrf}`});
    if(init.method==='DELETE')return new Response(null,{status:204});return Response.json({created:true,turn:{id:tid,sequence:1,state:'QUEUED'},conversationRevision:'1'});});
  const signal=new AbortController().signal;
  await client.capabilities(signal); await client.listConversations({limit:10,after:null},signal); await client.createConversation(conversation,signal);
  await client.getConversation(cid,signal); await client.renameConversation(cid,{revision:'0',title:'Nuevo'},signal);
  await client.removeConversation(cid,{revision:'1',confirm:true},signal); await client.curriculum(cid,signal);
  await client.sources(cid,{kind:'PLAN',limit:10,after:null},signal);
  const sent=await client.sendMessage(cid,message,signal);assert.equal(sent.turn.id,tid);assert.equal(sent.turn.state,'QUEUED');assert.equal(sent.turn.answer,undefined);
  await client.listTurns(cid,{afterSequence:0,limit:10},signal);await client.getTurn(cid,tid,signal);await client.citations(cid,tid,signal);
  const business=calls.filter(c=>!String(c.path).includes('/auth/csrf'));assert.equal(business.length,12);assert.equal(csrf,4);
  assert.deepEqual(business.map(c=>new URL(c.path,'http://web.test').pathname),[`${root}/capabilities`,`${root}/conversations`,`${root}/conversations`,
    `${root}/conversations/${cid}`,`${root}/conversations/${cid}`,`${root}/conversations/${cid}`,`${root}/conversations/${cid}/curriculum`,
    `${root}/conversations/${cid}/sources`,`${root}/conversations/${cid}/turns`,`${root}/conversations/${cid}/turns`,`${root}/conversations/${cid}/turns/${tid}`,`${root}/conversations/${cid}/turns/${tid}/citations`]);
  assert.deepEqual(business.map(c=>c.method),['GET','GET','POST','GET','PATCH','DELETE','GET','GET','POST','GET','GET','GET']);
  for(const call of business){assert.equal(call.credentials,'same-origin');assert.equal(call.cache,'no-store');assert.ok(call.signal instanceof AbortSignal);}
  assert.deepEqual(business.filter(c=>c.method!=='GET').map(c=>new Headers(c.headers).get('x-csrf-token')),['token-1','token-2','token-3','token-4']);
});

test('object cursors are UTF-8 base64url and turn continuation is preserved',async()=>{
  const calls=[],cursor={updatedAt:'2026-01-01T00:00:00.123Z',id:randomUUID()}, source={createdAt:'2026-01-01T00:00:00.456Z',id:randomUUID()};
  const client=create(async(path,init)=>{calls.push({path,init});return Response.json({items:[],nextAfterSequence:7});});
  await client.listConversations({limit:3,after:cursor});await client.sources(cid,{kind:'MATERIAL',limit:3,after:source});
  const page=await client.listTurns(cid,{afterSequence:7,limit:3});assert.equal(page.nextAfterSequence,7);
  for(const [index,value] of [[0,cursor],[1,source]]){const query=new URL(calls[index].path,'http://web.test');
    assert.deepEqual(JSON.parse(Buffer.from(query.searchParams.get('after'),'base64url').toString('utf8')),value);}
  assert.equal(new URL(calls[2].path,'http://web.test').searchParams.get('afterSequence'),'7');
});

test('identity expiry notifies once, errors preserve status and aborted request is not retried',async()=>{
  const notifications=[],calls=[];let mode='AUTH_REQUIRED';
  const client=create(async(path,init)=>{calls.push({path,init});return Response.json({error:{code:mode}},{status:mode==='AUTH_REQUIRED'?401:409});},code=>notifications.push(code));
  await assert.rejects(client.capabilities(),error=>error.code==='AUTH_REQUIRED' && error.status===401);assert.deepEqual(notifications,['AUTH_REQUIRED']);
  mode='CONFLICT';await assert.rejects(client.getConversation(cid),error=>error.code==='CONFLICT' && error.status===409);assert.equal(calls.length,2);
  const controller=new AbortController();controller.abort();
  const aborted=create(async(_path,init)=>{init.signal.throwIfAborted();throw Error('unexpected');});
  await assert.rejects(aborted.capabilities(controller.signal));
});

test('resource and publication methods preserve bodies, int64 revisions, signal and fresh CSRF',async()=>{
 const rid=randomUUID(),pid=randomUUID(),room=randomUUID(),calls=[];let csrf=0;const controller=new AbortController(),signal=controller.signal;
 const edit={requestId:randomUUID(),revision:'9223372036854775806',title:'Guía',markdown:'Texto'},prepare={requestId:randomUUID(),resourceRevision:'1000000000000000000',classroomId:room,title:'Guía',unitId:null,topicId:null};
 const confirm={requestId:randomUUID(),publicationRevision:'1000000000000000000',classroomRevision:'9223372036854775806',confirm:true};
 const client=create(async(path,init)=>{calls.push({path,...init});if(String(path).includes('/auth/csrf'))return Response.json({csrfToken:`csrf-${++csrf}`});return Response.json({items:[],nextAfterId:null});});
 await client.resourceFromTurn(cid,tid,signal);await client.getResource(rid,signal);await client.editResource(rid,edit,signal);
 await client.preparePublication(rid,prepare,signal);await client.listPublications(rid,{limit:50,afterId:pid},signal);await client.inspectPublication(pid,signal);await client.confirmPublication(pid,confirm,signal);
 const business=calls.filter(c=>!String(c.path).includes('/auth/csrf'));assert.deepEqual(business.map(c=>[new URL(c.path,'http://web.test').pathname,c.method]),[
  [`${root}/conversations/${cid}/turns/${tid}/resource`,'POST'],[`${root}/resources/${rid}`,'GET'],[`${root}/resources/${rid}`,'PATCH'],
  [`${root}/resources/${rid}/publications`,'POST'],[`${root}/resources/${rid}/publications`,'GET'],[`${root}/publications/${pid}`,'GET'],[`${root}/publications/${pid}/confirm`,'POST']]);
 assert.deepEqual(business.filter(c=>['PATCH','POST'].includes(c.method)).map(c=>new Headers(c.headers).get('x-csrf-token')),['csrf-1','csrf-2','csrf-3','csrf-4']);
 assert.deepEqual(JSON.parse(business[2].body),edit);assert.deepEqual(JSON.parse(business[3].body),prepare);assert.deepEqual(JSON.parse(business[6].body),confirm);
 const q=new URL(business[4].path,'http://web.test').searchParams;assert.equal(q.get('limit'),'50');assert.equal(q.get('afterId'),pid);
 for(const call of business){assert.equal(call.credentials,'same-origin');assert.equal(call.cache,'no-store');assert.ok(call.signal instanceof AbortSignal);}
 controller.abort();assert.ok(business.every(call=>call.signal.aborted));
});

test('publication file URL stays same-origin and errors, abort and identity expiry never retry',async()=>{
 const rid=randomUUID(),pid=randomUUID(),calls=[],notified=[];const client=create(async(path,init)=>{calls.push({path,init});
  if(String(path).includes('/auth/csrf'))return Response.json({csrfToken:'csrf'});return Response.json({error:{code:'AUTH_REQUIRED'}},{status:401});},code=>notified.push(code));
 for(const mode of ['preview','download'])assert.equal(client.publicationFileUrl(pid,mode),`${root}/publications/${pid}/file?mode=${mode}`);
 await assert.rejects(client.inspectPublication(pid),e=>e.code==='AUTH_REQUIRED'&&e.status===401);assert.deepEqual(notified,['AUTH_REQUIRED']);assert.equal(calls.length,1);
 const controller=new AbortController();controller.abort();let business=0;const aborted=create(async(path,init)=>{init.signal.throwIfAborted();business++;return Response.json({});});
 await assert.rejects(aborted.getResource(rid,controller.signal));assert.equal(business,0);
});

for(const kind of ['edit','prepare','confirm'])test(`resource writes snapshot ${kind} before waiting for CSRF`,async()=>{
 const rid=randomUUID(),pid=randomUUID(),room=randomUUID();
  let release,entered;const gate=new Promise(r=>release=r),started=new Promise(r=>entered=r),calls=[];
  const client=create(async(path,init)=>{if(String(path).includes('/auth/csrf')){entered();await gate;return Response.json({csrfToken:'bound'});}calls.push({path,body:JSON.parse(init.body)});return Response.json({ok:true});});
  const value=kind==='edit'?{requestId:randomUUID(),revision:'1',title:'Original',markdown:'Texto original'}:kind==='prepare'?{requestId:randomUUID(),resourceRevision:'1',classroomId:room,title:'Original',unitId:null,topicId:null}:{requestId:randomUUID(),publicationRevision:'1',classroomRevision:'2',confirm:true};
  const expected=structuredClone(value),run=kind==='edit'?client.editResource(rid,value):kind==='prepare'?client.preparePublication(rid,value):client.confirmPublication(pid,value);
  await started;Object.assign(value,{requestId:randomUUID(),revision:'99',resourceRevision:'99',publicationRevision:'99',classroomRevision:'99',title:'Alterado',markdown:'Alterado'});release();await run;
  assert.deepEqual(calls[0].body,expected,kind);
});


test('publication management client uses fresh CSRF, exact bodies and abort propagation without retries',async()=>{
 const id=randomUUID(),calls=[],controller=new AbortController(),retry={requestId:randomUUID(),publicationRevision:'9223372036854775806'},discard={requestId:randomUUID(),publicationRevision:'7',confirm:true};let csrf=0;
 const client=create(async(path,init)=>{calls.push({path:String(path),init});if(String(path).includes('/auth/csrf'))return Response.json({csrfToken:`csrf-${++csrf}`});return Response.json({ok:true});});
 await client.inspectPublicationManagement(id,controller.signal);await client.retryPublication(id,retry,controller.signal);await client.discardPublication(id,discard,controller.signal);
 const business=calls.filter(c=>!c.path.includes('/auth/csrf'));assert.deepEqual(business.map(c=>[c.path,c.init.method]),[[`${root}/publications/${id}/management`,'GET'],[`${root}/publications/${id}/retry`,'POST'],[`${root}/publications/${id}/discard`,'POST']]);
 assert.deepEqual(JSON.parse(business[1].init.body),retry);assert.deepEqual(JSON.parse(business[2].init.body),discard);assert.equal(csrf,2);
 assert.equal(new Headers(business[1].init.headers).get('x-csrf-token'),'csrf-1');assert.equal(new Headers(business[2].init.headers).get('x-csrf-token'),'csrf-2');
 for(const call of business){assert.equal(call.init.credentials,'same-origin');assert.equal(call.init.cache,'no-store');assert.ok(call.init.signal);}
 controller.abort();for(const call of business)assert.equal(call.init.signal.aborted,true);
});

test('management client snapshots retry and discard before asynchronous CSRF and never auto-retries',async()=>{
 for(const action of ['retryPublication','discardPublication']){const id=randomUUID(),calls=[];let started,release;const ready=new Promise(r=>started=r),gate=new Promise(r=>release=r);
  const client=create(async(path,init)=>{if(String(path).includes('/auth/csrf')){started();await gate;return Response.json({csrfToken:'fresh'});}calls.push(JSON.parse(init.body));return Response.json({error:{code:'SERVICE_UNAVAILABLE'}},{status:503});});
  const input={requestId:randomUUID(),publicationRevision:'1',...(action==='discardPublication'?{confirm:true}:{})},expected=structuredClone(input),running=client[action](id,input);
  await ready;input.requestId=randomUUID();input.publicationRevision='2';if(action==='discardPublication')input.confirm=false;release();await assert.rejects(running);assert.deepEqual(calls,[expected]);
 }
});
