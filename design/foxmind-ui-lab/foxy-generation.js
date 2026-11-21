/* Demo jobs stay attached to the originating conversation, including after navigation. */
const fxGenerationJobs=new Map();
function fxGenerationStart(threadId,creation,request,resultText,phases){
 const t=state.foxySpace.threads.find(t=>t.id===threadId);
 if(!t||t.generation?.status==='waiting'||fxJobs.has(threadId)){fxFormError('Foxy ya está preparando algo en este chat. Volvé a la conversación para seguirlo.');return false;}
 const generation={id:fxId('job'),status:'waiting',phase:0,creation,resultText,phases,context:fxContextPayload(t)};
 if(!fxCommit(()=>{t.generation=generation;t.messages.push({id:fxId('message'),who:'user',text:request,toolTopics:creation.topics||[],context:generation.context});if(t.title==='Nueva conversación')t.title=request.slice(0,65);} ))return false;
 closeDialog();if(mitosisTabs.includes(tab))history.replaceState(null,'',routeHash(view));fxGenerationRun(threadId);fxPaint(threadId,true);return true;
}
function fxGenerationRun(threadId){
 const t=state.foxySpace.threads.find(t=>t.id===threadId),g=t?.generation;if(!g||fxGenerationJobs.has(threadId))return;
 g.status='waiting';g.phase=0;const token={id:g.id};fxGenerationJobs.set(threadId,token);
 const advance=()=>setTimeout(()=>{
  if(fxGenerationJobs.get(threadId)!==token)return;
  const current=state.foxySpace.threads.find(t=>t.id===threadId),job=current?.generation;
  if(!job||job.id!==token.id){fxGenerationJobs.delete(threadId);return;}
  if(job.phase<job.phases.length-1){job.phase++;fxGenerationPaint(threadId);advance();return;}
  fxGenerationJobs.delete(threadId);
  if(!fxCommit(()=>{state.foxySpace.creations.unshift(job.creation);current.messages.push({id:fxId('message'),who:'assistant',text:job.resultText,creationId:job.creation.id,context:job.context,demo:true});delete current.generation;})){
   const restored=state.foxySpace.threads.find(t=>t.id===threadId);if(restored?.generation)restored.generation.status='error';
  }
  fxPaint(threadId);
 },900);advance();
}
function fxGenerationPaint(threadId){
 if(!['foxy','estudio'].includes(view)||fxThread().id!==threadId)return;
 const el=$('.fx-generation'),g=fxThread().generation;if(!el||!g)return;
 el.querySelector('strong').textContent=g.phases[g.phase];
 el.querySelectorAll('.fx-stage').forEach((s,i)=>s.classList.toggle('done',i<=g.phase));
}
function fxGenerationStop(){
 const t=fxThread();fxGenerationJobs.delete(t.id);
 if(!fxCommit(()=>t.generation.status='stopped')){const current=fxThread();if(current.generation)current.generation.status='error';}
 fxPaint(t.id);
}
function fxGenerationRetry(){const t=fxThread();if(!t.generation||fxGenerationJobs.has(t.id))return;if(fxJobs.has(t.id)){toast('Esperá la respuesta actual para retomar tu propuesta.');return;}fxGenerationRun(t.id);fxPaint(t.id,true);}
function fxGenerationMarkup(t){
 const g=t.generation;if(!g)return '';
 if(g.status!=='waiting')return `<div class="notice ${g.status==='error'?'error':''} fx-generation-notice" role="${g.status==='error'?'alert':'status'}"><p>${g.status==='error'?'No pudimos guardar la propuesta. Conservamos tu idea para reintentar.':'La preparación se detuvo. Tu idea sigue en esta conversación.'}</p>${btn('Reintentar','fx-generation-retry','','arrow')}</div>`;
 return `<div class="fx-generation" role="status" aria-live="polite" aria-atomic="true">${img('logo','fx-foxy-avatar','Foxy')}<div><span class="fx-message-author">Foxy está trabajando en tu idea</span><strong>${esc(g.phases[g.phase])}</strong><div class="fx-stages" aria-hidden="true">${g.phases.map((_,i)=>`<span class="fx-stage ${i<=g.phase?'done':''}"></span>`).join('')}</div><small>Podés seguir recorriendo FoxMind. El resultado queda acá.</small></div>${btn('Detener','fx-generation-stop','quiet')}</div>`;
}
