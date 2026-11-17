import test from 'node:test';
import assert from 'node:assert/strict';
import { createStudyService } from "../../../../../bootstrap/study-composition.ts";
const syntheticPlanId=crypto.randomUUID();
const owner = crypto.randomUUID(), folderId = crypto.randomUUID();
function fixture(role = 'student', overrides: Record<string, unknown> = {}) {
    let folder: any = null;
    let inTransaction = false;
    const calls: string[] = [];
    const query = async (sql: string, ...values: unknown[]) => { calls.push(sql); if (sql.includes('FROM users'))
        return [{ account_role: role, email_verified_at: new Date() }]; if (sql.includes('count(*)'))
        return [{ count: 0n }]; if (sql.includes('INSERT INTO study_folders')) {
        folder = { id: values[0], owner_id: values[1], status: values[2], revision: 1n, state: JSON.parse(values[3] as string), created_at: new Date(), updated_at: new Date() };
        return [folder];
    } if(sql.includes('WHERE owner_id=')&&sql.includes('FROM study_folders')){if(!folder)return [];if(sql.includes('AS fields')){const {units,...fields}=folder.state.fields;return [{...structuredClone(folder),fields}];}return [structuredClone(folder)];} if (sql.includes('FROM study_folders'))
        return folder && values[1] === owner && values[0] === folder.id ? [structuredClone(folder)] : []; if (sql.includes('UPDATE study_folders')) {
        folder = { ...folder, state: JSON.parse(values[2] as string), status: values[3], revision: folder.revision + 1n };
        return [structuredClone(folder)];
    } return []; };
    return { service: createStudyService({ database: { $transaction: async (fn: any) => fn({ $queryRawUnsafe: query }) }, authenticate: async () => owner,files:{assertOwn:async(_tx:any,_owner:string,_folder:string,id:string,purpose:string)=>{if(id!==syntheticPlanId||purpose!=='plan')throw Object.assign(new Error('FILE_NOT_READY'),{code:'FILE_NOT_READY'});}}, ...overrides }), calls, getFolder: () => folder, inTransaction: () => inTransaction };
}
test('verified student creates resumable draft, revision conflict preserves data', async () => { const f = fixture(), created = await f.service.create({}, {}); assert.equal(created.folder.status, 'DRAFT'); assert.equal((await f.service.get({}, created.folder.id)).folder.name, ''); await assert.rejects(f.service.patch({}, created.folder.id, { revision: '2', name: 'Historia' }), { code: 'CONFLICT' }); assert.equal(f.getFolder().state.fields.name, ''); });
test('teacher is rejected before reading private folders', async () => { const f = fixture('teacher'); await assert.rejects(f.service.get({}, folderId), { code: 'FORBIDDEN' }); assert.equal(f.calls.filter(s => s.includes('FROM study_folders')).length, 0); });
test('foreign folder IDs have no projection', async () => { await assert.rejects(fixture().service.get({}, folderId), { code: 'FORBIDDEN' }); });
test('unavailable private file cannot be attached or advance revision', async () => { const f = fixture(), { folder } = await f.service.create({}, {}), requestId = crypto.randomUUID(); const c = { revision: '1', requestId, action: 'ADD_MATERIAL', fileId: crypto.randomUUID(), title: 'A' }; await assert.rejects(f.service.command({}, folder.id, c), { code: 'FILE_NOT_READY' }); assert.equal(f.getFolder().revision, 1n); });
test('generation reserves a durable receipt and executes outside transaction', async () => {
    let calls = 0;
    const f = fixture('student', { generate: async () => { assert.equal(f.inTransaction(), false); calls++; return { status: 'INSUFFICIENT', title: 'Faltan fuentes', markdown: '', sourceRefs: [], missingInformation: ['Sin material'] }; } });
    // The fake records the persisted receipt before provider execution.
    const { folder } = await f.service.create({}, {}), requestId = crypto.randomUUID(), input = { revision: '1', requestId, action: 'GENERATE', kind: 'PLAN' };
    const result = await f.service.command({}, folder.id, input);
    assert.equal((result.result as any).status, 'INSUFFICIENT');
    assert.equal(result.folder.revision, '3');
    await f.service.command({}, folder.id, input);
    assert.equal(calls, 1);
    await assert.rejects(f.service.command({}, folder.id, { ...input, kind: 'NOTE' }), { code: 'CONFLICT' });
});
test('generation failure retains draft and completed request failure receipt', async () => {
    const f = fixture('student', { generate: async () => { throw new Error('synthetic provider outage'); } }), { folder } = await f.service.create({}, {}), requestId = crypto.randomUUID();
    await assert.rejects(f.service.command({}, folder.id, { revision: '1', requestId, action: 'GENERATE', kind: 'PLAN' }));
    assert.equal(f.getFolder().state.receipts[requestId].result.status, 'FAILED');
    assert.equal(f.getFolder().status, 'DRAFT');
});
test('twelve chat exchanges retain a bounded window and persisted full conversation', async()=>{
 let lastHistory=0;
 const f=fixture('student',{generate:async(input:any)=>{lastHistory=input.history.length;assert.ok(lastHistory<=20);return {status:'COMPLETE',title:'Respuesta',markdown:'Respuesta sintética',sourceRefs:[],missingInformation:[]};}});
 const units=[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}];
 let {folder}=await f.service.create({},{name:'Privada',units,status:'ACTIVE',planFileId:syntheticPlanId});
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'NEW_CONVERSATION'});folder=next.folder;const conversationId=(next.result as any).conversation.id;
 for(let n=0;n<12;n++){next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'CHAT',conversationId,message:`Pregunta ${n}`});folder=next.folder;}
 assert.equal(lastHistory,20);assert.equal(((await f.service.get({},folder.id)).conversations[0]!.turns as unknown[]).length,24);
});
test('edited exam sessions warn about overlap and reject duplicate identities',async()=>{
 const f=fixture(),topicId=crypto.randomUUID(),units=[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:topicId,title:'Tema'}]}];
 let {folder}=await f.service.create({},{name:'Privada',units,status:'ACTIVE',planFileId:syntheticPlanId});
 const startAt=new Date(Date.now()+86400000).toISOString(),examAt=new Date(Date.now()+172800000).toISOString();
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'PLAN_EXAM',examAt,timeZone:'UTC',availability:[{start:startAt,minutes:60}],minutesPerTopic:30});folder=next.folder;
 const exam=(next.result as any).exam,first={...exam.sessions[0],minutes:30},second={...first,id:crypto.randomUUID()};
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'EDIT_EXAM',examId:exam.id,sessions:[first,second]});folder=next.folder;
 assert.deepEqual((next.result as any).exam.warnings,['OVERLAPPING_AVAILABILITY']);
 await assert.rejects(f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'EDIT_EXAM',examId:exam.id,sessions:[first,first]}),{code:'INVALID_INPUT'});
});
test('interrupted generation expires receipt without automatically repeating provider',async()=>{
 let calls=0;const f=fixture('student',{generate:async()=>{calls++;throw new Error('unused');}}),{folder}=await f.service.create({},{}),requestId=crypto.randomUUID();
 const input={revision:'1',requestId,action:'GENERATE',kind:'PLAN'};
 await assert.rejects(f.service.command({},folder.id,input));const receipt=f.getFolder().state.receipts[requestId];receipt.result={status:'PENDING'};receipt.pendingAt=new Date(Date.now()-700000).toISOString();
 const next=await f.service.command({},folder.id,input);assert.deepEqual(next.result,{status:'FAILED',requestId,reason:'INTERRUPTED'});assert.equal(calls,1);
});
test('practice autosave survives new reads and finalization hides then reveals solutions once',async()=>{
 const topicId=crypto.randomUUID(),question={id:'q1',topicId,type:'SINGLE',prompt:'Elegí A',options:[{id:'A',text:'A'},{id:'B',text:'B'}],correctOptionIds:['A'],explanation:'A es correcta',sourceRefs:[]};
 const f=fixture('student',{generate:async()=>({status:'COMPLETE',title:'Quiz',markdown:'Secret solution A',sourceRefs:[],missingInformation:[],practice:{title:'Quiz',questions:[question]}})});
 let {folder}=await f.service.create({},{name:'Privada',units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:topicId,title:'Tema'}]}],status:'ACTIVE',planFileId:syntheticPlanId});
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'QUIZ'});folder=next.folder;const practice=(next.result as any).practice;
 assert.equal('correctOptionIds' in practice.questions[0],false);assert.equal(JSON.stringify(next).includes('Secret solution'),false);
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'SAVE_ANSWERS',practiceId:practice.id,answers:{q1:['A']}});folder=next.folder;
 assert.deepEqual(((await f.service.get({},folder.id)).practices[0]! as Record<string,unknown>).answers,{q1:['A']});
 const requestId=crypto.randomUUID(),input={revision:folder.revision,requestId,action:'FINALIZE_PRACTICE',practiceId:practice.id};next=await f.service.command({},folder.id,input);folder=next.folder;
 assert.deepEqual((next.result as any).practice.questions[0].correctOptionIds,['A']);assert.equal((next.result as any).practice.result.questions[0].score,1);
 const repeat=await f.service.command({},folder.id,input);assert.deepEqual(repeat,next);assert.equal((await f.service.get({},folder.id)).practices.length,1);const retry=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'NEW_ATTEMPT',practiceId:practice.id});assert.notEqual((retry.result as any).practice.id,practice.id);assert.deepEqual((retry.result as any).practice.answers,{});assert.equal((retry.result as any).practice.status,'ACTIVE');assert.equal((await f.service.get({},folder.id)).practices.length,2);
});



test('confirmation revalidates that the required private plan remains ready',async()=>{
 let ready=true;const f=fixture('student',{files:{assertOwn:async()=>{if(!ready)throw Object.assign(new Error('FILE_NOT_READY'),{code:'FILE_NOT_READY'});}}});
 const fields={name:'Privada',units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}]};
 await assert.rejects(f.service.create({},{...fields,status:'ACTIVE'}),{code:'INVALID_INPUT'});
 const {folder}=await f.service.create({},{...fields,planFileId:syntheticPlanId});ready=false;
 await assert.rejects(f.service.command({},folder.id,{revision:'1',requestId:crypto.randomUUID(),action:'CONFIRM_FOLDER'}),{code:'FILE_NOT_READY'});
 assert.equal((await f.service.get({},folder.id)).folder.status,'DRAFT');ready=true;
 assert.equal((await f.service.command({},folder.id,{revision:'1',requestId:crypto.randomUUID(),action:'CONFIRM_FOLDER'})).folder.status,'ACTIVE');
});
test('study plan is an authorized source for study tools without extra material',async()=>{
 let sources:any[]=[];const f=fixture('student',{files:{assertOwn:async()=>{},readSource:async()=>({text:'Contenido legible del plan'})},generate:async(input:any)=>{sources=input.sources;return {status:'INSUFFICIENT',title:'Sintético',markdown:'',sourceRefs:[],missingInformation:['Prueba de contexto']};}});
 const {folder}=await f.service.create({},{name:'Privada',planFileId:syntheticPlanId,units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}],status:'ACTIVE'});
 assert.equal((await f.service.get({},folder.id)).sources[0]!.kind,'PLAN');
 await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'QUIZ'});
 assert.equal(sources.length,1);assert.equal(sources[0].kind,'PLAN');assert.equal(sources[0].text,'Contenido legible del plan');
});
test('only own material metadata can be edited and plan cannot be removed as material',async()=>{
 const f=fixture('student',{files:{assertOwn:async()=>{}}}),topicId=crypto.randomUUID();let {folder}=await f.service.create({},{name:'Privada',planFileId:syntheticPlanId,units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:topicId,title:'Tema'}]}]});
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'ADD_MATERIAL',fileId:crypto.randomUUID(),title:'Original'});folder=next.folder;const material=(next.result as any).material;
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'EDIT_MATERIAL',materialId:material.id,title:'Editado',topicIds:[topicId]});folder=next.folder;assert.equal(folder.materials[0]!.title,'Editado');assert.deepEqual(folder.materials[0]!.topicIds,[topicId]);
 await assert.rejects(f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'EDIT_MATERIAL',materialId:crypto.randomUUID(),title:'Ajeno',topicIds:[]}),{code:'FORBIDDEN'});
 await assert.rejects(f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'REMOVE_MATERIAL',materialId:syntheticPlanId}),{code:'FORBIDDEN'});
});
test('accumulated UTF-8 state including receipts stays readable when the budget is exhausted',async()=>{
 const f=fixture('student',{generate:async()=>({status:'COMPLETE',title:'Apunte',markdown:'Inicio',sourceRefs:[],missingInformation:[]})});
 let {folder}=await f.service.create({},{name:'Privada',planFileId:syntheticPlanId,units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}],status:'ACTIVE'});
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'NOTE'});folder=next.folder;const creationId=(next.result as any).creation.id;
 let rejected=false;
 for(let index=0;index<100;index++){
  const before=await f.service.get({},folder.id);
  try{next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'EDIT_CREATION',creationId,title:'Apunte',body:`${index}:`+'🦊'.repeat(19000)});folder=next.folder;}
  catch(error){assert.equal((error as {code:string}).code,'QUOTA_EXCEEDED');assert.deepEqual(await f.service.get({},folder.id),before);rejected=true;break;}
 }
 assert.equal(rejected,true,'must reject accumulated state before the 4 MiB proxy response ceiling');
 assert.ok(Buffer.byteLength(JSON.stringify(f.getFolder().state),'utf8')<=3_000_000);
 assert.ok(Buffer.byteLength(JSON.stringify(await f.service.get({},folder.id)),'utf8')<4*1024*1024);
});

test('collection returns summaries without loading curriculum or material arrays, detail remains complete',async()=>{
 const f=fixture(),units=[{id:crypto.randomUUID(),title:'Unidad completa',topics:[{id:crypto.randomUUID(),title:'Tema intacto'}]}];
 const {folder}=await f.service.create({},{name:'Privada',units,planFileId:syntheticPlanId,status:'ACTIVE'});
 const {items}=await f.service.list({});assert.equal(items.length,1);assert.equal(items[0]!.id,folder.id);assert.equal(Object.hasOwn(items[0]!,'units'),false);assert.equal(Object.hasOwn(items[0]!,'materials'),false);
 const detail=await f.service.get({},folder.id);assert.deepEqual(detail.folder.units,units);assert.deepEqual(detail.folder.materials,[]);
 assert.ok(f.calls.some(sql=>sql.includes("(state->'fields')-'units' AS fields")),'collection SQL must avoid fetching full state');
});

test('practice without selected topics is rejected before reservation or provider use',async()=>{
 for(const kind of ['QUIZ','EXERCISE','MOCK_EXAM']){
  let generated=0;const f=fixture('student',{generate:async()=>{generated++;return {status:'INSUFFICIENT',title:'Synthetic',markdown:'',sourceRefs:[],missingInformation:['Synthetic']};}});
  const {folder}=await f.service.create({},{name:'Privada',units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}],planFileId:syntheticPlanId,status:'ACTIVE'});
  const requestId=crypto.randomUUID();
  await assert.rejects(f.service.command({},folder.id,{revision:folder.revision,requestId,action:'GENERATE',kind,topicIds:[]}),{code:'INVALID_INPUT'});
  assert.equal(generated,0);assert.equal(f.getFolder().revision,1n);assert.equal(Object.hasOwn(f.getFolder().state.receipts,requestId),false);assert.equal((await f.service.get({},folder.id)).folder.revision,'1');
 }
});
test('successful tool preferences persist through reload, finalization and omitted generation defaults',async()=>{
 const topicId=crypto.randomUUID(),seen:any[]=[];const refs=[{id:syntheticPlanId,version:syntheticPlanId}];
 const f=fixture('student',{generate:async(input:any)=>{seen.push(input);return input.action==='QUIZ'?{status:'COMPLETE',title:'Quiz',markdown:'',sourceRefs:refs,missingInformation:[],practice:{title:'Quiz',questions:Array.from({length:3},(_,n)=>({id:`pref-q${n}`,topicId,type:'SINGLE',prompt:'Elegí A',options:[{id:'A',text:'A'},{id:'B',text:'B'}],correctOptionIds:['A'],explanation:'A',sourceRefs:refs}))}}:{status:'COMPLETE',title:'Apunte',markdown:'Contenido sintético',sourceRefs:refs,missingInformation:[]};}});
 let {folder}=await f.service.create({},{name:'Privada',planFileId:syntheticPlanId,units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:topicId,title:'Tema'}]}],status:'ACTIVE'});
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'QUIZ',topicIds:[topicId],difficulty:'HARD',questionCount:3});folder=next.folder;const practiceId=(next.result as any).practice.id;
 const expected={difficulty:'HARD',questionCount:3,topicIds:[topicId],lastTool:'QUIZ'};assert.deepEqual((await f.service.get({},folder.id)).memory.preferences,expected);
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'SAVE_ANSWERS',practiceId,answers:{'pref-q0':['A'],'pref-q1':['A'],'pref-q2':['A']}});folder=next.folder;
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'FINALIZE_PRACTICE',practiceId});folder=next.folder;assert.deepEqual((await f.service.get({},folder.id)).memory.preferences,expected);
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'NOTE'});folder=next.folder;assert.equal(seen.at(-1).difficulty,'HARD');assert.equal(seen.at(-1).questionCount,3);assert.deepEqual((await f.service.get({},folder.id)).memory.preferences,{...expected,lastTool:'NOTE'});
});
test('only COMPLETE tools update preferences, chat and plan preserve them and invalid values spend nothing',async()=>{
 let mode='COMPLETE',calls=0;
 const f=fixture('student',{generate:async(input:any)=>{calls++;return mode==='INSUFFICIENT'?{status:'INSUFFICIENT',title:'Faltante',markdown:'',sourceRefs:[],missingInformation:['Material']}:input.action==='PLAN'?{status:'COMPLETE',title:'Plan',markdown:'',sourceRefs:[],missingInformation:[],units:[{title:'Nueva unidad',topics:['Nuevo tema']}]}:{status:'COMPLETE',title:'Apunte',markdown:'Contenido sintético',sourceRefs:[],missingInformation:[]};}});
 let {folder}=await f.service.create({},{name:'Privada',planFileId:syntheticPlanId,units:[{id:crypto.randomUUID(),title:'Unidad',topics:[{id:crypto.randomUUID(),title:'Tema'}]}],status:'ACTIVE'});
 let next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'NOTE',difficulty:'EASY',questionCount:2});folder=next.folder;const preferences=(await f.service.get({},folder.id)).memory.preferences;
 mode='INSUFFICIENT';next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'OUTLINE',difficulty:'HARD',questionCount:4});folder=next.folder;assert.deepEqual((await f.service.get({},folder.id)).memory.preferences,preferences);
 mode='COMPLETE';next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'NEW_CONVERSATION'});folder=next.folder;const conversationId=(next.result as any).conversation.id;
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'CHAT',conversationId,message:'Explicame',topicIds:[]});folder=next.folder;assert.deepEqual((await f.service.get({},folder.id)).memory.preferences,preferences);
 next=await f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'PLAN',topicIds:[]});folder=next.folder;assert.deepEqual((await f.service.get({},folder.id)).memory.preferences,preferences);
 for(const invalid of [{difficulty:['MEDIUM']},{questionCount:31},{questionCount:0}]){const beforeCalls=calls,beforeRevision=folder.revision;await assert.rejects(f.service.command({},folder.id,{revision:folder.revision,requestId:crypto.randomUUID(),action:'GENERATE',kind:'NOTE',...invalid}),{code:'INVALID_INPUT'});assert.equal(calls,beforeCalls);assert.equal((await f.service.get({},folder.id)).folder.revision,beforeRevision);}
});
