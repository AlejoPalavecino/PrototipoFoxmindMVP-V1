import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { identityTestEnvironment } from '../../../../scripts/p33-identity-test-env.mjs';

const base='/api/v1/foxy-ai', webOrigin='http://127.0.0.1:3000';
test('management routes enforce real sessions, roles, CSRF, validation and stable receipts', {timeout:120000},async()=>{
 const api=await import('../../../../.build/api/apps/api/src/foxy-ai/index.js'),identity=await import('../../../../.build/api/apps/api/src/identity/index.js'),securityApi=await import('../../../../.build/api/apps/api/src/identity-security/index.js');
 await withAgendaDatabase(async({pool})=>{const security=securityApi.readIdentityConfiguration(identityTestEnvironment(),'127.0.0.1'),actors=[];
  for(const [role,verified] of [['teacher',true],['student',true],['teacher',false]]){const id=randomUUID(),token=securityApi.generateVerifier();
   await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
    VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture',CASE WHEN $3 THEN now() ELSE NULL END,$4)`,[id,`${id}@example.test`,verified,role]);
   await pool.query("INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES($1,$2,$3,now()+interval '1 hour',now())",[randomUUID(),id,securityApi.sessionTokenDigest(token)]);
   actors.push({id,cookie:`foxmind_session=${token}`,csrf:security.csrfToken(token)});
  }
  const tx={query:async(sql,...args)=>(await pool.query(sql,args)).rows},admissions=[],calls=[],resource=randomUUID(),publication=randomUUID(),classroom=randomUUID();
  const runtime={configuration:{security},store:{authenticate:token=>identity.authenticateSession(tx,token)},generalAdmission:async(ip,context)=>admissions.push({ip,context})};
  const receipt={publicationId:publication,publicationRevision:'1',action:'RETRY'},services={publicationManagement:{inspect:async(_req,id)=>{calls.push(['inspect',id]);return {publicationId:id,publicationRevision:'0',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'};},
   retry:async(_req,id,input)=>{calls.push(['retry',id,input]);return receipt;},discard:async(_req,id,input)=>{calls.push(['discard',id,input]);return {...receipt,action:'DISCARD'};}}};
  let mount,middleware;const app={use:(path,fn)=>{if(typeof path==='function'){mount='';middleware=path;}else{mount=path;middleware=fn;}}};api.installFoxyTransport(app,runtime,services);
  const server=createServer((req,res)=>{req.originalUrl=req.url;if(mount&&req.url.startsWith(mount))req.url=req.url.slice(mount.length)||'/';middleware(req,res,()=>{res.statusCode=404;res.end();});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const retry={requestId:randomUUID(),publicationRevision:'0'},discard={requestId:randomUUID(),publicationRevision:'0',confirm:true};
  const send=(path,actor,method='GET',body,headers={})=>fetch(origin+base+path,{method,headers:{...(actor?{cookie:actor.cookie}:{}),origin:webOrigin,'x-csrf-token':actor?.csrf??'','content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
  try{const teacher=actors[0],path=`/publications/${publication}`;
   const view=await send(`${path}/management`,teacher);assert.equal(view.status,200);assert.equal((await view.json()).publicationId,publication);
   const first=await send(`${path}/retry`,teacher,'POST',retry),again=await send(`${path}/retry`,teacher,'POST',retry);assert.equal(first.status,200);assert.equal(again.status,200);assert.deepEqual(await first.json(),await again.json());
   assert.equal((await send(`${path}/discard`,teacher,'POST',discard)).status,200);
   for(const actor of [actors[1],actors[2]])for(const [suffix,method,data] of [['/management','GET'],['/retry','POST',retry],['/discard','POST',discard]])assert.equal((await send(path+suffix,actor,method,data)).status,403);
   assert.equal((await send(`${path}/management`,null)).status,401);assert.equal((await send(`${path}/retry`,teacher,'POST',retry,{'x-csrf-token':'bad'})).status,403);
   assert.equal((await send(`${path}/discard`,teacher,'POST',discard,{origin:'http://evil.test'})).status,403);
   assert.equal((await send(`${path}/retry?unknown=1`,teacher,'POST',retry)).status,400);assert.equal((await send(`${path}/discard`,teacher,'POST',{...discard,extra:true})).status,400);
   assert.deepEqual(calls.map(c=>c[0]),['inspect','retry','retry','discard']);assert.ok(admissions.length>=4);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 });
});
