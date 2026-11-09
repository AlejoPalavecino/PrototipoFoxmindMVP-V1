import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAgendaDatabase} from '../../../../tests/agenda-database-helpers.test.mjs';
import {identityTestEnvironment} from '../../../../scripts/p33-identity-test-env.mjs';

test('private study HTTP persisted identity, Origin/CSRF, role and owner isolation',{timeout:90000},async()=>{
 const {createApplication}=await import('../../../../.build/api/apps/api/src/application.js');
 const {readConfiguration}=await import('../../../../.build/api/apps/api/src/configuration.js');
 const {IdentityRuntime}=await import('../../../../.build/api/apps/api/src/identity/index.js');
 const {PrismaService}=await import('../../../../.build/api/apps/api/src/database/prisma.service.js');
 const {createStudyService}=await import('../../../../.build/api/apps/api/src/study-folders/index.js');
 const {createStudyAuthentication,installStudyTransport}=await import('../../../../.build/api/apps/api/src/study-folders/http.js');
 const {generateVerifier,sessionTokenDigest}=await import('../../../../.build/api/apps/api/src/identity-security/index.js');
 await withAgendaDatabase(async({pool,databaseUrl})=>{
 const app=await createApplication(readConfiguration({...identityTestEnvironment(),DATABASE_URL:databaseUrl,API_PORT:'0'}));
 try {const runtime=app.get(IdentityRuntime);installStudyTransport(app,runtime,createStudyService({database:app.get(PrismaService),authenticate:createStudyAuthentication(runtime.configuration.security)}));await app.listen(0,'127.0.0.1');const base=`http://127.0.0.1:${app.getHttpServer().address().port}/api/v1`;
 const actors=[];for(const [role,verified]of [['student',true],['student',true],['teacher',true],['student',false]]){const id=randomUUID(),session=randomUUID(),token=generateVerifier();await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role) VALUES($1,now(),$2,$2,'Study','HTTP','not-login',CASE WHEN $3 THEN now() ELSE NULL END,$4)`,[id,`${id}@example.invalid`,verified,role]);await pool.query(`INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES($1,$2,$3,now()+interval '1 hour',now())`,[session,id,sessionTokenDigest(token)]);actors.push({id,session,cookie:`foxmind_session=${token}`});}
 const send=(actor,path,method='GET',body,headers={})=>fetch(base+path,{method,headers:{cookie:actor?.cookie??'',origin:'http://127.0.0.1:3000','content-type':'application/json',...(actor?.csrf?{'x-csrf-token':actor.csrf}:{}),...headers},...(body===undefined?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(5000)});
 for(const actor of actors){actor.csrf=(await(await send(actor,'/auth/csrf')).json()).csrfToken;}
 const [A,B,T,U]=actors;const created=await send(A,'/study-folders','POST',{});assert.equal(created.status,200);const {folder}=await created.json();
 assert.equal((await send(A,`/study-folders/${folder.id}`)).status,200);
 for(const actor of [B,T,U])assert.equal((await send(actor,`/study-folders/${folder.id}`)).status,403);
 for(const headers of [{origin:'http://evil.invalid'},{'x-csrf-token':'wrong'},{'x-csrf-token':B.csrf}])assert.equal((await send(A,`/study-folders/${folder.id}`,'PATCH',{revision:'1',name:'Cambio'},headers)).status,403);
 assert.equal((await send(null,'/study-folders')).status,401);
 assert.equal((await send(B,`/study-folders/${folder.id}`,'PATCH',{revision:'1',name:'Otro'})).status,403);
 await pool.query('UPDATE sessions SET revoked_at=now() WHERE id=$1',[A.session]);assert.equal((await send(A,`/study-folders/${folder.id}`)).status,401);
 }finally{await app.close();}
 });
});

