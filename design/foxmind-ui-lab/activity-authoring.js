
const composeTypes = [
 ['Trabajo práctico', 'file', 'Una consigna para entregar un trabajo.'],
 ['Cuestionario', 'chat', 'Preguntas para practicar o repasar.'],
 ['Evaluación', 'chart', 'Preguntas para valorar lo aprendido.']
];
const composeSteps = ['Alcance', 'Contenido', 'Revisión'];
const composeId = prefix => prefix + '-' + Array.from(crypto.getRandomValues(new Uint32Array(2)), number => number.toString(36)).join('-');
const composeClass = draft => state.classes.find(c => c.id === draft?.classId);
const composeQuestion = () => ({id:composeId('q'),title:'',hint:'',kind:'text',options:[],correct:[],points:1});
const composeCriterion = weight => ({id:composeId('r'),title:'',description:'',weight});
let composeBaseline = '';
let composeExit = null;
let composePublishId = null;

function composeNew(classId) {
 return {
  id:composeId('draft'), classId, step:0, method:'', aiBrief:'', scopeMode:'topics',
  topicIds:[], unitIds:[], generatedFor:'',
  spec:{title:'',type:'',objective:'',instructions:'',topics:[],questions:[],rubric:[],date:'',time:''}
 };
}

function composeActivate(draft, baseline = JSON.stringify(draft)) {
 composeResetEditor();
 state.author = draft;
 state.selectedClass = draft.classId;
 composeBaseline = baseline;
 composePublishId = null;
 go('crear');
}

function startActivityAuthor(classId = classroom()?.id, method = '') {
 if (role !== 'docente' || !state.classes.some(c => c.id === classId && !state.classArchived.includes(c.id))) return;
 const active = state.author;
 if (!method && active?.spec && active.classId === classId && composeDirty()) {
  composeActivate(active, composeBaseline);
  return;
 }
 composeAskExit(() => {
  const draft = composeNew(classId);
  draft.method = method;
  composeActivate(draft);
 });
}

function resumeActivityDraft(id) {
 const draft = state.activityDrafts?.find(item => item.id === id);
 if (role !== 'docente' || !draft || state.classArchived.includes(draft.classId) || !composeClass(draft)) return;
 if (state.author?.id === id && composeDirty()) {
  composeActivate(state.author, composeBaseline);
  return;
 }
 composeAskExit(() => composeActivate(structuredClone(draft)));
}

function composeDirty() {
 const draft = state.author;
 if (!draft?.spec) return false;
 const baseline = composeBaseline || JSON.stringify(state.activityDrafts?.find(item => item.id === draft.id));
 return JSON.stringify(draft) !== baseline;
}

function composeSaved(draft) {
 return (state.activityDrafts || []).some(item => item.id === draft.id);
}

function composeSave() {
 const draft = state.author;
 const previous = state.activityDrafts;
 const saved = structuredClone(draft);
 const drafts = previous || [];
 state.activityDrafts = composeSaved(draft) ? drafts.map(item => item.id === saved.id ? saved : item) : [...drafts,saved];
 if (!save()) {
  state.activityDrafts = previous;
  return false;
 }
 composeBaseline = JSON.stringify(draft);
 composeSaveLabel();
 toast('Borrador privado guardado en el aula.','success');
 return true;
}

function composeAskExit(next) {
 if (!composeDirty()) {
  next();
  return;
 }
 composeExit = next;
 showDialog('¿Guardás tu actividad antes de salir?', '',
  '<p>Tus cambios quedan guardados como borrador privado en el aula.</p>',
  btn('Seguir editando','close') + btn('Salir sin guardar','compose-discard') + btn('Guardar y salir','compose-save-exit','primary'));
}

function composeLeave() {
 const draft = state.author;
 state.author = null;
 composeBaseline = '';
 composePublishId = null;
 if (draft) state.selectedClass = draft.classId;
 go('aula','actividades');
}

function composeFinishExit(shouldSave) {
 if (!composeExit || (shouldSave && !composeSave())) return;
 const next = composeExit;
 composeExit = null;
 state.author = null;
 composeBaseline = '';
 composePublishId = null;
 closeDialog();
 next();
}

function composeSaveLabel() {
 const label = $('#compose-save-state');
 if (!label) return;
 const dirty = composeDirty();
 const labelText = dirty ? 'Cambios sin guardar' : composeSaved(state.author) ? 'Borrador guardado' : 'Borrador privado';
 const iconName = !dirty && composeSaved(state.author) ? 'check' : 'lock';
 if (label.textContent !== labelText) label.innerHTML = icon(iconName) + labelText;
 label.classList.toggle('is-dirty',dirty);
}

function composeRepaint(focusSelector) {
 const scroll = window.scrollY;
 render();
 window.scrollTo(0,scroll);
 const target = $(focusSelector);
 target?.focus({preventScroll:true});
 target?.scrollIntoView({block:'nearest'});
}

function composeScopeSummary(draft) {
 const topics = draft.spec.topics;
 const names = draft.scopeMode === 'units' ? [...new Map(topics.map(topic => [topic.unitId,topic.unitTitle])).values()] : topics.map(topic => topic.title);
 if (!names.length) return '<b>Elegí qué querés trabajar</b>';
 const noun = draft.scopeMode === 'units' ? (names.length === 1 ? 'unidad' : 'unidades') : (names.length === 1 ? 'tema' : 'temas');
 const remainder = names.length - 2;
 return '<b>'+names.length+' '+noun+(draft.scopeMode === 'units' ? ' · '+topics.length+(topics.length === 1 ? ' tema' : ' temas') : '')+'</b>'+
  '<span>'+names.slice(0,2).map(esc).join(', ')+(remainder > 0 ? ' y '+remainder+' más' : '')+'</span>';
}

function composeUpdateScope(draft) {
 const units = curriculumUnits(composeClass(draft));
 draft.spec.topics = units.flatMap(unit => unit.topics
  .filter(topic => draft.scopeMode === 'units' ? draft.unitIds.includes(unit.id) : draft.topicIds.includes(topic.id))
  .map(topic => ({id:topic.id,title:topic.title,unitId:unit.id,unitTitle:unit.title})));
 const summary = $('#compose-scope-summary');
 if (summary) summary.innerHTML = composeScopeSummary(draft);
}

const composeBriefLimit = 1200;
const composeBriefExamples = [
 ['compare','Comparar','Que comparen dos ejemplos del tema y expliquen una semejanza y una diferencia.'],
 ['apply','Resolver un caso','Que usen lo visto en clase para resolver un caso cercano y expliquen cómo eligieron su solución.'],
 ['create','Crear algo','Que preparen una infografía donde expliquen el tema con un ejemplo y una conclusión propia.']
];

function composeAIBrief(draft) {
 const brief = draft.aiBrief ?? '';
 const active = draft.method === 'ai';
 return `<div class="compose-ai-brief" id="compose-ai-brief-panel" ${active ? '' : 'hidden'}>
  <label for="compose-ai-brief">¿Qué te gustaría que haga tu grupo?</label>
  <p id="compose-ai-brief-hint">Para generar, contale a Foxy qué querés que hagan o cómo querés que lo trabajen. Tu idea queda en el borrador docente.</p>
  <textarea id="compose-ai-brief" data-compose="aiBrief" rows="4" maxlength="${composeBriefLimit}" ${active ? 'required' : 'disabled'}
   aria-describedby="compose-ai-brief-hint compose-ai-brief-count compose-ai-brief-error"
   placeholder="Por ejemplo, que comparen dos casos y expliquen qué tienen en común.">${esc(brief)}</textarea>
  <div class="compose-ai-brief-meta">
   <p id="compose-ai-brief-error" class="compose-ai-brief-error" role="alert" hidden></p>
   <span class="compose-ai-brief-count" id="compose-ai-brief-count">${brief.length}/${composeBriefLimit}</span>
  </div>
  <div class="compose-ai-brief-examples" role="group" aria-label="Ejemplos de ideas">
   <span class="compose-ai-brief-examples-label" aria-hidden="true">Ejemplos</span>
   ${composeBriefExamples.map(([id,label]) => btn(label,'compose-brief-example','small','',`data-id="${id}" aria-pressed="false"`)).join('')}
  </div>
  <p id="compose-ai-brief-example" class="compose-ai-brief-example" role="status"></p>
 </div>`;
}

function composeSyncBrief(draft) {
 const panel = $('#compose-ai-brief-panel');
 const field = $('#compose-ai-brief');
 if (!panel || !field) return;
 const active = draft.method === 'ai';
 panel.hidden = !active;
 field.disabled = !active;
 field.required = active;
 composeClearBriefError();
}

function composeClearBriefError() {
 const field = $('#compose-ai-brief');
 const error = $('#compose-ai-brief-error');
 field?.removeAttribute('aria-invalid');
 if (error) error.hidden = true;
}

function composeShowBriefExample(button) {
 const example = composeBriefExamples.find(([id]) => id === button.dataset.id);
 if (!example) return;
 const exampleText = $('#compose-ai-brief-example');
 exampleText.textContent = example[2];
 for (const chip of $$('.compose-ai-brief-examples button')) {
  chip.setAttribute('aria-pressed',String(chip === button));
 }
}

function composeRequireBrief(draft) {
 if (draft.method !== 'ai') return true;
 const brief = draft.aiBrief ?? '';
 const message = !brief.trim() ? 'Escribí una idea para que Foxy prepare la propuesta.'
  : brief.length > composeBriefLimit ? 'Usá hasta '+composeBriefLimit+' caracteres para tu idea.' : '';
 if (!message) return true;
 if ($('#dialog')?.open) closeDialog();
 if (draft.step !== 0) {
  draft.step = 0;
  render();
 }
 const field = $('#compose-ai-brief');
 const error = $('#compose-ai-brief-error');
 if (field && error) {
  field.setAttribute('aria-invalid','true');
  error.textContent = message;
  error.hidden = false;
  field.focus();
  field.scrollIntoView({block:'nearest'});
 }
 return false;
}

function composeScope(draft) {
 const units = curriculumUnits(composeClass(draft));
 const isUnits = draft.scopeMode === 'units';
 const typeOptions = composeTypes.map(([label, glyph, note]) =>
  composeChoice('type',label,label,note,glyph,draft.spec.type === label)).join('');
 const methodOptions = [
  composeChoice('method','manual','Manualmente','Escribís la consigna y los criterios desde cero.','edit',draft.method === 'manual'),
  composeChoice('method','ai','Con ayuda de Foxy','Recibís una propuesta de actividad y una rúbrica que podés editar.','spark',draft.method === 'ai')
 ].join('');
 const scopeList = units.filter(unit => unit.topics.length).map(unit => {
  if (isUnits) return '<label class="compose-unit compose-unit-option"><input type="checkbox" data-compose="unit" value="' + esc(unit.id) + '"' +
   (draft.unitIds.includes(unit.id) ? ' checked' : '') + '><span><b>' + esc(unit.title) + '</b><small>' +
   unit.topics.map(topic => esc(topic.title)).join(', ') + '</small></span></label>';
  return '<fieldset class="compose-unit"><legend>' + esc(unit.title) + '</legend><div class="compose-topics">' +
   unit.topics.map(topic => '<label><input type="checkbox" data-compose="topic" value="' + esc(topic.id) + '"' +
    (draft.topicIds.includes(topic.id) ? ' checked' : '') + '><span>' + esc(topic.title) + '</span></label>').join('') +
   '</div></fieldset>';
 }).join('');
 return `
  <div class="compose-grid">
   <section class="compose-card compose-scope">
    <h2>¿Qué va a trabajar tu grupo?</h2>
    <div class="compose-toggle" role="group" aria-label="Alcance de la actividad">
     ${btn('Temas','compose-scope','', '', 'id="compose-topics-mode" data-value="topics" aria-pressed="'+!isUnits+'"')}
     ${btn('Unidades completas','compose-scope','', '', 'id="compose-units-mode" data-value="units" aria-pressed="'+isUnits+'"')}
    </div>
    <div class="compose-scope-tray">
     ${icon('layers')}<div class="compose-scope-summary" id="compose-scope-summary" role="status">${composeScopeSummary(draft)}</div>
    </div>
    <div class="compose-unit-list">${scopeList || '<p>Agregá temas al plan del aula para poder elegirlos acá.</p>'}</div>
   </section>
   <div class="compose-stack">
    <fieldset class="compose-card compose-choice-group">
     <legend>Tipo de actividad</legend>
     ${typeOptions}
    </fieldset>
    <fieldset class="compose-card compose-choice-group">
     <legend>¿Cómo la querés preparar?</legend>
     ${methodOptions}
     ${composeAIBrief(draft)}
    </fieldset>
   </div>
  </div>`;
}

function composeChoice(group,value,label,note,glyph,checked) {
 return `<label class="compose-choice">
  <input type="radio" name="compose-${group}" data-compose="${group}" value="${esc(value)}" ${checked ? 'checked' : ''}>
  <span class="compose-choice-icon">${icon(glyph)}</span>
  <span class="compose-choice-text"><b>${label}</b><small>${note}</small></span>
 </label>`;
}

function composeField(label,key,value,{id='compose-'+key,type='text',min,max,placeholder='',data=''}={}) {
 const attrs = `id="${id}" data-compose="${key}" ${data} ${placeholder ? 'placeholder="'+esc(placeholder)+'"' : ''}`;
 return `<div class="compose-input"><label for="${id}">${label}</label>${type === 'area'
  ? `<textarea ${attrs} rows="3">${esc(value)}</textarea>`
  : `<input ${attrs} type="${type}" value="${esc(value)}" ${min === undefined ? '' : 'min="'+min+'"'} ${max === undefined ? '' : 'max="'+max+'"'}>`}</div>`;
}

function composeQuestionEdit(item,index) {
 const id = item.id, extra = `data-id="${id}"`;
 const kindOptions = [['text','Respuesta escrita'],['single','Una opción correcta'],['multiple','Varias opciones correctas']];
 const choices = item.kind === 'text' ? '' : `
  <fieldset class="compose-options">
   <legend>Opciones de respuesta</legend>
   <p>Marcá ${item.kind === 'single' ? 'la respuesta correcta' : 'las respuestas correctas'}. Solo vos las vas a ver.</p>
   ${item.options.map((option,i) => `
    <div class="compose-option-edit">
     <input type="${item.kind === 'single' ? 'radio' : 'checkbox'}" name="compose-correct-${id}"
      data-compose="correct" ${extra} data-index="${i}" aria-label="Marcar la opción ${i+1} como correcta" ${item.correct.includes(i) ? 'checked' : ''}>
     <input id="compose-option-${id}-${i}" data-compose="option" ${extra} data-index="${i}" aria-label="Opción ${i+1}" value="${esc(option)}">
     ${btn(icon('trash'),'compose-remove-option','compose-remove','',extra+' data-index="'+i+'" aria-label="Quitar opción '+(i+1)+'" '+(item.options.length < 3 ? 'disabled' : ''))}
    </div>`).join('')}
   ${btn('Agregar opción','compose-add-option','', 'plus', extra)}
  </fieldset>`;
 return `
  <fieldset class="compose-editor-row">
   <legend>Pregunta ${index+1}</legend>
   <div class="compose-fields">
    ${composeField('Enunciado','question-title',item.title,{id:'compose-title-'+id,type:'area',data:extra})}
    <div class="compose-pair">
     <div class="compose-input"><label for="compose-kind-${id}">Tipo de respuesta</label>
      <select id="compose-kind-${id}" data-compose="question-kind" ${extra}>${kindOptions.map(([key,label]) => `<option value="${key}" ${key === item.kind ? 'selected' : ''}>${label}</option>`).join('')}</select>
     </div>
     ${composeField('Puntaje','question-points',item.points,{id:'compose-points-'+id,type:'number',min:1,data:extra})}
    </div>
    ${choices}
    ${composeField('Pista (opcional)','question-hint',item.hint,{id:'compose-hint-'+id,data:extra})}
    ${btn('Quitar pregunta','compose-remove-question','compose-remove','trash',extra)}
   </div>
  </fieldset>`;
}

function composeRubricEdit(item,index) {
 const id = item.id, extra = `data-id="${id}"`;
 return `<fieldset class="compose-editor-row compose-criterion-edit">
  <legend>Criterio ${index+1}</legend>
  <div class="compose-fields">
   ${composeField('Nombre del criterio','rubric-title',item.title,{id:'compose-title-'+id,data:extra})}
   ${composeField('Qué vas a mirar','rubric-description',item.description,{id:'compose-description-'+id,type:'area',data:extra})}
   ${composeField('Peso (%)','rubric-weight',item.weight,{id:'compose-weight-'+id,type:'number',min:1,max:100,data:extra})}
   ${btn('Quitar criterio','compose-remove-criterion','compose-remove','trash',extra)}
  </div>
 </fieldset>`;
}

function composeSignature(draft) {
 return JSON.stringify([draft.spec.type,draft.spec.topics.map(topic => topic.id),draft.aiBrief?.trim() || '']);
}

const composeSections = [
 ['consigna','Consigna','file'],
 ['preguntas','Preguntas','chat'],
 ['rubrica','Rúbrica','chart']
];
let composeSection = 'consigna';
let composeActiveItem = {};

function composeSectionsFor(spec) {
 return composeSections.filter(([key]) => key !== 'preguntas' || spec.type !== 'Trabajo práctico');
}

function composeActiveSection(spec) {
 const keys = composeSectionsFor(spec).map(([key]) => key);
 return keys.includes(composeSection) ? composeSection : keys[0];
}

function composeReadiness(spec) {
 const sections = composeSectionsFor(spec);
 return {total:sections.length,ready:sections.filter(([key]) => !composeContentIssue(spec,key)).length};
}

function composeReadinessLabel(spec) {
 const {total,ready} = composeReadiness(spec);
 return ready === total ? 'Lista para revisar' : ready+' de '+total+' secciones listas';
}

function composeTabs(spec,section) {
 return `<div class="compose-content-nav">
  <div class="compose-content-tabs" role="tablist" aria-label="Secciones de contenido">
   ${composeSectionsFor(spec).map(([key,label,glyph]) => {
    const complete = !composeContentIssue(spec,key);
    return `<button type="button" class="compose-content-tab" id="compose-tab-${key}"
     role="tab" aria-selected="${key === section}" tabindex="${key === section ? 0 : -1}"
     aria-controls="compose-panel-${key}" data-action="compose-tab" data-tab="${key}">
     ${icon(glyph)}<span>${label}</span><span class="compose-tab-status" data-compose-tab-status="${key}" data-ready="${complete}">
     <span aria-hidden="true">${complete ? '✓' : '○'}</span><span class="compose-sr">${complete ? 'Lista' : 'Pendiente'}</span></span>
    </button>`;
   }).join('')}
  </div>
  <div class="compose-content-progress" id="compose-content-progress" role="status">${composeReadinessLabel(spec)}</div>
 </div>`;
}

function composeConsigna(spec) {
 return `<div class="compose-brief-editor">
  <div class="compose-fields">
   <h2>Consigna de la actividad</h2>
   ${composeField('Título','title',spec.title,{placeholder:'Poné un nombre a la actividad'})}
   ${composeField('Objetivo','objective',spec.objective,{placeholder:'¿Qué querés que aprenda tu grupo?'})}
   ${composeField('Instrucciones para el grupo','instructions',spec.instructions,{type:'area',placeholder:'Contales qué hacer y cómo presentar el trabajo.'})}
  </div>
  <div class="compose-due-editor">
   <h3>${icon('calendar')}Fecha de entrega</h3>
   <div class="compose-pair">
    ${composeField('Día','date',spec.date,{type:'date'})}
    ${composeField('Hora','time',spec.time,{type:'time'})}
   </div>
  </div>
 </div>`;
}

function composeItemCaption(item,index,listKey) {
 if (listKey === 'rubrica') return item.title.trim() || 'Criterio '+(index+1);
 return item.title.trim() || 'Pregunta '+(index+1);
}

function composeItemIndex(items,section,selected) {
 const rubric = section === 'rubrica';
 return `<ol class="compose-item-index" aria-label="${rubric ? 'Criterios' : 'Preguntas'}">
  ${items.map((item,index) => `<li><button type="button" id="compose-item-${item.id}" class="compose-item-button"
   data-action="compose-item" data-tab="${section}" data-id="${item.id}" aria-current="${item.id === selected?.id ? 'true' : 'false'}">
   <span class="compose-item-number">${index+1}</span>
   <span class="compose-item-caption" data-compose-caption="${item.id}">${esc(composeItemCaption(item,index,section))}</span>
   ${rubric ? `<span class="compose-item-weight" data-compose-weight="${item.id}">${item.weight}%</span>` : ''}
  </button></li>`).join('')}
 </ol>`;
}

function composeRubricStatus(spec) {
 const total = composeWeightTotal(spec);
 return total === 100 ? 'Pesos completos' : total < 100 ? 'Falta repartir '+(100-total)+'%' : 'Supera el total por '+(total-100)+'%';
}

function composeItems(spec,section) {
 const rubric = section === 'rubrica';
 const items = rubric ? spec.rubric : spec.questions;
 const selected = items.find(item => item.id === composeActiveItem[section]) || items[0];
 const index = selected ? items.indexOf(selected) : 0;
 const label = rubric ? 'Criterio' : 'Pregunta';
 const addAction = rubric ? 'compose-add-criterion' : 'compose-add-question';
 const total = composeWeightTotal(spec);
 return `<div class="compose-items-editor">
  <header class="compose-section-head">
   <div><h2>${rubric ? 'Rúbrica de evaluación' : 'Preguntas de la actividad'}</h2>
    <p>${rubric ? 'Describí qué vas a mirar y cuánto pesa cada criterio.' : 'Elegí una pregunta para editarla o agregá otra.'}</p></div>
   ${btn('Agregar '+label.toLowerCase(),addAction,'','plus','id="'+addAction+'"')}
  </header>
  ${rubric ? `<div class="compose-weight-panel" id="compose-weight-panel" data-complete="${total === 100}" data-over="${total > 100}">
   <div><b id="compose-weight-total">${total}% de 100%</b><span id="compose-weight-status" role="status">${composeRubricStatus(spec)}</span></div>
   <progress id="compose-weight-progress" value="${Math.min(100,total)}" max="100" aria-label="Peso total de la rúbrica"></progress>
   ${items.length > 1 && items.length <= 100 ? btn('Repartir por igual','compose-balance-rubric','quiet','', 'id="compose-balance-rubric"') : ''}
  </div>` : ''}
  ${selected ? `<div class="compose-item-workspace">
    ${composeItemIndex(items,section,selected)}
    <div class="compose-item-editor">${rubric ? composeRubricEdit(selected,index) : composeQuestionEdit(selected,index)}</div>
   </div>` : `<div class="compose-item-empty">${icon(rubric ? 'chart' : 'chat')}<p>${rubric ? 'Agregá el primer criterio de la rúbrica.' : 'Agregá la primera pregunta.'}</p></div>`}
 </div>`;
}

function composeProposalTools(draft) {
 if (draft.method !== 'ai') return '';
 const stale = draft.generatedFor && draft.generatedFor !== composeSignature(draft);
 return `<div class="compose-proposal" data-current="${Boolean(draft.generatedFor && !stale)}">
  <div class="compose-proposal-mark">${icon('spark')}</div>
  <div><b>${stale ? 'Cambió el alcance, el tipo o tu idea' : draft.generatedFor ? 'Propuesta de Foxy' : 'Prepará una propuesta con Foxy'}</b>
   <p>${stale ? 'Podés ajustar la propuesta actual o generar otra con tus cambios.' : draft.generatedFor ? 'Leé la propuesta completa o ajustá cada sección.' : 'Foxy puede sugerir una actividad y una rúbrica según los temas que elegiste.'}</p></div>
  <div class="compose-proposal-actions">
   ${btn('Editar idea','compose-edit-idea','quiet','edit')}
   ${draft.generatedFor ? btn('Leer propuesta','compose-read-proposal','', 'book') : ''}
   ${btn(draft.generatedFor ? 'Generar otra' : 'Generar propuesta','compose-regenerate',draft.generatedFor ? 'quiet' : '', 'spark')}
  </div>
 </div>`;
}

function composeContent(draft) {
 const spec = draft.spec;
 const section = composeActiveSection(spec);
 return `${composeProposalTools(draft)}
  ${composeTabs(spec,section)}
  ${composeSectionsFor(spec).map(([key]) => `<section class="compose-card compose-content-panel ${key === 'rubrica' ? 'compose-rubric' : ''}"
   role="tabpanel" aria-labelledby="compose-tab-${key}" id="compose-panel-${key}" ${key === section ? '' : 'hidden'}>
   ${key === section ? (key === 'consigna' ? composeConsigna(spec) : composeItems(spec,key)) : ''}
  </section>`).join('')}`;
}

function composeUpdateContentStatus(input) {
 const spec = state.author.spec;
 const progress = $('#compose-content-progress');
 if (!progress) return;
 const label = composeReadinessLabel(spec);
 if (progress.textContent !== label) progress.textContent = label;
 for (const [key] of composeSectionsFor(spec)) {
  const badge = $('[data-compose-tab-status="'+key+'"]');
  const complete = !composeContentIssue(spec,key);
  if (badge && badge.dataset.ready !== String(complete)) {
   badge.dataset.ready = String(complete);
   badge.innerHTML = `<span aria-hidden="true">${complete ? '✓' : '○'}</span><span class="compose-sr">${complete ? 'Lista' : 'Pendiente'}</span>`;
  }
 }
 const section = composeActiveSection(spec);
 const items = section === 'rubrica' ? spec.rubric : spec.questions;
 const item = items.find(current => current.id === input.dataset.id);
 if (item && (input.dataset.compose === 'question-title' || input.dataset.compose === 'rubric-title')) {
  const caption = $('[data-compose-caption="'+item.id+'"]');
  if (caption) caption.textContent = composeItemCaption(item,items.indexOf(item),section);
 }
 if (input.dataset.compose !== 'rubric-weight' || !item) return;
 const total = composeWeightTotal(spec);
 $('#compose-weight-panel').dataset.complete = String(total === 100);
 $('#compose-weight-panel').dataset.over = String(total > 100);
 $('#compose-weight-total').textContent = total+'% de 100%';
 $('#compose-weight-progress').value = Math.min(100,total);
 $('#compose-weight-status').textContent = composeRubricStatus(spec);
 $('[data-compose-weight="'+item.id+'"]').textContent = item.weight+'%';
}

const composeWeightTotal = spec => spec.rubric.reduce((total,item) => total + (Number(item.weight) || 0),0);
function composeDue(spec) {
 const day = new Date(spec.date+'T12:00:00');
 if (!Number.isFinite(day.valueOf()) || !spec.time) return 'Fecha pendiente';
 const label = new Intl.DateTimeFormat('es-AR',{day:'numeric', month:'short',year:'numeric'}).format(day);
 return label + ' · ' + spec.time;
}

function composeEditSection(label,section,id='') {
 return btn(label,'compose-edit-section','small','edit',`data-tab="${section}"${id ? ' data-id="'+esc(id)+'"' : ''}`);
}

function composeReview(draft,proposal=false) {
 const spec = draft.spec;
 const rubric = spec.rubric.length ? `<ul class="compose-review-list compose-review-rubric">${spec.rubric.map(item =>
  `<li><b>${esc(item.title || 'Criterio sin título')}</b><strong>${item.weight}%</strong>
   <p class="compose-text">${esc(item.description)}</p>
   ${composeEditSection('Editar criterio','rubrica',item.id)}</li>`).join('')}</ul>` : '<p>No hay criterios todavía.</p>';
 return `
  <div class="compose-grid compose-review ${proposal ? 'compose-proposal-preview' : ''}">
   <div class="compose-stack">
    <article class="compose-card compose-review-task">
     <div class="compose-section-head">
      ${status(esc(spec.type),'orange','file')}
      ${composeEditSection('Editar consigna','consigna')}
     </div>
     <h2>${esc(spec.title || 'Actividad sin título')}</h2>
     <p class="compose-review-due">${icon('calendar')}${esc(composeDue(spec))}</p>
     <h3>Qué vas a aprender</h3><p class="compose-text">${esc(spec.objective || 'Objetivo pendiente')}</p>
     <h3>Qué tenés que hacer</h3><p class="compose-text">${esc(spec.instructions || 'Instrucciones pendientes')}</p>
    </article>
    ${spec.type === 'Trabajo práctico' ? '' : `
     <section class="compose-card compose-question-review">
      <div class="compose-section-head"><h2>Preguntas</h2>${composeEditSection('Editar preguntas','preguntas')}</div>
      ${spec.questions.length ? `<ol class="compose-review-list">
       ${spec.questions.map((item,index) => `<li>
        <div class="compose-question-summary"><span aria-hidden="true">${index+1}</span><div>
         <b>${esc(item.title || 'Enunciado pendiente')}</b>
         <small>${item.points} ${item.points === 1 ? 'punto' : 'puntos'}</small>
        </div></div>
        ${item.options.length ? `<ul class="compose-review-options">${item.options.map((option,i) => `<li>
         ${esc(option || 'Opción pendiente')}${item.correct.includes(i) ? status('Correcta · Solo para vos','green','lock') : ''}
        </li>`).join('')}</ul>` : '<p>Respuesta escrita</p>'}
        ${item.hint ? `<p class="compose-text"><b>Pista</b><br>${esc(item.hint)}</p>` : ''}
        ${composeEditSection('Editar pregunta '+(index+1),'preguntas',item.id)}
       </li>`).join('')}
      </ol>` : '<p>No hay preguntas todavía.</p>'}
     </section>`}
   </div>
   <div class="compose-stack">
    <section class="compose-card compose-rubric">
     <div class="compose-section-head"><h2>Rúbrica</h2>${composeEditSection('Editar rúbrica','rubrica')}</div>
     <p class="compose-review-rubric-total">${composeWeightTotal(spec)}% de 100%</p>
     ${rubric}
    </section>
    <section class="compose-card compose-review-scope">
     <div class="compose-section-head"><h2>Temas incluidos</h2>${btn('Editar alcance','compose-edit-section','small','edit','data-tab="alcance"')}</div>
     <ul class="compose-review-list">${spec.topics.map(topic => `<li><b>${esc(topic.title)}</b><small>${esc(topic.unitTitle)}</small></li>`).join('')}</ul>
    </section>
   </div>
  </div>`;
}

function composeReadProposal() {
 showDialog('Propuesta de actividad','Podés volver a la sección que quieras ajustar.',composeReview(state.author,true),
  btn('Volver a editar','close','primary','edit'),true);
}

function authorScreen() {
 if (!composeClass(state.author) || !state.author?.spec || state.classArchived.includes(state.author.classId)) {
  const legacy = state.author?.spec ? null : state.author;
  state.author = composeNew(classroom().id);
  if (legacy) {
   const spec = state.author.spec;
   for (const key of ['title','objective','instructions','date','time']) {
    if (typeof legacy[key] === 'string') spec[key] = legacy[key];
   }
   if (composeTypes.some(([label]) => label === legacy.type)) spec.type = legacy.type;
   if (typeof legacy.rubric === 'string' && legacy.rubric.trim()) {
    spec.rubric = [{...composeCriterion(100),title:legacy.rubric}];
   }
   for (const title of [legacy.q0,legacy.q1]) {
    if (typeof title === 'string' && title.trim()) spec.questions.push({...composeQuestion(),title});
   }
  }
  composeBaseline = legacy ? '' : JSON.stringify(state.author);
 } else if (!composeBaseline) {
  const saved = state.activityDrafts?.find(item => item.id === state.author.id);
  composeBaseline = saved ? JSON.stringify(saved) : '';
 }
 const draft = state.author;
 const current = draft.step;
 const title = ['Prepará una actividad','Armá el contenido','Revisá antes de publicar'][current];
 const description = [
  'Elegí el alcance, el tipo de actividad y cómo querés prepararla.',
  'Escribí la consigna y definí cómo vas a evaluar el trabajo.',
  'Así queda la actividad. Podés volver a editarla antes de compartirla.'
 ][current];
 const stepper = `<ol class="compose-steps" aria-label="Pasos de creación">${composeSteps.map((name,i) => {
  const label = `<span>${i < current ? icon("check") : i + 1}</span><b>${name}</b>`;
  return `<li ${current === i ? 'aria-current="step"' : ''}>${i < current
   ? `<button type="button" data-action="compose-step" data-id="${i}">${label}</button>`
   : `<div>${label}</div>`}</li>`;
 }).join('')}</ol>`;
 const next = current === 2 ? 'Publicar actividad' : current === 1 ? 'Revisar actividad'
  : draft.method === 'ai' && !draft.generatedFor && !composeHasContent(draft.spec) ? 'Generar propuesta' : 'Continuar';
 const body = [composeScope,composeContent,composeReview][current](draft);
 const footer = `<span class="save-state ${composeDirty() ? 'is-dirty' : ''}" id="compose-save-state" role="status">
 ${icon(composeDirty() || !composeSaved(draft) ? 'lock' : 'check')}${composeDirty() ? 'Cambios sin guardar' : composeSaved(draft) ? 'Borrador guardado' : 'Borrador privado'}</span>
 <div class="actions">${btn('Guardar borrador','compose-save','','save')}${btn(next,current === 2 ? 'compose-publish' : 'compose-next','primary',current === 2 ? 'check' : 'arrow','id="compose-next"')}</div>`;
 return focusShell(`<div class="compose-workspace" data-step="${current}">
  ${stepper}
  <header class="compose-page-head"><h1 tabindex="-1">${title}</h1><p>${description}</p></header>
  <div class="compose-error" id="compose-error" tabindex="-1" role="alert" hidden></div>
  ${body}
 </div>`,'Crear actividad',composeClass(draft).name,footer).replace('class="focus-shell"', 'class="focus-shell compose-shell"');
}


function composeHasContent(spec) {
 return !![spec.title,spec.objective,spec.instructions].some(value => value.trim()) || !!(spec.questions.length || spec.rubric.length);
}

function composeClearError() {
 const alert = $('#compose-error');
 if (alert) alert.hidden = true;
 const described = $('.compose-workspace [aria-describedby="compose-error"]');
 described?.removeAttribute('aria-describedby');
}

function composeProblem(message,target) {
 const alert = $('#compose-error');
 alert.textContent = message;
 alert.hidden = false;
 const field = target ? $(target) : null;
 field?.setAttribute('aria-describedby','compose-error');
 (field || alert).focus({preventScroll:!field});
 if (!field) alert.scrollIntoView({block:'nearest'});
 return false;
}

function composeValidateScope(draft) {
 composeUpdateScope(draft);
 if (!draft.spec.topics.length) return composeProblem('Elegí al menos un tema o una unidad con temas.');
 if (!draft.spec.type) return composeProblem('Elegí el tipo de actividad.','[data-compose="type"]');
 if (!draft.method) return composeProblem('Elegí si querés prepararla a mano o con Foxy.','[data-compose="method"]');
 return composeRequireBrief(draft);
}

function composeBriefIssue(spec) {
 if (!spec.title.trim()) return ['Poné un título para la actividad.','#compose-title'];
 if (!spec.objective.trim()) return ['Escribí el objetivo de la actividad.','#compose-objective'];
 if (!spec.instructions.trim()) return ['Escribí la consigna que va a leer tu grupo.','#compose-instructions'];
 if (!spec.date || !Number.isFinite(Date.parse(spec.date+'T12:00:00'))) return ['Elegí el día de entrega.','#compose-date'];
 if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(spec.time)) return ['Elegí la hora de entrega.','#compose-time'];
 return null;
}

function composeQuestionIssue(spec) {
 if (!spec.questions.length) return ['Agregá al menos una pregunta.','#compose-add-question'];
 for (const [index,item] of spec.questions.entries()) {
  const label = 'Pregunta '+(index+1)+'. ';
  if (!item.title.trim()) return [label+'Escribí el enunciado.','#compose-title-'+item.id,item.id];
  if (!Number.isInteger(item.points) || item.points < 1) {
   return [label+'Ingresá un puntaje entero mayor que cero.','#compose-points-'+item.id,item.id];
  }
  if (item.kind === 'text') continue;
  const missingOption = item.options.findIndex(option => !option.trim());
  if (item.options.length < 2 || missingOption >= 0) {
   return [label+'Completá las opciones de respuesta.','#compose-option-'+item.id+'-'+Math.max(0,missingOption),item.id];
  }
  if (new Set(item.options.map(option => option.trim().toLocaleLowerCase('es-AR'))).size !== item.options.length) {
   return [label+'Escribí opciones distintas.','#compose-option-'+item.id+'-0',item.id];
  }
  if (!item.correct.length || (item.kind === 'single' && item.correct.length !== 1) ||
   (item.kind === 'multiple' && item.correct.length < 2)) {
   return [label+(item.kind === 'single' ? 'Marcá una respuesta correcta.' : 'Marcá al menos dos respuestas correctas.'),
    '[data-compose="correct"][data-id="'+item.id+'"]',item.id];
  }
 }
 return null;
}

function composeRubricIssue(spec) {
 if (!spec.rubric.length) return ['Agregá al menos un criterio a la rúbrica.','#compose-add-criterion'];
 for (const [index,item] of spec.rubric.entries()) {
  const label = 'Criterio '+(index+1)+'. ';
  if (!item.title.trim()) return [label+'Escribí el nombre.','#compose-title-'+item.id,item.id];
  if (!item.description.trim()) return [label+'Describí qué vas a mirar al corregir.','#compose-description-'+item.id,item.id];
  if (!Number.isInteger(item.weight) || item.weight < 1 || item.weight > 100) {
   return [label+'Ingresá un peso entero entre 1 y 100.','#compose-weight-'+item.id,item.id];
  }
 }
 if (composeWeightTotal(spec) !== 100) {
  const item = spec.rubric[0];
  return ['Ajustá los pesos para que la rúbrica sume 100%.','#compose-weight-'+item.id,item.id];
 }
 return null;
}

function composeContentIssue(spec,section) {
 return {consigna:composeBriefIssue,preguntas:composeQuestionIssue,rubrica:composeRubricIssue}[section](spec);
}

function composeValidateContent(spec) {
 const active = composeActiveSection(spec);
 const sections = [active,...composeSectionsFor(spec).map(([key]) => key).filter(key => key !== active)];
 for (const section of sections) {
  const issue = composeContentIssue(spec,section);
  if (!issue) continue;
  const [message,target,itemId] = issue;
  if (section !== active || (itemId && !$(target))) {
   composeSection = section;
   if (itemId) composeActiveItem[section] = itemId;
   render();
  }
  return composeProblem(message,target);
 }
 return true;
}

const composeIntentPatterns = [
 {
  pattern:/\bcompar|\bcontrast|\bsemejan|\bdiferenci/,
  goal:'Comparar ejemplos sobre ',
  instruction:'Elegí dos ejemplos. Explicá una semejanza y una diferencia entre ellos.',
  question:topic=>'Compará dos ejemplos de «'+topic+'». ¿En qué se parecen y en qué se diferencian?',
  criterion:'Comparación de ejemplos',
  evidence:'Identifica semejanzas y diferencias y las explica con evidencias de los ejemplos.'
 },
 {
  pattern:/\bcrea|\bdisen|\bconstru|\barm|\bprepar|\belabor|\bprodu|\bgrab/,
  goal:'Crear una producción sobre ',
  instruction:'Hacé una producción que explique el tema con un ejemplo propio. Mostrá qué decisiones tomaste y explicá por qué.',
  question:topic=>'Diseñá una propuesta para presentar «'+topic+'». ¿Qué incluirías y por qué?',
  criterion:'Producción propia',
  evidence:'Comunica el tema con una producción propia y explica las decisiones tomadas.'
 },
 {
  pattern:/\bresuel|\bresol|\bapli|\bproblema|\bcaso|\bcalcul|\bejercici/,
  goal:'Resolver un caso usando lo aprendido sobre ',
  instruction:'Elegí un caso concreto. Usá lo visto en clase para resolverlo y explicá los pasos que seguiste.',
  question:topic=>'Proponé un caso donde puedas aplicar «'+topic+'». ¿Cómo lo resolverías?',
  criterion:'Resolución del caso',
  evidence:'Aplica lo trabajado a un caso y explica los pasos de la solución.'
 },
 {
  pattern:/\bjustifi|\bargument|\bdefend|\bfundament|\bdebat/,
  goal:'Fundamentar una decisión sobre ',
  instruction:'Tomá una posición sobre el tema y defendela con al menos un ejemplo que sostenga tu argumento.',
  question:topic=>'¿Qué decisión tomarías sobre «'+topic+'»? Justificala con un ejemplo.',
  criterion:'Fundamentación',
  evidence:'Sostiene una decisión con argumentos conectados a ejemplos del tema.'
 },
 {
  pattern:/\banali|\bobser|\beviden|\bexperimen|\binvestig/,
  goal:'Analizar ejemplos de ',
  instruction:'Observá un ejemplo de cada tema y registrá lo que encontraste. Explicá qué te permite concluir.',
  question:topic=>'Observá un ejemplo de «'+topic+'». ¿Qué evidencia encontraste y qué te permite concluir?',
  criterion:'Análisis de evidencias',
  evidence:'Registra observaciones y relaciona la evidencia con sus conclusiones.'
 }
];
const composeDefaultIntent = {
 goal:'Explicar lo aprendido sobre ',
 instruction:'Explicá cada tema con un ejemplo y contá qué aprendiste al trabajarlo.',
 question:topic=>'¿Cómo explicarías «'+topic+'» con un ejemplo propio?',
 criterion:'Explicación con ejemplos',
 evidence:'Explica con claridad y usa ejemplos que ayudan a entender el tema.'
};
const composeFormatPatterns = [
 [/\binfogra/,'una infografía'],[/\bvideo|\baudiovisual/,'un video'],[/\bdiapositiv|\bpresenta/,'una presentación'],
 [/\binforme/,'un informe'],[/\bafiche|\bposter/,'un afiche'],[/\btabla|\bcuadro/,'un cuadro comparativo'],
 [/\bmapa conceptual/,'un mapa conceptual'],[/\baudio|\bpodcast/,'una grabación de audio']
];

function composeProposal(spec,brief) {
 const wording = brief.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu,'');
 const intent = composeIntentPatterns.find(({pattern}) => pattern.test(wording)) || composeDefaultIntent;
 const format = composeFormatPatterns.find(([pattern]) => pattern.test(wording))?.[1];
 const titles = spec.topics.map(topic => topic.title);
 const list = titles.length>3 ? 'los '+titles.length+' temas seleccionados' : new Intl.ListFormat('es-AR',{type:'conjunction'}).format(titles);
 const topicLabel = titles.length > 1 ? titles[0]+' y otros temas' : titles[0];
 const practical = spec.type === 'Trabajo práctico';
 const evaluation = spec.type === 'Evaluación';
 const title = (practical ? 'Aplicamos lo aprendido sobre ' : evaluation ? 'Evaluación de ' : 'Repaso de ')+topicLabel;
 const objective = intent.goal+list+'.';
 const instructions = practical
  ? intent.instruction+' Trabajá sobre '+list+' y entregá '+(format || 'un archivo con tu trabajo')+'.'
  : 'Respondé con tus propias palabras. '+intent.instruction+' Usá los temas seleccionados para sostener tus respuestas.';
 const questions = practical ? [] : spec.topics.map(topic => ({
  ...composeQuestion(),title:intent.question(topic.title),
  hint:evaluation ? '' : 'Podés partir de un ejemplo trabajado en clase.',points:evaluation ? 2 : 1
 }));
 const rubric = [
  {...composeCriterion(60),title:'Uso de los temas',description:'Relaciona las ideas de '+list+' con los ejemplos elegidos.'},
  {...composeCriterion(40),title:intent.criterion,description:intent.evidence}
 ];
 return {title,objective,instructions,questions,rubric};
}

function composeGenerate(fail = false) {
 const draft = state.author;
 if (role !== 'docente' || view !== 'crear' || draft?.method !== 'ai' || !composeRequireBrief(draft)) return;
 if (!draft.spec.topics.length || !draft.spec.type) return;
 const signature = composeSignature(draft);
 const brief = draft.aiBrief.trim();
 const busy = 'Generando una propuesta para tu aula';
 loading(busy,['Revisando tu idea y los temas elegidos','Preparando la actividad y la rúbrica'],() => {
  if (view !== 'crear' || state.author?.id !== draft.id || composeSignature(draft) !== signature) {closeDialog();return;}
  if (fail) {
   showDialog('No se pudo preparar la propuesta','',
    '<div class="notice error"><p>Tus temas y tus cambios siguen acá, incluida tu idea. Podés volver a intentar o seguir editando.</p></div>',
    btn('Volver','close')+btn('Reintentar','compose-generate','primary','spark'));
   return;
  }
  Object.assign(draft.spec,composeProposal(draft.spec,brief));
  draft.generatedFor = signature;
  composeResetEditor();
  closeDialog();
  draft.step = 1;
  render();
  toast('La propuesta está lista para que la revises.','success');
 });
 const loadingCopy = $('#dialog .loading-card > p');
 if (loadingCopy) loadingCopy.textContent = 'Propuesta de ejemplo generada en esta maqueta.';
}

function composeRegenerate() {
 const draft = state.author;
 if (draft?.method !== 'ai' || !composeRequireBrief(draft)) return;
 if (!composeHasContent(draft.spec)) {
  composeGenerate();
  return;
 }
 confirmAction('¿Generás otra propuesta?','Se reemplazarán el título, la consigna, las preguntas y la rúbrica. Se mantienen los temas y la fecha de entrega.','compose-generate','Generar propuesta');
}

function composeNext() {
 const draft = state.author;
 if (draft.step === 0 && composeValidateScope(draft)) {
  if (draft.method === 'ai' && !draft.generatedFor && !composeHasContent(draft.spec)) {
   composeGenerate();
   return;
  }
  composeResetEditor();
  draft.step = 1;
  render();
 } else if (draft.step === 1 && composeValidateContent(draft.spec)) {
  draft.step = 2;
  render();
 }
}

function composeReviewPublication() {
 const draft = state.author;
 if (role !== 'docente' || draft?.step !== 2) return;
 composePublishId = draft.id;
 confirmAction('¿Publicás esta actividad?', 'El grupo de <b>'+esc(composeClass(draft).name)+'</b> va a poder verla y empezar a trabajar.',
  'compose-confirm-publish','Publicar actividad');
}

function composePublish() {
 const draft = state.author;
 if (role !== 'docente' || draft?.step !== 2 || composePublishId !== draft.id ||
  state.classArchived.includes(draft.classId) || !composeClass(draft)) return;
 const previousDrafts = state.activityDrafts || [];
 const spec = structuredClone(draft.spec);
 if (spec.type === 'Trabajo práctico') spec.questions = [];
 const activity = {id:draft.id.replace(/^draft-/,'activity-'),classId:draft.classId,title:spec.title,
  type:spec.type,due:composeDue(spec),state:'pending',publication:'published',spec};
 if (state.activities.some(item => item.id === activity.id)) return;
 state.activities.push(activity);
 state.activityDrafts = previousDrafts.filter(item => item.id !== draft.id);
 state.author = null;
 if (!save()) {
  state.author = draft;
  state.activityDrafts = previousDrafts;
  state.activities.pop();
  return;
 }
 closeDialog();
 state.selectedClass = draft.classId;
 composeLeave();
 toast('La actividad ya está publicada en tu aula.','success');
}

const composeSelection = (value,checked,values) => checked ? [...new Set([...values,value])] : values.filter(item => item !== value);

function composeInput(event) {
 const input = event.target;
 const key = input.dataset.compose;
 if (!key || view !== 'crear' || !state.author?.spec) return;
 const draft = state.author;
 const spec = draft.spec;
 const {value,checked} = input;
 if (key === 'topic' || key === 'unit') {
  const list = key === 'topic' ? 'topicIds' : 'unitIds';
  draft[list] = composeSelection(value,checked,draft[list]);
  composeUpdateScope(draft);
 } else if (key in spec) spec[key] = value;
 else if (key === 'method') {
  draft.method = value;
  composeSyncBrief(draft);
  const next = $('#compose-next');
  if (next) next.innerHTML = icon('arrow') + (value === 'ai' && !draft.generatedFor && !composeHasContent(spec) ? 'Generar propuesta' : 'Continuar');
 } else if (key === 'aiBrief') {
  draft.aiBrief = value;
  const counter = $('#compose-ai-brief-count');
  if (counter) counter.textContent = value.length+'/'+composeBriefLimit;
  composeClearBriefError();
 } else if (key.startsWith('rubric-')) {
  const criterion = spec.rubric.find(item => item.id === input.dataset.id);
  const field = key.slice(7);
  criterion[field] = field === 'weight' ? input.valueAsNumber || 0 : value;

 } else {
  const question = spec.questions.find(item => item.id === input.dataset.id);
  if (!question) return;
  const index = Number(input.dataset.index);
  if (key === 'question-kind') {
   question.kind = value;
   question.options = value === 'text' ? [] : question.options.length ? question.options : ['',''];
   question.correct = value === 'text' ? [] : value === 'single' ? question.correct.slice(0,1) : question.correct;
   composeRepaint('#'+input.id);
  } else if (key === 'correct') {
   question.correct = question.kind === 'single' ? [index] : composeSelection(index,checked,question.correct);
  } else if (key === 'option') question.options[index] = value;
  else if (key === 'question-points') question.points = input.valueAsNumber || 0;
  else question[key.slice(9)] = value;
 }
 composeClearError();
 composeSaveLabel();
 composeUpdateContentStatus(input);
}

function composeResetEditor() {
 composeSection = 'consigna';
 composeActiveItem = {};
}

function composeShowSection(section,itemId='') {
 const draft = state.author;
 const isScope = section === 'alcance';
 if (!isScope && !composeSectionsFor(draft.spec).some(([key]) => key === section)) return;
 if ($('#dialog')?.open) closeDialog();
 draft.step = isScope ? 0 : 1;
 if (!isScope) composeSection = section;
 if (itemId) composeActiveItem[section] = itemId;
 const focus = itemId ? '#compose-title-'+itemId : isScope ? 'main h1' : '#compose-tab-'+section;
 render();
 $(focus)?.focus();
}

function composeTabKeys(event) {
 const tab = event.target.closest('.compose-content-tab');
 if (!tab || !['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
 const tabs = [...tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]')];
 const index = tabs.indexOf(tab);
 const next = event.key === 'Home' ? tabs[0] : event.key === 'End' ? tabs.at(-1)
  : tabs[(index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length];
 event.preventDefault();
 composeSection = next.dataset.tab;
 composeRepaint('#compose-tab-'+composeSection);
}

function composeBalanceRubric() {
 const rubric = state.author.spec.rubric;
 if (rubric.length < 2 || rubric.length > 100) return;
 const base = Math.floor(100/rubric.length);
 const remainder = 100 % rubric.length;
 rubric.forEach((item,index) => {item.weight = base + (index < remainder ? 1 : 0);});
 composeRepaint('#compose-balance-rubric');
 toast('Repartiste el peso entre los criterios.','success');
}

function installAuthoringExperience() {
 const leaveFocus = actions['leave-focus'];
 const demoError = actions['demo-error'];
 const openAITool = actions['ai-tool'];
 const authoring = () => view === 'crear' && role === 'docente' && state.author?.spec;
 Object.assign(actions,{
  'new-activity': button => startActivityAuthor(button.dataset.id || button.dataset.class || classroom()?.id),
  'choose-class-next': () => {
   const selected = $('input[name="choose-class"]:checked');
   if (!selected) {toast('Elegí un aula para continuar.');return;}
   closeDialog();
   startActivityAuthor(selected.value);
  },
  'resume-activity-draft': button => resumeActivityDraft(button.dataset.id),
  'ai-tool': button => {
   if (role === 'docente' && button.dataset.value === 'activity') startActivityAuthor(classroom()?.id,'ai');
   else openAITool(button);
  },
  'leave-focus': () => authoring() ? composeAskExit(composeLeave) : leaveFocus(),
  'demo-error': () => {
   if (!authoring()) {demoError();return;}
   if (!composeValidateScope(state.author)) return;
   composeGenerate(true);
  },
  'compose-scope': button => {
   state.author.scopeMode = button.dataset.value;
   composeUpdateScope(state.author);
   composeRepaint('#'+button.id);
  },
  'compose-step': button => {
   const target = Number(button.dataset.id);
   if (target < state.author.step) {state.author.step = target;render();}
  },
  'compose-tab': button => {
   composeSection = button.dataset.tab;
   composeRepaint('#'+button.id);
  },
  'compose-item': button => {
   composeActiveItem[button.dataset.tab] = button.dataset.id;
   composeRepaint('#'+button.id);
  },
  'compose-edit-section': button => composeShowSection(button.dataset.tab,button.dataset.id),
  'compose-read-proposal': composeReadProposal,
  'compose-edit-idea': () => {
   composeShowSection('alcance');
   $('#compose-ai-brief')?.focus();
  },
  'compose-balance-rubric': composeBalanceRubric,
  'compose-brief-example': composeShowBriefExample,
  'compose-next': composeNext,
  'compose-save': composeSave,
  'compose-save-exit': () => composeFinishExit(true),
  'compose-discard': () => composeFinishExit(false),
  'compose-generate': () => composeGenerate(),
  'compose-regenerate': composeRegenerate,
  'compose-publish': composeReviewPublication,
  'compose-confirm-publish': composePublish,
  'compose-add-question': () => {
   const question = composeQuestion();
   state.author.spec.questions.push(question);
   composeActiveItem.preguntas = question.id;
   composeRepaint('#compose-title-'+question.id);
  },
  'compose-remove-question': button => {
   const spec = state.author.spec;
   spec.questions = spec.questions.filter(item => item.id !== button.dataset.id);
   composeRepaint('#compose-add-question');
  },
  'compose-add-criterion': () => {
   const spec = state.author.spec;
   const item = composeCriterion(Math.max(1,100-composeWeightTotal(spec)));
   spec.rubric.push(item);
   composeActiveItem.rubrica = item.id;
   composeRepaint('#compose-title-'+item.id);
  },
  'compose-remove-criterion': button => {
   const spec = state.author.spec;
   spec.rubric = spec.rubric.filter(item => item.id !== button.dataset.id);
   composeRepaint('#compose-add-criterion');
  },
  'compose-add-option': button => {
   const question = state.author.spec.questions.find(item => item.id === button.dataset.id);
   const index = question.options.push('')-1;
   composeRepaint('#compose-option-'+question.id+'-'+index);
  },
  'compose-remove-option': button => {
   const question = state.author.spec.questions.find(item => item.id === button.dataset.id);
   const index = Number(button.dataset.index);
   if (question.options.length < 3) return;
   question.options.splice(index,1);
   question.correct = question.correct.filter(value => value !== index).map(value => value > index ? value-1 : value);
   composeRepaint('#compose-option-'+question.id+'-'+Math.min(index,question.options.length-1));
  }
 });
 document.addEventListener('input',composeInput);
 document.addEventListener('keydown',composeTabKeys);
 document.addEventListener('click',event => {
  const roleButton = event.target.closest('[data-role]');
  const home = event.target.closest('.compose-shell .focus-header a.brand');
  if (!authoring() || !composeDirty() || !(roleButton || home)) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  composeAskExit(() => {
   if (roleButton) role = roleButton.dataset.role;
   go('inicio');
  });
 },true);
 window.addEventListener('beforeunload',event => {
  if (!authoring() || !composeDirty()) return;
  event.preventDefault();
  event.returnValue = '';
 });
}
