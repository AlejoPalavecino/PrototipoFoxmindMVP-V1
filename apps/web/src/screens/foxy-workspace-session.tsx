import type { ChatIdentity } from '../../../shared-ui/FoxyChatLayout';
import type { CreateFoxyConversation, FoxyContext, StartFoxyVisual } from '../../../../src/core/domain/index.ts';
import { classroomHomeHref } from '../application/navigation/destinations';
import { AsyncFeedback } from '../../../shared-ui/AsyncFeedback';
import { FoxyDialog } from '../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../shared-ui/FoxmindIcon';
import { FoxyVisualTimeline } from '../features/foxy/index.ts';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createWebClassroomClient } from '../application/academic-classroom-client';
import type { Detail } from '../../../../src/core/contracts/classrooms';
import type { Material } from '../../../../src/core/contracts/materials';
import type { ActivitySummary } from '../../../../src/core/contracts/activities';
import { openDialog } from '../../../shared-ui/dialog-focus';
import { useFoxyWorkspace } from '../application/foxy-workspace';
import { foxyThreadId } from '../application/foxy-navigation-bridge';
import { useFoxyWorkspaceActions } from '../features/foxy/index.ts';
import { useFoxyCatalog } from '../features/foxy/index.ts';
import type { FoxyCreation } from '../features/foxy/api.ts';
import { FoxyWorkspace } from '../features/foxy/index.ts';
import { FoxyResourceWorkspace } from './foxy-resource-workspace';
import { FoxyVisualWorkspace } from '../features/foxy/index.ts';
import { FoxyVisualPublicationPanel, FoxyVisualReaderDialog } from '../features/foxy/index.ts';

function setThreadAddress(id: string | null) {
  if (typeof window === 'undefined' || typeof window.location.href !== 'string' || !window.history) return;
  const url = new URL(window.location.href);
  if (url.searchParams.get('chat') === id) return;
  if (id) url.searchParams.set('chat',id); else url.searchParams.delete('chat');
  window.history.replaceState(window.history.state,'',url);
}

type VisualDraft = Pick<StartFoxyVisual, 'kind' | 'aspectRatio' | 'prompt'> & {
  context: FoxyContext; onCreated: () => void; error: string | null;
};

function PendingLeaveDialog({ cancel, proceed, reason }: { cancel: () => void; proceed: () => void; reason?:'unsaved'|'pending'|'busy' }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (ref.current) return openDialog(ref.current); }, []);
  return <dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="foxy-pending-leave-title" className="p5-dialog"
    onCancel={event => { event.preventDefault(); cancel(); }}>
    <h2 id="foxy-pending-leave-title">Antes de salir</h2>
    <p>{reason==='unsaved'?'Tenés cambios sin guardar. La versión guardada se conserva.':'La solicitud está pendiente y puede haberse completado. Podés consultar el resultado al volver.'}</p>
    <button type="button" className="p5-action" onClick={proceed}>{reason==='unsaved'?'Descartar cambios y continuar':'Cerrar vista y continuar'}</button>
    <button type="button" className="p5-action" onClick={cancel}>Seguir acá</button>
  </dialog>;
}

export function FoxyWorkspaceSession({ identity, subjectId, onIdentityRequired, onNavigate, onRegister }: { identity?: ChatIdentity; subjectId: string;
  onIdentityRequired: (code: string) => void; onNavigate?: (href: string) => void | Promise<void>;
  onRegister?: (binding: { navigate: (href: string) => void; shouldBlock: () => boolean } | null) => void }) {
  const [visualConversation, setVisualConversation] = useState<string | null>(null);
  const [visualCreating,setVisualCreating]=useState(true);
  const [visualDraft, setVisualDraft] = useState<VisualDraft | null>(null);
  const visualDraftRequest = useRef<CreateFoxyConversation | null>(null);
  const submittingVisualDraft = useRef(false);
  const resolvingVisual = useRef(false);
  const [resolvingVisualSources,setResolvingVisualSources]=useState(false),[visualSetupError,setVisualSetupError]=useState('');
  const [visualMaterialCount,setVisualMaterialCount]=useState<number|undefined>(undefined);
  const [draftPreview,setDraftPreview]=useState<{classroomId:string;topics:{id:string;name:string}[];materialCount:number;error?:string}>();
  const [previewRetry,setPreviewRetry]=useState(0);
  const [handoffStart, setHandoffStart] = useState<{ turnId: string; mode: 'ACTIVITY' | 'RUBRIC' } | null>(null);
  const { state, runtime, initializing } = useFoxyWorkspace({ subjectId, onIdentityRequired });
  const { actions, ui } = useFoxyWorkspaceActions({ runtime, state, onNavigate: onNavigate ?? (() => {}) });
  const previewClient = useMemo(() => createWebClassroomClient(fetch, onIdentityRequired), [subjectId, onIdentityRequired]);
  const previewContext = useCallback(async (id: string, signal: AbortSignal) => {
    const [room, materials, activityPage] = await Promise.all([
      previewClient.call<Detail>(`/${id}`, 'GET', undefined, signal),
      previewClient.call<Material[]>(`/${id}/library`, 'GET', undefined, signal),
      previewClient.call<{activities:ActivitySummary[]}>(`/${id}/activities`, 'GET', undefined, signal),
    ]);
    if(room.archived || room.role!=='teacher') throw new Error('Aula no disponible.');
    return {units:room.units,materials:materials.filter(item=>item.ready&&!item.deleted).map(item=>({id:item.id,title:item.title,kind:item.extension?.toUpperCase()??'Recurso'})),
      activities:activityPage.activities.filter(item=>item.status==='PUBLISHED').map(item=>({id:item.id,title:item.title??'Actividad',kind:item.type==='ASSIGNMENT'?'Trabajo práctico':item.type==='QUESTIONNAIRE'?'Cuestionario':'Evaluación'}))};
  }, [previewClient]);
  const draftClassroomId=visualDraft?.context.kind==='CLASSROOM'?visualDraft.context.classroomId:undefined;
  useEffect(()=>{
    setDraftPreview(undefined);
    if(!draftClassroomId)return;
    const controller=new AbortController();
    void previewContext(draftClassroomId,controller.signal).then(preview=>{
      if(!controller.signal.aborted)setDraftPreview({classroomId:draftClassroomId,materialCount:preview.materials.length,
        topics:preview.units.flatMap(unit=>unit.topics).filter((topic):topic is {id:string;name:string}=>typeof topic.id==='string')});
    }).catch(()=>{if(!controller.signal.aborted)setDraftPreview({classroomId:draftClassroomId,topics:[],materialCount:0,error:'No pudimos consultar los temas del aula.'});});
    return ()=>controller.abort();
  },[draftClassroomId,previewContext,previewRetry]);
  const catalogStamp = JSON.stringify([state?.chat?.current?.id, state?.chat?.current?.title, state?.chat?.current?.revision,
    state?.chat?.turns?.map(turn => [turn.id, turn.state]), state?.resource?.resource?.id, state?.resource?.resource?.revision,
    state?.confirmation?.receipt, state?.activityHandoff?.receipt, state?.visualPublication?.receipt,
    state?.preparation?.result, state?.history?.items?.map(item => [item.id, item.state, item.revision]), state?.management?.receipt,
    state?.visualPublication?.publication?.state, state?.visualPublication?.publication?.revision,
    state?.visualEditor?.inspection?.editorial?.revision,
    state?.visual?.jobs?.map(job => [job.id, job.state])]);
  const catalog = useFoxyCatalog({ subjectId, onIdentityRequired, stamp: catalogStamp });
  const openedAddress = useRef(false);
  const currentThreadId = state?.chat?.current?.id;
  useEffect(()=>{
    if (openedAddress.current || !runtime || !actions || initializing || typeof window === 'undefined' || typeof window.location.href !== 'string') return;
    openedAddress.current = true;
    const target = foxyThreadId(window.location.search);
    if (target) void actions.chat.select(target);
  },[runtime,actions,initializing]);
  useEffect(()=>{ if (currentThreadId && openedAddress.current && !state?.chat?.busy) setThreadAddress(currentThreadId); },[currentThreadId,state?.chat?.busy]);
  useEffect(() => {
    if (!runtime || !actions || !onRegister) return;
    onRegister({ navigate: href => { void actions.requestNavigate(href); }, shouldBlock: () => {
      const current = runtime.getState();
      return !!(current.activityHandoff?.busy || current.activityHandoff?.pending || (current.activityHandoff?.review && !current.activityHandoff.receipt) || current.resource?.dirty || current.resource?.busy || current.resource?.pending || current.preparation?.busy
        || current.preparation?.pending || current.confirmation?.busy || current.confirmation?.pending
        || current.management?.busy || current.management?.pending || current.visual?.busy || current.visual?.pending || current.visualPublication?.busy || current.visualPublication?.pending || current.visualEditor?.dirty || current.visualEditor?.busy || current.visualEditor?.pending);
    } });
    return () => onRegister(null);
  }, [runtime, actions, onRegister]);
  if (!state || !runtime || !actions || !ui || !state.chat) return <AsyncFeedback title="Cargando Foxy AI…"/>;
  const visualChat = state.chat.current;
  const selectedVisual = state.visual?.jobs.find(job => job.id === state.visual?.selectedId);
  const visualSharing = selectedVisual?.state === 'READY' && state.visualPublication?.assetId === selectedVisual.assetId
    ? state.visualPublication : null;
  const capabilities = { IMAGE: !!state.chat.capabilities?.imageGeneration?.enabled, DIAGRAM: !!state.chat.capabilities?.diagramGeneration?.enabled };
  const chatBusy = state.chat.busy || !!state.chat.activeTurn || !!state.chat.pending;
  const activeVisual = visualChat?.id === visualConversation ? state.visual : null;
  function updateVisualDraft(patch: Partial<VisualDraft>) {
    setVisualDraft(current => current ? { ...current, ...patch } : current);
  }
  const visualDraftLoading=!!draftClassroomId&&draftPreview?.classroomId!==draftClassroomId;
  function generateFirstVisual(draft: VisualDraft, topicIds?:string[]) {
    if (!actions || !runtime || submittingVisualDraft.current || runtime.getState().chat?.busy) return;
    const title = [...draft.prompt.trim().replace(/\s+/gu, ' ')].slice(0, 120).join('');
    const request = visualDraftRequest.current ??= { requestId: crypto.randomUUID(), title, context: draft.context };
    submittingVisualDraft.current = true;
    updateVisualDraft({ error: null });
    const showError = () => updateVisualDraft({ error: 'No pudimos crear la conversación. Tu descripción se conservó. Volvé a intentar.' });
    void Promise.resolve(actions.prepareVisualConversation(request, async id => {
      if (visualDraftRequest.current !== request) return;
      if (!id) { showError(); return; }
      const selection=topicIds===undefined?undefined:await runtime.chat.resolveToolSelection(topicIds,{mode:'ALL_CLASSROOM',topicIds:[],sourceIds:[]});
      if(topicIds!==undefined&&!selection){updateVisualDraft({error:'No pudimos preparar tus temas y fuentes. Tu idea sigue acá; volvé a intentar.'});return;}
      visualDraftRequest.current = null;
      draft.onCreated();
      setVisualConversation(null);
      setVisualDraft(null);
      runtime.visual.setKind(draft.kind);
      runtime.visual.setAspectRatio(draft.aspectRatio);
      runtime.visual.setPrompt(draft.prompt);
      void runtime.visual.start(selection);
    })).then(result => { if (result === undefined) showError(); }, showError).finally(() => { submittingVisualDraft.current = false; });
  }
  async function generateVisual(topicIds?:string[]){
    if(!runtime||resolvingVisual.current)return;
    const id=runtime.getState().chat?.current?.id;if(!id)return;
    resolvingVisual.current=true;setResolvingVisualSources(true);setVisualSetupError('');
    try{
      const selection=topicIds===undefined?undefined:await runtime.chat.resolveToolSelection(topicIds);
      if(runtime.getState().chat?.current?.id!==id)return;
      if(topicIds!==undefined&&!selection){setVisualSetupError('No pudimos preparar tus temas y fuentes. Tu idea sigue acá; volvé a intentar.');return;}
      const before=runtime.visual.getState().jobs.map(job=>job.id),pending=runtime.visual.start(selection);
      if(!pending)return;
      await pending;
      const result=runtime.visual.getState();
      if(result.pending||result.jobs.some(job=>!before.includes(job.id)))setVisualConversation(null);
    }finally{resolvingVisual.current=false;setResolvingVisualSources(false);}
  }
  const sourceTurnId=state.resource?.resource?.sourceTurnId;
  const resourceKind=sourceTurnId?(state.chat?.turns?.find(turn=>turn.id===sourceTurnId)?.purpose??catalog?.state.creations.items.find(item=>item.turnId===sourceTurnId)?.kind):undefined;
  const resourceLabels:Record<string,string>={STUDY_MATERIAL:'Preparar un apunte',REVIEW:'Preparar un apunte',SUMMARY:'Preparar un apunte',NOTE:'Preparar un apunte',LESSON_PLAN:'Planificar una clase',PLAN:'Planificar una clase',RUBRIC:'Pensar una rúbrica',ACTIVITY_IDEAS:'Crear una actividad',ACTIVITY:'Crear una actividad'};
  return <>{state.classroomsError && <p role="alert">{state.classroomsError}</p>}
    {initializing && <p role="status">Actualizando Foxy AI…</p>}
    {ui.leave && (!state.resource || (state.resource.status === 'closed' && !ui.openingResource)) &&
      <PendingLeaveDialog reason={ui.leave.reason} cancel={() => actions.cancelLeave()} proceed={() => { void actions.discardAndContinue(); }} />}
    <FoxyWorkspace visualTimeline={state.visual&&(state.visual.jobs.length>0||state.visual.pending||state.visual.error)?<FoxyVisualTimeline {...state.visual} onStop={id=>void runtime.visual.cancel(id)} onRetry={()=>void runtime.visual.retry()} onOpen={id=>{runtime.visual.select(id);setVisualCreating(false);setVisualConversation(visualChat?.id??null);}}/>:undefined} previewContext={previewContext} onStartActivity={classroomId=>{void actions.requestNavigate(classroomHomeHref({kind:'create-activity',classroomId}));}} onNewDraft={()=>setThreadAddress(null)} identity={identity} destinationHref={classroomHomeHref} catalog={catalog?.state} contextClassrooms={state.contextClassrooms}
      onConversationQuery={query => { void catalog?.controller.setConversationQuery(query); }}
      onCreationQuery={query => { void catalog?.controller.setCreationQuery(query); }}
      onMoreConversations={() => { void catalog?.controller.moreConversations(); }} onMoreCreations={() => { void catalog?.controller.moreCreations(); }}
      onRefreshCatalog={() => { void catalog?.controller.refresh(); }}
      onOpenVisual={state.visual ? (draft,details) => {
        setVisualCreating(true);
        setVisualSetupError('');setVisualMaterialCount(details?.materialCount);
        if (draft) {
          visualDraftRequest.current = null;
          setVisualConversation(null);
          setVisualDraft({ ...draft, kind: capabilities.DIAGRAM ? 'DIAGRAM' : 'IMAGE', aspectRatio: '1:1', prompt: '', error: null });
        } else if (visualChat) setVisualConversation(visualChat.id);
      } : undefined}
      onOpenCreation={(item: FoxyCreation) => {
        if (item.turnId) void actions.resource.openCreation(item.conversationId, item.turnId);
        else if (item.visualJobId) void actions.openVisualCreation(item.conversationId, item.visualJobId,
          () => {setVisualCreating(false);setVisualConversation(item.conversationId);});
      }}
      onNavigate={href => { void actions.requestNavigate(href); }} creationBlocked={!!ui.leave} onCreateDiagram={async prompt => {
      const snapshot = runtime.getState(), chat = snapshot.chat;
      if (snapshot.closed || !chat?.current || !snapshot.visual || snapshot.visual.busy || snapshot.visual.pending
        || snapshot.visualPublication?.busy || snapshot.visualPublication?.pending || chat.busy || chat.activeTurn || chat.pending
        || !chat.capabilities?.diagramGeneration.enabled || (chat.current.context.kind === 'CLASSROOM' && !chat.curriculum?.canGenerate)) return false;
      runtime.visual.setKind('DIAGRAM'); runtime.visual.setPrompt(prompt);
      const before = runtime.visual.getState().jobs.map(job => job.id);
      const request = runtime.visual.start(); if (!request) return false;
      setVisualConversation(chat.current.id);
      await request;
      const result = runtime.visual.getState();
      return !!result.pending || result.jobs.some(job => !before.includes(job.id));
    }} onActivityHandoff={(conversationId, turnId, mode) => { void Promise.resolve(actions.resource.open(conversationId, turnId)).then(result => { if (result === 'opened') setHandoffStart({ turnId, mode }); }); }} controller={actions.chat} state={state.chat} classrooms={state.classrooms}
      onOpenResource={(conversationId, turnId) => { void actions.resource.open(conversationId, turnId); }} />
    {!visualDraft&&activeVisual&&!visualCreating&&selectedVisual?.state==='READY'&&state.visualEditor&&<FoxyVisualReaderDialog key={selectedVisual.assetId} assetId={selectedVisual.assetId}
      state={state.visualEditor} actions={runtime.visualEditor} assetFileUrl={runtime.assetFileUrl} onClose={()=>setVisualConversation(null)}
      sharingTitle={visualSharing?.publication?.title}
      shareLocked={!!visualSharing?.busy} sharePending={!!visualSharing?.pending} published={visualSharing?.hasSharedVersions||!!visualSharing?.receipt||visualSharing?.publication?.state==='PUBLISHED'}
      sharing={visualSharing?<FoxyVisualPublicationPanel state={visualSharing} actions={runtime.visualPublication} classrooms={state.classrooms} publicationFileUrl={runtime.publicationFileUrl}/>:<p role="status">Consultando la versión guardada…</p>}/>}
    {(visualDraft || activeVisual&&(visualCreating||selectedVisual?.state!=='READY')) && <FoxyDialog title="Imágenes y esquemas" description="Contale a Foxy qué necesitás. Después podés revisar y editar." className="parity-foxy-visualDialog" footer={<>
      <button type="button" disabled={resolvingVisualSources||submittingVisualDraft.current} onClick={()=>{setVisualDraft(null);setVisualConversation(null);}}>Cerrar</button>
      {(visualDraft||visualCreating||!selectedVisual)&&<button type="submit" form="foxy-visual-form" className="p5-primary" disabled={chatBusy||!!state.visual?.busy||!!state.visual?.pending||resolvingVisualSources||visualDraftLoading||!!draftPreview?.error}><FoxmindIcon name="spark"/>Preparar propuesta</button>}
    </>} onClose={() => {
      if (resolvingVisual.current||visualDraft && (submittingVisualDraft.current || runtime.getState().chat?.busy)) return;
      visualDraftRequest.current = null;
      setVisualDraft(null);
      setVisualConversation(null);
    }}>
      {visualDraftLoading&&<p role="status">Consultando los temas del aula…</p>}
      {draftClassroomId&&draftPreview?.error&&<p role="alert">{draftPreview.error}<button type="button" onClick={()=>setPreviewRetry(value=>value+1)}>Reintentar</button></p>}
      {visualDraft ? <FoxyVisualWorkspace kind={visualDraft.kind} prompt={visualDraft.prompt} aspectRatio={visualDraft.aspectRatio} jobs={[]} selectedId={null}
        topics={draftClassroomId?draftPreview?.topics:[]} contextName={draftClassroomId?state.contextClassrooms?.find(room=>room.id===draftClassroomId)?.name??'Aula':'Contexto general'} materialCount={draftClassroomId?draftPreview?.materialCount:0}
        error={visualDraft.error} busy={chatBusy || !!ui.leave || visualDraftLoading||!!draftPreview?.error} capabilities={capabilities} assetFileUrl={runtime.assetFileUrl}
        actions={{ setKind: kind => updateVisualDraft({ kind }), setPrompt: prompt => updateVisualDraft({ prompt }),
          setAspectRatio: aspectRatio => updateVisualDraft({ aspectRatio }), start: topicIds => generateFirstVisual(visualDraft,topicIds) }} />
      : activeVisual && <FoxyVisualWorkspace {...activeVisual} selectedId={visualCreating?null:activeVisual.selectedId} capabilities={capabilities}
        topics={state.chat.curriculum?.units.flatMap(unit=>unit.topics)??[]} initialTopicIds={state.chat.selection?.mode==='ALL_CLASSROOM'?undefined:state.chat.selection?.topicIds}
        contextName={state.chat.curriculum?.classroomTitle??'Contexto general'} materialCount={visualMaterialCount} error={visualSetupError||activeVisual.error}
        busy={activeVisual.busy || chatBusy || resolvingVisualSources || !!state.visualPublication?.busy || !!state.visualPublication?.pending || (visualChat?.context.kind === 'CLASSROOM' && !state.chat.curriculum?.canGenerate)}
        actions={{...runtime.visual,start:topicIds=>void generateVisual(topicIds)}} assetFileUrl={runtime.assetFileUrl}
        />}
    </FoxyDialog>}
    {state.resource && (state.resource.status !== 'closed' || ui.openingResource) && state.preparation && state.history && state.confirmation && <FoxyResourceWorkspace
      resource={state.resource} creationLabel={resourceKind?resourceLabels[resourceKind]:undefined} preparation={state.preparation} history={state.history} confirmation={state.confirmation} management={state.management}
      classrooms={state.classrooms} ui={ui} actions={actions} handoffRuntime={runtime} handoffState={state.activityHandoff} initialHandoffMode={handoffStart?.turnId === state.resource.resource?.sourceTurnId ? handoffStart?.mode : undefined} publicationFileUrl={runtime.publicationFileUrl} />}
  </>;
}
