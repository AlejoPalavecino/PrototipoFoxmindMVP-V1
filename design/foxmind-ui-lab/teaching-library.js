/* Classroom library and teaching plan. The offline lab persists metadata only. */
const teachingSeedMaterials = [
  {id:'demo-photo-contrast', classId:'photo', title:'Luces y sombras en una escena', description:'Ejemplos para reconocer el contraste en una imagen.', kind:'PPTX', fileName:'Luces y sombras.pptx', size:960000, unitId:'photo-u0', topicId:'photo-u0-t1', activityIds:['contrast']},
  {id:'demo-photo-unit', classId:'photo', title:'Guía de luz y exposición', description:'Conceptos y preguntas para repasar toda la unidad.', kind:'DOCX', fileName:'Guía de luz y exposición.docx', size:240000, unitId:'photo-u0', activityIds:[]},
  {id:'demo-bio-cell', classId:'bio', title:'La célula bajo el microscopio', description:'Identificá la membrana, el citoplasma y el núcleo en los esquemas.', kind:'PDF', fileName:'La célula bajo el microscopio.pdf', size:1800000, unitId:'bio-u0', topicId:'bio-u0-t0', activityIds:['life']},
  {id:'demo-bio-org', classId:'bio', title:'Mapa de los orgánulos', description:'Una referencia visual de las estructuras internas de la célula.', kind:'PNG', fileName:'Orgánulos.png', size:450000, unitId:'bio-u0', topicId:'bio-u0-t1', activityIds:[]},
  {id:'demo-math-integers', classId:'math', title:'Los enteros en la recta numérica', description:'Ubicá y compará temperaturas, alturas y números negativos.', kind:'PDF', fileName:'Recta numérica.pdf', size:720000, unitId:'math-u0', topicId:'math-u0-t0', activityIds:[]},
  {id:'demo-math-fractions', classId:'math', title:'Fracciones en la cocina', description:'Ejemplos con medidas para leer y comparar fracciones.', kind:'DOCX', fileName:'Fracciones en la cocina.docx', size:285000, unitId:'math-u0', topicId:'math-u0-t2', activityIds:[]}
];
const teachingFileTypes = ['pdf','doc','docx','ppt','pptx','xls','xlsx','odt','odp','ods','txt','csv','png','jpg','jpeg','webp'];
const teachingLimit = 20 * 1024 * 1024;
const teachingFilters = new Map();
const teachingTopics = new Map();
let teachingDraft = null;

function taughtTopicIds(c=classroom()) {
  if(!c) return [];
  const valid = curriculumTopics(c).map(t=>t.id);
  if(!Array.isArray(c.taughtTopicIds)) {
    c.taughtTopicIds = valid.slice(0, Math.max(0, Number(c.taught)||0));
  }
  const previous = c.taughtTopicIds;
  const filtered = [...new Set(previous.filter(id=>valid.includes(id)))];
  if(previous.length!==filtered.length) c.taughtTopicIds=filtered;
  c.taught = c.taughtTopicIds.length;
  return c.taughtTopicIds;
}

function teachingInit() {
  if(!Array.isArray(state.libraryItems)) {
    state.libraryItems = teachingSeedMaterials.filter(m=>state.classes.some(c=>c.id===m.classId)).map(m=>({...m,activityIds:[...m.activityIds]}));
  }
  const known = new Set(state.libraryItems.map(m=>m.id));
  (state.materials||[]).forEach((item,index)=>{
    const id='legacy-material-'+index;
    if(known.has(id)) return;
    const c=state.classes.find(c=>c.id===(item.classId||'photo'));
    if(!c) return;
    const unit=curriculumUnits(c).find(u=>u.title===item.unit);
    const example=!item.classId&&index===0&&item.title==='La luz: exposición y contraste';
    const preview=example
      ?'La exposición describe cuánta luz registra la cámara. Fotografiar una escena cerca de una ventana permite comparar qué detalles aparecen en las luces y las sombras al cambiar la exposición.'
      :item.preview;
    state.libraryItems.push({
      id, classId:c.id, title:item.title, description:item.description||(example?'Una introducción a la exposición con un ejercicio de observación.':''),
      kind:item.kind, fileName:item.fileName||(item.kind==='PDF'?item.title+'.pdf':''), size:item.size,
      ...(unit&&{unitId:unit.id}), ...(example&&unit?.topics[0]&&{topicId:unit.topics[0].id}),
      activityIds:example?['light','observe']:[], preview
    });
  });
  state.classes.forEach(taughtTopicIds);
}

function teachingMaterials(c=classroom()) {
  teachingInit();
  return state.libraryItems.filter(m=>m.classId===c?.id);
}

function materialsForTopic(c, selected) {
  if(!c||!selected) return [];
  return teachingMaterials(c).filter(m=>m.topicId===selected.id||(!m.topicId&&m.unitId===selected.unitId));
}

function teachingClassActivities(c) {
  return state.activities.filter(a=>a.classId===c.id&&a.publication!=='draft');
}

function activitiesForTopic(c, selected) {
  if(!c||!selected) return [];
  return teachingClassActivities(c).filter(a=>learningTopics(a).some(t=>t.id===selected.id));
}

function teachingScope(c) {
  return role+'/'+c.id;
}

function teachingSelectedTopic(c, all=curriculumTopics(c)) {
  return all.find(t=>t.id===teachingTopics.get(teachingScope(c)))||all[0];
}

function teachingSize(size) {
  if(typeof size!=='number') return size||'';
  if(size<1024) return size+' B';
  const scale=size>=1048576?1048576:1024;
  return (size/scale).toLocaleString('es-AR',{maximumFractionDigits:1})+' '+(scale===1024?'KB':'MB');
}

function teachingPlacement(c, item) {
  const unit=curriculumUnits(c).find(u=>u.id===item.unitId);
  const topicName=unit?.topics.find(t=>t.id===item.topicId)?.title;
  return [unit?.title,topicName].filter(Boolean).join(' · ')||'Sin unidad ni tema';
}

function teachingMaterialList(items, c, context='library') {
  return '<div class="teaching-list">'+items.map(m=>{
    const associated=teachingClassActivities(c).filter(a=>m.activityIds.includes(a.id));
    const location=context==='plan'?(m.topicId?'Del tema':'De la unidad'):teachingPlacement(c,m);
    return `<article class="teaching-row">
      <span class="teaching-file-badge" aria-hidden="true">${icon('file')}<small>${esc(m.kind)}</small></span>
      <div class="teaching-row-copy"><strong>${esc(m.title)}</strong>
        <p class="teaching-meta">${[m.kind,location,teachingSize(m.size)].filter(Boolean).map(esc).join(' · ')}</p>
        ${m.description&&context==='library'?`<p>${esc(m.description)}</p>`:''}
        ${associated.length&&context==='library'?`<small>${associated.length} ${associated.length===1?'actividad vinculada':'actividades vinculadas'}</small>`:''}
      </div>
      ${btn('Abrir','teaching-read','quiet','book',`data-id="${esc(m.id)}" aria-label="Abrir ${esc(m.title)}"`)}
    </article>`;
  }).join('')+'</div>';
}

function teachingTopicNavigation(c, selected, ids) {
  return curriculumUnits(c).map(u=>`<section class="teaching-unit">
    <header><h3>${esc(u.title)}</h3><span>${u.topics.filter(t=>ids.includes(t.id)).length} de ${u.topics.length} dados</span></header>
    ${u.topics.length?u.topics.map(t=>{
      const active=t.id===selected.id, given=ids.includes(t.id);
      return `<button type="button" class="teaching-topic-choice" data-action="teaching-topic" data-id="${esc(t.id)}" ${active?'aria-current="true"':''}>
        <span class="teaching-topic-check ${given?'teaching-given':''}">${icon(given?'check':'book')}</span>
        <span>${esc(t.title)}<small>${given?'Dado':'Pendiente'}</small></span>${icon('chevron')}
      </button>`;
    }).join(''):'<p class="teaching-empty">Todavía no hay temas en esta unidad.</p>'}
  </section>`).join('');
}

function planScreen() {
  const c=classroom();
  if(!c) return '';
  const all=curriculumTopics(c), selected=teachingSelectedTopic(c,all), ids=taughtTopicIds(c);
  if(!selected) return `<section id="teaching-plan"><div class="room-section-heading"><h2>Plan de estudio</h2></div>
    ${empty('El aula todavía no tiene temas','Cuando se agreguen unidades y temas, vas a verlos acá.','',true)}</section>`;
  const given=ids.includes(selected.id), related=activitiesForTopic(c,selected), materials=materialsForTopic(c,selected);
  return `<section id="teaching-plan" aria-label="Plan de estudio">
    <header class="room-section-heading"><div><h2>Plan de estudio</h2><p>Elegí un tema para consultar sus materiales y actividades.</p></div>
      <span class="room-progress">${icon('check')}${ids.length} de ${all.length} temas dados</span></header>
    <div class="teaching-plan-layout">
      ${btn(`<span><small>Elegir tema</small><b>${esc(selected.title)}</b></span>${icon('chevron')}`,'teaching-choose-topic','teaching-topic-picker','layers')}
      <nav class="teaching-unit-map" aria-label="Unidades y temas">${teachingTopicNavigation(c,selected,ids)}</nav>
      <article class="teaching-topic-detail" aria-labelledby="teaching-topic-title">
        <header class="teaching-topic-head"><div><p>${esc(selected.unitTitle)}</p><h3 id="teaching-topic-title" tabindex="-1">${esc(selected.title)}</h3>
          ${status(given?'Dado':'Pendiente',given?'green':'blue',given?'check':'clock')}</div>
          ${role==='docente'?btn(given?'Marcar como pendiente':'Marcar como dado','teaching-mark-topic',given?'quiet':'primary',given?'clock':'check',`data-id="${esc(selected.id)}"`):''}
        </header>
        <div class="teaching-related">
          <section><header><h4>Materiales</h4>${role==='docente'?btn('Subir archivo','teaching-add','quiet','plus',`data-id="${esc(selected.id)}"`):''}</header>
            ${materials.length?teachingMaterialList(materials,c,'plan'):'<p class="teaching-empty">Todavía no hay materiales vinculados a este tema o unidad.</p>'}
          </section>
          <section><header><h4>Actividades</h4></header>
            ${related.length?`<div class="teaching-list">${related.map(a=>`<article class="teaching-row"><span class="teaching-file-badge teaching-activity-badge" aria-hidden="true">${icon('edit')}</span>
              <div class="teaching-row-copy"><strong>${esc(a.title)}</strong><p class="teaching-meta">${esc(a.type)} · ${esc(a.due)}</p></div>
              ${btn('Ver actividad','open-activity','quiet','arrow',`data-id="${esc(a.id)}" aria-label="Ver actividad ${esc(a.title)}"`)}</article>`).join('')}</div>`
              :'<p class="teaching-empty">Todavía no hay actividades vinculadas a este tema.</p>'}
          </section>
        </div>
      </article>
    </div>
  </section>`;
}

function teachingLibraryOptions(c, current) {
  const units=curriculumUnits(c);
  return `<option value="">Todos los materiales</option><option value="none" ${current==='none'?'selected':''}>Sin unidad ni tema</option>${units.map(u=>
    `<optgroup label="${esc(u.title)}"><option value="${esc(u.id)}" ${current===u.id?'selected':''}>${esc(u.title)} (unidad)</option>
    ${u.topics.map(t=>`<option value="${esc(t.id)}" ${current===t.id?'selected':''}>${esc(t.title)}</option>`).join('')}</optgroup>`).join('')}`;
}

function teachingLibraryState(c) {
  const key=teachingScope(c);
  if(!teachingFilters.has(key)) teachingFilters.set(key,{query:'',placement:''});
  return teachingFilters.get(key);
}

function teachingNormalize(value) {
  return String(value||'').normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().trim();
}

function teachingLibraryList(c) {
  const {query,placement}=teachingLibraryState(c);
  const needle=teachingNormalize(query);
  const items=teachingMaterials(c).filter(m=>{
    const inPlacement=!placement||placement===m.unitId||placement===m.topicId||(placement==='none'&&!m.unitId&&!m.topicId);
    return inPlacement&&teachingNormalize([m.title,m.description,m.fileName,m.kind,teachingPlacement(c,m)].join(' ')).includes(needle);
  });
  return `<p class="teaching-result-count" role="status">${items.length} ${items.length===1?'material':'materiales'}</p>
    ${items.length?teachingMaterialList(items,c):`<div class="teaching-library-empty">${icon('folder')}
      <h3>${query||placement?'No encontramos materiales con esos filtros':'Todavía no hay materiales'}</h3>
      <p>${query||placement?'Probá otra búsqueda o cambiá el filtro.':'Los recursos compartidos para esta aula van a aparecer acá.'}</p></div>`}`;
}

function libraryScreen() {
  const c=classroom();
  if(!c) return '';
  const {query,placement}=teachingLibraryState(c);
  return `<section id="teaching-library" aria-label="Biblioteca">
    <header class="room-section-heading"><div><h2>Biblioteca</h2><p>Archivos y apuntes compartidos con el aula.</p></div>
      ${role==='docente'?btn('Subir archivo','teaching-add','primary','upload'):''}</header>
    <div class="teaching-library-controls">
      <label>Buscar material<span class="teaching-search">${icon('search')}<input type="search" data-teaching-search placeholder="Título o archivo" value="${esc(query)}"></span></label>
      <label>Unidad o tema<select data-teaching-filter>${teachingLibraryOptions(c,placement)}</select></label>
    </div>
    <div id="teaching-library-results" class="teaching-library-results">${teachingLibraryList(c)}</div>
  </section>`;
}

function teachingReadMaterial(id) {
  const c=classroom(), item=teachingMaterials(c).find(m=>m.id===id);
  if(!item) return;
  const activities=teachingClassActivities(c).filter(a=>item.activityIds.includes(a.id));
  showDialog(esc(item.title),esc(c.name),`<div class="teaching-reader">
    <div class="teaching-reader-file"><span class="teaching-file-badge">${icon('file')}<small>${esc(item.kind)}</small></span>
      <div><b>${esc(item.fileName||item.kind)}</b><p>${esc(teachingSize(item.size)||item.kind)}</p></div>
    </div>
    ${item.description?`<p>${esc(item.description)}</p>`:''}
    <dl><div><dt>Ubicación</dt><dd>${esc(teachingPlacement(c,item))}</dd></div>
      ${activities.length?`<div><dt>Actividades vinculadas</dt><dd>${activities.map(a=>esc(a.title)).join(', ')}</dd></div>`:''}</dl>
    ${item.preview?`<article class="teaching-reader-preview"><h3>Vista previa</h3><p>${esc(item.preview)}</p></article>`:
      '<p class="teaching-demo-note">En esta maqueta se puede consultar la ficha. El archivo original no está disponible.</p>'}
  </div>`,btn('Cerrar','close'),true);
}

function teachingFileError(file) {
  if(!file) return 'Seleccioná un archivo para continuar.';
  if(!teachingFileTypes.includes(file.kind.toLowerCase())) return 'Elegí un archivo en uno de los formatos admitidos.';
  if(file.size===0) return 'El archivo está vacío. Elegí otro para continuar.';
  if(file.size>teachingLimit) return 'El archivo supera el límite de 20 MB. Probá con uno más chico.';
  return '';
}

function teachingUploadClass() {
  const c=classroom();
  return role==='docente'&&teachingDraft?.classId===c?.id?c:null;
}

function teachingDraftActive() {
  return Boolean(teachingDraft&&$('#dialog')?.open&&$('#dialog [data-teaching-upload]'));
}

function teachingOpenUpload(id) {
  const c=classroom();
  if(role!=='docente'||!c) return;
  const selected=curriculumTopics(c).find(t=>t.id===id);
  teachingDraft={classId:c.id, file:null, title:'', description:'', unitId:selected?.unitId||'', topicId:selected?.id||'', activityIds:[], step:1, prepared:false, preparing:false, error:''};
  teachingShowUpload();
}

function teachingShowUpload() {
  const c=teachingUploadClass(), d=teachingDraft;
  if(!c) return;
  const units=curriculumUnits(c);
  const topics=units.find(u=>u.id===d.unitId)?.topics||[];
  const available=teachingClassActivities(c);
  const option=(id,label,value)=>`<option value="${esc(id)}" ${value===id?'selected':''}>${esc(label)}</option>`;
  const body=d.step===1?`<div class="teaching-upload-fields">
    <div class="teaching-file-field">
      <label for="teaching-file">${icon('upload')}<span><b id="teaching-file-label">${d.file?'Cambiar archivo':'Elegir archivo'}</b>
        <small id="teaching-file-hint">PDF, Word, PowerPoint, Excel, OpenDocument, TXT, CSV, PNG, JPG o WebP. Hasta 20 MB.</small></span></label>
      <input id="teaching-file" type="file" data-teaching-file aria-labelledby="teaching-file-label" aria-describedby="teaching-file-hint" accept="${teachingFileTypes.map(ext=>'.'+ext).join(',')}" ${d.preparing?'disabled':''}>
      <div id="teaching-file-selection" class="teaching-file-selection" aria-live="polite">${teachingFileSelection(d.file)}</div>
    </div>
    <label>Título<input type="text" maxlength="100" required data-teaching-field="title" value="${esc(d.title)}" ${d.preparing?'disabled':''}></label>
    <label>Descripción <small>(opcional)</small><textarea rows="3" maxlength="500" data-teaching-field="description" ${d.preparing?'disabled':''}>${esc(d.description)}</textarea></label>
  </div>`:`<div class="teaching-upload-fields">
    <div class="teaching-prepared">${icon('check')}<div><b>Archivo preparado</b><p>${esc(d.file.fileName)} · ${esc(teachingSize(d.file.size))}</p></div></div>
    <div class="teaching-upload-placement">
      <label>Unidad <small>(opcional)</small><select data-teaching-unit>${option('','Sin unidad',d.unitId)}${units.map(u=>option(u.id,u.title,d.unitId)).join('')}</select></label>
      <label>Tema <small>(opcional)</small><select data-teaching-topic-select ${topics.length?'':'disabled'}>${teachingUploadTopicOptions(topics,d.topicId)}</select></label>
    </div>
    <fieldset><legend>Actividades vinculadas <small>(opcional)</small></legend>
      ${available.length?`<div class="teaching-checklist">${available.map(a=>`<label><input type="checkbox" data-teaching-activity value="${esc(a.id)}" ${d.activityIds.includes(a.id)?'checked':''}>
        <span><b>${esc(a.title)}</b><small>${esc(a.type)}</small></span></label>`).join('')}</div>`:'<p>Cuando haya actividades compartidas en esta aula, vas a poder vincularlas.</p>'}
    </fieldset>
  </div>`;
  const continuation=d.step===1?btn(d.preparing?'Preparando…':'Preparar y continuar','teaching-prepare','primary','arrow',d.preparing?'disabled':'')
    :btn('Publicar material','teaching-publish','primary','check');
  showDialog('Subir archivo',esc(c.name),`<div class="teaching-upload" data-teaching-upload aria-busy="${d.preparing}">
    <ol class="teaching-steps" aria-label="Pasos">
      <li ${d.step===1?'aria-current="step"':''}>1. Archivo y detalles</li><li ${d.step===2?'aria-current="step"':''}>2. Organización</li>
    </ol>
    <p class="teaching-demo-note">Carga simulada. La maqueta guarda la ficha en este navegador.</p>
    ${body}<p class="teaching-form-error" id="teaching-form-error" role="alert">${esc(d.error)}</p>
  </div>`,btn('Cancelar','teaching-cancel','quiet')+(d.step===2?btn('Volver','teaching-upload-back'):'' )+continuation,true);
}

function teachingUploadTopicOptions(topics, selected) {
  return '<option value="">Sin tema</option>'+topics.map(t=>`<option value="${esc(t.id)}" ${selected===t.id?'selected':''}>${esc(t.title)}</option>`).join('');
}

function teachingFileSelection(file) {
  return file?`<div><b>${esc(file.fileName)}</b><small>${esc(teachingSize(file.size))}</small></div>
    ${btn('Quitar','teaching-remove-file','quiet','close')}`:'';
}

function teachingSetUploadError(error, focus='') {
  teachingDraft.error=error;
  const alert=$('#teaching-form-error');
  if(alert) alert.textContent=error;
  if(focus) $(focus)?.focus();
}

function teachingPrepare() {
  const d=teachingDraft;
  if(!teachingUploadClass()||!teachingDraftActive()||d.step!==1||d.preparing) return;
  const error=teachingFileError(d.file);
  if(error){teachingSetUploadError(error,'#teaching-file');return;}
  if(!d.title.trim()){teachingSetUploadError('Escribí un título para el material.','[data-teaching-field="title"]');return;}
  d.error='';
  if(d.prepared){d.step=2;teachingShowUpload();return;}
  d.preparing=true;
  teachingShowUpload();
  d.preparationTimer=setTimeout(()=>{
    if(teachingDraft!==d||!teachingDraftActive()||!d.preparing) return;
    d.preparing=false;
    if(!teachingUploadClass()) return;
    d.prepared=true;
    d.step=2;
    teachingShowUpload();
  },650);
}

function teachingConfirmCancel() {
  if(!teachingDraftActive()){closeDialog();return;}
  const d=teachingDraft;
  if($('#dialog [data-teaching-discard]')){teachingShowUpload();return;}
  if(!d.file&&!d.title.trim()&&!d.description.trim()){teachingDraft=null;closeDialog();return;}
  clearTimeout(d.preparationTimer);
  d.preparing=false;
  showDialog('¿Descartar el material?','Podés seguir editando el archivo y sus datos.',
    '<p data-teaching-upload data-teaching-discard>Si descartás, vas a perder los cambios de esta ficha.</p>',
    btn('Seguir editando','teaching-resume')+btn('Descartar','teaching-discard','primary'));
}

function teachingPublish() {
  const c=teachingUploadClass(), d=teachingDraft;
  if(!c||!teachingDraftActive()||d.step!==2||!d.prepared||!d.title.trim()||teachingFileError(d.file)) return;
  teachingInit();
  const unit=curriculumUnits(c).find(u=>u.id===d.unitId);
  const selected=unit?.topics.find(t=>t.id===d.topicId);
  const activityIds=teachingClassActivities(c).filter(a=>d.activityIds.includes(a.id)).map(a=>a.id);
  const item={id:'library-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),classId:c.id,title:d.title.trim(),
    description:d.description.trim(),...d.file,...(unit&&{unitId:unit.id}),...(selected&&{topicId:selected.id}),activityIds};
  state.libraryItems.unshift(item);
  if(!save()){
    state.libraryItems.shift();
    teachingSetUploadError('No pudimos guardar el material. Tus datos siguen en el formulario. Volvé a intentar.');
    return;
  }
  teachingDraft=null;
  closeDialog();
  if($('#teaching-plan')) teachingRefreshPlan('teaching-add',selected?.id);
  else teachingRefreshLibrary();
  toast('Publicaste el material en la biblioteca.','success');
}

function teachingRefreshLibrary() {
  const results=$('#teaching-library-results');
  if(results) results.innerHTML=teachingLibraryList(classroom());
}

function teachingRefreshPlan(action,id) {
  const plan=$('#teaching-plan');
  if(!plan) return;
  plan.outerHTML=planScreen();
  const targets=[...document.querySelectorAll('#teaching-plan [data-action="'+action+'"]')];
  const target=targets.find(b=>(!id||b.dataset.id===id)&&b.getClientRects().length);
  (target||$('#teaching-topic-title'))?.focus({preventScroll:true});
}

function teachingChooseTopic(id) {
  const c=classroom();
  if(!c) return;
  const all=curriculumTopics(c), index=all.findIndex(t=>t.id===id);
  if(index<0) return;
  teachingTopics.set(teachingScope(c),id);
  topic=index;
  const modal=$('#dialog').open;
  if(modal) closeDialog();
  teachingRefreshPlan(modal?'teaching-choose-topic':'teaching-topic',modal?'':id);
}

function teachingMarkTopic(id) {
  const c=classroom();
  if(role!=='docente'||!c||!curriculumTopics(c).some(t=>t.id===id)) return;
  const previous=taughtTopicIds(c), given=previous.includes(id);
  c.taughtTopicIds=given?previous.filter(t=>t!==id):[...previous,id];
  c.taught=c.taughtTopicIds.length;
  if(!save()){
    c.taughtTopicIds=previous;
    c.taught=previous.length;
    return;
  }
  const {scrollX,scrollY}=window;
  render();
  window.scrollTo(scrollX,scrollY);
  $('#teaching-plan [data-action="teaching-mark-topic"]')?.focus({preventScroll:true});
  toast(given?'Marcaste el tema como pendiente.':'Marcaste el tema como dado.','success');
}

function teachingShareCreation() {
  const item=state.creations[selectedCreation];
  const c=state.classes.find(c=>c.id===($('[name="share-class"]:checked')?.value||state.selectedClass));
  if(role!=='docente'||!item||!c) return;
  const parsed=new DOMParser().parseFromString(item.html||'','text/html');
  const preview=[...parsed.querySelectorAll('h3,p')].map(node=>node.textContent.trim()).filter(Boolean).join('\n\n');
  state.materials.push({title:item.title,kind:'Apunte',size:'Texto',classId:c.id,preview});
  const previousClass=state.selectedClass;
  state.selectedClass=c.id;
  teachingInit();
  const id='legacy-material-'+(state.materials.length-1);
  if(!save()){
    state.materials.pop();
    state.libraryItems=state.libraryItems.filter(m=>m.id!==id);
    state.selectedClass=previousClass;
    return;
  }
  closeDialog();
  go('aula','biblioteca');
  toast('Compartiste el material en la biblioteca.','success');
}

function installTeachingLibrary() {
  teachingInit();
  const oldReset=actions['confirm-reset'], oldClose=actions.close, oldAdd=actions['add-material'];
  Object.assign(actions,{
    'confirm-reset':()=>{teachingDraft=null;teachingFilters.clear();teachingTopics.clear();oldReset();teachingInit();},
    close:b=>teachingDraftActive()?teachingConfirmCancel():oldClose(b),
    'add-material':b=>view==='aula'?teachingOpenUpload(tab==='plan'?teachingSelectedTopic(classroom())?.id:null):oldAdd(b),
    'confirm-share':teachingShareCreation,
    'teaching-read':b=>teachingReadMaterial(b.dataset.id),
    'teaching-add':b=>teachingOpenUpload(b.dataset.id),
    'teaching-mark-topic':b=>teachingMarkTopic(b.dataset.id),
    'teaching-topic':b=>teachingChooseTopic(b.dataset.id),
    'teaching-choose-topic':()=>{
      const c=classroom(), selected=teachingSelectedTopic(c);
      if(!selected) return;
      showDialog('Elegir tema',esc(c.name),`<nav class="teaching-topic-dialog" aria-label="Unidades y temas">${teachingTopicNavigation(c,selected,taughtTopicIds(c))}</nav>`,btn('Cerrar','close'));
    },
    'teaching-prepare':teachingPrepare,
    'teaching-publish':teachingPublish,
    'teaching-cancel':teachingConfirmCancel,
    'teaching-discard':()=>{teachingDraft=null;closeDialog();},
    'teaching-resume':teachingShowUpload,
    'teaching-upload-back':()=>{if(teachingUploadClass()){teachingDraft.step=1;teachingDraft.error='';teachingShowUpload();}},
    'teaching-remove-file':()=>{
      if(!teachingUploadClass()||teachingDraft.preparing) return;
      teachingDraft.file=null;
      teachingDraft.prepared=false;
      $('#teaching-file').value='';
      $('#teaching-file-label').textContent='Elegir archivo';
      $('#teaching-file-selection').innerHTML='';
      teachingSetUploadError('','#teaching-file');
    }
  });
  $('#dialog').addEventListener('cancel',e=>{
    if(!teachingDraftActive()) return;
    e.preventDefault();
    e.stopImmediatePropagation();
    teachingConfirmCancel();
  },true);
  document.addEventListener('input',e=>{
    const el=e.target;
    if(el.hasAttribute('data-teaching-search')){
      teachingLibraryState(classroom()).query=el.value;
      teachingRefreshLibrary();
    }
    if(el.dataset.teachingField&&teachingUploadClass()){
      teachingDraft[el.dataset.teachingField]=el.value;
      if(teachingDraft.error) teachingSetUploadError('');
    }
  });
  document.addEventListener('change',e=>{
    const el=e.target;
    if(el.hasAttribute('data-teaching-filter')){
      teachingLibraryState(classroom()).placement=el.value;
      teachingRefreshLibrary();
      return;
    }
    const c=teachingUploadClass(), d=teachingDraft;
    if(!c||!teachingDraftActive()) return;
    if(el.hasAttribute('data-teaching-file')&&el.files[0]){
      const file=el.files[0];
      const kind=file.name.includes('.')?file.name.split('.').pop().toUpperCase():'';
      const metadata={fileName:file.name,size:file.size,kind};
      const error=teachingFileError(metadata);
      if(error){el.value='';teachingSetUploadError(error);return;}
      d.file=metadata;
      d.prepared=false;
      if(!d.title.trim()){
        d.title=file.name.replace(/\.[^.]+$/,'').slice(0,100);
        $('[data-teaching-field="title"]').value=d.title;
      }
      $('#teaching-file-label').textContent='Cambiar archivo';
      $('#teaching-file-selection').innerHTML=teachingFileSelection(metadata);
      teachingSetUploadError('');
    }
    if(el.hasAttribute('data-teaching-unit')){
      d.unitId=el.value;
      d.topicId='';
      const topics=curriculumUnits(c).find(u=>u.id===d.unitId)?.topics||[];
      const picker=$('[data-teaching-topic-select]');
      picker.disabled=!topics.length;
      picker.innerHTML=teachingUploadTopicOptions(topics,'');
    }
    if(el.hasAttribute('data-teaching-topic-select')) d.topicId=el.value;
    if(el.hasAttribute('data-teaching-activity')){
      d.activityIds=d.activityIds.filter(id=>id!==el.value);
      if(el.checked) d.activityIds.push(el.value);
    }
  });
}
