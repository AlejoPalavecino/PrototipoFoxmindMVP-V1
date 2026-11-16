/* Private review and explicit publication. Student results read the published snapshot. */
let nextReviewTarget=null;
const gradingTabs=new Map();
const gradingQuestions=new Map();
const gradingSections=[['rubric','Rúbrica y nota'],['feedback','Devolución']];

function reviewRecord() {
  return state.reviews.find(r=>r.id===reviewId)||state.reviews[0];
}

function reviewWork(r=reviewRecord()) {
  const a=learningReviewActivity(r)||activity();
  return r.receipt||(r.name==='Marina'?state.submitted[a.id]:null)||{
    at:r.received,
    files:a.type==='Trabajo práctico'?['Trabajo de '+r.name+'.pdf']:[],
    comment:a.type==='Trabajo práctico'?'Comparé distintas versiones de una misma escena. Cambié la exposición para observar qué detalles aparecían en las zonas de luz y sombra.':'',
    answers:Object.fromEntries(learningQuestions(a).map((q,i)=>[i,q.kind==='text'?'Observé los ejemplos del material y relacioné las diferencias con lo que trabajamos en clase.':q.kind==='multiple'?['0','1']:'0']))
  };
}

function reviewValues(r=reviewRecord()) {
  const a=learningReviewActivity(r)||activity();
  return state.reviewDraft[r.id]||{grade:'',strengths:'',improvements:'',next:'',feedback:'',criteria:Object.fromEntries(learningRubric(a).map(c=>[c.id,'']))};
}

function suggestedReviewGrade(a,d) {
  const rubric=learningRubric(a);
  const scores=rubric.map(c=>d.criteria?.[c.id]);
  if(scores.some(score=>score===''||score==null||!Number.isFinite(Number(score))||Number(score)<0||Number(score)>10)) return null;
  return Math.round(rubric.reduce((n,c,i)=>n+Number(scores[i])*Number(c.weight)/100,0)*100)/100;
}

function gradingAnswer(a,r,work) {
  const questions=learningQuestions(a);
  if(!questions.length) return '<p class="grading-empty">Esta entrega no tiene respuestas para revisar.</p>';
  const index=Math.min(gradingQuestions.get(r.id)||0,questions.length-1), q=questions[index];
  const answer=workAnswerText(a,work.answers?.[index],index);
  const reference=q.correct.map(v=>q.options[v]).filter(Boolean).join(' / ');
  return `<div class="grading-answer">
    <nav class="grading-question-nav" aria-label="Respuestas de la entrega">
      <span>Respuesta ${index+1} de ${questions.length}</span>
      <div>${questions.map((_,i)=>`<button type="button" data-action="learning-review-question" data-review-question="${i}" aria-label="Respuesta ${i+1}" ${index===i?'aria-current="step"':''}>${i+1}</button>`).join('')}</div>
    </nav>
    <article class="review-question">
      <div><h3 id="grading-response-title">${esc(q.title)}</h3><b>${esc(q.points)} pt</b></div>
      <p>${esc(answer)}</p>
      ${q.kind!=='text'&&reference?`<small>${icon('lock')} Referencia docente · ${esc(reference)}</small>`:''}
    </article>
  </div>`;
}

function reviewContentMarkup(a,r) {
  const work=reviewWork(r);
  return `<div class="review-work-header">${status('Entrega confirmada','green','check')}<span>${esc(work.at||r.received)}</span></div>${a.type==='Trabajo práctico'?`
    <div class="review-file-list">${(work.files||[]).map(f=>`<article>${icon('file')}<div><b>${esc(f)}</b><small>Archivo de la entrega</small></div>
      ${btn('Ver archivo','learning-review-file','quiet','book',`data-file="${esc(f)}"`)}</article>`).join('')||'<p>No se adjuntaron archivos.</p>'}</div>
    <h3>Comentario de ${esc(r.name)}</h3><p class="learning-instructions grading-work-comment">${esc(work.comment||'Sin comentario adicional.')}</p>`
    :`<div id="grading-answers">${gradingAnswer(a,r,work)}</div>`}`;
}

function gradingRubricFields(a,d,suggested) {
  return `<p class="grade-helper">Puntuá cada criterio de 0 a 10. Su peso determina la nota sugerida.</p>
    <div class="grade-criteria">${learningRubric(a).map((c,i)=>`<div><label for="criterion-${i}"><b>${esc(c.title)}</b>
      <span>${esc(c.weight)}%${c.description?' · '+esc(c.description):''}</span></label>
      <input id="criterion-${i}" type="number" min="0" max="10" step="0.01" data-review-criterion="${esc(c.id)}" value="${esc(d.criteria?.[c.id]??'')}" placeholder="—"></div>`).join('')}</div>
    <div class="grade-suggestion"><div><span>Nota sugerida</span><b id="learning-suggested-grade">${suggested===null?'—':suggested.toLocaleString('es-AR')}</b></div>
      ${btn('Usar esta nota','learning-use-grade','quiet','check',suggested===null?'disabled':'')}</div>
    <div class="grade-final"><label for="grade">Calificación final <span>De 0 a 10</span></label>
      <input id="grade" data-review-field="grade" name="grade" type="number" min="0" max="10" step="0.01" value="${esc(d.grade??'')}" required placeholder="—"></div>`;
}

function gradingFeedbackFields(d,published) {
  return `<div class="grade-feedback-fields">
    <div><label for="feedback-strengths">Lo que hiciste bien</label><textarea id="feedback-strengths" data-review-field="strengths" maxlength="1600" rows="2" placeholder="Reconocé una idea o decisión…">${esc(d.strengths||'')}</textarea></div>
    <div><label for="feedback-improvements">Para seguir creciendo</label><textarea id="feedback-improvements" data-review-field="improvements" maxlength="1600" rows="2" placeholder="Explicá qué puede mejorar y cómo…">${esc(d.improvements||'')}</textarea></div>
    <div><label for="feedback-next">Tu próximo paso</label><input id="feedback-next" data-review-field="next" maxlength="1000" value="${esc(d.next||'')}" placeholder="Proponé una acción concreta"></div>
    ${!published||d.feedback?`<div><label for="feedback-legacy">Comentario general <small>(opcional)</small></label><textarea id="feedback-legacy" data-review-field="feedback" maxlength="5000" rows="2">${esc(d.feedback||'')}</textarea></div>`:''}
  </div>${published?'':btn('Pedir una mirada a Foxy','ai-grade','quiet','spark')}`;
}

function gradingFootState(r) {
  if(r.state==='published') return icon('check')+'Devolución publicada';
  if(state.reviewDirty?.[r.id]) return icon('lock')+'Cambios por guardar';
  if(r.state==='saved') return icon('lock')+'Guardada en privado';
  return icon('lock')+'Revisión privada';
}

function gradingScreen() {
  learningInit();
  const r=reviewRecord();
  if(!r) return focusShell(empty('No hay entregas por revisar','Volvé al aula para continuar.',btn('Volver al aula','back-activities')));
  const a=learningReviewActivity(r)||activity();
  activityId=a.id;
  state.selectedClass=a.classId;
  const published=r.state==='published', d=published&&r.publishedFeedback?r.publishedFeedback:reviewValues(r);
  const suggested=suggestedReviewGrade(a,d), current=gradingTabs.get(r.id)||'rubric';
  const peers=state.reviews.filter(x=>learningReviewActivity(x)?.id===a.id), index=peers.indexOf(r);
  const panels=[['rubric',gradingRubricFields(a,d,suggested)],['feedback',gradingFeedbackFields(d,published)]];
  return focusShell(`<div class="grading-workspace">
    <header class="grading-heading">
      <div class="person">${avatar(r.name,'mint')}<div><span>${esc(a.title)}</span><h1 tabindex="-1">Entrega de ${esc(r.name)}</h1></div></div>
      <nav class="grading-navigation" aria-label="Entregas">
        ${btn('Anterior','learning-prev-review','quiet','back',`aria-label="Entrega anterior" ${index<=0?'disabled':''}`)}
        <span>${index+1} de ${peers.length}</span>
        ${btn('Siguiente','learning-next-review','quiet','arrow',`aria-label="Siguiente entrega" ${index>=peers.length-1?'disabled':''}`)}
      </nav>
    </header>
    <div class="grading-columns">
      <section class="learning-section review-work" aria-labelledby="grading-work-title">
        <div class="learning-section-title"><span>${icon('file')}</span><h2 id="grading-work-title">Trabajo entregado</h2>${btn('Ver consigna','learning-work-guide','quiet','book')}</div>
        ${reviewContentMarkup(a,r)}
      </section>
      <section class="learning-section review-editor" aria-labelledby="grading-editor-title">
        <div class="learning-section-title"><span>${icon('edit')}</span><h2 id="grading-editor-title">Evaluación</h2>${status(published?'Publicada':'Privada',published?'green':'blue',published?'check':'lock')}</div>
        <div class="grading-tabs" role="tablist" aria-label="Secciones de evaluación">
          ${gradingSections.map(([id,label])=>`<button type="button" role="tab" id="grading-tab-${id}" aria-controls="grading-panel-${id}" aria-selected="${id===current}" tabindex="${id===current?'0':'-1'}" data-action="learning-review-tab" data-review-tab="${id}">${label}</button>`).join('')}
        </div>
        <form id="learning-grade-form" data-form="learning-grade" novalidate>
          <fieldset aria-label="Evaluación de la entrega" ${published?'disabled':''}>
            ${panels.map(([id,body])=>`<section id="grading-panel-${id}" role="tabpanel" aria-labelledby="grading-tab-${id}" data-review-panel="${id}" ${id===current?'':'hidden'}>${body}</section>`).join('')}
          </fieldset>
          <p id="learning-grade-error" class="field-error" role="alert"></p>
        </form>
      </section>
    </div>
  </div>`,a.title,`${r.name} · ${classroom().name}`,`<span class="learning-foot-note" id="grade-state" role="status">${gradingFootState(r)}</span>
    <div class="actions">${btn('Volver a entregas','learning-leave-review','','back')}
      ${published?'':`<button type="submit" form="learning-grade-form" class="button">Guardar revisión</button>
      ${btn('Revisar publicación','publish-grade','primary','arrow',r.state==='saved'&&!state.reviewDirty?.[r.id]?'':'disabled')}`}
    </div>`);
}

function selectGradingTab(id, focus=false) {
  const selected=$('#grading-tab-'+id);
  if(!selected) return;
  gradingTabs.set(reviewRecord().id,id);
  $$('[data-review-tab]').forEach(b=>{
    const active=b===selected;
    b.setAttribute('aria-selected',String(active));
    b.tabIndex=active?0:-1;
  });
  $$('[data-review-panel]').forEach(panel=>{panel.hidden=panel.dataset.reviewPanel!==id;});
  if(focus) selected.focus();
}

function selectGradingQuestion(i) {
  const r=reviewRecord(), a=learningReviewActivity(r)||activity(), panel=$('#grading-answers');
  if(!r||!panel||!Number.isInteger(i)||i<0||i>=learningQuestions(a).length) return;
  gradingQuestions.set(r.id,i);
  panel.innerHTML=gradingAnswer(a,r,reviewWork(r));
  panel.querySelector('[aria-current="step"]')?.focus({preventScroll:true});
}

function clearGradingError() {
  const form=$('#learning-grade-form');
  form?.querySelectorAll('[aria-invalid]').forEach(el=>{
    el.removeAttribute('aria-invalid');
    el.removeAttribute('aria-describedby');
  });
  if($('#learning-grade-error')) $('#learning-grade-error').textContent='';
}

function gradingError(message, field) {
  if(field){
    if($('#dialog')?.open) closeDialog();
    selectGradingTab(field.closest('[data-review-panel]').dataset.reviewPanel);
    field.setAttribute('aria-invalid','true');
    field.setAttribute('aria-describedby','learning-grade-error');
  }
  $('#learning-grade-error').textContent=message;
  if(field) field.focus();
  else toast(message,'error');
  return false;
}

function captureReviewField(el) {
  const r=reviewRecord();
  if(role!=='docente'||!r||r.state==='published') return;
  const d=structuredClone(reviewValues(r));
  if(el.dataset.reviewCriterion!==undefined){
    d.criteria??={};
    d.criteria[el.dataset.reviewCriterion]=el.value;
  }else d[el.dataset.reviewField]=el.value;
  state.reviewDraft[r.id]=d;
  state.reviewDirty??={};
  state.reviewDirty[r.id]=true;
  if(r.state==='saved') r.state='pending';
  save();
  clearGradingError();
  const suggested=suggestedReviewGrade(learningReviewActivity(r),d), value=$('#learning-suggested-grade');
  if(value) value.textContent=suggested===null?'—':suggested.toLocaleString('es-AR');
  const use=$('[data-action=learning-use-grade]');
  if(use) use.disabled=suggested===null;
  const publish=$('[data-action=publish-grade]');
  if(publish) publish.disabled=true;
  const foot=$('#grade-state');
  if(foot) foot.innerHTML=gradingFootState(r);
}

function saveLearningReview() {
  const r=reviewRecord(), form=$('#learning-grade-form');
  if(role!=='docente'||!r||!form||r.state==='published') return false;
  clearGradingError();
  const invalid=form.querySelector('[data-review-field]:invalid,[data-review-criterion]:invalid');
  if(invalid){
    const message=invalid.validity.valueMissing?'Ingresá la calificación final de 0 a 10.':'Ingresá un valor de 0 a 10 con hasta dos decimales.';
    return gradingError(message,invalid);
  }
  const d=structuredClone(reviewValues(r));
  const feedback=[d.strengths,d.improvements,d.next,d.feedback];
  if(!feedback.some(v=>v?.trim())) return gradingError('Sumá al menos un comentario para el estudiante.',$('#feedback-strengths'));
  if(feedback.join('\n').length>5000) return gradingError('La devolución puede tener hasta 5000 caracteres en total.',$('#feedback-strengths'));
  const saved=state.reviewSaved[r.id], dirty=state.reviewDirty[r.id], previousState=r.state;
  state.reviewSaved[r.id]=d;
  state.reviewDirty[r.id]=false;
  r.state='saved';
  if(!save()){
    if(saved) state.reviewSaved[r.id]=saved;
    else delete state.reviewSaved[r.id];
    state.reviewDirty[r.id]=dirty;
    r.state=previousState;
    return gradingError('No pudimos guardar la revisión. Tus cambios siguen acá. Volvé a intentar.');
  }
  $('#grade-state').innerHTML=gradingFootState(r);
  $('[data-action=publish-grade]').disabled=false;
  toast('Revisión guardada en privado.','success');
  return true;
}

function savedGradeForPublication(r) {
  return role==='docente'&&r?.state==='saved'&&!state.reviewDirty?.[r.id]?state.reviewSaved[r.id]:null;
}

function askPublishLearningReview() {
  const r=reviewRecord(), d=savedGradeForPublication(r);
  if(!d) return;
  const a=learningReviewActivity(r)||activity();
  showDialog('Lo que verá el estudiante',`Para ${esc(r.name)} · ${esc(r.title)}`,`<div class="grade-publish-preview"><span>Calificación final</span><b>${esc(d.grade)} <small>/ 10</small></b></div>
    ${publishedFeedbackMarkup(d)}<section class="grading-dialog-rubric"><h3>Evaluación por criterio</h3>${publishedRubricMarkup(a,d)}</section>`,
    btn('Seguir revisando','close')+btn('Confirmar publicación','confirm-publish','primary','check',`data-id="${esc(r.id)}"`),true);
}

function publishLearningReview(id) {
  const r=reviewRecord(), source=savedGradeForPublication(r);
  if(!source||r.id!==id) return;
  const d=structuredClone(source), a=learningReviewActivity(r);
  const backup={state:a?.state,grade:a?.grade,publishedFeedback:a?.publishedFeedback,feedback:a?.feedback};
  const oldFeedback=r.publishedFeedback;
  r.state='published';
  r.publishedFeedback=d;
  const updateOwnResult=r.name==='Marina'&&a;
  if(updateOwnResult){
    a.state='graded';
    a.grade=d.grade;
    a.publishedFeedback=d;
    a.feedback=[d.strengths,d.improvements,d.next,d.feedback].filter(Boolean).join('\n');
  }
  if(!save()){
    r.state='saved';
    if(oldFeedback) r.publishedFeedback=oldFeedback;
    else delete r.publishedFeedback;
    if(updateOwnResult) Object.assign(a,backup);
    closeDialog();
    gradingError('No pudimos publicar la devolución. La revisión sigue guardada en privado.');
    return;
  }
  closeDialog();
  render();
  toast(`Publicaste la devolución de ${r.name}.`,'success');
}

function publishedFeedbackMarkup(d) {
  const sections=[['strengths','Lo que hiciste bien','check'],['improvements','Para seguir creciendo','book'],['next','Tu próximo paso','flag'],['feedback','Comentario de tu docente','chat']];
  return `<div class="published-feedback">${sections.filter(([key])=>d[key]?.trim()).map(([key,label,ic])=>`<section class="feedback-block ${key}"><span>${icon(ic)}</span><div><h3>${label}</h3><p>${esc(d[key])}</p></div></section>`).join('')}</div>`;
}

function publishedRubricMarkup(a,d) {
  return `<div class="student-rubric-result">${learningRubric(a).map(c=>{
    const score=d.criteria?.[c.id];
    return `<article><div><b>${esc(c.title)}</b><span>${esc(c.weight)}% del resultado</span></div><strong>${score==null||score===''?'Sin puntaje':esc(score)+' / 10'}</strong></article>`;
  }).join('')}</div>`;
}

function publishedGrade(a) {
  if(a.publishedFeedback) return a.publishedFeedback;
  if(a.feedback) return {grade:a.grade??'8,5',feedback:a.feedback};
  return {
    grade:a.grade??'8,5',
    strengths:'Relacionaste las ideas del tema con tus decisiones y las explicaste con ejemplos.',
    improvements:'Compará tus ejemplos y explicá qué cambia en cada caso.',
    next:'Probá una nueva situación y anticipá qué va a pasar.'
  };
}

function resultScreen() {
  const a=activity();
  if(a?.state!=='graded') return receiptScreen();
  const d=publishedGrade(a);
  return focusShell(`<div class="learning-result">
    <header class="learning-result-head">
      <div><span>${esc(classroom().name)}</span><h1 tabindex="-1">${esc(a.title)}</h1>${status('Devolución publicada','green','check')}</div>
      <div class="learning-result-grade"><span>Tu calificación</span><b>${esc(d.grade??a.grade??'—')}<small>/ 10</small></b></div>
    </header>
    <section class="learning-section grading-result-feedback" aria-labelledby="result-feedback-title">
      <div class="learning-section-title"><span>${icon('chat')}</span><h2 id="result-feedback-title">Tu devolución</h2></div>
      ${publishedFeedbackMarkup(d)}
      <div class="grading-result-actions">${btn('Ver rúbrica','learning-result-rubric','quiet','book')}${btn('Consultar mi entrega','view-submission','quiet','file')}</div>
    </section>
  </div>`,a.title,'Resultado de la actividad',`<div class="actions">
    ${btn('Volver a actividades','back-activities','','back')}${btn('Ver mi progreso','open-progress','primary','chart')}
  </div>`);
}

function leaveLearningReview(target=null) {
  const r=reviewRecord();
  if(!r){go('actividad-detalle','entregas');return;}
  nextReviewTarget=target;
  if(state.reviewDirty?.[r.id]){
    showDialog('Tu devolución tiene cambios','Elegí cómo querés continuar.',
      '<p>Podés guardar la revisión privada o salir conservando la última versión que guardaste.</p>',
      btn('Seguir revisando','close')+btn('Salir sin estos cambios','learning-discard-review')+btn('Guardar y salir','learning-save-exit','primary'));
    return;
  }
  finishLeavingReview();
}

function finishLeavingReview() {
  closeDialog();
  if(nextReviewTarget){
    reviewId=nextReviewTarget;
    state.currentReviewId=reviewId;
    save();
    go('corregir');
  }else go('actividad-detalle','entregas');
  nextReviewTarget=null;
}

function installLearningGrading() {
  state.reviewDirty??={};
  const oldReset=actions['confirm-reset'];
  Object.assign(actions,{
    'confirm-reset':()=>{gradingTabs.clear();gradingQuestions.clear();nextReviewTarget=null;oldReset();state.reviewDirty??={};},
    review:b=>{
      const r=state.reviews.find(x=>x.id===b.dataset.id);
      if(role!=='docente'||!r) return;
      reviewId=r.id;
      state.currentReviewId=r.id;
      state.selectedClass=r.classId;
      activityId=learningReviewActivity(r)?.id||activityId;
      state.currentActivityId=activityId;
      save();
      go('corregir');
    },
    'learning-review-tab':b=>selectGradingTab(b.dataset.reviewTab,true),
    'learning-review-question':b=>selectGradingQuestion(Number(b.dataset.reviewQuestion)),
    'learning-use-grade':()=>{
      const el=$('#grade'),v=suggestedReviewGrade(learningReviewActivity(reviewRecord()),reviewValues());
      if(v===null||!el||el.disabled) return;
      el.value=v;
      captureReviewField(el);
    },
    'publish-grade':askPublishLearningReview,
    'confirm-publish':b=>publishLearningReview(b.dataset.id),
    'learning-result-rubric':()=>{
      const a=activity();
      if(a?.state!=='graded') return;
      showDialog('Rúbrica de la actividad',esc(a.title),publishedRubricMarkup(a,publishedGrade(a)),btn('Cerrar','close'));
    },
    'learning-leave-review':()=>leaveLearningReview(),
    'learning-next-review':()=>{
      const list=state.reviews.filter(r=>learningReviewActivity(r)?.id===activityId),i=list.findIndex(r=>r.id===reviewId);
      if(list[i+1]) leaveLearningReview(list[i+1].id);
    },
    'learning-prev-review':()=>{
      const list=state.reviews.filter(r=>learningReviewActivity(r)?.id===activityId),i=list.findIndex(r=>r.id===reviewId);
      if(list[i-1]) leaveLearningReview(list[i-1].id);
    },
    'learning-discard-review':()=>{
      const r=reviewRecord();
      state.reviewDraft[r.id]=structuredClone(state.reviewSaved[r.id]||{grade:'',strengths:'',improvements:'',next:'',feedback:'',criteria:{}});
      r.state=state.reviewSaved[r.id]?'saved':'pending';
      state.reviewDirty[r.id]=false;
      save();
      finishLeavingReview();
    },
    'learning-save-exit':()=>{
      if(saveLearningReview()) finishLeavingReview();
    },
    'learning-review-file':b=>showDialog(esc(b.dataset.file),'Archivo de ejemplo',
      '<div class="reading-preview"><p>La maqueta conserva el nombre del archivo. Los bytes del documento no están disponibles.</p></div>',btn('Volver a la revisión','close')),
    'ai-grade':()=>loading('Foxy está mirando el trabajo con vos',['Leyendo la entrega y los criterios','Preparando una sugerencia privada'],()=>{
      showDialog('Sugerencia para revisar','Ejemplo de Foxy',
        '<p>Podés reconocer cómo el trabajo conecta ideas con ejemplos y pedir que explique con más detalle una de sus decisiones.</p>',
        btn('Conservar mi revisión','close')+btn('Aplicar sugerencia','learning-apply-grade-idea','primary','spark'));
    }),
    'learning-apply-grade-idea':()=>{
      const r=reviewRecord(), strength=$('#feedback-strengths'), improvement=$('#feedback-improvements');
      if(!r||r.state==='published'||!strength||!improvement) return;
      closeDialog();
      strength.value='Relacionaste las ideas del tema con ejemplos de tu trabajo.';
      captureReviewField(strength);
      improvement.value='Elegí una decisión y explicá con más detalle por qué la tomaste.';
      captureReviewField(improvement);
      selectGradingTab('feedback');
      strength.focus();
      toast('Sugerencia aplicada a tu borrador privado.','success');
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.matches('[data-review-field],[data-review-criterion]')) captureReviewField(e.target);
  });
  document.addEventListener('submit',e=>{
    if(e.target.dataset.form!=='learning-grade') return;
    e.preventDefault();
    saveLearningReview();
  });
  document.addEventListener('keydown',e=>{
    if(!e.target.matches('[data-review-tab]')||!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    e.preventDefault();
    const index=gradingSections.findIndex(([id])=>id===e.target.dataset.reviewTab);
    const next=e.key==='Home'?0:e.key==='End'?gradingSections.length-1:(index+(e.key==='ArrowRight'?1:-1)+gradingSections.length)%gradingSections.length;
    selectGradingTab(gradingSections[next][0],true);
  });
}
