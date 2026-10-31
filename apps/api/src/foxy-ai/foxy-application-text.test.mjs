import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { PDFDocument } from 'pdf-lib';
import { withAgendaDatabase } from '../../../../tests/agenda-database-helpers.test.mjs';
import { homeFixture } from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';
import { identityTestEnvironment } from '../../../../scripts/p33-identity-test-env.mjs';

const base='/api/v1/foxy-ai';
test('application executes synthetic Foxy turns and reads READY after reload', {timeout:120000}, async()=>{
  const {createApplication}=await import('../../../../.build/api/apps/api/src/application.js');
  const {readConfiguration}=await import('../../../../.build/api/apps/api/src/configuration.js');
  const {FOXY_RUNTIME}=await import('../../../../.build/api/apps/api/src/foxy-ai/index.js');
  const {FileService}=await import('../../../../.build/api/apps/api/src/files/index.js');
  const {generateVerifier,sessionTokenDigest}=await import('../../../../.build/api/apps/api/src/identity-security/index.js');
  await withAgendaDatabase(async({pool,databaseUrl})=>{
    const config=readConfiguration({...identityTestEnvironment(),DATABASE_URL:databaseUrl,API_PORT:'0',
      AI_ENABLED:'true',AI_BACKEND:'gemini-developer',AI_MODEL:'synthetic',AI_API_KEY:'synthetic-only',AI_DAILY_ACTOR_REQUESTS:'20',AI_DAILY_GLOBAL_REQUESTS:'30',
      AI_MAX_INPUT_TOKENS:'100000',AI_MAX_OUTPUT_TOKENS:'100',AI_DAILY_BUDGET_USD:'1',AI_INPUT_USD_PER_MILLION:'2',AI_OUTPUT_USD_PER_MILLION:'3',
      AI_DEADLINE_MS:'10000',AI_MAX_CONCURRENCY:'1',AI_MAX_DISPATCHES:'1',AI_MAX_JOB_AGE_MS:'300000',
      FILES_ENABLED:'1',FILES_S3_ENDPOINT:'http://127.0.0.1:9',FILES_S3_REGION:'us-east-1',FILES_S3_BUCKET:'synthetic-private',
      FILES_S3_ACCESS_KEY_ID:'a'.repeat(32),FILES_S3_SECRET_ACCESS_KEY:'b'.repeat(64),FILES_SCANNER_HOST:'127.0.0.1',FILES_SCANNER_PORT:'9',
      FILES_DRAFT_QUOTA_BYTES:'1000000',CLASSROOMS_ENABLED:'1',CLASSROOMS_QUOTA_BYTES:'100000000',
      CLASSROOMS_SIGNING_KEY:randomBytes(32).toString('base64url'),CLASSROOMS_DELIVERY_KEY:randomBytes(32).toString('base64url')});
    const query=async(sql,...args)=>(await pool.query(sql,args)).rows, f=await homeFixture(query), pdf=await PDFDocument.create();pdf.addPage();
    const bytes=Buffer.from(await pdf.save()),digest=createHash('sha256').update(bytes).digest('hex'), blobs=new Map();
    const material=randomUUID(), materialFile=randomUUID(),materialRow={file_id:materialFile};
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'material.pdf','pdf','application/pdf',$5,'APPROVED','CLEAN',now(),now())`,
      materialFile,f.rooms.teach.id,f.teacherActor,`synthetic/${materialFile}`,bytes.length);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',$3,now())",randomUUID(),materialFile,bytes.length);
    await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'material','ready',$2,$2,$2)",materialFile,digest);
    await query("INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id) VALUES($1,now(),$2,'Material',$3,$4)",material,f.rooms.teach.id,materialFile,f.teacherActor);
    const plan=randomUUID(),planFile=randomUUID(), room=f.rooms.teach;
    await query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,detected_mime_type,size_bytes,
      validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'plan.pdf','pdf','application/pdf',$5,'APPROVED','CLEAN',now(),now())`,
      planFile,room.id,room.teacher,`synthetic/${planFile}`,bytes.length);
    await query("INSERT INTO uploads(id,updated_at,file_id,status,reserved_bytes,completed_at) VALUES($1,now(),$2,'COMPLETED',$3,now())",randomUUID(),planFile,bytes.length);
    await query("INSERT INTO file_custodies(file_id,purpose,phase,digest,validated_digest,scanned_digest) VALUES($1,'plan','ready',$2,$2,$2)",planFile,digest);
    await query('INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id) VALUES($1,now(),$2,1,$3,$4)',plan,room.id,planFile,room.teacher);
    for(const id of [planFile,materialRow.file_id]) {const [r]=await query('SELECT storage_key FROM files WHERE id=$1::uuid',id);blobs.set(r.storage_key,bytes);}
    const calls=[], provider={ countTokens:async input=>{calls.push({type:'count',mode:input.mode});return 100;},generate:async input=>{
      const [row]=await query("SELECT count(*)::int n FROM ai_usage_daily WHERE reserved_microusd>0"); assert.ok(row.n>=2,'reservation precedes provider');
      calls.push({type:'generate',mode:input.mode}); return {json:{schemaVersion:'foxy-text-response-v1',status:'READY',title:'Síntesis',markdown:'Resumen sintético',
        references:input.mode==='CLASSROOM'?[{sourceKey:'s2',documentKey:'d2',page:1}]:[],warnings:[],missingInformation:[]},inputTokens:100,outputTokens:20}; } };
    const app=await createApplication(config,{foxy:{textProvider:provider}});
    try {
      const fileService=app.get(FileService);fileService.storage.get=async key=>{assert.ok(blobs.has(key));return blobs.get(key);};
      await app.listen(0,'127.0.0.1'); const origin=`http://127.0.0.1:${app.getHttpServer().address().port}`, actors=[];
      for(const id of [f.teacherActor,f.other,f.pupil]) {const token=generateVerifier();await pool.query("INSERT INTO sessions(id,user_id,token_hash,expires_at,last_seen_at) VALUES($1,$2,$3,now()+interval '1 hour',now())",[randomUUID(),id,sessionTokenDigest(token)]);actors.push({cookie:`foxmind_session=${token}`,csrf:config.identity.security.csrfToken(token)});}
      const send=(path,actor,method='GET',body)=>fetch(origin+base+path,{method,headers:{cookie:actor.cookie,origin:config.identity.security.origin,'x-csrf-token':actor.csrf,'content-type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
      for(const context of [{kind:'GENERAL'},{kind:'CLASSROOM',classroomId:room.id}]) {
        const create=await send('/conversations',actors[0],'POST',{requestId:randomUUID(),title:'Chat',context});assert.equal(create.status,201);
        const {conversation}=await create.json(), input={requestId:randomUUID(),revision:'0',purpose:'SUMMARY',text:'Resumir',selection:{topicIds:[],sourceIds:context.kind==='GENERAL'?[]:[`plan:${plan}`,`material:${material}`]}};
        const first=await send(`/conversations/${conversation.id}/turns`,actors[0],'POST',input);assert.equal(first.status,202);const sent=await first.json();
        const replay=await send(`/conversations/${conversation.id}/turns`,actors[0],'POST',input);assert.equal(replay.status,200);assert.equal((await replay.json()).turn.id,sent.turn.id);
        assert.equal(await app.get(FOXY_RUNTIME).worker.runOnce(),true);
        const readyResponse=await send(`/conversations/${conversation.id}/turns/${sent.turn.id}`,actors[0]);assert.equal(readyResponse.status,200);
        const ready=await readyResponse.json();assert.equal(ready.state,'READY');assert.equal(ready.answer.markdown,'Resumen sintético');
        const reloaded=await send(`/conversations/${conversation.id}/turns?afterSequence=0&limit=10`,actors[0]);assert.equal(reloaded.status,200);
        const history=await reloaded.json();assert.ok(history.items.some(item=>item.id===sent.turn.id && item.state==='READY' && item.answer.markdown==='Resumen sintético'));
        assert.equal(JSON.stringify(ready).includes(digest),false);assert.equal(JSON.stringify(ready).includes(materialRow.file_id),false);
        assert.ok([403,404].includes((await send(`/conversations/${conversation.id}/turns/${sent.turn.id}`,actors[1])).status));
        assert.equal((await send(`/conversations/${conversation.id}/turns/${sent.turn.id}`,actors[2])).status,403);
        if(context.kind==='CLASSROOM'){const r=await send(`/conversations/${conversation.id}/turns/${sent.turn.id}/citations`,actors[0]);assert.equal(r.status,200);const [citation]=await r.json();assert.equal(citation.availability,'AVAILABLE');assert.equal(citation.page,1);}
      }
      assert.deepEqual(calls.map(x=>x.type),['count','generate','count','generate']);
    } finally {await app.close();}
  });
});
