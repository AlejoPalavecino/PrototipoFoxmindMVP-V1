/* Compact classroom identity and progress derived exclusively from local demo work. */
function roomGrade(value){
 if(value===null||value===undefined||value==='')return null;
 const number=Number(String(value).replace(',','.'));
 return Number.isFinite(number)&&number>=0&&number<=10?number:null;
}
const roomNumber=n=>n===null?'—':n.toLocaleString('es-AR',{maximumFractionDigits:2});
const roomMean=list=>list.length?list.reduce((sum,n)=>sum+n,0)/list.length:null;
function roomData(c=classroom()){
 teachingInit();learningInit();
 const activities=state.activities.filter(a=>a.classId===c.id&&a.publication!=='draft');
 const byPerson=new Map();
 for(const r of state.reviews){
  const a=learningReviewActivity(r);
  if(a&&activities.some(item=>item.id===a.id)&&c.roster.includes(r.name))byPerson.set(r.name+'|'+a.id,r);
 }
 const people=c.roster.map(name=>{
  const work=activities.map(a=>{
   const review=byPerson.get(name+'|'+a.id);
   const received=!!review||(name==='Marina'&&(!!state.submitted[a.id]||a.state==='graded'));
   const published=review?review.state==='published':name==='Marina'&&a.state==='graded';
   const grade=published?roomGrade(review?(review.publishedFeedback?.grade??state.reviewSaved?.[review.id]?.grade):(a.publishedFeedback?.grade??a.grade)):null;
   return {activity:a,review,received,published,grade};
  });
  return {name,work,received:work.filter(w=>w.received).length,grades:work.filter(w=>w.grade!==null).map(w=>w.grade)};
 });
 const reviews=[...byPerson.values()],grades=people.flatMap(p=>p.grades);
 const topics=curriculumTopics(c),taught=taughtTopicIds(c).length;
 return {activities,people,reviews,grades,average:roomMean(grades),pending:reviews.filter(r=>r.state!=='published'),topics,taught,percent:topics.length?Math.round(taught/topics.length*100):0};
}
function roomQuick(value,label,section,glyph){
 return `<button class="room-quick-link" data-action="room-section" data-room-section="${section}"><span>${icon(glyph)}<b>${esc(value)}</b></span><small>${label}</small></button>`;
}
function classScreen(){
 const c=classroom();if(!c)return collectionEmpty('active');
 const teacher=role==='docente',d=roomData(c),own=d.people.find(p=>p.name==='Marina');
 const section=!teacher&&['historial','ajustes'].includes(tab)?'plan':tab||'plan';
 const sections=[['plan','book','Plan'],['muro','chat','Muro'],['biblioteca','folder','Biblioteca'],['actividades','edit','Actividades'],['progreso','chart',teacher?'Progreso':'Mi progreso'],['integrantes','users',teacher?'Estudiantes':'Compañeros'],...(teacher?[['historial','clock','Historial'],['ajustes','settings','Ajustes']]:[])];
 const pages={plan:planScreen,muro:wallScreen,biblioteca:libraryScreen,actividades:activitiesScreen,progreso:progressScreen,integrantes:membersScreen,historial:historyScreen,ajustes:classSettings};
 return `<div class="classroom-room room-polished">
  <nav class="breadcrumb" aria-label="Ubicación">${link('Mis aulas','aulas')}${icon('chevron')}<span>${esc(c.name)}</span></nav>
  <header class="room-compact-header" data-long-name="${c.name.length>40}">
   <div class="room-identity">${img(c.asset,'room-miniature')}<div><p>${esc(c.subject)} <span>${esc(c.group)} · ${esc(c.year||'2026')}</span></p><h1 tabindex="-1">${esc(c.name)}</h1><small>${icon('users')}${c.roster.length} ${c.roster.length===1?'estudiante':'estudiantes'} <i></i> Lucía Demo</small></div></div>
   <div class="room-quick-links">${teacher?roomQuick(d.pending.length,'por revisar','progreso','edit'):roomQuick(own?d.activities.length-own.received:d.activities.length,'por hacer','actividades','edit')}${roomQuick(d.taught+' / '+d.topics.length,'temas trabajados','plan','book')}</div>
   ${teacher?btn('Invitar','invite','room-invite','plus'):btn('Mi progreso','room-section','room-invite','chart','data-room-section="progreso"')}
  </header>
  <nav class="room-section-nav" aria-label="Secciones del aula">${sections.map(([key,glyph,label])=>`<a href="${routeHash('aula',key,c.id)}" ${section===key?'aria-current="page"':''}>${icon(glyph)}<span>${label}</span></a>`).join('')}</nav>
  <div class="room-body">${(pages[section]||planScreen)()}</div>
 </div>`;
}
function roomMetric(value,label,description,glyph,tone=''){
 return `<article class="room-metric ${tone}"><span>${icon(glyph)}</span><div><p>${label}</p><strong>${esc(value)}</strong><small>${description}</small></div></article>`;
}
function roomRing(value,total,label){
 const percent=total?Math.round(value/total*100):0;
 return `<div class="room-ring" role="img" aria-label="${esc(label)}: ${value} de ${total}, ${percent}%"><svg viewBox="0 0 120 120" aria-hidden="true"><circle class="room-ring-track" cx="60" cy="60" r="50"/><circle class="room-ring-fill" cx="60" cy="60" r="50" stroke-dasharray="${percent*3.14159} 314.159"/></svg><div aria-hidden="true"><b>${percent}%</b><small>${value} de ${total}</small></div></div>`;
}
function roomSubmissionsChart(d){
 return `<section class="room-chart-panel room-submission-chart"><header><div><h3>Cómo vienen las entregas</h3><p>Una mirada por actividad, para saber dónde acompañar.</p></div>${icon('layers')}</header>
 <div class="room-chart-legend"><span class="to-review">Por revisar</span><span class="saved">Revisión privada</span><span class="published">Publicada</span><span class="missing">Sin entrega</span></div>
 <div class="room-bars">${d.activities.length?d.activities.map(a=>{
  const work=d.people.map(p=>p.work.find(w=>w.activity.id===a.id)),total=work.length;
  const published=work.filter(w=>w.published).length,saved=work.filter(w=>w.received&&!w.published&&w.review?.state==='saved').length,pending=work.filter(w=>w.received&&!w.published&&w.review?.state!=='saved').length,missing=total-published-saved-pending;
  return `<article><div><button data-action="room-open-deliveries" data-id="${a.id}">${esc(a.title)}${icon('chevron')}</button><b>${total-missing}<small> / ${total}</small></b></div><div class="room-stacked-bar" role="img" aria-label="${esc(a.title)}: ${pending} por revisar, ${saved} revisiones privadas, ${published} publicadas, ${missing} sin entrega">${[[pending,'to-review'],[saved,'saved'],[published,'published'],[missing,'missing']].map(([n,cls])=>n?`<span class="${cls}" style="width:${total?n/total*100:0}%"></span>`:'').join('')}</div><p>${pending} por revisar · ${published} con devolución publicada</p></article>`;
 }).join(''):'<p class="room-chart-empty">Las actividades que compartas van a aparecer acá.</p>'}</div></section>`;
}
function roomGradesChart(d){
 const ranges=[[0,4,'0–3,9'],[4,6,'4–5,9'],[6,8,'6–7,9'],[8,11,'8–10']],counts=ranges.map(([lo,hi])=>d.grades.filter(g=>g>=lo&&g<hi).length),max=Math.max(...counts,1);
 return `<section class="room-chart-panel room-grade-chart"><header><div><h3>Resultados publicados</h3><p>Sólo las notas que ya compartiste.</p></div>${icon('chart')}</header>${d.grades.length?`<div class="room-grade-summary"><b>${roomNumber(d.average)}<small> / 10</small></b><span>Promedio de ${d.grades.length} ${d.grades.length===1?'calificación':'calificaciones'}</span></div><div class="room-histogram" role="img" aria-label="Distribución de notas: ${ranges.map((r,i)=>r[2]+': '+counts[i]).join('; ')}">${ranges.map((r,i)=>`<div aria-hidden="true"><b>${counts[i]}</b><div><span style="height:${counts[i]/max*100}%"></span></div><small>${r[2]}</small></div>`).join('')}</div><p class="room-chart-note">Cantidad de calificaciones por rango.</p>`:`<div class="room-grades-empty">${icon('chart')}<h4>Todavía no hay notas publicadas</h4><p>Cuando compartas una devolución, su nota se suma a esta gráfica.</p></div>`}</section>`;
}
function roomPeoplePanel(d){
 return `<section class="room-chart-panel room-people-panel"><header><div><h3>Cada estudiante, su recorrido</h3><p>Entregas confirmadas y notas publicadas. Las revisiones privadas no cuentan como nota.</p></div></header><div class="room-student-list">${d.people.map((p,i)=>`<article class="room-student-row"><div class="person">${avatar(p.name,['mint','sky','rose'][i%3])}<b>${esc(p.name)} Demo</b></div><dl><div><dt>Entregas</dt><dd>${p.received} <small>/ ${d.activities.length}</small></dd></div><div><dt>Promedio publicado</dt><dd>${roomNumber(roomMean(p.grades))}</dd></div></dl>${btn('Ver recorrido','student-card','quiet','chevron',`data-name="${esc(p.name)}"`)}</article>`).join('')||'<p class="room-chart-empty">Invitá a tu grupo para empezar a acompañar sus recorridos.</p>'}</div></section>`;
}
function progressScreen(){
 const c=classroom(),d=roomData(c);
 if(role==='estudiante')return roomStudentProgress(c,d);
 const received=d.people.reduce((n,p)=>n+p.received,0),possible=d.people.length*d.activities.length;
 return `<div class="room-progress-page"><header class="room-page-heading"><div><h2>Una mirada a tu grupo</h2><p>Qué ya avanzó y dónde podés hacer la diferencia.</p></div><span class="room-live-label">${icon('check')}Datos de esta aula</span></header>
 <div class="room-metrics">${roomMetric(d.pending.length,'Por acompañar',d.pending.length?'Entregas que esperan tu devolución':'Las revisiones están al día','chat','peach')}${roomMetric(received+' / '+possible,'Entregas recibidas','Sobre las actividades compartidas','file','sky')}${roomMetric(d.percent+'%','Plan trabajado',d.taught+' de '+d.topics.length+' temas dados','book','mint')}</div>
 <div class="room-charts-grid">${roomSubmissionsChart(d)}${roomGradesChart(d)}</div>
 <section class="room-review-queue"><div><span>${icon(d.pending.length?'chat':'check')}</span><div><h3>${d.pending.length?'Tu próximo acompañamiento':'Cada devolución, un paso más'}</h3><p>${d.pending.length?`${esc(d.pending[0].name)} está esperando tu mirada sobre «${esc(d.pending[0].title)}».`:'Cuando llegue un trabajo, vas a encontrar acá el próximo para revisar.'}</p></div></div>${d.pending.length?btn('Revisar entrega','review','primary','arrow',`data-id="${d.pending[0].id}"`):btn('Ver actividades','room-section','','layers','data-room-section="actividades"')}</section>
 ${roomPeoplePanel(d)}</div>`;
}
function roomStudentProgress(c,d){
 const own=d.people.find(p=>p.name==='Marina')||{work:[],received:0,grades:[]},published=own.work.filter(w=>w.published);
 return `<div class="room-progress-page"><header class="room-page-heading"><div><h2>Tu recorrido, paso a paso</h2><p>Lo que compartiste y las devoluciones que te ayudan a seguir.</p></div></header><div class="room-own-progress"><section class="room-chart-panel room-own-summary">${roomRing(own.received,d.activities.length,'Actividades entregadas')}<div><h3>Tu trabajo va tomando forma</h3><p>${own.received} de ${d.activities.length} actividades con entrega confirmada.</p>${btn('Seguir con mis actividades','room-section','','arrow','data-room-section="actividades"')}</div></section><section class="room-chart-panel room-own-grade"><span>${icon('chat')}</span><p>Tu promedio publicado</p><b>${roomNumber(roomMean(own.grades))}<small> / 10</small></b><span>${own.grades.length?own.grades.length+(own.grades.length===1?' calificación compartida':' calificaciones compartidas')+' por tu docente':'Todavía no hay notas publicadas'}</span></section></div>
 <section class="room-chart-panel"><header><div><h3>Tus devoluciones</h3><p>Una pista para reconocer tus avances y seguir aprendiendo.</p></div></header>${published.length?published.map(w=>`<div class="room-result-row"><span>${icon(learningTypeIcon(w.activity))}</span><div><h4>${esc(w.activity.title)}</h4><p>${esc(w.activity.type)}</p></div><b>${roomNumber(w.grade)}<small> / 10</small></b>${btn('Ver devolución','room-open-result','','chat',`data-id="${w.activity.id}"`)}</div>`).join(''):'<p class="room-chart-empty">Tu docente va a compartir sus comentarios acá después de revisar tu trabajo.</p>'}</section>
 <section class="room-chart-panel room-unit-progress"><header><div><h3>El camino de la clase</h3><p>Temas trabajados con tu grupo; este avance es distinto de tus calificaciones.</p></div></header>${curriculumUnits(c).map(u=>{const n=u.topics.filter(t=>taughtTopicIds(c).includes(t.id)).length;return `<article><div><h4>${esc(u.title)}</h4><span>${n} de ${u.topics.length} temas</span></div><div class="progress-track" role="progressbar" aria-label="${esc(u.title)}" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="${u.topics.length}"><span style="width:${u.topics.length?n/u.topics.length*100:0}%"></span></div></article>`;}).join('')}</section></div>`;
}
function roomPersonDialog(name){
 if(role!=='docente')return;
 const d=roomData(),p=d.people.find(p=>p.name===name);if(!p)return;
 showDialog('El recorrido de '+esc(name),classroom().name,`<div class="room-person-summary">${avatar(name,'mint')}<div><b>${p.received} de ${d.activities.length} entregas</b><p>Promedio publicado: ${roomNumber(roomMean(p.grades))}</p></div></div><div class="room-person-work">${p.work.map(w=>`<article><div><h3>${esc(w.activity.title)}</h3><p>${w.published?'Devolución publicada':w.received?w.review?.state==='saved'?'Revisión privada guardada':'Entrega por revisar':'Sin entrega confirmada'}</p></div>${w.review?btn(w.published?'Consultar':'Revisar','review','quiet','chevron',`data-id="${w.review.id}"`):w.grade!==null?status(roomNumber(w.grade)+' / 10','green'):''}</article>`).join('')||'<p>Todavía no hay actividades compartidas.</p>'}</div>`,btn('Volver al progreso','close'),true);
}
function installRoomPolish(){
 const oldMaterial=actions.material;
 Object.assign(actions,{
  'room-section':b=>go('aula',b.dataset.roomSection),
  'room-open-deliveries':b=>{openActivity(b.dataset.id);go('actividad-detalle','entregas');},
  'room-open-result':b=>{openActivity(b.dataset.id);go('resultado');},
  'student-card':b=>roomPersonDialog(b.dataset.name),
  material:()=>{
   if(!['actividad-detalle','actividad','corregir','recibo','resultado'].includes(view)){oldMaterial();return;}
   const a=activity(),c=state.classes.find(c=>c.id===a.classId),topics=learningTopics(a);
   const resources=teachingMaterials(c).filter(m=>m.activityIds.includes(a.id)||topics.some(t=>m.topicId===t.id||(!m.topicId&&m.unitId===t.unitId)));
   showDialog('Materiales para esta actividad',esc(a.title),resources.length?teachingMaterialList(resources,c):'<p class="teaching-empty">Todavía no hay materiales vinculados a esta actividad ni a sus temas.</p>',btn('Volver a la actividad','close'),true);
  }
 });
 const review=actions.review;
 actions.review=b=>{if($('#dialog').open)closeDialog();review(b);};
}
