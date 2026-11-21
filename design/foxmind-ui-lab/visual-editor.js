const inkColors={ink:'#243548',orange:'#a34519',green:'#31634e',blue:'#285c85'};
function creationBlocks(c){
  if(c.blocks?.length)return c.blocks;
  return c.body.split(/\r?\n/).filter(line=>line.trim()).map(line=>{
    const heading=/^#{1,6}\s+/.test(line);
    const runs=line.replace(/^#{1,6}\s+/,'').split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(text=>({text:text.replace(/^\*\*(.*)\*\*$/,'$1'),bold:text.startsWith('**'),color:'ink'}));
    return {heading,runs};
  });
}
function blocksMarkup(blocks){
  return blocks.map(b=>{const tag=b.heading?'h3':'p';return '<'+tag+'>'+b.runs.map(r=>{
    const text=esc(r.text);return `<span style="color:${inkColors[r.color]||inkColors.ink}">${r.bold?'<strong>'+text+'</strong>':text}</span>`;
  }).join('')+'</'+tag+'>'}).join('');
}
function editorBlocks(){
  const root=$('#fx-edit-body'),blocks=[];let current;
  function walk(node,bold=false,color='ink',heading=false){
    if(node.nodeType===3){
      if(node.textContent){if(!current){current={heading,runs:[]};blocks.push(current)}current.runs.push({text:node.textContent,bold,color})}return;
    }
    if(node.nodeType!==1)return;
    const block=/^(P|DIV|H[1-6]|LI)$/.test(node.tagName);
    if(block||node.tagName==='BR')current=null;
    const tint=node.style.color||node.getAttribute('color');
    const rgb=tint?.match(/\d+/g);
    const hex=tint?.startsWith('rgb')&&rgb?.length>=3?'#'+rgb.slice(0,3).map(s=>Number(s).toString(16).padStart(2,'0')).join(''):tint;
    const key=Object.keys(inkColors).find(k=>inkColors[k]===hex)||color;
    for(const child of node.childNodes)walk(child,bold||['B','STRONG'].includes(node.tagName)||node.style.fontWeight==='bold',key,heading||/^H[1-6]$/.test(node.tagName));
    if(block)current=null;
  }
  for(const n of root.childNodes)walk(n);
  return blocks.filter(b=>b.runs.some(r=>r.text.trim()));
}
function markdownFromBlocks(blocks){return blocks.map(b=>(b.heading?'## ':'')+b.runs.map(r=>r.bold?'**'+r.text+'**':r.text).join('')).join('\n\n')}
function showVisualEditor(draft){
  const c=fxOwnedCreation(fxEditing);if(!c)return;
  const blocks=draft?.blocks||creationBlocks(c);
  showDialog('Editar creación','',`<form id="fx-edit-form" data-form="fx-edit" novalidate>
  <label for="fx-edit-title">Título del recurso</label><input id="fx-edit-title" name="title" maxlength="120" value="${esc(draft?.title??c.title)}" required>
  <label id="fx-content-label">Contenido</label><div class="fx-format-tools" role="group" aria-label="Formato del texto seleccionado">
  ${[['paragraph','Párrafo'],['heading','Subtítulo'],['bold','Negrita']].map(([v,t])=>btn(t,'fx-format','','',`data-value="${v}"`)).join('')}
  ${Object.entries({ink:'Tinta',orange:'Naranja',green:'Verde',blue:'Azul'}).map(([v,t])=>`<button type="button" class="fx-color" style="--swatch:${inkColors[v]}" data-action="fx-format" data-value="${v}" aria-label="Color ${t}" title="${t}"></button>`).join('')}</div>
  <div id="fx-edit-body" role="textbox" aria-multiline="true" aria-labelledby="fx-content-label" class="fx-rich-paper" contenteditable="true">${blocksMarkup(blocks)}</div>
  <p id="fx-form-error" class="notice error" role="alert" hidden></p></form>`,btn('Cancelar','fx-edit-cancel')+'<button class="button primary" form="fx-edit-form">Guardar cambios</button>',true);
  $('#dialog').classList.add('fx-dialog','fx-result-reader');
  let selection;
  const editor=$('#fx-edit-body');
  const remember=()=>{const sel=getSelection();if(sel.rangeCount&&editor.contains(sel.anchorNode)&&editor.contains(sel.focusNode))selection=sel.getRangeAt(0).cloneRange()};
  ['keyup','mouseup','focusout'].forEach(event=>editor.addEventListener(event,remember));
  editor.addEventListener('paste',e=>{e.preventDefault();document.execCommand('insertText',false,e.clipboardData.getData('text/plain'))});
  editor.addEventListener('drop',e=>e.preventDefault());
  $('.fx-format-tools').onmousedown=e=>e.preventDefault();
  actions['fx-format']=b=>{
    editor.focus();if(selection&&editor.contains(selection.commonAncestorContainer)){const sel=getSelection();sel.removeAllRanges();sel.addRange(selection)}
    const key=b.dataset.value;
    if(inkColors[key])document.execCommand('foreColor',false,inkColors[key]);
    else if(key==='bold')document.execCommand('bold');
    else document.execCommand('formatBlock',false,key==='heading'?'h3':'p');
    remember();
  };
}
function captureVisualEdit(){return {title:$('#fx-edit-title').value,blocks:editorBlocks()}}
function saveVisualEdit(){
  const c=fxOwnedCreation(fxEditing),d=captureVisualEdit(),body=markdownFromBlocks(d.blocks);
  if(!d.title.trim())return fxFormError('Escribí un título.','#fx-edit-title');
  if(!body.trim()||body.length>12000)return fxFormError('Escribí entre 1 y 12000 caracteres.','#fx-edit-body');
  if(!fxCommit(()=>Object.assign(c,{title:d.title.trim(),blocks:d.blocks,body,revision:(c.revision||1)+1})))return;
  fxDialogDraft=null;fxCreation(c.id);toast('Cambios guardados.','success');
}
function cancelVisualEdit(){
  const c=fxOwnedCreation(fxEditing),d=captureVisualEdit();
  if(c.title===d.title&&blocksMarkup(creationBlocks(c))===blocksMarkup(d.blocks)){fxCreation(c.id);return}
  fxDialogDraft=d;showDialog('¿Descartás los cambios?','Podés volver a la edición.', '',btn('Seguir editando','fx-continue-edit')+btn('Descartar','fx-discard-edit','danger'));$('#dialog').classList.add('fx-discard-dialog');
}
