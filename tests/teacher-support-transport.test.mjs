import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { createClassroomClient } from '../apps/web/src/application/transport/classroom-client.ts';
import { proxyClassroomRequest } from '../apps/web/src/application/server/classroom-proxy.ts';

const id = 'a1111111-1111-4111-8111-111111111111';
const member = 'a2222222-2222-4222-8222-222222222222';
const attempt = 'a3333333-3333-4333-8333-333333333333';

test('el cliente obtiene lista, ficha y fuente como lecturas cancelables sin caché', async () => {
  const { createTeacherSupportClient } = await import('../apps/web/src/application/transport/teacher-support-client.ts');
  const calls = [];
  const api = createClassroomClient({prefix:'/api/v1',csrfToken:assert.fail,
    fetch:async (url,init)=>{calls.push({url,init});return Response.json({ok:true});}});
  const client = createTeacherSupportClient(api);
  const controller = new AbortController();
  await client.list(id, 2, controller.signal);
  await client.record(id, member, controller.signal);
  await client.evidence(id, member, attempt, controller.signal);
  const [list,record,evidence] = calls.map(call=>new URL(call.url,'http://local'));
  assert.equal(list.pathname,'/api/v1/classrooms/teacher-support');
  assert.equal(list.searchParams.get('page'),'2');
  assert.equal(list.searchParams.get('classroomId'),id);
  assert.equal(record.pathname,`/api/v1/classrooms/${id}/members/${member}/support`);
  assert.equal(evidence.pathname,record.pathname+'/evidence/'+attempt);
  controller.abort();
  assert.ok(calls.every(({init})=>init.method==='GET' && init.cache==='no-store' && init.signal.aborted));
});

test('el proxy admite las tres lecturas, deja los parámetros a la API y rechaza escrituras y cabeceras de intento', async t => {
  const calls=[];
  const upstream=createServer((req,res)=>{calls.push([req.url,req.headers.cookie]);res.setHeader('content-type','application/json');res.end('{}');});
  const listen=server=>new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  await listen(upstream);
  const proxy=createServer((req,res)=>void proxyClassroomRequest(req,res,'http://127.0.0.1:'+upstream.address().port));
  await listen(proxy);
  t.after(async()=>{for(const server of [proxy,upstream]){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}});
  const root='http://127.0.0.1:'+proxy.address().port+'/api/v1/classrooms';
  const list='/teacher-support', detail='/'+id+'/members/'+member+'/support';
  for(const path of [list,list+'?page=2&classroomId='+id,detail,detail+'/evidence/'+attempt]){
    assert.equal((await fetch(root+path,{headers:{cookie:'foxmind_session=fixture'}})).status,200);
    assert.deepEqual(calls.at(-1),['/api/v1/classrooms'+path,'foxmind_session=fixture']);
  }
  for(const path of [list+'?page=0',list+'?page=1&page=2',list+'?teacherId='+id,list+'?classroomId=x',detail+'?page=1']){
    assert.equal((await fetch(root+path)).status,200);
    assert.equal(calls.at(-1)[0],'/api/v1/classrooms'+path);
  }
  const before=calls.length;
  assert.equal((await fetch(root+detail,{method:'POST'})).status,405);
  assert.equal((await fetch(root+list,{headers:{'x-attempt-editor':'fixture'}})).status,400);
  assert.equal(calls.length,before);
});
test('la vista de integrantes exige una única aula y el proxy comparte la política de paginación', async () => {
  const { parseTeacherSupportQuery } = await import('../src/core/domain/grading/teacher-support-query.ts');
  assert.deepEqual(parseTeacherSupportQuery(new URLSearchParams()), { classroomId:null, page:1, roster:false });
  assert.deepEqual(parseTeacherSupportQuery(new URLSearchParams({classroomId:id,roster:'true',page:'12'})),
    { classroomId:id, page:12, roster:true });
  for (const input of ['roster=true','page=1.2','page=1000001','roster=false','classroomId='+id+'&classroomId='+id]) {
    assert.throws(()=>parseTeacherSupportQuery(new URLSearchParams(input)), /INVALID_INPUT/);
  }
});

test('el proxy y el cliente separan la lectura de escritura del pedido con cargo al docente', async t => {
  const { createTeacherSupportClient } = await import('../apps/web/src/application/transport/teacher-support-client.ts');
  const { proxyStudyRequest } = await import('../apps/web/src/application/server/study-proxy.ts');
  const requests = [];
  async function serve(handler) {
    const server = createServer(handler);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    t.after(() => { server.closeAllConnections(); return new Promise(resolve => server.close(resolve)); });
    return 'http://127.0.0.1:' + server.address().port;
  }
  const upstream = await serve(async (req,res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    requests.push({ method:req.method, path:req.url, csrf:req.headers['x-csrf-token'], body });
    res.setHeader('content-type','application/json'); res.end('{}');
  });
  const proxy = await serve((req,res) => void (req.url.startsWith('/api/v1/study-folders') ? proxyStudyRequest : proxyClassroomRequest)(req,res,upstream));
  const api = createClassroomClient({prefix:'/api/v1',fetch:(path,init)=>fetch(proxy+path,init),csrfToken:async ()=>'test-token'});
  const client = createTeacherSupportClient(api);
  const base = '/api/v1/classrooms/'+id+'/members/'+member+'/support/writing';
  await client.writing(id,member);
  await client.requestWriting(id,member);
  await client.writingEvidence(id,member,attempt);
  assert.deepEqual(requests, [
    {method:'GET',path:base,csrf:undefined,body:''},
    {method:'POST',path:base,csrf:'test-token',body:'{}'},
    {method:'GET',path:base+'/evidence/'+attempt,csrf:undefined,body:''},
  ]);
  const share = '/api/v1/study-folders/'+id+'/shared-strategy';
  const headers = {'content-type':'application/json','x-csrf-token':'test-token'};
  for (const [path,method,body] of [[share,'GET'],[share,'PUT',JSON.stringify({classroomId:id,text:'Reviso los ejemplos'})],[share+'/'+attempt,'DELETE']]) {
    const response = await fetch(proxy+path,{method,headers,body});
    assert.equal(response.status,200);
    assert.equal(requests.at(-1).path,path);
  }
  assert.equal((await fetch(proxy+share,{method:'DELETE'})).status,405);
  assert.equal((await fetch(proxy+base,{method:'POST',headers,body:JSON.stringify({text:'private'})})).status,400);
});
