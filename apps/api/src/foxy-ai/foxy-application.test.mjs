import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { identityTestEnvironment } from '../../../../scripts/p33-identity-test-env.mjs';

const base='/api/v1/foxy-ai';
test('application installs Foxy with actual session, role and CSRF enforcement while AI is disabled', { timeout:120000 }, async () => {
  const {createApplication}=await import('../../../../.build/api/apps/api/src/application.js');
  const {readConfiguration}=await import('../../../../.build/api/apps/api/src/configuration.js');
  const {FOXY_RUNTIME}=await import('../../../../.build/api/apps/api/src/foxy-ai/index.js');
  const {FileHostLifecycle}=await import('../../../../.build/api/apps/api/src/files/index.js');
  const {PrismaService}=await import('../../../../.build/api/apps/api/src/database/prisma.service.js');
  const {generateVerifier,sessionTokenDigest}=await import('../../../../.build/api/apps/api/src/identity-security/index.js');
  await withAgendaDatabase(async ({pool,databaseUrl})=>{
    assert.match((await pool.query('SELECT current_database() name')).rows[0].name,/_test$/);
    const config=readConfiguration({...identityTestEnvironment(),DATABASE_URL:databaseUrl,API_PORT:'0',AI_ENABLED:'false',
      FILES_ENABLED:'1',FILES_S3_ENDPOINT:'http://127.0.0.1:9',FILES_S3_REGION:'us-east-1',FILES_S3_BUCKET:'synthetic-private',
      FILES_S3_ACCESS_KEY_ID:'a'.repeat(32),FILES_S3_SECRET_ACCESS_KEY:'b'.repeat(64),FILES_SCANNER_HOST:'127.0.0.1',FILES_SCANNER_PORT:'9',
      FILES_DRAFT_QUOTA_BYTES:'1000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'100000000',
      CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url')});
    let providerCalls=0; const textProvider={countTokens:async()=>{providerCalls++;throw Error('unexpected');},generate:async()=>{providerCalls++;throw Error('unexpected');}};
    const app=await createApplication(config,{foxy:{textProvider}}); let closed=false;
    try {
      await app.listen(0,'127.0.0.1'); const origin=`http://127.0.0.1:${app.getHttpServer().address().port}`, actors=[];
      for(const [role,verified] of [['teacher',true],['student',true],['teacher',false]]) {
        const id=randomUUID(), token=generateVerifier();
        await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
          VALUES($1,now(),$2,$2,'Synthetic','Teacher','fixture',CASE WHEN $3 THEN now() ELSE NULL END,$4)`,[id,`${id}@example.test`,verified,role]);
        await pool.query("INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES($1,$2,$3,now()+interval '1 hour',now())",[randomUUID(),id,sessionTokenDigest(token)]);
        actors.push({cookie:`foxmind_session=${token}`,csrf:config.identity.security.csrfToken(token)});
      }
      const send=(path,actor,method='GET',override={})=>fetch(origin+base+path,{method,headers:{...(actor?{cookie:actor.cookie}:{}),origin:config.identity.security.origin,
        'x-csrf-token':actor?.csrf??'','content-type':'application/json',...override},...(method==='POST'?{body:JSON.stringify({requestId:randomUUID(),title:'Chat',context:{kind:'GENERAL'}})}:{})});
      const caps=await send('/capabilities',actors[0]); assert.equal(caps.status,200); assert.deepEqual(await caps.json(),
        {textGeneration:{enabled:false},imageGeneration:{enabled:false},diagramGeneration:{enabled:false}});
      assert.equal((await send('/conversations?limit=10',actors[0])).status,200);
      assert.equal((await send('/conversations',actors[0],'POST')).status,201);
      assert.equal((await send('/capabilities',null)).status,401); assert.equal((await send('/capabilities',actors[1])).status,403);
      assert.equal((await send('/capabilities',actors[2])).status,403);
      assert.equal((await send('/conversations',actors[0],'POST',{'x-csrf-token':'bad'})).status,403);
      assert.equal((await send('/conversations',actors[0],'POST',{origin:'http://evil.test'})).status,403);
      assert.equal(providerCalls,0);
      assert.ok(FOXY_RUNTIME); const foxy=app.get(FOXY_RUNTIME), files=app.get(FileHostLifecycle), db=app.get(PrismaService), order=[];
      const stop=foxy.onModuleDestroy.bind(foxy), closeFiles=files.close.bind(files), disconnect=db.onModuleDestroy.bind(db);
      foxy.onModuleDestroy=async()=>{order.push('foxy');return stop();}; files.close=async()=>{order.push('files');return closeFiles();};
      db.onModuleDestroy=async()=>{order.push('database');return disconnect();};
      await app.close(); closed=true; await app.close(); assert.equal(providerCalls,0);
      assert.ok(order.includes('foxy') && order.includes('files') && order.includes('database'));
      assert.ok(order.indexOf('foxy') < order.indexOf('files') && order.indexOf('foxy') < order.indexOf('database'));
    } finally { if(!closed) await app.close(); }
  });
});
