import test from 'node:test';
import assert from 'node:assert/strict';
import {withJourney,ok,rootOf,selectClassroomSection} from './p9-journey-helpers-current.mjs';
import {openClassroom} from './p6-integration-helpers.mjs';

test('Written material revisions and recurring event scope traverse the actual UI, scanner and private API',{timeout:330000},async()=>{
 await withJourney('material-agenda',async world=>{
  const {T,S,room,runtime}=world,root=rootOf(room),title='Apunte escrito',body='Primera explicación\nCon acentos y 🦊';
  await openClassroom(T.page,runtime.origin,room.name??'P9 material-agenda classroom');await selectClassroomSection(T.page,'library','Biblioteca');
  await T.page.getByRole('button',{name:'Agregar material',exact:true}).click();
  let dialog=T.page.getByRole('dialog',{name:'Agregar material',exact:true});
  await dialog.getByLabel('Nombre del material',{exact:true}).fill(` ${title} `);await dialog.getByLabel('Contenido o descripción',{exact:true}).fill(body);
  async function publishText(button){
   await button.click();
   await T.page.waitForFunction(()=>!document.querySelector('[role=dialog]')||[...document.querySelectorAll('[role=dialog] button')].some(b=>b.textContent==='Consultar revisión del material'));
   const review=T.page.getByRole('button',{name:'Consultar revisión del material',exact:true});
   if(await review.count()){await review.click();await button.click();}
   await T.page.getByRole('dialog').waitFor({state:'hidden'});
  }
  await publishText(dialog.getByRole('button',{name:'Publicar en Biblioteca',exact:true}));
  const original=(await ok(T.page,'GET',`${root}/library`)).find(m=>m.title===title);assert.equal(original.body,body);
  const row=T.page.getByRole('article',{name:title,exact:true});
  await row.getByRole('button',{name:`Abrir material: ${title}`,exact:true}).click();
  await T.page.getByRole('region',{name:`Lectura de ${title}`,exact:true}).getByText(body,{exact:true}).waitFor();
  assert.equal(await T.page.getByRole('dialog',{name:title,exact:true}).count(),0);
  await T.page.getByRole('button',{name:'Editar datos',exact:true}).click();
  dialog=T.page.getByRole('dialog',{name:'Editar material',exact:true});const nextBody='Segunda explicación\nArchivo y lectura coinciden 🦊';
  await dialog.getByLabel('Contenido o descripción',{exact:true}).fill(nextBody);
  await publishText(dialog.getByRole('button',{name:'Guardar datos del material',exact:true}));
  const materials=await ok(S.page,'GET',`${root}/library`),previous=materials.find(m=>m.id===original.id),current=materials.find(m=>m.id===previous.supersededBy);
  await T.page.getByRole('region',{name:`Lectura de ${title}`,exact:true}).getByText(nextBody,{exact:true}).waitFor();
  assert.equal(previous.fileId,original.fileId);assert.equal(current.body,nextBody);assert.notEqual(current.fileId,original.fileId);
  const downloaded=await S.page.request.get(`${runtime.origin}/api/v1/files/${current.fileId}/content`);assert.equal(downloaded.status(),200);assert.ok((await downloaded.body()).includes(Buffer.from('Segunda explicación')));

  await T.page.goto(runtime.origin+'/agenda');await T.page.getByRole('button',{name:'Crear evento',exact:true}).click();
  dialog=T.page.getByRole('dialog',{name:'Crear evento personal',exact:true});
  const date=new Date().toISOString().slice(0,10),until=new Date(Date.parse(date+'T12:00Z')+14*86400000).toISOString().slice(0,10);
  await dialog.getByLabel('Título',{exact:true}).fill('Clase semanal privada');await dialog.getByLabel('Fecha',{exact:true}).fill(date);await dialog.getByRole('checkbox',{name:'Todo el día',exact:true}).check();await dialog.getByLabel('Repetición',{exact:true}).selectOption('WEEKLY');await dialog.getByLabel('Repetir hasta (incluido)',{exact:true}).fill(until);
  const created=T.page.waitForResponse(r=>/\/agenda\/events\/[^/]+$/.test(r.url())&&r.request().method()==='PUT');await dialog.getByRole('button',{name:'Crear evento',exact:true}).click();const response=await created;assert.equal(response.status(),201);const event=await response.json();
  await T.page.goto(`${runtime.origin}/agenda?event=${event.id}&date=${date}`);
  await T.page.getByRole('button',{name:'Editar evento',exact:true}).click();
  await T.page.getByRole('dialog',{name:'Editar evento recurrente',exact:true}).getByRole('button',{name:'Solo este evento',exact:true}).click();
  assert.equal(await T.page.getByRole('dialog').count(),1,'Scope closes before the editor opens');
  dialog=T.page.getByRole('dialog',{name:'Editar evento',exact:true});await dialog.getByLabel('Título',{exact:true}).fill('Clase trasladada');
  const changed=T.page.waitForResponse(r=>r.url().includes(`/occurrences/${date}`)&&r.request().method()==='PATCH');await dialog.getByRole('button',{name:'Guardar cambios',exact:true}).click();assert.equal((await changed).status(),200);
  const canonical=await ok(T.page,'GET',`/agenda/events/${event.id}`);assert.equal(canonical.title,'Clase semanal privada');assert.equal(canonical.exceptions[0].replacement.title,'Clase trasladada');
  assert.equal((await S.page.request.get(`${runtime.origin}/api/v1/agenda/events/${event.id}`)).status(),403);
 });
});
