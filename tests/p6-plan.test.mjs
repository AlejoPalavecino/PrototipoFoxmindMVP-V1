import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withP5Database} from '../scripts/p5-database.mjs';
import { FileStore } from '../.build/api/apps/api/src/modules/files/custody/infrastructure/store.js';
import { ClassroomService } from './helpers/academic-fixture.ts';
import {seedPlan} from './helpers/plan-fixture.mjs';

test('Plan progress preserves scoped curriculum and rejects retired maintenance contracts',{timeout:120000},async t=>{
 await withP5Database(async({pool,database})=>{
  const teacher=randomUUID(),other=randomUUID(),student=randomUUID(),room=randomUUID();
  for(const id of[teacher,other,student])await pool.query("INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role) VALUES($1,now(),$2,$2,'Plan','Fixture','fixture',now(),$3)",[id,`${id}@example.test`,id===student?'student':'teacher']);
  await pool.query("INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes) VALUES($1,now(),$2,'Plan fixture','Subject','A',2026,'UTC','explore',100000000)",[room,teacher]);
  const enrollment=randomUUID();await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)',[enrollment,room,student]);
  await pool.query("INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')",[randomUUID(),enrollment,room]);
  const authenticate=async(_tx,req)=>req.actor,files=new FileStore(database,{authenticate,authorize:async()=>{}},100000000n);
  const service=new ClassroomService({database,files,authenticate,signingKey:Buffer.alloc(32,1),deliveryKey:Buffer.alloc(32,2),classroomQuotaBytes:100000000n,webOrigin:'http://127.0.0.1:3005'});
  const T={actor:teacher},S={actor:student},O={actor:other},detail=()=>service.detail(T,room),seed=op=>seedPlan(pool.query.bind(pool),room,op);
  await seed({action:'addUnit',name:'Unit one'});const unit=(await detail()).units[0].id;
  for(const name of['First topic','Second topic'])await seed({action:'addTopic',unitId:unit,name});
  await seed({action:'addUnit',name:'Unit two'});const[topic,next]=(await detail()).units[0].topics.map(item=>item.id);
  const snapshot=async()=>JSON.stringify((await pool.query('SELECT (SELECT jsonb_agg(to_jsonb(u) ORDER BY id) FROM units u) units,(SELECT jsonb_agg(to_jsonb(t) ORDER BY id) FROM topics t) topics,(SELECT revision FROM classrooms WHERE id=$1) revision',[room])).rows);
  const change=async operation=>service.changePlan(T,room,{revision:(await detail()).revision,operation});
  const deny=async(actor,operation,code,revision)=>{const before=await snapshot();await assert.rejects(service.changePlan(actor,room,{revision:revision??(await detail()).revision,operation}),{code});assert.equal(await snapshot(),before);};
  await t.test('teacher and student retain initial curriculum and confirmed settings',async()=>{
   assert.equal((await service.detail(S,room)).units.length,2);const current=await detail();await service.updateSettings(T,room,{revision:current.revision,name:'Renamed classroom',subject:'Subject',division:'A',academicYear:2026});assert.equal((await detail()).name,'Renamed classroom');
  });
  await t.test('manual NEXT remains exclusive and TAUGHT selects no replacement',async()=>{
   await change({action:'setTopicState',id:topic,status:'NEXT'});await change({action:'setTopicState',id:next,status:'NEXT'});assert.deepEqual((await service.detail(S,room)).units[0].topics.map(item=>item.status),['PENDING','NEXT']);
   await change({action:'setTopicState',id:next,status:'TAUGHT'});assert.deepEqual((await service.detail(S,room)).units[0].topics.map(item=>item.status),['PENDING','TAUGHT']);assert.equal((await pool.query('SELECT count(*)::int n FROM attempts')).rows[0].n,0);
  });
  await t.test('permissions, foreign topics, CAS and invalid state reject without mutation',async()=>{
   const operation={action:'setTopicState',id:topic,status:'TAUGHT'};await deny(S,operation,'FORBIDDEN');await deny(O,operation,'FORBIDDEN');await deny(T,operation,'CONFLICT','0');await deny(T,{...operation,id:randomUUID()},'FORBIDDEN');await deny(T,{...operation,status:'UNKNOWN'},'INVALID_INPUT');
  });
  await t.test('concurrent progress writes serialize and retain at most one NEXT',async()=>{
   const revision=(await detail()).revision,results=await Promise.allSettled([topic,next].map(id=>service.changePlan(T,room,{revision,operation:{action:'setTopicState',id,status:'NEXT'}})));assert.equal(results.filter(item=>item.status==='fulfilled').length,1);assert.equal(results.find(item=>item.status==='rejected').reason.code,'CONFLICT');assert.equal((await pool.query("SELECT count(*)::int n FROM topics WHERE classroom_id=$1 AND status='NEXT'",[room])).rows[0].n,1);
  });
  await t.test('retired writes cannot delete, rewrite, reorder or append historical data',async()=>{
   for(const action of['addUnit','addTopic','renameUnit','renameTopic','reorderUnits','reorderTopics','deleteUnit','deleteTopic','appendVersion'])await deny(T,{action},'INVALID_INPUT');
   assert.equal((await detail()).units.length,2);assert.deepEqual((await detail()).plans,[]);
  });
  await t.test('archived classroom blocks progress and retains student reads',async()=>{
   await service.setArchive(T,room,{revision:(await detail()).revision,archived:true});await deny(T,{action:'setTopicState',id:topic,status:'TAUGHT'},'CONFLICT');assert.equal((await service.detail(S,room)).units.length,2);
  });
 });
});
