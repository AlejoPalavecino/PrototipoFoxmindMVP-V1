import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { identityTestEnvironment } from '../../../../scripts/p33-identity-test-env.mjs';

const base='/api/v1/foxy-ai', webOrigin='http://127.0.0.1:3000';
test('host authenticates persisted synthetic sessions once and preserves complete request path', { timeout:120000 }, async () => {
  const api=await import('../../../../.build/api/apps/api/src/foxy-ai/index.js'); assert.equal(typeof api.installFoxyTransport,'function');
  const identity=await import('../../../../.build/api/apps/api/src/identity/index.js'), securityApi=await import('../../../../.build/api/apps/api/src/identity-security/index.js');
  await withAgendaDatabase(async ({pool}) => {
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name,/_test$/);
    const security=securityApi.readIdentityConfiguration(identityTestEnvironment(),'127.0.0.1'), actors=[];
    for(const [role,verified] of [['teacher',true],['student',true],['teacher',false]]) {
      const id=randomUUID(), token=securityApi.generateVerifier();
      await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
        VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture',CASE WHEN $3 THEN now() ELSE NULL END,$4)`,[id,`${id}@example.test`,verified,role]);
      await pool.query("INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES($1,$2,$3,now()+interval '1 hour',now())",[randomUUID(),id,securityApi.sessionTokenDigest(token)]);
      actors.push({id,token,cookie:`foxmind_session=${token}`,csrf:security.csrfToken(token)});
    }
    const admissions=[], calls=[], tx={query:async(sql,...args)=>(await pool.query(sql,args)).rows};
    const runtime={configuration:{security},store:{authenticate:token=>identity.authenticateSession(tx,token)},generalAdmission:async(ip,context)=>admissions.push({ip,context})};
    const services={capabilities:async req=>{ calls.push(['capabilities',req.url]); return {textGeneration:{enabled:false},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}}; },
      conversations:{create:async(req,input)=>{calls.push(['create',req.url,input]);return {created:true,conversation:{id:randomUUID(),title:input.title,context:input.context,revision:'0'}};}}};
    let mount, middleware; const app={use:(path,fn)=>{if(typeof path==='function'){mount='';middleware=path;}else{mount=path;middleware=fn;}}};
    api.installFoxyTransport(app,runtime,services); assert.equal(typeof middleware,'function');
    const server=createServer((req,res)=>{ req.originalUrl=req.url; if(mount && req.url.startsWith(mount)) req.url=req.url.slice(mount.length)||'/';
      middleware(req,res,()=>{res.statusCode=404;res.end('next');}); });
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const origin=`http://127.0.0.1:${server.address().port}`;
    const send=(path,actor,method='GET',headers={})=>fetch(origin+path,{method,headers:{...(actor?{cookie:actor.cookie}:{}),origin:webOrigin,'x-csrf-token':actor?.csrf??'', 'content-type':'application/json',...headers},
      ...(method==='POST'?{body:JSON.stringify({requestId:randomUUID(),title:'Chat',context:{kind:'GENERAL'}})}:{})});
    try {
      const teacher=actors[0], ok=await send(`${base}/capabilities`,teacher); assert.equal(ok.status,200);
      assert.equal((await ok.json()).textGeneration.enabled,false); assert.equal(admissions.length,1);
      assert.equal(calls[0][1],`${base}/capabilities`);
      assert.equal((await send(`${base}/conversations`,teacher,'POST')).status,201);
      assert.equal((await send(`${base}/capabilities`,null)).status,401);
      assert.equal((await send(`${base}/capabilities`,actors[1])).status,403);
      assert.equal((await send(`${base}/capabilities`,actors[2])).status,403);
      assert.equal((await send(`${base}/conversations`,teacher,'POST',{'x-csrf-token':'bad'})).status,403);
      assert.equal((await send(`${base}/conversations`,teacher,'POST',{origin:'http://evil.test'})).status,403);
      const invalid=await send(`${base}/capabilities`,{cookie:'foxmind_session=invalid',csrf:''}); assert.equal(invalid.status,401);
      assert.ok(invalid.headers.get('set-cookie')?.includes('foxmind_session='));
      const before=admissions.length, next=await send('/api/v1/unrelated',teacher); assert.equal(next.status,404); assert.equal(await next.text(),'next');
      assert.equal(admissions.length,before); assert.equal(calls.filter(c=>c[0]==='create').length,1);
    } finally { server.closeAllConnections(); await new Promise(resolve=>server.close(resolve)); }
  });
});

test('publication routes enforce real session, teacher role, origin and CSRF at host', {timeout:120000},async()=>{
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
  const services={publications:{prepare:async(_req,id,input)=>{calls.push(['prepare',id]);return {created:true,publication:{id:publication}};},inspect:async(_req,id)=>{calls.push(['inspect',id]);return {publication:{id},classroomRevision:'0',classroomArchived:false,errorCode:null};},confirm:async(_req,id)=>{calls.push(['confirm',id]);return {publicationId:id,materialId:randomUUID(),publicationRevision:'1',classroomRevision:'1'};}}};
  let mount,middleware;const app={use:(path,fn)=>{if(typeof path==='function'){mount='';middleware=path;}else{mount=path;middleware=fn;}}};api.installFoxyTransport(app,runtime,services);
  const server=createServer((req,res)=>{req.originalUrl=req.url;if(mount&&req.url.startsWith(mount))req.url=req.url.slice(mount.length)||'/';middleware(req,res,()=>{res.statusCode=404;res.end();});});
  await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
  const prepare={requestId:randomUUID(),resourceRevision:'0',classroomId:classroom,title:'Guía',unitId:null,topicId:null},confirm={requestId:randomUUID(),publicationRevision:'0',classroomRevision:'0',confirm:true};
  const send=(path,actor,method='GET',body,headers={})=>fetch(origin+base+path,{method,headers:{...(actor?{cookie:actor.cookie}:{}),origin:webOrigin,'x-csrf-token':actor?.csrf??'','content-type':'application/json',...headers},...(body?{body:JSON.stringify(body)}:{})});
  try{const teacher=actors[0];assert.equal((await send(`/resources/${resource}/publications`,teacher,'POST',prepare)).status,202);
   assert.equal((await send(`/publications/${publication}`,teacher)).status,200);assert.equal((await send(`/publications/${publication}/confirm`,teacher,'POST',confirm)).status,200);
   for(const actor of [actors[1],actors[2]])for(const [path,method,body] of [[`/resources/${resource}/publications`,'POST',prepare],[`/publications/${publication}`,'GET'],[`/publications/${publication}/confirm`,'POST',confirm]])assert.equal((await send(path,actor,method,body)).status,403);
   assert.equal((await send(`/publications/${publication}`,null)).status,401);
   assert.equal((await send(`/publications/${publication}/confirm`,teacher,'POST',confirm,{'x-csrf-token':'bad'})).status,403);
   assert.equal((await send(`/resources/${resource}/publications`,teacher,'POST',prepare,{origin:'http://evil.test'})).status,403);
   assert.deepEqual(calls.map(c=>c[0]),['prepare','inspect','confirm']);assert.ok(admissions.length>=3);
  }finally{server.closeAllConnections();await new Promise(r=>server.close(r));}
 });
});
