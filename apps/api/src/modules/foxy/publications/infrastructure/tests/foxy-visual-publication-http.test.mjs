import test from 'node:test';
import assert from 'node:assert/strict';
import {createServer,request as httpRequest} from 'node:http';
import {randomUUID} from 'node:crypto';
const assetId=randomUUID(),publicationId=randomUUID(),classroomId=randomUUID(),path=`/api/v1/foxy-ai/assets/${assetId}/publications`;
const input={requestId:randomUUID(),assetRevision:'2',classroomId,title:'Ilustración',unitId:null,topicId:null};
async function fixture(run){const {createFoxyHandler}=await import("../../../presentation/http.ts"),calls=[];let created=true;
 const publications={prepareVisual:async(_req,...args)=>{calls.push(['prepare',...args]);const value={created,publication:{id:publicationId,sourceKind:'VISUAL',assetId}};created=false;return value;},listVisual:async(_req,...args)=>{calls.push(['list',...args]);return {items:[],nextAfterId:null}}};
 const handler=createFoxyHandler({publications},{admit:async(req,write)=>{if(req.headers.cookie!=='teacher')throw Object.assign(Error(),{code:'AUTH_REQUIRED'});if(write&&req.headers['x-csrf-token']!=='bound')throw Object.assign(Error(),{code:'CSRF_INVALID'})}});
 const server=createServer((req,res)=>handler(req,res,()=>{res.statusCode=404;res.end()}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const send=(url,{method='GET',body,headers={}}={})=>fetch(`http://127.0.0.1:${server.address().port}${url}`,{method,headers:{cookie:'teacher','x-csrf-token':'bound','content-type':'application/json',...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
 const rawGet=()=>new Promise((resolve,reject)=>{const req=httpRequest({hostname:'127.0.0.1',port:server.address().port,path,method:'GET',headers:{cookie:'teacher','content-length':'2'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode))});req.on('error',reject);req.end('{}')});
 try{await run({send,calls,rawGet})}finally{server.closeAllConnections();await new Promise(r=>server.close(r));}}
test('visual publication HTTP prepare/replay and list enforce strict admission and query',async()=>fixture(async({send,calls,rawGet})=>{
 for(const expected of [202,200]){const r=await send(path,{method:'POST',body:input});assert.equal(r.status,expected);assert.equal(r.headers.get('cache-control'),'no-store');}
 const page=await send(`${path}?limit=3&afterId=${publicationId}`);assert.equal(page.status,200);assert.deepEqual(calls.at(-1),['list',assetId,{limit:3,afterId:publicationId}]);
 const baseline=calls.length;for(const [url,opts] of [[path,{method:'POST',body:{...input,extra:true}}],[path,{method:'POST',body:{...input,title:'\n'}}],[path,{method:'POST',body:input,headers:{cookie:''}}],[path,{method:'POST',body:input,headers:{'x-csrf-token':'bad'}}],[`${path}?limit=0`,{}],[`${path}?limit=1&limit=2`,{}],[`${path}?afterId=bad`,{}],[`${path}?unknown=1`,{}]])assert.ok((await send(url,opts)).status>=400);
 assert.ok((await rawGet())>=400);assert.equal(calls.length,baseline);
}));
