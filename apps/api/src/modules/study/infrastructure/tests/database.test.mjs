import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {withAgendaDatabase} from "../../../../../../../tests/agenda-database-helpers.test.mjs";
import { createStudyService } from "../../../../bootstrap/study-composition.ts";

test('private study PostgreSQL: ownership, dynamic library and revocation while provider runs',{timeout:90000},async()=>{
 await withAgendaDatabase(async({pool})=>{
 const ids=Array.from({length:8},()=>randomUUID()),[student,other,teacher,classroom,enrollment,period,file,material]=ids;
 for(const [id,role]of [[student,'student'],[other,'student'],[teacher,'teacher']])await pool.query(`INSERT INTO users(id,updated_at,email,email_normalized,first_name,last_name,password_hash,email_verified_at,account_role) VALUES($1,now(),$2,$2,'Study','Synthetic','not-login',now(),$3)`,[id,`${id}@example.invalid`,role]);
 await pool.query(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes) VALUES($1,now(),$2,'Biología','Biología','A',2026,'UTC','biology',10000000)`,[classroom,teacher]);
 await pool.query('INSERT INTO enrollments(id,updated_at,classroom_id,student_id) VALUES($1,now(),$2,$3)',[enrollment,classroom,student]);
 await pool.query("INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')",[period,enrollment,classroom]);
 const database={$transaction:async operation=>{const client=await pool.connect();await client.query('BEGIN');try{const result=await operation({$queryRawUnsafe:async(sql,...values)=>(await client.query(sql,values)).rows});await client.query('COMMIT');return result;}catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}}};
 let generation;
 const make=()=>createStudyService({database,authenticate:async(_tx,request)=>request.owner,files:{assertOwn:async()=>{}},generate:async (input,context)=>{if(generation)return generation(input,context);return {status:'INSUFFICIENT',title:'Sin fuentes',markdown:'',sourceRefs:[],missingInformation:['Material']};}});
 const units=[{id:randomUUID(),title:'Vida',topics:[{id:randomUUID(),title:'Célula'}]}],request={owner:student};
 let {folder}=await make().create(request,{name:'Privado',academicYear:2026,bannerKey:'biology',units,linkedClassroomId:classroom,status:'ACTIVE',planFileId:randomUUID()});
 assert.equal((await make().get(request,folder.id)).folder.name,'Privado');const summaries=(await make().list(request)).items;assert.equal(summaries[0].id,folder.id);assert.equal(Object.hasOwn(summaries[0],'units'),false);assert.equal(Object.hasOwn(summaries[0],'materials'),false);
 for(const owner of [other,teacher]){await assert.rejects(make().get({owner},folder.id),{code:'FORBIDDEN'});await assert.rejects(make().patch({owner},folder.id,{revision:folder.revision,name:'Forzado'}),{code:'FORBIDDEN'});}
 assert.equal((await make().get(request,folder.id)).sources.filter(source=>source.kind==='MATERIAL').length,0);
 await pool.query(`INSERT INTO files(id,updated_at,classroom_id,uploaded_by_id,storage_key,original_name,extension,size_bytes,validation_status,scan_status,validated_at,scanned_at) VALUES($1,now(),$2,$3,$4,'material.pdf','pdf',18,'APPROVED','CLEAN',now(),now())`,[file,classroom,teacher,`study-test/${file}`]);
 await pool.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,content_kind,body) VALUES($1,now(),$2,'Texto',$3,$4,'TEXT','La célula es vida.')`,[material,classroom,file,teacher]);
 assert.equal((await make().get(request,folder.id)).sources.filter(source=>source.kind==='MATERIAL')[0].id,material);
 await pool.query('UPDATE materials SET deleted_at=now() WHERE id=$1',[material]);assert.deepEqual((await make().get(request,folder.id)).sources.filter(source=>source.kind==='MATERIAL'),[]);
 const revised=randomUUID();await pool.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,created_by_id,content_kind,body) VALUES($1,now(),$2,'Texto revisado',$3,$4,'TEXT','La célula es unidad de vida.')`,[revised,classroom,file,teacher]);await pool.query(`INSERT INTO material_revisions(previous_id,current_id,classroom_id,classroom_revision,command_hash) VALUES($1,$2,$3,0,$4)`,[material,revised,classroom,'a'.repeat(64)]);assert.equal((await make().get(request,folder.id)).sources.filter(source=>source.kind==='MATERIAL')[0].version,revised);
 let dispatched=false;
 generation=async(input,context)=>{await pool.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1`,[period,teacher]);await context.authorize();dispatched=true;throw new Error('must not dispatch');};
 await assert.rejects(make().command(request,folder.id,{revision:folder.revision,requestId:randomUUID(),action:'GENERATE',kind:'NOTE'}),{code:'SOURCE_UNAVAILABLE'});assert.equal(dispatched,false);
 const currentPeriod=randomUUID();await pool.query("INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method) VALUES($1,now(),$2,$3,'CODE')",[currentPeriod,enrollment,classroom]);folder=(await make().get(request,folder.id)).folder;
 generation=async input=>{assert.equal(input.sources[0].id,revised);await pool.query(`UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1`,[currentPeriod,teacher]);return {status:'COMPLETE',title:'Célula',markdown:'Apunte sintético.',sourceRefs:[{id:revised,version:revised}],missingInformation:[]};};
 await assert.rejects(make().command(request,folder.id,{revision:folder.revision,requestId:randomUUID(),action:'GENERATE',kind:'NOTE',topicIds:[units[0].topics[0].id]}),{code:'SOURCE_UNAVAILABLE'});
 const after=await make().get(request,folder.id);assert.deepEqual(after.sources.filter(source=>source.kind==='MATERIAL'),[]);assert.deepEqual(after.creations,[]);
 });
});









test('imports archived classroom plan only during valid membership and retains the editable copy after revocation',{timeout:90000},async()=>{
 const {homeFixture}=await import('../../../../../../../tests/foxmind-3d-repository-fixture.test.mjs');
 await withAgendaDatabase(async({transaction})=>transaction(async({query,database})=>{
   const fixture=await homeFixture(query),room=fixture.rooms.archived,request={owner:fixture.pupil};
   const service=createStudyService({database,authenticate:async(_tx,actor)=>actor.owner});
   assert.equal((await service.list(request)).classrooms.find(item=>item.id===room.id).archived,true);
   const draft=await service.create(request,{name:'Carpeta sintética',linkedClassroomId:room.id});
   const second=await service.create(request,{name:'Pendiente',linkedClassroomId:room.id});
   await assert.rejects(service.command({owner:fixture.actor},draft.folder.id,{action:'IMPORT_CLASSROOM_PLAN',requestId:randomUUID(),revision:'1'}),{code:'FORBIDDEN'});
   const copied=await service.command(request,draft.folder.id,{action:'IMPORT_CLASSROOM_PLAN',requestId:randomUUID(),revision:'1'});
   assert.deepEqual(copied.folder.planOrigin,{classroomId:room.id,classroomRevision:'0'});
   assert.notEqual(copied.folder.units[0].id,room.unit);
   assert.notEqual(copied.folder.units[0].topics[0].id,room.topic);
   await query("UPDATE membership_periods SET ended_at=now(),end_reason='REMOVED',ended_by_id=$2 WHERE id=$1",room.period,room.teacher);
   await assert.rejects(service.command(request,second.folder.id,{action:'IMPORT_CLASSROOM_PLAN',requestId:randomUUID(),revision:'1'}),{code:'FORBIDDEN'});
   const edited=copied.folder.units.map(unit=>({...unit,title:'Una copia editada'}));
   const activated=await service.patch(request,draft.folder.id,{revision:copied.folder.revision,status:'ACTIVE',linkedClassroomId:null,units:edited});
   assert.equal(activated.folder.planFileId,null);
   assert.equal((await service.get(request,draft.folder.id)).folder.units[0].title,'Una copia editada');
   assert.deepEqual((await service.get(request,draft.folder.id)).sources,[]);
 }));
});
