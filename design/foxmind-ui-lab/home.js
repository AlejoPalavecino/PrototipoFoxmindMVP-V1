/* Home refinement: one welcome, a clear next action, and content-sized widgets. */
function homeWelcome(teacher,pending){
 const summary=teacher?(pending.length?`Tenés ${pending.length} ${pending.length===1?'entrega':'entregas'} para revisar. Vamos de a una.`:'Tus entregas están al día. Hay espacio para una nueva idea.'):(pending.length?`Tenés ${pending.length} ${pending.length===1?'actividad':'actividades'} para seguir aprendiendo.`:'Tus actividades están al día. Seguí explorando a tu ritmo.');
 return `<section class="home-welcome ${teacher?'for-teacher':'for-student'}" aria-labelledby="home-title">
  <div class="home-welcome-copy"><p class="home-date">${icon('calendar')} Viernes 13 de noviembre</p><h1 id="home-title" tabindex="-1">${teacher?'Hola':'Buen día'}, ${esc(state.profile[role])}.</h1><p class="home-summary">${summary}</p>
   <div class="home-welcome-actions">${teacher?btn('Crear actividad','choose-class','primary','plus')+btn('Preparar con Foxy','open-foxy','home-secondary','spark'):(pending.length?btn('Continuar actividad','continue-first','primary','play'):'')+btn('Mi estudio','open-study-home','home-secondary','folder')}</div>
   <p class="home-welcome-note">${icon(teacher?'users':'book')}${teacher?'Cada devolución abre una nueva posibilidad.':'Un tema, una pregunta, un nuevo descubrimiento.'}</p>
  </div>
  <div class="home-illustration" aria-hidden="true"><div class="home-sun"></div><div class="home-orbit"></div><span class="home-star star-left">${icon('spark')}</span><span class="home-star star-right">${icon('plus')}</span><div class="home-notebook"><span>${icon(teacher?'edit':'book')}</span><i></i><i></i><i></i></div>${img('foxy','home-fox')}<span class="home-scene-label">${icon('spark')}${teacher?'Una idea lleva a otra':'Aprender es descubrir'}</span></div>
 </section>`;
}
function setHomeFilter(filter){
 const position=window.scrollY;homeFilter=filter;render();window.scrollTo(0,position);$(`[data-action="home-${filter}"]`)?.focus({preventScroll:true});
}
function homeReviewRow(r,i){
 const saved=r.state==='saved';
 return `<button class="submission-row" data-action="review" data-id="${esc(r.id)}" aria-label="${saved?'Retomar':'Revisar'} entrega de ${esc(r.name)}: ${esc(r.title)}">${avatar(r.name,['mint','sky','rose'][i%3])}<span class="submission-copy"><strong>${esc(r.name)}</strong><span>${esc(r.received)}</span>${saved?'<small class="submission-saved">Devolución guardada · privada</small>':''}</span><span class="submission-action">${saved?'Retomar':'Revisar'}${icon('chevron')}</span></button>`;
}
function homeReviewGroups(reviews){
 const groups=new Map();for(const review of reviews){const key=JSON.stringify([review.classId,review.title]);if(!groups.has(key))groups.set(key,[]);groups.get(key).push(review);}
 return [...groups.values()].map(rows=>{const first=rows[0],c=state.classes.find(c=>c.id===first.classId);return `<section class="review-group tone-${esc(c?.color||'sky')}"><header class="review-group-heading">${img(c?.asset||'literature','review-subject-image')}<div><p>${esc(c?.name)}</p><h3>${esc(first.title)}</h3></div><span class="review-group-count">${rows.length} ${rows.length===1?'entrega':'entregas'}</span></header><div class="review-group-people">${rows.map(homeReviewRow).join('')}</div></section>`;}).join('');
}
function homeActivity(a,featured=false){
 const c=state.classes.find(c=>c.id===a.classId),draft=Object.values(state.answers[a.id]||{}).some(v=>String(v).trim())||(a.type==='Trabajo práctico'&&!!state.tpFile);
 return `<article class="learning-tile tone-${esc(c?.color||'sky')} ${featured?'featured':''}" aria-labelledby="learning-${esc(a.id)}"><div class="learning-cover">${img(c?.asset||'literature')}<span class="learning-kind">${icon(a.type==='Cuestionario'?'file':'edit')}${esc(a.type)}</span></div><div class="learning-body"><p class="learning-course">${esc(c?.name)}</p><h3 id="learning-${esc(a.id)}">${esc(a.title)}</h3><div class="learning-deadline">${icon('calendar')}<span><small>Fecha de entrega</small><b>${esc(a.due)}</b></span></div></div><footer class="learning-footer"><span class="learning-state ${draft?'has-draft':''}">${icon(draft?'check':'book')}${draft?'Borrador guardado':'Por empezar'}</span>${btn(draft?'Continuar':'Empezar','open-activity',featured?'primary':'learning-secondary','play',`data-id="${esc(a.id)}" aria-label="${draft?'Continuar':'Empezar'} ${esc(a.title)}"`)}</footer></article>`;
}
function homeScreen(){
 const teacher=role==='docente',pending=teacher?pendingReviews():studentPending(),events=state.events.filter(e=>e.day===13&&(e.month??10)===10).sort((a,b)=>a.time.localeCompare(b.time));
 const queries=teacher?state.posts.filter(p=>p.type==='Consulta'&&!p.replies?.some(r=>r.role==='docente')&&activeClassrooms().some(c=>c.id===p.classId)):[];
 const reviewContent=!teacher?'':homeFilter==='reviews'?(homeReviewGroups(pending)||empty('Tus devoluciones están al día','Cuando llegue una entrega, la vas a encontrar acá.','',true)):(queries.map(p=>`<button class="home-review-row home-question" data-action="home-query" data-id="${esc(p.id)}">${avatar(p.name,'sky')}<span class="home-review-copy"><span class="home-person">${esc(p.name)} <span>te consulta</span></span><b>${esc(p.title)}</b><span class="home-row-meta">${esc(state.classes.find(c=>c.id===p.classId)?.name)} <span>· ${esc(p.time)}</span></span></span><span class="home-row-action">Responder${icon('chat')}</span></button>`).join('')||empty('Tus consultas están al día','Las nuevas consultas del muro van a aparecer acá.','',true));
 const learningContent=teacher?'':pending.length?pending.slice(0,3).map((a,i)=>homeActivity(a,i===0)).join(''):empty('Un buen momento para explorar','Ya completaste tus actividades. Podés seguir con tus materiales.',btn('Ir a mi estudio','open-study-home','','folder'),true);
 return `${homeWelcome(teacher,pending)}${teacher?supportWidget():''}<div class="home-grid home-dashboard"><section class="panel home-priorities ${teacher?'home-teacher-queue':'home-student-queue'}"><div class="panel-header"><div><h2>${teacher?'Por acompañar':'Tu próximo paso'}</h2><p>${teacher?'Tu mirada hace la diferencia.':'Un paso a la vez. Empezá por acá.'}</p></div><span class="home-widget-icon" aria-hidden="true">${icon(teacher?'chat':'book')}</span></div>
 ${teacher?`<div class="home-queue-tabs" aria-label="Pendientes docentes"><button aria-pressed="${homeFilter==='reviews'}" data-action="home-reviews">${icon('file')}Entregas <span>${pending.length}</span></button><button aria-pressed="${homeFilter==='queries'}" data-action="home-queries">${icon('chat')}Consultas <span>${queries.length}</span></button></div><div class="home-review-list">${reviewContent}</div>`:`<div class="learning-deck">${learningContent}</div><div class="home-priorities-footer">${link('Ver actividades del aula','aula/actividades','arrow','text-button')}</div>`}</section>
 ${homeDayWidget(events)}</div>
 <section><div class="section-head"><h2>Tus aulas</h2>${link('Ver mis aulas','aulas','arrow','text-button')}</div><div class="class-grid">${activeClassrooms().slice(0,3).map(classCard).join('')}</div></section>`;
}

