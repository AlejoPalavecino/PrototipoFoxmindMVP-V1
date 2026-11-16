import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:http';
import {createFoxyHandler} from '../../presentation/http.ts';
import {createFoxyPrivateAssetEditorialService} from '../../application/private-asset-editorial-service.ts';

test('editorial HTTP PATCH uses write admission, validates input and returns only the private view',async()=>{
 const assetId=randomUUID(),calls=[],view={asset:{id:assetId},payload:{title:'Original'},editorial:{revision:'1',title:'Guardado',description:'Texto'},canEdit:true};
 const service=createFoxyPrivateAssetEditorialService({uow:{run:async(req,write,fn)=>{assert.equal(write,true);if(req.headers.cookie!=='owner')throw Object.assign(Error(),{code:'NOT_FOUND'});return fn({}, {id:randomUUID()});}},assets:{edit:async(_tx,_actor,id,command)=>{calls.push(command);return {assetId:id,action:'EDIT',editorialRevision:'1'};}},reads:{inspect:async()=>view}});
 const handler=createFoxyHandler({privateAssetEditorial:service},{admit:async(req,write)=>{assert.equal(write,true);if(req.headers['x-csrf-token']!=='valid')throw Object.assign(Error(),{code:'CSRF_INVALID'});}});
 const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const input={requestId:randomUUID(),expectedRevision:'0',title:'Guardado',description:'Texto'},url=`http://127.0.0.1:${server.address().port}/api/v1/foxy-ai/assets/${assetId}/editorial`;
 const send=(body=input,headers={},suffix='')=>fetch(url+suffix,{method:'PATCH',headers:{'Content-Type':'application/json',cookie:'owner','x-csrf-token':'valid',...headers},body:JSON.stringify(body),signal:AbortSignal.timeout(5000)});
 try {let response=await send();assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{...view,receipt:{assetId,action:'EDIT',editorialRevision:'1'}});assert.deepEqual(calls,[input]);
  response=await send(input,{'x-csrf-token':'wrong'});assert.equal(response.status,403);
  response=await send(input,{cookie:'other'});assert.equal(response.status,404);
  response=await send({...input,expectedRevision:'01'});assert.equal(response.status,400);
  response=await send(input,{},'?unknown=1');assert.equal(response.status,400);assert.equal(calls.length,1);
 } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
});
