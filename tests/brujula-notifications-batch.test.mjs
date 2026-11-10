import test from 'node:test';import assert from 'node:assert/strict';
import {loadTsModule} from './helpers/load-ts-module.mjs';import {hookView,descendants} from './agenda-ui-helpers.test.mjs';
const text=n=>typeof n==='string'?n:Array.isArray(n)?n.map(text).join(' '):text(n?.props?.children??'');
test('121 unread notifications require one batch mutation and a readback, independent of pagination',async()=>{
 const {Notifications}=loadTsModule('apps/web/src/features/notifications/ui/Notifications.tsx'),calls=[];let unread=121;
 const rows=Array.from({length:121},(_,i)=>({id:'notification-'+i,eventType:'WALL_NOTICE',classroomName:'Synthetic',createdAt:'2026-11-05T10:00:00Z',readAt:null}));
 const api={call:async(path,method)=>{calls.push([path,method]);if(method==='POST'){if(path==='/notifications/read-all'){const count=unread;unread=0;return {read:true,updatedCount:count};}unread--;return {read:true};}const cursor=path.match(/cursor=(\d+)/)?.[1],start=Number(cursor??0);return {items:unread?rows.slice(start,start+50):[],unreadCount:unread,nextCursor:unread&&start+50<121?String(start+50):null};}};
 const view=hookView(Notifications,{api,refresh:0,presentation:'center',onSelect(){}});try{await view.flush();descendants(view.tree,n=>n.type==='button'&&text(n)==='Marcar todas como leídas')[0].props.onClick();await view.flush();assert.deepEqual(calls.filter(([,method])=>method==='POST'),[['/notifications/read-all','POST']]);assert.equal(unread,0);assert.match(text(view.tree),/Estás al día/);}finally{view.close();}
});

test('read-all proxy/API accepts only empty POST and preserves admission and fresh CSRF forwarding',async()=>{
 const {createServer}=await import('node:http');const {createClassroomsHandler}=loadTsModule("apps/api/src/bootstrap/academic-http.ts");const {proxyClassroomRequest}=loadTsModule('apps/web/src/application/server/classroom-proxy.ts');
 const calls=[];const handler=createClassroomsHandler({readAllNotifications:async req=>{calls.push(req.headers['x-csrf-token']);return {read:true,updatedCount:121};}},{admit:async(req,write)=>{assert.equal(write,true);assert.equal(req.headers.cookie,'session=synthetic');assert.equal(req.headers['x-csrf-token'],'fresh-synthetic-csrf');}});
 const serve=async fn=>{const server=createServer(fn);await new Promise(r=>server.listen(0,'127.0.0.1',r));return {origin:'http://127.0.0.1:'+server.address().port,close:()=>new Promise(r=>server.close(r))};};
 const api=await serve((req,res)=>{req.url=req.url.replace(/^\/api\/v1/,'');handler(req,res,()=>{res.writeHead(404);res.end('{}');});});
 const web=await serve((req,res)=>void proxyClassroomRequest(req,res,api.origin));
 const headers={'content-type':'application/json',cookie:'session=synthetic','x-csrf-token':'fresh-synthetic-csrf'};
 try{const url=web.origin+'/api/v1/classrooms/notifications/read-all';const response=await fetch(url,{method:'POST',headers,body:'{}'});assert.equal(response.status,200);assert.deepEqual(await response.json(),{read:true,updatedCount:121});assert.deepEqual(calls,['fresh-synthetic-csrf']);
 for(const body of [{ids:['other']},{recipientId:'other'},{actor:'other'}])assert.equal((await fetch(url,{method:'POST',headers,body:JSON.stringify(body)})).status,400);
 assert.equal((await fetch(url+'?actor=other',{method:'POST',headers,body:'{}'})).status,400);assert.equal((await fetch(url,{method:'GET',headers:{cookie:headers.cookie}})).status,405);assert.equal(calls.length,1);
 assert.equal((await fetch(api.origin+'/api/v1/classrooms/notifications/read-all',{method:'POST',headers,body:'{"ids":["other"]}'})).status,400);assert.equal(calls.length,1);
 }finally{await web.close();await api.close();}
});
