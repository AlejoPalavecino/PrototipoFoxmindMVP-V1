/* Local prototype state. Conversations and creations retain their original scope. */
const fxId=p=>composeId(p);
let fxPane='chat',fxSide='tools',fxHistoryQuery='',fxCreationQuery='',fxKindFilter='all',fxCurrentScope='',fxEditing=null,fxDialogDraft=null;
const fxJobs=new Map();
function fxFolder(){return state.folders[state.selectedFolder||0];}
function fxScope(){return role==='docente'?'docente':'estudiante/'+(fxFolder()?.id||'folder-'+(state.selectedFolder||0));}
function fxInit(){
 state.folders.forEach((f,i)=>{f.id||='folder-'+i;f.units||=[f.topic||f.subject||'Mi recorrido'];f.unitTopics||=f.units.map(u=>[u]);f.materials||=[];});
 if(!state.foxySpace){state.foxySpace={threads:[],active:{},creations:[],plans:[]};
  for(const [r,messages] of [['docente',state.messages],['estudiante',state.studyMessages]])if(messages?.length){const folderId=r==='estudiante'?state.folders[0]?.id:null,scope=r==='docente'?r:r+'/'+folderId;const t={id:fxId('chat'),role:r,folderId,title:'Conversación anterior',messages:structuredClone(messages),draft:'',attachments:[],context:{classId:r==='docente'?'photo':'',topicIds:[],sourceIds:[]}};state.foxySpace.threads.push(t);state.foxySpace.active[scope]=t.id;}
  (state.creations||[]).forEach(c=>state.foxySpace.creations.push({...c,id:fxId('creation'),role:'docente',scope:'docente',kind:'notes',body:c.body||fxPlain(c.html),destinations:[]}));
 }
}
function fxPlain(html){const el=document.createElement('div');el.innerHTML=html||'';return el.textContent||'';}
function fxThreads(){fxInit();return state.foxySpace.threads.filter(t=>t.role===role&&(role==='docente'||t.folderId===fxFolder()?.id));}
function fxThread(){fxInit();const scope=fxScope();let t=fxThreads().find(t=>t.id===state.foxySpace.active[scope]);if(!t){t=fxNewThreadData();state.foxySpace.threads.unshift(t);state.foxySpace.active[scope]=t.id;}return t;}
function fxNewThreadData(context){return{id:fxId('chat'),role,folderId:role==='estudiante'?fxFolder()?.id:null,title:'Nueva conversación',draft:'',messages:[],attachments:[],context:structuredClone(context||{classId:'',topicIds:[],sourceIds:[]})};}
function fxCommit(change){const previous=structuredClone(state);change();if(save())return true;state=previous;return false;}
function fxNewChat(context,draft='',attachments=[]){const scope=fxScope(),t=fxNewThreadData(context||fxThread().context);t.draft=draft;t.attachments=structuredClone(attachments);if(!fxCommit(()=>{state.foxySpace.threads.unshift(t);state.foxySpace.active[scope]=t.id;}))return false;if($('#dialog').open)closeDialog();fxPane='chat';if(mitosisTabs.includes(tab)||tab==='muestras')history.replaceState(null,'',routeHash(view));render();$('#fx-message')?.focus();return true;}
function fxContextName(t=fxThread()){return fxContextData(t).name;}
function fxTopics(t=fxThread()){const units=fxContextData(t).units;return (t.mitosisDemo?units.filter(u=>u.id==='mitosis-demo'):units).flatMap(u=>u.topics.map(topic=>({...topic,unitId:u.id,unitTitle:u.title})));}
function fxSources(t=fxThread()){return fxContextData(t).materials;}
function fxCreations(){fxInit();return state.foxySpace.creations.filter(c=>c.role===role&&c.scope===fxScope());}
function fxOwnedCreation(id){return fxCreations().find(c=>c.id===id);}
const fxTools={
 docente:[['notes','book','Preparar un apunte','Ideas claras para tu grupo.','sky'],['map','layers','Imágenes y esquemas','Una explicación que se pueda ver.','mint'],['activity','edit','Crear una actividad','Prepará una consigna para tu grupo.','peach'],['lesson','calendar','Planificar una clase','Inicio, desarrollo y cierre.','rose'],['rubric','chart','Pensar una rúbrica','Criterios para acompañar.','sky']],
 estudiante:[['explain','book','Entender un tema','Un ejemplo, paso a paso.','sky'],['notes','file','Preparar un apunte','Lo esencial, con tus palabras.','peach'],['map','layers','Conectar ideas','Un esquema para relacionar.','mint'],['practice','edit','Practicar','Preguntas con orientación.','rose'],['exam','flag','Preparar una evaluación','Un simulacro sin nota académica.','sky'],['study-plan','calendar','Organizar mi repaso','Un plan que llega a tu agenda.','peach']]
};
function fxTool(kind){return fxTools[role].find(t=>t[0]===kind);}
function fxPaint(threadId,follow=false){if(!['foxy','estudio'].includes(view)||fxThread().id!==threadId)return;const scroll=$('#fx-messages'),top=scroll?.scrollTop||0;const near=scroll?scroll.scrollHeight-scroll.clientHeight-top<70:true;render();const next=$('#fx-messages');if(next){next.scrollTop=follow||near?next.scrollHeight:top;if(!near&&!follow){const b=$('#fx-latest');if(b)b.hidden=false;}}}
function fxSend(){const t=fxThread(),text=$('#fx-message')?.value.trim()||'';if(!text||fxJobs.has(t.id)||t.generation?.status==='waiting')return;if(text.length>5000){toast('Usá hasta 5000 caracteres por mensaje.','error');return;}
 const id=t.id,m={id:fxId('message'),who:'user',text,context:fxContextPayload(t)};if(!fxCommit(()=>{t.messages.push(m);t.draft='';if(t.title==='Nueva conversación')t.title=text.slice(0,65);t.replyState='waiting';}))return;fxRunReply(id);fxPaint(id,true);$('#fx-message')?.focus();}
function fxRunReply(id){const t=state.foxySpace.threads.find(t=>t.id===id);if(!t||fxJobs.has(id))return;const token={phase:0};fxJobs.set(id,token);t.replyState='waiting';
 setTimeout(()=>{if(fxJobs.get(id)!==token)return;token.phase=1;fxPaint(id);},650);
 setTimeout(()=>{if(fxJobs.get(id)!==token)return;fxJobs.delete(id);const current=state.foxySpace.threads.find(t=>t.id===id);if(!current)return;const question=current.messages.filter(m=>m.who==='user').at(-1)?.text||'';
  const topic=current.role==='estudiante'?state.folders.find(f=>f.id===current.folderId)?.topic:fxContextData(current).linkedClass?.subject;
  const reply={id:fxId('message'),who:'assistant',text:`Podemos trabajar “${question}” en tres momentos.\n\n1. Recuperá lo que ya sabés${topic?' sobre '+topic:''}. Anotá una idea y una duda.\n2. Elegí un ejemplo concreto y explicá cómo se relaciona con esa idea.\n3. Compará tu explicación con el material y señalá qué cambiarías.\n\n${current.role==='docente'?'Podés convertir estas ideas en un apunte o llevarlas al editor de actividades.':'Si querés prepararte para una evaluación, podemos distribuir estos pasos en un plan de repaso.'}`,sources:current.messages.filter(m=>m.who==='user').at(-1)?.context?.sourceIds||[],context:current.messages.filter(m=>m.who==='user').at(-1)?.context,demo:true};
  if(!fxCommit(()=>{current.messages.push(reply);current.replyState='ready';})){const recovered=state.foxySpace.threads.find(t=>t.id===id);if(recovered)recovered.replyState='error';}fxPaint(id);
 },1500);
}
function fxStopReply(){const t=fxThread();fxJobs.delete(t.id);if(!fxCommit(()=>t.replyState='stopped')){const recovered=state.foxySpace.threads.find(item=>item.id===t.id);if(recovered)recovered.replyState='error';}fxPaint(t.id);}
function fxRetryReply(){const t=fxThread();if(!t.messages.some(m=>m.who==='user')||fxJobs.has(t.id)||t.generation?.status==='waiting')return;fxRunReply(t.id);fxPaint(t.id);}
function fxText(text){return esc(text).split(/\n\n+/).map(p=>`<p>${p.replaceAll('\n','<br>')}</p>`).join('');}
