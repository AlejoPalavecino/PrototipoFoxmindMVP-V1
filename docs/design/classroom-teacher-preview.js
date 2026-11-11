const main = document.querySelector('#main');
const side = document.querySelector('#side');
const dialog = document.querySelector('#dialog');
const assets = '../../apps/web/public/';
const key = 'foxmind-classroom-preview-v2';
const uid = () => Math.random().toString(36).slice(2);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
const icon = name => `<img class="icon" alt="" src="${assets}foxmind-3d/icons/${name}.svg">`;
const button = (label, action, style = '', value = '') =>
  `<button type="button" class="${style}" data-action="${action}" data-value="${esc(value)}">${label}</button>`;
const submit = label => `<button class="primary" type="submit">${label}</button>`;
const input = (label, name, value = '', options = '') => `<label>${label}<input name="${name}" value="${esc(value)}" ${options}></label>`;
const area = (label, name, value = '', options = '', rows = 3) => `<label>${label}<textarea name="${name}" rows="${rows}" ${options}>${esc(value)}</textarea></label>`;
const select = (name, label, values, value = '') => `<select name="${name}" aria-label="${label}">${values.map(([id, text]) => `<option value="${esc(id)}" ${String(value) === String(id) ? 'selected' : ''}>${esc(text)}</option>`).join('')}</select>`;
const fieldSelect = (name, label, values, value) => `<label>${label}${select(name,label,values,value)}</label>`;
function methodChoices(value, manualLabel) {
  return `<div class="method-options" role="group" aria-label="Cómo empezar">
    <label><input type="radio" name="method" value="manual" ${value==='manual'?'checked':''}>
      <span class="method-icon">${icon('edit')}</span><span><strong>${manualLabel}</strong><small>Empezá con tus propias ideas.</small></span></label>
    <label><input type="radio" name="method" value="ai" ${value==='ai'?'checked':''}>
      <span class="method-icon">${icon('spark')}</span><span><strong>Preparar con Foxy</strong><small>Recibí una propuesta y adaptala a tu clase.</small></span></label></div>`;
}
function loadingState(title, detail) {
  return `<div class="loading-state" role="status" aria-live="polite">
    <span class="loading-orbit" aria-hidden="true">${icon('spark')}</span>
    <div><strong>${esc(title)}</strong><p>${esc(detail)}</p></div>
    <div class="loading-track" aria-hidden="true"><i></i></div></div>`;
}
const empty = text => `<p class="empty">${text}</p>`;
const head = (title, subtitle, action = '') => `<div class="section-head"><div><h2>${title}</h2><p>${subtitle}</p></div>${action}</div>`;
const tag = (text, style = '') => `<span class="tag ${style}">${text}</span>`;
const cover = (name, size = 640) => `${assets}foxmind-3d/covers/${name}-${size}.webp`;
const covers = [['literature','Literatura'],['biology','Naturaleza'],['math','Geometría'],['society','Geografía'],['creative','Arte'],['science','Ciencias']];
const unit = (title = '', topics = ['']) => ({id:uid(),title,topics:topics.map(title=>({id:uid(),title,given:false}))});
const newRoom = fields => ({id:uid(),name:'',subject:'',division:'',year:'2026',zone:'Buenos Aires',cover:'literature',state:'pending',step:1,method:'manual',file:'',units:[],posts:[],materials:[],activities:[],students:[],invites:[],history:[],code:'',...fields});
const seed = () => ({
  usedCodes:['482915','350712'],
  rooms:[
    newRoom({id:'foto',name:'Fotografía y luz',subject:'Arte',division:'A',cover:'general',state:'active',code:'482915',units:[unit('La luz',['Exposición','Contraste']),unit('Composición',['Encuadre','Profundidad de campo'])],students:[{id:'marina',name:'Marina Demo',email:'marina@example.test'}],invites:[{id:uid(),email:'leo@example.test',status:'Pendiente'}],posts:[{id:uid(),title:'Material para la próxima clase',body:'Traigan una foto que les interese. Vamos a conversar sobre cómo se usa la luz para dirigir la mirada.',type:'Aviso',replies:[]}],materials:[{id:uid(),title:'Guía de exposición',body:'Observá cómo cambia una imagen al variar la luz, el tiempo y la apertura.',mode:'text',usage:'Material de estudio'}]}),
    newRoom({id:'bio',name:'Biología ambiental',subject:'Biología',division:'B',cover:'biology',state:'active',code:'350712',units:[unit('Ecosistemas',['Redes tróficas','Biodiversidad'])]}),
    newRoom({id:'geo',name:'Geografía urbana',subject:'Geografía',division:'A',year:'2025',cover:'society',state:'archived',units:[unit('Ciudades',['El espacio urbano'])]}),
    newRoom({id:'mate',name:'Matemática aplicada',subject:'Matemática',division:'C',cover:'math',step:2})
  ]
});
let data;
let storage = true;
try { data = JSON.parse(localStorage.getItem(key)) || seed(); } catch { data = seed(); storage = false; }
let roomId = null, tab = 'Plan', state = 'active', layout = 'grid', year = '', division = '', query = '';
let topicId, activity, activityStep, activityView, studentPreview = false, announcement = '', wallFilter = '', materialQuery = '';
let context, returnFocus, modalToken = 0;
let previewRole='teacher';
const isStudent=()=>previewRole==='student';
const studentMember=r=>r.students.some(s=>s.id==='marina');
const visibleRooms=()=>data.rooms.filter(r=>!isStudent()||studentMember(r));
const room = () => data.rooms.find(r => r.id === roomId);
const topics = (r = room()) => r.units.flatMap(u => u.topics.map(t=>({u,t})));
const percent = r => topics(r).length ? Math.round(100 * topics(r).filter(({t})=>t.given).length / topics(r).length) : 0;
const canWrite = () => !isStudent() && room()?.state === 'active';
const canParticipate = () => isStudent() && room()?.state === 'active' && studentMember(room());
const canConverse = () => canWrite() || canParticipate();
const ownPost=p=>canWrite()||canParticipate()&&p.author==='marina';
const roomOptions = () => [['','Sin unidad'],...room().units.map(u=>[u.id,u.title])];
const topicOptions = unitId => [['','Sin tema'],...topics().filter(({u})=>!unitId || u.id===unitId).map(({t})=>[t.id,t.title])];
const progress = r => `<div class="row between"><small>Avance del plan</small><small>${percent(r)}%</small></div><progress class="meter" max="100" value="${percent(r)}" aria-label="Avance del plan"></progress>`;
function save() {
  if (!storage) return;
  try { localStorage.setItem(key,JSON.stringify(data)); } catch { storage=false; }
}
function log(message) {
  room().history.unshift({message,date:new Date().toLocaleDateString('es-AR')});
}
function tell(message) {
  announcement=message;
  render();
}
function navigate(next, section='Plan') {
  if(next&&isStudent()&&!visibleRooms().some(r=>r.id===next))next=null;
  planFilter='all';planMessage='';undoGiven=null;closedPlanUnits.clear();
  roomId=next; tab=section; topicId=null; activity=null; activityView=null; wallFilter=''; materialQuery='';
  side.classList.remove('open');
  render();
  window.scrollTo(0,0);
  main.querySelector('h1')?.focus();
}
function changeTab(value) {
  if(!(isStudent()?studentSections:sections).some(([name])=>name===value))return;
  if (activity && !leaveActivity(()=>changeTab(value))) return;
  tab=value; activityView=null; studentPreview=false; render();
  main.querySelector('[aria-current="page"]')?.focus();
}
function renderSide() {
  side.innerHTML=`<div class="brand"><img alt="" src="${assets}brujula/foxy-logotipo-redondo.webp"><div>FoxMind<small>BRÚJULA</small></div></div>
    ${button('Cerrar menú','menu','mobile-menu')}<div class="navitem">${icon('search')} Buscar <small>Ctrl K</small></div>
    <small class="navlabel">MI ESPACIO</small>
    <div class="navitem">${icon('home')} Inicio</div>${button(icon('book')+'Mis aulas','catalog','navitem')}
    <div class="navitem">${icon('calendar')} Agenda</div>${isStudent()?'':`<div class="navitem">${icon('spark')} Foxy AI</div>`}
    <div class="navitem">${icon('bell')} Notificaciones</div><hr><small class="navlabel">MIS AULAS</small>
    ${visibleRooms().filter(r=>r.state==='active').slice(0,6).map(r=>button(esc(r.name),'room','link',r.id)).join('')}
    <div class="account"><img class="avatar" alt="" src="${assets}brujula/avatars/foxy-classic.webp"><div>${isStudent()?'Marina Demo':'Lucía Demo'}<br><small>${isStudent()?'Estudiante':'Docente'}</small></div></div>
    <p class="demo">Prototipo local · Datos ficticios</p>`;
}
function render() {
  renderSide();
  const message=announcement;
  announcement='';
  main.innerHTML=`${button(icon('menu')+'Menú','menu','mobile-menu')}<small class="mobile-demo">Prototipo local · Datos ficticios</small>
    ${message?`<div class="success-feedback" role="status"><span class="success-symbol" aria-hidden="true">✓</span><span>${esc(message)}</span>${button('✕','dismiss-feedback','link')}</div>`:''}
    ${roleToolbar()}${room()?interior():catalog()}`;
}
const buckets = [['active','Activas'],['archived','Archivadas'],['pending','Pendientes']];
function catalog() {
  const values = (prop, all) => [['',all],...[...new Set(visibleRooms().map(r=>r[prop]).filter(Boolean))].sort().map(v=>[v,v])];
  return `<div class="crumb">Inicio › <strong>Mis aulas</strong></div>
    <div class="section-head catalog-head"><div><p class="eyebrow">Mi espacio</p><h1 tabindex="-1">Mis aulas</h1><p>${isStudent()?'Tus clases, materiales y actividades en un mismo lugar.':'Organizá los recorridos de enseñanza de tus grupos.'}</p></div>
    ${isStudent()?button(icon('plus')+'Unirme a un aula','student-join','primary'):button(icon('plus')+'Crear aula','create','primary')}</div>
    <div class="pills" role="group" aria-label="Estado de aulas">${buckets.filter(([id])=>!isStudent()||id!=='pending').map(([id,label])=>`<button data-action="bucket" data-value="${id}" aria-pressed="${state===id}">${label} <span class="count">${visibleRooms().filter(r=>r.state===id).length}</span></button>`).join('')}</div>
    <div class="filters"><input class="search" id="class-search" aria-label="Buscar aulas" value="${esc(query)}" placeholder="Buscar por nombre, materia o docente…">
    ${select('year','Ciclo lectivo',values('year','Todos los ciclos'),year)}${select('division','División',values('division','Todas las divisiones'),division)}
    <div class="switch" aria-label="Vista">${[['grid','Cuadrícula','▦'],['list','Lista','☰']].map(([id,label,glyph])=>`<button aria-label="${label}" data-action="layout" data-value="${id}" aria-pressed="${layout===id}">${glyph}</button>`).join('')}</div></div>
    <div id="results">${results()}</div>`;
}
function results() {
  const rows=visibleRooms().filter(r=>r.state===state && (!year||r.year===year) && (!division||r.division===division) && (!query||`${r.name} ${r.subject} Lucía Demo`.toLowerCase().includes(query.toLowerCase())));
  if (!rows.length) return `${empty(query||year||division?'No encontramos aulas con esos filtros.':`Todavía no tenés aulas ${buckets.find(([id])=>id===state)[1].toLowerCase()}.`)}${query||year||division?button('Limpiar filtros','clear'):''}`;
  return `<div class="cards ${layout}">${rows.map(r=>`<article class="card"><img class="cover" src="${cover(r.cover)}" alt=""><div class="card-body">
    ${tag(r.state==='pending'?'Pendiente':r.state==='archived'?'Archivada':`${esc(r.division)} · ${esc(r.year)}`,r.state==='active'?'mint':'warm')}
    <h3>${esc(r.name||'Aula sin nombre')}</h3><p>${r.state==='pending'?`Paso ${r.step} de 4`:`${r.students.length} estudiante${r.students.length===1?'':'s'}`}</p>
    <div class="rule"></div>${r.state==='active'?progress(r):''}
    <div class="row card-actions">${r.state==='pending'?button('Continuar creación','create','primary',r.id)+button('Eliminar','delete-draft','link danger',r.id):button('Entrar al aula →','room','primary',r.id)}</div>
    </div></article>`).join('')}</div>`;
}
const sections = [['Plan','book'],['Muro','chat'],['Biblioteca','folder'],['Actividades','clipboard'],['Progreso','progress'],['Alumnos','users'],['Historial','clock'],['Configuración','settings']];
const studentSections=[['Plan','book'],['Muro','chat'],['Biblioteca','folder'],['Actividades','clipboard'],['Mi progreso','progress'],['Compañeros','users']];
function roleToolbar() {
  return `<aside class="preview-role-bar" aria-label="Recorrer la maqueta"><div><strong>Recorré la experiencia</strong><small>Datos ficticios · Cambiar de vista no modifica tu cuenta</small></div><div class="switch" role="group" aria-label="Vista de la maqueta">${[['teacher','Docente'],['student','Estudiante']].map(([value,label])=>`<button data-action="preview-role" data-value="${value}" aria-pressed="${previewRole===value}">${label}</button>`).join('')}</div></aside>`;
}
function switchPreviewRole(role) {
  if(activity&&!leaveActivity(()=>switchPreviewRole(role)))return;
  const currentActivity=room()?.activities.find(a=>a.id===activityView);
  previewRole=role; studentPreview=false;state=state==='pending'?'active':state;
  const target=room()&&(!isStudent()||studentMember(room()))?roomId:null;
  const section=tab==='Progreso'&&isStudent()?'Mi progreso':tab==='Mi progreso'&&!isStudent()?'Progreso':tab==='Alumnos'&&isStudent()?'Compañeros':tab==='Compañeros'&&!isStudent()?'Alumnos':tab;
  navigate(target,(isStudent()?studentSections:sections).some(([name])=>name===section)?section:'Plan');
  if(target&&currentActivity&&(!isStudent()||currentActivity.status==='Asignada')) {
    activityView=currentActivity.id;tab='Actividades';render();
    main.querySelector('.room-body h2')?.scrollIntoView({block:'start'});
  }
}
function myProgress() {
  const assigned=room().activities.filter(a=>a.status==='Asignada');
  const pending=assigned.filter(a=>actStudentEditable(a)),waiting=assigned.filter(a=>studentActivitySummary(a).label==='Entregada'),graded=assigned.filter(a=>studentActivitySummary(a).label==='Calificada');
  return head('Mi progreso','Tus próximos pasos, entregas y devoluciones en un solo lugar.')+`<div class="learning-stats" aria-label="Resumen de tus actividades"><div class="panel"><strong>${pending.length}</strong><span>Para continuar</span></div><div class="panel"><strong>${waiting.length}</strong><span>Esperando devolución</span></div><div class="panel"><strong>${graded.length}</strong><span>Con devolución</span></div></div><div class="stack">${[...pending,...assigned.filter(a=>!pending.includes(a))].map(a=>{const summary=studentActivitySummary(a),result=studentActivityResult(a);return `<article class="panel act-list-item"><div><div class="row">${tag(esc(actType(a.type)),'violet')}${tag(esc(summary.label),actStatusTone(summary.label))}</div><h3>${esc(a.title)}</h3><p>${esc(summary.detail)}</p>${result&&summary.label!=='Calificada'?`<small>Nota anterior: ${esc(result.grade)} / 10</small>`:''}</div>${button(actStudentAction(a),'act-student-open',pending.includes(a)?'primary':'',a.id)}</article>`;}).join('')||empty('Cuando tu docente asigne una actividad, vas a encontrarla acá.')}</div><details class="panel learning-class-progress"><summary>Avance de los temas de la clase</summary>${progress(room())}<p>Este avance lo registra tu docente para todo el grupo.</p></details>`;
}
function classmates() {
  return head('Compañeros','Personas con las que compartís esta aula.')+`<div class="panel row between"><div><h3>Lucía Demo</h3><p>Docente del aula</p></div>${tag('Docente','violet')}</div><div class="peer-grid">${room().students.map(s=>`<article class="panel row"><span class="peer-avatar" aria-hidden="true">${esc(s.name[0])}</span><div><h3>${esc(s.name)}</h3><p>${s.id==='marina'?'Vos':'Estudiante'}</p></div></article>`).join('')}</div><div class="panel row between"><div><h3>Tu inscripción</h3><p>Si salís, necesitás una nueva invitación para volver.</p></div>${button('Salir del aula','student-leave','link danger')}</div>`;
}
function studentJoin() {
  context={kind:'student-join'};
  openModal('Unirme a un aula',`<form id="student-join-form" class="stack"><p>Ingresá o pegá el código que te compartió tu docente. Podés incluir espacios.</p>${input('Código de 6 dígitos','code','','required inputmode="numeric" maxlength="12" autocomplete="off" placeholder="482 915"')}<small>Para recorrer el ejemplo podés usar 350712 si ese código sigue vigente.</small></form>`,`<div class="row between">${button('Cancelar','close')}<button form="student-join-form" class="primary">Ver aula</button></div>`);
}
function interior() {
  const r=room();
  const bodies={Plan:plan,Muro:wall,Biblioteca:library,Actividades:activities,Alumnos:members,Progreso:progressPage,Historial:history,Configuración:settings,'Mi progreso':myProgress,Compañeros:classmates};
  return `<div class="crumb">Inicio › ${button('Mis aulas','catalog')} › <strong>${esc(r.name)}</strong></div>
    <header class="room-hero ${tab==='Actividades'&&(activity||activityView)?'compact':''}"><img src="${cover(r.cover)}" alt="">${tag(`Aula · ${esc(r.division)} · ${esc(r.year)}`)}
    <h1 tabindex="-1">${esc(r.name)}</h1><p>${icon('profile')}Lucía Demo &nbsp; ${icon('users')}${r.students.length} estudiante(s)</p></header>
    <nav class="tabs" aria-label="Secciones del aula">${(isStudent()?studentSections:sections).map(([label,img])=>`<button data-action="tab" data-value="${label}" ${label===tab?'aria-current="page"':''}>${icon(img)}${label}</button>`).join('')}</nav>
    ${r.state==='archived'?'<p class="notice statusbar">Aula archivada · Consulta de contenidos</p>':''}
    ${canWrite()&&tab==='Plan'?teachingActions():''}
    ${canParticipate()&&tab==='Plan'?learningActions():''}
    <section class="room-body" aria-label="${tab}">${bodies[tab]()}</section>`;
}
function teachingActions() {
  return `<section class="teaching-actions" aria-label="Preparar la clase">
    <div><strong>Prepará tu próxima clase</strong><p>Tené a mano lo que vas a compartir.</p></div>
    <div class="row">${button(icon('folder')+'Subir material','material-new')}
    ${button(icon('clipboard')+'Crear actividad','activity-new')}
    ${button(icon('chat')+'Publicar aviso','quick-post')}</div></section>`;
}
function learningActions() {
  const pending=room().activities.filter(a=>actStudentEditable(a)).sort((a,b)=>Number(!!actSub(b)?.startedAt)-Number(!!actSub(a)?.startedAt));
  return `<section class="teaching-actions" aria-label="Seguir aprendiendo"><div><strong>${pending.length?`${pending.length} actividad${pending.length===1?'':'es'} para continuar`:'Estás al día con tus entregas'}</strong><p>${pending.length?esc(pending[0].title):'Podés repasar materiales y consultar tus devoluciones.'}</p></div><div class="row">${pending.length?button(actStudentAction(pending[0]),'act-student-open','primary',pending[0].id):button('Ver actividades','tab','','Actividades')}${button('Mis devoluciones','tab','','Mi progreso')}</div></section>`;
}
function openModal(title, body, footer='', {wide=false,steps='',keep=false}={}) {
  if (!dialog.open) returnFocus=document.activeElement;
  const scroll=keep ? dialog.querySelector('.dialog-body')?.scrollTop ?? 0 : 0;
  dialog.className=wide?'wide':'';
  dialog.innerHTML=`<div class="dialog-shell"><header class="dialog-head"><div class="row between"><h2 id="dialog-title" tabindex="-1">${title}</h2>${button('✕','close','link')}</div>${steps}</header><div class="dialog-body">${body}</div>${footer?`<footer class="dialog-foot">${footer}</footer>`:''}</div>`;
  dialog.querySelector('[data-action=close]').setAttribute('aria-label','Cerrar');
  if (!dialog.open) dialog.showModal();
  dialog.querySelector('.dialog-body').scrollTop=scroll;
  dialog.querySelector('#dialog-title').focus({preventScroll:true});
}
function closeModal() {
  modalToken++;
  context=null;
  dialog.close();
  if (returnFocus?.isConnected) returnFocus.focus();
}
function dismiss() {
  modalToken++;
  if (context?.kind==='confirm') return context.cancel();
  if (context?.kind==='confirm-create') {context.kind='create';return creation();}
  if (context?.kind==='create' && context.wizard.dirty) {
    const wizard=context.wizard;
    openModal('¿Salir de la creación?', '<p>Podés guardar el avance en Pendientes y retomarlo después.</p>',
      `<div class="row between">${button('Seguir editando','resume-create')}${button('Descartar cambios','close-now','link danger')}${button('Guardar y salir','save-create','primary')}</div>`);
    context={kind:'confirm-create',wizard};
  } else if (context?.kind==='material' && context.dirty) {
    const material=context;
    confirm('¿Descartar el material?', 'Los cambios de este formulario se perderán.', 'Descartar',()=>closeModal(),()=>{context=material;materialModal();});
  } else closeModal();
}
function confirm(title, message, label, accept, cancel=closeModal) {
  context={kind:'confirm',accept,cancel};
  openModal(title,`<p>${esc(message)}</p>`,`<div class="row between">${button('Cancelar','confirm-cancel')}${button(label,'confirm-ok','primary')}</div>`);
}
function modalError(message) {
  let el=dialog.querySelector('.error[role=alert]');
  if (!el) {
    el=document.createElement('p'); el.className='notice error statusbar'; el.setAttribute('role','alert');
    dialog.querySelector('.dialog-body').prepend(el);
  }
  el.textContent=message;
  el.scrollIntoView({block:'nearest'});
}
function steps(labels, n) {
  return `<ol class="steps" aria-label="Pasos">${labels.map((label,i)=>`<li ${i+1===n?'aria-current="step"':i+1<n?'class="done"':''}><b aria-hidden="true">${i+1<n?'✓':i+1}</b><span>${label}</span></li>`).join('')}</ol><p class="mobile-step">Paso ${n} de ${labels.length} · ${labels[n-1]}</p>`;
}
function startCreate(id) {
  const current=data.rooms.find(r=>r.id===id);
  context={kind:'create',wizard:{draft:current?structuredClone(current):newRoom(),dirty:false}};
  creation();
}
function uploadBox(label, name, accept, description, file='') {
  return `<div class="drop ${file?'has-file':''}" data-drop="${name}">
    <span class="upload-symbol">${icon(file?'file':'upload')}</span><strong>${file?esc(file):label}</strong>
    <small>${file?'Listo para usar · Podés reemplazarlo':description}</small>
    <label class="file-picker">${file?'Cambiar archivo':'Seleccionar archivo'}<input type="file" name="${name}" aria-label="${label}" accept="${accept}"></label></div>
    <div class="attachment" id="${name}-status" role="status"></div>`;
}
function creation(keep=false) {
  const d=context.wizard.draft;
  const labels=['Datos del aula','Cargar plan','Unidades y temas','Revisar y crear'];
  const details=`<div class="two">${input('Nombre del aula','name',d.name,'required maxlength="120"')}${input('Materia','subject',d.subject,'required maxlength="120"')}
    ${input('División','division',d.division,'required maxlength="40"')}${input('Ciclo lectivo','year',d.year,'required inputmode="numeric" pattern="[0-9]{4}"')}
    ${fieldSelect('zone','Zona horaria',[['Buenos Aires','Buenos Aires'],['Córdoba','Córdoba'],['Mendoza','Mendoza']],d.zone)}</div>
    <h3>Portada</h3><div class="row cover-options">${covers.map(([id,label])=>`<button type="button" data-action="cover" data-value="${id}" aria-pressed="${id===d.cover}"><img src="${cover(id,320)}" alt="">${label}</button>`).join('')}</div>`;
  const documentStep=`${uploadBox('Arrastrá o seleccioná el plan','plan-file','.pdf,.docx','PDF o DOCX · hasta 20 MB',d.file)}
    ${button('Usar un PDF de ejemplo','plan-example','link')}<h3>¿Cómo querés organizarlo?</h3>
    ${methodChoices(d.method,'Organizar a mi manera')}`;
  const units=curriculumEditor(d);
  const review=`<article class="card"><img class="cover" src="${cover(d.cover)}" alt=""><div class="card-body"><h3>${esc(d.name)}</h3><p>${esc(d.subject)} · ${esc(d.division)} · ${esc(d.year)} · ${esc(d.zone)}</p></div></article>
    <p>${icon('file')}${esc(d.file)}</p><div class="stack">${d.units.map(u=>`<details class="unit"><summary>${esc(u.title)} · ${u.topics.length} temas</summary><ul>${u.topics.map(t=>`<li>${esc(t.title)}</li>`).join('')}</ul></details>`).join('')}</div>
    <div class="row">${button('Editar datos','edit-create','',1)}${button('Editar plan','edit-create','',2)}${button('Editar unidades','edit-create','',3)}</div>`;
  const actions=['Continuar al plan',d.method==='ai'?'Analizar plan y continuar':'Continuar a unidades','Guardar plan y continuar','Confirmar y crear aula'];
  const headings=['Dale un lugar a tu próxima clase','Tu plan, listo para trabajar','Revisá las unidades y los temas','Todo listo para empezar'];
  const descriptions=['Completá los datos del grupo y elegí su portada.','Cargá el documento y elegí cómo querés organizarlo.','Podés ajustar los nombres, agregar temas y seguir cuando estén listos.','Comprobá los datos y creá el aula para compartirla.'];
  openModal('Crear aula',`<form id="create-form" class="stack"><div class="step-intro"><h3>${headings[d.step-1]}</h3><p>${descriptions[d.step-1]}</p></div>${[details,documentStep,units,review][d.step-1]}</form>`,
    `<div class="row between"><div class="row">${d.step>1?button('Atrás','back-create'):''}${button('Guardar y salir','save-create','link')}</div><button class="primary" form="create-form" id="create-next">${actions[d.step-1]}</button></div>`,
    {wide:true,steps:steps(labels,d.step),keep});
  dialog.querySelectorAll('.curriculum-editor textarea').forEach(growField);
}
function growField(field) {
  if (!field.getClientRects().length) return;
  field.style.height='auto';
  field.style.height=field.scrollHeight+2+'px';
}
function curriculumEditor(draft) {
  const wizard=context.wizard;
  const total=topics(draft).length;
  return `<section class="curriculum-editor">
    <div class="curriculum-toolbar"><div><strong>${draft.units.length} unidades <span>· ${total} temas</span></strong><p>El orden de las unidades será el recorrido de tu aula.</p></div>
    <div class="row">${button('Expandir todas','expand-units','link')}${button('Contraer','collapse-units','link')}</div></div>
    ${wizard.removed?`<div class="notice row between" role="status"><span>${esc(wizard.removed.label)}</span>${button('Deshacer','restore-unit-edit','link')}</div>`:''}
    <div class="curriculum-units">${draft.units.map((u,i)=>{
      const opened=wizard.expanded?wizard.expanded.includes(u.id):i===0;
      return `<details class="editor-unit" data-unit="${u.id}" ${opened?'open':''}>
        <summary><span class="unit-number">${String(i+1).padStart(2,'0')}</span>
        <span class="unit-summary"><strong data-unit-title="${u.id}">${esc(u.title||'Unidad sin nombre')}</strong>
        <small>${u.topics.length} ${u.topics.length===1?'tema':'temas'}</small></span><span class="disclosure-arrow" aria-hidden="true">⌄</span></summary>
        <div class="editor-unit-body">
          ${area('Nombre de la unidad',`u-${u.id}`,u.title,'required maxlength="120" placeholder="Por ejemplo, La luz y la imagen"',1)}
          <div class="topic-editor-list">${u.topics.map((t,j)=>`<div class="topic-editor-row">
            <span class="topic-order" aria-hidden="true">${i+1}.${j+1}</span>
            ${area(`Tema ${j+1}`,`t-${t.id}`,t.title,'required maxlength="120" placeholder="Escribí el nombre del tema"',1)}
            <button type="button" class="remove-topic" data-action="remove-topic" data-value="${t.id}" aria-label="Quitar tema ${j+1}" title="Quitar tema">${icon('trash')}</button>
          </div>`).join('')}</div>
          <div class="row between editor-unit-actions">${button(icon('plus')+'Agregar tema','add-topic','link',u.id)}
          ${button('Eliminar unidad','remove-unit','link danger',u.id)}</div>
        </div></details>`;
    }).join('')}</div>
    ${button(icon('plus')+'Agregar otra unidad','add-unit','add-unit')}
  </section>`;
}
function nextCreation() {
  const d=context.wizard.draft;
  if (d.step===1 && [d.name,d.subject,d.division].some(value=>!value.trim())) return modalError('Completá el nombre, la materia y la división.');
  if (d.step===2 && !d.file) return modalError('Elegí un PDF o DOCX para continuar.');
  if (d.step===3 && (!d.units.length || d.units.some(u=>!u.title.trim()||!u.topics.length||u.topics.some(t=>!t.title.trim())))) return modalError('Completá al menos una unidad con un tema y revisá los nombres.');
  if (d.step===4) {
    d.state='active'; d.code=nextCode();
    persistDraft(d); state='active'; year=division=query=''; closeModal();
    tell('Aula creada. Ya está disponible en Activas.');
    return;
  }
  if (d.step===2 && !d.units.length && d.method==='ai') {
    const current=context;
    busy('Foxy está organizando el plan de ejemplo…',()=>{if(context!==current)return;d.units=[unit('Introducción',['Conceptos iniciales','Aplicación práctica']),unit('Proyecto de cierre',['Producción y revisión'])];d.step++;creation();});
    return;
  }
  if (d.step===2 && !d.units.length) d.units=[unit()];
  d.step++; context.wizard.dirty=true; creation();
}
function persistDraft(draft) {
  const index=data.rooms.findIndex(r=>r.id===draft.id);
  if (index<0) data.rooms.unshift(draft); else data.rooms[index]=draft;
  save();
}
function busy(text, done) {
  const token=++modalToken;
  const body=dialog.querySelector('.dialog-body');
  const el=document.createElement('div'); el.innerHTML=loadingState(text,'Podés cerrar esta vista y volver a intentarlo después.'); body.prepend(el);
  body.setAttribute('aria-busy','true');
  el.scrollIntoView({block:'nearest'});
  dialog.querySelectorAll('button:not([data-action=close]), input, select, textarea').forEach(element=>element.disabled=true);
  setTimeout(()=>{if(token===modalToken && dialog.open) {body.removeAttribute('aria-busy');done();}},700);
}
function plan() {
  const all=topics();
  const matches=({t})=>planFilter==='all'||(planFilter==='given'?t.given:!t.given);
  const current=all.find(item=>item.t.id===topicId&&matches(item)) || all.find(matches) || all[0];
  if (!current) return empty('El aula todavía no tiene temas.');
  const {u,t}=current;
  const materials=room().materials.filter(m=>m.topic===t.id);
  const tasks=room().activities.filter(a=>a.topic===t.id&&a.status==='Asignada');
  const given=all.filter(({t})=>t.given).length;
  const filters=[['all','Todos',all.length],['pending','Por dar',all.length-given],['given','Dados',given]];
  const visibleUnits=room().units.map((u,index)=>({u,index,visible:u.topics.filter(t=>planFilter==='all'||(planFilter==='given'?t.given:!t.given))})).filter(item=>item.visible.length);
  const index=all.findIndex(item=>item.t===t);
  return head('Plan de estudio',isStudent()?'Recorré los temas y encontrá los materiales y actividades de tu clase.':'Elegí un tema para preparar la clase. Usá el check para registrar lo dado.')+
    `<div class="plan-progress"><div><strong>${given} de ${all.length} temas dados</strong><small>${isStudent()?'Avance registrado por tu docente':'Tu recorrido de enseñanza'}</small></div>
    <progress max="${all.length}" value="${given}" aria-label="Temas dados"></progress><b>${percent(room())}%</b></div>
    <div class="plan curriculum-plan"><div class="plan-navigation">
    <div class="plan-filters" role="group" aria-label="Filtrar temas">${filters.map(([id,label,count])=>`<button data-action="plan-filter" data-value="${id}" aria-pressed="${planFilter===id}">${label}<span>${count}</span></button>`).join('')}</div>
    <div class="stack">${visibleUnits.map(({u,index,visible})=>{
      const completed=u.topics.filter(t=>t.given).length;
      return `<details class="plan-unit" data-plan-unit="${u.id}" ${closedPlanUnits.has(u.id)?'':'open'}>
      <summary><span class="unit-number">${String(index+1).padStart(2,'0')}</span><span class="unit-summary"><strong>${esc(u.title)}</strong>
      <small>${completed} de ${u.topics.length} dados</small></span><span class="disclosure-arrow" aria-hidden="true">⌄</span></summary>
      <div class="unit-progress" aria-hidden="true"><i style="width:${u.topics.length?completed/u.topics.length*100:0}%"></i></div>
      <div class="plan-topic-list">${visible.map(item=>`<div class="plan-topic ${item===t?'selected':''} ${item.given?'is-given':''}">
        ${canWrite()?`<button class="topic-check" data-action="given-row" data-value="${item.id}" aria-pressed="${item.given}" aria-label="${esc((item.given?'Marcar como pendiente: ':'Marcar como dado: ')+item.title)}" title="${item.given?'Marcar como pendiente':'Marcar como dado'}"><span aria-hidden="true">${item.given?'✓':''}</span></button>`:`<span class="readonly-check" aria-label="${item.given?'Dado':'Pendiente'}">${item.given?'✓':'○'}</span>`}
        <button class="topic-name" data-action="topic" data-value="${item.id}" ${item===t?'aria-current="true"':''}><span>${esc(item.title)}</span><small>${item.given?'Dado':'Por dar'}</small></button>
      </div>`).join('')}</div></details>`;
    }).join('')||empty('No hay temas en este estado.')}</div></div>
    <article class="panel topic-detail" aria-label="Detalle del tema" ${visibleUnits.length?'':'hidden'}>
      <header>${button('↑ Unidades y temas','plan-index','link plan-index-link')}<p class="topic-location">${esc(u.title)} · Tema ${u.topics.indexOf(t)+1}</p>
      <div class="row between"><h3>${esc(t.title)}</h3>${tag(t.given?'✓ Dado':'Por dar',t.given?'mint':'warm')}</div></header>
      <div class="completion-panel ${t.given?'complete':''}">
        <div><strong>${t.given?'Este tema ya fue dado':isStudent()?'Todavía no se trabajó en clase':'¿Trabajaste este tema en clase?'}</strong><p>${isStudent()?'Podés consultar los recursos disponibles y repasar a tu ritmo.':t.given?'Podés volver a marcarlo como pendiente.':'Registralo para actualizar el avance del aula.'}</p></div>
        ${canWrite()?button(t.given?'✓ Tema dado':'Marcar como dado','given',t.given?'':'primary',t.id):''}
      </div>
      <div class="plan-feedback" role="status">${planMessage?esc(planMessage):''}
      ${canWrite()&&undoGiven?.roomId===roomId?button('Deshacer','undo-given','link',undoGiven.id):''}</div>
      <section class="topic-resources"><div class="row between"><h4>${icon('folder')}Materiales <span>${materials.length}</span></h4>${canWrite()?button('Agregar','material-new','link',t.id):''}</div>
      ${materials.length?materials.map(m=>button(esc(m.title),'material-read','resource-link',m.id)).join(''):empty(isStudent()?'Tu docente todavía no compartió materiales en este tema.':'Agregá una lectura, presentación o recurso para este tema.')}</section>
      <section class="topic-resources"><div class="row between"><h4>${icon('clipboard')}Actividades <span>${tasks.length}</span></h4>${canWrite()?button('Crear','activity-new','link',t.id):''}</div>
      ${tasks.length?tasks.map(a=>button(esc(a.title),'activity-read','resource-link',a.id)).join(''):empty('Las actividades asignadas a este tema aparecerán acá.')}</section>
      <footer class="topic-pagination"><span>Tema ${index+1} de ${all.length}</span><div class="row">
      ${index>0?button('← Anterior','topic','',all[index-1].t.id):''}${index<all.length-1?button('Siguiente →','topic','',all[index+1].t.id):''}</div></footer>
    </article></div>`;
}
let undoGiven;
let planFilter='all';
let planMessage='';
const closedPlanUnits=new Set();
function capturePlanState() {
  main.querySelectorAll('[data-plan-unit]').forEach(el=>{
    if(el.open)closedPlanUnits.delete(el.dataset.planUnit);else closedPlanUnits.add(el.dataset.planUnit);
  });
}
function refreshPlan(focusAction, id) {
  const y=window.scrollY;
  main.querySelector('.room-body').innerHTML=plan();
  const target=[...main.querySelectorAll('[data-action]')].find(el=>el.dataset.action===focusAction&&el.dataset.value===id);
  (target||main.querySelector('.plan-filters [aria-pressed=true]'))?.focus({preventScroll:true});
  window.scrollTo(0,y);
}
function selectTopic(id) {
  capturePlanState();
  topicId=id;
  const selected=topics().find(({t})=>t.id===id);
  if(selected)closedPlanUnits.delete(selected.u.id);
  refreshPlan('topic',id);
  if(matchMedia('(max-width:760px)').matches)main.querySelector('.topic-detail').scrollIntoView({block:'start'});
}
function markGiven(id, undo=false, fromRow=false) {
  if(!canWrite())return;
  if(undo&&(!undoGiven||undoGiven.roomId!==roomId||undoGiven.id!==id))return;
  const t=topics().find(({t})=>t.id===id)?.t;
  if(!t)return;
  capturePlanState();
  const previous=t.given;
  t.given=undo?undoGiven.previous:!t.given;
  undoGiven=undo?null:{id,previous,roomId};
  log(t.given?'Tema marcado como dado':'Marca de tema quitada'); save();
  planMessage=undo?'Cambio deshecho.':`«${t.title}» ${t.given?'marcado como dado.':'vuelve a estar pendiente.'}`;
  refreshPlan(fromRow?'given-row':'given',id);
  if(t.given) {
    const row=[...main.querySelectorAll('[data-action=given-row]')].find(el=>el.dataset.value===id);
    row?.classList.add('just-completed');
    if(topicId===id||!topicId&&topics()[0]?.t.id===id)main.querySelector('.completion-panel')?.classList.add('just-completed');
  }
}
function wall() {
  const items=room().posts.filter(p=>!wallFilter||p.type===wallFilter);
  return head('Muro','Novedades y conversaciones del aula.',canConverse()?button(icon('plus')+(isStudent()?'Hacer una consulta':'Nueva publicación'),'post-new','primary'):'')+
    `<div class="stack"><div class="switch" role="group" aria-label="Filtrar publicaciones">${[['','Todas'],['Aviso','Avisos'],['Consulta','Consultas']].map(([id,label])=>`<button data-action="wall-filter" data-value="${id}" aria-pressed="${wallFilter===id}">${label}</button>`).join('')}</div>
    ${items.map(p=>`<article class="panel stack"><header class="row between"><div class="row"><img class="avatar" alt="" src="${assets}brujula/avatars/foxy-classic.webp"><div><strong>${p.author==='marina'?'Marina Demo':'Lucía Demo'}</strong><br><small>${p.author==='marina'?'Estudiante':'Docente'} · ${esc(p.date||'Ejemplo')}</small></div>${tag(p.type,'violet')}</div>
    ${ownPost(p)&&!p.deleted?`<div class="row">${button('Editar','post-edit','link',p.id)}${button('Eliminar','post-delete','link danger',p.id)}</div>`:''}</header>
    <h3>${esc(p.title)}</h3><p class="text">${esc(p.body)}</p>
    ${p.replies.map(reply=>`<div class="reply"><strong>${reply.author==='marina'?'Marina Demo':'Lucía Demo'}</strong><p class="text">${esc(typeof reply==='string'?reply:reply.body)}</p></div>`).join('')}
    ${canConverse()&&!p.deleted?`<details><summary>Responder</summary><form class="stack" data-form="reply" data-id="${p.id}">${area('Tu respuesta','reply','','required maxlength="3000"')}<div class="row">${submit('Enviar respuesta')}${button('Cancelar','reply-cancel','link')}</div></form></details>`:''}</article>`).join('')||empty('No hay publicaciones para mostrar.')}</div>`;
}
function postModal(id) {
  const p=room().posts.find(p=>p.id===id);
  if(!canConverse()||p&&!ownPost(p))return;
  context={kind:'post',id};
  openModal(p?'Editar publicación':isStudent()?'Hacer una consulta':'Nueva publicación',`<form id="post-form" class="stack">${isStudent()?'<input type="hidden" name="type" value="Consulta"><p>Tu consulta y las respuestas serán visibles para el grupo.</p>':fieldSelect('type','Tipo',[['Aviso','Aviso'],['Consulta','Consulta']],p?.type)}
    ${input('Título','title',p?.title,'required maxlength="120"')}${area('Mensaje','body',p?.body,'required maxlength="3000"')}<small>Visible para toda el aula</small></form>`,
    `<div class="row between">${button('Cancelar','close')}<button class="primary" form="post-form">${p?'Guardar cambios':'Publicar en el muro'}</button></div>`);
}
function library() {
  return head('Biblioteca','Materiales de las unidades y recursos complementarios.',canWrite()?button(icon('plus')+'Agregar material','material-new','primary'):'')+
    `<div class="stack"><input id="material-search" aria-label="Buscar materiales" value="${esc(materialQuery)}" placeholder="Buscar material o tema…"><div id="material-list" class="stack">${materialRows()}</div></div>`;
}
function materialRows() {
  const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  return room().materials.filter(m=>normalize([m.title,m.file,m.usage,room().units.find(u=>u.id===m.unit)?.title,topics().find(({t})=>t.id===m.topic)?.t.title].join(' ')).includes(normalize(materialQuery))).map(m=>`<article class="panel row between row-item"><div><div class="row">${tag(m.mode==='file'?'Archivo':'Lectura','violet')}<small>${esc(m.usage)}</small></div><h3>${esc(m.title)}</h3>
    <p>${esc(m.mode==='file'?m.file:'Disponible para leer en FoxMind')}${m.topic?' · '+esc(topics().find(({t})=>t.id===m.topic)?.t.title):''}</p></div>
    <div class="row">${button(m.mode==='file'?'Ver archivo':'Leer material','material-read','',m.id)}${canWrite()?button('Editar','material-edit','',m.id)+button('Eliminar','material-delete','link danger',m.id):''}</div></article>`).join('')||empty(materialQuery?'No hay coincidencias. Probá con otro título, unidad o tema.':'Tu docente todavía no compartió materiales en esta aula.');
}
function startMaterial(id='', topic='') {
  const old=room().materials.find(m=>m.id===id);
  const initial={id:uid(),title:'',body:'',file:'',unit:topics().find(({t})=>t.id===topic)?.u.id||'',topic,usage:'Material de estudio'};
  context={kind:'material',edit:!!old,dirty:false,mode:old?.mode||'file',drafts:{file:{...initial},text:{...initial}}};
  if(old)context.drafts[old.mode]={...old};
  materialModal();
}
function materialModal() {
  const {mode,drafts,edit}=context, m=drafts[mode];
  openModal(edit?'Editar material':'Agregar material',`<form id="material-form" class="stack">
    <div class="switch" aria-label="Formato">${[['file','Subir archivo'],['text','Escribir material']].map(([id,label])=>`<button type="button" data-action="material-mode" data-value="${id}" aria-pressed="${id===mode}" ${edit&&id!==mode?'disabled':''}>${label}</button>`).join('')}</div>
    ${mode==='file'?uploadBox('Arrastrá o seleccioná un archivo','material-file','.pdf,.docx,.pptx,.xlsx,.jpg,.jpeg,.png,.zip','PDF, DOCX, PPTX, XLSX, JPG, PNG o ZIP · hasta 50 MB',m.file)+button('Usar un archivo de ejemplo','material-example','link'):''}
    ${input('Título','title',m.title,'required maxlength="120"')}${area(mode==='file'?'Descripción (opcional)':'Contenido','body',m.body,mode==='text'?'required maxlength="12000"':'maxlength="2000"')}
    <details class="optional-section" ${m.unit||context.locationOpen?'open':''}><summary>Organizar en el plan <small>Opcional</small></summary><div class="stack">
    <div class="two">${fieldSelect('unit','Unidad',roomOptions(),m.unit)}${fieldSelect('topic','Tema',topicOptions(m.unit),m.topic)}</div>
    ${fieldSelect('usage','Uso del recurso',['Material de estudio','Recomendado','Complementario'].map(v=>[v,v]),m.usage)}</div></details></form>`,
    `<div class="row between">${button('Cancelar','close')}<button class="primary" form="material-form">${edit?'Guardar cambios':'Publicar en Biblioteca'}</button></div>`);
}
function materialRead(id) {
  const m=room().materials.find(m=>m.id===id);
  context={kind:'read'};
  openModal(esc(m.title),`<article class="material-reader stack">${tag(esc(m.usage),'violet')}<p class="text">${esc(m.body||m.file)}</p>${m.mode==='file'?'<small>Archivo de ejemplo: en esta maqueta sólo está disponible el nombre.</small>':''}</article>`,button('Volver','close'),{wide:true});
}
function nextCode() {
  let code;
  do { code=String(Math.floor(Math.random()*1000000)).padStart(6,'0'); } while (data.usedCodes.includes(code));
  data.usedCodes.push(code);
  return code;
}
let memberQuery='';
function members() {
  const r=room();
  return head('Alumnos','Consultá quiénes integran el aula y acompañá su recorrido.',canWrite()?button(icon('users')+'Invitar alumnos','invite','primary'):'')+
    `<div class="stack">${r.code?`<section class="panel code-panel row between"><div><h3>Código de acceso</h3><p>${canWrite()?'Vigente hasta que lo regeneres.':'Disponible al reactivar el aula.'}</p></div>
    <div class="row"><strong class="code">${r.code.replace(/(\d{3})(\d{3})/,'$1 $2')}</strong>${canWrite()?button('Copiar','copy-code')+button('Regenerar','rotate')+button('Probar ingreso','join-preview','link'):''}</div></section>`:''}
    <div class="row between"><h3>Integrantes · ${r.students.length}</h3><input style="max-width:300px" id="member-search" aria-label="Buscar integrantes" placeholder="Buscar por nombre" value="${esc(memberQuery)}"></div><div id="member-list" class="stack">${memberRows()}</div>
    <h3>Invitaciones · ${r.invites.filter(i=>i.status==='Pendiente').length} pendientes</h3>
    ${r.invites.map(i=>`<div class="panel row between row-item"><div><strong>${esc(i.email)}</strong><br><small>Invitación por correo</small></div><div class="row">${tag(i.status,'violet')}
    ${canWrite()&&i.status==='Pendiente'?button('Reenviar','invite-resend','',i.id)+button('Revocar','invite-revoke','link danger',i.id)+button('Probar aceptación','invite-accept','link',i.id):''}</div></div>`).join('')||empty('Todavía no hay invitaciones.')}</div>`;
}
function memberRows() {
  return room().students.filter(s=>`${s.name} ${s.email}`.toLowerCase().includes(memberQuery.toLowerCase())).map(s=>`<div class="panel row between row-item"><div><strong>${esc(s.name)}</strong><p>${esc(s.email)}</p></div>${button('Ver ficha →','student-read','link',s.id)}</div>`).join('')||empty('No hay integrantes para mostrar.');
}
function inviteModal() {
  const {emails='',outcomes=[]}=context;
  openModal('Invitar alumnos',`<form id="invite-form" class="stack"><p>Pegá hasta 50 correos separados por comas, punto y coma o saltos de línea.</p>
    ${area('Correos electrónicos','emails',emails,'required placeholder="ana@example.test"')}
    ${button('Usar correos de ejemplo','invite-example','link')}</form>
    ${outcomes.length?`<div class="stack" style="margin-top:12px">${outcomes.map(o=>`<div class="panel row between row-item"><strong>${esc(o.email)}</strong>${tag(o.message,o.error?'warm':'mint')}</div>`).join('')}</div>`:''}`,
    `<div class="row between">${button('Cerrar','close')}<button class="primary" form="invite-form">${outcomes.length?'Revisar nueva tanda':'Revisar destinatarios'}</button></div>`);
}
function reviewInvites() {
  const emails=[...new Set(context.emails.split(/[;,\n]+/).map(v=>v.trim().toLowerCase()).filter(Boolean))];
  if (!emails.length||emails.length>50) return modalError('La tanda admite entre 1 y 50 direcciones.');
  const invalid=emails.filter(email=>!(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)));
  if(invalid.length)return modalError('Corregí o quitá: '+invalid.join(', '));
  context.batch=emails;
  openModal('Revisar destinatarios',`<div class="stack"><p>Se simulará la invitación a ${emails.length} destinatario(s).</p><div class="row">${emails.map(email=>tag(esc(email),'violet')).join('')}</div></div>`,
    `<div class="row between">${button('Editar correos','invite-back')}${button('Enviar invitaciones','invite-send','primary')}</div>`);
}
function sendInvites() {
  const r=room(), outcomes=context.batch.map(email=>{
    if(r.students.some(s=>s.email===email))return {email,message:'Ya integra el aula'};
    if(r.invites.some(i=>i.email===email&&i.status==='Pendiente'))return {email,message:'Ya tiene una invitación pendiente'};
    if(email==='error@example.test'&&!context.outcomes?.some(o=>o.email===email&&o.error))return {email,message:'No se pudo crear · Podés reintentar',error:true};
    r.invites.unshift({id:uid(),email,status:'Pendiente'});
    return {email,message:'Creada · Envío simulado'};
  });
  log('Tanda de invitaciones procesada'); save();
  context={kind:'invite',emails:outcomes.filter(o=>o.error).map(o=>o.email).join('\n'),outcomes};
  render(); inviteModal();
}
function progressPage() {
  const r=room();
  return head('Progreso','Avance del plan y actividades del aula.')+`<div class="two"><div class="panel stack"><h3>Plan de estudio</h3>${progress(r)}</div>
    <div class="panel stack"><h3>Actividades asignadas</h3><p>${r.activities.filter(a=>a.status==='Asignada').length} actividades</p></div></div>`;
}
function history() {
  return head('Historial','Acciones registradas en esta sesión de prueba.')+`<div class="stack">${room().history.map(item=>`<div class="panel row between"><strong>${esc(item.message)}</strong><small>${esc(item.date)}</small></div>`).join('')||empty('Todavía no hay movimientos.')}</div>`;
}
function settings() {
  const r=room();
  return head('Configuración','Datos y estado del aula.')+`<div class="stack editor"><form class="panel stack" data-form="settings"><h3>Datos del aula</h3>
    <fieldset ${canWrite()?'':'disabled'} style="border:0;padding:0;margin:0;min-width:0"><div class="two">${input('Nombre','name',r.name,'required maxlength="120"')}${input('Materia','subject',r.subject,'required maxlength="120"')}${input('División','division',r.division,'required maxlength="40"')}${fieldSelect('cover','Portada',covers,r.cover)}</div></fieldset>
    <p>Ciclo ${esc(r.year)} · Zona horaria ${esc(r.zone)}</p>${canWrite()?`<div>${submit('Guardar cambios')}</div>`:''}</form>
    <div class="panel row between"><div><h3>${canWrite()?'Archivar aula':'Reactivar aula'}</h3><p>${canWrite()?'Conservá el contenido en modo de consulta.':'Volvé a habilitar las acciones del aula.'}</p></div>${button(canWrite()?'Archivar aula':'Reactivar aula','archive',canWrite()?'danger':'primary')}</div></div>`;
}
function requestFile(file, name) {
  if(!file)return;
  const planFile=name==='plan-file', limit=planFile?20:50;
  const extensions=planFile?/\.(pdf|docx)$/i:/\.(pdf|docx|pptx|xlsx|jpe?g|png|zip)$/i;
  if(!extensions.test(file.name)||file.size>limit*1024*1024||file.size===0) {
    modalError(`Elegí un archivo válido de hasta ${limit} MB.`);
    return;
  }
  const current=context;
  busy('Verificando el archivo en la simulación…',()=>{if(context===current)readyFile(file.name,planFile);});
}
function readyFile(filename, planFile) {
  if(planFile) {
    const wizard=context.wizard;
    wizard.draft.file=filename;wizard.dirty=true;creation(true);
  } else {
    const m=context.drafts.file;
    m.file=filename;m.title ||= filename.replace(/\.[^.]+$/,'');
    context.dirty=true;materialModal();
  }
}
function mutateUnits(action,id) {
  const wizard=context.wizard,d=wizard.draft;
  wizard.expanded=[...dialog.querySelectorAll('[data-unit][open]')].map(el=>el.dataset.unit);
  if(action==='remove-unit'||action==='remove-topic') {
    wizard.removed={units:structuredClone(d.units),expanded:[...wizard.expanded],label:action==='remove-unit'?'Unidad eliminada del plan.':'Tema eliminado del plan.'};
  } else wizard.removed=null;
  let focus;
  if(action==='add-unit') {
    const u=unit();d.units.push(u);wizard.expanded.push(u.id);focus=`u-${u.id}`;
  } else if(action==='remove-unit') d.units=d.units.filter(u=>u.id!==id);
  else if(action==='add-topic') {
    const u=d.units.find(u=>u.id===id),t={id:uid(),title:'',given:false};
    u.topics.push(t);focus=`t-${t.id}`;
  } else d.units.forEach(u=>{u.topics=u.topics.filter(t=>t.id!==id);});
  wizard.dirty=true;creation(true);
  if(focus)dialog.querySelector(`[name="${focus}"]`)?.focus();
  else dialog.querySelector('[data-action=restore-unit-edit]')?.focus({preventScroll:true});
}
function archive() {
  const r=room(), old=r.state;
  confirm(old==='active'?'¿Archivar aula?':'¿Reactivar aula?',old==='active'?'El contenido quedará disponible para consultar. Se pausará el ingreso.':'Se habilitarán nuevamente las acciones y el código vigente.',old==='active'?'Archivar':'Reactivar',()=>{
    r.state=old==='active'?'archived':'active';
    if(r.state==='active'&&!r.code)r.code=nextCode();
    log(r.state==='active'?'Aula reactivada':'Aula archivada');save();closeModal();tell(r.state==='active'?'Aula reactivada.':'Aula archivada.');
  });
}
function joinModal() {
    context={kind:'join'};
  openModal('Ingresar a un aula · Vista del estudiante',`<form id="join-form" class="stack"><p>Probá el código con un estudiante ficticio.</p>${input('Código de acceso','code','','required maxlength="12" inputmode="numeric"')}</form>`,
    `<div class="row between">${button('Cancelar','close')}<button form="join-form" class="primary">Buscar aula</button></div>`);
}
function addStudent(email, name) {
  if(!room().students.some(s=>s.email===email))room().students.push({id:uid(),email,name});
}
function deleteRecord(collection,id,title,message) {
  confirm(title,message,'Eliminar',()=>{
    room()[collection]=room()[collection].filter(item=>item.id!==id);
    log(title.replace(/[¿?]/g,''));save();closeModal();tell('Cambio guardado.');
  });
}
const actions = {
  'preview-role':switchPreviewRole,
  'student-join':studentJoin,
  'student-leave':()=>confirm('¿Salir del aula?','Tus entregas se conservarán. Para volver, vas a necesitar una nueva invitación del docente.','Salir del aula',()=>{
    room().students=room().students.filter(s=>s.id!=='marina');
    room().removed ||= [];room().removed.push('marina@example.test');
    log('Marina Demo salió del aula');save();closeModal();navigate(null);
  }),
  'expand-units':()=>{context.wizard.expanded=context.wizard.draft.units.map(u=>u.id);creation(true);dialog.querySelector('[data-action=expand-units]').focus({preventScroll:true});},
  'collapse-units':()=>{context.wizard.expanded=[];creation(true);dialog.querySelector('[data-action=collapse-units]').focus({preventScroll:true});},
  'restore-unit-edit':()=>{
    const w=context.wizard;
    w.draft.units=w.removed.units;w.expanded=w.removed.expanded;w.removed=null;w.dirty=true;
    creation(true);
    dialog.querySelector('.editor-unit[open] textarea, [data-action=expand-units]')?.focus({preventScroll:true});
  },
  'plan-filter':value=>{capturePlanState();planFilter=value;refreshPlan('plan-filter',value);},
  'given-row':id=>markGiven(id,false,true),
  'dismiss-feedback':(_,el)=>{el.closest('.success-feedback').remove();main.querySelector('h1')?.focus({preventScroll:true});},
  'quick-post':()=>{tab='Muro';render();postModal();},
  menu:()=>{const open=side.classList.toggle('open');(open?side:main).querySelector('.mobile-menu').focus();},
  catalog:()=>{if(leaveActivity(()=>navigate(null)))navigate(null);},
  room:id=>{if(leaveActivity(()=>navigate(id)))navigate(id);},
  tab:changeTab,
  bucket:value=>{state=value;render();main.querySelector('.pills [aria-pressed=true]').focus();},
  layout:value=>{layout=value;render();main.querySelector('.filters .switch [aria-pressed=true]').focus();},
  clear:()=>{query=year=division='';render();main.querySelector('#class-search').focus();},
  create:startCreate,
  'delete-draft':id=>confirm('¿Eliminar el aula pendiente?','Se eliminará el borrador de esta maqueta.','Eliminar pendiente',()=>{
    data.rooms=data.rooms.filter(r=>r.id!==id);save();closeModal();tell('Aula pendiente eliminada.');
  }),
  close:dismiss, 'close-now':closeModal,
  'confirm-ok':()=>context.accept(), 'confirm-cancel':()=>context.cancel(),
  'resume-create':()=>{context.kind='create';creation();},
  'save-create':()=>{persistDraft(context.wizard.draft);state='pending';query=year=division='';closeModal();tell(storage?'Avance guardado en Pendientes.':'Avance disponible en Pendientes mientras mantengas abierta la maqueta.');},
  'back-create':()=>{context.wizard.draft.step--;creation();},
  'edit-create':value=>{context.wizard.draft.step=Number(value);creation();},
  cover:value=>{context.wizard.draft.cover=value;context.wizard.dirty=true;dialog.querySelectorAll('[data-action=cover]').forEach(el=>el.setAttribute('aria-pressed',String(el.dataset.value===value)));},
  'plan-example':()=>readyFile('Plan de estudios.pdf',true),
  'add-unit':id=>mutateUnits('add-unit',id), 'remove-unit':id=>mutateUnits('remove-unit',id),
  'add-topic':id=>mutateUnits('add-topic',id), 'remove-topic':id=>mutateUnits('remove-topic',id),
  topic:selectTopic,
  'plan-index':()=>{const el=main.querySelector('.topic-name[aria-current=true]')||main.querySelector('.plan-filters button');el?.focus();el?.scrollIntoView({block:'center'});},
  given:id=>markGiven(id), 'undo-given':id=>markGiven(id,true),
  'wall-filter':value=>{wallFilter=value;render();main.querySelector('.room-body [aria-pressed=true]')?.focus();},
  'post-new':()=>postModal(), 'post-edit':postModal,
  'post-delete':id=>confirm('¿Eliminar la publicación?','El mensaje se ocultará y las respuestas se conservarán.','Eliminar publicación',()=>{
    const p=room().posts.find(p=>p.id===id);
    if(p.replies.length){p.title='Publicación eliminada';p.body='';p.deleted=true;}
    else room().posts=room().posts.filter(p=>p.id!==id);
    log('Publicación eliminada');save();closeModal();tell('Publicación eliminada.');
  }),
  'reply-cancel':(_,el)=>{el.form.reset();el.closest('details').open=false;},
  'material-new':id=>startMaterial('',id), 'material-edit':id=>startMaterial(id),
  'material-mode':mode=>{context.mode=mode;materialModal();}, 'material-example':()=>readyFile('Lecturas de identidad.pdf',false),
  'material-read':materialRead,
  'material-delete':id=>deleteRecord('materials',id,'¿Eliminar material?','El material dejará de aparecer en Biblioteca y en su tema.'),
  'activity-new':topic=>startActivity('',topic), 'activity-edit':id=>startActivity(id),
  'activity-read':id=>{tab='Actividades';activity=null;activityView=id;studentPreview=false;render();},
  'activity-list':()=>{activityView=null;render();}, 'student-preview':()=>{studentPreview=!studentPreview;render();},
  'activity-back':()=>{if(activityStep>1){activityStep--;render();}else leaveActivity(render);},
  'activity-save':()=>persistActivity(false),
  'criterion-add':()=>{if(activity.criteria.length<12){activity.criteria.push({name:'',weight:'',evidence:''});render();main.querySelector(`[name=criterion-${activity.criteria.length-1}]`).focus();}},
  'criterion-remove':i=>{activity.criteria.splice(Number(i),1);render();},
  weights:()=>{const n=activity.criteria.length;activity.criteria.forEach((c,i)=>{c.weight=Math.floor(100/n)+(i<100%n?1:0);});render();},
  'question-add':()=>{if(activity.questions.length<12){activity.questions.push({type:'Abierta',text:'',points:10});render();main.querySelector(`[name=question-${activity.questions.length-1}]`).focus();}},
  'question-remove':i=>{activity.questions.splice(Number(i),1);render();},
  invite:()=>{context={kind:'invite'};inviteModal();},
  'invite-example':()=>{context.emails='ana@example.test\nleo@example.test\nerror@example.test';inviteModal();},
  'invite-back':inviteModal, 'invite-send':sendInvites,
  'invite-resend':id=>{const i=room().invites.find(i=>i.id===id);confirm('¿Reenviar invitación?',`Destinatario: ${i.email}`,'Reenviar',()=>{
    i.resent=true;log('Reenvío de invitación simulado');save();closeModal();tell('Reenvío simulado.');
  });},
  'invite-revoke':id=>confirm('¿Revocar invitación?','El destinatario ya no podrá usarla para ingresar.','Revocar',()=>{
    room().invites.find(i=>i.id===id).status='Revocada';log('Invitación revocada');save();closeModal();tell('Invitación revocada.');
  }),
  'invite-accept':id=>{
    const invite=room().invites.find(i=>i.id===id);
    confirm('Aceptar invitación · Vista del estudiante',`Unirte a ${room().name} como ${invite.email}.`,'Aceptar invitación',()=>{
      invite.status='Aceptada';addStudent(invite.email,invite.email.split('@')[0]);log('Estudiante ingresó por invitación');save();closeModal();tell('Invitación aceptada. El integrante aparece en el aula.');
    });
  },
  'student-read':id=>{
    const s=room().students.find(s=>s.id===id);
    context={kind:'read'};
    openModal('Ficha del estudiante',`<div class="stack"><h3>${esc(s.name)}</h3><p>${esc(s.email)}</p>${tag('Integrante','mint')}</div>`,
      `<div class="row between">${button('Volver','close')}${canWrite()?button('Quitar del aula','student-remove','danger',id):''}</div>`);
  },
  'student-remove':id=>confirm('¿Quitar al estudiante?','Para volver a ingresar necesitará una invitación.','Quitar del aula',()=>{
    const r=room(),s=r.students.find(s=>s.id===id);r.removed ||= [];r.removed.push(s.email);
    r.students=r.students.filter(s=>s.id!==id);log('Integrante retirado');save();closeModal();tell('Estudiante retirado del aula.');
  }),
  'copy-code':async()=>{
    const code=room().code;
    try{await navigator.clipboard.writeText(code);tell('Código copiado.');}
    catch{context={kind:'read'};openModal('Copiar código',input('Código de acceso','clipboard',code,'readonly'),button('Cerrar','close'));const el=dialog.querySelector('input');el.focus();el.select();}
  },
  rotate:()=>confirm('¿Regenerar el código?','El código anterior dejará de servir. Los estudiantes que ya ingresaron conservarán su acceso.','Regenerar código',()=>{
    room().code=nextCode();log('Código de acceso regenerado');save();closeModal();tell('Nuevo código disponible. El anterior quedó revocado.');
  }),
  'join-preview':joinModal, archive
};
document.addEventListener('click',event=>{
  const el=event.target.closest('button[data-action]');
  if(el)actions[el.dataset.action]?.(el.dataset.value,el);
});
dialog.addEventListener('cancel',event=>{event.preventDefault();if(context?.kind==='confirm')context.cancel();else dismiss();});
function values(form) {return Object.fromEntries(new FormData(form));}
function syncField(el) {
  const name=el.name, value=el.type==='checkbox'?el.checked:el.value;
  if(!name||el.type==='file')return;
  if(el.form?.id==='create-form') {
    const {draft}=context.wizard;
    context.wizard.dirty=true;
    if(context.wizard.removed) {
      context.wizard.removed=null;
      dialog.querySelector('.curriculum-editor > .notice')?.remove();
    }
    if(name.startsWith('u-')){
      draft.units.find(u=>u.id===name.slice(2)).title=value;
      const title=dialog.querySelector(`[data-unit-title="${name.slice(2)}"]`);
      if(title)title.textContent=value.trim()||'Unidad sin nombre';
    }
    else if(name.startsWith('t-'))topics(draft).find(({t})=>t.id===name.slice(2)).t.title=value;
    else draft[name]=value;
    if(el.matches('.curriculum-editor textarea'))growField(el);
  }
  if(el.form?.id==='material-form') {context.dirty=true;context.drafts[context.mode][name]=value;}
  if(el.form?.id==='invite-form')context.emails=value;
  if(el.form?.id==='activity-form')syncActivityField(el);
}
document.addEventListener('input',({target:el})=>{
  if(el.id==='class-search'){query=el.value;document.querySelector('#results').innerHTML=results();}
  else if(el.id==='material-search'){materialQuery=el.value;document.querySelector('#material-list').innerHTML=materialRows();}
  else if(el.id==='member-search'){memberQuery=el.value;document.querySelector('#member-list').innerHTML=memberRows();}
  else syncField(el);
});
document.addEventListener('change',({target:el})=>{
  if(el.id==='act-student-files')return;
  if(el.type==='file')return requestFile(el.files[0],el.name);
  syncField(el);
  if(el.closest('.filters')&&['year','division'].includes(el.name)) {
    if(el.name==='year')year=el.value;else division=el.value;
    el.classList.toggle('active',!!el.value);document.querySelector('#results').innerHTML=results();
  }
    if(el.form?.id==='create-form'&&el.name==='method') {
    dialog.querySelector('#create-next').textContent=el.value==='ai'?'Analizar plan y continuar':'Continuar a unidades';
  }
  if(el.form?.id==='material-form'&&el.name==='unit'){context.drafts[context.mode].topic='';context.locationOpen=true;materialModal();}
  if(el.form?.id==='activity-form')changeActivityField(el);
});
document.addEventListener('invalid',event=>{
  const section=event.target.closest('details');
  if(section)section.open=true;
},true);
document.addEventListener('submit',event=>{
  event.preventDefault();
  const form=event.target, fields=values(form);
  if(form.id==='create-form')return nextCreation();
  if(form.id==='invite-form')return reviewInvites();
  if(form.id==='activity-form')return nextActivity();
  if(form.id==='student-join-form') {
    const code=fields.code.replace(/\s+/g,'');
    if(!/^\d{6}$/.test(code))return modalError('El código tiene 6 números. Revisalo e intentá de nuevo.');
    const r=data.rooms.find(r=>r.state==='active'&&r.code===code);
    if(!r||r.removed?.includes('marina@example.test'))return modalError('No encontramos un aula disponible con ese código. Si saliste antes, pedile una invitación al docente.');
    return confirm('Ver aula',`${r.name} · División ${r.division} · Lucía Demo. ${studentMember(r)?'Ya formás parte de esta aula.':'Confirmá para sumarte al grupo.'}`,studentMember(r)?'Abrir aula':'Confirmar inscripción',()=>{
      if(r.state!=='active'||r.code!==code){studentJoin();return modalError('El código cambió. Pedile el vigente a tu docente.');}
      if(!studentMember(r))r.students.push({id:'marina',name:'Marina Demo',email:'marina@example.test'});
      save();closeModal();navigate(r.id);
    },studentJoin);
  }
  if(form.id==='join-form') {
    const r=room(),code=fields.code.replace(/\s+/g,'');
    if(r.state!=='active'||code!==r.code)return modalError('No encontramos un aula disponible con ese código.');
    return confirm('Confirmar ingreso',`Aula: ${r.name} · División ${r.division} · Docente: Lucía Demo.`,'Unirme al aula',()=>{
      if(r.state!=='active'||r.code!==code){joinModal();return modalError('El código cambió. Pedile el vigente a tu docente.');}
      if(r.removed?.includes('estudiante@example.test')){joinModal();return modalError('Necesitás una invitación para volver a ingresar.');}
      addStudent('estudiante@example.test','Estudiante Demo');log('Estudiante ingresó por código');save();closeModal();tell('Ingreso de ejemplo confirmado.');
    },joinModal);
  }
  if(form.id==='post-form') {
    if(!canConverse())return;
    if(!fields.title.trim()||!fields.body.trim())return modalError('Completá el título y el mensaje.');
    const p=room().posts.find(p=>p.id===context.id);
    if(isStudent())fields.type='Consulta';
    if(p&&ownPost(p))Object.assign(p,fields);else if(!p)room().posts.unshift({id:uid(),...fields,author:isStudent()?'marina':'teacher',date:new Date().toLocaleDateString('es-AR'),replies:[]});
    log(p?'Publicación editada':'Aviso publicado');save();closeModal();tell(p?'Cambios guardados.':'Publicación visible en el aula.');return;
  }
  if(form.id==='material-form') {
    const {mode,drafts,edit}=context,m=drafts[mode];
    if(!m.title.trim()||(mode==='file'?!m.file:!m.body.trim()))return modalError('Completá el título y agregá el archivo o contenido.');
    return busy('Preparando y verificando el material de ejemplo…',()=>{
      const index=room().materials.findIndex(item=>item.id===m.id);
      if(index<0)room().materials.unshift({...m,mode});else room().materials[index]={...m,mode};
      log(edit?'Material actualizado':'Material publicado');save();closeModal();tab='Biblioteca';tell(edit?'Material actualizado.':'Material publicado en Biblioteca.');
    });
  }
  if(form.dataset.form==='reply'&&fields.reply.trim()&&canConverse()){
    room().posts.find(p=>p.id===form.dataset.id).replies.push({author:isStudent()?'marina':'teacher',body:fields.reply.trim()});log('Respuesta publicada');save();tell('Respuesta publicada.');
  }
  if(form.dataset.form==='settings'&&canWrite()){
    if([fields.name,fields.subject,fields.division].some(v=>!v.trim()))return;
    Object.assign(room(),fields);log('Configuración actualizada');save();tell('Datos del aula guardados.');
  }
});
dialog.addEventListener('invalid',event=>{
  const section=event.target.closest('details');
  if(section)section.open=true;
},true);
dialog.addEventListener('toggle',event=>{
  if(event.target.matches('.editor-unit[open]'))event.target.querySelectorAll('textarea').forEach(growField);
},true);
window.addEventListener('resize',()=>{
  dialog.querySelectorAll('.curriculum-editor textarea').forEach(growField);
});
for(const eventType of ['dragover','dragleave','drop']){
  dialog.addEventListener(eventType,event=>{
    const target=event.target.closest('[data-drop]');
    if(!target)return;
    event.preventDefault();target.classList.toggle('over',eventType==='dragover');
    if(eventType==='drop')requestFile(event.dataTransfer.files[0],target.dataset.drop);
  });
}
