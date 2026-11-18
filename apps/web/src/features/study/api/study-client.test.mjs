import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyClient } from './study-http.ts';
import { validateStudyPlan } from '../model/study-transitions.ts';
import {proxyStudyRequest} from "../../../application/server/study-proxy.ts";
import {createServer} from 'node:http';
const id='a1a1a1a1-1111-4111-8111-a1a1a1a1a1a1';
test('validates codepoints, year and minimum structure',()=>{const units=[{id,title:'Unidad',topics:[{id,title:'Tema'}]}];assert.equal(validateStudyPlan('Biología','2026',units),null);assert.match(validateStudyPlan('','2026',units),/nombre/);assert.match(validateStudyPlan('A','0',units),/año/);assert.match(validateStudyPlan('A','2026',[]),/unidad/);assert.equal(validateStudyPlan('😀'.repeat(120),'2026',units),null);assert.match(validateStudyPlan('😀'.repeat(121),'2026',units),/nombre/);});
test('commands acquire CSRF, preserve request identity on transport failure and surface insufficient sources',async()=>{const calls=[];let fail=true;const api=createStudyClient(async(url,init)=>{calls.push({url,init});if(url.endsWith('/csrf'))return Response.json({csrfToken:'synthetic'});if(fail){fail=false;throw new Error('offline');}return Response.json({folder:{id,revision:'2'},result:{status:'INSUFFICIENT'}});});await assert.rejects(api.command(id,'1','GENERATE',{kind:'NOTE'}),{code:'SERVICE_UNAVAILABLE'});await assert.rejects(api.command(id,'2','GENERATE',{kind:'NOTE'}),{code:'SOURCES_INSUFFICIENT'});const sent=calls.filter(c=>c.url.endsWith('/commands'));assert.equal(JSON.parse(sent[0].init.body).requestId,JSON.parse(sent[1].init.body).requestId);assert.equal(sent[0].init.headers['X-CSRF-Token'],'synthetic');assert.equal(sent[0].init.credentials,'same-origin');});
test('pending receipts are visible and retry uses the same command id',async()=>{const ids=[];const api=createStudyClient(async(url,init)=>{if(url.endsWith('/csrf'))return Response.json({csrfToken:'synthetic'});ids.push(JSON.parse(init.body).requestId);return Response.json({result:{status:'PENDING'}});});for(let i=0;i<2;i++)await assert.rejects(api.command(id,'1','CHAT',{message:'Hola'}),{code:'PENDING'});assert.equal(ids[0],ids[1]);});
test('internal AI quota explains renewal and retry uses a fresh request identity', async () => {
  const requests = [];
  const api = createStudyClient(async (url, init) => {
    if (url.endsWith('/csrf')) return Response.json({ csrfToken: 'synthetic' });
    requests.push(JSON.parse(init.body));
    if (requests.length === 1) {
      return Response.json({ error: { code: 'AI_BUDGET_EXCEEDED' } }, { status: 429 });
    }
    return Response.json({ folder: { id, revision: '4' }, result: { status: 'COMPLETED' } });
  });
  const data = { message: 'Hola' };
  await assert.rejects(api.command(id, '1', 'CHAT', data), {
    code: 'AI_BUDGET_EXCEEDED', status: 429, message: /cupo diario de IA.*00:00 UTC/u,
  });
  assert.equal((await api.command(id, '3', 'CHAT', data)).result.status, 'COMPLETED');
  assert.notEqual(requests[0].requestId, requests[1].requestId);
  assert.equal(requests[0].message, requests[1].message);
});
test('proxy forwards JSON/CSRF and rejects paths, methods and unapproved queries',async()=>{let received;const upstream=createServer((req,res)=>{let body='';req.on('data',c=>body+=c);req.on('end',()=>{received={url:req.url,csrf:req.headers['x-csrf-token'],body};res.writeHead(200,{'Content-Type':'application/json'});res.end('{"ok":true}');});});await new Promise(resolve=>upstream.listen(0,'127.0.0.1',resolve));const target=`http://127.0.0.1:${upstream.address().port}`;const server=createServer((req,res)=>void proxyStudyRequest(req,res,target));await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const base=`http://127.0.0.1:${server.address().port}`;try{const ok=await fetch(base+`/api/v1/study-folders/${id}/commands`,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':'synthetic'},body:'{"action":"NEW_CONVERSATION"}'});assert.equal(ok.status,200);assert.equal(received.csrf,'synthetic');assert.equal((await fetch(base+'/api/v1/study-folders?secret=yes')).status,400);assert.equal((await fetch(base+'/api/v1/study-folders/unknown')).status,404);assert.equal((await fetch(base+`/api/v1/study-folders/${id}`,{method:'DELETE',headers:{'Content-Type':'application/json'},body:'{}'})).status,405);}finally{server.closeAllConnections();upstream.closeAllConnections();await Promise.all([new Promise(r=>server.close(r)),new Promise(r=>upstream.close(r))]);}});
test('collection summaries remain lightweight and detail is fetched separately',async()=>{const summary={id,name:'Biología',academicYear:2026,bannerKey:'biology',status:'DRAFT',revision:'3',linkedClassroomId:null,planFileId:null};const paths=[];const api=createStudyClient(async path=>{paths.push(path);return Response.json(path.endsWith(id)?{folder:{...summary,units:[{id,title:'Unidad',topics:[{id,title:'Tema'}]}],materials:[]},sources:[],conversations:[],creations:[],practices:[],exams:[],memory:{}}:{items:[summary],classrooms:[],covers:[]});});const collection=await api.list();assert.equal(Object.hasOwn(collection.items[0],'units'),false);assert.equal(Object.hasOwn(collection.items[0],'materials'),false);const detail=await api.get(collection.items[0].id);assert.equal(detail.folder.units[0].title,'Unidad');assert.deepEqual(paths,['/api/v1/study-folders',`/api/v1/study-folders/${id}`]);});
import { authHref as classroomAuthHref, safeDestination as classroomDestination } from '../../../application/navigation/destinations.ts';
test('study reauthentication preserves only approved collection/folder routes via next',()=>{for(const destination of ['/carpetas-de-estudio',`/carpetas-de-estudio/${id}`]){assert.equal(classroomDestination(destination),destination);for(const view of ['sign-in','verify-email']){const href=classroomAuthHref(view,destination);assert.equal(new URL(href,'https://synthetic.invalid').searchParams.get('next'),destination);assert.equal(new URL(href,'https://synthetic.invalid').searchParams.has('returnTo'),false);}}for(const destination of ['https://outside.invalid','//outside.invalid','/carpetas-de-estudio/not-an-id',`/carpetas-de-estudio/${id}?next=outside`])assert.equal(classroomAuthHref('sign-in',destination),'/sign-in');});
