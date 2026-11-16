/* Resolve current sources on every use; classroom references are never private copies. */
let fxContextSection='plan';
function fxContextData(t=fxThread()){
 const teacher=t.role==='docente',folder=teacher?null:state.folders.find(f=>f.id===t.folderId);
 const requestedClassId=teacher?t.context?.classId:(Object.hasOwn(t,'previewClassId')?t.previewClassId:folder?.linkedClassId);
 const c=fxAccessibleClass(requestedClassId,t.role),classUnits=c?curriculumUnits(c):[];
 const ownUnits=(folder?.units||[]).map((title,i)=>({id:folder.id+'-u'+i,title,topics:(folder.unitTopics?.[i]||[title]).map((title,j)=>({id:folder.id+'-u'+i+'-t'+j,title}))}));
 const seen=new Set(),units=[...classUnits,...ownUnits].map(u=>({...u,topics:u.topics.filter(t=>{const key=t.title.trim().toLocaleLowerCase('es');if(seen.has(key))return false;seen.add(key);return true;})})).filter(u=>u.topics.length);
 const privateMaterials=fxPrivateMaterials(t).map(m=>({...m,origin:'private',originName:teacher?'Este chat':'Esta carpeta'}));
 const classMaterials=c?teachingMaterials(c).filter(m=>teacher||(m.publication!=='draft'&&m.visibility!=='private')).map(m=>({...m,origin:'classroom',originName:c.name})):[];
 const materials=[...new Map([...classMaterials,...privateMaterials].filter(m=>!m.status||m.status==='ready').map(m=>[m.id,m])).values()];
 const activities=c?state.activities.filter(a=>a.classId===c.id&&(teacher||a.publication!=='draft')):[];
 const creations=folder?state.foxySpace.creations.filter(x=>x.scope==='estudiante/'+folder.id):[];
 return {kind:folder?'folder':c?'classroom':'general',name:folder?.name||c?.name||'Contexto general',asset:folder?.asset||c?.asset,units,materials,privateMaterials,classMaterials,activities,creations,classId:c?.id||'',folderId:folder?.id||null,linkedClass:c,linkUnavailable:!!requestedClassId&&!c};
}
function fxContextPayload(t=fxThread()){
 const d=fxContextData(t);
 return {kind:d.kind,name:d.name,classId:d.classId,folderId:d.folderId,coverage:'all',unitIds:d.units.map(u=>u.id),topicIds:d.units.flatMap(u=>u.topics.map(t=>t.id)),sourceIds:d.materials.map(m=>m.id),activityIds:d.activities.map(a=>a.id),creationIds:d.creations.map(c=>c.id)};
}
function fxContext(){
 const id=role==='docente'?fxThread().context.classId:fxFolder()?.linkedClassId;
 fxDialogDraft={kind:'context',mode:id?'classroom':'general',classId:id||''};fxContextSection='plan';fxShowContext();
}
function fxContextPreview(d){
 if(d.kind==='general')return `<section class="fx-context-preview general">${icon('chat')}<h3>Tu idea y tus materiales</h3><p>Esta conversación no usa información de tus aulas. Podés sumar archivos a su biblioteca privada para darle más contexto a Foxy.</p><span>${icon('folder')}${d.materials.length} materiales propios listos para usar</span></section>`;
 const groups=[['plan','book','Plan de estudio',d.units.flatMap(u=>u.topics).length,'temas'],['materials','folder','Materiales',d.materials.length,'disponibles'],...(d.classId?[['activities','edit','Actividades',d.activities.length,'compartidas']]:[]),...(d.kind==='folder'?[['creations','spark','Creaciones',d.creations.length,'propias']]:[])];
 const section=groups.some(g=>g[0]===fxContextSection)?fxContextSection:'plan';
 const rows=section==='plan'?d.units.map(u=>`<li><b>${esc(u.title)}</b><span>${u.topics.map(t=>esc(t.title)).join(' · ')}</span></li>`):(section==='materials'?d.materials:section==='activities'?d.activities:d.creations).map(x=>`<li>${icon(section==='materials'?'file':'book')}<div><b>${esc(x.title)}</b><span>${esc(x.kind||x.type||'Recurso')}${x.origin?' · '+esc(x.origin==='private'?'Propio':x.originName):''}${x.publication==='draft'?' · Borrador privado':''}</span></div></li>`);
 return `<section class="fx-context-preview"><div class="fx-context-summary">${img(d.asset||'literature')}<div><h3>${esc(d.name)}</h3><p>${d.linkedClass?'Incluye el contexto vigente de '+esc(d.linkedClass.name)+'.':'Tus temas, materiales y creaciones personales.'}</p></div></div><div class="fx-context-counts" aria-label="Información incluida">${groups.map(([key,ic,title,count,label])=>`<button data-action="fx-context-section" data-value="${key}" aria-pressed="${section===key}">${icon(ic)}<b>${title}</b><span>${count} ${label}</span></button>`).join('')}</div><ul class="fx-context-items">${rows.join('')||'<li>Todavía no hay contenido en esta sección.</li>'}</ul><p class="fx-context-footnote">${icon('check')}${d.linkedClass?'El contenido del aula se consulta actualizado, sin volver a subirlo.':'Los materiales propios se incluyen en tus próximas consultas.'}</p></section>`;
}
function fxShowContext(){
 const d=fxDialogDraft,teacher=role==='docente',classes=fxAccessibleClasses(role);
 const id=d.mode==='classroom'?d.classId:'',temp={...fxThread(),context:{classId:id},previewClassId:id},data=fxContextData(temp);
 showDialog(teacher?'¿Con qué contexto trabajamos?':'El contexto de tu carpeta',teacher?'Combiná un aula con tus propios materiales.':'Vincular un aula es opcional. Tus archivos siempre son privados.',`
 <div class="fx-context-modes" aria-label="Tipo de contexto">${[['general','folder',teacher?'Contexto general':'Sin aula vinculada','Tu biblioteca privada como referencia.'],['classroom','layers','Vincular a un aula','Plan, materiales y actividades actualizados.']].map(([value,ic,title,note])=>`<button data-action="fx-context-mode" data-value="${value}" aria-pressed="${d.mode===value}"><span>${icon(ic)}</span><div><b>${title}</b><small>${note}</small></div>${icon(d.mode===value?'check':'chevron')}</button>`).join('')}</div>
 ${d.mode==='classroom'?`<div class="fx-class-picks" aria-label="Elegir aula">${classes.map(c=>`<button data-action="fx-context-class" data-id="${c.id}" aria-pressed="${d.classId===c.id}">${img(c.asset)}<span><b>${esc(c.name)}</b><small>${esc(c.group)}</small></span>${icon(d.classId===c.id?'check':'chevron')}</button>`).join('')||'<p>No tenés aulas disponibles. Podés seguir con tus materiales propios.</p>'}</div>`:''}
 ${data.linkUnavailable?'<div class="notice error"><p>Esta aula ya no está disponible. Elegí otra o seguí con tus materiales propios.</p></div>':''}
 ${d.mode==='classroom'&&!d.classId?'<div class="fx-context-prompt">Elegí un aula para consultar lo que se incluye.</div>':fxContextPreview(data)}
 <p class="fx-context-switch-note">${teacher?'Si ya conversaste, cambiar de contexto abre otro chat con tus materiales propios. El anterior queda en el historial.':'El vínculo se aplica a esta carpeta. Cambiarlo o quitarlo conserva tus archivos y conversaciones.'}</p><p id="fx-form-error" class="notice error" role="alert" hidden></p>`,btn('Cancelar','fx-close')+btn('Abrir biblioteca','fx-materials','','book')+btn(teacher?'Usar este contexto':'Guardar contexto','fx-context-apply','primary','check',d.mode==='classroom'&&!fxAccessibleClass(d.classId,role)?'disabled':''),true);
 $('#dialog').classList.add('fx-dialog','fx-context-dialog');
}
function fxContextChoose(kind,value){
 if(kind==='mode'){fxDialogDraft.mode=value;if(value==='general')fxDialogDraft.classId='';}
 if(kind==='class')fxDialogDraft.classId=value;if(kind==='section')fxContextSection=value;
 fxShowContext();$(`[data-action="fx-context-${kind}"][data-${kind==='class'?'id':'value'}="${value}"]`)?.focus({preventScroll:true});
}
function fxApplyContext(){
 const d=fxDialogDraft,t=fxThread(),classId=d.mode==='classroom'?d.classId:'';
 if(d.mode==='classroom'&&!fxAccessibleClass(classId,role))return fxFormError('Elegí un aula disponible para continuar.');
 if(role==='estudiante'){
  const f=fxFolder();if(!fxCommit(()=>{if(classId)f.linkedClassId=classId;else delete f.linkedClassId;}))return fxFormError('No pudimos guardar el vínculo. Tus materiales se conservan.');
  closeDialog();fxPaint(t.id);toast(classId?'Tu carpeta ya toma el contexto del aula.':'Tu carpeta sigue con sus materiales propios.','success');return;
 }
 if((t.context.classId||'')===classId){closeDialog();return;}
 if(t.attachments.some(m=>m.status==='processing'))return fxFormError('Esperá a que termine de prepararse el archivo antes de cambiar de contexto.');
 const context={classId,coverage:'all',topicIds:[],sourceIds:[],activityIds:[]};
 if(!t.messages.length){if(!fxCommit(()=>t.context=context))return fxFormError('No pudimos guardar el contexto. Tu idea se conserva.');closeDialog();fxPaint(t.id);$('#fx-message')?.focus();}
 else if(fxNewChat(context,t.draft,t.attachments)){toast('El nuevo chat combina este contexto con tus materiales propios.','success');}
}
