import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import {componentWithPorts} from "../../../../tests/foxmind-3d-flows-loader.test.mjs";
import {hookView,descendants} from "../../../../tests/agenda-ui-helpers.test.mjs";
const rid=randomUUID(),pid=randomUUID(),room=randomUUID(),unit=randomUUID(),topic=randomUUID();
const resource={status:'editing',resource:{id:rid,conversationId:randomUUID(),sourceTurnId:randomUUID(),title:'Resumen',markdown:'Texto',revision:'1'},draft:{title:'Resumen',markdown:'<script>alert(1)</script>'},dirty:true,busy:false,pending:null,conflict:null,error:null,errorCode:null};
const publication={id:pid,resourceId:rid,resourceRevision:'1',classroomId:room,title:'Material',unitId:unit,topicId:topic,state:'READY',revision:'2'};
const detail={id:room,name:'Biologia',role:'teacher',archived:false,revision:'3',units:[{id:unit,name:'Unidad',topics:[{id:topic,name:'Tema'}]}],plans:[]};
function fixture(changes={}){const calls=[],record=name=>(...args)=>calls.push([name,...args]);const actions={resource:{updateDraft:record('draft'),save:record('save'),retry:record('retry'),close:record('close'),resolveConflict:record('resolveConflict'),refreshConflict:record('refreshConflict')},
 preparation:{selectDestination:record('destination'),setTitle:record('title'),selectUnit:record('unit'),selectTopic:record('topic'),prepare:record('prepare'),retry:record('prepareRetry')},
 history:{loadMore:record('loadMore'),select:record('select'),refreshList:record('refreshList'),refreshSelected:record('refreshSelected')},confirmation:{review:record('review'),setReviewed:record('reviewed'),confirm:record('confirm'),retry:record('confirmRetry')},cancelLeave:record('cancelLeave'),discardAndContinue:record('discard'),saveAndContinue:record('saveAndContinue')};
 const props={resource,preparation:{destination:detail,metadata:{title:'Material',unitId:unit,topicId:topic},canPrepare:true,busy:false,pending:null,result:null,error:null},
 history:{items:[publication],selectedId:pid,inspection:{publication,classroomRevision:'3',classroomArchived:false,errorCode:null},staleResource:false,loading:false,inspectionLoading:false,error:null,inspectionError:null,nextAfterId:null},
 confirmation:{review:{publication,classroomRevision:'3',classroomName:'Biologia',unitName:'Unidad',topicName:'Tema'},reviewed:false,reviewing:false,busy:false,pending:null,canReview:true,canConfirm:false,receipt:null,error:null},
 classrooms:[detail],ui:{leave:null,openingResource:false,loadingDestinationId:null,error:null},actions,publicationFileUrl:(id,mode)=>`/api/v1/foxy-ai/publications/${id}/file?mode=${mode}`,...changes};
 const {FoxyResourceWorkspace}=componentWithPorts("apps/web/src/screens/foxy-resource-workspace.tsx",{});assert.equal(typeof FoxyResourceWorkspace,'function');return {calls,view:hookView(FoxyResourceWorkspace,props)};}
test('opening a saved resource starts in reading mode with Word outside the sharing controls',async()=>{
 const f=fixture({resource:{...resource,dirty:false,draft:{title:'Resumen',markdown:'## Introducción'},resource:{...resource.resource,markdown:'## Introducción'}}});
 try{await f.view.flush();
  const html=renderToStaticMarkup(f.view.tree);
  assert.match(html,/<h3>Introducción<\/h3>/);
  const sharing=descendants(f.view.tree,n=>n.type==='details'&&descendants(n,item=>item.type==='summary'&&item.props.children==='Compartir').length)[0];
  assert.ok(sharing);assert.ok(!sharing.props.open);
  assert.equal(descendants(sharing,n=>n.type==='button'&&n.props.children==='Descargar Word').length,0);
  assert.equal(descendants(f.view.tree,n=>n.type==='button'&&n.props.children==='Descargar Word').length,1);
  assert.deepEqual(f.calls,[]);
 }finally{f.view.close();}
});
test('resource workspace has one accessible dialog, editable draft and escaped model text',async()=>{const f=fixture();try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
 assert.equal(descendants(f.view.tree,n=>n.props?.role==='dialog').length,1);assert.ok(descendants(f.view.tree,n=>n.type==='textarea').length);assert.match(html,/guardar cambios/iu);
 assert.doesNotMatch(html,/<script>alert/iu);assert.match(html,/&lt;script&gt;/iu);
 }finally{f.view.close();}});
test('workspace exposes actual destination hierarchy and private preparation',async()=>{const f=fixture();try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);for(const name of ['Biologia','Unidad','Tema'])assert.match(html,new RegExp(name,'iu'));
 assert.match(html,/preparar pdf/iu);assert.match(html,/todavía no|no.*visible|privad/iu);
 }finally{f.view.close();}});
test('READY review has safe preview and requires explicit checkbox before confirmation',async()=>{const f=fixture();try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/revis/iu);assert.match(html,/vista previa/iu);
 const links=descendants(f.view.tree,n=>n.type==='a' && String(n.props.href).includes(`/publications/${pid}/file`));assert.ok(links.length);for(const link of links){assert.ok(link.props.href.startsWith('/api/v1/foxy-ai/'));if(link.props.target==='_blank')assert.match(link.props.rel,/noopener/);}
 const checkbox=descendants(f.view.tree,n=>n.type==='input'&&n.props.type==='checkbox');assert.ok(checkbox.length);assert.equal(checkbox[0].props.checked,false);
 const button=descendants(f.view.tree,n=>n.type==='button'&&/publicar|confirmar/iu.test(String(n.props.children)));assert.ok(button.length);assert.equal(button[0].props.disabled,true);assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);
 }finally{f.view.close();}});
test('leave guard is inline in same dialog and does not dispatch without choice',async()=>{const f=fixture({ui:{leave:{reason:'unsaved',canSave:true},openingResource:false,loadingDestinationId:null,error:null}});try{await f.view.flush();
 assert.equal(descendants(f.view.tree,n=>n.props?.role==='dialog').length,1);const html=renderToStaticMarkup(f.view.tree);assert.match(html,/descartar/iu);assert.match(html,/seguir editando|permanecer/iu);assert.equal(f.calls.length,0);
 }finally{f.view.close();}});

test('conflict preserves local draft and offers both resolution choices',async()=>{const f=fixture({resource:{...resource,conflict:{...resource.resource,title:'Servidor',revision:'2'},errorCode:'CONFLICT'}});try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
 assert.match(html,/conflicto|cambió|cambio/iu);assert.match(html,/conservar|mantener/iu);assert.match(html,/servidor|versión/iu);assert.match(html,/&lt;script&gt;/iu);
 }finally{f.view.close();}});

test('successful receipt identifies publication in destination library without duplicate confirmation',async()=>{const f=fixture({confirmation:{review:null,reviewed:false,reviewing:false,busy:false,pending:null,canReview:false,canConfirm:false,
 receipt:{publicationId:pid,materialId:randomUUID(),publicationRevision:'3',classroomRevision:'4'},error:null}});try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
 assert.match(html,/publicado/iu);assert.match(html,/biblioteca/iu);assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);
 }finally{f.view.close();}});

test('history load error offers retry and does not claim empty history',async()=>{
 const f=fixture({history:{items:[],nextAfterId:null,loading:false,inspectionLoading:false,selectedId:null,inspection:null,staleResource:false,error:'No pudimos cargar las preparaciones.',inspectionError:null}});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.doesNotMatch(html,/todavía no hay preparaciones|sin preparaciones/iu);
  const button=descendants(f.view.tree,n=>n.type==='button'&&n.props.children==='Reintentar historial')[0];assert.ok(button);button.props.onClick();assert.ok(f.calls.some(x=>x[0]==='refreshList'));
 }finally{f.view.close();}
});

test('conflict shows the actual server markdown for comparison as escaped text',async()=>{
 const f=fixture({resource:{...resource,conflict:{...resource.resource,title:'Servidor',markdown:'SERVER_CONTENT_DIFF',revision:'2'},errorCode:'CONFLICT'}});
 try{await f.view.flush();assert.match(renderToStaticMarkup(f.view.tree),/SERVER_CONTENT_DIFF/);}finally{f.view.close();}
});

test('invalid title input exposes aria-invalid and describes its field error',async()=>{
 const f=fixture({resource:{...resource,draft:{title:'',markdown:'Texto'},errorCode:'INVALID_INPUT',error:'Revisá el recurso.'}});
 try{await f.view.flush();const input=descendants(f.view.tree,n=>n.type==='input'&&n.props.value==='')[0];assert.ok(input);assert.equal(input.props['aria-invalid'],true);assert.ok(input.props['aria-describedby']);
 }finally{f.view.close();}
});

test('confirmation review shows exact frozen title before student visibility',async()=>{
 const frozen={...publication,title:'FROZEN_LIBRARY_TITLE'},f=fixture({confirmation:{review:{publication:frozen,classroomRevision:'3',classroomName:'Biologia',unitName:'Unidad',topicName:'Tema'},reviewed:false,reviewing:false,busy:false,pending:null,canReview:true,canConfirm:false,receipt:null,error:null}});
 try{await f.view.flush();assert.match(renderToStaticMarkup(f.view.tree),/FROZEN_LIBRARY_TITLE/);}finally{f.view.close();}
});

test('receipt recovered without review links to the actual destination classroom',async()=>{
 const f=fixture({confirmation:{review:null,reviewed:false,reviewing:false,busy:false,pending:null,canReview:false,canConfirm:false,receipt:{publicationId:pid,materialId:randomUUID(),publicationRevision:'3',classroomRevision:'4'},error:null}});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/Biologia/iu);assert.match(html,/abrir aula/iu);const links=descendants(f.view.tree,n=>n.type==='a'&&String(n.props.href).startsWith('/mis-aulas?'));assert.ok(links.some(x=>new URL(x.props.href,'http://local').searchParams.get('aula')===room));
 }finally{f.view.close();}
});

test('resource dialog passes selected preparation and management actions to the management panel',async()=>{
 const calls=[],captured=[],record=name=>(...args)=>calls.push([name,...args]);
 const selected={...publication,state:'FAILED'},caps={publicationId:pid,publicationRevision:'2',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'};
 const management={management:caps,loading:false,busy:false,pending:null,discardReview:null,discardReviewed:false,canRetry:true,canReviewDiscard:true,canDiscard:false,receipt:null,error:null,errorCode:null};
 const actions={resource:{close:record('close')},preparation:{},history:{},confirmation:{},management:{retryPreparation:record('retryPreparation')}};
 const props={resource,preparation:{destination:detail,metadata:{title:'Material',unitId:unit,topicId:topic},canPrepare:false,busy:false,pending:null,error:null},
  history:{items:[selected],selectedId:pid,inspection:{publication:selected,classroomRevision:'3',classroomArchived:false,errorCode:'FILE_NOT_READY'},staleResource:false,loading:false,inspectionLoading:false,error:null,inspectionError:null,nextAfterId:null},
  confirmation:{review:null,reviewed:false,reviewing:false,busy:false,pending:null,canReview:false,canConfirm:false,receipt:null,error:null},management,
  classrooms:[detail],ui:{leave:null,openingResource:false,loadingDestinationId:null,error:null},actions,publicationFileUrl:()=>''};
 const {FoxyResourceWorkspace}=componentWithPorts("apps/web/src/screens/foxy-resource-workspace.tsx",{"../features/foxy/index.ts":{...componentWithPorts('apps/web/src/features/foxy/index.ts', {}),FoxyPublicationManagementPanel:panelProps=>{captured.push(panelProps);return React.createElement('span',null,'MANAGEMENT_PANEL');}}});
 const view=hookView(FoxyResourceWorkspace,props);try{await view.flush();assert.match(renderToStaticMarkup(view.tree),/MANAGEMENT_PANEL/);assert.ok(captured.some(item=>item.publication?.id===pid&&item.management===management));
  const panel=captured.at(-1);assert.equal(panel.actions,actions.management);assert.equal(calls.length,0);
 }finally{view.close();}
});

test('newer discarded history row never exposes an older selected READY preview or publication',async()=>{
 const discarded={...publication,state:'DISCARDED',revision:'3'};
 const f=fixture({history:{items:[discarded],selectedId:pid,inspection:{publication,classroomRevision:'3',classroomArchived:false,errorCode:null},staleResource:false,loading:false,inspectionLoading:false,error:null,inspectionError:null,nextAfterId:null}});
 try{await f.view.flush();const links=descendants(f.view.tree,n=>n.type==='a'&&String(n.props.href).includes(`/publications/${pid}/file`));assert.equal(links.length,0);
  for(const button of descendants(f.view.tree,n=>n.type==='button'&&/revisar publicaci[oó]n|publicar en biblioteca/iu.test(String(n.props.children))))assert.equal(button.props.disabled,true);
  assert.equal(f.calls.filter(x=>x[0]==='confirm').length,0);
 }finally{f.view.close();}
});
