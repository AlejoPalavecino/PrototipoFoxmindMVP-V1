import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {renderToStaticMarkup} from 'react-dom/server';
import {loadTsModule} from './helpers/load-ts-module.mjs';
import {componentWithPorts} from './foxmind-3d-flows-loader.test.mjs';
import {hookView,descendants,deferred} from './agenda-ui-helpers.test.mjs';

const id=randomUUID(),other=randomUUID();
const inspection=(revision='0',title='Original')=>({asset:{id,state:'READY',revision:'2',kind:'IMAGE'},payload:{title:'Original',description:'Texto original'},editorial:{revision,title,description:'Contenido guardado'},canPreview:true,canEdit:true});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const diagram={schemaVersion:'foxy-diagram-v1',title:'Ciclo privado',description:'Descripción del ciclo',direction:'TOP_DOWN',nodes:[{id:'a',label:'Agua'},{id:'b',label:'Vapor'},{id:'c',label:'Nube <script>'}],edges:[{from:'a',to:'b',label:'Evapora'},{from:'b',to:'c',label:'Condensa'},{from:'c',to:'a',label:'Precipita'},{from:'a',to:'c',label:'Relación adicional'}]};

test('authorized diagram reader presents every real node and edge legibly without flattening branching or cycles',()=>{
 const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{}),info=inspection();info.asset.kind='DIAGRAM';info.payload.diagram=diagram;
 const tree=FoxyVisualReader({assetId:id,inspection:info,loading:false,error:null,onClose(){},onRetry(){},onShare(){},assetFileUrl:asset=>`/api/v1/foxy-ai/assets/${asset}/file?mode=preview`});
 const html=renderToStaticMarkup(tree);assert.match(html,/aria-label="Esquema de conceptos"/);assert.match(html,/Nube &lt;script&gt;/);assert.doesNotMatch(html,/<img|<script>/);
 const reader=descendants(tree,node=>node.type?.name==='InteractiveDiagram')[0];
 assert.deepEqual(reader.props.diagram,diagram);
 for(const edge of diagram.edges) {
  const from=diagram.nodes.find(node=>node.id===edge.from).label.replace('<','&lt;').replace('>','&gt;');
  const to=diagram.nodes.find(node=>node.id===edge.to).label.replace('<','&lt;').replace('>','&gt;');
  assert.ok(html.includes(`aria-label="${from}: ${edge.label} → ${to}"`),edge.label);
 }
});

test('diagram rendering enforces private-reader guards and invalid structure or IMAGE keep PNG fallback',()=>{
 const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{}),info=inspection();info.asset.kind='DIAGRAM';info.payload.diagram=diagram;
 const props={assetId:id,inspection:info,loading:false,error:null,onClose(){},onRetry(){},onShare(){},assetFileUrl:asset=>`/api/v1/foxy-ai/assets/${asset}/file?mode=preview`};
 for(const patch of [{inspection:{...info,canPreview:false}},{assetId:other},{error:'Sin acceso'},{loading:true},{assetFileUrl:()=>`https://external.invalid/${id}`}])assert.doesNotMatch(renderToStaticMarkup(FoxyVisualReader({...props,...patch})),/Ciclo privado|Agua|Evapora|Esquema de conceptos|<img/);
 for(const patch of [{asset:{...info.asset,kind:'IMAGE'}},{payload:{...info.payload,diagram:{...diagram,nodes:[]}}},{payload:{...info.payload,diagram:{...diagram,edges:[{from:'a',to:'missing',label:'Inválida'}]}}}]){
  const html=renderToStaticMarkup(FoxyVisualReader({...props,inspection:{...info,...patch}}));assert.match(html,/<img/);assert.doesNotMatch(html,/aria-label="Esquema de conceptos"|Inválida/);
 }
});
async function fixture(){const calls=[],client={inspectAsset:async()=>inspection(),updateVisualEditorial:async(asset,input)=>{calls.push({asset,input});return inspection('1',input.title);}};
  const {createFoxyVisualEditorController}=loadTsModule('apps/web/src/features/foxy/visuals/foxy-visual-editor-controller.ts');
  const controller=createFoxyVisualEditorController({client,onChange(){}});controller.syncAsset(id);await turn();return {client,controller,calls};}

test('editor retries the same uncertain request and original restoration is an unsaved draft',async()=>{
  const {client,controller:c,calls}=await fixture();try{
    c.updateDraft({title:'Editado',description:'Nuevo contenido'});
    let fails=true;client.updateVisualEditorial=async(asset,input)=>{calls.push({asset,input});if(fails){fails=false;throw Object.assign(Error(),{code:'SERVICE_UNAVAILABLE'});}return inspection('1',input.title);};
    assert.equal(await c.save(),false);assert.ok(c.getState().pending);c.updateDraft({title:'No permitido',description:''});assert.equal(c.getState().draft.title,'Editado');
    assert.equal(await c.retry(),true);assert.deepEqual(calls[0],calls[1]);assert.equal(c.getState().inspection.editorial.revision,'1');
    c.restore();assert.deepEqual(c.getState().draft,{title:'Original',description:'Texto original'});assert.equal(c.getState().dirty,true);assert.equal(calls.length,2);
  }finally{c.dispose();}
});

test('conflict preserves the local draft until explicit resolution and saves using the refreshed revision',async()=>{
  const {client,controller:c,calls}=await fixture();try{
    c.updateDraft({title:'Mi título',description:'Mi explicación'});
    client.inspectAsset=async()=>inspection('7','Otra sesión');client.updateVisualEditorial=async()=>{throw Object.assign(Error(),{code:'CONFLICT'});};
    await c.save();assert.equal(c.getState().conflict,true);assert.equal(c.getState().draft.title,'Mi título');assert.equal(c.getState().inspection.editorial.title,'Otra sesión');
    c.resolveConflict(true);client.updateVisualEditorial=async(asset,input)=>{calls.push(input);return inspection('8',input.title);};await c.save();assert.equal(calls[0].expectedRevision,'7');
  }finally{c.dispose();}
});

test('late read for previous selection and denied save cannot expose private metadata',async()=>{
  const {client,controller:c}=await fixture();try{
    const gate=deferred();client.inspectAsset=async()=>gate.promise;c.syncAsset(other);c.syncAsset('');gate.resolve(inspection());await turn();assert.equal(c.getState().inspection,null);
    client.inspectAsset=async()=>inspection();c.syncAsset(id);await turn();c.updateDraft({title:'Privado',description:'Privado'});client.updateVisualEditorial=async()=>{throw Object.assign(Error(),{code:'FORBIDDEN'});};await c.save();
    assert.equal(c.getState().inspection,null);assert.equal(c.getState().draft,null);assert.equal(c.getState().pending,null);
  }finally{c.dispose();}
});

test('late read of the same selection cannot overwrite a newer editorial version',async()=>{
  const {client,controller:c}=await fixture();try{
    const old=deferred();let count=0;client.inspectAsset=()=>++count===1?old.promise:Promise.resolve(inspection('9','Actual'));
    const earlier=c.refresh();await c.refresh();old.resolve(inspection('1','Anterior'));await earlier;
    assert.equal(c.getState().inspection.editorial.title,'Actual');assert.equal(c.getState().inspection.editorial.revision,'9');
  }finally{c.dispose();}
});

test('editor validates title and description while allowing optional empty description',async()=>{
  const {controller:c,calls}=await fixture();try{
    for(const draft of [{title:'\tInválido',description:''},{title:' ',description:''},{title:'Título',description:'x'.repeat(12001)}]){c.updateDraft(draft);assert.equal(await c.save(),false);}
    assert.equal(calls.length,0);c.updateDraft({title:'Título',description:''});assert.equal(await c.save(),true);assert.equal(calls.length,1);
  }finally{c.dispose();}
});

test('reader presents current editorial text and hides both metadata and links during errors',()=>{
  const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{});
  const props={assetId:id,inspection:inspection('2','Editado <script>'),loading:false,error:null,onClose(){},onRetry(){},onShare(){},assetFileUrl:(asset,mode)=>`/api/v1/foxy-ai/assets/${asset}/file?mode=${mode}`};
  const html=renderToStaticMarkup(FoxyVisualReader(props));
  assert.match(html,/Editado &lt;script&gt;/);
  assert.match(html,/Contenido guardado/);
  assert.doesNotMatch(html,/Descargar TXT/);
  assert.doesNotMatch(renderToStaticMarkup(FoxyVisualReader({...props,error:'Sin acceso'})),/Editado|Contenido guardado|<img|mode=download/);
});

test('dialog cancel and Escape require discard confirmation and preserve the unsaved draft',async()=>{
  const {controller:c}=await fixture();const calls=[];
  const {FoxyVisualReaderDialog}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader-dialog.tsx',{});
  c.updateDraft({title:'Mi edición',description:'Sin guardar'});
  const props={assetId:id,state:c.getState(),actions:c,assetFileUrl:asset=>`/api/v1/foxy-ai/assets/${asset}/file?mode=preview`,onClose:()=>calls.push('close'),sharing:null};
  const view=hookView(FoxyVisualReaderDialog,props),button=label=>descendants(view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes(label))[0];
  try{await view.flush();button('Cancelar').props.onClick();await view.flush();assert.match(renderToStaticMarkup(view.tree),/¿Descartás tus cambios/);assert.equal(c.getState().draft.title,'Mi edición');
    button('Seguir editando').props.onClick();await view.flush();view.tree.props.onCancel({preventDefault(){}});await view.flush();assert.match(renderToStaticMarkup(view.tree),/¿Descartás tus cambios/);assert.deepEqual(calls,[]);
    button('Descartar').props.onClick();assert.deepEqual(calls,['close']);assert.equal(c.getState().dirty,false);
  }finally{view.close();c.dispose();}
});

test('reader opens sharing explicitly and returns without losing external publication state',async()=>{
  const {controller:c}=await fixture(),calls=[];
  const {FoxyVisualReaderDialog}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader-dialog.tsx',{});
  const props={assetId:id,state:c.getState(),actions:{...c,refresh:()=>{}},assetFileUrl:asset=>`/api/v1/foxy-ai/assets/${asset}/file?mode=preview`,onClose:()=>calls.push('close'),sharing:'Destino conservado'};
  const view=hookView(FoxyVisualReaderDialog,props);
  try{await view.flush();assert.doesNotMatch(renderToStaticMarkup(view.tree),/Destino conservado/);
    descendants(view.tree,n=>n.type?.name==='FoxyVisualReader')[0].props.onShare();await view.flush();assert.match(renderToStaticMarkup(view.tree),/Destino conservado/);assert.deepEqual(calls,[]);
    descendants(view.tree,n=>n.type==='button'&&renderToStaticMarkup(n).includes('Volver a la creación'))[0].props.onClick();await view.flush();assert.doesNotMatch(renderToStaticMarkup(view.tree),/Destino conservado/);
    descendants(view.tree,n=>n.type?.name==='FoxyVisualReader')[0].props.onShare();await view.flush();assert.match(renderToStaticMarkup(view.tree),/Destino conservado/);assert.deepEqual(calls,[]);
  }finally{view.close();c.dispose();}
});

test('reopening an uncertain publication exposes its retry instead of locking it behind the reader',async()=>{
  const {controller:c}=await fixture();const {FoxyVisualReaderDialog}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader-dialog.tsx',{});
  const view=hookView(FoxyVisualReaderDialog,{assetId:id,state:c.getState(),actions:{...c,refresh(){}},sharePending:true,assetFileUrl:asset=>`/api/v1/foxy-ai/assets/${asset}/file?mode=preview`,onClose(){},sharing:'Reintentar solicitud'});
  try{await view.flush();assert.match(renderToStaticMarkup(view.tree),/Reintentar solicitud/);assert.match(renderToStaticMarkup(view.tree),/Directo a tu Biblioteca/);}finally{view.close();c.dispose();}
});

test('new editorial revision invalidates previous publication and is included in preparation',async()=>{
  const {createFoxyVisualPublicationController}=loadTsModule('apps/web/src/features/foxy/visuals/foxy-visual-publication-controller.ts'),room=randomUUID(),calls=[];
  const old={id:randomUUID(),assetId:id,assetRevision:'2',editorialRevision:'0',sourceKind:'VISUAL',state:'PUBLISHED',classroomId:room,title:'Anterior',unitId:null,topicId:null,revision:'5'};
  const client={listVisualPublications:async()=>({items:[old]}),prepareVisualPublication:async(asset,input)=>{calls.push(input);return {publication:{...old,...input,state:'READY'}};},inspectPublication:async()=>({publication:old}),confirmPublication:async()=>{throw Error('No confirmation authorized');}};
  const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>({id:room,role:'teacher',archived:false,revision:'2',units:[]}),onChange(){}});
  try{c.syncAsset(id,'2','1','Editado');await turn();assert.equal(c.getState().publication,null);await c.setClassroomId(room);await c.prepare();assert.equal(calls.length,1);assert.equal(calls[0].editorialRevision,'1');assert.equal(calls[0].assetRevision,'2');}finally{c.dispose();}
});

test('deduplicated preparation restores the original destination metadata and requires fresh review',async()=>{
  const {createFoxyVisualPublicationController}=loadTsModule('apps/web/src/features/foxy/visuals/foxy-visual-publication-controller.ts');
  const room=randomUUID(),unit=randomUUID(),topic=randomUUID(),pub={id:randomUUID(),assetId:id,assetRevision:'2',editorialRevision:'1',sourceKind:'VISUAL',state:'READY',classroomId:room,title:'Título anterior',unitId:null,topicId:null,revision:'3'},calls=[];
  const detail={id:room,name:'Aula',role:'teacher',archived:false,revision:'5',units:[{id:unit,name:'Unidad nueva',topics:[{id:topic,name:'Tema nuevo'}]}]};
  const client={listVisualPublications:async()=>({items:[]}),prepareVisualPublication:async()=>({created:false,publication:pub}),inspectPublication:async()=>({publication:pub,classroomRevision:'5',classroomArchived:false,editorialSnapshot:{title:pub.title,description:'Texto congelado',revision:pub.editorialRevision}}),confirmPublication:async()=>{calls.push('confirm');return {publicationId:pub.id,materialId:randomUUID(),publicationRevision:'4',classroomRevision:'6'};}};
  const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>detail,onChange(){}});
  try{c.syncAsset(id,'2','1','Título nuevo');await c.setClassroomId(room);c.selectUnit(unit);c.selectTopic(topic);await c.prepare();
    const s=c.getState();assert.equal(s.pending,null);assert.equal(s.title,'Título anterior');assert.equal(s.unitId,null);assert.equal(s.topicId,null);assert.match(s.notice,/ya|existente/);assert.equal(s.reviewed,false);assert.equal(s.reviewReady,false);
    await c.confirm();assert.deepEqual(calls,[]);await c.review();assert.equal(c.getState().reviewReady,true);c.setReviewed(true);await c.confirm();assert.deepEqual(calls,['confirm']);
  }finally{c.dispose();}
});

test('previous READY preparation opens explicitly after editing while new preparation uses the current revision',async()=>{
  const {createFoxyVisualPublicationController}=loadTsModule('apps/web/src/features/foxy/visuals/foxy-visual-publication-controller.ts');
  const room=randomUUID(),pub={id:randomUUID(),assetId:id,assetRevision:'2',editorialRevision:'0',sourceKind:'VISUAL',state:'READY',classroomId:room,title:'Texto anterior',unitId:null,topicId:null,revision:'3'},calls=[];
  const detail={id:room,name:'Aula',role:'teacher',archived:false,revision:'5',units:[]};
  const client={listVisualPublications:async()=>({items:[pub],nextAfterId:null}),inspectPublication:async()=>({publication:pub,classroomRevision:'5',classroomArchived:false,editorialSnapshot:{title:pub.title,description:'Texto congelado',revision:pub.editorialRevision}}),confirmPublication:async()=>{calls.push('confirm');return {publicationId:pub.id,materialId:randomUUID(),publicationRevision:'4',classroomRevision:'6'};},prepareVisualPublication:async(asset,input)=>{calls.push(input);return {created:true,publication:{...pub,...input,id:randomUUID()}};}};
  const c=createFoxyVisualPublicationController({client,loadClassroom:async()=>detail,onChange(){}});
  try{c.syncAsset(id,'2','2','Nueva edición');await turn();assert.equal(c.getState().publication,null);
    await c.selectPreparation(pub.id);assert.equal(c.getState().publication.id,pub.id);assert.equal(c.getState().editorialRevision,'2');assert.equal(c.getState().reviewed,false);
    await c.confirm();assert.deepEqual(calls,[]);await c.review();c.setReviewed(true);await c.confirm();assert.deepEqual(calls,['confirm']);
    c.setTitle('Nueva edición');await c.prepare();assert.equal(calls[1].editorialRevision,'2');
  }finally{c.dispose();}
});

test('the private diagram reader exports the authorized PNG without offering TXT', () => {
  const {FoxyVisualReader}=componentWithPorts('apps/web/src/features/foxy/visuals/foxy-visual-reader.tsx',{});
  const info=inspection();
  info.asset.kind='DIAGRAM';
  info.payload.diagram=diagram;
  const props={assetId:id,inspection:info,loading:false,error:null,onClose(){},onRetry(){},onShare(){},
    assetFileUrl:(asset,mode)=>'/api/v1/foxy-ai/assets/'+asset+'/file?mode='+mode};
  const tree=FoxyVisualReader(props);
  const link=descendants(tree,n=>n.type==='a'&&n.props.href.endsWith('mode=download'))[0];
  assert.ok(link);
  assert.equal(link.props.href,props.assetFileUrl(id,'download'));
  assert.doesNotMatch(renderToStaticMarkup(tree),/Descargar esquema completo \(TXT\)/);
  const denied=FoxyVisualReader({...props,inspection:{...info,canPreview:false}});
  assert.equal(descendants(denied,n=>n.type==='a').length,0);
});
