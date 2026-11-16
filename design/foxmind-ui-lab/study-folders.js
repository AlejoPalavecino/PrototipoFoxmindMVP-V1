/* Offline student folder collection and creation. */
const sfCovers = [['literature', 'Creatividad'], ['biology', 'Naturaleza'], ['math', 'Ideas y números']];
const sfSteps = [
 ['Tu carpeta', 'Nombre, materia y portada', 'Dale identidad a tu carpeta', 'Elegí cómo vas a reconocer tu carpeta de estudio.'],
 ['El programa', 'Tu material o el plan de un aula', 'Todo empieza con una buena base', 'Usá tu programa o aprovechá el recorrido de una de tus aulas.'],
 ['El recorrido', 'Unidades y temas a tu manera', 'Un recorrido para estudiar a tu ritmo', 'Ajustá las unidades y los temas que querés estudiar.'],
 ['Todo listo', 'Una última mirada antes de crear', 'Tu carpeta está a un paso', 'Revisá los detalles. Todavía podés cambiar lo que necesites.']
];
const sfFixtureSubjects = {literature:'Fotografía', biology:'Biología', math:'Matemática'};
let sfCollection = 'active', sfInitial = '', sfCloseFocus = '', sfProcess = null, sfDeleteId = null;

function normalizeStudyFolders(model) {
 model.folderDrafts ??= [];
 model.folders.forEach((folder, i) => {
  folder.id ??= 'folder-original-' + (i + 1);
  folder.subject ??= sfFixtureSubjects[folder.asset] || '';
  folder.year ??= '2026';
  folder.units ??= folder.topic ? [folder.topic] : [];
  folder.unitTopics ??= folder.units.map(unit => [unit]);
  folder.materials ??= [];
 });
}

function foldersScreen() {
 normalizeStudyFolders(state);
 const draftMode = sfCollection === 'drafts';
 const tabs = [['active','Activas',state.folders.length],['drafts','Borradores',state.folderDrafts.length]];
 return `<div class="classrooms-page study-folder-collection">${pageHead('Mi estudio','Organizá tus temas, consultá tus materiales y practicá con Foxy.',btn('Crear carpeta','new-folder','primary','plus'))}
 <section class="classrooms-collection" aria-label="Carpetas de estudio"><div class="toolbar collection-toolbar"><div class="segmented" role="group" aria-label="Estado de las carpetas">${tabs.map(([key,label,count])=>`<button data-action="sf-collection" data-value="${key}" aria-pressed="${sfCollection===key}">${label}<span class="collection-count">${count}</span></button>`).join('')}</div></div>
 ${draftMode ? sfDraftCards() : sfActiveCards()}</section></div>`;
}

function sfActiveCards() {
 if (!state.folders.length) return sfEmpty('Todavía no tenés carpetas', 'Creá una carpeta para guardar tu programa y ordenar tus temas.');
 return `<div class="class-grid">${state.folders.map((f,i)=>{
 const linkedClass = f.linkedClassId && fxAccessibleClass(f.linkedClassId,'estudiante');
 return `<a class="class-card" href="${routeHash('estudio','',f.id)}" data-folder="${i}">
 <div class="class-cover">${img(f.asset)}${status('Privada','','lock')}</div><div class="class-body"><h3>${esc(f.name)}</h3>
 <p>${esc([f.subject, f.topic].filter(Boolean).join(' · '))}</p>${linkedClass?`<span class="sf-linked-badge">${icon('book')} ${esc(linkedClass.name)}</span>`:''}<div class="class-bottom"><span>Abrir carpeta</span>${icon('arrow')}</div></div></a>`;
 }).join('')}</div>`;
}

function sfDraftCards() {
 if (!state.folderDrafts.length) return sfEmpty('Todavía no tenés borradores', 'Usá Guardar y salir para retomar la creación de una carpeta más adelante.');
 return `<div class="draft-grid">${state.folderDrafts.map(d=>`<article class="class-draft">${img(d.asset)}<div class="draft-copy">
 <span class="draft-label">${icon('edit')} Borrador</span><h3>${esc(d.name || 'Carpeta sin nombre')}</h3>
 <p>${esc(d.subject || 'Materia pendiente')}</p><div class="draft-progress" aria-label="Paso ${d.savedStep+1} de 4">${sfSteps.map((_,i)=>`<i class="${i<=d.savedStep?'done':''}"></i>`).join('')}</div>
 <div class="draft-actions">${btn('Retomar creación','sf-resume','primary','arrow',`data-id="${esc(d.id)}"`)}<button class="icon-button" data-action="sf-delete" data-id="${esc(d.id)}" aria-label="Eliminar borrador ${esc(d.name||'sin nombre')}">${icon('trash')}</button></div></div></article>`).join('')}</div>`;
}

function sfEmpty(title, message) {
 return `<div class="collection-empty">${img('classroom-world','','')}<h3>${title}</h3><p>${message}</p></div>`;
}

function startFolderWizard() {
 state.wizard = {
  kind:'folder', id:'folder-' + crypto.randomUUID(), name:'', subject:'', year:'2026', asset:'literature',
  file:false, fileName:'', method:null, planPrepared:false, units:[''], unitTopics:[['']]
 };
 wizardStep = 0;
 sfInitial = JSON.stringify(state.wizard);
 showFolderWizard();
}

function sfDetails(w) {
 return `<div class="class-form-grid">${field('sf-name','Nombre de la carpeta',w.name,'text','data-sf-field="name" maxlength="100" placeholder="Por ejemplo: Fotografía y luz" required aria-describedby="wizard-error"')}
 <div class="class-form-pair">${field('sf-subject','Materia',w.subject,'text','data-sf-field="subject" maxlength="100" placeholder="Fotografía" required aria-describedby="wizard-error"')}
 ${field('sf-year','Año',w.year,'number','data-sf-field="year" min="2020" max="2100" required aria-describedby="wizard-error"')}</div></div>
 <fieldset class="class-cover-picker"><legend>Una portada para reconocerla</legend><div>${sfCovers.map(([asset,label])=>`<label class="class-cover-option">${img(asset,'','')}<span><input type="radio" name="sf-cover" value="${asset}" ${w.asset===asset?'checked':''}>${label}${icon('check')}</span></label>`).join('')}</div></fieldset>`;
}

function sfProgram(w) {
 const linked = w.programSource==='class';
 return `<fieldset class="sf-source-picker"><legend>¿De dónde parte tu recorrido?</legend><div>
 <label><input id="sf-source-own" type="radio" name="sf-source" value="own" ${linked?'':'checked'}> Sin aula</label>
 <label><input id="sf-source-class" type="radio" name="sf-source" value="class" ${linked?'checked':''} aria-describedby="wizard-error"> Vincular a mi aula</label>
 </div></fieldset>${linked?sfClassChoices(w):sfOwnProgram(w)}`;
}

function sfClassChoices(w) {
 const classes = fxAccessibleClasses('estudiante');
 if (!classes.length) return '<p class="field-hint">Todavía no tenés aulas activas. Podés seguir con la opción Sin aula.</p>';
 return `<fieldset class="class-methods sf-class-picker"><legend>Elegí un aula</legend><p>Copiá el recorrido y consultá sus materiales.</p>
 ${classes.map(c=>`<label class="class-method"><input type="radio" name="sf-class" value="${esc(c.id)}" ${w.linkedClassId===c.id?'checked':''} aria-describedby="wizard-error">
 ${img(c.asset,'','')}<span><b>${esc(c.name)}</b><small>${esc([c.subject,c.group].filter(Boolean).join(' · '))}</small></span></label>`).join('')}</fieldset>`;
}

function sfOwnProgram(w) {
 return `<div class="program-file ${w.file?'ready':''}">${icon(w.file?'check':'upload')}<div><h4>${w.file?'Tu programa está listo':'Empezá por tu programa'}</h4><p>${w.file?esc(w.fileName):'Un PDF con los temas que querés estudiar.'}</p></div>${btn(w.file?'Cambiar':'Usar archivo de ejemplo','sf-upload',w.file?'quiet':'primary','upload')}</div>
 <p class="class-demo-note">${icon('info')} Carga de ejemplo para explorar la maqueta.</p>
 <fieldset class="class-methods" ${w.file?'':'disabled'}><legend>¿Cómo querés preparar el recorrido?</legend><p>Elegí el punto de partida. Vas a poder editar todo después.</p>
 <label class="class-method"><input type="radio" name="sf-method" value="ai" ${w.method==='ai'?'checked':''}><span class="method-icon">${icon('spark')}</span><span><b>Prepararlo con Foxy</b><small>Una propuesta de unidades y temas a partir del programa de ejemplo.</small></span></label>
 <label class="class-method"><input type="radio" name="sf-method" value="manual" ${w.method==='manual'?'checked':''}><span class="method-icon">${icon('edit')}</span><span><b>Armarlo a mano</b><small>Organizá las unidades y los temas a tu manera.</small></span></label></fieldset>
 ${w.file?'':'<p class="field-hint">Primero cargá el programa para elegir cómo seguir.</p>'}`;
}

function sfUnit(w, i) {
 return `<section class="class-unit-editor"><header><span class="unit-number">${String(i+1).padStart(2,'0')}</span><label for="sf-unit-${i}">Unidad ${i+1}</label>
 ${w.units.length>1?`<button class="icon-button" data-action="sf-remove-unit" data-id="${i}" aria-label="Eliminar unidad ${i+1}">${icon('trash')}</button>`:''}</header>
 <input id="sf-unit-${i}" data-sf-unit="${i}" value="${esc(w.units[i])}" placeholder="Nombre de la unidad" required maxlength="100" aria-describedby="wizard-error">
 <div class="class-topic-list">${w.unitTopics[i].map((topic,j)=>`<div><span aria-hidden="true"></span><label class="sr-only" for="sf-topic-${i}-${j}">Tema ${j+1} de unidad ${i+1}</label>
 <input id="sf-topic-${i}-${j}" data-sf-topic="${i}" data-index="${j}" value="${esc(topic)}" placeholder="Nombre del tema" required maxlength="100" aria-describedby="wizard-error">
 ${w.unitTopics[i].length>1?`<button class="icon-button" data-action="sf-remove-topic" data-id="${i}" data-index="${j}" aria-label="Eliminar tema ${j+1} de unidad ${i+1}">${icon('close')}</button>`:''}</div>`).join('')}</div>
 ${btn('Agregar tema','sf-add-topic','quiet','plus',`data-id="${i}"`)}</section>`;
}

function sfPlan(w) {
 const linked = w.programSource==='class';
 const plan = sfPlanData(w);
 const note = linked ? 'Este recorrido es tu copia privada. Podés ajustar las unidades y los temas a tu ritmo.' :
  w.planPrepared ? 'Revisá la propuesta de ejemplo de Foxy antes de continuar.' : 'Completá el nombre de cada unidad y sus temas.';
 return `<div class="class-plan-note">${icon(!linked&&w.planPrepared?'spark':'edit')}<p>${note}</p></div>
 <div class="class-unit-list">${plan.units.map((_,i)=>sfUnit(plan,i)).join('')}</div>${btn('Agregar unidad','sf-add-unit','','plus')}`;
}

function sfPlanData(w) {
 return w.programSource==='class' ? w.classPlan : w;
}

function sfReview(w) {
 const {units, unitTopics} = sfPlanData(w);
 const themes = unitTopics.flat().length;
 const linked = w.programSource==='class';
 const linkedClass = linked && fxAccessibleClass(w.linkedClassId,'estudiante');
 const reference = linkedClass ? `Vas a poder consultar los materiales actualizados del aula. Los tuyos quedan en tu carpeta privada.` : 'Elegí otra aula o seguí sin vincular una.';
 return `<div class="class-review-card">${img(w.asset,'','')}<div><span>${esc(w.subject)}</span><h4>${esc(w.name)}</h4><p>Año ${esc(w.year)}</p></div>${btn('Editar','sf-details','quiet','edit')}</div>
 ${linked?`<div class="class-ready-note sf-linked-review">${icon('book')}<div><b>${linkedClass?esc(linkedClass.name):'El aula ya no está disponible'}</b><p>${reference}</p></div>${btn('Editar vínculo','sf-program','quiet','edit')}</div>`:''}
 <div class="class-review-head"><div><h4>Tu recorrido de estudio</h4><p>${units.length} ${units.length===1?'unidad':'unidades'} · ${themes} ${themes===1?'tema':'temas'}</p></div>${btn('Editar plan','sf-plan','quiet','edit')}</div>
 <ol class="class-plan-summary">${units.map((unit,i)=>`<li><span>${i+1}</span><div><b>${esc(unit)}</b><p>${unitTopics[i].map(esc).join(' · ')}</p></div></li>`).join('')}</ol>
 <div class="class-ready-note">${icon('lock')}<p>Vas a encontrar tu carpeta en Mi estudio. Sólo vos podés ver sus materiales y conversaciones.</p></div>`;
}

function sfNextLabel(w) {
 if (wizardStep!==1) return 'Continuar';
 if (w.programSource==='class') return 'Revisar mi recorrido';
 if (!w.method) return 'Continuar';
 return w.method==='ai' && !w.planPrepared ? 'Preparar con Foxy' : w.method==='manual' ? 'Armar mi recorrido' : 'Revisar mi recorrido';
}

function showFolderWizard() {
 const w = state.wizard;
 sfProcess = null;
 const [, , heading, description] = sfSteps[wizardStep];
 const rail = `<aside class="class-builder-rail"><ol aria-label="Pasos para crear la carpeta">${sfSteps.map(([name,copy],i)=>`<li class="${i===wizardStep?'current':i<wizardStep?'complete':''}"><button data-action="sf-step" data-id="${i}" ${i>wizardStep?'disabled':''} ${i===wizardStep?'aria-current="step"':''}><span>${i<wizardStep?icon('check'):i+1}</span><div><b>${name}</b><small>${copy}</small></div></button></li>`).join('')}</ol>
 <div class="class-builder-preview">${img(w.asset,'','')}<div><span>Así se va a ver tu carpeta</span><b id="sf-preview-name">${esc(w.name||'Tu próxima carpeta')}</b><small id="sf-preview-subject">${esc(w.subject||'Un lugar para tus temas')}</small></div></div>
 <p class="class-private">${icon('lock')} Tu borrador es sólo tuyo.</p></aside>`;
 const body = `<div class="class-builder">${rail}<section class="class-builder-stage"><div class="class-step-heading"><span>Paso ${wizardStep+1} de 4</span><h3>${heading}</h3><p>${description}</p></div>
 <div class="class-step-content">${[sfDetails,sfProgram,sfPlan,sfReview][wizardStep](w)}</div><p id="wizard-error" class="field-error" role="alert"></p></section></div>`;
 const linked = w.programSource==='class';
 const nextIcon = wizardStep===1 && !linked && w.method==='ai' && !w.planPrepared ? 'spark' : 'arrow';
 const canUseProgram = linked ? fxAccessibleClass(w.linkedClassId,'estudiante') : w.file&&w.method;
 const next = wizardStep===3 ? btn('Crear carpeta','wizard-create','primary','check') :
  btn(sfNextLabel(w),'wizard-next','primary',nextIcon,wizardStep===1&&!canUseProgram?'disabled':'');
 showDialog('Crear una carpeta','',body,`<button class="button quiet class-save" data-action="wizard-save">${icon('save')}Guardar y salir</button><div class="class-step-actions">${wizardStep>0?btn('Atrás','wizard-prev','','back'):''}${next}</div>`,true);
 $('#dialog').className = 'class-wizard study-folder-flow';
 $('#dialog .dialog-body').scrollTop = 0;
}

function validateFolderWizard() {
 const w = state.wizard;
 let invalid;
 let message;
 if (wizardStep===0) {
  const fieldName = ['name','subject'].find(key=>!w[key].trim()) ||
   (!/^\d{4}$/.test(w.year) || +w.year<2020 || +w.year>2100 ? 'year' : null);
  if (fieldName) {
   invalid = $(`[data-sf-field="${fieldName}"]`);
   message = fieldName==='year' ? 'Ingresá un año entre 2020 y 2100.' : 'Completá el nombre y la materia para continuar.';
  }
 } else if (wizardStep===1 && w.programSource==='class' && !fxAccessibleClass(w.linkedClassId,'estudiante')) {
  invalid = $('[name="sf-class"]') || $('#sf-source-class');
  message = 'Elegí un aula disponible para continuar.';
 } else if (wizardStep===1 && w.programSource!=='class' && (!w.file || !w.method)) {
  invalid = w.file ? $('[name="sf-method"]') : $('[data-action="sf-upload"]');
  message = 'Cargá el programa y elegí cómo preparar el recorrido.';
 } else if (wizardStep===2) {
  invalid = $$('#dialog input[required]').find(input=>!input.value.trim());
  message = 'Completá el nombre de cada unidad y tema para continuar.';
 }
 if (!invalid) return true;
 $('#wizard-error').textContent = message;
 invalid.setAttribute('aria-invalid','true');
 invalid.focus();
 return false;
}

function sfLoading(kind, fail=false) {
 const w = state.wizard;
 const token = ++jobToken;
 const uploading = kind==='upload';
 const messages = uploading ? ['Recibiendo tu programa', 'Dejándolo listo para trabajar'] :
  ['Leyendo los temas del ejemplo','Conectando las ideas principales','Armando una propuesta para revisar'];
 let current = 0;
 sfProcess = kind;
 function paint() {
  showDialog(uploading?'Tu programa está llegando':'Foxy está preparando tu recorrido','',
   `<div class="class-process">${img(uploading?'classroom-world':'foxy','','')}<span class="class-process-step">Paso 2 de 4</span>
   <h3>${messages[current]}</h3><p>${uploading?'Enseguida vas a poder elegir cómo organizarlo.':'Vas a poder editar las unidades y los temas.'}</p>
   <div class="class-process-track" role="progressbar" aria-label="Preparación del programa" aria-valuemin="0" aria-valuemax="${messages.length}" aria-valuenow="${current+1}"><span style="width:${(current+1)/messages.length*100}%"></span></div>
   <ol aria-live="polite">${messages.map((m,i)=>`<li class="${i<=current?'active':''}">${i<current?icon('check'):i===current?'<span class="spinner"></span>':icon('clock')}${m}</li>`).join('')}</ol>
   <small>Procesamiento simulado con el archivo de ejemplo</small></div>`,btn('Volver al programa','wizard-back'));
  $('#dialog').classList.add('class-process-dialog','study-folder-flow');
 }
 function advance() {
  if (token!==jobToken || state.wizard!==w) return;
  current++;
  if (current<messages.length) {
   paint();
   setTimeout(advance,850);
   return;
  }
  if (fail) {
   showDialog('No pudimos preparar el plan','',
    `<p class="class-process-error" role="alert">${icon('info')}Tu programa se conserva. Podés reintentar o volver y armar el plan a mano.</p>`,
    btn('Volver al programa','wizard-back')+btn('Volver a intentar','retry-plan','primary'));
   $('#dialog').classList.add('study-folder-flow');
   return;
  }
  if (uploading) {
   w.file = true;
   w.fileName = 'Programa de ejemplo.pdf';
  } else {
   w.units = ['Primeras ideas', 'Aplicar y repasar'];
   w.unitTopics = [[`Conceptos clave de ${w.subject.trim()}`, 'Preguntas para orientarme'], ['Resolver un ejemplo', 'Preparar el repaso']];
   w.planPrepared = true;
   wizardStep = 2;
  }
  showFolderWizard();
 }
 paint();
 setTimeout(advance,850);
}

function organizeFolderPlan(fail=false) {
 sfLoading('ai',fail);
}

function sfNext() {
 if (!validateFolderWizard()) return;
 const w = state.wizard;
 if (wizardStep===1) {
  if (w.programSource==='class') {
   if (!w.classPlan) {
    const units = curriculumUnits(fxAccessibleClass(w.linkedClassId,'estudiante'));
    w.classPlan = {
     units:units.length ? units.map(unit=>unit.title) : [''],
     unitTopics:units.length ? units.map(unit=>unit.topics.length ? unit.topics.map(topic=>topic.title) : ['']) : [['']]
    };
   }
  } else if (w.method==='ai' && !w.planPrepared) {
   organizeFolderPlan();
   return;
  }
 }
 wizardStep = Math.min(3, wizardStep+1);
 showFolderWizard();
}

function sfGoBack() {
 jobToken++;
 wizardStep = 1;
 showFolderWizard();
}

function sfPersist(changes) {
 const previous = state;
 state = {...previous,...changes,wizard:null};
 if (save()) return true;
 state = previous;
 const error = $('#wizard-error');
 error.textContent = 'No pudimos guardar los cambios. Podés reintentar desde este paso.';
 error.scrollIntoView({block:'nearest'});
 return false;
}

function sfSaveDraft() {
 const draft = {...structuredClone(state.wizard), savedStep:wizardStep};
 const drafts = state.folderDrafts.some(d=>d.id===draft.id) ?
  state.folderDrafts.map(d=>d.id===draft.id?draft:d) : [...state.folderDrafts,draft];
 if (!sfPersist({folderDrafts:drafts})) return;
 sfCollection = 'drafts';
 sfReturnToCollection(`[data-action="sf-resume"][data-id="${draft.id}"]`);
 toast('Guardaste el borrador. Podés retomar desde este paso.','success');
}

function sfResume(button) {
 const draft = state.folderDrafts.find(d=>d.id===button.dataset.id);
 if (!draft) return;
 state.wizard = structuredClone(draft);
 wizardStep = draft.savedStep;
 sfInitial = JSON.stringify(state.wizard);
 showFolderWizard();
}

function sfCreate() {
 if (wizardStep!==3) return;
 const w = state.wizard;
 const linked = w.programSource==='class';
 if (linked && !fxAccessibleClass(w.linkedClassId,'estudiante')) {
  wizardStep = 1;
  showFolderWizard();
  $('#wizard-error').textContent = 'El aula ya no está disponible. Elegí otra o seguí con la opción Sin aula.';
  $('#sf-source-class').focus();
  return;
 }
 const plan = sfPlanData(w);
 const units = plan.units.map(unit=>unit.trim());
 const unitTopics = plan.unitTopics.map(topics=>topics.map(topic=>topic.trim()));
 const folder = {
  id:w.id, name:w.name.trim(), asset:w.asset, topic:unitTopics[0][0], subject:w.subject.trim(), year:w.year,
  units, unitTopics, materials:w.file ? [{id:w.id+'-program', title:w.fileName, kind:'PDF', source:'program', demo:true}] : []
 };
 if (linked) folder.linkedClassId = w.linkedClassId;
 const selectedFolder = state.folders.length;
 if (!sfPersist({folders:[...state.folders,folder],folderDrafts:state.folderDrafts.filter(d=>d.id!==w.id),selectedFolder})) return;
 sfCollection = 'active';
 sfReturnToCollection(`[data-folder="${selectedFolder}"]`);
 toast('Tu carpeta ya está en Mi estudio.','success');
}

function sfReturnToCollection(selector) {
 closeDialog();
 const hash = '#estudiante/carpetas';
 if (location.hash!==hash) window.addEventListener('hashchange',()=>$(selector)?.focus({preventScroll:true}),{once:true});
 go('carpetas');
 if (location.hash===hash) $(selector)?.focus({preventScroll:true});
}

function sfCloseFlow() {
 if ($('#dialog').classList.contains('study-folder-confirm')) {
  sfKeepEditing();
  return;
 }
 if (sfProcess) {
  sfGoBack();
  return;
 }
 if (JSON.stringify(state.wizard)===sfInitial) {
  sfDiscardWizard();
  return;
 }
 const current = document.activeElement;
 sfCloseFocus = current?.id ? `#${CSS.escape(current.id)}` : current?.dataset.action ? `[data-action="${current.dataset.action}"]` : '';
 const d = `<p>Podés seguir editando o salir y descartar los cambios de esta sesión.</p>`;
 showDialog('¿Salir de la creación?', '', d, btn('Seguir editando','sf-keep-editing')+btn('Descartar cambios','sf-discard','danger'));
 $('#dialog').classList.add('study-folder-flow','study-folder-confirm');
 $('[data-action="sf-keep-editing"]').focus();
}

function sfKeepEditing() {
 showFolderWizard();
 if (sfCloseFocus) $(sfCloseFocus)?.focus({preventScroll:true});
}

function sfDiscardWizard() {
 state.wizard = null;
 closeDialog();
}

function sfDeleteDraft(button) {
 sfDeleteId = button.dataset.id;
 showDialog('¿Eliminar este borrador?','', '<p>Vas a perder los datos y el plan guardados en el borrador.</p>',
  btn('Cancelar','close') + btn('Eliminar borrador','sf-confirm-delete','danger') + '<p id="wizard-error" class="field-error" role="alert"></p>');
 $('[data-action="close"].button').focus();
}

function sfConfirmDelete() {
 if (!sfPersist({folderDrafts:state.folderDrafts.filter(d=>d.id!==sfDeleteId)})) return;
 sfDeleteId = null;
 sfReturnToCollection('[data-action="sf-collection"][data-value="drafts"]');
 toast('Eliminaste el borrador.','success');
}

function sfEditPlan(action, unit, topic) {
 const w = sfPlanData(state.wizard);
 let focus;
 switch (action) {
 case 'add-unit':
  w.units.push('');
  w.unitTopics.push(['']);
  focus = `#sf-unit-${w.units.length-1}`;
  break;
 case 'remove-unit':
  w.units.splice(unit,1);
  w.unitTopics.splice(unit,1);
  focus = `#sf-unit-${Math.min(unit,w.units.length-1)}`;
  break;
 case 'add-topic':
  w.unitTopics[unit].push('');
  focus = `#sf-topic-${unit}-${w.unitTopics[unit].length-1}`;
  break;
 case 'remove-topic':
  w.unitTopics[unit].splice(topic,1);
  focus = `#sf-topic-${unit}-${Math.min(topic,w.unitTopics[unit].length-1)}`;
  break;
 }
 showFolderWizard();
 $(focus).focus();
}

function installStudyFolders() {
 normalizeStudyFolders(seed);
 normalizeStudyFolders(state);
 const handlers = {
  'wizard-next':sfNext, 'wizard-save':sfSaveDraft, 'wizard-create':sfCreate,
  'wizard-prev':()=>{wizardStep=Math.max(0,wizardStep-1);showFolderWizard();}, 'wizard-back':sfGoBack
 };
 Object.entries(handlers).forEach(([action,handler])=>{
  const previous = actions[action];
  actions[action] = button=>state.wizard?.kind==='folder' ? handler(button) : previous?.(button);
 });
 const close = actions.close;
 Object.assign(actions,{
  close:button=>$('#dialog').classList.contains('study-folder-flow') ? sfCloseFlow() : close(button),
  'new-folder':startFolderWizard, 'sf-upload':()=>sfLoading('upload'),
  'sf-collection':button=>{sfCollection=button.dataset.value;render();$(`[data-action="sf-collection"][data-value="${sfCollection}"]`)?.focus();},
  'sf-resume':sfResume, 'sf-delete':sfDeleteDraft, 'sf-confirm-delete':sfConfirmDelete,
  'sf-step':button=>{const n=Number(button.dataset.id);if(n<wizardStep){wizardStep=n;showFolderWizard();}},
  'sf-details':()=>{wizardStep=0;showFolderWizard();}, 'sf-plan':()=>{wizardStep=2;showFolderWizard();},
  'sf-program':()=>{wizardStep=1;showFolderWizard();},
  'sf-keep-editing':sfKeepEditing, 'sf-discard':sfDiscardWizard
 });
 for (const edit of ['add-unit','remove-unit','add-topic','remove-topic']) {
  actions['sf-'+edit] = button=>sfEditPlan(edit,Number(button.dataset.id),Number(button.dataset.index));
 }
 $('#dialog').addEventListener('cancel',event=>{
  if (!$('#dialog').classList.contains('study-folder-flow')) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  sfCloseFlow();
 },true);
 $('#dialog').addEventListener('input',event=>{
  const w = state.wizard;
  if (w?.kind!=='folder') return;
  const input = event.target;
  const {sfField,sfUnit,sfTopic,index} = input.dataset;
  if (sfField) {
   w[sfField] = input.value;
   $('#sf-preview-name').textContent = w.name || 'Tu próxima carpeta';
   $('#sf-preview-subject').textContent = w.subject || 'Un lugar para tus temas';
  } else if (sfUnit!==undefined) sfPlanData(w).units[sfUnit] = input.value;
  else if (sfTopic!==undefined) sfPlanData(w).unitTopics[sfTopic][index] = input.value;
  else return;
  input.removeAttribute('aria-invalid');
  $('#wizard-error').textContent = '';
 });
 $('#dialog').addEventListener('change',event=>{
  const w = state.wizard;
  if (w?.kind!=='folder') return;
  const input = event.target;
  if (input.name==='sf-cover') {
   w.asset = input.value;
   $('.class-builder-preview img').src = ASSETS[w.asset];
  }
  if (input.name==='sf-method') {
   w.method = input.value;
   const next = $('[data-action="wizard-next"]');
   next.disabled = false;
   next.innerHTML = icon(w.method==='ai'&&!w.planPrepared?'spark':'arrow') + sfNextLabel(w);
  }
  if (input.name==='sf-source') {
   w.programSource = input.value;
   showFolderWizard();
   $(`#${input.id}`).focus();
  }
  if (input.name==='sf-class' && fxAccessibleClass(input.value,'estudiante')) {
   if (w.linkedClassId!==input.value) w.classPlan = null;
   w.linkedClassId = input.value;
   $('[data-action="wizard-next"]').disabled = false;
   $('#wizard-error').textContent = '';
  }
 });
}
