// Local design prototype. No model calls, real submissions or notifications.
function grdNumber(value, max=10) {
  const text=String(value??'').trim().replace(',', '.');
  return /^\d+(\.\d{1,2})?$/.test(text)&&Number(text)<=max?text:null;
}
function grdHundredths(value) {
  const [whole,decimal='']=String(value).split('.');
  return BigInt(whole)*100n+BigInt(decimal.padEnd(2,'0'));
}
function grdRound([n,d]) {
  const scaled=n*100n, result=scaled/d+(scaled%d*2n>=d?1n:0n);
  return `${result/100n}.${String(result%100n).padStart(2,'0')}`;
}
const grdAdd=(a,b)=>[a[0]*b[1]+b[0]*a[1],a[1]*b[1]];
function grdQuestionScore(q, answer, manual) {
  const available=grdHundredths(String(q.points));
  if(q.type==='Abierta') {
    if(!String(answer??'').trim())return [0n,1n];
    const value=grdNumber(manual,Number(q.points));
    return value===null?null:[grdHundredths(value),100n];
  }
  const selected=new Set(Array.isArray(answer)?answer:answer?[answer]:[]);
  const correct=new Set(String(q.answer||''));
  if(!correct.size)return null;
  if(!selected.size||[...selected].some(v=>!correct.has(v)))return [0n,1n];
  if(q.scoringRule==='PARTIAL')return [available*BigInt(selected.size),100n*BigInt(correct.size)];
  return [selected.size===correct.size?available:0n,100n];
}
function grdSuggestedGrade(a, review={}, receipt={}) {
  const criteria=a.criteria||[];
  if(criteria.length) {
    const scores=criteria.map((_,i)=>grdNumber(review.criteria?.[i]));
    const completed=scores.filter(v=>v!==null).length;
    const weights=criteria.map(c=>grdNumber(c.weight,100));
    const valid=weights.every(v=>v!==null)&&weights.reduce((n,v)=>n+grdHundredths(v),0n)===10000n;
    return {value:completed===criteria.length&&valid?grdRound([scores.reduce((n,v,i)=>n+grdHundredths(v)*grdHundredths(weights[i]),0n),1000000n]):null,
      basis:'Según la rúbrica',completed,total:criteria.length};
  }
  const questions=a.type==='TP'?[]:a.questions||[];
  const scores=questions.map((q,i)=>grdQuestionScore(q,receipt.answers?.[i],review.points?.[i]));
  const completed=scores.filter(Boolean).length;
  if(!questions.length||completed!==questions.length)return {value:null,basis:questions.length?'Según los puntos':'Nota manual',completed,total:questions.length};
  const total=questions.reduce((n,q)=>n+grdHundredths(String(q.points)),0n),sum=scores.reduce(grdAdd,[0n,1n]);
  return {value:total>0n?grdRound([sum[0]*1000n,sum[1]*total]):null,basis:'Según los puntos',completed,total:questions.length};
}
function grdEditable(s) { return canWrite()&&s&&actReceipt(s)&&!s.reopened&&!actReceiptGrade(s); }
function grdReview(s) { return s.reviewDraft||s.review||{}; }
function grdReadForm(form,a) {
  const fields=new FormData(form), text=name=>String(fields.get(name)||'');
  return {grade:text('grade'),feedback:text('feedback'),strengths:text('strengths'),improvements:text('improvements'),nextSteps:text('nextSteps'),
    points:a.type==='TP'?[]:a.questions.map((_,i)=>text(`point-${i}`)),
    questionFeedback:a.type==='TP'?[]:a.questions.map((_,i)=>text(`questionFeedback-${i}`)),
    criteria:a.criteria.map((_,i)=>text(`criterionScore-${i}`)),criteriaNotes:a.criteria.map((_,i)=>text(`criterionNote-${i}`))};
}
function grdValidate(a,review) {
  if(grdNumber(review.grade)===null)return 'Ingresá una nota final de 0 a 10, con hasta dos decimales.';
  if((review.points||[]).some((v,i)=>v!==''&&grdNumber(v,Number(a.questions[i]?.points))===null))return 'Revisá los puntos: no pueden superar el máximo de cada pregunta.';
  if((review.criteria||[]).some(v=>v!==''&&grdNumber(v)===null))return 'Cada criterio admite una nota de 0 a 10, con hasta dos decimales.';
  return '';
}
function grdSave(a,s,review) {
  const clean=structuredClone(review);
  clean.grade=grdNumber(clean.grade);
  clean.points=(clean.points||[]).map((v,i)=>v===''?'':grdNumber(v,Number(a.questions[i]?.points)));
  clean.criteria=(clean.criteria||[]).map(v=>v===''?'':grdNumber(v));
  clean.suggestedGrade=grdSuggestedGrade(a,clean,actReceipt(s)).value;
  s.review=clean;delete s.reviewDraft;save();
}
function grdScoreInput(label,name,value,max=10,readonly=false) {
  return input(label,name,value,`inputmode="decimal" autocomplete="off" placeholder="—" ${readonly?'readonly':''} aria-describedby="grd-score-help-grade"`);
}
function grdQuestionCards(a,s,review,editable) {
  const receipt=actReceipt(s);
  if(a.type==='TP')return actEvidence(a,receipt,true);
  return `<section class="grd-answers"><h3>Respuestas y puntajes</h3><p id="grd-score-help">Leé cada respuesta y asigná puntos. Las opciones y las respuestas en blanco tienen cálculo automático.</p>
    ${a.questions.map((q,i)=>{
      const answer=receipt.answers?.[i],automatic=q.type!=='Abierta'||!String(answer??'').trim();
      const score=automatic?grdQuestionScore(q,answer,''):null;
      const value=automatic?(score?grdRound(score):''):review.points?.[i];
      const choices=Array.isArray(answer)?answer:answer?[answer]:[];
      return `<article class="panel grd-answer-card" id="grd-question-${i}"><header class="row between"><h4>Pregunta ${i+1}</h4>${tag(esc(actQuestionType(q.type)),'violet')}</header>
        <p class="text">${esc(q.text)}</p><div class="grd-student-answer"><small>Respuesta del estudiante</small>
        ${q.type==='Abierta'?`<p class="text">${esc(answer?.trim()||'Sin responder')}</p>`:choices.length?`<ul>${choices.map(letter=>`<li>${esc(letter)}. ${esc(q[letter.toLowerCase()])}</li>`).join('')}</ul>`:'<p>Sin responder</p>'}</div>
        ${q.type!=='Abierta'?`<p class="grd-key">Clave privada: ${esc(q.answer?.split('').join(', '))}</p>`:''}
        ${editable?`<div class="grd-points-row">${grdScoreInput(`Puntos · máximo ${q.points}`,`point-${i}`,value,q.points,automatic)}<span>${automatic?'Cálculo automático':'Valoración docente'}</span></div>
        <details class="grd-question-note" ${review.questionFeedback?.[i]?'open':''}><summary>Comentario para esta respuesta</summary>${area('Orientación para el estudiante',`questionFeedback-${i}`,review.questionFeedback?.[i],'maxlength="1500"',2)}</details>`:''}</article>`;
    }).join('')}</section>`;
}
function grdRubric(a,review) {
  if(!a.criteria.length)return `<p class="grd-muted">${a.type==='TP'?'Esta actividad no tiene rúbrica. Podés corregir la entrega y definir una nota manual.':'La nota orientativa se calcula con los puntos de las preguntas.'}</p>`;
  return `<section class="grd-rubric"><div><h3>Rúbrica</h3><p>Usá la evidencia esperada para valorar cada criterio.</p></div>
    ${a.criteria.map((c,i)=>`<fieldset class="grd-criterion"><legend>${esc(c.name)}</legend><div class="row between"><p>${esc(c.evidence)}</p>${tag(esc(c.weight)+'%','violet')}</div>
      ${grdScoreInput('Valoración · 0 a 10',`criterionScore-${i}`,review.criteria?.[i])}
      <details ${review.criteriaNotes?.[i]?'open':''}><summary>Agregar una orientación</summary>${area('Devolución de este criterio',`criterionNote-${i}`,review.criteriaNotes?.[i],'maxlength="1500"',2)}</details></fieldset>`).join('')}</section>`;
}
function grdGradeSummary(a,review,s) {
  const suggestion=grdSuggestedGrade(a,review,actReceipt(s));
  return `<div class="grd-suggestion"><div><small>${esc(suggestion.basis)}</small><strong>${suggestion.value===null?'Por completar':suggestion.value.replace('.',',')+' / 10'}</strong>
    <span>${suggestion.total?`${suggestion.completed} de ${suggestion.total} ${a.criteria.length?'criterios':'preguntas'} valorados`:'Podés ingresar tu valoración final.'}</span></div>
    ${suggestion.value!==null?button('Usar esta nota','grd-use-grade'):''}</div>`;
}
function grdFeedbackFields(review) {
  return `<section class="grd-feedback-fields"><h3>Devolución para el estudiante</h3><p>Escribí observaciones concretas que le ayuden a avanzar.</p>
    ${area('Qué hizo bien','strengths',review.strengths,'maxlength="3000" placeholder="Por ejemplo: comparaste las sombras usando evidencia de tus fotos."',3)}
    ${area('Qué puede mejorar','improvements',review.improvements,'maxlength="3000" placeholder="Por ejemplo: explicá cómo la dirección de la luz cambia el volumen."',3)}
    ${area('Próximo paso','nextSteps',review.nextSteps,'maxlength="2000" placeholder="Una acción concreta para seguir aprendiendo."',2)}
    <details ${review.feedback?'open':''}><summary>Comentario general (opcional)</summary>${area('Comentario general','feedback',review.feedback,'maxlength="3000"',2)}</details></section>`;
}
function actTeacherReview(a,learner) {
  const s=actSub(a,learner.id),receipt=actReceipt(s),editable=grdEditable(s),status=actTeacherStatus(s);
  const review=grdReview(s),received=room().students.filter(person=>actReceipt(actSub(a,person.id))),index=received.findIndex(person=>person.id===learner.id);
  const navigation=`<div class="grd-review-navigation"><div>${button('‹ Todas las entregas','act-submission-list','link')}<span>Entrega ${index+1} de ${received.length}</span></div><div class="row">${index>0?button('← Anterior','act-open-submission','',received[index-1].id):''}${index<received.length-1?button('Siguiente →','act-open-submission','',received[index+1].id):''}</div></div>`;
  const history=s.receipts.length>1?`<details class="panel act-optional"><summary>Recepciones anteriores</summary><div class="act-section">${s.receipts.slice(0,-1).map(item=>`<details><summary>${actDate.format(new Date(item.receivedAt))} h</summary>${actEvidence(a,item,true)}</details>`).join('')}</div></details>`:'';
  const header=`${navigation}<header class="grd-review-heading"><div><h3 id="act-submission-heading" tabindex="-1">${esc(learner.name)}</h3><p>${esc(actReceiptLabel(s))}</p></div>${tag(esc(status),status==='Calificada'?'mint':'warm')}</header>${history}`;
  if(!editable)return `<section class="grd-workspace">${header}<div class="grd-grid"><div>${actEvidence(a,receipt,true)}</div><div class="panel grd-feedback-panel">${s.published?actPublishedGrade(a,s.published):s.review?actPublishedGrade(a,s.review,true):empty(s.reopened?'Esperando una nueva entrega.':'Todavía no hay una devolución guardada.')}${canWrite()&&!s.reopened?button('Habilitar reentrega','act-reopen','link'):''}</div></div></section>`;
  return `<section class="grd-workspace">${header}<form id="act-review-form" novalidate><p id="act-review-error" class="notice error" role="alert" tabindex="-1" hidden></p>
    <div class="grd-grid"><div class="grd-evidence"><details class="panel grd-brief"><summary>Consigna y objetivo de la actividad</summary><p>${esc(a.objective)}</p><p class="text">${esc(a.body)}</p></details>${grdQuestionCards(a,s,review,true)}</div>
    <aside class="panel grd-correction" aria-label="Corrección de la entrega">${grdAssistPanel(s)}${grdRubric(a,review)}
      <section class="grd-final-grade"><h3>Nota final</h3><div id="grd-live-summary" role="status">${grdGradeSummary(a,review,s)}</div>
      ${grdScoreInput('Tu nota · 0 a 10','grade',review.grade)}<p id="grd-score-help-grade">La nota orientativa no reemplaza tu decisión. Podés usarla o ingresar otra.</p></section>${grdFeedbackFields(review)}</aside></div>
    <footer class="grd-footer"><p id="act-review-save-status" role="status">${s.reviewDraft?'Cambios locales conservados. Todavía no están publicados.':s.review?'Corrección guardada en privado.':'Sólo vos ves esta corrección.'}</p><div class="row"><button type="submit">Guardar en privado</button>${button('Revisar y publicar','act-publish-grade','primary')}</div></footer></form></section>`;
}
function actPublishedGrade(a,published,preview=false) {
  const sections=[['strengths','Lo que hiciste bien','positive'],['improvements','Para mejorar','improve'],['nextSteps','Tu próximo paso','next']];
  return `<section class="grd-published"><header><div><h3>${preview?'Tu devolución':'Devolución del docente'}</h3><p>${preview?'Vista previa · todavía no publicada':published.publishedAt?'Publicada el '+actDate.format(new Date(published.publishedAt))+' h':'Calificación publicada'}</p></div><div class="grd-grade-badge"><strong>${esc(published.grade)}</strong><span>/ 10</span></div></header>
    ${sections.filter(([key])=>published[key]?.trim()).map(([key,title,style])=>`<section class="grd-feedback-block ${style}"><h4>${title}</h4><p class="text">${esc(published[key])}</p></section>`).join('')}
    ${published.feedback?.trim()?`<section class="grd-feedback-block"><h4>Comentario del docente</h4><p class="text">${esc(published.feedback)}</p></section>`:''}
    ${!sections.some(([key])=>published[key]?.trim())&&!published.feedback?.trim()?'<p>Tu docente publicó la nota sin comentarios adicionales.</p>':''}
    ${a.criteria.length?`<section class="grd-published-rubric"><h4>Cómo se evaluó tu trabajo</h4>${a.criteria.map((c,i)=>`<div><div class="row between"><strong>${esc(c.name)}</strong><span>${published.criteria?.[i]!==undefined&&published.criteria[i]!==''?esc(published.criteria[i])+' / 10':'Sin valoración detallada'}</span></div><small>Peso: ${esc(c.weight)}%</small>${published.criteriaNotes?.[i]?`<p class="text">${esc(published.criteriaNotes[i])}</p>`:''}</div>`).join('')}</section>`:''}
    ${(published.questionFeedback||[]).some(v=>v?.trim())?`<details class="grd-question-feedback"><summary>Orientaciones por pregunta</summary>${published.questionFeedback.map((v,i)=>v?.trim()?`<div><h4>Pregunta ${i+1}</h4><p class="grd-question-context">${esc(a.questions?.[i]?.text||'')}</p><p class="text">${esc(v)}</p></div>`:'').join('')}</details>`:''}</section>`;
}

let grdRequestId=0;
function grdAssistState(s) {
  return s.gradingAssist?.receiptAt===actReceipt(s)?.receivedAt?s.gradingAssist:null;
}
function grdAssistPanel(s) {
  const state=grdAssistState(s);
  let content;
  if(state?.status==='loading')content=`${loadingState('Preparando una sugerencia','Podés seguir corrigiendo mientras esperás.')}${button('Cancelar sugerencia','grd-ai-discard','link')}`;
  else if(state?.status==='ready')content=`<p>Propuesta lista · Nota orientativa ${esc(state.proposal.grade)} / 10</p><div class="row">${button('Revisar sugerencia','grd-ai-review')}${button('Descartar','grd-ai-discard','link')}</div>`;
  else if(state?.status==='error')content=`<p class="notice error" role="alert">No pudimos preparar la sugerencia de ejemplo. Tu corrección sigue intacta.</p><div class="row">${button('Reintentar','grd-ai-start')}${button('Seguir manualmente','grd-ai-discard','link')}</div>`;
  else content=`<p>Recibí una propuesta y decidí qué usar.</p>${button(icon('spark')+'Ayudarme a corregir','grd-ai-start')}`;
  return `<section class="grd-assist" aria-label="Asistencia de Foxy" aria-busy="${state?.status==='loading'}"><h3>${icon('spark')}Foxy, a tu lado</h3>${content}
    <small>Simulación local: no analiza archivos ni usa IA real.</small>${!state?`<details class="grd-demo"><summary>Probar recuperación</summary>${button('Ver un fallo de ejemplo','grd-ai-fail','link')}</details>`:''}</section>`;
}
function grdRefresh() {
  const y=scrollY;render();window.scrollTo(0,y);
}
function grdProposal(a,s) {
  const receipt=actReceipt(s),answers=receipt.answers||{};
  const proposal={grade:'7',feedback:'',strengths:'Presentaste una idea vinculada con la consigna y un punto de partida para explicar tu elección.',
    improvements:'Podés fortalecer la explicación conectando cada observación con un concepto trabajado en clase.',
    nextSteps:'Elegí una observación de tu respuesta y agregá una explicación de por qué ocurre.',
    criteria:a.criteria.map(()=> '7'),criteriaNotes:a.criteria.map(c=>'Revisá si la respuesta muestra esta evidencia: '+c.evidence),
    points:a.type==='TP'?[]:a.questions.map((q,i)=>{
      if(q.type!=='Abierta'||!String(answers[i]??'').trim())return grdRound(grdQuestionScore(q,answers[i],''));
      return grdRound([grdHundredths(String(q.points))*7n,1000n]);
    }),questionFeedback:a.type==='TP'?[]:a.questions.map((q,i)=>q.type==='Abierta'?(String(answers[i]??'').trim()?'Ampliá la justificación con una observación concreta.':'Esta pregunta quedó sin responder. Retomala usando un ejemplo de la clase.'):'')};
  const suggested=grdSuggestedGrade(a,proposal,receipt).value;
  if(suggested!==null)proposal.grade=suggested;
  return proposal;
}
function grdStartAssist(fail=false) {
  const r=room(),a=actCurrent(),s=actSub(a,actSelectedStudent);
  if(!grdEditable(s)||grdAssistState(s)?.status==='loading')return;
  const request=++grdRequestId,receiptAt=actReceipt(s).receivedAt;
  s.gradingAssist={status:'loading',receiptAt,request};grdRefresh();
  setTimeout(()=>{
    if(s.gradingAssist?.request!==request||actReceipt(s)?.receivedAt!==receiptAt||r.state!=='active'||s.reopened)return;
    s.gradingAssist=fail?{status:'error',receiptAt}:{status:'ready',receiptAt,proposal:grdProposal(a,s)};
    // Ready suggestions are private; manual edits made during the wait are untouched.
    save();
    if(!isStudent()&&room()===r&&actCurrent()===a&&actSub(a,actSelectedStudent)===s) {
      const panel=main.querySelector('.grd-assist'),focused=panel?.contains(document.activeElement);
      if(panel)panel.outerHTML=grdAssistPanel(s);
      if(focused)main.querySelector('.grd-assist button')?.focus({preventScroll:true});
    }
  },850);
}
function grdOpenProposal() {
  const a=actCurrent(),s=actSub(a,actSelectedStudent),state=grdAssistState(s);
  if(!grdEditable(s)||state?.status!=='ready')return;
  const proposal=state.proposal;
  context={kind:'confirm',cancel:closeModal,accept:()=>{
    if(!grdEditable(s)||grdAssistState(s)!==state)return closeModal();
    grdSave(a,s,proposal);s.gradingAssist=null;save();closeModal();
    tell('Sugerencia guardada en privado. Podés ajustarla antes de publicar.');
    main.querySelector('[name=strengths]')?.focus();
  }};
  openModal('Revisar la sugerencia de Foxy',`<p class="notice">Propuesta de ejemplo. Revisá cada observación contra la entrega; los archivos no fueron analizados.</p>
    ${actPublishedGrade(a,proposal,true)}<p class="grd-proposal-warning">Usarla reemplazará la corrección en preparación y la guardará en privado. El estudiante todavía no la verá.</p>`,
    `<div class="row between">${button('Volver a mi corrección','confirm-cancel')}${button('Usar y guardar en privado','confirm-ok','primary')}</div>`,{wide:true});
}
function actSaveReview(form) {
  const a=actCurrent(),s=actSub(a,actSelectedStudent);
  if(!grdEditable(s))return;
  const review=grdReadForm(form,a),error=grdValidate(a,review);
  if(error)return actError('act-review-error',error);
  grdSave(a,s,review);tell('Corrección guardada en privado.');
  main.querySelector('[data-action=act-publish-grade]')?.focus();
}
function grdOpenPublish() {
  const r=room(),a=actCurrent(),s=actSub(a,actSelectedStudent);
  if(!grdEditable(s))return;
  const form=main.querySelector('#act-review-form'),review=grdReadForm(form,a),error=grdValidate(a,review);
  if(error)return actError('act-review-error',error);
  grdSave(a,s,review);
  const snapshot=structuredClone(s.review),receiptAt=actReceipt(s).receivedAt;
  context={kind:'confirm',cancel:()=>{closeModal();grdRefresh();main.querySelector('[data-action=act-publish-grade]')?.focus();},accept:()=>{
    if(room()!==r||actCurrent()!==a||!grdEditable(s)||actReceipt(s).receivedAt!==receiptAt||JSON.stringify(s.review)!==JSON.stringify(snapshot))return closeModal();
    s.published={...snapshot,receiptAt,publishedAt:new Date().toISOString()};
    delete s.review;delete s.reviewDraft;delete s.gradingAssist;save();closeModal();
    tell('Devolución publicada. El estudiante ya puede consultarla.');
    main.querySelector('#act-submission-heading')?.focus();
  }};
  openModal('Así verá la devolución el estudiante',`${actPublishedGrade(a,snapshot,true)}<p class="grd-proposal-warning">Al publicar, la nota y los comentarios quedarán visibles para este estudiante.</p>`,
    `<div class="row between">${button('Volver a corregir','confirm-cancel')}${button('Publicar devolución','confirm-ok','primary')}</div>`,{wide:true});
}
function actCaptureReviewDraft(el) {
  if(el.form?.id!=='act-review-form')return;
  const a=actCurrent(),s=actSub(a,actSelectedStudent);
  if(!grdEditable(s))return;
  s.reviewDraft=grdReadForm(el.form,a);save();
  main.querySelector('#act-review-save-status').textContent='Cambios locales conservados. Todavía no están publicados.';
  if(el.name.startsWith('point-')||el.name.startsWith('criterionScore-'))main.querySelector('#grd-live-summary').innerHTML=grdGradeSummary(a,s.reviewDraft,s);
}
Object.assign(actions,{
  'act-publish-grade':grdOpenPublish,
  'grd-use-grade':()=>{
    const a=actCurrent(),s=actSub(a,actSelectedStudent),form=main.querySelector('#act-review-form');
    if(!grdEditable(s))return;
    const suggested=grdSuggestedGrade(a,grdReadForm(form,a),actReceipt(s));
    if(suggested.value===null)return;
    const field=form.querySelector('[name=grade]');field.value=suggested.value;actCaptureReviewDraft(field);field.focus();
  },
  'grd-ai-start':()=>grdStartAssist(), 'grd-ai-fail':()=>grdStartAssist(true), 'grd-ai-review':grdOpenProposal,
  'grd-ai-discard':()=>{
    const s=actSub(actCurrent(),actSelectedStudent);
    if(!grdEditable(s))return;
    s.gradingAssist=null;save();grdRefresh();main.querySelector('[data-action=grd-ai-start]')?.focus();
  }
});
function initGradingExample() {
  const r=data.rooms.find(r=>r.id==='foto');
  if(!r||r.gradingExampleAdded)return;
  const id='act-demo-feedback';
  if(!r.activities.some(a=>a.id===id)) {
    const text='En la primera foto, la luz llega de frente y casi no se ve sombra. En la segunda llega desde un costado: la sombra es más larga y la taza parece tener más volumen. Elegí la segunda porque permite distinguir mejor su forma.';
    r.activities.unshift({id,type:'TP',status:'Asignada',example:true,title:'Comparar, explicar y mejorar',objective:'Explicar cómo la dirección de la luz permite reconocer el volumen.',
      body:'Compará dos fotografías del mismo objeto. Describí las diferencias de iluminación y explicá qué efecto tienen sobre su volumen.',due:'',criteria:[
        {name:'Observación de las imágenes',weight:30,evidence:'Identifica diferencias visibles entre las dos fotografías.'},
        {name:'Relación con los conceptos',weight:40,evidence:'Explica la relación entre dirección de la luz, sombra y volumen.'},
        {name:'Claridad de la explicación',weight:30,evidence:'Presenta una comparación ordenada y justifica su elección.'}],questions:[],
      submissions:{marina:{text,files:[],answers:{},startedAt:'2026-11-11T14:00:00Z',receipts:[{text,files:[],answers:{},receivedAt:'2026-11-11T14:10:00Z',late:false}]}}});
  }
  r.gradingExampleAdded=true;save();
}
initGradingExample();
for(const r of data.rooms)for(const a of r.activities||[])for(const s of Object.values(a.submissions||{})) {
  if(s.gradingAssist?.status==='loading') {
    s.gradingAssist={status:'error',receiptAt:s.gradingAssist.receiptAt};save();
  }
}
