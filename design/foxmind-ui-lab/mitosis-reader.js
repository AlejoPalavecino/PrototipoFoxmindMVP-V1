let mitosisState = { step: 0, answers: [], review: 0, prompts: mitosisQuestions.map(q=>q.prompt), studentPhase: 0, reveal: false, teacherPhase: 0 };
const mitosisTabs = ['quiz-mitosis','esquema-mitosis'];
function mitosisRoute(resource, targetRole=role) {
  return targetRole==='docente' ? '#docente/foxy/'+resource : '#estudiante/estudio/'+resource+'?folder=folder-original-2';
}
function mitosisEligible() { return role==='docente'||fxFolder()?.id==='folder-original-2'; }
function mitosisLinks() {
  return mitosisTabs.map((key,i)=>`<a class="button" href="${mitosisRoute(key)}">${icon(i?'layers':'edit')}${i?'Esquema':'Quiz'} de mitosis</a>`).join('');
}
function mitosisReader(){
  const saved=activeDemoCreation()?.readerState;if(saved)mitosisState=saved;
  const teacher=role==='docente',quiz=tab===mitosisTabs[0];
  return `<div class="mit-reader" id="mit-reader"><div class="mit-inner"><nav class="fx-dialog-tabs" aria-label="Creaciones de biología">${activeDemoCreation()?btn('Volver al chat','demo-back','','back'):`${mitosisTabs.map((key,i)=>`<button data-action="mit-switch" data-value="${key}" aria-pressed="${tab===key}">${icon(i?'layers':'edit')}${i?'Esquema':'Quiz'}</button>`).join('')}${btn('Volver al chat','demo-back','quiet','back')}`}</nav>
  <header class="mit-cover"><div class="room-identity">${img('biology','room-miniature')}<div><p>Biología · ${teacher?'Borrador docente':'Mi estudio'}</p><h2>${quiz?'Quiz de mitosis':'Las fases de la mitosis'}</h2><small>${quiz?'Duplicación del ADN y división celular':'Explorá las cuatro fases y sus conexiones'}</small></div></div>${btn('Ver apunte','mit-source','','book')}</header>
  ${activeDemoCreation()?demoRequestSummary(activeDemoCreation()):''}
  ${quiz?(teacher?mitosisReview():mitosisPractice()):mitosisDiagram(teacher)}
  </div></div>`;
}
function mitosisPractice(){
  const s=mitosisState,q=mitosisQuestions[s.step];
  if(!q)return `<article class="card mit-paper"><h3>Tu repaso · ${s.answers.filter((v,i)=>v===mitosisQuestions[i].key).length} de 2 correctas</h3>${mitosisQuestions.map((item,i)=>`<p><b>${item.focus}</b><br>${item.feedback[s.answers[i]]}</p>`).join('')}${s.previousAttempts?.length?`<p>Intentos anteriores: ${s.previousAttempts.map((answers,i)=>`${i+1} (${answers.filter((v,j)=>v===mitosisQuestions[j].key).length}/2)`).join(' · ')}</p>`:''}${btn('Volver a practicar','mit-again','','play')}</article>`;
  const answer=s.answers[s.step],done=answer!==undefined;
  requestAnimationFrame(()=>{const canvas=$('#mit-quiz-cell');if(canvas)drawMitosisCell(canvas,s.step)});
  return `<article class="card fp-question mit-paper"><div class="mit-progress"><b>Pregunta ${s.step+1} de 2</b><progress aria-label="Preguntas confirmadas" max="2" value="${s.answers.length}"></progress></div><div class="mit-quiz-work"><fieldset ${done?'disabled':''}><legend>${q.prompt}</legend>${q.choices.map((c,i)=>`<label class="question-option"><input name="mit-choice" type="radio" value="${i}" ${answer===i?'checked':''}><span>${c}</span>${done&&i===q.key?'<b class="mit-key">Correcta</b>':''}</label>`).join('')}</fieldset>
  <figure class="mit-observation"><canvas id="mit-quiz-cell" width="320" height="212" role="img" aria-label="${s.step?'Cromosomas alineados en el centro de la célula':'Cromosomas condensados dentro de una célula'}"></canvas><figcaption>${s.step?'Célula en observación':'Al entrar en profase'}</figcaption></figure></div>
  ${done?`<div class="notice mit-feedback ${answer===q.key?'right':'retry'}" role="status">${icon(answer===q.key?'check':'chat')}<div><b>${answer===q.key?'Correcto':'Revisemos la respuesta'}</b><p>${q.feedback[answer]}</p></div></div>${btn(s.step?'Ver mi repaso':'Siguiente pregunta','mit-next','primary','arrow')}`:btn('Confirmar respuesta','mit-confirm','primary','check','disabled')}</article>`;
}
function mitosisReview(){
  const s=mitosisState,q=mitosisQuestions[s.review];
  return `<article class="card mit-paper mit-review"><nav class="fx-filter-row" aria-label="Preguntas del borrador">${mitosisQuestions.map((_,i)=>`<button data-action="mit-review" data-value="${i}" aria-pressed="${s.review===i}">Pregunta ${i+1}</button>`).join('')}</nav>
  <h3>${esc(s.prompts[s.review])}</h3><p>${q.focus}</p>${btn('Editar consigna','mit-edit','quiet','edit')}
  ${q.choices.map((c,i)=>`<div class="material-row"><div class="row-copy"><b>${c}${i===q.key?' · Correcta':''}</b><p>${q.why[i]}</p></div>${btn('Ver devolución','mit-feedback','quiet','chat',`data-value="${i}" aria-label="Ver devolución para ${esc(c)}"`)}</div>`).join('')}</article>`;
}
function mitosisDiagram(teacher,projection=false){
  const key=teacher?'teacherPhase':'studentPhase',i=mitosisState[key],e=mitosisPhases[i];
  requestAnimationFrame(()=>document.querySelectorAll('canvas[data-mit-cell]').forEach(canvas=>{canvas.width=320;drawMitosisCell(canvas,Number(canvas.dataset.mitCell))}));
  const stage=Math.floor(i/2);
  const cell=n=>`<canvas width="320" height="212" data-mit-cell="${n}" aria-hidden="true"></canvas>`;
  const specimen=n=>`<figure>${cell(n)}<figcaption>${mitosisPhases[n*2][0]}</figcaption></figure>`;
  return `<section class="mit-atlas"><div class="mit-atlas-head"><h3>Recorrido celular</h3>${teacher&&!projection?btn('Proyectar','mit-project','','play'):''}</div>
  <div class="mit-map">${mitosisPhases.map(([name,action],j)=>`<button class="button ${j%2?'mit-arrow':'mit-phase'}" data-action="mit-phase" data-value="${j}" aria-label="${name}" aria-pressed="${j===i}">${j%2?icon('arrow'):cell(j/2)}<b>${j%2?action:name}</b></button>`).join('')}</div>
  <div class="mit-specimen"><div class="mit-illustration">${specimen(stage)}${i%2?icon('arrow')+specimen(stage+1):''}</div><div class="mit-caption"><small>${i%2?'Transición':'Fase '+(stage+1)+' de 4'}</small><h3>${e[0]}</h3><p>${e[2]}</p></div></div></section>
  ${projection?'':`<section class="mit-challenge">${img('logo','mit-mascot')}<div><b>${teacher?'Pregunta para el aula':'Ponete a prueba'}</b><h3>${e[3]}</h3>${mitosisState.reveal?`<p id="mit-solution" tabindex="-1">${e[4]}</p>`:''}</div>${btn(mitosisState.reveal?'Ocultar respuesta':'Ver respuesta','mit-answer',mitosisState.reveal?'':'primary')}</section>`}`;
}
function installMitosis(){
  const refresh=(selector)=>{if(activeDemoCreation()?.readerState)save();const body=$('#mit-reader');if(body){body.outerHTML=mitosisReader();if(selector)$(selector)?.focus()}};
  const back=btn('Volver','close','primary','back');
  function project(){showDialog('Las fases de la mitosis','',mitosisDiagram(true,true),btn('Salir de proyección','close'),true);$('#dialog').classList.add('mit-project')}
  Object.assign(actions,{
    'mit-launch':()=>{if($('#dialog').open)closeDialog();location.hash=mitosisRoute(mitosisTabs[0])},
    'mit-switch':b=>{location.hash=mitosisRoute(b.dataset.value)},
    'mit-source':()=>showDialog('Apunte de mitosis','Biología · Fragmento de ejemplo',`<p>${mitosisSource}</p>`,back),
    'mit-confirm':()=>{const pick=$('[name=mit-choice]:checked');if(!pick)return;mitosisState.answers[mitosisState.step]=Number(pick.value);refresh('[data-action=mit-next]')},
    'mit-next':()=>{mitosisState.step++;refresh(mitosisState.step===2?'[data-action=mit-again]':'[name=mit-choice]')},
    'mit-again':()=>{(mitosisState.previousAttempts??=[]).push([...mitosisState.answers]);mitosisState.step=0;mitosisState.answers=[];refresh('[name=mit-choice]')},
    'mit-review':b=>{mitosisState.review=Number(b.dataset.value);refresh(`[data-action=mit-review][data-value="${mitosisState.review}"]`)},
    'mit-feedback':b=>{const q=mitosisQuestions[mitosisState.review],i=Number(b.dataset.value);showDialog('Devolución al estudiante',esc(q.choices[i]),`<p>${q.feedback[i]}</p>`,back)},
    'mit-edit':()=>showDialog('Editar consigna','Borrador docente',`<label for="mit-edit">Consigna</label><textarea id="mit-edit" maxlength="500">${esc(mitosisState.prompts[mitosisState.review])}</textarea>`,btn('Cancelar','close')+btn('Guardar','mit-save','primary')),
    'mit-save':()=>{const value=$('#mit-edit').value.trim();if(!value){$('#mit-edit').focus();return} mitosisState.prompts[mitosisState.review]=value;closeDialog();refresh('[data-action=mit-edit]')},
    'mit-phase':b=>{const n=Number(b.dataset.value);mitosisState.reveal=false;mitosisState[role==='docente'?'teacherPhase':'studentPhase']=n;const selector=`[data-action=mit-phase][data-value="${n}"]`;if($('#dialog').open){project();$('#dialog '+selector)?.focus()}else refresh(selector)},
    'mit-project':project,
    'mit-answer':()=>{mitosisState.reveal=!mitosisState.reveal;refresh(mitosisState.reveal?'#mit-solution':'[data-action=mit-answer]')}
  });
  document.addEventListener('change',event=>{if(event.target.name==='mit-choice')$('[data-action=mit-confirm]').disabled=false});
}
