import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, expect } from '@playwright/test';
import { withP4IntegrationRuntime } from '../scripts/p4-integration-runtime.mjs';
import { account, digest, api } from './p4-integration-helpers.mjs';
import { classroom, openClassroom, planPdf, rejectSame, domainSnapshot } from './p6-integration-helpers.mjs';
import { watchResponse } from './helpers/browser-action-observer.mjs';
import { runAdmittedAction } from './helpers/browser-admission-step.mjs';

async function request(page,method,path,body,headers={}) {
 let response=await api(page,method,path,body,headers);
 if(response.status===429){const seconds=Number(response.headers['retry-after']);assert.ok(Number.isInteger(seconds)&&seconds>0&&seconds<=60);
  console.log(`TP honors actual Retry-After=${seconds}s once`);await delay(seconds*1000);response=await api(page,method,path,body,headers);}
 return response;
}
const ok=async(...args)=>{const result=await request(...args);assert.equal(result.status,200,`${args[1]} ${args[2]} prerequisite`);return result.body;};
const editorHeaders=editor=>({'x-attempt-editor':editor.token,'x-attempt-epoch':editor.epoch});

test('P7 TP actual P3/browser/private storage/ClamAV persistence and confirmed receipt', {timeout:330000}, async t=>{
 await withP4IntegrationRuntime(async runtime=>{
  const owner=spawnSync('docker',['ps','--filter',`publish=${runtime.db.connectionParameters.port}`,'--format','{{.Label "foxmind.p4.owner"}}'],{encoding:'utf8',windowsHide:true,timeout:5000});
  assert.equal(owner.status,0);assert.match(owner.stdout.trim(),/^[a-f0-9]{16}$/);console.log(`TP actual disposable owner: ${owner.stdout.trim()}`);
  const browser=await chromium.launch({headless:true}),scratch=await mkdtemp(join(tmpdir(),'foxmind-p7-practical-'));
  console.log(`TP retained browser evidence: ${scratch}`);
  try{
   const teacher=await(await browser.newContext({viewport:{width:1280,height:900}})).newPage();
   const student=await(await browser.newContext({viewport:{width:1280,height:900}})).newPage();
   const device=await student.context().newPage(),suffix=Date.now(),pageErrors=[];
   for(const page of [teacher,student,device])page.on('pageerror',e=>pageErrors.push(e.message));
   await account(teacher,runtime.origin,runtime.inbox,`p7-tp-teacher-${suffix}@example.test`, undefined, "teacher");
   await account(student,runtime.origin,runtime.inbox,`p7-tp-student-${suffix}@example.test`, undefined, "student");
   const room=await classroom(teacher,student,'P7 practical classroom');
   const detail=await ok(teacher,'GET',`/classrooms/${room.id}`),unit=detail.units[0].id,topic=detail.units[0].topics[0].id;
   const change=async operation=>ok(teacher,'POST',`/classrooms/${room.id}/activities`,{revision:(await ok(teacher,'GET',`/classrooms/${room.id}`)).revision,operation});
   const {id:activity}=await change({action:'create',type:'ASSIGNMENT'});
   await change({action:'save',id:activity,payload:{title:'Real private practical work',unitId:unit,topicId:topic,instructions:'Read these immutable instructions and prepare your file.',attachmentRequired:true,instructionFileIds:[],materialIds:[],questions:[],deadline:null,allowLate:false}});
   await change({action:'publish',id:activity});
   const path=`/classrooms/${room.id}/activities/${activity}`,session=page=>ok(page,'GET',path+'/session');
   let attempt,editor,first,replacement,newEditor,confirmedAfterRemove;
   const bytes=await planPdf('Actual practical work');
   let failed=false;const check=(name,run)=>t.test(name,{skip:failed?'Earlier shared actual TP prerequisite failed':false},async()=>{try{await run();}catch(e){failed=true;throw e;}});
   const open=async (page,resume=false)=>{await openClassroom(page,runtime.origin,'P7 practical classroom');await page.getByRole('button',{name:'Actividades',exact:true}).click();
    await page.getByRole('article',{name:'Real private practical work',exact:true}).getByRole('button',{name:'Abrir Real private practical work',exact:true}).click();
    await page.locator('.brujula-activity-options').getByRole('button',{name:resume?'Continuar borrador':'Preparar entrega',exact:true}).click();};
   const uiUpload=async(name)=>{
    await student.getByLabel('Seleccionar archivo del trabajo',{exact:true}).setInputFiles({name,mimeType:'application/pdf',buffer:bytes});
    await student.getByText('Archivo seleccionado · todavía no cargado',{exact:false}).waitFor();
    const upload=student.waitForResponse(r=>/\/files\/[^/]+\/content$/.test(new URL(r.url()).pathname)&&r.request().method()==='PUT');
    await student.getByRole('button',{name:'Subir archivo privado',exact:true}).click();const response=await upload;
    assert.equal(response.status(),200);const ready=await response.json();assert.equal(ready.ready,true);
    await student.getByRole('button',{name:`Quitar ${name}`,exact:true}).waitFor();return ready;
   };
   await check('actual first open locks content; actual selected/uploaded/approved draft remains private and survives API restart',async()=>{
    assert.equal((await session(student)).attempt,null);
    await openClassroom(teacher,runtime.origin,'P7 practical classroom');await teacher.getByRole('button',{name:'Actividades',exact:true}).click();
    await teacher.getByRole('article',{name:'Real private practical work',exact:true}).getByRole('button',{name:'Abrir Real private practical work',exact:true}).click();
    await teacher.getByRole('region',{name:'Vista previa docente',exact:true}).waitFor();
    await teacher.getByRole('button',{name:'Volver a actividades',exact:true}).click();
    assert.equal((await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1',[activity])).rows[0].first_started_at,null);
    const start=student.waitForResponse(r=>r.url().endsWith(`/activities/${activity}/start`));await open(student);
    const response=await start;assert.equal(response.status(),200);const data=await response.json();attempt=data.attempt;editor=data.editor;assert.ok(editor);
    await student.getByRole('region',{name:'Archivos y entrega del trabajo práctico',exact:true}).waitFor();first=await uiUpload('first-work.pdf');
    const current=await session(student);assert.equal(current.attempt.revision,'1');assert.equal(current.attempt.attachments[0].id,first.id);assert.equal(current.editor,undefined);
    await rejectSame(runtime.db,()=>request(teacher,'GET',`/files/${first.id}/content`),403);
    await rejectSame(runtime.db,()=>request(teacher,'GET',`/classrooms/${room.id}/attempts/${attempt.id}/receipt`),403);
    assert.deepEqual((await ok(teacher,'GET',path+'/submissions')).submissions,[]);
    await runtime.restartApi();await open(student,true);
    await student.getByRole('link',{name:'Descargar first-work.pdf',exact:true}).waitFor();
    await student.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).waitFor();assert.equal(await student.getByLabel('Seleccionar archivo del trabajo',{exact:true}).count(),0);
    const transfer=student.waitForResponse(r=>r.url().endsWith(`/attempts/${attempt.id}/transfer`));
    await student.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).click();await student.getByRole('button',{name:'Confirmar transferencia',exact:true}).click();
    const moved=await transfer;assert.equal(moved.status(),200);editor=(await moved.json()).editor;
    await student.getByRole('button',{name:'Quitar first-work.pdf',exact:true}).waitFor();
   });
   await check('canceling explicit confirmation preserves draft; remove/add replacement conserves bytes/quota and refreshes revision',async()=>{
    const before=await domainSnapshot(runtime.db);await student.getByRole('button',{name:'Revisar entrega',exact:true}).click();
    await student.getByRole('button',{name:'Cancelar entrega',exact:true}).click();assert.equal(await domainSnapshot(runtime.db),before);
    const usage=await ok(teacher,'GET',`/files/usage?kind=classroom&id=${room.id}`);
    const removal=student.waitForResponse(r=>r.url().endsWith(`/attempts/${attempt.id}/attachments-remove`));await student.getByRole('button',{name:'Quitar first-work.pdf',exact:true}).click();assert.equal((await removal).status(),200);
    await student.getByText('No hay archivos confirmados.',{exact:true}).waitFor();assert.equal((await runtime.privateFileBytes(first.id)).length,bytes.length);
    assert.equal((await ok(teacher,'GET',`/files/usage?kind=classroom&id=${room.id}`)).usedBytes,usage.usedBytes);
    replacement=await uiUpload('replacement.pdf');assert.equal((await session(student)).attempt.attachments[0].id,replacement.id);
    assert.ok((await runtime.db.query('SELECT first_started_at FROM activities WHERE id=$1',[activity])).rows[0].first_started_at);
   });
   await check('second real tab transfers during actual paused scanner; stale upload cannot confirm or link',async()=>{
    await open(device,true);await device.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).waitFor();assert.equal(await device.getByLabel('Seleccionar archivo del trabajo',{exact:true}).count(),0);
    const allocated=await request(student,'POST','/files',{scope:{kind:'classroom',id:room.id},purpose:'attachment',targetId:attempt.id,name:'stale-editor.pdf',bytes:bytes.length},editorHeaders(editor));
    assert.equal(allocated.status,201);runtime.pauseScanner();
    const sending=request(student,'PUT',`/files/${allocated.body.id}/content`,{base64:bytes.toString('base64')},editorHeaders(editor));
    let inspecting=false;for(let i=0;i<30;i++){const row=(await runtime.db.query('SELECT phase FROM file_custodies WHERE file_id=$1',[allocated.body.id])).rows[0];if(row.phase==='inspecting'){inspecting=true;break;}await delay(100);}
    assert.equal(inspecting,true);assert.equal((await ok(student,'GET',`/files/${allocated.body.id}`)).ready,false);
    await device.getByRole('button',{name:'Continuar en esta pestaña',exact:true}).click();
    const transfer=device.waitForResponse(r=>r.url().endsWith(`/attempts/${attempt.id}/transfer`));await device.getByRole('button',{name:'Confirmar transferencia',exact:true}).click();
    const response=await transfer;assert.equal(response.status(),200);newEditor=(await response.json()).editor;runtime.resumeScanner();
    assert.equal((await sending).status,403);
    assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_attachments WHERE file_id=$1',[allocated.body.id])).rows[0].n,0);
    await device.getByRole('button',{name:'Actualizar estado confirmado',exact:true}).click();await device.getByRole('button',{name:'Quitar stale-editor.pdf',exact:true}).waitFor();
    const removePath=`/api/v1/classrooms/${room.id}/attempts/${attempt.id}/attachments-remove`,sessionPath=`/api/v1${path}/session`;
    let removed=false,phaseRequests=new WeakSet(),admissionRequests=new WeakSet(),retried,refreshed,beforePosts;
    const posts=[];
    const captureRequest=request=>{const target=new URL(request.url()).pathname;
     if(target.startsWith('/api/v1/')&&request.method()==='POST')posts.push({path:target,fileId:request.postDataJSON()?.fileId??null});
     if((target==='/api/v1/auth/csrf'&&request.method()==='GET')||(target===removePath&&request.method()==='POST'))admissionRequests.add(request);
     if(removed&&target===sessionPath&&request.method()==='GET')phaseRequests.add(request);};
    const markRemoved=response=>{if(new URL(response.url()).pathname===removePath&&response.request().method()==='POST'&&response.status()===200&&response.request().postDataJSON()?.fileId===allocated.body.id)removed=true;};
    device.on('request',captureRequest);device.on('response',markRemoved);
    const removeButton=device.getByRole('button',{name:'Quitar stale-editor.pdf',exact:true});
    try {
     const cancelled=await runAdmittedAction({
      mutationPath:removePath,
      action:async()=>{beforePosts=posts.length;await removeButton.click();},
      observe:()=>{
       admissionRequests=new WeakSet();
       refreshed?.dispose();
       refreshed=watchResponse(device,r=>new URL(r.url()).pathname===sessionPath&&r.request().method()==='GET'&&phaseRequests.has(r.request()),30000);
       return watchResponse(device,r=>{const target=new URL(r.url()).pathname;return admissionRequests.has(r.request())&&((target==='/api/v1/auth/csrf'&&r.request().method()==='GET'&&r.status()!==200)||(target===removePath&&r.request().method()==='POST'));},30000);
      },
      wait:ms=>delay(ms),
      onLimited:async(response,phase)=>{
       assert.equal(phase,'csrf','Only admission before the mutation may repeat the remove gesture');
       assert.equal(posts.length,beforePosts,'Denied CSRF admission must not issue a removal POST');
       refreshed.dispose();refreshed=undefined;
       await device.getByRole('region',{name:'Archivos y entrega del trabajo práctico',exact:true}).getByRole('alert').filter({hasText:/límite de intentos/i}).waitFor();
       await removeButton.waitFor();await expect(removeButton).toBeEnabled({timeout:30000});
       console.log(`TP removal honors actual CSRF Retry-After=${response.headers()['retry-after']}s once without a mutation`);
      },
     });
     assert.equal(cancelled.status(),200);const removal=await cancelled.json();
     let current=await refreshed.value();
     if(current.status()===429){
      const body=await current.json(),header=current.headers()['retry-after'];
      assert.equal(body.error?.code,'RATE_LIMITED');assert.match(header??'',/^\d+$/);const seconds=Number(header);
      assert.ok(Number.isSafeInteger(seconds)&&seconds>=1&&seconds<=60);
      await device.getByRole('region',{name:'Archivos y entrega del trabajo práctico',exact:true}).getByRole('alert').filter({hasText:/límite de intentos/i}).waitFor();
      console.log(`TP remove confirmed; GET session RATE_LIMITED honors Retry-After=${seconds}s once`);
      await delay(seconds*1000);phaseRequests=new WeakSet();
      retried=watchResponse(device,r=>new URL(r.url()).pathname===sessionPath&&r.request().method()==='GET'&&phaseRequests.has(r.request()),30000);
      const refreshButton=device.getByRole('button',{name:'Actualizar estado confirmado',exact:true});
      await refreshButton.waitFor();await expect(refreshButton).toBeEnabled({timeout:30000});await refreshButton.click();current=await retried.value();
     }
     assert.equal(current.status(),200);confirmedAfterRemove=await current.json();
     assert.equal(confirmedAfterRemove.attempt.revision,removal.revision);assert.equal(confirmedAfterRemove.attempt.epoch,newEditor.epoch);
     assert.deepEqual(confirmedAfterRemove.attempt.attachments.map(file=>file.id),[replacement.id]);
     assert.equal(confirmedAfterRemove.attempt.attachments[0].ready,true);assert.equal(confirmedAfterRemove.attempt.attachments[0].selected,true);
     await device.getByRole('button',{name:'Quitar stale-editor.pdf',exact:true}).waitFor({state:'detached'});
     assert.deepEqual(posts,[{path:removePath,fileId:allocated.body.id}],'Recovery reads never repeat removal or issue another mutation');
    } finally { device.off('request',captureRequest);device.off('response',markRemoved);refreshed?.dispose();retried?.dispose(); }
    await device.getByRole('button',{name:'Revisar entrega',exact:true}).waitFor({state:'visible'});
   });
   await check('actual confirmed submission locks editor and teacher UI receives only submitted files/download, not grades',async()=>{
    const beforeReview=confirmedAfterRemove;
    console.log('TP confirmed review readiness',JSON.stringify({status:beforeReview.attempt.status,attachments:beforeReview.attempt.attachments.map(file=>({id:file.id,ready:file.ready,selected:file.selected,upload:file.upload})),canTransfer:beforeReview.canTransfer,epoch:beforeReview.attempt.epoch,ui:await device.getByRole('region',{name:'Archivos y entrega del trabajo práctico',exact:true}).innerText()}));
    await device.getByRole('button',{name:'Revisar entrega',exact:true}).click();
    const sent=device.waitForResponse(r=>r.url().endsWith(`/attempts/${attempt.id}/submit-practical`));
    await device.getByRole('button',{name:'Confirmar envío del trabajo',exact:true}).click();const response=await sent;assert.equal(response.status(),200);
    const receipt=device.getByRole('region',{name:'Comprobante de entrega',exact:true});
    await receipt.getByRole('heading',{name:'Comprobante de entrega',exact:true}).waitFor();await receipt.getByText('Entrega confirmada',{exact:true}).waitFor();
    const persisted=await session(device);assert.equal(persisted.attempt.status,'SUBMITTED');assert.equal(persisted.attempt.attachments.length,1);assert.equal(persisted.canTransfer,false);
    assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n,0);
    await rejectSame(runtime.db,()=>request(device,'POST',`/classrooms/${room.id}/attempts/${attempt.id}/attachments-remove`,{revision:persisted.attempt.revision,fileId:replacement.id},editorHeaders(newEditor)),409);
    await teacher.getByRole('article',{name:'Real private practical work',exact:true}).getByRole('button',{name:'Abrir Real private practical work',exact:true}).click();
    await teacher.getByRole('region',{name:'Vista previa docente',exact:true}).waitFor();
    await teacher.getByRole('button',{name:'Ver entregas',exact:true}).click();
    const gradingPath=`/api/v1/classrooms/${room.id}/attempts/${attempt.id}/grading`;
    const grading=watchResponse(teacher,r=>new URL(r.url()).pathname===gradingPath&&r.request().method()==='GET',30000);
    try {
     await teacher.getByRole('button',{name:'Revisar entrega · Intento 1',exact:true}).click();
     const context=await grading.value();assert.equal(context.status(),200);const data=await context.json();
     assert.equal(data.attempt.id,attempt.id);assert.deepEqual(data.attempt.attachments.map(file=>file.id),[replacement.id]);
     assert.equal(data.grade.id,null);assert.equal(data.grade.finalGrade,null);assert.equal(data.grade.isPublished,false);
     await teacher.getByRole('region',{name:'Trabajo entregado',exact:true}).getByRole('link',{name:'Descargar replacement.pdf',exact:true}).waitFor();
    } finally { grading.dispose(); }
    const downloaded=await request(teacher,'GET',`/files/${replacement.id}/content`);assert.equal(downloaded.status,200);assert.equal(downloaded.digest,digest(bytes));
    await rejectSame(runtime.db,()=>request(teacher,'GET',`/files/${first.id}/content`),403);
    assert.equal((await runtime.db.query('SELECT count(*)::int n FROM attempt_grades')).rows[0].n,0,'Reviewing the submitted file never creates a correction');
    assert.equal(await device.evaluate(()=>[...Object.keys(localStorage),...Object.keys(sessionStorage)].some(k=>/attempt|editor/i.test(k))),false);
    await device.screenshot({path:join(scratch,'student-confirmed-receipt.png'),fullPage:true});await teacher.screenshot({path:join(scratch,'teacher-submitted-files.png'),fullPage:true});
    assert.deepEqual(pageErrors,[]);
   });
  }finally{runtime.resumeScanner();await browser.close();}
 },{classrooms:true});
});
