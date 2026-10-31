import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { loadTsModule } from '../../../../tests/helpers/load-ts-module.mjs';

const cid=randomUUID(),tid=randomUUID(),root='/api/v1/foxy-ai';
const conversation={requestId:randomUUID(),title:'Chat',context:{kind:'GENERAL'}};
const message={requestId:randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:{topicIds:[],sourceIds:[]}};
const create=(fetcher,notify)=>{const api=loadTsModule('apps/web/src/lib/foxy-client.ts');assert.equal(typeof api.createWebFoxyClient,'function');return api.createWebFoxyClient(fetcher,notify);};

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
