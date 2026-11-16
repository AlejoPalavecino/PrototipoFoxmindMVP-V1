import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';
import { FoxyToolPicker } from '../../../../../shared-ui/FoxyToolPicker';
import { useChatFollow } from '../../../../../shared-ui/use-chat-follow';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { CreateFoxyConversation, FoxyContext, FoxyPurpose } from '../../../../../../src/core/domain/index.ts';
import type { createFoxyChatController } from '../model/foxy-chat-controller';
import type { createFoxyWorkspaceActions } from '../model/foxy-workspace-actions';
import styles from './foxy-workspace.module.css';
import type { FoxyCreation } from '../api/foxy-client';
import { FoxyCollectionPanel, FoxyConversationPanel, type FoxyCatalogState, type FoxyConversationQuery, type FoxyCreationQuery, type FoxyDestinationHref } from './foxy-collection-panel';
import { FoxyMarkdown } from '../../../../../shared-ui/markdown';

import { FoxmindIcon,type IconKey } from '../../../../../shared-ui/index.ts';
import { Dialog } from '../../../../../shared-ui/feedback';
import { ChatByline, FoxyChatLayout, type ChatIdentity, type ChatView } from '../../../../../shared-ui/FoxyChatLayout';
import { ChatAttachmentButton } from '../../../../../shared-ui/ChatAttachmentControls';
import { useChatAttachments } from '../../../shared/use-chat-attachments';
import { teacherAttachmentPath, teacherAttachmentFilePath } from '../../../shared/chat-attachments';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxyContextPicker, type FoxyContextPreview } from './foxy-context-picker';
import { FoxyLibraryPanel } from './foxy-library-panel';
import { FoxyToolDialog } from './foxy-tool-dialog';
import { FoxyWait } from './foxy-wait';

type Controller = ReturnType<typeof createFoxyChatController>;
type State = ReturnType<Controller['getState']>;
type Classroom = { id: string; name: string; archived?: boolean; division?: string; coverKey?: string };
type VisualChatDraft = { context: FoxyContext; onCreated: () => void };
type ToolMode = 'NOTE' | 'DIAGRAM' | 'ACTIVITY' | 'PLAN' | 'RUBRIC';
const tools: { mode: ToolMode; purpose: FoxyPurpose; label: string; hint: string; icon:IconKey; placeholder: string; request?: string }[] = [
  { mode: 'NOTE', purpose: 'STUDY_MATERIAL', label: 'Crear apuntes', hint: 'Explicaciones y ejemplos', icon: 'book', placeholder: '¿Qué tema querés explicar y a quiénes?', request: 'Prepará un apunte con explicaciones y ejemplos.' },
  { mode: 'DIAGRAM', purpose: 'CHAT', label: 'Crear esquema', hint: 'Ideas y relaciones', icon: 'shapes', placeholder: '¿Qué conceptos querés relacionar en el esquema?' },
  { mode: 'ACTIVITY', purpose: 'ACTIVITY_IDEAS', label: 'Crear actividad', hint: 'Consignas para el aula', icon: 'clipboard', placeholder: '¿Qué querés que hagan tus estudiantes y con qué objetivo?', request: 'Proponé una actividad con consignas para estudiantes.' },
  { mode: 'PLAN', purpose: 'LESSON_PLAN', label: 'Crear planificación', hint: 'Una secuencia de clase', icon: 'calendar', placeholder: '¿Qué tema vas a trabajar y cuánto dura la clase?', request: 'Prepará una planificación con una secuencia de clase.' },
  { mode: 'RUBRIC', purpose: 'RUBRIC', label: 'Crear rúbrica', hint: 'Criterios de evaluación', icon: 'list-checks', placeholder: '¿Qué producción querés evaluar y qué criterios te interesan?', request: 'Proponé una rúbrica como texto editable, con criterios, niveles de logro y pesos que sumen 100. No afirmes haberla asociado a una actividad.' },
];
export function FoxyWorkspace({ visualTimeline, previewContext, onStartActivity, identity, onNewDraft, controller, state, classrooms, contextClassrooms = classrooms, onOpenResource, onCreateDiagram, onOpenVisual, creationBlocked = false, onNavigate, destinationHref, onActivityHandoff, catalog, onConversationQuery, onCreationQuery, onMoreConversations, onMoreCreations, onOpenCreation, onRefreshCatalog }: { visualTimeline?: ReactNode; previewContext?: (id: string, signal: AbortSignal) => Promise<FoxyContextPreview>; onStartActivity?: (classroomId: string) => void; identity?: ChatIdentity; onNewDraft?: () => void; destinationHref?: FoxyDestinationHref; catalog?: FoxyCatalogState; onConversationQuery?: (query: FoxyConversationQuery) => void; onCreationQuery?: (query: FoxyCreationQuery) => void; onMoreConversations?: () => void; onMoreCreations?: () => void; onOpenCreation?: (item: FoxyCreation) => void; onRefreshCatalog?: () => void; controller: ReturnType<typeof createFoxyWorkspaceActions>['chat']; state: State; classrooms: Classroom[]; contextClassrooms?: Classroom[]; onActivityHandoff?: (conversationId: string, turnId: string, mode: 'ACTIVITY' | 'RUBRIC') => void; onOpenResource?: (conversationId: string, turnId: string) => void; onCreateDiagram?: (prompt: string) => Promise<boolean> | boolean; onOpenVisual?: (draft?: VisualChatDraft,details?:{materialCount:number}) => void; creationBlocked?: boolean; onNavigate?: (href: string) => void }) {
  const [submittedMessage,setSubmittedMessage]=useState<{text:string;after:number;conversationId:string|null}|null>(null);
  const chatFollow=useChatFollow(state.current?.id,JSON.stringify([state.turns.map(t=>[t.id,t.state]),state.pending?.requestId,state.activeTurn?.state,submittedMessage?.text]));
  const inCurrentChat=submittedMessage?.conversationId===state.current?.id;
  const matchedSubmission=!!submittedMessage&&inCurrentChat&&state.turns.some(t=>t.sequence>submittedMessage.after&&t.message===submittedMessage.text);
  const pendingText=state.pending?.text??(inCurrentChat?submittedMessage?.text:undefined);
  const pendingVisible=!!pendingText&&!matchedSubmission;
  useEffect(()=>{if(matchedSubmission)setSubmittedMessage(null);},[matchedSubmission]);
  const [newChat, setNewChat] = useState(false);
  const [view, setView] = useState<ChatView>('chat');
  const [historyOpenKey,setHistoryOpenKey]=useState(0);
  const composerRef=useRef<HTMLTextAreaElement>(null);
  const chooseExample=(message:string)=>{setText(message);composerRef.current?.focus();};
  const [contextOpen, setContextOpen] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [toolDialog, setToolDialog] = useState<ToolMode|null>(null);
  const [activityPicker, setActivityPicker] = useState(false);
  const [scopeReport, setScopeReport] = useState<State['turns'][number]['classroomSources']>();
  const [sourceTurnId,setSourceTurnId]=useState<string|null>(null);
  const [renameOpen, setRenameOpen] = useState(false), [renameTitle, setRenameTitle] = useState('');
  const renameValid = Boolean(renameTitle.trim()) && [...renameTitle.trim()].length <= 120 && !/[\u0000-\u001f\u007f-\u009f]/u.test(renameTitle);
  const [context, setContext] = useState('GENERAL');
  const [preparingContext, setPreparingContext] = useState(false);
  const [contextError, setContextError] = useState('');
  const carryRequest = useRef<{ key: string; input: CreateFoxyConversation } | undefined>(undefined);
  const requestedContext = useRef<{ id: string; previousId?: string } | null>(null);
  const [starting, setStarting] = useState<{ title: string; text: string; purpose: FoxyPurpose; mode: ToolMode | null; message: string; context: string; previousId?: string } | null>(null);
  const [startReady, setStartReady] = useState(false);
  const draftMode = !state.current || newChat;
  const draftContext: FoxyContext = context === 'GENERAL' ? { kind: 'GENERAL' } : { kind: 'CLASSROOM', classroomId: context };
  const attachmentPath = !draftMode && state.current ? teacherAttachmentPath(state.current.id) : undefined;
  const attachments = useChatAttachments(attachmentPath);
  const preparedSources = useRef<string | undefined>(undefined);
  useEffect(()=>{
    const id=state.current?.id;
    if(draftMode||!id||state.current?.context.kind!=='CLASSROOM'||!state.curriculum||preparedSources.current===id)return;
    preparedSources.current=id;
    controller.setFullClassroom?.(true);
    void controller.loadSources?.('MATERIAL');
  },[draftMode,state.current?.id,state.curriculum,controller]);
  const draftAttachmentRequest = useRef<string | undefined>(undefined);
  async function attach(id: string, file: File) {
    await attachments.upload(async () => {
      if (attachmentPath) return attachmentPath;
      draftAttachmentRequest.current ??= crypto.randomUUID();
      const conversation = await controller.create({ requestId: draftAttachmentRequest.current, title: 'Nueva conversación', context: draftContext });
      if (typeof conversation !== 'string') throw new Error('No pudimos abrir el chat para este archivo. Volvé a intentar.');
      draftAttachmentRequest.current = undefined;
      setNewChat(false);
      return teacherAttachmentPath(conversation);
    }, id, file, false);
  }
  const [mode, setMode] = useState<ToolMode | null>(null), [text, setText] = useState('');
  const tool = tools.find(item => item.mode === mode), purpose = tool?.purpose ?? 'CHAT';
  const outbound = text;
  const validMessage = Boolean(text.trim()) && [...outbound].length <= 5000 && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text);
  const enabled = mode === 'DIAGRAM' ? Boolean(onCreateDiagram && state.capabilities?.diagramGeneration.enabled) : Boolean(state.capabilities?.textGeneration.enabled), disabled = attachments.busy || preparingContext || !!starting || state.busy || Boolean(state.activeTurn || state.pending) || !enabled
    || (!draftMode && state.current?.context.kind === 'CLASSROOM' && !state.curriculum?.canGenerate);
  useEffect(() => {
    const requested = requestedContext.current, current = state.current;
    // Guarded navigation can finish after the initial callback returned false.
    if (requested && current?.id !== requested.previousId && current?.context.kind === 'CLASSROOM' && current.context.classroomId === requested.id) {
      requestedContext.current = null; setNewChat(false);
    }
  }, [state.current]);
  useEffect(() => {
    if (!starting || !startReady || state.busy || creationBlocked) return;
    setStarting(null); setStartReady(false);
    const current = state.current;
    const matchingContext = current?.context.kind === 'GENERAL' ? starting.context === 'GENERAL'
      : current?.context.kind === 'CLASSROOM' && current.context.classroomId === starting.context;
    if (!current || current.id === starting.previousId || current.title !== starting.title || !matchingContext) {setSubmittedMessage(null);return;}
    setNewChat(false);
    if (starting.mode === 'DIAGRAM') {
      void Promise.resolve(onCreateDiagram?.(starting.text)).then(accepted => { if (accepted) { setText(value => value === starting.text ? '' : value); setMode(null); } });
      return;
    }
    setSubmittedMessage({text:starting.message,after:0,conversationId:current.id});
    void Promise.resolve(controller.send(starting.purpose, starting.message, state.selection ?? { topicIds: [], sourceIds: [] })).then(result => {
      if (result === 'accepted' || result === 'uncertain') { setText(value => value === starting.text ? '' : value); setMode(null); } else setSubmittedMessage(null);
    });
  }, [starting, startReady, state.busy, state.current, state.selection, controller, onCreateDiagram, creationBlocked]);
  const drafts = useRef(new Map<string,string>());
  const draftKey = draftMode ? `new:${context}` : state.current!.id;
  const saveDraft = () => drafts.current.set(draftKey,text);
  const openConversation = (id: string) => { saveDraft(); setText(drafts.current.get(id)??''); setSubmittedMessage(null); setNewChat(false); setMode(null); setView('chat'); void controller.select(id); };
  const materialSources = draftMode ? [] : state.sources?.MATERIAL?.items ?? [];
  const materialCount = attachments.items.length + materialSources.filter(source => source.available).length;
  const contextName = draftMode ? contextClassrooms.find(room=>room.id===context)?.name ?? 'Contexto general' : state.curriculum?.classroomTitle ?? 'Contexto general';
  const openLibrary = () => { setLibraryOpen(true); if(state.curriculum&&!draftMode) void controller.loadSources?.('MATERIAL'); };
  const newConversation = () => {
    const nextContext = draftMode ? context : state.current?.context.kind==='CLASSROOM' ? state.current.context.classroomId : 'GENERAL';
    saveDraft(); onNewDraft?.(); requestedContext.current=null; draftAttachmentRequest.current=undefined;
    setNewChat(true);setSubmittedMessage(null);setText('');setContext(nextContext);setMode(null);setView('chat');
  };
  const toolContents = <FoxyToolPicker items={[
    {value:'NOTE',label:'Preparar un apunte',hint:'Ideas claras para tu grupo.',icon:'book',color:'sky',opensDialog:true},
    {value:'DIAGRAM',label:'Imágenes y esquemas',hint:'Una explicación que se pueda ver.',icon:'layers',color:'mint',opensDialog:true},
    {value:'ACTIVITY',label:'Crear una actividad',hint:'Continuá en el editor de actividades.',icon:'pencil',color:'peach',opensDialog:true},
    {value:'PLAN',label:'Planificar una clase',hint:'Inicio, desarrollo y cierre.',icon:'calendar',color:'rose',opensDialog:true},
    {value:'RUBRIC',label:'Pensar una rúbrica',hint:'Criterios para acompañar.',icon:'progress',color:'sky',opensDialog:true},
  ]} value={null} disabled={preparingContext || !!starting || state.busy || !!state.activeTurn || !!state.pending} onChange={(value:ToolMode) => {
    setView('chat');
    if(value==='DIAGRAM'&&onOpenVisual) onOpenVisual(draftMode ? {context:draftContext,onCreated:()=>setNewChat(false)} : undefined,{materialCount});
    else if(value==='ACTIVITY'&&onStartActivity) setActivityPicker(true);
    else setToolDialog(value);
  }}/>;
  const creationContents = <FoxyCollectionPanel page={catalog?.creations ?? { items: [], next: null, loading: false, error: null }} query={catalog?.creationQuery ?? { q: '', context: 'ALL', type: 'ALL', status: 'ALL' }} classrooms={contextClassrooms} onNavigate={onNavigate} destinationHref={destinationHref} onQuery={onCreationQuery} onMore={onMoreCreations} onRefresh={onRefreshCatalog} onTools={()=>setView('tools')} disabled={state.busy || creationBlocked || !onOpenCreation} onOpen={item => { onOpenCreation?.(item); }} />;
  const conversationContents = <FoxyConversationPanel page={catalog?.conversations ?? {items:state.conversations,next:state.nextConversationCursor,loading:false,error:null}} query={catalog?.conversationQuery ?? {q:'',context:'ALL'}} classrooms={contextClassrooms} currentId={state.current?.id} disabled={!!starting || state.busy} onQuery={onConversationQuery} onSelect={openConversation} onMore={onMoreConversations ?? (()=>void controller.loadMoreConversations())} onRefresh={onRefreshCatalog} onNew={newConversation}
    onRename={item=>{saveDraft();void Promise.resolve(controller.select(item.id)).then(selected=>{if(selected){setNewChat(false);setRenameTitle(item.title);setRenameOpen(true);}});}} />;
  return <section className={`${styles.workspace} parity-foxy-workspace`} aria-label="Espacio Foxy AI">
    <FoxyChatLayout view={view} onView={setView} history={conversationContents}
      historyOpenKey={historyOpenKey} historyKey={draftMode ? undefined : state.current?.id} tools={toolContents} creations={creationContents} creationsCount={catalog?.creations.items.length ?? 0}
      context={<button type="button" className={`${styles.contextLaunch} parity-ai-contextLaunch`} aria-label="Cambiar contexto del chat" aria-haspopup="dialog"
        disabled={attachments.busy || preparingContext || !!starting || state.busy || !!state.pending || !!state.activeTurn} onClick={() => setContextOpen(true)} data-context-kind={draftMode ? draftContext.kind : state.current?.context.kind}>
        <FoxmindIcon name={draftContext.kind==='GENERAL'&& (draftMode||state.current?.context.kind==='GENERAL')?'chat-square':'book'}/>
        <span><small>{(draftMode?context==='GENERAL':state.current?.context.kind==='GENERAL')?'Sin un aula vinculada':'Aula vinculada'}</small><strong>{draftMode ? contextClassrooms.find(room => room.id === context)?.name ?? 'Contexto general' : state.curriculum?.classroomTitle ?? 'Contexto general'}</strong></span>
        <FoxmindIcon name="chevron-right"/>
      </button>}
      newDisabled={attachments.busy || preparingContext || !!starting || state.busy}
      onNew={newConversation}>
      <div className={`${styles.chat} parity-ai-conversation`}>
        <p className={`${styles.srOnly} parity-ai-srOnly`}>{draftMode || state.current?.context.kind === 'GENERAL' ? 'Contexto general' : state.curriculum?.classroomTitle ? `Contexto del aula: ${state.curriculum.classroomTitle}` : 'Contexto del aula no disponible'}</p>
        {contextOpen && <FoxyContextPicker classrooms={contextClassrooms}
          current={draftMode ? context : state.current?.context.kind === 'CLASSROOM' ? state.current.context.classroomId : 'GENERAL'}
          busy={preparingContext} applyError={contextError} onClose={() => {if(!preparingContext)setContextOpen(false);}} attachmentCount={attachments.items.length} previewContext={previewContext}
          onLibrary={()=>{setContextOpen(false);openLibrary();}}
          onApply={async chosen => {
            if(attachments.busy||preparingContext||state.busy||state.pending||state.activeTurn)return;
            const actual=draftMode?context:state.current?.context.kind==='CLASSROOM'?state.current.context.classroomId:'GENERAL';
            if(chosen===actual){setContextOpen(false);return;}
            if(attachments.ready===false){setContextError(attachments.error??'Estamos consultando tus archivos. Volvé a intentar en un momento.');return;}
            if(!draftMode&&state.current&&attachments.items.length){
              const nextContext:FoxyContext=chosen==='GENERAL'?{kind:'GENERAL'}:{kind:'CLASSROOM',classroomId:chosen};
              const carryAttachments={sourceConversationId:state.current.id,sourceRevision:state.current.revision,attachmentIds:attachments.items.map(item=>item.id).sort()};
              const key=JSON.stringify({context:nextContext,carryAttachments});
              if(carryRequest.current?.key!==key)carryRequest.current={key,input:{requestId:crypto.randomUUID(),title:'Nueva conversación',context:nextContext,carryAttachments}};
              setPreparingContext(true);setContextError('');
              try{
                const created=await controller.create(carryRequest.current.input);
                if(typeof created!=='string'){setContextError('No pudimos cambiar el contexto. Tus archivos y este chat se conservan; volvé a intentar.');return;}
                carryRequest.current=undefined;saveDraft();setContext(chosen);setNewChat(false);setContextOpen(false);setSubmittedMessage(null);
                if(chosen!=='GENERAL')controller.setFullClassroom?.(true);
              }catch{setContextError('No pudimos cambiar el contexto. Tus archivos y este chat se conservan; volvé a intentar.');}
              finally{setPreparingContext(false);}
              return;
            }
            saveDraft(); setText(drafts.current.get(`new:${chosen}`)??'');
            setContextOpen(false); setSubmittedMessage(null); setContext(chosen); setNewChat(true); requestedContext.current = null;
            draftAttachmentRequest.current = undefined;
            if (chosen !== 'GENERAL') {
              requestedContext.current = { id: chosen, previousId: state.current?.id }; setPreparingContext(true);
              void Promise.resolve(controller.prepareContext(chosen)).then(ready => { if (ready) { setNewChat(false); controller.setFullClassroom?.(true); } }).finally(() => setPreparingContext(false));
            }
          }}/>}
        {preparingContext ? <p role="status" className={`${styles.contextHelp} parity-ai-contextHelp`}>Preparando contexto del aula…</p> : null}
        {!draftMode && state.current ? <>
          <p className={`${styles.srOnly} parity-ai-srOnly`} role="status">{!state.activeTurn&&!state.pending&&state.turns.at(-1)?.state==='READY'?'Respuesta de Foxy lista para leer.':''}</p><div className={`${styles.transcript} parity-ai-transcript`} ref={chatFollow.ref} onScroll={chatFollow.onScroll} aria-label="Mensajes con Foxy">
            {!state.turns.length && !state.activeTurn && !pendingVisible && !visualTimeline ? <FoxyWelcome tool={tool} onExample={chooseExample} /> : null}
            {state.turns.map(turn => <article className={`${styles.turn} parity-ai-turn`} key={turn.id}>
            <div className={`${styles.request} parity-ai-request`}><ChatByline user identity={identity}/><p>{turn.message}</p></div>
            {turn.answer ? <div className={`${styles.answer} parity-ai-answer`}><ChatByline/>
              {turn.state === 'READY' && turn.purpose !== 'CHAT' && onOpenResource ? <div className="parity-foxy-creationReply"><p>Tu propuesta está lista. Abrila para revisarla y darle tu mirada.</p><button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}><FoxmindIcon name="file"/>Abrir creación</button></div> : <>{turn.purpose !== 'CHAT' && <h4>{turn.answer.title}</h4>}<div className={`${styles.chatMarkdown} parity-ai-chatMarkdown`}><FoxyMarkdown markdown={turn.answer.markdown}/></div></>}
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}
</div>
              : turn.state === 'CANCELLED' ? <p role="status">Detuviste la respuesta. <button type="button" onClick={()=>setText(turn.message)}>Retomar mensaje</button></p>
              : turn.state === 'FAILED' || turn.state === 'STALE' ? <p role="status">No se pudo completar esta respuesta. Podés revisar tu mensaje y hacer una nueva solicitud.</p> : <FoxyWait queued={turn.state==='QUEUED'} generating={turn.purpose!=='CHAT'} title={turn.state==='QUEUED'?'Tu solicitud está en cola':turn.purpose==='CHAT'?'Conectando las ideas':'Dándole forma a la propuesta'} onStop={()=>void controller.cancel?.()} disabled={state.busy}/>}
            {turn.state === 'READY' && (turn.classroomSources || attachments.items.length>0 || !!state.citations?.[turn.id]?.length) && <button type="button" className="parity-foxy-sourceNote" aria-haspopup="dialog" onClick={()=>{setScopeReport(turn.classroomSources);setSourceTurnId(turn.id);void controller.loadCitations?.(turn.id);}}><FoxmindIcon name="book"/>{turn.classroomSources?`Plan de estudio · ${turn.classroomSources.used.length} fuentes`:'Materiales de esta respuesta'}</button>}
          </article>)}
          {pendingVisible&&<article className={`${styles.turn} parity-ai-turn`}><div className={`${styles.request} parity-ai-request`}><ChatByline user identity={identity}/><p>{pendingText}</p></div>{state.error?<p role="status">Envío sin confirmar. Tu mensaje se conserva; usá Reintentar envío.</p>:<FoxyWait title={state.pending?'Enviando tu mensaje':state.activeTurn?.state==='QUEUED'?'Tu solicitud está en cola':'Leyendo tu pregunta'} onStop={state.activeTurn?()=>void controller.cancel?.():undefined} disabled={state.busy}/>}</article>}
          {state.activeTurn&&!state.turns.some(t=>t.id===state.activeTurn?.id)&&(!pendingVisible||!!state.error)&&<FoxyWait title={state.activeTurn.state==='QUEUED'?'Tu solicitud está en cola':'Conectando las ideas'} onStop={()=>void controller.cancel?.()} disabled={state.busy}/>}
          {state.busy&&!pendingVisible&&!state.activeTurn&&<AsyncFeedback compact title="Cargando conversación…"/>}{visualTimeline}</div>
          {chatFollow.unread&&<button type="button" onClick={chatFollow.jump}>Ver mensajes nuevos ↓</button>}
          {state.nextAfterSequence !== null ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button> : null}
          {!enabled ? <p>{mode === 'DIAGRAM' ? 'La generación de esquemas no está disponible en este momento.' : 'La generación de texto no está disponible en este momento.'}</p> : null}
        </> : <div className={`${styles.empty} parity-ai-empty`}>{submittedMessage?<><div className={`${styles.request} parity-ai-request`}><ChatByline user identity={identity}/><p>{submittedMessage.text}</p></div><AsyncFeedback compact title="Preparando tu conversación…"/></>:<FoxyWelcome tool={tool} onExample={chooseExample} />}</div>}
          <form className={`${styles.composer} parity-ai-composer`} onSubmit={event => { event.preventDefault(); if (!validMessage || disabled) return;
            const submitted = text;
            if(mode!=='DIAGRAM')setSubmittedMessage({text:outbound,
              after:draftMode?0:Math.max(0,...state.turns.map(t=>t.sequence)),
              conversationId:draftMode?null:state.current?.id??null});
            if (draftMode) {
              const title = [...submitted.trim().replace(/\s+/gu, ' ')].slice(0, 120).join('');
              setStarting({ title, text: submitted, message: outbound, purpose, mode, context, previousId: state.current?.id });
              void Promise.resolve(controller.create({ requestId: crypto.randomUUID(), title, context: draftContext })).then(() => setStartReady(true)).catch(() => { setStarting(null); setSubmittedMessage(null); setStartReady(false); });
              return;
            }
            void (async () => {
              if (state.current?.title === 'Nueva conversación' && !state.turns.length) {
                const saved = await controller.rename([...submitted.trim().replace(/\s+/gu, ' ')].slice(0, 120).join(''));
                if (!saved) {setSubmittedMessage(null);return;}
              }
              if (mode === 'DIAGRAM') {
                const accepted = await onCreateDiagram?.(submitted);
                if (accepted) { setText(value => value === submitted ? '' : value); setMode(null); }
                return;
              }
              const result = await controller.send(purpose, outbound, state.selection ?? { topicIds: [], sourceIds: [] });
              if(result!=='accepted'&&result!=='uncertain')setSubmittedMessage(null);
              if (result === 'accepted' || result === 'uncertain') { setText(current => current === submitted ? '' : current); setMode(null); }
            })(); }}>

            {tool ? <div className={`${styles.activeMode} parity-ai-activeMode`}><span>{tool.label}</span><button type="button" aria-label="Quitar tipo de ayuda" onClick={() => setMode(null)}>Quitar</button></div> : null}
            <label><span className={`${styles.srOnly} parity-ai-srOnly`}>Tu mensaje</span><textarea ref={composerRef} rows={2} placeholder={tool?.placeholder ?? 'Contame tu idea o preguntame algo…'} value={text} onChange={event => setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter' && !event.shiftKey && !event.nativeEvent.isComposing){event.preventDefault();if(validMessage&&!disabled)event.currentTarget.form?.requestSubmit();}}} required /></label>
            <div className={`${styles.composerActions} parity-ai-composerActions`}>
              <div className={`${styles.composerTools} parity-ai-composerTools`}>
                <button type="button" aria-label="Biblioteca" aria-haspopup="dialog" aria-expanded={libraryOpen} onClick={openLibrary}><FoxmindIcon name="book"/>Biblioteca <b className="parity-library-count">{materialCount}</b></button>
                <ChatAttachmentButton iconOnly disabled={attachments.busy || preparingContext || !!starting || state.busy ||
                  !!state.activeTurn || !!state.pending || (!draftMode && state.curriculum?.archived)} onUpload={attach}/>
              </div>
              <span className="parity-chat-key-hint">Enter para enviar · Shift + Enter para otra línea</span><button type="submit" className="p5-primary" disabled={disabled || !validMessage}>Enviar <FoxmindIcon name="arrow-right" /></button>
            </div>
            {mode === 'RUBRIC' ? <small className={`${styles.rubricHint} parity-ai-rubricHint`}>Propuesta como texto editable. Podés revisarla y usar sus criterios en un borrador de actividad.</small> : null}
          </form>
          <p className={`${styles.disclosure} parity-ai-disclosure`}>Foxy puede equivocarse. Revisá sus propuestas.</p>
        {state.error ? <div role="alert"><p>{state.error}</p>{state.pending ? <button type="button" disabled={state.busy}
          onClick={() => void controller.retry()}>Reintentar envío</button> : null}</div> : null}
      </div>
    </FoxyChatLayout>
    {sourceTurnId && <FoxyDialog title="Fuentes de esta respuesta" onClose={()=>{setScopeReport(undefined);setSourceTurnId(null);}}>
      {scopeReport&&<><h3>Usadas</h3>{scopeReport.used.length? <ul>{scopeReport.used.map(item=><li key={item.sourceId}>{item.title}</li>)}</ul>:<p>La respuesta usó los temas del plan.</p>}
      {scopeReport.excluded.length>0 && <><h3>Excluidas</h3><ul>{scopeReport.excluded.map(item=><li key={item.sourceId}>{item.title} · {sourceExclusion(item.reason)}</li>)}</ul></>}</>}
      {(state.citations?.[sourceTurnId]??[]).map(citation=>{const expected=`/api/v1/foxy-ai/conversations/${state.current!.id}/turns/${sourceTurnId}/citations/${citation.id}/file?mode=preview`;
        const safe=/^c[1-9][0-9]*$/u.test(citation.id)&&citation.availability==='AVAILABLE'&&citation.href===expected;
        return <p key={citation.id}>{citation.sourceTitle??'Fuente'} {citation.documentTitle??''} {citation.page?`· página ${citation.page}`:''}{safe?<> <a href={expected} target="_blank" rel="noopener noreferrer">Ver documento</a></>:citation.availability==='TEXT_ONLY'?' · Texto':' · No disponible'}</p>;})}
    </FoxyDialog>}
    {libraryOpen && <FoxyDialog title="Biblioteca de contexto" description="Tus fuentes, siempre a mano para conversar." className="parity-ai-tray parity-foxy-libraryDialog" onClose={()=>setLibraryOpen(false)} footer={<button type="button" onClick={()=>setLibraryOpen(false)}>Volver al chat</button>}>
      <FoxyLibraryPanel attachments={attachments.items} attachmentHref={!draftMode&&state.current?id=>teacherAttachmentFilePath(state.current!.id,id):undefined} sources={materialSources} classroomName={!draftMode?state.curriculum?.classroomTitle:undefined} units={!draftMode?state.curriculum?.units??[]:[]}
        disabled={attachments.busy||state.busy||!!state.activeTurn||!!state.pending||state.curriculum?.archived} error={attachments.error} onUpload={attach} onRemove={id=>void attachments.remove(id)}
        onContext={()=>{setLibraryOpen(false);setContextOpen(true);}} onTopic={name=>{setText(`Ayudame a entender ${name} con un ejemplo.`);setLibraryOpen(false);}}
        onOpenSource={destinationHref&&onNavigate&&!draftMode&&state.current?.context.kind==='CLASSROOM'?source=>{const id=source.sourceId.replace(/^material:/,'');if(/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(id)&&state.current?.context.kind==='CLASSROOM')onNavigate(destinationHref({kind:'material',classroomId:state.current.context.classroomId,materialId:id}));}:undefined}
        onMoreSources={state.sources?.MATERIAL?.next?()=>void controller.loadSources('MATERIAL'):undefined}/>
    </FoxyDialog>}
    {activityPicker&&<FoxyDialog title="¿En qué aula querés crear la actividad?" description="Elegí el grupo para continuar en el editor." onClose={()=>setActivityPicker(false)} footer={<button type="button" onClick={()=>setActivityPicker(false)}>Cancelar</button>}><div className="parity-foxy-classPicks">{classrooms.filter(room=>!room.archived).map(room=><button key={room.id} type="button" onClick={()=>{setActivityPicker(false);onStartActivity?.(room.id);}}><FoxmindIcon name="book"/><span><strong>{room.name}</strong><small>{room.division}</small></span><FoxmindIcon name="chevron-right"/></button>)}{!classrooms.some(room=>!room.archived)&&<p>Creá un aula para preparar una actividad.</p>}</div></FoxyDialog>}
    {toolDialog&&<FoxyToolDialog title={toolDialog==='NOTE'?'Preparar un apunte':toolDialog==='PLAN'?'Planificar una clase':toolDialog==='RUBRIC'?'Pensar una rúbrica':'Imágenes y esquemas'} contextName={contextName} materialCount={materialCount} topics={draftMode?[]:state.curriculum?.units.flatMap(unit=>unit.topics)??[]} busy={state.busy} error={state.error} onClose={()=>setToolDialog(null)} onPrepare={async(brief,topicIds)=>{
      const chosen=tools.find(item=>item.mode===toolDialog)!;
      let id=state.current?.id;
      if(draftMode){const created=await controller.create({requestId:crypto.randomUUID(),title:[...brief].slice(0,120).join(''),context:draftContext});if(typeof created!=='string')return false;id=created;setNewChat(false);}
      if(toolDialog==='DIAGRAM')return !!await onCreateDiagram?.(brief);
      const message=brief;
      const allTopics=state.curriculum?.units.flatMap(unit=>unit.topics)??[];
      const selection=topicIds.length===allTopics.length?state.selection??{topicIds:[],sourceIds:[]}:{topicIds,sourceIds:state.selection?.sourceIds??[]};
      setSubmittedMessage({text:message,after:draftMode?0:Math.max(0,...state.turns.map(turn=>turn.sequence)),conversationId:id??null});
      const result=await controller.send(chosen.purpose,message,selection);
      if(result!=='accepted'&&result!=='uncertain')setSubmittedMessage(null);
      return result==='accepted'||result==='uncertain';
    }}/>}
    {renameOpen&&<FoxyDialog title="Un nombre para volver a encontrarla" description="La conversación conserva sus mensajes." onClose={()=>{if(!state.busy){setRenameOpen(false);setHistoryOpenKey(key=>key+1);}}} footer={<><button type="button" disabled={state.busy} onClick={()=>{setRenameOpen(false);setHistoryOpenKey(key=>key+1);}}>Cancelar</button><button type="submit" form="foxy-rename-form" className="p5-primary" disabled={state.busy||!renameValid}>{state.busy?'Guardando…':'Guardar nombre'}</button></>}>
      <form id="foxy-rename-form" className="parity-foxy-toolForm" onSubmit={event=>{event.preventDefault();if(!renameValid||state.busy)return;void Promise.resolve(controller.rename(renameTitle.trim())).then(saved=>{if(saved){setRenameOpen(false);setHistoryOpenKey(key=>key+1);}});}}>
        <label>Nombre de la conversación<input autoFocus value={renameTitle} maxLength={120} aria-invalid={!renameValid} onChange={event=>setRenameTitle(event.target.value)}/></label>{state.error&&<p role="alert">{state.error}</p>}
      </form>
    </FoxyDialog>}
  </section>;
}
function sourceExclusion(reason: string) {
  return ({ FILE_NOT_READY:'Archivo sin preparar', UNSUPPORTED_FORMAT:'Formato sin lectura de IA', AI_INPUT_LIMIT:'Supera el límite individual', EMPTY_CONTENT:'Sin contenido legible' } as Record<string,string>)[reason] ?? 'No disponible';
}
function FoxyWelcome({ onExample, tool }: { onExample: (prompt: string) => void; tool?: { label: string; placeholder: string } }) {
  return <div className={`${styles.welcome} parity-ai-welcome`}>
    <div className={`${styles.foxyMark} parity-ai-foxyMark`}><img src="/foxmind/foxy.webp" alt="" width={108} height={108} /><span className={`${styles.orbitOne} parity-ai-orbitOne`}><FoxmindIcon name="book"/></span><span className={`${styles.orbitTwo} parity-ai-orbitTwo`}><FoxmindIcon name="spark"/></span></div>
    <h2>{tool?.label ?? '¿Qué idea trabajamos hoy?'}</h2>
    <p>{tool?.placeholder ?? 'Busquemos juntos una forma de explicarla, una actividad o un nuevo punto de partida.'}</p>
    {!tool ? <div className={`${styles.welcomePrompts} parity-ai-welcomePrompts`}><button className={`${styles.suggestion} parity-ai-suggestion`} type="button" onClick={()=>onExample('Busquemos otra forma de explicarlo')}><FoxmindIcon name="chat-square"/>Busquemos otra forma de explicarlo</button><button className={`${styles.suggestion} parity-ai-suggestion`} type="button" onClick={()=>onExample('Ayudame a pensar una clase')}><FoxmindIcon name="calendar"/>Ayudame a pensar una clase</button></div> : null}
  </div>;
}
