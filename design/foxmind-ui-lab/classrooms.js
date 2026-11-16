/* Collection only. Classroom cards and classroom interiors keep their existing UI. */
const classroomInvite={id:'creative',name:'Miradas creativas',subject:'Fotografía',group:'3.º B',teacher:'Lucía Demo',asset:'literature',expires:'20 de noviembre',topics:2,taught:0,roster:[],joinCode:'482619'};
const pendingInvitations=()=>Array.isArray(state.classInvitations)?state.classInvitations:state.invitation?[classroomInvite]:[];
let selectedInvitation=null;
function nextClassJoinCode(){
 normalizeClassJoinCodes();
 return availableClassJoinCode();
}
function availableClassJoinCode(){
 const used=new Set([classroomInvite.joinCode,...state.classes.map(c=>c.joinCode)]);
 let code=Number(classroomInvite.joinCode)+1;
 while(used.has(String(code)))code++;
 return String(code);
}
function normalizeClassJoinCodes(){
 for(const c of state.classes)if(!c.joinCode)c.joinCode=c.id===classroomInvite.id?classroomInvite.joinCode:availableClassJoinCode();
}
function classJoinCode(c){normalizeClassJoinCodes();return c.joinCode;}
function classroomForJoinCode(code){
 normalizeClassJoinCodes();
 const c=state.classes.find(c=>c.joinCode===code);
 if(c)return state.classArchived.includes(c.id)?null:{...c,teacher:classroomInvite.teacher,expires:classroomInvite.expires};
 return code===classroomInvite.joinCode?classroomInvite:null;
}
function classesScreen(){
 const teacher=role==='docente',active=activeClassrooms().length,archived=visibleClassrooms().length-active;
 return `<div class="classrooms-page">
 <header class="classrooms-welcome ${teacher?'teacher':'student'}"><div class="classrooms-welcome-copy"><span class="collection-context">${icon('layers')}${teacher?'Un espacio para cada grupo':'Tu comunidad para aprender'}</span><h1 tabindex="-1">Mis aulas</h1><p>${teacher?'Las ideas crecen cuando las compartimos. Prepará el próximo encuentro.':'Cada aula, una nueva forma de mirar el mundo. ¿Por dónde seguimos?'}</p><div class="collection-welcome-actions">${btn(teacher?'Crear aula':'Unirme con código',teacher?'new-class':'join','primary','plus')}<span>${active} ${active===1?'aula activa':'aulas activas'}</span></div></div><div class="classrooms-art" aria-hidden="true">${img('classroom-world')}</div></header>
 ${teacher?draftNudge():invitationPanel()}
 <section class="classrooms-collection" aria-label="Colección de aulas"><div class="toolbar collection-toolbar"><div class="segmented" aria-label="Estado de las aulas">${[['active','Activas'],['archived','Archivadas'],...(teacher?[['drafts','Borradores']]:[])].map(([k,l])=>`<button data-action="collection" data-value="${k}" aria-pressed="${collection===k}">${l}<span class="collection-count">${k==='active'?active:k==='archived'?archived:state.drafts.length}</span></button>`).join('')}</div><div class="search-field">${icon('search')}<input type="search" aria-label="Buscar aula" placeholder="Nombre, materia o grupo" data-search="classes" value="${esc(search)}"></div></div><div id="class-results" aria-live="polite">${classResults()}</div></section></div>`;
}
function invitationPanel(){const list=pendingInvitations();if(!list.length)return '';
 return `<section class="invitations-panel" aria-labelledby="invites-title"><header class="invitations-heading"><div class="invites-symbol">${icon('mail')}</div><div><h2 id="invites-title">Te invitaron a aprender <span>${list.length}</span></h2><p>Un nuevo grupo te está esperando.</p></div><span class="invitation-pending">Pendiente de tu respuesta</span></header><div class="invitation-list">${list.map(c=>`<article class="invitation-card">${img(c.asset,'invitation-cover')}<div class="invitation-copy"><p class="invitation-subject">${esc(c.subject)} <span>· ${esc(c.group)}</span></p><h3>${esc(c.name)}</h3><div class="invitation-person">${avatar(c.teacher,'mint')}<span><b>${esc(c.teacher)}</b> te invita</span></div></div><div class="invitation-response"><span>${icon('clock')} Hasta el ${esc(c.expires)}</span>${btn('Revisar invitación','invitation','primary','arrow',`data-id="${esc(c.id)}"`)}</div></article>`).join('')}</div></section>`;
}
function draftNudge(){if(!state.drafts.length||collection==='drafts')return '';const d=state.drafts.at(-1);return `<aside class="draft-nudge">${icon('edit')}<div><b>Una idea te espera: ${esc(d.name||'tu próxima aula')}</b><p>Paso ${Math.min(3,d.savedStep||0)+1} de 4 · Tu borrador sigue donde lo dejaste.</p></div>${btn('Retomar creación','resume-wizard','','arrow',`data-id="${state.drafts.length-1}"`)}</aside>`;}
function classResults(){
 const needle=search.trim().toLocaleLowerCase('es');
 const matches=c=>[c.name,c.subject,c.group].some(v=>(v||'').toLocaleLowerCase('es').includes(needle));
 if(role==='docente'&&collection==='drafts'){
  const list=state.drafts.map((d,i)=>({...d,index:i})).filter(matches);
  return list.length?`<div class="draft-grid">${list.map(d=>`<article class="class-draft">${img(d.asset||'literature')}<div class="draft-copy"><span class="draft-label">${icon('edit')} Pendiente de creación</span><h3>${esc(d.name||'Tu próxima aula')}</h3><p>${esc([d.subject,d.group].filter(Boolean).join(' · ')||'Todavía podés darle forma.')}</p><div class="draft-progress" aria-label="Paso ${Math.min(3,d.savedStep||0)+1} de 4">${[0,1,2,3].map(i=>`<i class="${i<=(d.savedStep||0)?'done':''}"></i>`).join('')}</div><div class="draft-actions">${btn('Continuar creación','resume-wizard','primary','arrow',`data-id="${d.index}"`)}<button class="icon-button" data-action="delete-class-draft" data-id="${d.index}" aria-label="Eliminar borrador ${esc(d.name||'sin nombre')}">${icon('trash')}</button></div></div></article>`).join('')}</div>`:collectionEmpty(needle?'search':'drafts');
 }
 const list=visibleClassrooms().filter(c=>(collection==='archived')===state.classArchived.includes(c.id)&&matches(c));
 return list.length?`<div class="class-grid">${list.map(classCard).join('')}</div>`:collectionEmpty(needle?'search':collection);
}
function collectionEmpty(kind){const teacher=role==='docente',copy={search:['No encontramos esa aula','Probá con el nombre, la materia o el grupo.'],drafts:['Las próximas ideas tienen lugar acá','Guardá un aula como borrador y retomá la creación cuando quieras.'],archived:['Todavía no hay aulas archivadas','Las aulas que archives van a seguir disponibles para consultar.'],active:[teacher?'Tu primera aula empieza con una idea':'Tu próximo descubrimiento empieza acá',teacher?'Dale un nombre, prepará el plan e invitá a tu grupo.':'Aceptá una invitación o ingresá el código que te compartió tu docente.']}[kind];return `<div class="collection-empty">${img('classroom-world')}<h3>${copy[0]}</h3><p>${copy[1]}</p>${kind==='search'?btn('Limpiar búsqueda','clear-search'):kind==='archived'?btn('Ver aulas activas','active-classes'):btn(teacher?'Crear aula':'Unirme con código',teacher?'new-class':'join','primary','plus')}</div>`;}
function invitation(button,codeMatch=null){
 if(role!=='estudiante')return;
 const c=codeMatch||pendingInvitations().find(c=>c.id===button?.dataset?.id);
 if(!c||state.classArchived.includes(c.id))return;
 selectedInvitation=c;
 const joined=activeClassrooms().some(item=>item.id===c.id);
 showDialog(joined?'Ya sos parte de esta aula':'Hay un lugar para vos',joined?'Podés entrar cuando quieras.':'Revisá el grupo antes de sumarte.',`<div class="invite-detail-cover">${img(c.asset)}<span>${esc(c.subject)}</span></div><div class="invite-detail-copy"><h3>${esc(c.name)}</h3><p>${esc(c.group)} · Ciclo ${esc(c.year||'2026')}</p><div class="invitation-person">${avatar(c.teacher,'mint')}<span>Tu docente<br><b>${esc(c.teacher)}</b></span></div><ul class="invite-benefits"><li>${icon('book')}Un plan para saber por dónde seguir</li><li>${icon('folder')}Materiales y actividades en un solo lugar</li><li>${icon('users')}Un espacio para aprender con tu grupo</li></ul>${joined?'':`<p class="invite-expiry">${icon('clock')} Podés aceptar hasta el ${esc(c.expires)}.</p>`}</div>`,btn('Ahora no','close')+btn(joined?'Entrar al aula':'Aceptar y unirme','confirm-join','primary','arrow'));$('#dialog').classList.add('invitation-dialog');}
function acceptClassInvitation(){
 const invitation=selectedInvitation;
 if(role!=='estudiante'||!invitation||state.classArchived.includes(invitation.id))return;
 if(!fxCommit(()=>{
  let c=state.classes.find(item=>item.id===invitation.id);
  if(!c){c=structuredClone(invitation);state.classes.push(c);}
  if(!enrolledIn(c))c.roster=[...(c.roster||[]),demoStudent];
  state.selectedClass=c.id;
  if(c.id===classroomInvite.id)state.invitation=false;
  if(Array.isArray(state.classInvitations))state.classInvitations=state.classInvitations.filter(item=>item.id!==c.id);
 }))return;
 selectedInvitation=null;
 closeDialog();
 collection='active';
 go('aulas');
 toast(`Ya sos parte de ${invitation.name}. La encontrás en tus aulas.`,'success');
}
