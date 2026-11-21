/* FoxMind UI Lab. Synthetic data only; no API, provider, or production imports. */
const paths={
 mail:'M3 5h18v14H3ZM3 6l9 7 9-7',save:'M4 3h13l4 4v14H3V3Zm3 0v7h10V3M7 21v-7h10v7',trash:'M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7m4-7v7',
 home:'M3 10 12 3l9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z',
 book:'M12 6v15M3 4h4a6 6 0 0 1 5 2 6 6 0 0 1 5-2h4v15h-4a6 6 0 0 0-5 2 6 6 0 0 0-5-2H3Z',
 layers:'m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
 calendar:'M4 5h16v16H4ZM8 3v4m8-4v4M4 10h16M8 14h2m4 0h2m-8 4h2',
 bell:'M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
 arrow:'M4 12h16m-6-6 6 6-6 6', back:'M20 12H4m6-6-6 6 6 6', chevron:'m9 5 7 7-7 7',
 plus:'M12 5v14M5 12h14', close:'m6 6 12 12M18 6 6 18', check:'m5 12 4 4L19 6',
 search:'M20 20l-5-5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0',
 spark:'m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4ZM20 2v4m-2-2h4',
 folder:'M3 6h7l2 3h9v11H3ZM3 6V4h6l2 2',
 clock:'M12 7v5l4 2M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 file:'M14 3H5v18h14V8Zm0 0v5h5M8 12h8m-8 4h5',
 chat:'M4 4h16v13H9l-5 4V4Zm4 5h8m-8 4h5',
 users:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.9M13 7a4 4 0 1 1-8 0 4 4 0 0 1 8 0m4-3a4 4 0 0 1 0 8',
 chart:'M4 3v18h17M8 16v-5m5 5V7m5 9v-3',
 upload:'M12 16V3m-5 5 5-5 5 5M4 15v6h16v-6', download:'M12 3v13m-5-5 5 5 5-5M4 16v5h16v-5',
 lock:'M6 10h12v11H6Zm2 0V6a4 4 0 1 1 8 0v4m-4 5v2',
 settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M9 3h6l1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z',
 more:'M5 12h.01M12 12h.01M19 12h.01',menu:'M4 6h16M4 12h16M4 18h16',
 help:'M9 9a3 3 0 1 1 4 3c-1 .5-1 1-1 3m0 3h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 info:'M12 11v6m0-10h.01M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0',
 edit:'m16 3 5 5-12 12-6 1 1-6L16 3Zm-2 2 5 5',
 attach:'m8 12 6-6a3 3 0 0 1 4 4l-8 8a5 5 0 0 1-7-7l9-9',
 play:'m8 4 12 8-12 8V4Z',flag:'M5 22V3h14l-3 5 3 5H5',
 shield:'m12 2 9 4v6c0 6-9 10-9 10S3 18 3 12V6Zm-5 9 3 3 7-7'
};
const icon=(name,extra='')=>`<svg class="icon ${extra}" viewBox="0 0 24 24" aria-hidden="true"><path d="${paths[name]||paths.book}"/></svg>`;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const img=(key,cls='',alt='')=>`<img src="${ASSETS[key]}" class="${cls}" alt="${esc(alt)}" decoding="async">`;
const btn=(label,action,kind='',ico='',extra='')=>`<button type="button" class="button ${kind}" data-action="${action}" ${extra}>${ico?icon(ico):''}${label}</button>`;
const link=(label,view,ico='',cls='')=>`<a class="${cls}" href="${routeHash(...view.split('/'))}">${ico?icon(ico):''}${label}</a>`;
const status=(label,type='',ico='')=>`<span class="state ${type}">${ico?icon(ico):''}${label}</span>`;
const demoStudent='Marina';
const seed={version:1,selectedClass:'photo',profile:{docente:'Lucía',estudiante:'Marina'},
 classes:[{id:'photo',name:'Fotografía y luz',subject:'Fotografía',group:'3.º A',asset:'literature',color:'peach',topics:8,taught:3,roster:['Marina','Tomás','Valentina','Mateo','Sofía','Joaquín']},{id:'bio',name:'El mundo natural',subject:'Biología',group:'2.º B',asset:'biology',color:'mint',topics:10,taught:6,roster:['Marina','Valentina','Sofía','Benjamín']},{id:'math',name:'Ideas que suman',subject:'Matemática',group:'3.º A',asset:'math',color:'sky',topics:12,taught:5,roster:['Marina','Tomás','Mateo','Sofía','Joaquín']}],
 activities:[{id:'light',title:'Descubriendo la luz',type:'Cuestionario',classId:'photo',due:'Lun 16 nov, 18:00',state:'pending'},{id:'observe',title:'Una foto, tres miradas',type:'Trabajo práctico',classId:'photo',due:'Mié 18 nov, 18:00',state:'pending'},{id:'contrast',title:'La magia del contraste',type:'Cuestionario',classId:'photo',due:'Entregada el 10 nov',state:'graded',grade:'8,5'},{id:'life',title:'El mundo de las células',type:'Cuestionario',classId:'bio',due:'Mar 17 nov, 18:00',state:'pending'}],
 reviews:[{id:'r1',name:'Marina',title:'Una foto, tres miradas',classId:'photo',received:'Hoy, 09:20',state:'pending'},{id:'r2',name:'Tomás',title:'Una foto, tres miradas',classId:'photo',received:'Hoy, 08:45',state:'pending'},{id:'r3',name:'Sofía',title:'El mundo de las células',classId:'bio',received:'Ayer, 17:10',state:'pending'}],
 events:[{id:1,title:'Clase de fotografía',day:13,time:'09:00',end:'10:00',type:'Clase',note:'Traer una fotografía para conversar sobre la luz.'},{id:2,title:'Preparar la próxima clase',day:13,time:'15:30',end:'16:00',type:'Personal',note:'Revisar el material de exposición.'},{id:3,title:'Repaso de exposición',day:16,time:'16:00',end:'16:30',type:'Estudio',note:'Un momento para practicar con Foxy.'},{id:4,title:'Organizar materiales',day:20,time:'10:00',end:'10:30',type:'Personal',note:''}],
 answers:{},submitted:{observe:{at:'13 de noviembre, 09:20',files:['Mis tres miradas.pdf']}},reviewDraft:{},messages:[],studyMessages:[],creations:[],materials:[{title:'La luz: exposición y contraste',kind:'PDF',unit:'La luz',size:'2,4 MB'}],posts:[{id:'welcome-photo',classId:'photo',name:'Lucía',title:'Esta semana miramos distinto',body:'Busquen una foto que les guste y observen de dónde viene la luz. En la próxima clase vamos a compartir lo que descubrimos.',time:'Hoy, 08:30',type:'Aviso'},{id:'question-photo-phone',classId:'photo',name:'Valentina',title:'¿Podemos usar una foto del celular?',body:'¿Sirve una foto del celular para compartir en clase?',time:'Hace 20 min',type:'Consulta'}],
 folders:[{name:'Mi rincón de fotografía',asset:'literature',topic:'Exposición y contraste'},{name:'Biología, a mi ritmo',asset:'biology',topic:'Las células'}],invitation:true,notificationsRead:false,classArchived:[],drafts:[],wizard:null,author:null,notes:'',eventNext:5
};
addSupportExamples(seed);
let state=structuredClone(seed),storageAvailable=true;
try{const saved=JSON.parse(localStorage.getItem('foxmind-ui-lab-v1')||'null');if(saved?.version===1){
 state={...state,...saved,supportExamples:saved.supportExamples===true};
 const [welcome,question]=seed.posts;
 for(const post of state.posts){
  if(!post.classId&&post.name===welcome.name&&post.title===welcome.title&&post.body===welcome.body&&post.type===welcome.type)
   Object.assign(post,{id:welcome.id,classId:welcome.classId});
 }
 if(!state.wallScoped&&!state.posts.some(p=>p.id===question.id))state.posts.push(structuredClone(question));
 if(state.wizard?.kind==='class')state.wizard=null;
}}catch{storageAvailable=false;}
addSupportExamples(state);
state.wallScoped=true;
let role='docente',view='inicio',tab='',question=0,activityId=state.currentActivityId||'light',reviewId=state.currentReviewId||'r1',selectedDay=13,calendarView='month',calendarMonth=10,collection='active',search='',topic=0,homeFilter='reviews',chatTab='chat',scenario='normal',step=0,focusReturn=null,jobToken=0,toastTimer,saveTimer;
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const enrolledIn=c=>c.roster?.includes(demoStudent);
const visibleClassrooms=(r=role)=>state.classes.filter(c=>r==='docente'||enrolledIn(c));
const activeClassrooms=(r=role)=>visibleClassrooms(r).filter(c=>!state.classArchived.includes(c.id));
const classroom=()=>visibleClassrooms().find(c=>c.id===state.selectedClass)||visibleClassrooms()[0];
const activity=()=>state.activities.find(a=>a.id===activityId)||state.activities[0];
const initials=name=>name.split(' ').map(s=>s[0]).slice(0,2).join('');
const profilePhoto=(r=role)=>pfAvatarMarkup(r);
const navIsCompact=()=>state.navCompact??['foxy','estudio'].includes(view);
function toggleNavigation(){const compact=!navIsCompact(),old=state.navCompact;state.navCompact=compact;if(!save()){state.navCompact=old;return;}$('#app').classList.toggle('nav-compact',compact);const b=$('[data-action=nav-toggle]');b.setAttribute('aria-expanded',String(!compact));b.setAttribute('aria-label',compact?'Expandir navegación':'Contraer navegación');b.title=b.getAttribute('aria-label');}
const avatar=(name,color='')=>`<span class="avatar ${color}" aria-hidden="true">${initials(name)}</span>`;
const pendingReviews=()=>state.reviews.filter(r=>r.state!=='published');
const studentPending=()=>{
 const ids=new Set(activeClassrooms('estudiante').map(c=>c.id));
 return state.activities.filter(a=>ids.has(a.classId)&&a.state==='pending'&&a.publication!=='draft'&&!state.submitted[a.id]);
};
function save(){try{localStorage.setItem('foxmind-ui-lab-v1',JSON.stringify(state.wizard?.kind==='class'?{...state,wizard:null}:state));storageAvailable=true;return true;}catch{storageAvailable=false;toast('No pudimos guardar en este navegador. Conservá esta pestaña abierta.','error');return false;}}
function toast(message,tone='info'){clearTimeout(toastTimer);const el=$('#toast');el.dataset.tone=['info','error','success'].includes(tone)?tone:'info';el.setAttribute('role',tone==='error'?'alert':'status');el.setAttribute('aria-live',tone==='error'?'assertive':'polite');el.innerHTML=icon(tone==='success'?'check':'info')+'<span>'+esc(message)+'</span>';el.classList.add('show');toastTimer=setTimeout(()=>el.classList.remove('show'),4200);}
function changeDemoRole(next){
 if(role===next)return;
 role=next;collection='active';
 clearTimeout(toastTimer);
 const message=$('#toast');
 message.classList.remove('show');
 message.replaceChildren();
}
const activityRoutes=['actividad-detalle','actividad','recibo','resultado'];
const routeResource=target=>target==='aula'?'class':target==='estudio'?'folder':target==='corregir'?'review':activityRoutes.includes(target)?'activity':null;
function routeResourceId(key){
 if(key==='class')return classroom()?.id;
 if(key==='activity')return activity()?.id;
 if(key==='folder')return state.folders[state.selectedFolder||0]?.id;
 if(key==='review')return reviewRecord()?.id;
}
function routeHash(target,section='',id){
 const path=`#${role}/${target}${section?'/'+section:''}`,key=routeResource(target);
 const resourceId=id??routeResourceId(key);
 return key&&resourceId?`${path}?${key}=${encodeURIComponent(resourceId)}`:path;
}
function go(target,section='',id){search='';scenario='normal';const hash=routeHash(target,section,id);if(location.hash===hash)render();else location.hash=hash;}
function closeDialog(){jobToken++;$('#dialog').close();if(focusReturn?.isConnected)focusReturn.focus();else $('#main')?.focus({preventScroll:true});}
function showDialog(title,description,body,footer='',wide=false){const d=$('#dialog');if(!d.open)focusReturn=document.activeElement;d.className=wide?'wide':'';d.innerHTML=`<header class="dialog-head"><div><h2 id="dialog-title" tabindex="-1">${title}</h2>${description?`<p>${description}</p>`:''}</div><button class="icon-button" data-action="close" aria-label="Cerrar diálogo">${icon('close')}</button></header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-footer">${footer}</footer>`:''}`;if(!d.open)d.showModal();$('#dialog-title').focus({preventScroll:true});}
function loading(title,messages,onDone,fail=false){const token=++jobToken;let current=0;const show=()=>{showDialog(title,'',`<div class="loading-card" aria-busy="true">${img('foxy','pulse')}<h3>${messages[current]}</h3><p>Podés esperar acá. Te avisamos cuando esté listo.</p><div class="loading-list" role="status" aria-live="polite">${messages.map((m,i)=>`<div class="${i<current?'complete':i===current?'working':''}">${i<current?icon('check'):i===current?'<span class="spinner"></span>':icon('clock')}<span>${m}</span></div>`).join('')}</div></div>`,btn('Cancelar','close'));};show();const advance=()=>setTimeout(()=>{if(token!==jobToken)return;current++;if(current<messages.length){show();advance();}else if(fail){showDialog('No pudimos preparar el plan','Tu archivo se conserva. Podés volver a intentarlo.',`<div class="notice error">${icon('info')}<p>La conexión se interrumpió. Tus datos siguen acá y podés volver a intentarlo.</p></div>`,btn('Volver','wizard-back')+btn('Volver a intentar','retry-plan','primary'));}else onDone();},850);advance();}
function pageHead(title,description='',actions='',date=''){return `<header class="page-head"><div>${date?`<p class="date">${date}</p>`:''}<h1 tabindex="-1">${title}</h1>${description?`<p>${description}</p>`:''}</div>${actions?`<div class="head-actions">${actions}</div>`:''}</header>`;}
function empty(title,text,action='',compact=false){return `<div class="empty ${compact?'compact':''}">${compact?icon('check'):img('foxy')}<h3>${title}</h3><p>${text}</p>${action}</div>`;}
function classCard(c){const percent=Math.round(c.taught/c.topics*100);return `<a class="class-card" href="${routeHash('aula','plan',c.id)}" data-class="${esc(c.id)}"><div class="class-cover">${img(c.asset)}${status(c.group)}</div><div class="class-body"><h3>${esc(c.name)}</h3><p>${esc(c.subject)} · ${c.roster.length} estudiantes</p><div class="class-bottom"><span>${c.taught} de ${c.topics} temas dados</span>${icon('arrow')}</div><div class="progress-track" role="progressbar" aria-label="Avance del plan de ${esc(c.name)}" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100"><span style="width:${percent}%"></span></div></div></a>`;}
function activityRow(a){const submitted=state.submitted[a.id],isGraded=a.state==='graded',label=isGraded?'Ver devolución':submitted?'Ver entrega':role==='docente'?'Ver actividad':'Continuar';return `<div class="task-row"><span class="file-mark">${a.type==='Trabajo práctico'?'TP':'QUIZ'}</span><div class="row-copy"><b>${esc(a.title)}</b><p>${esc(state.classes.find(c=>c.id===a.classId)?.name||'Aula')} · ${esc(a.due)}</p></div><button class="text-button" data-action="open-activity" data-id="${a.id}">${label}${icon('chevron')}</button></div>`;}
function shell(content){$('#app').classList.toggle('nav-compact',navIsCompact());const nav=[['inicio','home','Inicio'],['aulas','layers','Mis aulas'],...(role==='estudiante'?[['carpetas','folder','Mi estudio']]:[]),['agenda','calendar','Agenda'],...(role==='docente'?[['foxy','spark','Foxy AI']]:[]),['avisos','bell','Notificaciones']];const unread=ntUnread();const navHTML=nav.map(([id,ic,label])=>`<a href="#${role}/${id}" aria-label="${label}" class="${view===id||(id==='aulas'&&view==='aula')||(id==='carpetas'&&view==='estudio')?'active':''}" ${view===id?'aria-current="page"':''}>${icon(ic)}<span>${label}</span>${id==='avisos'&&unread?'<span class="count" data-notice-count>'+unread+'</span>':''}</a>`).join('');const logo=`<a class="brand" aria-label="FoxMind · Inicio" href="#${role}/inicio">${img('logo','','Foxy')}<span>Fox<em>Mind</em></span></a>`;return `<header class="mobile-header"><div><button class="icon-button" data-action="menu" aria-label="Abrir navegación" aria-expanded="false">${icon('menu')}</button>${logo}</div><button class="icon-button" data-action="search" aria-label="Buscar en FoxMind">${icon('search')}</button></header><aside class="sidebar" id="main-navigation" aria-label="Navegación principal"><div class="sidebar-brand">${logo}<button class="icon-button nav-toggle" data-action="nav-toggle" aria-controls="main-navigation" aria-expanded="${!navIsCompact()}" aria-label="${navIsCompact()?'Expandir navegación':'Contraer navegación'}" title="${navIsCompact()?'Expandir navegación':'Contraer navegación'}">${icon('back')}</button></div><button class="button sidebar-search" data-action="search" aria-label="Buscar en FoxMind" title="Buscar en FoxMind">${icon('search')}<span>Buscar en FoxMind</span></button><nav class="nav-group">${navHTML}</nav><div class="sidebar-classes"><p class="nav-label">Tus aulas</p><nav class="nav-group">${activeClassrooms().slice(0,3).map(c=>`<a class="class-link" href="${routeHash('aula','plan',c.id)}" data-class="${esc(c.id)}" aria-label="${esc(c.name)}">${icon('book')}<span class="dot"></span><span>${esc(c.name)}</span></a>`).join('')}</nav></div><div class="sidebar-footer"><div class="sidebar-help"><b>Un paso a la vez</b><p>Siempre podés volver a donde te quedaste.</p><button class="text-button" data-action="help">¿Necesitás una mano?${icon('arrow')}</button></div><a class="account" href="#${role}/perfil" aria-label="Mi perfil · ${esc(state.profile[role])}" title="Mi perfil">${profilePhoto()}<div><b>${esc(pfDisplayName(role))}</b><small>${role==='docente'?'Docente':'Estudiante'}</small></div>${icon('settings')}</a></div></aside><main class="workspace" id="main" tabindex="-1"><div class="content">${content}</div></main>`;}
function focusShell(content,title='Descubriendo la luz',subtitle='Fotografía y luz',footer=''){return `<div class="focus-shell"><header class="focus-header"><div><button class="icon-button" data-action="leave-focus" aria-label="Volver al aula">${icon('back')}</button><div><b>${esc(title)}</b><small>${esc(subtitle)}</small></div></div><div>${status('Tu espacio de trabajo','','lock')}<a class="brand" aria-label="FoxMind · Inicio" href="#${role}/inicio">${img('logo','','FoxMind')}</a></div></header><main class="focus-content" id="main" tabindex="-1">${content}</main>${footer?`<footer class="focus-footer">${footer}</footer>`:''}</div>`;}
function parseRoute(){
 const fragment=location.hash.slice(1),[path,query]=fragment.split('?');
 const [routeRole,target,section]=path.split('/');
 changeDemoRole(routeRole==='estudiante'?'estudiante':'docente');
 const key=routeResource(target);
 view=key?target:target||'inicio';
 tab=key?section||(key==='class'?'plan':''):section||'';
 if(!key||(role==='estudiante'&&key==='review')||(role==='docente'&&key==='folder'))return;
 const requested=new URLSearchParams(query).get(key);
 const id=requested??routeResourceId(key);
 if(!selectRouteResource(key,id)){
  view=key==='folder'?'carpetas':'aulas';tab='';collection='active';
  history.replaceState(null,'',routeHash(view));
 }else if(requested===null){
  history.replaceState(null,'',routeHash(view,tab,id));
 }
}
function selectRouteResource(key,id){
 if(key==='folder'){
  const index=state.folders.findIndex(f=>f.id===id);
  if(index<0)return false;
  state.selectedFolder=index;
  return true;
 }
 const review=key==='review'?state.reviews.find(r=>r.id===id):null;
 const selected=key==='activity'?state.activities.find(a=>a.id===id):review?learningReviewActivity(review):null;
 const classId=key==='class'?id:selected?.classId;
 if(!visibleClassrooms().some(c=>c.id===classId))return false;
 if(state.selectedClass!==classId){state.selectedClass=classId;topic=0;}
 if(selected){
  if(activityId!==selected.id){question=0;submissionFilter='all';}
  activityId=state.currentActivityId=selected.id;
 }
 if(review)reviewId=state.currentReviewId=review.id;
 return true;
}
function render(){parseRoute();document.title=`${({inicio:'Inicio',aulas:'Mis aulas',aula:classroom()?.name||'Aula',foxy:'Foxy AI',carpetas:'Mi estudio',estudio:'Mi estudio','actividad-detalle':activity()?.title||'Actividad',actividad:activity()?.title||'Actividad',resultado:'Tu devolución',recibo:'Entrega recibida',agenda:'Agenda',crear:'Crear actividad',corregir:'Revisar entrega',perfil:'Mi perfil',avisos:'Notificaciones'})[view]||'FoxMind'} · FoxMind`;$$('[data-role]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.role===role)));const focused=['actividad-detalle','actividad','recibo','resultado','crear','corregir','practica'].includes(view);const pages={inicio:homeScreen,aulas:classesScreen,aula:classScreen,agenda:agendaScreen,foxy:chatScreen,carpetas:foldersScreen,estudio:chatScreen,'actividad-detalle':activityDetailScreen,actividad:activityScreen,recibo:receiptScreen,resultado:resultScreen,crear:authorScreen,corregir:gradingScreen,perfil:profileScreen,avisos:notificationsScreen,practica:state.fxPractice?fxPracticeScreen:practiceScreen};if(role==='estudiante'&&['crear','corregir','foxy'].includes(view)){go('inicio');return;}if(role==='docente'&&['carpetas','estudio','practica'].includes(view)){go('inicio');return;}if(role==='docente'&&view==='actividad'){go('actividad-detalle');return;}const a=activity();if(role==='estudiante'&&activityRoutes.includes(view)&&view!=='actividad-detalle'&&(a?.publication==='draft'||(state.classArchived.includes(a?.classId)&&!state.submitted[a.id]&&a.state!=='graded'))){history.replaceState(null,'',routeHash('actividad-detalle'));render();return;}const content=(pages[view]||homeScreen)();$('#app').innerHTML=focused?content:shell(content);syncLearningFooter();window.scrollTo(0,0);$('main h1')?.focus({preventScroll:true});}
