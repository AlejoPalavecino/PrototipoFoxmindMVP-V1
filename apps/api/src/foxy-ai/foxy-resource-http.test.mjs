import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

test('resource routes require admission, validate identifiers and expose only public DTO',async()=>{
  const {createFoxyHandler}=await import('./http.ts'),cid=randomUUID(),tid=randomUUID(),rid=randomUUID(),calls=[];
  const resource={id:rid,conversationId:cid,sourceTurnId:tid,title:'Resumen',markdown:'Texto',revision:'0'};let created=true;
  const resources={fromTurn:async(req,c,t)=>{calls.push(['fromTurn',c,t]);const result={created,resource};created=false;return result;},
    get:async(req,id)=>{calls.push(['get',id]);return resource;},edit:async(req,id,input)=>{calls.push(['edit',id,input]);return {edited:true,resource};}};
  const handler=createFoxyHandler({resources},{admit:async(req,write)=>{if(!req.headers.cookie)throw Object.assign(Error('x'),{code:'AUTH_REQUIRED'});
    if(write && (req.headers.origin!=='http://web.test'||req.headers['x-csrf-token']!=='bound'))throw Object.assign(Error('x'),{code:'CSRF_INVALID'});}});
  const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end();}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const root=`http://127.0.0.1:${server.address().port}/api/v1/foxy-ai`,headers={cookie:'session=synthetic',origin:'http://web.test','x-csrf-token':'bound','content-type':'application/json'};
  const send=(path,method='GET',body,extra={})=>fetch(root+path,{method,headers:{...headers,...extra},...(body?{body:JSON.stringify(body)}:{})});
  try{
    const path=`/conversations/${cid}/turns/${tid}/resource`,first=await send(path,'POST');assert.equal(first.status,201);assert.deepEqual(await first.json(),{created:true,resource});
    assert.equal((await send(path,'POST')).status,200);const get=await send(`/resources/${rid}`);assert.equal(get.status,200);assert.deepEqual(await get.json(),resource);
    const input={requestId:randomUUID(),revision:'0',title:'Cambio',markdown:'Contenido'};assert.equal((await send(`/resources/${rid}`,'PATCH',input)).status,200);
    assert.equal((await send(`/resources/${rid}`,'PATCH',input,{'x-csrf-token':'bad'})).status,403);
    assert.equal((await send(`/resources/${rid}`,'PATCH',input,{origin:'http://evil.test'})).status,403);
    assert.equal((await send(`/resources/${rid}`,'GET',undefined,{cookie:''})).status,401);
    const before=calls.length;assert.ok((await send('/resources/not-uuid')).status>=400);assert.equal(calls.length,before);
    assert.equal(first.headers.get('cache-control'),'no-store');assert.equal(first.headers.get('x-content-type-options'),'nosniff');
  }finally{server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
