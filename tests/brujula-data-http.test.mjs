import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createHomeHandler } from '../apps/api/src/modules/home/dashboard/presentation/http.ts';
test('new Home module routes preserve read-only admission and opaque pagination',async()=>{
 const seen=[];
 const handler=createHomeHandler({page:async(_r,q)=>{seen.push(q);return {module:q.module,page:{status:'ready',items:[],totalItems:0,nextCursor:null}};}},{admit:async(_r,w)=>assert.equal(w,false)});
 const server=createServer((q,s)=>handler(q,s,()=>{s.writeHead(404);s.end();}));await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {for(const module of ['drafts','submitted']){
  const res=await fetch(`http://127.0.0.1:${server.address().port}/home/modules/${module}?timeZone=UTC&cursor=opaque`);
  assert.equal(res.status,200);assert.equal(res.headers.get('cache-control'),'no-store');assert.equal((await res.json()).module,module);
 }
 assert.deepEqual(seen.map(x=>[x.module,x.cursor]),[['drafts','opaque'],['submitted','opaque']]);
 }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
});
