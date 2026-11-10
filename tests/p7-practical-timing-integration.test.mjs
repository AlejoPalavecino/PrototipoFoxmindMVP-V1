import test from 'node:test';
import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import { chromium } from '@playwright/test';
import { setTimeout as delay } from 'node:timers/promises';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, api } from './p4-integration-helpers.mjs';
import { classroom, planPdf, domainSnapshot } from './p6-integration-helpers.mjs';

// Targeted correction proof: real HTTP/P3 plus owned DB timing fixtures, not a replay of the original TP journey.
test('TP complete-body receipt boundary is independent of later processing waits', {timeout:330000},async t=>{
 await withP4IntegrationRuntime(async runtime=>{
  const browser=await chromium.launch({headless:true});
  try{
   const teacher=await(await browser.newContext()).newPage(),student=await(await browser.newContext()).newPage(),suffix=Date.now();
   await account(teacher,runtime.origin,runtime.inbox,`p7-tp-time-teacher-${suffix}@example.test`, undefined, "teacher");
   await account(student,runtime.origin,runtime.inbox,`p7-tp-time-student-${suffix}@example.test`, undefined, "student");
   const room=await classroom(teacher,student,'TP receipt timing'),detail=await api(teacher,'GET',`/classrooms/${room.id}`);assert.equal(detail.status,200);
   const unit=detail.body.units[0].id,topic=detail.body.units[0].topics[0].id;
   const ok=async(page,method,path,body,headers)=>{const r=await api(page,method,path,body,headers);assert.equal(r.status,200,`${method} ${path} prerequisite`);return r.body;};
   const change=async operation=>ok(teacher,'POST',`/classrooms/${room.id}/activities`,{revision:(await ok(teacher,'GET',`/classrooms/${room.id}`)).revision,operation});
   const create=async()=>{
    const {id}=await change({action:'create',type:'ASSIGNMENT'});
    await change({action:'save',id,payload:{title:'Receipt timing',unitId:unit,topicId:topic,instructions:'Timing fixture',attachmentRequired:false,instructionFileIds:[],materialIds:[],questions:[],deadline:null,allowLate:false}});
    await change({action:'publish',id});return ok(student,'POST',`/classrooms/${room.id}/activities/${id}/start`,{});
   };
   const session=state=>ok(student,'GET',`/classrooms/${room.id}/activities/${state.activity.id}/session`);
   const credentials=async editor=>{
    const token=await student.evaluate(async()=>{const r=await fetch('/api/v1/auth/csrf');if(!r.ok)throw Error('CSRF prerequisite failed');return(await r.json()).csrfToken;});
    return {'content-type':'application/json',origin:runtime.origin,cookie:(await student.context().cookies()).map(c=>c.name+'='+c.value).join('; '),'x-csrf-token':token,'x-attempt-editor':editor.token,'x-attempt-epoch':editor.epoch};
   };
   const wire=(state,headers,body,wait=0)=>new Promise((resolve,reject)=>{
    const data=JSON.stringify(body),req=httpRequest(runtime.origin+`/api/v1/classrooms/${room.id}/attempts/${state.attempt.id}/submit-practical`,{method:'POST',headers:{...headers,'content-length':String(Buffer.byteLength(data))}},res=>{const parts=[];res.on('data',c=>parts.push(c));res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(Buffer.concat(parts))}));});
    req.on('error',reject);if(wait){req.write(data.slice(0,10));setTimeout(()=>req.end(data.slice(10)),wait);}else req.end(data);
   });
   const blocked=async()=>{
    for(let i=0;i<40;i++){const r=await runtime.db.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND wait_event_type='Lock' AND pid<>pg_backend_pid()");if(r.rows[0].n>0)return;await delay(25);}
    throw Error('Targeted request did not reach held lock');
   };
   let failed=false;const check=(name,run)=>t.test(name,{skip:failed?'Prior timing prerequisite failed':false},async()=>{try{await run();}catch(e){failed=true;throw e;}});
   await check('complete body received before deadline remains on time when selected-file lock waits cross it',async()=>{
    const state=await create(),bytes=await planPdf('Body receipt selected file');
    const editor={'x-attempt-editor':state.editor.token,'x-attempt-epoch':state.editor.epoch};
    const allocated=await api(student,'POST','/files',{scope:{kind:'classroom',id:room.id},purpose:'attachment',targetId:state.attempt.id,name:'receipt.pdf',bytes:bytes.length},editor);assert.equal(allocated.status,201);
    assert.equal((await ok(student,'PUT',`/files/${allocated.body.id}/content`,{base64:bytes.toString('base64')},editor)).ready,true);
    const current=await session(state),headers=await credentials(state.editor);
    await runtime.db.query("UPDATE attempts SET individual_deadline_at=clock_timestamp()+interval '400 milliseconds' WHERE id=$1",[state.attempt.id]);
    const deadline=(await runtime.db.query('SELECT individual_deadline_at d FROM attempts WHERE id=$1',[state.attempt.id])).rows[0].d;
    await runtime.db.query('BEGIN');let pending;
    try{
     await runtime.db.query('SELECT id FROM files WHERE id=$1 FOR UPDATE',[allocated.body.id]);
     pending=wire(state,headers,{revision:current.attempt.revision,confirm:true});await blocked();
     await delay(Math.max(0,+deadline-Date.now()+100));
    }finally{await runtime.db.query('COMMIT');}
    const received=await pending;assert.equal(received.status,200);assert.equal(received.body.submittedLate,false);
    assert.ok(new Date(received.body.submittedAt)<deadline);assert.ok(Date.now()>+deadline);
   });
   await check('request starts early but incomplete body reaches server after deadline: closed rejection preserves draft',async()=>{
    const state=await create(),headers=await credentials(state.editor);
    await runtime.db.query("UPDATE attempts SET individual_deadline_at=clock_timestamp()+interval '400 milliseconds' WHERE id=$1",[state.attempt.id]);
    const before=await domainSnapshot(runtime.db);
    const result=await wire(state,{...headers,'x-submitted-at':'2000-01-01T00:00:00Z'},{revision:'0',confirm:true},650);
    assert.equal(result.status,409);assert.equal(await domainSnapshot(runtime.db),before);assert.equal((await session(state)).attempt.status,'DRAFT');
   });
   await check('late allowed uses actual complete body receipt and ignores forged client timestamp fields',async()=>{
    const state=await create(),headers=await credentials(state.editor);
    const invalid=await wire(state,headers,{revision:'0',confirm:true,submittedAt:'2000-01-01T00:00:00Z'});assert.equal(invalid.status,400);
    await runtime.db.query('UPDATE activities SET allow_late_submissions=true WHERE id=$1',[state.activity.id]);
    await runtime.db.query("UPDATE attempts SET individual_deadline_at=clock_timestamp()+interval '400 milliseconds' WHERE id=$1",[state.attempt.id]);
    const result=await wire(state,{...headers,'x-submitted-at':'2000-01-01T00:00:00Z'},{revision:'0',confirm:true},650);
    assert.equal(result.status,200);assert.equal(result.body.submittedLate,true);assert.ok(new Date(result.body.submittedAt)>=new Date(result.body.appliedDeadlineAt));
   });
   await check('complete on-time body cannot bypass editor revocation that happened while classroom lock was held',async()=>{
    const state=await create(),headers=await credentials(state.editor);await runtime.db.query('BEGIN');let pending,before;
    try{
     await runtime.db.query('SELECT id FROM classrooms WHERE id=$1 FOR UPDATE',[room.id]);
     pending=wire(state,headers,{revision:'0',confirm:true});await blocked();
     await runtime.db.query('UPDATE attempts SET editor_token_hash=NULL,editor_epoch=editor_epoch+1 WHERE id=$1',[state.attempt.id]);
    }finally{await runtime.db.query('COMMIT');}
    const result=await pending;assert.equal(result.status,403);const current=await session(state);assert.equal(current.attempt.status,'DRAFT');assert.equal(current.attempt.submittedAt,null);
    assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n,0);
   });
  }finally{await browser.close();}
 },{classrooms:true});
});
