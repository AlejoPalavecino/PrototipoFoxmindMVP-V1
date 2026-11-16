/* Private materials belong to one teacher chat or one student folder. */
let fxLibraryTab='materials',fxLibraryQuery='',fxLibraryFilter='all',fxLibraryRemoval=null;
const fxSourceJobs=new Map();
function fxAccessibleClasses(r=role){return state.classes.filter(c=>!state.classArchived.includes(c.id)&&(r==='docente'||c.roster?.includes('Marina')));}
function fxAccessibleClass(id,r=role){return fxAccessibleClasses(r).find(c=>c.id===id)||null;}
function fxPrivateMaterials(t=fxThread()){return t.role==='docente'?(t.attachments||[]):state.folders.find(f=>f.id===t.folderId)?.materials||[];}
function fxLibraryOwner(t=fxThread()){return {role:t.role,id:t.role==='docente'?t.id:t.folderId,threadId:t.id};}
function fxLibraryStore(owner){return owner.role==='docente'?state.foxySpace.threads.find(t=>t.id===owner.id)?.attachments:state.folders.find(f=>f.id===owner.id)?.materials;}
function fxLibrary(tab='materials'){fxLibraryTab=tab;fxLibraryQuery='';fxLibraryFilter='all';fxOpenTray('library');}
function fxLibraryPanel(){
 const d=fxContextData(),all=[...d.privateMaterials,...d.classMaterials],items=all.filter(m=>(fxLibraryFilter==='all'||m.origin===fxLibraryFilter)&&m.title.toLocaleLowerCase('es').includes(fxLibraryQuery.toLocaleLowerCase('es')));
 return `<div class="fx-library"><div class="fx-library-scope"><span class="fx-tool-icon ${d.linkedClass?'mint':'sky'}">${icon(d.linkedClass?'layers':'lock')}</span><div><b>${d.linkedClass?esc(d.linkedClass.name):'Tu biblioteca privada'}</b><small>${d.linkedClass?'Materiales del aula + tus archivos':role==='docente'?'Archivos de este chat':'Archivos de esta carpeta'}</small></div>${btn(d.linkedClass?'Cambiar':'Vincular aula','fx-context','quiet')}</div>
 ${d.linkUnavailable?'<div class="notice error"><p>El aula vinculada ya no está disponible. Sus materiales no se usan; tus archivos siguen acá.</p></div>':''}
 <nav class="fx-dialog-tabs" aria-label="Contenido de la biblioteca">${[['materials','Materiales'],['plan','Plan de estudio']].map(([value,title])=>`<button data-action="fx-library-tab" data-value="${value}" aria-pressed="${fxLibraryTab===value}">${title}${value==='materials'?`<span>${d.materials.length}</span>`:''}</button>`).join('')}</nav>
 ${fxLibraryTab==='plan'?fxLibraryPlan(d):`<div class="fx-library-actions">${btn('Agregar material','fx-attach','primary','plus')}<span>${icon('lock')}${role==='docente'?'Sólo en este chat':'Sólo en tu carpeta'}</span></div><label for="fx-library-search" class="sr-only">Buscar material</label><div class="search-field">${icon('search')}<input type="search" id="fx-library-search" placeholder="Buscar en tus materiales" value="${esc(fxLibraryQuery)}"></div><div class="fx-filter-row">${[['all','Todos'],['classroom','Del aula'],['private','Mis materiales']].map(([value,label])=>`<button data-action="fx-library-filter" data-value="${value}" aria-pressed="${fxLibraryFilter===value}">${label}</button>`).join('')}</div><div class="fx-library-list">${items.map(fxLibraryRow).join('')||`<div class="fx-library-empty">${icon('book')}<h3>${all.length?'No encontramos ese material':'Tus ideas también tienen fuentes'}</h3><p>${all.length?'Probá otro nombre o cambiá el filtro.':'Agregá un PDF, Word o PowerPoint. Foxy lo tendrá como referencia en tus próximas consultas.'}</p></div>`}</div><p class="fx-library-footnote">${icon(d.linkedClass?'check':'lock')}${d.linkedClass?'Los materiales del aula se consultan actualizados. Tus archivos propios no se comparten.':'Los archivos propios se incluyen sin necesidad de volver a adjuntarlos.'}</p>`}</div>`;
}
function fxLibraryPlan(d){return `<div class="fx-folder-plan">${d.units.map((u,i)=>`<section><h3><span>${i+1}</span>${esc(u.title)}</h3>${u.topics.map(t=>`<button data-action="fx-library-topic" data-id="${t.id}">${icon('book')}<span>${esc(t.title)}</span><b>Estudiar</b>${icon('chevron')}</button>`).join('')}</section>`).join('')||'<p class="fx-muted">Vinculá un aula para consultar su recorrido. También podés trabajar sólo con tus archivos.</p>'}</div>`;}
function fxLibraryRow(m){
 const status=m.status||'ready',privateFile=m.origin==='private',loading=status==='processing',failed=status==='error';
 return `<article class="fx-library-file" data-origin="${m.origin}" data-status="${status}"><button class="fx-library-file-main" data-action="fx-library-read" data-id="${m.id}" ${loading||failed?'disabled':''}><span class="fx-document-icon ${m.kind?.includes('PPT')?'peach':m.kind?.includes('DOC')?'mint':'sky'}">${icon('file')}<small>${esc(m.kind||'Archivo')}</small></span><span><b>${esc(m.title)}</b><small>${privateFile?'Propio · '+esc(m.originName):'Del aula · '+esc(m.originName)}</small><span role="status" class="fx-source-status ${failed?'error':loading?'processing':'ready'}">${loading?'<span class="spinner"></span>':icon(failed?'info':'check')}${loading?'Preparando tu material…':failed?'No se pudo preparar':'En contexto'}</span></span></button>${failed?btn('Reintentar','fx-library-retry','quiet','',`data-id="${m.id}"`):''}${privateFile?`<button class="icon-button" data-action="fx-library-remove" data-id="${m.id}" aria-label="Quitar ${esc(m.title)}">${icon('trash')}</button>`:''}</article>`;
}
function fxLibraryRefresh(owner){
 if(!['foxy','estudio'].includes(view))return;
 const current=fxLibraryOwner();if(owner&&(owner.role!==current.role||owner.id!==current.id))return;
 const d=fxContextData();$$('.fx-library-count').forEach(e=>e.textContent=d.materials.length);
 if(fxTrayIsOpen('library'))fxRefreshTray();
}
function fxLibraryRead(id){
 const m=fxContextData().materials.find(m=>m.id===id);if(!m)return;
 showDialog(esc(m.title),m.origin==='classroom'?'Del aula · '+esc(m.originName):'Material privado · '+esc(m.originName),`<article class="fx-reading-body">${fxText(m.preview||'Archivo de ejemplo. La maqueta conserva su nombre y formato; no extrae el contenido del documento.')}</article><p class="fx-demo-note">Vista de ejemplo. No se procesa el archivo real en esta maqueta.</p>`,btn('Volver a la biblioteca','fx-library','','back'),true);$('#dialog').classList.add('fx-dialog');
}
function fxLibraryRemove(id){
 const m=fxPrivateMaterials().find(m=>m.id===id);if(!m)return;fxLibraryRemoval={owner:fxLibraryOwner(),id};
 showDialog('¿Quitamos este material?',esc(m.title),`<p>Dejará de usarse en las próximas consultas ${role==='docente'?'de este chat':'de esta carpeta'}. Las conversaciones anteriores se conservan.</p><p id="fx-form-error" class="notice error" role="alert" hidden></p>`,btn('Conservar','fx-library')+btn('Quitar material','fx-library-remove-confirm','danger','trash'));$('#dialog').classList.add('fx-dialog');
}
function fxLibraryConfirmRemove(){
 const d=fxLibraryRemoval,items=d&&fxLibraryStore(d.owner);if(!items)return;const i=items.findIndex(m=>m.id===d.id);if(i<0)return;
 if(!fxCommit(()=>items.splice(i,1)))return fxFormError('No pudimos quitar el material. Sigue disponible.');fxSourceJobs.delete(d.id);fxLibraryRemoval=null;fxLibrary();fxLibraryRefresh();toast('Material quitado de tu biblioteca privada.','success');
}
function fxLibraryPrepare(owner,id){
 if(fxSourceJobs.has(id))return;const items=fxLibraryStore(owner),m=items?.find(x=>x.id===id);if(!m)return;
 if(m.status!=='processing'&&!fxCommit(()=>m.status='processing'))return;
 const token={};fxSourceJobs.set(id,token);fxLibraryRefresh(owner);
 setTimeout(()=>{
  if(fxSourceJobs.get(id)!==token)return;fxSourceJobs.delete(id);const current=fxLibraryStore(owner)?.find(x=>x.id===id);if(!current)return;
  if(!fxCommit(()=>current.status='ready')){const restored=fxLibraryStore(owner)?.find(x=>x.id===id);if(restored)restored.status='error';}
  fxLibraryRefresh(owner);
 },900);
}
function fxLibraryInit(){
 for(const t of state.foxySpace.threads){
  t.attachments||=[];
  if(t.role==='estudiante'&&!t.libraryMigrated){const f=state.folders.find(f=>f.id===t.folderId);if(f){for(const m of t.attachments)if(!f.materials.some(x=>x.id===m.id))f.materials.push(m);t.attachments=[];t.libraryMigrated=true;}}
 }
 for(const items of [...state.folders.map(f=>f.materials),...state.foxySpace.threads.filter(t=>t.role==='docente').map(t=>t.attachments)])for(const m of items||[])if(m.status==='processing')m.status='error';
}
