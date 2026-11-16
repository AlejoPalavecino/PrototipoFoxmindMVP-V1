/* A local inbox with explicit destinations and reading state per demo role. */
const ntFilters={docente:{read:'all',kind:'all'},estudiante:{read:'all',kind:'all'}};
const ntKinds={all:['Todas','bell'],activity:['Actividades','file'],classroom:['Aulas','users'],agenda:['Agenda','calendar']};
function ntCollect(r){
 const items=[],add=n=>items.push({...n,role:r}),name=id=>state.classes.find(c=>c.id===id)?.name||'Aula no disponible';
 if(r==='docente'){
  state.reviews.forEach((x,i)=>{const received=x.received||'';add({id:'delivery-'+x.id,kind:'activity',icon:'file',tone:'sky',title:x.name+' entregó su actividad',body:x.title,source:name(x.classId),classId:x.classId,target:'review',targetId:x.id,action:x.state==='published'?'Ver devolución':'Revisar entrega',group:!received?'Esta semana':/^(Hoy|Ahora)/.test(received)?'Hoy':'Ayer',time:received.replace(/^Hoy, |^Ayer, /,''),fresh:i<2||received==='Ahora'});});
  add({id:'member-photo',kind:'classroom',icon:'users',tone:'mint',title:'Marina se sumó a tu aula',body:'Ya tiene acceso al plan, los materiales y las actividades.',source:name('photo'),classId:'photo',target:'members',action:'Ver estudiantes',group:'Ayer',time:'12:30',fresh:false});
 }else{
  const classIds=new Set(activeClassrooms(r).map(c=>c.id));
  state.activities.filter(a=>classIds.has(a.classId)&&a.state==='graded'&&a.publication!=='draft').forEach(a=>add({id:'grade-'+a.id,kind:'activity',icon:'chat',tone:'mint',title:'Tenés una devolución para seguir',body:a.title,source:name(a.classId),classId:a.classId,target:'grade',targetId:a.id,action:'Ver devolución',group:'Hoy',time:'09:30',fresh:true}));
  pendingInvitations().forEach(c=>add({id:'invite-'+c.id,kind:'classroom',icon:'mail',tone:'peach',title:c.teacher+' te invita a un aula',body:c.name,source:c.group,inviteId:c.id,target:'invite',targetId:c.id,action:'Revisar invitación',group:'Hoy',time:'08:45',fresh:true}));
  state.activities.filter(a=>classIds.has(a.classId)&&a.state==='pending'&&a.publication!=='draft'&&!state.submitted[a.id]).forEach(a=>{const fresh=!['light','observe','contrast','life'].includes(a.id);add({id:'activity-'+a.id,kind:'activity',icon:'edit',tone:'sky',title:'Una actividad para vos',body:a.title,source:name(a.classId),classId:a.classId,target:'activity',targetId:a.id,action:'Ver actividad',group:fresh?'Hoy':'Ayer',time:fresh?'Ahora':'16:00',fresh});});
  const post=classIds.has('photo')&&classroomPosts('photo').find(p=>p.id==='welcome-photo'&&p.type==='Aviso');
  if(post)add({id:'wall-photo',kind:'classroom',icon:'chat',tone:'peach',title:'Un aviso de tu docente',body:post.title,source:name('photo'),classId:'photo',postId:post.id,target:'wall',action:'Ir al muro',group:'Ayer',time:'08:30',fresh:false});
 }
 const e=state.events.find(e=>e.id===(r==='docente'?2:3));
 if(e)add({id:'event-'+e.id,kind:'agenda',icon:'calendar',tone:'rose',title:r==='docente'?'Un momento para preparar tu clase':'Tu próximo repaso ya tiene lugar',body:e.title,source:`${e.day} de ${calendarMonths[e.month??10].toLocaleLowerCase('es')}, ${e.time}`,target:'event',targetId:e.id,action:'Ver evento',group:'Hoy',time:'08:00',fresh:false});
 return items;
}
function ntInit(){
 const first=!state.noticeCenter;state.noticeCenter??={items:{docente:[],estudiante:[]},read:{docente:{},estudiante:{}}};
 for(const r of ['docente','estudiante']){
  const box=state.noticeCenter;box.items[r]??=[];box.read[r]??={};
  for(const n of ntCollect(r)){const i=box.items[r].findIndex(x=>x.id===n.id);if(i<0)box.items[r].push(n);else box.items[r][i]=n;if(!Object.hasOwn(box.read[r],n.id))box.read[r][n.id]=first&&state.notificationsRead?true:!n.fresh;}
 }
}
function ntItems(r=role){ntInit();return state.noticeCenter.items[r];}
function ntIsRead(n){return !!state.noticeCenter.read[n.role][n.id];}
function ntUnread(r=role){return ntItems(r).filter(n=>!ntIsRead(n)).length;}
function ntScreen(){
 const items=ntItems(),f=ntFilters[role],unread=ntUnread(),shown=items.filter(n=>(f.read==='all'||!ntIsRead(n))&&(f.kind==='all'||n.kind===f.kind));
 return `<div class="nt-page"><header class="nt-intro"><div class="nt-intro-copy"><h1 tabindex="-1">Notificaciones</h1><p>${role==='docente'?'Las novedades de tus aulas, a tu ritmo.':'Lo nuevo en tu aprendizaje, en un solo lugar.'}</p><span class="nt-summary">${icon(unread?'bell':'check')}${unread?`${unread} ${unread===1?'notificación sin leer':'notificaciones sin leer'}`:'Estás al día'}</span></div><div class="nt-letter" aria-hidden="true"><span class="nt-letter-sheet"><i></i><i></i><i></i></span><span class="nt-letter-seal">${icon('bell')}</span><span class="nt-letter-spark">${icon('spark')}</span></div></header>
 <section class="nt-inbox" aria-label="Tu bandeja de notificaciones"><div class="nt-toolbar"><div class="nt-reading-filters" aria-label="Estado de lectura">${[['all','Todas',items.length],['unread','No leídas',unread]].map(([value,label,count])=>`<button data-action="nt-read-filter" data-value="${value}" aria-pressed="${f.read===value}">${label}<span>${count}</span></button>`).join('')}</div>${btn('Marcar todas como leídas','nt-read-all','quiet','check',unread?'':'disabled')}</div><div class="nt-kind-filters" aria-label="Tipo de notificación">${Object.entries(ntKinds).map(([key,[label,ic]])=>`<button data-action="nt-kind-filter" data-value="${key}" aria-pressed="${f.kind===key}">${icon(ic)}${key==='all'?'Todos los tipos':label}</button>`).join('')}</div><div id="nt-list" class="nt-list"><h2 id="nt-list-title" class="sr-only" tabindex="-1">${shown.length} ${shown.length===1?'notificación':'notificaciones'}</h2>${shown.length?['Hoy','Ayer','Esta semana'].map(group=>{const list=shown.filter(n=>n.group===group);return list.length?`<section class="nt-date-group" aria-label="${group}"><h2>${group}<span>${list.length}</span></h2>${list.map(ntRow).join('')}</section>`:'';}).join(''):ntEmpty(items.length,f)}</div><footer class="nt-inbox-note">${icon('check')}Leer un aviso no confirma una entrega ni acepta una invitación.</footer></section></div>`;
}
function ntRow(n){const read=ntIsRead(n),label=n.target==='invite'&&fxAccessibleClass(n.targetId,role)?'Entrar al aula':n.action;return `<article class="nt-row ${read?'read':'unread'}" data-notice-id="${esc(n.id)}"><span class="nt-type-icon ${n.tone}" aria-hidden="true">${icon(n.icon)}</span><div class="nt-row-copy"><div class="nt-row-heading"><h3>${esc(n.title)}</h3>${read?'':'<span class="nt-unread-label">Sin leer</span>'}</div><p>${esc(n.body)}</p><div class="nt-row-meta"><span>${esc(n.source)}</span><span>${esc(n.time)}</span></div></div><div class="nt-row-actions">${btn(esc(label),'nt-open','quiet','chevron',`data-id="${esc(n.id)}"`)}<button class="icon-button nt-toggle" data-action="nt-toggle" data-id="${esc(n.id)}" aria-label="${read?'Marcar como no leída':'Marcar como leída'}: ${esc(n.title)}" title="${read?'Marcar como no leída':'Marcar como leída'}">${icon(read?'mail':'check')}</button></div></article>`;}
function ntEmpty(total,f){return `<div class="nt-empty"><span>${icon(f.read==='unread'?'check':'bell')}</span><h2>${!total?'Las próximas novedades llegan acá':f.read==='unread'?'Todo leído por acá':'No hay avisos de este tipo'}</h2><p>${!total?'Cuando haya una novedad en tus aulas o tu agenda, vas a encontrarla en este espacio.':f.read==='unread'?'Podés volver a consultar los avisos cuando lo necesites.':'Elegí otro tipo para seguir revisando tu bandeja.'}</p>${total?btn('Ver todas las notificaciones','nt-reset','','arrow'):link('Volver al inicio','inicio','arrow','button')}</div>`;}
function ntRefresh(action,id){const top=window.scrollY;render();const control=action?[...$$('[data-action="'+action+'"]')].find(b=>!b.disabled&&(id===undefined||b.dataset.id===id||b.dataset.value===id)):null;(control||$('[data-action=nt-read-filter][aria-pressed=true]'))?.focus({preventScroll:!!control});if(control)window.scrollTo(0,top);}
function ntMark(id,value){const n=ntItems().find(n=>n.id===id);if(!n)return false;return fxCommit(()=>state.noticeCenter.read[role][id]=value);}
function ntToggle(id){const n=ntItems().find(n=>n.id===id);if(!n)return;const read=!ntIsRead(n);if(!ntMark(id,read))return;ntRefresh('nt-toggle',id);toast(read?'Marcaste la notificación como leída.':'Marcaste la notificación como no leída.','success');}
function ntReadAll(){const items=ntItems();if(!fxCommit(()=>items.forEach(n=>state.noticeCenter.read[role][n.id]=true)))return;ntRefresh('nt-read-filter',ntFilters[role].read);toast('Todas tus notificaciones están leídas.','success');}
function ntDestination(n){
 if(n.role!==role)return null;
 if(n.classId&&!(role==='docente'?state.classes.find(c=>c.id===n.classId):fxAccessibleClass(n.classId,n.role)))return null;
 if(n.target==='review'){const r=state.reviews.find(r=>r.id===n.targetId&&r.classId===n.classId),a=r&&learningReviewActivity(r);return role==='docente'&&r&&a?{route:'corregir',review:r,activity:a}:null;}
 if(n.target==='grade'||n.target==='activity'){const a=state.activities.find(a=>a.id===n.targetId&&a.classId===n.classId&&a.publication!=='draft');return a&&(n.target!=='grade'||a.state==='graded')?{route:n.target==='grade'?'resultado':'actividad-detalle',activity:a}:null;}
 if(n.target==='members')return role==='docente'?{route:'aula',tab:'integrantes'}:null;
 if(n.target==='wall')return classroomPosts(n.classId).some(p=>p.id===n.postId&&p.type==='Aviso')?{route:'aula',tab:'muro'}:null;
 if(n.target==='event'){const e=state.events.find(e=>e.id===n.targetId);return e?{event:e}:null;}
 if(n.target==='invite'){const i=pendingInvitations().find(i=>i.id===n.targetId),c=fxAccessibleClass(n.targetId,role);return role==='estudiante'?(i?{invite:i}:c?{route:'aula',tab:'plan',classId:c.id}:null):null;}
 return null;
}
function ntOpen(id){
 const n=ntItems().find(n=>n.id===id);if(!n)return;const dest=ntDestination(n);
 if(!dest){showDialog('Este contenido ya no está disponible','El aviso se conserva para que tengas el registro.',`<div class="notice error"><p>Puede haberse retirado o puede que ya no tengas acceso. Podés seguir revisando tus otras notificaciones.</p></div>`,btn('Volver a notificaciones','close','primary'));return;}
 if(!fxCommit(()=>{state.noticeCenter.read[role][id]=true;if(n.classId||dest.classId)state.selectedClass=dest.classId||n.classId;if(dest.activity)state.currentActivityId=dest.activity.id;if(dest.review)state.currentReviewId=dest.review.id;}))return;
 if(dest.activity){activityId=dest.activity.id;question=0;submissionFilter='all';}
 if(dest.review)reviewId=dest.review.id;
 if(dest.invite){ntRefresh('nt-open',id);invitation({dataset:{id:dest.invite.id}});return;}
 if(dest.event){ntRefresh('nt-open',id);eventDetail(dest.event.id);return;}
 go(dest.route,dest.tab||'',dest.route==='aula'?(dest.classId||n.classId):undefined);
}
function installNotifications(){
 notificationsScreen=ntScreen;ntInit();
 Object.assign(actions,{'nt-open':b=>ntOpen(b.dataset.id),'nt-toggle':b=>ntToggle(b.dataset.id),'nt-read-all':ntReadAll,'nt-read-filter':b=>{ntFilters[role].read=b.dataset.value;ntRefresh('nt-read-filter',b.dataset.value);},'nt-kind-filter':b=>{ntFilters[role].kind=b.dataset.value;ntRefresh('nt-kind-filter',b.dataset.value);},'nt-reset':()=>{ntFilters[role]={read:'all',kind:'all'};ntRefresh('nt-read-filter','all');}});
}
