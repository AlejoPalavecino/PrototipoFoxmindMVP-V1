import test from 'node:test';
import assert from 'node:assert/strict';
import {withJourney,ok,request,rootOf,selectClassroomSection} from './p9-journey-helpers-current.mjs';
import {openClassroom,upload,planPdf,rejectSame} from './p6-integration-helpers.mjs';
import {digest} from './p4-integration-helpers.mjs';
import {seedPlan} from './helpers/plan-fixture.mjs';

test('Plan actual sessions preserve teaching progress, private historical versions and retired-contract rejection',{timeout:330000},async()=>{
 await withJourney('plan-reference',async({runtime,T,S,P,room})=>{
  const root=rootOf(room),detail=()=>ok(T.page,'GET',root),current=await detail(),topic=current.units[0].topics[0];
  await openClassroom(T.page,runtime.origin,'P9 plan-reference classroom');await selectClassroomSection(T.page,'plan','Plan');
  assert.equal(await T.page.getByText('Administrar plan',{exact:false}).count(),0);
  const saved=T.page.waitForResponse(r=>new URL(r.url()).pathname===`/api/v1${root}/plan`&&r.request().method()==='POST');
  void saved.catch(()=>{});
  const selectedTopic=T.page.getByRole('region',{name:'Tema seleccionado',exact:true});
  await selectedTopic.getByRole('heading',{name:topic.name,exact:true}).waitFor();
  await selectedTopic.getByRole('button',{name:'Marcar como dado',exact:true}).click();assert.equal((await saved).status(),200);await T.page.getByText('Tema marcado como dado.',{exact:true}).waitFor();assert.equal(await selectedTopic.getByRole('button',{name:'Marcar como pendiente',exact:true}).getAttribute('aria-pressed'),'true');
  assert.equal((await detail()).units[0].topics[0].status,'TAUGHT');
  await openClassroom(S.page,runtime.origin,'P9 plan-reference classroom');await selectClassroomSection(S.page,'plan','Plan');assert.equal(await S.page.getByRole('region',{name:'Tema seleccionado',exact:true}).getByRole('button',{name:/^Marcar como (dado|pendiente)$/}).count(),0);
  const bytes=await planPdf('Historical second version'),file=await upload(T.page,{kind:'classroom',id:room.id},bytes,'plan','second-plan.pdf');
  await seedPlan(runtime.db.query.bind(runtime.db),room.id,{action:'appendVersion',fileId:file.id});
  const versions=(await detail()).plans;assert.deepEqual(versions.map(item=>item.version),[2,1]);assert.equal((await request(S.page,'GET',`/files/${file.id}/content`)).digest,digest(bytes));assert.equal((await request(S.page,'GET',`/files/${room.fileId}/content`)).digest,digest(room.bytes));
  const body={revision:(await detail()).revision,operation:{action:'setTopicState',id:topic.id,status:'PENDING'}};
  await rejectSame(runtime.db,()=>request(S.page,'POST',root+'/plan',body),403);await rejectSame(runtime.db,()=>request(P.page,'POST',root+'/plan',body),403);await rejectSame(runtime.db,()=>request(T.page,'POST',root+'/plan',body,{'x-csrf-token':'invalid'}),403);await rejectSame(runtime.db,()=>request(T.page,'POST',root+'/plan',{...body,revision:'0'}),409);
  for(const action of['addUnit','addTopic','renameUnit','renameTopic','reorderUnits','reorderTopics','deleteUnit','deleteTopic','appendVersion'])await rejectSame(runtime.db,()=>request(T.page,'POST',root+'/plan',{revision:body.revision,operation:{action}}),400);
  const results=await Promise.all((await detail()).units[0].topics.map(item=>request(T.page,'POST',root+'/plan',{revision:body.revision,operation:{action:'setTopicState',id:item.id,status:'NEXT'}})));assert.deepEqual(results.map(item=>item.status).sort(),[200,409]);assert.equal((await detail()).units[0].topics.filter(item=>item.status==='NEXT').length,1);
  const before=await detail();await runtime.restartData();assert.deepEqual(await detail(),before);
  await ok(T.page,'POST',root+'/archive',{revision:before.revision,archived:true});await rejectSame(runtime.db,()=>request(T.page,'POST',root+'/plan',{...body,revision:(BigInt(before.revision)+1n).toString()}),409);assert.equal((await request(S.page,'GET',`/files/${room.fileId}/content`)).status,200);
 },{peer:true});
});
