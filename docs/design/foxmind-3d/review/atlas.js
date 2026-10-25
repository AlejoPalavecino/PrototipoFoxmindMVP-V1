'use strict';
(() => {
const {screens}=window.FOX_REVIEW;
const F=window.Fox,V=window.FoxViews;
const domains={'account-and-navigation':'Acceso, cuenta e Inicio','classrooms-and-membership':'Aulas y membresías','classroom-workspace':'Espacio del aula','activity-authoring':'Autoría de actividades','submissions-and-grading':'Entregas, corrección y progreso',agenda:'Agenda'};
const variants={default:'Vista principal',study:'Solo estudio',teach:'Solo enseño',mixed:'Estudio y enseño',none:'Sin membresías',teacher:'Vista docente',student:'Vista estudiante',tp:'Trabajo práctico',quiz:'Cuestionario',exam:'Evaluación','teacher-tp':'Docente · TP','teacher-quiz':'Docente · Cuestionario','teacher-exam':'Docente · Evaluación'};
const states={normal:'Estado principal',loading:'Cargando',empty:'Sin datos',error:'Error',readonly:'Aula archivada',conflict:'Conflicto de revisión',success:'Confirmación',unavailable:'Acceso no disponible',queued:'IA · En cola',running:'IA · Generando',ready:'IA · Lista',failed:'IA · Falló',stale:'IA · Fuentes cambiaron',applied:'IA · Borrador creado',unknown:'IA · Resultado incierto'};
const canvas=document.getElementById('canvas');
const controls={domain:document.getElementById('domain-select'),flow:document.getElementById('flow-select'),variant:document.getElementById('variant-select'),state:document.getElementById('state-select')};
let active;

function view(s,v,state){
  const id=s.id;
  if(id.startsWith('AUTH-'))return V.auth(s,v);
  if(id.startsWith('HOME-')||id==='NAV-01')return V.home(s,v);
  if(id.startsWith('ACC-'))return V.account(s,v);
  if(id==='NAV-02'||id==='GRADE-05')return V.notifications(s,v);
  if(id.startsWith('AGENDA-'))return V.agenda(s,v);
  if(id.startsWith('PLAN-')||['CLASS-09','CLASS-15'].includes(id))return V.plan(s,v);
  if(id.startsWith('LIB-'))return V.library(s,v);
  if(id.startsWith('WALL-'))return V.wall(s,v);
  if(id.startsWith('PEOPLE-')||['CLASS-10','CLASS-11','CLASS-13'].includes(id))return V.people(s,v);
  if(id.startsWith('CLASS-'))return V.classrooms(s,v);
  if(id.startsWith('ACT-'))return V.authoring(s,v);
  if(id.startsWith('AI-'))return V.ai(s,v,state);
  if(id.startsWith('SUB-'))return V.submission(s,v);
  if(id.startsWith('GRADE-'))return V.grade(s,v);
  if(id.startsWith('PROG-'))return V.progression(s,v);
  throw new Error('Flujo sin composición: '+id);
}
window.FoxRender=view;
function stateCopy(s){
  if(['CLASS-04','CLASS-05'].includes(s.id))return ['Todavía no hay unidades','Agregá una unidad con su primer tema o revisá la propuesta del plan.','Agregar unidad','CLASS-05/default/normal'];
  const prefix=s.id.split('-')[0];
  return ({CLASS:['Todavía no hay aulas','Podés crear un aula o unirte con un código.','Crear aula','CLASS-02/default/normal'],PLAN:['Todavía no hay temas','El plan conserva sus archivos y los temas se organizan desde la cuenta docente.'],LIB:['Todavía no hay materiales','Los materiales publicados aparecerán en este espacio.'],WALL:['El Muro está por comenzar','Compartí una consulta o un aviso con el aula.'],PEOPLE:['Todavía no hay estudiantes','Las invitaciones pendientes no cuentan como matrículas.'],ACT:['No hay actividades para mostrar','Cambiá los filtros o prepará una nueva actividad desde la cuenta docente.'],AI:['No hay generaciones recientes','Prepará una solicitud explícita para crear una propuesta privada.'],SUB:['Todavía no hay entregas registradas','Un borrador o una consulta no equivalen a un envío.'],GRADE:['Resultado pendiente de publicación','La corrección privada no se muestra hasta que el docente la publica.'],PROG:['Sin calificaciones publicadas','No se calcula un cero cuando no hay notas. El cumplimiento y el plan se consultan por separado.'],AGENDA:['Un día libre en tu agenda','Podés agregar un evento privado, aunque no participes en aulas.','Agregar evento este día','AGENDA-04/default/normal'],NAV:['No hay notificaciones','Las nuevas novedades de tus aulas aparecerán acá.'],HOME:['Estás al día','No hay tareas pendientes en este ejemplo. Tus aulas y agenda siguen disponibles.']})[prefix]||['Sin datos para mostrar','No hay registros en este contexto.'];
}
function confirmation(s){
  const id=s.id;
  if(id==='SUB-06')return `<div class="receipt"><h2>Entregada</h2><p>Se recibió tu trabajo. Este intento quedó en modo consulta.</p>${F.keyValues([['Actividad',F.activityName(active.variant)],['Intento','1'],['Recepción','29 oct, 17:42'],['Plazo aplicado','29 oct, 18:00'],['Zona','Buenos Aires'],['Puntualidad','A tiempo']])}${F.btn('Consultar resultado',false,'GRADE-04/'+active.variant+'/empty')}</div>`;
  const map={'AUTH-01':['Sesión verificada','Continuá a Inicio o al destino permitido de tu solicitud.'],'AUTH-02':['Revisá tu correo','Si corresponde, recibirás un mensaje con los pasos para continuar. Crear una cuenta no acepta invitaciones.'],'AUTH-03':['Correo verificado','La verificación no inicia sesión ni acepta invitaciones.'],'AUTH-04':['Solicitud recibida','Si corresponde, recibirás un enlace de recuperación. Revisá tu correo.'],'AUTH-05':['Contraseña actualizada','Las sesiones anteriores se cerraron. Ya podés iniciar sesión.'],'ACC-01':['Perfil guardado','Tus nombres confirmados se muestran en la cuenta.'],'ACC-02':['Contraseña actualizada','Tu sesión actual continúa; las otras se cerraron.'],'CLASS-06':['Aula creada','Ya podés ir a Alumnos para invitar estudiantes.'],'CLASS-07':['Inscripción confirmada','Ya formás parte del aula como estudiante.'],'CLASS-08':['Invitación aceptada','La matrícula quedó confirmada.'],'LIB-02':['Material publicado','El archivo aprobado ya está disponible para miembros autorizados.'],'LIB-04':['Material eliminado','El borrado del archivo sigue pendiente; el espacio todavía está reservado.'],'ACT-06':['Actividad publicada','La versión guardada ya puede ser consultada por estudiantes autorizados.'],'AI-04':['Borrador creado','La actividad sigue privada hasta su publicación explícita.'],'GRADE-01':['Corrección privada guardada','No se publicó una nota ni se notificó al estudiante.'],'GRADE-02':['Calificación publicada','La nota y las devoluciones guardadas ya están disponibles para el estudiante.'],'GRADE-03':['Calificación rectificada','Solo cambió la nota final; el motivo queda en la auditoría docente.']}, entry=map[id]|| (id.startsWith('AGENDA-')?['Cambio confirmado','La agenda puede volver a consultarse sin repetir la escritura.']:['Cambio confirmado','La operación correspondiente quedó confirmada. Consultá su resultado antes de repetirla.']);
  return F.notice(entry[0],entry[1],'good');
}
function decorate(s,state){
  let target=canvas.querySelector('.app-main')||canvas.querySelector('.auth-card')||canvas.querySelector('.focused-exam');
  if(!target)return;
  if(state==='unavailable'){
    target.innerHTML=F.title('Acceso no disponible')+F.empty('Este contenido ya no está disponible','Tu cuenta no tiene acceso actual a este recurso. No se conserva contenido privado en esta vista.','Volver a Mis aulas','CLASS-01/default/normal').replace('states/empty.webp','states/unavailable.webp');return;
  }
  if(state==='loading'){
    const heading=target.querySelector('h1')?.textContent||s.title;
    target.innerHTML=F.title(heading)+`<div class="stack" role="status" aria-busy="true"><p class="muted">Cargando información…</p><div class="two-columns"><div class="skeleton"><i></i><i></i><i></i><i></i><i></i></div><div class="skeleton"><i></i><i></i><i></i></div></div></div>`;return;
  }
  if(state==='empty'){
    if(s.id.startsWith('HOME-')){
      const cols=target.querySelector('.two-columns');if(cols)cols.innerHTML=F.empty('Estás al día','No hay tareas pendientes en este ejemplo. Tus aulas y agenda siguen disponibles.')+F.panel('Tu agenda privada',F.row('Lectura compartida','Hoy · 16:00–17:00 · Privado',F.btn('Abrir Agenda',false,'AGENDA-01/default/normal')));return;
    }
    const [heading,body,cta,go]=stateCopy(s);
    const title=target.querySelector('h1')?.textContent||s.title;
    target.innerHTML=F.title(title)+F.empty(heading,body,cta,go);return;
  }
  if(state==='success'){
    if(s.id==='SUB-06'){target.innerHTML=F.title('Comprobante de entrega')+confirmation(s);return;}
    if(['CLASS-06','CLASS-07','CLASS-08','LIB-04','ACT-06','AI-04','GRADE-02','AGENDA-08'].includes(s.id)){
      target.innerHTML=F.title('Operación confirmada')+`<div class="narrow stack"><img src="../assets/states/success.webp" width="120" height="120" alt="" style="object-fit:contain">${confirmation(s)}<div class="buttons">${F.btn('Volver a consultar',false,s.id==='AGENDA-08'?'AGENDA-01/default/normal':'CLASS-01/default/normal')}</div></div>`;return;
    }
    target.insertAdjacentHTML('afterbegin',`<div class="state-block">${confirmation(s)}</div>`);
  } else if(['error','readonly','conflict'].includes(state))target.insertAdjacentHTML('afterbegin',`<div class="state-block">${F.stateBlock(state,s.id)}</div>`);
  if(state==='readonly')disableWrites(target);
  if(s.id==='ACT-07')target.querySelectorAll('.locked-content input,.locked-content textarea,.locked-content select,.locked-content button').forEach(el=>el.disabled=true);
  if(s.id==='AGENDA-09')target.querySelectorAll('button[data-demo]').forEach(el=>{if(/^(Crear evento|Guardar cambios|Eliminar)/.test(el.textContent.trim()))el.disabled=true;});
}
function disableWrites(target){
  target.querySelectorAll('input,textarea,select').forEach(el=>el.disabled=true);
  target.querySelectorAll('button[data-demo]').forEach(el=>{if(!/^(Descargar|Vista previa|Actualizar|Consultar|Ver |Cancelar|Cerrar|Revisar versión)/.test(el.textContent.trim()))el.disabled=true;});
}
function optionList(values,labels){return values.map(value=>`<option value="${value}">${F.esc(labels[value]||value)}</option>`).join('');}
function render(){
  const parts=decodeURIComponent(location.hash.slice(1)).split('/');
  const s=screens.find(entry=>entry.id===parts[0])||screens.find(entry=>entry.id==='HOME-01');
  const variant=s.variants.includes(parts[1])?parts[1]:s.variants[0];
  const state=s.states.includes(parts[2])?parts[2]:'normal';
  active={s,variant,state};
  controls.domain.innerHTML=optionList(Object.keys(domains),domains);controls.domain.value=s.domain;
  controls.flow.innerHTML=screens.filter(entry=>entry.domain===s.domain).map(entry=>`<option value="${entry.id}">${entry.id} · ${F.esc(entry.title)}</option>`).join('');controls.flow.value=s.id;
  controls.variant.innerHTML=optionList(s.variants,variants);controls.variant.value=variant;
  controls.state.innerHTML=optionList(s.states,states);controls.state.value=state;
  document.getElementById('source-link').href=s.sourceDoc;
  document.getElementById('frame-position').textContent=`${screens.indexOf(s)+1} / ${screens.length}`;
  document.getElementById('frame-name').textContent=`${s.id} · ${s.title} — ${variants[variant]} / ${states[state]}`;
  document.getElementById('frame-note').textContent=s.reviewNote;
  document.getElementById('demo-status').textContent='';
  canvas.innerHTML=view(s,variant,state);decorate(s,state);
  document.title=`${s.id} · ${s.title} · FoxMind 3D`;
  canvas.querySelector('.class-tabs .active')?.scrollIntoView({block:'nearest',inline:'nearest'});
}
function go(id,variant,state='normal'){const s=screens.find(entry=>entry.id===id);if(!s)return;location.hash=`${id}/${s.variants.includes(variant)?variant:s.variants[0]}/${s.states.includes(state)?state:'normal'}`;}
controls.domain.addEventListener('change',e=>{const s=screens.find(entry=>entry.domain===e.target.value);go(s.id);});
controls.flow.addEventListener('change',e=>go(e.target.value,active.variant));
controls.variant.addEventListener('change',e=>go(active.s.id,e.target.value,active.state));
controls.state.addEventListener('change',e=>go(active.s.id,active.variant,e.target.value));
document.getElementById('previous').addEventListener('click',()=>go(screens[(screens.indexOf(active.s)-1+screens.length)%screens.length].id,active.variant));
document.getElementById('next').addEventListener('click',()=>go(screens[(screens.indexOf(active.s)+1)%screens.length].id,active.variant));
document.getElementById('toggle-review').addEventListener('click',e=>{const region=document.getElementById('review-controls');const closed=region.classList.toggle('hidden');e.currentTarget.textContent=closed?'Mostrar controles':'Ocultar controles';e.currentTarget.setAttribute('aria-expanded',String(!closed));});
canvas.addEventListener('submit',e=>{e.preventDefault();document.getElementById('demo-status').textContent='Ejemplo visual: este formulario no envía datos.';});
canvas.addEventListener('click',e=>{
  const button=e.target.closest('button');if(!button)return;
  if(button.dataset.go){const p=button.dataset.go.split('/');go(p[0],p[1],p[2]);return;}
  if(button.dataset.password){const field=document.getElementById(button.dataset.password);const show=field.type==='password';field.type=show?'text':'password';button.textContent=show?'Ocultar':'Mostrar';button.setAttribute('aria-label',(show?'Ocultar':'Mostrar')+' contraseña');return;}
  if(button.hasAttribute('data-menu')){const menu=document.getElementById('mobile-nav');const closed=menu.classList.toggle('hidden');button.setAttribute('aria-expanded',String(!closed));return;}
  if(button.hasAttribute('data-demo'))document.getElementById('demo-status').textContent=`Acción de ejemplo: «${button.textContent.trim()}». No se enviaron datos ni se guardaron cambios.`;
});
canvas.addEventListener('keydown',e=>{if(e.key==='Escape'){const menu=document.getElementById('mobile-nav');if(menu&&!menu.classList.contains('hidden')){menu.classList.add('hidden');const trigger=canvas.querySelector('[data-menu]');trigger?.setAttribute('aria-expanded','false');trigger?.focus();}}});
window.addEventListener('hashchange',render);
render();
})();
