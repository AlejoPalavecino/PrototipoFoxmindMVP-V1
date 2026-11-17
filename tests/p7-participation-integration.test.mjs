import { openClosedAssignment } from './helpers/p7-closed-assignment-admission.mjs';
import { startBrowserAttempt } from './helpers/browser-admission-step.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, password } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf, rejectSame } from './p6-integration-helpers.mjs';
import { assertAttemptWrite } from '../.build/api/apps/api/src/modules/participation/attempts/infrastructure/attempt-access.js';

// Observe CSRF/admission responses before deriving a mutation body or using any identifier.
async function request(page,method,path,body,headers={}) {
  const once=()=>page.evaluate(async({method,path,body,headers})=>{
    const h={...headers};
    if(method!=='GET'){
      const csrf=await fetch('/api/v1/auth/csrf');
      if(!csrf.ok)return {status:csrf.status,headers:Object.fromEntries(csrf.headers),precondition:'csrf'};
      h['x-csrf-token']=(await csrf.json()).csrfToken;
    }
    let content;
    if(body?.base64!==undefined){content=Uint8Array.from(atob(body.base64),v=>v.charCodeAt(0));h['content-type']='application/octet-stream';}
    else if(body!==undefined){content=JSON.stringify(body);h['content-type']='application/json';}
    const res=await fetch('/api/v1'+path,{method,headers:h,body:content});
    return {status:res.status,headers:Object.fromEntries(res.headers),body:res.headers.get('content-type')?.includes('application/json')?await res.json():undefined};
  },{method,path,body,headers});
  let res=await once();
  if(res.status===429){const seconds=Number(res.headers['retry-after']);assert.ok(Number.isInteger(seconds)&&seconds>0&&seconds<=60);
    console.log(`P7 participation honors actual Retry-After=${seconds}s once`);await delay(seconds*1000);res=await once();}
  return res;
}
const ok=async(...args)=>{const res=await request(...args);assert.equal(res.status,200,`Expected successful prerequisite ${args[1]} ${args[2]} (${res.precondition??'domain'})`);return res.body;};

test('P7 T2 actual sessions, membership events, single editor and explicit UI participation', {timeout:330000}, async t=>{
  await withP4IntegrationRuntime(async runtime=>{
    const browser=await chromium.launch({headless:true}),scratch=await mkdtemp(join(tmpdir(),'foxmind-p7-participation-'));
    console.log(`P7 participation retained browser evidence: ${scratch}`);
    try{
      const teacher=await(await browser.newContext({viewport:{width:1280,height:900}})).newPage();
      const student=await(await browser.newContext({viewport:{width:1280,height:900}})).newPage();
      const device=await(await browser.newContext()).newPage();
      const suffix=Date.now(),email=`p7-participation-${suffix}@example.test`;
      const errors=[];for(const page of [teacher,student,device])page.on('pageerror',error=>errors.push(error.message));
      await account(teacher,runtime.origin,runtime.inbox,`p7-participation-teacher-${suffix}@example.test`, undefined, "teacher");
      const studentUser=await account(student,runtime.origin,runtime.inbox,email, undefined, "student");
      await device.goto(runtime.origin+'/sign-in');
      await device.getByLabel('Correo electrónico',{exact:true}).fill(email);await device.getByLabel('Contraseña',{exact:true}).fill(password);
      await device.getByRole('button',{name:'Iniciar sesión',exact:true}).click();
      await device.waitForURL(url=>!url.pathname.includes('sign-in'));
      assert.equal((await ok(device,'GET','/auth/session')).user.id,studentUser.id);
      const room=await classroom(teacher,null,'P7 participation classroom');
      const detail=()=>ok(teacher,'GET',`/classrooms/${room.id}`);
      const change=async operation=>ok(teacher,'POST',`/classrooms/${room.id}/activities`,{revision:(await detail()).revision,operation});
      const structure=await detail(),unit=structure.units[0].id,topic=structure.units[0].topics[0].id;
      const create=async(title,type='ASSIGNMENT',deadline=null,allowLate=false,files=[])=>{
        const {id}=await change({action:'create',type});
        await change({action:'save',id,payload:{title,unitId:unit,topicId:topic,instructions:'Confirmed instruction text',attachmentRequired:false,
          instructionFileIds:files,materialIds:[],questions:type==='ASSIGNMENT'?[]:[{type:'DEVELOPMENT',prompt:'Explain carefully',points:'1',scoringRule:null,options:[]}],deadline,allowLate}});
        await change({action:'publish',id});return id;
      };
      const expired=await create('Expired before enrollment','ASSIGNMENT',{local:'2020-01-01T18:00'},true);
      const assignmentDraft=await change({action:'create',type:'ASSIGNMENT'}),assignment=assignmentDraft.id;
      const pdf=await planPdf('P7 immutable instructions');
      const allocated=await request(teacher,'POST','/files',{scope:{kind:'classroom',id:room.id},purpose:'instructions',targetId:assignment,name:'instructions.pdf',bytes:pdf.length});
      assert.equal(allocated.status,201);assert.ok(allocated.body.id);const fileId=allocated.body.id;
      const ready=await ok(teacher,'PUT',`/files/${fileId}/content`,{base64:pdf.toString('base64')});assert.equal(ready.ready,true);
      await change({action:'save',id:assignment,payload:{title:'Open assignment',unitId:unit,topicId:topic,instructions:'Immutable assignment observations',attachmentRequired:false,
        instructionFileIds:[fileId],materialIds:[],questions:[],deadline:null,allowLate:false}});await change({action:'publish',id:assignment});
      const quiz=await create('Explicit quiz start','QUESTIONNAIRE');
      const preview=await ok(student,'POST','/classrooms/codes/preview',{code:room.code});
      await ok(student,'POST','/classrooms/codes/confirm',{confirmation:preview.confirmation});
      const session=(page,id)=>ok(page,'GET',`/classrooms/${room.id}/activities/${id}/session`);
      let oldEditor,newEditor,attempt;
      let failed=false;
      const check=(name,operation)=>t.test(name,{skip:failed?'Prior shared participation journey failed':false},async()=>{try{await operation();}catch(error){failed=true;throw error;}});
      await check('actual first enrollment/preview/GET/private-file boundaries create no fictitious attempts',async()=>{
        assert.equal((await session(student,expired)).expected,false);assert.equal((await session(student,expired)).canStart,true);
        assert.equal((await session(student,assignment)).activity.instructions,null);
        assert.equal((await ok(student,'GET',`/classrooms/${room.id}/activities/${assignment}`)).activity.instructionFiles.length,0);
        await rejectSame(runtime.db,()=>request(student,'GET',`/files/${fileId}/content`),403);
        const teacherPreview=await ok(teacher,'GET',`/classrooms/${room.id}/activities/${assignment}/preview`);assert.equal(teacherPreview.activity.instructionFiles[0].id,fileId);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n,0);
        assert.equal((await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1',[assignment])).rows[0].first_started_at,null);
        await openClassroom(student,runtime.origin,'P7 participation classroom');await student.getByRole('button',{name:'Actividades',exact:true}).click();
        await student.getByRole('article',{name:'Open assignment',exact:true}).getByRole('button',{name:'Abrir Open assignment',exact:true}).click();
        const response=student.waitForResponse(res=>res.url().endsWith(`/activities/${assignment}/start`)&&res.request().method()==='POST');
        await student.getByRole('button',{name:'Preparar entrega',exact:true}).click();
        const start=await response;assert.equal(start.status(),200);const data=await start.json();oldEditor=data.editor;attempt=data.attempt;
        assert.ok(oldEditor.token);assert.equal(oldEditor.epoch,attempt.epoch);await student.getByLabel('Seleccionar archivo del trabajo',{exact:true}).waitFor();assert.equal(await student.getByLabel('Seleccionar archivo del trabajo',{exact:true}).isEnabled(),true);
        await student.getByRole('link',{name:'Descargar instructions.pdf',exact:true}).waitFor();
        assert.equal((await request(student,'GET',`/files/${fileId}/content`)).status,200);
        assert.equal((await session(device,assignment)).editor,undefined);
      });
      await check('independent device initially consults, explicit transfer warns and rotates only the same attempt',async()=>{
        await openClassroom(device,runtime.origin,'P7 participation classroom');await device.getByRole('button',{name:'Actividades',exact:true}).click();
        await device.getByRole('article',{name:'Open assignment',exact:true}).getByRole('button',{name:'Abrir Open assignment',exact:true}).click();
        await device.locator('.brujula-activity-options').getByRole('button',{name:'Continuar borrador',exact:true}).click();
        await device.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).waitFor();assert.equal(await device.getByLabel('Seleccionar archivo del trabajo',{exact:true}).count(),0);
        await device.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).click();
        await device.getByText('los cambios sin guardar de la otra sesión no se transfieren',{exact:false}).waitFor();
        const response=device.waitForResponse(res=>res.url().endsWith(`/attempts/${attempt.id}/transfer`));
        await device.getByRole('button',{name:'Confirmar transferencia',exact:true}).click();
        const transfer=await response;assert.equal(transfer.status(),200);const data=await transfer.json();newEditor=data.editor;
        assert.equal(data.attempt.id,attempt.id);assert.equal(data.attempt.number,1);assert.notEqual(newEditor.token,oldEditor.token);
        assert.equal(newEditor.epoch,'2');assert.deepEqual(data.attempt.answers,[]);
        await student.getByRole('button',{name:'Actualizar estado confirmado',exact:true}).click();
        await student.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).waitFor();assert.equal(await student.getByLabel('Seleccionar archivo del trabajo',{exact:true}).count(),0);
        const probe=async editor=>{await runtime.db.query('BEGIN');try{return await assertAttemptWrite({query:async(sql,...args)=>(await runtime.db.query(sql,args)).rows},studentUser.id,room.id,attempt.id,editor);}finally{await runtime.db.query('ROLLBACK');}};
        await assert.rejects(()=>probe(oldEditor),{code:'FORBIDDEN'});await probe(newEditor);
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts')).rows[0].n,1);
        assert.equal((await session(device,assignment)).editor,undefined);
        assert.equal(await device.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].some(key=>/attempt|editor/i.test(key))),false);
      });
      await check('questionnaire starts only with Comenzar; teacher first expired authorization uses roster and future classroom deadline',async()=>{
        await student.getByRole('button',{name:'Volver a actividades',exact:true}).click();
        await student.getByRole('article',{name:'Explicit quiz start',exact:true}).getByRole('button',{name:'Abrir Explicit quiz start',exact:true}).click();
        assert.equal((await session(student,quiz)).attempt,null);
        const response=await startBrowserAttempt(student,room.id,quiz,30000,'Responder actividad');assert.equal(response.status(),200);
        await student.getByText('Borrador · todavía sin entregar',{exact:false}).waitFor();
        const draftState=await session(student,quiz);assert.equal(draftState.attempt.status,'DRAFT');assert.notEqual(draftState.attempt.status,'SUBMITTED');
        await openClassroom(teacher,runtime.origin,'P7 participation classroom');await teacher.getByRole('button',{name:'Actividades',exact:true}).click();
        const expiredCard=teacher.getByRole('article',{name:'Expired before enrollment',exact:true});
        await expiredCard.getByRole('button',{name:'Abrir Expired before enrollment',exact:true}).click();
        await teacher.getByRole('button',{name:'Habilitar primera entrega',exact:true}).click();
        await teacher.getByLabel('Estudiante para primera entrega',{exact:true}).selectOption(studentUser.id);
        await teacher.getByLabel('Plazo individual futuro',{exact:true}).fill('2031-01-01T18:00');
        const authorization=teacher.waitForResponse(res=>res.url().endsWith(`/activities/${expired}/authorize-first`));
        await teacher.getByRole('button',{name:'Confirmar primera entrega',exact:true}).click();assert.equal((await authorization).status(),200);
        const authorized=await session(student,expired);assert.equal(authorized.expected,true);assert.equal(authorized.attempt,null);
        assert.equal(authorized.reception.deadlineAt,'2031-01-01T18:00:00.000Z');
        assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempts WHERE activity_id=$1',[expired])).rows[0].n,0);
      });
      await check('actual departure/reentry/archive and restart preserve obligations/attempt identity and current authorization',async()=>{
        const prior=(await runtime.db.query('SELECT id,is_expected,eligible_at,eligibility_reason FROM student_activities ORDER BY id')).rows;
        await ok(student,'POST',`/classrooms/${room.id}/leave`,{});
        await rejectSame(runtime.db,()=>request(device,'GET',`/classrooms/${room.id}/activities/${assignment}/session`),403);
        const absenceExpired=await create('Expired in actual absence','ASSIGNMENT',{local:'2020-01-01T12:00'},true);
        const absenceOpen=await create('Open in actual absence');
        const invitation=await ok(teacher,'POST',`/classrooms/${room.id}/invitations`,{email});await ok(student,'POST',`/classrooms/invitations/${invitation.id}/accept`,{});
        assert.equal((await session(device,assignment)).attempt.id,attempt.id);
        assert.equal((await session(student,absenceExpired)).expected,false);assert.equal((await session(student,absenceOpen)).expected,true);
        for(const row of prior)assert.deepEqual((await runtime.db.query('SELECT id,is_expected,eligible_at,eligibility_reason FROM student_activities WHERE id=$1',[row.id])).rows[0],row);
        await change({action:'deadline',id:absenceOpen,deadline:{local:'2020-01-01T12:00'},allowLate:false});
        await device.getByRole('button',{name:'Volver a actividades',exact:true}).click();
        await openClassroom(device,runtime.origin,'P7 participation classroom');
        await device.getByRole('button',{name:'Actividades',exact:true}).click();
        await device.getByRole('article',{name:'Open in actual absence',exact:true}).getByRole('button',{name:'Abrir Open in actual absence',exact:true}).click();
        console.log('Closed participation consultation UI',await device.getByRole('region',{name:'Consulta de actividad',exact:true}).innerText());
        const openingResponses=[],consultationMutations=[];
        const recordOpening=response=>{const path=new URL(response.url()).pathname;if(path.startsWith('/api/v1/'))openingResponses.push({path,method:response.request().method(),status:response.status(),retryAfter:response.headers()['retry-after']??null});};
        const recordMutation=request=>{const path=new URL(request.url()).pathname;if(path.startsWith('/api/v1/')&&['POST','PUT','PATCH','DELETE'].includes(request.method()))consultationMutations.push({path,method:request.method()});};
        device.on('response',recordOpening);device.on('request',recordMutation);
        try {
          const closedResponse=await openClosedAssignment(device,room.id,absenceOpen,30000);
          assert.equal(closedResponse.status(),200);const closed=await closedResponse.json();
          assert.equal(closed.editor,undefined);assert.equal(closed.canTransfer,false);assert.equal(closed.reception.open,false);
          assert.equal(closed.expected,true);assert.equal(closed.attempt.status,'DRAFT');assert.equal(closed.attempt.submittedAt,null);assert.equal(closed.activity.locked,true);
          assert.equal(closed.reception.deadlineAt,'2020-01-01T12:00:00.000Z');
          const consultation=device.getByRole('region',{name:'Consulta de actividad',exact:true});
          await consultation.getByText('Confirmed instruction text',{exact:true}).waitFor();
          await consultation.getByRole('heading',{name:'Fecha límite',exact:true}).waitFor();
          await consultation.getByText('1 ene, 12:00',{exact:true}).waitFor();
          await consultation.getByText('Plazo estricto',{exact:true}).waitFor();
          assert.equal(await consultation.locator('input, textarea').count(),0);
          for(const name of ['Subir archivo privado','Guardar borrador','Revisar entrega','Confirmar envío del trabajo','Confirmar entrega','Continuar en esta pestaña','Confirmar transferencia'])assert.equal(await device.getByRole('button',{name,exact:true}).count(),0,`Closed consultation exposes no ${name}`);
          assert.deepEqual(consultationMutations,[{path:`/api/v1/classrooms/${room.id}/activities/${absenceOpen}/start`,method:'POST'}],'The explicit start is the only mutation through the read-only consultation');
        } finally { device.off('response',recordOpening);device.off('request',recordMutation);console.log('Closed participation opening response headers',JSON.stringify(openingResponses)); }
        const archivedUnread=await create('Archived never-opened assignment');
        const before=await session(device,assignment);await runtime.restartApi();const after=await session(device,assignment);
        assert.deepEqual(after.attempt,before.attempt);
        await ok(teacher,'POST',`/classrooms/${room.id}/archive`,{revision:(await detail()).revision,archived:true});
        await rejectSame(runtime.db,()=>request(device,'POST',`/classrooms/${room.id}/attempts/${attempt.id}/transfer`,{revision:after.attempt.revision}),409);
        assert.equal((await session(device,assignment)).canTransfer,false);assert.equal((await request(device,'GET',`/files/${fileId}/content`)).status,200);
        const archived=await session(student,archivedUnread);assert.equal(archived.activity.instructions,'Confirmed instruction text');assert.equal(archived.attempt,null);
        await device.setViewportSize({width:320,height:900});await device.getByRole('button',{name:'Volver a actividades',exact:true}).click();
        assert.equal(await device.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
        await device.screenshot({path:join(scratch,'participation-320.png'),fullPage:true});assert.deepEqual(errors,[]);
      });
    }finally{await browser.close();}
  },{classrooms:true});
});
