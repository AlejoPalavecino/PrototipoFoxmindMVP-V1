import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAgendaDatabase} from '../../../../tests/agenda-database-helpers.test.mjs';
import {homeFixture} from '../../../../tests/foxmind-3d-repository-fixture.test.mjs';

const cfg={maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000,dailyActorRequests:5,dailyGlobalRequests:20,maxOutputTokens:200,inputUsdPerMillion:1,outputUsdPerMillion:1,dailyBudgetUsd:1};
const profile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:65536,maxOutputTokens:4096,inputUsdPerMillion:'0.25',outputUsdPerMillion:'30',textOutputUsdPerMillion:'1.5',imageOutputUsdPerMillion:'30'};
const visualConfig={enabled:{IMAGE:true,DIAGRAM:false},profiles:{IMAGE:profile,DIAGRAM:null},privateQuotaBytes:10485760n,maxConcurrency:1,maxJobAgeMs:300000,deadlineMs:30000};
const progress={completion:{expected:1,delivered:1,pending:0,onTime:1,late:0,pendingResubmissions:0,percentage:'100'},performance:{graded:0,average:null},activities:[{id:randomUUID(),title:'Sintética',type:'ASSIGNMENT',expected:true,firstSubmission:{late:false},pendingResubmission:false,grade:null}]};
async function candidate(kind,f,query,database,options){
 const id=randomUUID();
 if(kind==='foxy'){
  const {createFoxyConversationRepository}=await import('./conversation-repository.ts'),{createFoxyTurnRepository}=await import('./turn-repository.ts'),{createFoxyTurnQueue}=await import('./turn-queue.ts'),tx={query};
  const conversation=(await createFoxyConversationRepository().create(tx,f.teacherActor,{requestId:randomUUID(),title:'Texto',context:{kind:'GENERAL'}},'a'.repeat(64))).conversation;
  const turn=(await createFoxyTurnRepository().enqueue(tx,f.teacherActor,conversation.id,{requestId:randomUUID(),revision:'0',purpose:'CHAT',text:'Hola',selection:{topicIds:[],sourceIds:[]}},{context:{kind:'GENERAL'},curriculum:null,sources:[]},'b'.repeat(64),{model:'synthetic',promptVersion:'foxy-chat-v1',schemaVersion:'foxy-answer-v1'})).turn;
  const queue=createFoxyTurnQueue({database,configuration:options});return {claim:()=>queue.claim(),reset:()=>query("UPDATE foxy_turns SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1",turn.id)};
 }
 if(kind==='extraction'){
  const [draft]=await query('SELECT id FROM classroom_drafts WHERE owner_id=$1 LIMIT 1',f.teacherActor),file=randomUUID();
  await query("INSERT INTO files(id,updated_at,classroom_draft_id,uploaded_by_id,storage_key,original_name,extension,size_bytes) VALUES($1,now(),$2,$3,$4,'synthetic.pdf','pdf',5)",file,draft.id,f.teacherActor,`test-extraction/${file}`);
  await query("INSERT INTO classroom_curriculum_extractions(id,owner_id,draft_id,file_id,source_digest,base_revision,schema_version,prompt_version,model) VALUES($1,$2,$3,$4,$5,0,'study-plan-v1','synthetic','synthetic')",id,f.teacherActor,draft.id,file,'a'.repeat(64));
  const {claim}=await import('../classrooms/ai/queue.ts');return {claim:()=>claim({database,configuration:options}),reset:()=>query("UPDATE classroom_curriculum_extractions SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1",id)};
 }
 if(kind==='activity'){
  await query("INSERT INTO activity_ai_generations(id,owner_id,classroom_id,unit_id,type,base_revision,request_hash,input_payload,curriculum_snapshot,source_snapshot,schema_version,prompt_version,model) VALUES($1,$2,$3,$4,'ASSIGNMENT',0,$5,'{}','{}','[]','activity-proposal-v1','synthetic','synthetic')",id,f.teacherActor,f.rooms.teach.id,f.rooms.teach.unit,'a'.repeat(64));
  const {claim}=await import('../../../../.build/api/apps/api/src/classrooms/activity-ai/queue.js');return {claim:()=>claim({classrooms:{ports:{database}},configuration:options}),reset:()=>query("UPDATE activity_ai_generations SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1",id)};
 }
 if(kind==='grading'){
  const activity=await f.activity('teach'),attempt=await f.attempt(activity);await query('UPDATE classrooms SET ai_grading_enabled=true WHERE id=$1',f.rooms.teach.id);
  await query("INSERT INTO grading_ai_jobs(id,classroom_id,activity_id,attempt_id,owner_id,rubric_snapshot,epoch) VALUES($1,$2,$3,$4,$5,'Sintético',0)",id,f.rooms.teach.id,activity.id,attempt,f.teacherActor);
  const {createGradingAiSqlQueue}=await import('../classrooms/grading-ai/sql-queue.ts'),queue=createGradingAiSqlQueue({database,configuration:options});return {claim:()=>queue.claim(),reset:()=>query("UPDATE grading_ai_jobs SET state='QUEUED',lease_nonce=NULL,lease_until=NULL WHERE id=$1",id)};
 }
 const {StudentAiWorker}=await import('../classrooms/student-ai/worker.ts'),worker=new StudentAiWorker({classrooms:{ports:{database},progressView:async()=>progress},configuration:options,provider:{}}),member={enrollment_id:f.rooms.teach.enrollment,classroom_id:f.rooms.teach.id,student_id:f.pupil,owner_id:f.teacherActor};
 return {claim:()=>worker.claim({query},member),reset:()=>query('DELETE FROM student_ai_reports WHERE enrollment_id=$1',member.enrollment_id)};
}
async function activeVisual(query,database,owner,{expired=false}={}){
 const [{createFoxyConversationRepository},{createFoxyPrivateAssetRepository},{createFoxyVisualRepository},{createFoxyVisualService},{createFoxyUnitOfWork},{createFoxyVisualQueue},{createFoxyVisualBudget}]=await Promise.all([import('./conversation-repository.ts'),import('./private-asset-repository.ts'),import('./visual-repository.ts'),import('./visual-service.ts'),import('./unit-of-work.ts'),import('./visual-queue.ts'),import('./visual-budget.ts')]);
 const uow=createFoxyUnitOfWork({database,authenticate:async(_tx,req)=>req.id}),conversations=createFoxyConversationRepository(),request={id:owner};
 const conversation=(await uow.run(request,true,(tx,a)=>conversations.create(tx,a.id,{requestId:randomUUID(),title:'Visual',context:{kind:'GENERAL'}},'a'.repeat(64)))).conversation;
 const jobs=createFoxyVisualRepository({assets:createFoxyPrivateAssetRepository(),privateQuotaBytes:10485760n}),service=createFoxyVisualService({uow,conversations,jobs,configuration:visualConfig});
 await service.start(request,conversation.id,{requestId:randomUUID(),revision:'0',kind:'IMAGE',prompt:'Sintético',selection:{topicIds:[],sourceIds:[]},aspectRatio:'1:1'});
 const queueDatabase=expired?{$transaction:fn=>database.$transaction(raw=>fn({$queryRawUnsafe:(sql,...args)=>raw.$queryRawUnsafe(sql.includes("clock_timestamp()+interval '90 seconds' AS until")?sql.replace("interval '90 seconds'","interval '-1 second'"):sql,...args)}))}:database;
 const budget=createFoxyVisualBudget({limits:{dailyBudgetUsd:1,dailyActorRequests:5,dailyGlobalRequests:20}}),queue=createFoxyVisualQueue({database:queueDatabase,configuration:visualConfig,budget}),lease=await queue.claim();assert.ok(lease);return lease;
}
test('all existing AI claimers count live visual work globally and per owner', {timeout:120000},async t=>{
 await withAgendaDatabase(async({transaction})=>{for(const kind of ['foxy','extraction','activity','student','grading'])for(const scope of ['global','owner'])await t.test(`${kind}: ${scope}`,()=>transaction(async({query})=>{
  const f=await homeFixture(query),database={$transaction:fn=>fn({$queryRawUnsafe:query})},options={...cfg,maxConcurrency:scope==='global'?1:2},pending=await candidate(kind,f,query,database,options);
  assert.ok(await pending.claim(),'positive control: existing candidate is claimable');await pending.reset();
  await activeVisual(query,database,scope==='global'?f.other:f.teacherActor);assert.equal(await pending.claim(),null,'running visual work occupies shared capacity');
 }));});
});
test('expired visual lease does not consume healthy shared concurrency', {timeout:120000},async t=>{
 await withAgendaDatabase(async({transaction})=>{for(const kind of ['foxy','extraction','activity','student','grading'])await t.test(kind,()=>transaction(async({query})=>{
  const f=await homeFixture(query),database={$transaction:fn=>fn({$queryRawUnsafe:query})},pending=await candidate(kind,f,query,database,cfg);
  const visual=await activeVisual(query,database,f.teacherActor,{expired:true});const [r]=await query('SELECT lease_until<=clock_timestamp() expired FROM foxy_visual_jobs WHERE id=$1',visual.jobId);assert.equal(r.expired,true);
  assert.ok(await pending.claim(),'expired visual lease must not occupy active concurrency');
 }));});
});
