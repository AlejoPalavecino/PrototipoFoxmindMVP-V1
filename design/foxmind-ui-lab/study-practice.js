/* Fixed examples for the offline prototype. */
const fpExamples = {
 photo: {label:'Fotografía', questions:[
  ['Si duplicás el tiempo de exposición y mantenés la apertura y el ISO, ¿qué pasa con la luz que recibe el sensor?', ['Recibe el doble de luz.', 'Recibe la mitad de luz.', 'Recibe la misma cantidad.'], 0, 'Una exposición dos veces más larga deja que el sensor reciba el doble de luz si todo lo demás se mantiene.'],
  ['¿Qué ajuste ayuda a congelar a una persona que corre?', ['Usar un tiempo más largo.', 'Usar un tiempo de exposición más corto.', 'Cambiar el balance de blancos.'], 1, 'Con un tiempo corto, el movimiento recorre menos distancia durante la exposición y deja menos desenfoque.'],
  ['¿Cuál de estas escenas tiene más contraste de luminosidad?', ['Toda la escena tiene un gris parecido.', 'La escena pasa suavemente de gris medio a gris claro.', 'Hay reflejos muy brillantes y sombras profundas.'], 2, 'El contraste de luminosidad aumenta cuando la diferencia entre tonos claros y oscuros es mayor.']
 ]},
 biology: {label:'Biología', questions:[
  ['¿Qué estructura regula el intercambio de sustancias entre la célula y su entorno?', ['La membrana plasmática.', 'El nucléolo.', 'Los ribosomas.'], 0, 'La membrana separa el interior del exterior y regula el paso de sustancias.'],
  ['¿Qué estructura se encuentra en células vegetales fotosintéticas y capta energía luminosa?', ['El núcleo.', 'El cloroplasto.', 'La pared celular.'], 1, 'Los cloroplastos contienen pigmentos como la clorofila y son el lugar donde ocurre la fotosíntesis.'],
  ['¿Qué tarea cumplen los ribosomas?', ['Almacenan el ADN nuclear.', 'Regulan el ingreso de agua a la célula.', 'Sintetizan proteínas a partir de la información del ARN mensajero.'], 2, 'Los ribosomas leen el ARN mensajero y ensamblan aminoácidos para formar proteínas.']
 ]},
 strategy: {label:'Estrategias de estudio', questions:[
  ['Después de leer un concepto, ¿qué te ayuda a saber si podés explicarlo de memoria?', ['Releer el mismo párrafo varias veces seguidas.', 'Cerrar el material, explicarlo y después comparar.', 'Copiar la definición sin revisarla.'], 1, 'Intentar recuperar una idea antes de mirar el material revela qué recordás y qué necesitás repasar.'],
  ['Tenés tres días antes de una evaluación. ¿Cómo podés espaciar el repaso?', ['Hacer un repaso breve cada día y retomar lo que te costó.', 'Juntar todo el repaso la última noche.', 'Estudiar sólo lo que ya te sale.'], 0, 'Distribuir el repaso te da varias oportunidades de recuperar lo aprendido y corregir dudas.'],
  ['Una respuesta te salió mal. ¿Qué te ayuda más en el próximo intento?', ['Memorizar la letra de la opción correcta.', 'Cambiar de tema sin revisar la pregunta.', 'Identificar qué idea confundiste y probar otro ejemplo.'], 2, 'Revisar la causa del error y aplicar la idea a otro ejemplo ayuda a comprobar si la entendiste.']
 ]}
};
let fpVisibleAttempt = null;

function fpExampleFor(folder) {
 const subject = [folder.subject, folder.topic, folder.name].join(' ').normalize('NFD').replace(/\p{Diacritic}/gu,'').toLowerCase();
 if (/fotograf|exposicion/.test(subject)) return 'photo';
 if (/biolog|celul/.test(subject)) return 'biology';
 return 'strategy';
}

function fpNewAttempt(folder) {
 return {id:fxId('attempt'),example:fpExampleFor(folder),index:0,stage:'question',answers:[null,null,null]};
}

function fxPracticeStart(creation) {
 const folder = fxFolder();
 if (role!=='estudiante' || !folder || !creation || creation.role!==role ||
     !['practice','exam'].includes(creation.kind) || creation.scope!==fxScope()) return;
 if (!fxCommit(()=>{
  state.fxPractice = {creationId:creation.id,folderId:folder.id};
  state.fxPracticeAttempts ??= {};
  state.fxPracticeAttempts[creation.id] ??= [fpNewAttempt(folder)];
 })) return;
 fpVisibleAttempt = null;
 closeDialog();
 go('practica');
}

function fpContext() {
 const {creationId,folderId} = state.fxPractice || {};
 const folder = fxFolder();
 if (role!=='estudiante' || !folder || folder.id!==folderId) return null;
 const creation = fxOwnedCreation(creationId);
 const attempts = state.fxPracticeAttempts?.[creationId];
 if (!creation || !attempts?.length) return null;
 const attempt = attempts.find(a=>a.id===fpVisibleAttempt && a.stage==='complete') || attempts.at(-1);
 return {folder,creation,attempts,attempt,example:fpExamples[attempt.example]};
}

function fpFrame(body, footer, subtitle) {
 return focusShell(`<article class="fp-work">${body}</article>`, 'Práctica personal', subtitle, footer)
  .replace('data-action="leave-focus" aria-label="Volver al aula"','data-action="fp-exit" aria-label="Volver al chat de la carpeta"');
}

function fxPracticeScreen() {
 const context = fpContext();
 if (!context) return fpFrame('<h1 tabindex="-1">Volvé a tu carpeta</h1><p>Abrí la práctica desde la creación correspondiente.</p>',btn('Volver a Mi estudio','fp-exit','primary','back'),'Mi estudio');
 const {creation,folder,attempt,example} = context;
 const complete = attempt.stage==='complete', reviewing = attempt.stage==='review';
 const heading = `<div class="participation-work-head"><div><p>Ejemplo de ${example.label} · Sin nota académica</p><h1 tabindex="-1">${esc(creation.title)}</h1></div></div>`;
 const content = complete ? fpResults(context) : reviewing ? fpReview(context) : fpQuestion(context);
 const controls = complete ? btn('Volver al chat','fp-exit','','back')+btn('Reintentar','fp-retry','primary') : reviewing ?
  btn('Volver a preguntas','fp-back','','back')+btn('Finalizar','fp-finish','primary','check',fpAnswered(attempt)<3?'disabled':'') :
  (attempt.index>0?btn('Atrás','fp-back','','back'):btn('Volver al chat','fp-exit','','back'))+
  (attempt.index<2?btn('Siguiente','fp-next','primary','arrow'):btn('Revisar','fp-review','primary','arrow'));
 return fpFrame(heading+content,`<span id="fp-save-status" class="save-state" aria-live="polite">${complete?'Práctica guardada':'Tus respuestas se guardan en esta carpeta'}</span><div class="actions">${controls}</div>`,folder.name);
}

function fpAnswered(attempt) {
 return attempt.answers.filter(answer=>answer!==null).length;
}

function fpQuestion({attempt,example}) {
 const [question,options] = example.questions[attempt.index];
 return `<div class="participation-progress"><span id="fp-progress" aria-live="polite">${fpAnswered(attempt)} de 3 respondidas</span><nav class="learning-question-nav" aria-label="Ir a una pregunta">
 ${example.questions.map((_,i)=>`<button data-action="fp-jump" data-id="${i}" class="${attempt.index===i?'active ':''}${attempt.answers[i]!==null?'answered':''}" ${attempt.index===i?'aria-current="step"':''} aria-label="Pregunta ${i+1}${attempt.answers[i]!==null?', respondida':''}">${i+1}</button>`).join('')}</nav></div>
 <section class="panel fp-question"><p class="question-position">Pregunta ${attempt.index+1} de 3</p><fieldset>
 <legend>${question}</legend>${options.map((option,i)=>`<label class="question-option"><input type="radio" name="fp-answer" value="${i}" ${attempt.answers[attempt.index]===i?'checked':''}><span>${option}</span></label>`).join('')}</fieldset></section>`;
}

function fpReview({attempt,example}) {
 return `<section class="panel fp-review"><h2>Revisá tus respuestas</h2><p>${fpAnswered(attempt)<3?'Respondé las tres preguntas para finalizar.':'Podés cambiar tus respuestas antes de finalizar.'}</p>
 <ol>${example.questions.map(([prompt,options],i)=>`<li><div><h3>${prompt}</h3><p>${options[attempt.answers[i]]||'Todavía sin responder'}</p></div>
 ${btn('Editar','fp-jump','','edit',`data-id="${i}" aria-label="Editar respuesta ${i+1}"`)}</li>`).join('')}</ol></section>`;
}

function fpResults({attempt,attempts,example}) {
 const correctCount = example.questions.filter(([, , answer],i)=>attempt.answers[i]===answer).length;
 const history = attempts.filter(a=>a.stage==='complete');
 return `<section class="panel fp-review" aria-labelledby="fp-summary-title"><h2 id="fp-summary-title">Tu orientación</h2>
 ${history.length>1?`<div class="fp-attempts" role="group" aria-label="Intentos completados">${history.map((a,i)=>`<button type="button" data-action="fp-show-attempt" data-id="${esc(a.id)}" aria-pressed="${a.id===attempt.id}">Intento ${i+1}</button>`).join('')}</div>`:''}
 <p>${correctCount} de 3 correctas. Revisá el porqué de cada respuesta.</p>
 <ol class="fp-results">${example.questions.map(([prompt,options,answer,feedback],i)=>{
  const correct = attempt.answers[i]===answer;
  return `<li class="notice ${correct?'success':'error'}">${icon(correct?'check':'info')}<div><h3>${prompt}</h3><p><b>${correct?'Correcta':'Para repasar'}</b></p>
  <p>Tu respuesta: ${options[attempt.answers[i]]}</p>${correct?'':`<p>Respuesta esperada: ${options[answer]}</p>`}<p>${feedback}</p></div></li>`;
 }).join('')}</ol></section>`;
}

function fpGoto(index,stage='question') {
 const attempt = fpContext()?.attempt;
 if (!attempt || attempt.stage==='complete' || index<0 || index>2) return;
 if (fxCommit(()=>{attempt.index=index;attempt.stage=stage;})) {
  render();
  const target = stage==='review'?$('.fp-review h2'):$('.fp-question legend');
  if (target) {target.tabIndex=-1;target.focus();}
 }
}

function fpExit() {
 fpVisibleAttempt = null;
 if ($('#dialog').open) closeDialog();
 fxPane = 'chat';
 go(fpContext()?'estudio':'carpetas');
}

function fpConfirm() {
 const attempt = fpContext()?.attempt;
 if (!attempt || attempt.stage!=='review' || fpAnswered(attempt)!==3) return;
 showDialog('¿Finalizar la práctica?','Vas a ver las respuestas esperadas y una orientación para repasarlas.',
  '<p id="fp-final-error" class="field-error" role="alert"></p>',
  btn('Seguir revisando','close')+btn('Finalizar','fp-confirm','primary','check'));
 $('.dialog-footer [data-action="close"]').focus();
}

function fpFinish() {
 const attempt = fpContext()?.attempt;
 if (!attempt || attempt.stage!=='review' || fpAnswered(attempt)!==3) return;
 if (!fxCommit(()=>{attempt.stage='complete';})) {
  $('#fp-final-error').textContent = 'No pudimos guardar el resultado. Tus respuestas se conservan. Podés reintentar.';
  return;
 }
 closeDialog();
 render();
}

function fpRetry() {
 const context = fpContext();
 if (!context || context.attempt.stage!=='complete') return;
 if (!fxCommit(()=>context.attempts.push(fpNewAttempt(context.folder)))) return;
 fpVisibleAttempt = null;
 render();
}

function fpRecordAnswer(input) {
 const attempt = fpContext()?.attempt;
 if (!attempt || attempt.stage!=='question') return;
 const answer = Number(input.value);
 if (!Number.isInteger(answer) || answer<0 || answer>2) return;
 const index = attempt.index;
 if (!fxCommit(()=>{attempt.answers[index]=answer;})) {
  const current = fpContext().attempt.answers[index];
  $$('[name="fp-answer"]').forEach(radio=>{radio.checked=Number(radio.value)===current;});
  $('#fp-save-status').textContent = 'No pudimos guardar la respuesta. Podés reintentar.';
  $('#fp-save-status').dataset.tone = 'error';
  return;
 }
 $('#fp-save-status').textContent = 'Respuesta guardada';
 $('#fp-save-status').dataset.tone = 'success';
 $('#fp-progress').textContent = `${fpAnswered(attempt)} de 3 respondidas`;
 const button = $(`[data-action="fp-jump"][data-id="${index}"]`);
 button.classList.add('answered');
 button.setAttribute('aria-label',`Pregunta ${index+1}, respondida`);
}

function installStudyPractice() {
 Object.assign(actions,{
  'fp-exit':fpExit,'fp-next':()=>fpGoto(fpContext().attempt.index+1), 'fp-review':()=>fpGoto(2,'review'),
  'fp-back':()=>{const a=fpContext().attempt;fpGoto(a.stage==='review'?a.index:a.index-1);},
  'fp-jump':button=>fpGoto(Number(button.dataset.id)), 'fp-finish':fpConfirm, 'fp-confirm':fpFinish, 'fp-retry':fpRetry,
  'fp-show-attempt':button=>{
   const id = button.dataset.id;
   if (!fpContext()?.attempts.some(a=>a.id===id && a.stage==='complete')) return;
   fpVisibleAttempt = id;
   render();
   $(`[data-action="fp-show-attempt"][data-id="${CSS.escape(id)}"]`)?.focus();
  }
 });
 document.addEventListener('change',event=>{
  if (event.target.name==='fp-answer') fpRecordAnswer(event.target);
 });
}
