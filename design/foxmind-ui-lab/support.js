/* Acompañamiento en el escenario local del viernes 13 de noviembre. */
const supportDate = '2026-11-13';
const supportStates = ['Prioridad alta','Prioridad media','Prioridad baja','Sin evidencia suficiente'];
let supportClass = '';
let supportExpanded = false;

function addSupportExamples(model) {
  addSupportHistory(model);
  if (model.supportExamples || !model.classes.some(c => c.id === 'photo')) return;
  const id = 'support-frame';
  model.activities.push({id,title:'Decisiones de encuadre',classId:'photo',type:'Trabajo práctico',
    due:'Vie 6 nov, 18:00',state:'graded',grade:'7',supportDue:'2026-11-06',spec:{instructions:'Explicá dos decisiones de encuadre y el efecto que buscaste.'}});
  for (const name of ['Marina','Tomás']) {
    model.reviews.push({id:'frame-'+name,classId:'photo',name,activityId:id,title:'Decisiones de encuadre',
      state:'published',received:'6 de noviembre',publishedFeedback:{grade:'7'},
      receipt:{at:'6 de noviembre',files:[],comment:'Dejé la ventana fuera del encuadre para concentrar la mirada en el rostro.'}});
  }
  const contrast = model.activities.find(a=>a.id==='contrast');
  if (contrast) contrast.supportDue='2026-11-10';
  for (const name of ['Mateo','Sofía','Joaquín']) {
    for (const activityId of [id,'contrast']) {
      const a=model.activities.find(item=>item.id===activityId);
      if(a) model.reviews.push({id:activityId+'-'+name,classId:'photo',name,activityId,title:a.title,
        state:'published',received:'10 de noviembre',publishedFeedback:{grade:'8'}});
    }
  }
  model.supportExamples=true;
}

function supportPerson(c,p) {
  const due=p.work.filter(w=>(w.activity.supportDue||w.activity.spec?.date||'9999')<supportDate);
  const missing=due.filter(w=>!w.received);
  const level=missing.length>=2?0:missing.length?1:due.length>=2?2:3;
  const reason=missing.length?'Pendiente'+(missing.length===1?'':'s')+': '+missing.map(w=>w.activity.title).join(' y ')+'.':
    level===2?'Entregó las actividades con plazo cumplido.':'Todavía hay pocas actividades con plazo cumplido.';
  return {c,p,due,missing,level,reason};
}
function supportBadge(level) {
  return '<span class="support-badge support-tone-'+level+'"><i aria-hidden="true"></i>'+supportStates[level]+'</span>';
}
function addSupportHistory(model) {
  const room=model.classes.find(c=>c.id==='photo');
  if(!room || model.activities.some(a=>a.id==='support-shadow')) return;
  for(const [id,title,date,grade] of [
    ['support-shadow','Luces y sombras','2026-10-23',6],
    ['support-depth','Planos y profundidad','2026-10-30',8]
  ]) {
    const instructions='Describí una decisión de composición y explicá qué efecto tiene sobre quien mira.';
    model.activities.push({id,title,classId:room.id,type:'Trabajo práctico',due:date,state:'graded',grade:String(grade),supportDue:date,spec:{instructions}});
    for(const name of room.roster) {
      model.reviews.push({id:id+'-'+name,classId:room.id,name,activityId:id,title,state:'published',
        received:date,publishedFeedback:{grade:String(grade)},receipt:{at:date,files:[],
        comment:id==='support-depth'?'Dejé la bicicleta en primer plano y el edificio al fondo.':'Moví la lámpara hacia un costado para que se vea la textura de la pared.'}});
    }
  }
}
function supportWidget() {
  const rooms=activeClassrooms();
  const selected=rooms.find(c=>c.id===supportClass);
  if(!selected) supportClass='';
  const people=(selected?[selected]:rooms).flatMap(c=>roomData(c).people.map(p=>supportPerson(c,p)))
    .filter(person=>person.level<3)
    .sort((a,b)=>a.level-b.level||a.p.name.localeCompare(b.p.name,'es'));
  const visible=supportExpanded?people:people.slice(0,3);
  return `<section class="panel support-widget" id="support-widget" aria-labelledby="support-title">
    <header class="support-heading"><div class="support-title"><span class="support-icon">${icon('chart')}</span><h2 id="support-title">Semáforo de acompañamiento</h2></div>
    <button class="button support-filter" id="support-filter" data-action="support-filter" aria-haspopup="dialog">${icon('layers')}<span>${esc(selected?.name||'Todas mis aulas')}</span>${icon('chevron')}</button></header>
    ${people.length?`<div class="support-counts" role="group" aria-label="Prioridad por inscripción">${['Alta','Media','Baja'].map((label,i)=>`<div class="support-tone-${i}"><i aria-hidden="true"></i><span>${label}</span><strong>${people.filter(r=>r.level===i).length}</strong></div>`).join('')}</div>`:''}
    <div class="support-list">${visible.map(({c,p,level,reason})=>`<article class="support-row">${avatar(esc(p.name),c.color||'sky')}<div class="support-copy"><b>${esc(p.name)} Demo</b><small>${esc(c.name)}</small><p>${esc(reason)}</p></div>${supportBadge(level)}${btn('Ver ficha','support-card','support-open','chevron',`data-name="${esc(p.name)}" data-room="${esc(c.id)}" aria-label="Ver ficha de ${esc(p.name)} en ${esc(c.name)}"`)}</article>`).join('')||'<p class="support-empty">Todavía no hay estudiantes con prioridad asignada para esta selección.</p>'}</div>
    ${people.length>3?`<footer class="support-footer"><span>${visible.length} de ${people.length} inscripciones</span>${btn(supportExpanded?'Mostrar menos':'Ver todos','support-more','support-all',supportExpanded?'back':'arrow',`aria-expanded="${supportExpanded}"`)}</footer>`:''}</section>`;
}
function refreshSupport(selector) {
  document.getElementById('support-widget').outerHTML=supportWidget();
  document.querySelector(selector)?.focus({preventScroll:true});
}
function supportPicker() {
  const rooms=activeClassrooms();
  const options=[{id:'',name:'Todas mis aulas'},...rooms].map(c=>`<button class="support-choice" data-action="support-select" data-room="${esc(c.id)}" aria-pressed="${supportClass===c.id}">
    ${c.asset?img(c.asset,'support-cover',''):`<span class="support-icon">${icon('layers')}</span>`}<span><b>${esc(c.name)}</b><small>${esc(c.group||rooms.length+' aulas activas')}</small></span><i>${supportClass===c.id?icon('check'):''}</i></button>`).join('');
  showDialog('Filtrar por aula','',`<div class="support-choices">${options}</div>`);
}
function supportWriting(p) {
  const work=p.work.find(w=>w.activity.id==='support-depth'&&w.review?.receipt?.comment==='Dejé la bicicleta en primer plano y el edificio al fondo.');
  return work && {work,strong:'Distingue el primer plano y el fondo al describir su foto.',improve:'Le falta explicar qué efecto buscó al ubicar la bicicleta en primer plano.'};
}
function supportAttributes(c,name) {
  return `data-room="${esc(c.id)}" data-name="${esc(name)}"`;
}
function supportEvidence(c,name) {
  if(role!=='docente'||!activeClassrooms().includes(c))return;
  const p=roomData(c).people.find(person=>person.name===name);
  const source=p&&supportWriting(p);
  if(!source)return;
  const w=source.work;
  showDialog(esc(w.activity.title),esc(name)+' Demo · '+esc(c.name),
    `<article class="support-reader">
      <header>${avatar(esc(name),'sky')}<div><strong>${esc(name)} Demo</strong><small>Entrega del ${new Date(w.review.receipt.at+'T12:00:00').toLocaleDateString('es-AR',{day:'numeric',month:'long'})}</small></div>${w.grade!==null?`<span class="support-result">Nota publicada <b>${roomNumber(w.grade)} / 10</b></span>`:''}</header>
      <section><h3>Consigna</h3><p>${esc(w.activity.spec.instructions)}</p></section>
      <section class="support-answer"><h3>Respuesta de ${esc(name)}</h3><blockquote>${esc(w.review.receipt.comment)}</blockquote></section>
      <footer><h3>Qué se observa en esta entrega</h3><p>${esc(source.strong)} ${esc(source.improve)}</p></footer></article>`,
    btn('Volver a la ficha','support-back','primary','back',supportAttributes(c,name)),true);
}
function supportDialog(c,name) {
  if(role!=='docente'||!activeClassrooms().includes(c))return;
  const p=roomData(c).people.find(person=>person.name===name);
  if(!p)return;
  const {level,reason,due,missing}=supportPerson(c,p);
  const grades=p.work.filter(w=>w.grade!==null).sort((a,b)=>(a.activity.supportDue||a.activity.spec?.date||'').localeCompare(b.activity.supportDue||b.activity.spec?.date||''));
  const sample=supportWriting(p);
  const done=due.length-missing.length;
  const trend=grades.length>1?`<section class="support-chart"><header><h3>Notas por actividad</h3><small>Escala de 0 a 10</small></header><div>${grades.map(w=>`<div class="support-grade"><span>${esc(w.activity.title)}</span><i aria-hidden="true"><u style="width:${w.grade*10}%"></u></i><b>${roomNumber(w.grade)}</b></div>`).join('')}</div></section>`:'';
  const point=(title,text,glyph)=>`<section><h3>${icon(glyph)}${title}</h3>${sample?`<ul><li>${text}</li></ul>`:'<p>Todavía falta evidencia.</p>'}</section>`;
  showDialog(esc(name)+' Demo',esc(c.name)+' · '+esc(c.group),`<div class="support-detail">
    <section class="support-signal support-tone-${level}">${supportBadge(level)}<p>${esc(reason)}</p></section>
    <div class="support-metrics"><section><small>Promedio publicado</small><strong>${grades.length?roomNumber(roomMean(p.grades)):'Sin notas'}</strong><span>${grades.length} actividades con nota</span></section>
    <section><small>Entregas al cierre</small><strong>${due.length?done+' de '+due.length:'Sin plazos'}</strong>${due.length?`<div class="support-track" aria-hidden="true"><i style="width:${100*done/due.length}%"></i></div>`:''}<span>Al 13 de noviembre</span></section></div>
    ${trend}<section class="support-observations" aria-label="Observaciones sobre el trabajo">
    ${sample?`<header class="support-source"><div><small>Observaciones sobre la entrega</small><h3>${esc(sample.work.activity.title)}</h3></div>${btn('Leer entrega','support-evidence','support-open','chevron',supportAttributes(c,name))}</header>`:''}
    <div class="support-points">${point('Puntos fuertes',sample?.strong,'check')}${point('Aspectos a reforzar',sample?.improve,'edit')}</div></section>
    <aside><h3>${icon('chat')} Qué podés probar</h3><p>${missing.length?'Preguntale cómo viene con «'+esc(missing[0].activity.title)+'» y acuerden un primer paso.':sample?'Pedile dos encuadres de la misma escena y comparen qué se destaca en cada uno.':'Revisen juntos la próxima consigna.'}</p></aside></div>`,btn('Cerrar ficha','close'),true);
}
