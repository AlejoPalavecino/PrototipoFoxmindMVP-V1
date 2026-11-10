import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';
import { createClassroomsHandler } from '../.build/api/apps/api/src/bootstrap/academic-http.js';
import { parseBrujulaSearchQuery } from '../src/core/domain/classrooms/brujula-search.ts';

async function server(handler) {
  const s=createServer(handler);await new Promise(resolve=>s.listen(0,'127.0.0.1',resolve));
  return {origin:`http://127.0.0.1:${s.address().port}`,close:()=>new Promise(resolve=>{s.closeAllConnections();s.close(resolve);})};
}
test('proxy y HTTP admiten búsqueda UTF8 sólo lectura y rechazan autoridad antes del servicio', async () => {
  const calls=[],admissions=[];
  const handler=createClassroomsHandler({search:async(req,query)=>{calls.push({cookie:req.headers.cookie,...parseBrujulaSearchQuery(query)});return {items:[],nextCursor:null};}}, {admit:async(_req,write)=>admissions.push(write)});
  const upstream=await server((req,res)=>{req.url=req.url.replace('/api/v1','');handler(req,res,()=>{res.statusCode=404;res.end();});});
  const web=await server((req,res)=>void proxyClassroomRequest(req,res,upstream.origin));
  try {
    const response=await fetch(`${web.origin}/api/v1/classrooms/search?q=Biolog%C3%ADa`,{headers:{cookie:'fixture=session'}});
    assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');
    assert.deepEqual(await response.json(),{items:[],nextCursor:null});
    assert.deepEqual(calls,[{cookie:'fixture=session',q:'biologia',cursor:null}]);assert.deepEqual(admissions,[false]);
    for(const query of ['q=a&q=b','actor=foreign','cursor=forged','limit=100','q='+ 'x'.repeat(121)]){
      assert.equal((await fetch(`${web.origin}/api/v1/classrooms/search?${query}`)).status,400);
      assert.equal(calls.length,1);
    }
    assert.equal((await fetch(`${web.origin}/api/v1/classrooms/search`,{method:'POST'})).status,405);
    assert.equal(calls.length,1);
    assert.equal((await fetch(`${web.origin}/api/v1/classrooms/%73earch?q=a`)).status,400);
  } finally {await web.close();await upstream.close();}
});
