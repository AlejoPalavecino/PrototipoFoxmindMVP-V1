import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {randomUUID} from 'node:crypto';
import {componentWithPorts} from "../../../../../../tests/foxmind-3d-flows-loader.test.mjs";
import {hookView,descendants} from "../../../../../../tests/agenda-ui-helpers.test.mjs";

const rid=randomUUID(),pid=randomUUID(),room=randomUUID();
const publication={id:pid,resourceId:rid,resourceRevision:'7',classroomId:room,title:'Guia privada',unitId:null,topicId:null,state:'FAILED',revision:'5'};
const capabilities={publicationId:pid,publicationRevision:'5',canRetry:true,retryReason:null,canDiscard:true,cleanupState:'NOT_REQUESTED'};
const base={management:capabilities,loading:false,busy:false,pending:null,discardReview:null,discardReviewed:false,canRetry:true,canReviewDiscard:true,canDiscard:false,receipt:null,error:null,errorCode:null};
function fixture(changes={}){
 const calls=[],record=name=>(...args)=>calls.push([name,...args]);
 const actions={refresh:record('refresh'),retryPreparation:record('retryPreparation'),reviewDiscard:record('reviewDiscard'),setDiscardReviewed:record('setDiscardReviewed'),discard:record('discard'),retryRequest:record('retryRequest'),cancelDiscardReview:record('cancelDiscardReview')};
 const props={publication,management:base,actions,locked:false,...changes};
 const {FoxyPublicationManagementPanel}=componentWithPorts("apps/web/src/features/foxy/ui/foxy-publication-management-panel.tsx",{});
 assert.equal(typeof FoxyPublicationManagementPanel,'function');return {calls,view:hookView(FoxyPublicationManagementPanel,props)};
}
function button(view,pattern){return descendants(view.tree,n=>n.type==='button'&&pattern.test(String(n.props.children)))[0];}

test('failed preparation offers retry of saved version without changing the editor',async()=>{
 const f=fixture();try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);
  assert.match(html,/reintentar preparaci[oó]n/iu);assert.match(html,/(versi[oó]n guardada|recurso guardado)/iu);assert.match(html,/(cambios|borrador).*(conserv|mantien)|conserv.*(cambios|borrador)/iu);
  const retry=button(f.view,/reintentar preparaci[oó]n/iu);assert.ok(retry);assert.equal(retry.props.disabled,false);retry.props.onClick();
  assert.deepEqual(f.calls,[['retryPreparation']]);
 }finally{f.view.close();}
});

test('unknown command outcome offers retry of original request, not a new preparation',async()=>{
 const f=fixture({management:{...base,canRetry:false,canReviewDiscard:false,pending:'RETRY',error:'No pudimos confirmar la solicitud.'}});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/no pudimos confirmar/iu);const retry=button(f.view,/reintentar solicitud/iu);assert.ok(retry);retry.props.onClick();
  assert.deepEqual(f.calls,[['retryRequest']]);assert.equal(button(f.view,/reintentar preparaci[oó]n/iu)?.props.disabled ?? true,true);
 }finally{f.view.close();}
});

test('discard requires local review and explicit checkbox, without invoking editor discard',async()=>{
 const review={...publication};const f=fixture({management:{...base,discardReview:review,discardReviewed:false,canDiscard:false}});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/guia privada/iu);assert.match(html,/descart/iu);assert.match(html,/(recurso|borrador).*(conserv|mantien)|conserv.*(recurso|borrador)/iu);
  const check=descendants(f.view.tree,n=>n.type==='input'&&n.props.type==='checkbox')[0];assert.ok(check);assert.equal(check.props.checked,false);
  const confirm=button(f.view,/confirmar descarte/iu);assert.ok(confirm);assert.equal(confirm.props.disabled,true);assert.deepEqual(f.calls,[]);
  check.props.onChange({currentTarget:{checked:true}});assert.deepEqual(f.calls,[['setDiscardReviewed',true]]);
 }finally{f.view.close();}
 const g=fixture({management:{...base,discardReview:review,discardReviewed:true,canDiscard:true}});
 try{await g.view.flush();const confirm=button(g.view,/confirmar descarte/iu);assert.ok(confirm);assert.equal(confirm.props.disabled,false);confirm.props.onClick();assert.deepEqual(g.calls,[['discard']]);}finally{g.view.close();}
});

for(const [cleanupState,expression] of [['PENDING',/pendiente/iu],['FAILED',/(todav[ií]a no|no se pudo|no pudimos)/iu],['DONE',/(ya no est[aá] reservado|ya no queda reservado)/iu]])test(`discarded preparation renders actual cleanup state ${cleanupState} without inferred deletion`,async()=>{
 const p={...publication,state:'DISCARDED',revision:'6'},m={...capabilities,publicationRevision:'6',canRetry:false,retryReason:'STATE',canDiscard:false,cleanupState};
 const f=fixture({publication:p,management:{...base,management:m,canRetry:false,canReviewDiscard:false}});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/descartad/iu);assert.match(html,expression);assert.doesNotMatch(html,/(90 segundos|archivo fue eliminado)/iu);
  assert.equal(button(f.view,/reintentar preparaci[oó]n/iu),undefined);assert.equal(button(f.view,/confirmar descarte/iu),undefined);
 }finally{f.view.close();}
});

test('ineligible retry shows guidance for changed source and never dispatches retry',async()=>{
 const f=fixture({management:{...base,management:{...capabilities,canRetry:false,retryReason:'SOURCE_CHANGED'},canRetry:false}});
 try{await f.view.flush();const html=renderToStaticMarkup(f.view.tree);assert.match(html,/(cambi[oó]|versi[oó]n).*(recurso|nueva|preparaci[oó]n)|recurso.*cambi/iu);
  const retry=button(f.view,/reintentar preparaci[oó]n/iu);if(retry)assert.equal(retry.props.disabled,true);assert.deepEqual(f.calls,[]);
 }finally{f.view.close();}
});
