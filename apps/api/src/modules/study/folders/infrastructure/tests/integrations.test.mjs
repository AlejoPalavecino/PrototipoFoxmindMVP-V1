import {test} from 'node:test';import assert from 'node:assert/strict';import {randomUUID} from 'node:crypto';
import {withAgendaDatabase} from "../../../../../../../../tests/agenda-database-helpers.test.mjs";
import { createStudyService } from "../../../../../bootstrap/study-composition.ts";
import { createStudyFiles } from "../../../sources/infrastructure/uploads/service.ts";
import { createStudyAgendaIntegration } from "../../../../../../../../.build/api/apps/api/src/bootstrap/study-agenda-integration.js";
import { createStudyReminderRuntime } from "../../../reviews/infrastructure/runtime.ts";
import pg from 'pg';
import { createGeminiStudyProvider } from "../../../../../../../../.build/api/apps/api/src/modules/study/generation/infrastructure/providers/study-adapter.js";
import {GoogleGenAI} from '@google/genai';
import { office } from '../../../../../../../../tests/p4-fixtures.mjs';
pg.types.setTypeParser(20,value=>BigInt(value));

test('DOCX preview reads only a current folder source and rechecks it after extraction', async () => {
 const { createStudyService: createApplication } = await import('../../application/service.ts');
 const owner = randomUUID(), folder = randomUUID(), room = randomUUID(), id = randomUUID(), fileId = randomUUID();
 const row = { id: folder, owner_id: owner, state: { fields: { linkedClassroomId: room } } };
 const source = { id, fileId, version: id, origin: 'CLASSROOM', extension: 'docx', title: 'Material de prueba', available: true };
 let current = source, revokeOnRead = false, calls = 0;
 const service = createApplication({
  uow: { run: (request, _write, operation) => operation({}, request.owner) },
  folders: { load: async (_tx, actor) => { if (actor !== owner) throw { code: 'FORBIDDEN' }; return row; } },
  sources: async () => current ? [current] : [],
  files: { async previewDocx(_tx, candidate) {
   calls++;
   assert.equal(candidate.ownerId, owner);
   assert.equal(candidate.folderId, folder);
   assert.equal(candidate.classroomId, room);
   assert.equal(candidate.fileId, fileId);
   if (revokeOnRead) current = undefined;
   return 'Texto privado';
  } },
 });
 await assert.rejects(async () => service.previewDocx({ owner: randomUUID() }, folder, id), { code: 'FORBIDDEN' });
 await assert.rejects(async () => service.previewDocx({ owner }, folder, fileId), { code: 'FORBIDDEN' });
 assert.equal(calls, 0);
 assert.deepEqual(await service.previewDocx({ owner }, folder, id), { text: 'Texto privado' });
 current = { ...source, extension: 'pdf' };
 await assert.rejects(async () => service.previewDocx({ owner }, folder, id), { code: 'PREVIEW_UNAVAILABLE' });
 assert.equal(calls, 1);
 current = source;
 revokeOnRead = true;
 await assert.rejects(async () => service.previewDocx({ owner }, folder, id), { code: 'FORBIDDEN' });
 assert.equal(calls, 2);
});

test('DOCX preview can read the main XML of a large material without expanding other entries', async () => {
 const { parseActivityDocument } = await import('../../../../files/custody/infrastructure/activity-document.ts');
 const document = Buffer.from('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Contenido de lectura</w:t></w:r></w:p></w:body></w:document>');
 const large = office('docx', [{ name: 'word/media/resource.bin', bytes: Buffer.alloc(33_000_000) }],
  entries => entries.map(entry => entry.name === 'word/document.xml' ? { ...entry, bytes: document } : entry));
 const signal = AbortSignal.timeout(5000);
 await assert.rejects(parseActivityDocument(large, 'docx', signal), { code: 'AI_INPUT_LIMIT' });
 const preview = await parseActivityDocument(large, 'docx-preview', signal);
 assert.deepEqual(preview.document, { kind: 'text', text: 'Contenido de lectura' });
});

test('PostgreSQL: uploads privados, custodia y recordatorios idempotentes de Agenda',{timeout:90000},async()=>{
 await withAgendaDatabase(async({pool})=>{
  const [owner,other,teacher]=[randomUUID(),randomUUID(),randomUUID()];
  for(const [id,role]of [[owner,'student'],[other,'student'],[teacher,'teacher']])await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role)
   VALUES($1,now(),$2,$2,'Study','Synthetic','no-login',now(),$3)`,[id,`${id}@example.invalid`,role]);
  const database={$transaction:async operation=>{const client=await pool.connect();await client.query('BEGIN');try{const result=await operation({$queryRawUnsafe:async(sql,...v)=>(await client.query(sql,v)).rows});await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};
  const authenticate=async(_tx,request)=>request.owner,request={owner},objects=new Map();
  const files=createStudyFiles({database,authenticate,inspect:async()=> 'application/pdf',scan:async bytes=>{if(bytes.toString().includes('EICAR'))throw {code:'FILE_REJECTED'};},storage:{put:async(k,b)=>objects.set(k,Buffer.from(b)),get:async k=>objects.get(k),remove:async k=>objects.delete(k)}});
  const ownPort={assertOwn:async(tx,owner,folder,id,purpose)=>{const [row]=await tx.query('SELECT id FROM study_folder_uploads WHERE id=$1::uuid AND owner_id=$2::uuid AND folder_id=$3::uuid AND purpose=$4 AND phase=\'READY\'',id,owner,folder,purpose);if(!row)throw {code:'FILE_NOT_READY'};}};
  const service=createStudyService({database,authenticate,agenda:createStudyAgendaIntegration(),files:ownPort});
  let {folder}=await service.create(request,{name:'Biología privada',academicYear:2026,bannerKey:'biology',status:'DRAFT',units:[]});
  const bytes=Buffer.from('%PDF-Synthetic private plan');
  const upload=await files.begin(request,folder.id,{name:'plan.pdf',bytes:bytes.length,purpose:'plan'});
  for(const user of [other,teacher])await assert.rejects(files.status({owner:user},folder.id,upload.id),{code:'FORBIDDEN'});
  await assert.rejects(files.read(request,folder.id,upload.id),{code:'FILE_NOT_READY'});
  assert.equal((await files.receive(request,folder.id,upload.id,bytes)).ready,true);
  assert.equal((await files.read(request,folder.id,upload.id)).bytes.toString(),bytes.toString());
  assert.equal((await files.receive(request,folder.id,upload.id,bytes)).ready,true);
  await assert.rejects(files.receive(request,folder.id,upload.id,Buffer.from('wrong')),{code:'CONFLICT'});
  const unsafe=Buffer.from('EICAR'),bad=await files.begin(request,folder.id,{name:'bad.pdf',bytes:unsafe.length,purpose:'material'});
  await assert.rejects(files.receive(request,folder.id,bad.id,unsafe),{code:'FILE_REJECTED'});
  await assert.rejects(files.read(request,folder.id,bad.id),{code:'FILE_NOT_READY'});
  const unitId=randomUUID(),topicId=randomUUID();
  ({folder}=await service.patch(request,folder.id,{revision:folder.revision,planFileId:upload.id,units:[{id:unitId,title:'Vida',topics:[{id:topicId,title:'Célula'}]}]}));
  ({folder}=await service.command(request,folder.id,{revision:folder.revision,requestId:randomUUID(),action:'CONFIRM_FOLDER'}));
  const transaction=async operation=>database.$transaction(raw=>operation({query:(sql,...v)=>raw.$queryRawUnsafe(sql,...v)}));
  const start=new Date(Math.ceil((Date.now()+10*60000)/60000)*60000).toISOString(),end=new Date(Date.parse(start)+30*60000).toISOString(),exam={id:randomUUID(),title:'Biología',examAt:new Date(Date.parse(end)+86400000).toISOString(),timeZone:'America/Argentina/Buenos_Aires'};
  const session={id:randomUUID(),title:'Célula',topicIds:[topicId],startAt:start,endAt:end,minutes:30,timeZone:exam.timeZone,reminderMinutes:15};
  const agenda=createStudyAgendaIntegration();
  const first=await transaction(tx=>agenda.confirm(tx,owner,folder.id,exam,[session],randomUUID()));
  const again=await transaction(tx=>agenda.confirm(tx,owner,folder.id,exam,[session],randomUUID()));
  assert.equal(first.events[0].eventId,again.events[0].eventId);
  assert.equal((await pool.query('SELECT count(*)::int AS count FROM agenda_events WHERE owner_id=$1',[owner])).rows[0].count,1);
  const reminders=createStudyReminderRuntime({database,authenticate});
  try{
   await reminders.tick();const list=await reminders.list(request);assert.equal(list.items.length,1);assert.equal(list.unreadCount,1);
   assert.equal((await reminders.list({owner:other})).items.length,0);await assert.rejects(reminders.read({owner:other},session.id),{code:'FORBIDDEN'});
   await reminders.read(request,session.id);assert.equal((await reminders.list(request)).unreadCount,0);
   await pool.query('UPDATE agenda_events SET revision=revision+1 WHERE id=$1',[first.events[0].eventId]);
   await reminders.tick();assert.equal((await reminders.list(request)).items.length,0);
   await assert.rejects(transaction(tx=>agenda.confirm(tx,owner,folder.id,exam,[session],randomUUID())),{code:'CONFLICT'});
   ({folder}=await service.command(request,folder.id,{revision:folder.revision,requestId:randomUUID(),action:'ARCHIVE'}));
   await assert.rejects(files.begin(request,folder.id,{name:'new.pdf',bytes:3,purpose:'material'}),{code:'FORBIDDEN'});
   assert.equal((await pool.query('SELECT count(*)::int AS count FROM agenda_events WHERE owner_id=$1',[owner])).rows[0].count,1);
  }finally{await reminders.close();}
 });
});

test('admisión IA compartida: revalida tras preflight y deduplica gasto sin proveedor externo',{timeout:90000},async()=>{
 await withAgendaDatabase(async({pool})=>{
  const owner=randomUUID();await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role) VALUES($1,now(),$2,$2,'Synthetic','Study','no-login',now(),'student')`,[owner,`${owner}@example.invalid`]);
  const database={$transaction:async operation=>{const c=await pool.connect();await c.query('BEGIN');try{const result=await operation({$queryRawUnsafe:async(sql,...v)=>(await c.query(sql,v)).rows});await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}};
  const config={backend:'gemini-developer',model:'synthetic',apiKey:'not-a-key',dailyActorRequests:20,dailyGlobalRequests:30,maxInputTokens:1000,maxOutputTokens:100,dailyBudgetUsd:1,inputUsdPerMillion:1,outputUsdPerMillion:1,deadlineMs:5000,maxConcurrency:2,maxDispatches:1,maxJobAgeMs:60000};
  // Exercise the installed SDK serializer; a hand-written countTokens double
  // previously accepted options rejected by the Developer API client.
  let countBody;
  const sdk=new GoogleGenAI({apiKey:'synthetic-only',vertexai:false,httpOptions:{retryOptions:{attempts:1},fetch:async(url,init)=>{
    assert.match(String(url),/:countTokens/);
    countBody=JSON.parse(init.body);
    return new Response(JSON.stringify({totalTokens:10}),{headers:{'content-type':'application/json'}});
  }}});
  const calls=[];const client={countTokens:async input=>{calls.push('count');return sdk.models.countTokens(input);},generateContent:async input=>{const schema=input.config.responseJsonSchema;assert.ok(schema);assert.deepEqual(schema.properties.practice.properties.questions.items.properties.type.enum,['SINGLE','MULTIPLE','DEVELOPMENT']);assert.deepEqual(schema.properties.practice.properties.questions.items.properties.topicId.enum,['topic-a']);assert.equal(schema.properties.practice.properties.questions.minItems,3);assert.equal(schema.properties.sourceRefs.items.anyOf[0].properties.id.enum[0],'source-a');assert.match(input.contents[0].parts[1].text,/source-a/u);calls.push('generate');return {text:'{"synthetic":true}',candidates:[{finishReason:'STOP',content:{parts:[{text:'{"synthetic":true}'}]}}],usageMetadata:{promptTokenCount:10,candidatesTokenCount:8,thoughtsTokenCount:3}};}};
  const request=randomUUID();const provider=createGeminiStudyProvider(config,database,owner,request,async()=>{calls.push('authorize');},client);
  const context={topics:[{id:'topic-a'}],sources:[{id:'source-a',version:'v1'}],questionCount:3};
  assert.deepEqual(await provider.generate({system:'Synthetic',prompt:JSON.stringify(context),context,documents:[{sourceRef:{id:'source-a',version:'v1'},document:{kind:'text',text:'Synthetic'}}]}),{synthetic:true});
  // Approved runtime contract also revalidates authorization after the response.
  assert.deepEqual(calls,['authorize','count','authorize','generate','authorize']);
  assert.match(countBody.contents[0].parts[0].text,/Synthetic.*En SINGLE/su);
  assert.match(countBody.contents[1].parts[0].text,/topic-a/u);
  assert.match(countBody.contents[1].parts[1].text,/source-a/u);
  assert.equal(countBody.contents[1].parts[2].text,'Synthetic');
  await assert.rejects(createGeminiStudyProvider(config,database,owner,request,undefined,client).generate({system:'Synthetic',prompt:'Repeat'}),{code:'CONFLICT'});
  calls.length=0;
  await assert.rejects(createGeminiStudyProvider(config,database,owner,randomUUID(),async()=>{calls.push('revoked');throw {code:'SOURCE_UNAVAILABLE'};},client).generate({system:'Synthetic',prompt:'Synthetic'}));
  assert.deepEqual(calls,['revoked']);
  const usage=(await pool.query("SELECT request_count,reserved_microusd,consumed_microusd FROM ai_usage_daily WHERE scope=$1 AND capability='study-plan-v1'",[owner])).rows[0];
  assert.equal(usage.request_count,1);assert.equal(usage.reserved_microusd,0n);assert.equal(usage.consumed_microusd,21n); // 10 input + 8 visible output + 3 reasoning at fixture rates.
 });
});
