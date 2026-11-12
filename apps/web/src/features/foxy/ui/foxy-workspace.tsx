import { AsyncFeedback } from '../../../../../shared-ui/AsyncFeedback';
import { FoxyToolPicker } from '../../../../../shared-ui/FoxyToolPicker';
import { useChatFollow } from '../../../../../shared-ui/use-chat-follow';
import { useEffect, useRef, useState } from 'react';
import type { FoxyPurpose } from '../../../../../../src/core/domain/index.ts';
import type { createFoxyChatController } from '../model/foxy-chat-controller';
import type { createFoxyWorkspaceActions } from '../model/foxy-workspace-actions';
import styles from './foxy-workspace.module.css';
import type { FoxyCreation } from '../api/foxy-client';
import { FoxyCollectionPanel, FoxyConversationPanel, type FoxyCatalogState, type FoxyConversationQuery, type FoxyCreationQuery, type FoxyDestinationHref } from './foxy-collection-panel';
import { FoxyMarkdown } from '../../../../../shared-ui/markdown';

import { FoxmindIcon,type IconKey } from '../../../../../shared-ui/index.ts';
import { Dialog } from '../../../../../shared-ui/feedback';
import { ChatByline, FoxyChatLayout, type ChatIdentity, type ChatView } from '../../../../../shared-ui/FoxyChatLayout';
import { ChatAttachmentButton, ChatAttachmentList } from '../../../../../shared-ui/ChatAttachmentControls';
import { useChatAttachments } from '../../../shared/use-chat-attachments';
import { teacherAttachmentPath } from '../../../shared/chat-attachments';

type Controller = ReturnType<typeof createFoxyChatController>;
type State = ReturnType<Controller['getState']>;
type Classroom = { id: string; name: string };
type ToolMode = 'NOTE' | 'DIAGRAM' | 'ACTIVITY' | 'PLAN' | 'RUBRIC';
const tools: { mode: ToolMode; purpose: FoxyPurpose; label: string; hint: string; icon:IconKey; placeholder: string; request?: string }[] = [
  { mode: 'NOTE', purpose: 'STUDY_MATERIAL', label: 'Crear apuntes', hint: 'Explicaciones y ejemplos', icon: 'book', placeholder: '¿Qué tema querés explicar y a quiénes?', request: 'Prepará un apunte con explicaciones y ejemplos.' },
  { mode: 'DIAGRAM', purpose: 'CHAT', label: 'Crear esquema', hint: 'Ideas y relaciones', icon: 'shapes', placeholder: '¿Qué conceptos querés relacionar en el esquema?' },
  { mode: 'ACTIVITY', purpose: 'ACTIVITY_IDEAS', label: 'Crear actividad', hint: 'Consignas para el aula', icon: 'clipboard', placeholder: '¿Qué querés que hagan tus estudiantes y con qué objetivo?', request: 'Proponé una actividad con consignas para estudiantes.' },
  { mode: 'PLAN', purpose: 'LESSON_PLAN', label: 'Crear planificación', hint: 'Una secuencia de clase', icon: 'calendar', placeholder: '¿Qué tema vas a trabajar y cuánto dura la clase?', request: 'Prepará una planificación con una secuencia de clase.' },
  { mode: 'RUBRIC', purpose: 'RUBRIC', label: 'Crear rúbrica', hint: 'Criterios de evaluación', icon: 'list-checks', placeholder: '¿Qué producción querés evaluar y qué criterios te interesan?', request: 'Proponé una rúbrica como texto editable, con criterios, niveles de logro y pesos que sumen 100. No afirmes haberla asociado a una actividad.' },
];
export function FoxyWorkspace({ identity, controller, state, classrooms, contextClassrooms = classrooms, onOpenResource, onCreateDiagram, onOpenVisual, creationBlocked = false, onNavigate, destinationHref, onActivityHandoff, catalog, onConversationQuery, onCreationQuery, onMoreConversations, onMoreCreations, onOpenCreation, onRefreshCatalog }: { identity?: ChatIdentity; destinationHref?: FoxyDestinationHref; catalog?: FoxyCatalogState; onConversationQuery?: (query: FoxyConversationQuery) => void; onCreationQuery?: (query: FoxyCreationQuery) => void; onMoreConversations?: () => void; onMoreCreations?: () => void; onOpenCreation?: (item: FoxyCreation) => void; onRefreshCatalog?: () => void; controller: ReturnType<typeof createFoxyWorkspaceActions>['chat']; state: State; classrooms: Classroom[]; contextClassrooms?: Classroom[]; onActivityHandoff?: (conversationId: string, turnId: string, mode: 'ACTIVITY' | 'RUBRIC') => void; onOpenResource?: (conversationId: string, turnId: string) => void; onCreateDiagram?: (prompt: string) => Promise<boolean> | boolean; onOpenVisual?: () => void; creationBlocked?: boolean; onNavigate?: (href: string) => void }) {
  const [submittedMessage,setSubmittedMessage]=useState<{text:string;after:number}|null>(null);
  const chatFollow=useChatFollow(state.current?.id,JSON.stringify([state.turns.map(t=>[t.id,t.state]),state.pending?.requestId,state.activeTurn?.state,submittedMessage?.text]));
  const pendingText=state.pending?.text??submittedMessage?.text;
  const pendingVisible=!!pendingText&&!state.turns.some(t=>t.sequence>(submittedMessage?.after??Infinity)&&t.message===pendingText);
  useEffect(()=>{if(submittedMessage&&state.turns.some(t=>t.sequence>submittedMessage.after&&t.message===submittedMessage.text))setSubmittedMessage(null);},[state.turns,submittedMessage]);
  const [newChat, setNewChat] = useState(false);
  const [view, setView] = useState<ChatView>('chat');
  const [contextOpen, setContextOpen] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false), [renameTitle, setRenameTitle] = useState('');
  const renameValid = Boolean(renameTitle.trim()) && [...renameTitle.trim()].length <= 120 && !/[\u0000-\u001f\u007f-\u009f]/u.test(renameTitle);
  const [context, setContext] = useState('GENERAL');
  const [preparingContext, setPreparingContext] = useState(false);
  const requestedContext = useRef<{ id: string; previousId?: string } | null>(null);
  const [starting, setStarting] = useState<{ title: string; text: string; purpose: FoxyPurpose; mode: ToolMode | null; message: string; context: string; previousId?: string } | null>(null);
  const [startReady, setStartReady] = useState(false);
  const draftMode = !state.current || newChat;
  const attachmentPath = !draftMode && state.current ? teacherAttachmentPath(state.current.id) : undefined;
  const attachments = useChatAttachments(attachmentPath);
  const draftAttachmentRequest = useRef<string | undefined>(undefined);
  async function attach(id: string, file: File) {
    await attachments.upload(async () => {
      if (attachmentPath) return attachmentPath;
      const chosen = context === 'GENERAL' ? { kind: 'GENERAL' as const } : { kind: 'CLASSROOM' as const, classroomId: context };
      draftAttachmentRequest.current ??= crypto.randomUUID();
      const conversation = await controller.create({ requestId: draftAttachmentRequest.current, title: 'Nueva conversación', context: chosen });
      if (typeof conversation !== 'string') throw new Error('No pudimos abrir el chat para este archivo. Volvé a intentar.');
      draftAttachmentRequest.current = undefined;
      setNewChat(false);
      return teacherAttachmentPath(conversation);
    }, id, file, false);
  }
  const [mode, setMode] = useState<ToolMode | null>(null), [text, setText] = useState('');
  const tool = tools.find(item => item.mode === mode), purpose = tool?.purpose ?? 'CHAT';
  const outbound = tool?.request ? `${tool.request}\n\n${text}` : text;
  const validMessage = Boolean(text.trim()) && [...outbound].length <= 5000 && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text);
  const topicCount = state.selection?.topicIds.length ?? 0, sourceCount = state.selection?.sourceIds.length ?? 0;
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
    void Promise.resolve(controller.send(starting.purpose, starting.message, state.selection ?? { topicIds: [], sourceIds: [] })).then(result => {
      if (result === 'accepted' || result === 'uncertain') { setText(value => value === starting.text ? '' : value); setMode(null); } else setSubmittedMessage(null);
    });
  }, [starting, startReady, state.busy, state.current, state.selection, controller, onCreateDiagram, creationBlocked]);
  const openConversation = (id: string) => { setSubmittedMessage(null); setNewChat(false); setMode(null); setView('chat'); void controller.select(id); };
  const visualTool = { value: 'VISUALS', label: 'Imágenes y esquemas', hint: 'Formato, vista previa y recursos visuales',
    example: 'Una imagen del ciclo del agua para la clase.', icon: 'layers', opensDialog: true } as const;
  const toolContents = <>
    <header className={styles.galleryHeading}>
      <div><small className={styles.galleryEyebrow}>De la idea al recurso</small><h2>¿Qué querés preparar?</h2><p>Elegí por dónde empezar. Después lo construimos en el chat.</p></div>
      <img src="/brujula/avatars/foxy-creative.webp" width={72} height={72} alt=""/>
    </header>
    <FoxyToolPicker items={[...tools.map(tool => ({ ...tool, value: tool.mode, example: tool.placeholder })),
      ...(!draftMode && onOpenVisual ? [visualTool] : [])]} value={mode}
      disabled={!!starting || state.busy || !!state.activeTurn || !!state.pending} onChange={value => {
        if (value === 'VISUALS') onOpenVisual?.();
        else { setMode(value); setView('chat'); }
      }}/>
  </>;
  const creationContents = <FoxyCollectionPanel page={catalog?.creations ?? { items: [], next: null, loading: false, error: null }} query={catalog?.creationQuery ?? { q: '', context: 'ALL', type: 'ALL', status: 'ALL' }} classrooms={contextClassrooms} onNavigate={onNavigate} destinationHref={destinationHref} onQuery={onCreationQuery} onMore={onMoreCreations} onRefresh={onRefreshCatalog} disabled={state.busy || creationBlocked || !onOpenCreation} onOpen={item => { onOpenCreation?.(item); }} />;
  const conversationContents = catalog ? <FoxyConversationPanel page={catalog.conversations} query={catalog.conversationQuery} classrooms={contextClassrooms} currentId={state.current?.id} disabled={!!starting || state.busy} onQuery={onConversationQuery} onSelect={openConversation} onMore={onMoreConversations} onRefresh={onRefreshCatalog} /> : <><ul>{state.conversations.map(item => <li key={item.id}><button type="button" disabled={!!starting || state.busy} aria-current={state.current?.id === item.id ? 'true' : undefined} onClick={() => openConversation(item.id)}>{item.title}</button></li>)}</ul>{state.nextConversationCursor ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMoreConversations()}>Más conversaciones</button> : null}</>;
  return <section className={styles.workspace} aria-label="Espacio Foxy AI">
    <nav className={styles.location} aria-label="Ubicación"><a href="/inicio" onClick={event => {
      if (!onNavigate || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); onNavigate('/inicio');
    }}>Inicio</a><FoxmindIcon name="chevron-right" /><span aria-current="page">Foxy AI</span></nav>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}><FoxmindIcon name="spark" /> ESTUDIO DOCENTE</span><h1>Foxy AI</h1></div>
      <button type="button" className="p5-primary" disabled={attachments.busy || preparingContext || !!starting || state.busy} onClick={() => {
        requestedContext.current = null; draftAttachmentRequest.current = undefined;
        setNewChat(true); setSubmittedMessage(null); setText(''); setContext('GENERAL'); setMode(null); setView('chat');
      }}><FoxmindIcon name="plus" />Nuevo chat</button>
    </header>
    <FoxyChatLayout view={view} onView={setView} history={conversationContents}
      historyKey={draftMode ? undefined : state.current?.id} tools={toolContents} creations={creationContents}>
      <div className={styles.chat}>
        <p className={styles.srOnly}>{draftMode || state.current?.context.kind === 'GENERAL' ? 'Contexto general' : state.curriculum?.classroomTitle ? `Contexto del aula: ${state.curriculum.classroomTitle}` : 'Contexto del aula no disponible'}</p>
        <header className={styles.refreshHeading}>
          <h2>{draftMode ? 'Nueva conversación' : state.current?.title}</h2>
          <div className={styles.refreshActions}>
            <button type="button" aria-label="Cambiar contexto del chat" className={styles.contextPill} disabled={preparingContext || !!starting || state.busy}
              onClick={() => setContextOpen(true)}>
              <FoxmindIcon name="globe" />{draftMode ? classrooms.find(room => room.id === context)?.name ?? 'General' : state.curriculum?.classroomTitle ?? 'General'}
            </button>
            {!draftMode && state.current?.context.kind === 'CLASSROOM' && state.curriculum && <button type="button" onClick={() => setSourcesOpen(true)}>
              {topicCount} {topicCount === 1 ? 'tema' : 'temas'} · {sourceCount} {sourceCount === 1 ? 'fuente' : 'fuentes'}
            </button>}
            {!draftMode && state.current && <button type="button" disabled={state.busy || !!starting}
              onClick={() => { setRenameTitle(state.current!.title); setRenameOpen(true); }}>Renombrar</button>}
          </div>
        </header>
        {contextOpen && <FoxyContextPicker classrooms={classrooms}
          current={draftMode ? context : state.current?.context.kind === 'CLASSROOM' ? state.current.context.classroomId : 'GENERAL'}
          onClose={() => setContextOpen(false)} onApply={chosen => {
            setContextOpen(false); setSubmittedMessage(null); setContext(chosen); setNewChat(true); requestedContext.current = null;
            draftAttachmentRequest.current = undefined;
            if (chosen !== 'GENERAL') {
              requestedContext.current = { id: chosen, previousId: state.current?.id }; setPreparingContext(true);
              void Promise.resolve(controller.prepareContext(chosen)).then(ready => { if (ready) setNewChat(false); }).finally(() => setPreparingContext(false));
            }
          }}/>}
        {preparingContext ? <p role="status" className={styles.contextHelp}>Preparando contexto del aula…</p> : null}
        {!draftMode && state.current ? <>
          {sourcesOpen && state.current.context.kind === 'CLASSROOM' && state.curriculum ? <Dialog labeledClose title="Temas y fuentes" onClose={() => setSourcesOpen(false)}>
            <section className={styles.contextSources} aria-label="Contexto del aula">
            <h3>Temas del plan</h3>{state.curriculum.archived ? <p>El aula está archivada; no admite nuevas solicitudes.</p> : null}
            {state.curriculum.units.map(unit => <fieldset key={unit.id}><legend>{unit.name}</legend>{unit.topics.map(topic =>
              <label key={topic.id}><input type="checkbox" checked={state.selection.topicIds.includes(topic.id)}
                onChange={() => controller.selectTopic(topic.id)} /> {topic.name} — {topic.status === 'TAUGHT' ? 'Tratado' : topic.status === 'NEXT' ? 'Próximo' : 'Pendiente'}</label>)}</fieldset>)}
            <h3>Fuentes del aula</h3>{(['PLAN', 'MATERIAL', 'ACTIVITY'] as const).map(kind => <section key={kind}>
              <h4>{kind === 'PLAN' ? 'Planes' : kind === 'MATERIAL' ? 'Biblioteca' : 'Actividades'}</h4>
              {(state.sources?.[kind]?.items ?? []).map(source => <label key={source.sourceId}><input type="checkbox" disabled={!source.available}
                checked={state.selection.sourceIds.includes(source.sourceId)} onChange={() => controller.selectSource(source.sourceId)} />
                {source.title}{source.planVersion ? ` · versión ${source.planVersion}` : ''}{!source.available ? ' · No disponible' : ''}</label>)}
              {(!state.sources?.[kind]?.items.length || state.sources[kind].next) ? <button type="button" onClick={() => void controller.loadSources(kind)}>Cargar fuentes</button> : null}
            </section>)}
            </section>
          </Dialog> : null}
          <p className={styles.srOnly} role="status">{!state.activeTurn&&!state.pending&&state.turns.at(-1)?.state==='READY'?'Respuesta de Foxy lista para leer.':''}</p><div className={styles.transcript} ref={chatFollow.ref} onScroll={chatFollow.onScroll} aria-label="Mensajes con Foxy">
            {!state.turns.length && !state.activeTurn && !pendingVisible ? <FoxyWelcome tool={tool} onExample={() => setText('Dame una idea para cerrar una clase en tres minutos.')} /> : null}
            {state.turns.map(turn => <article className={styles.turn} key={turn.id}>
            <div className={styles.request}><ChatByline user identity={identity}/><p>{turn.message}</p></div>
            {turn.answer ? <div className={styles.answer}><ChatByline/>
              {turn.state === 'READY' && turn.purpose !== 'CHAT' && onOpenResource ? <div className={styles.resourceCard}>
                <span className={styles.resourceIcon}><FoxmindIcon name="book"/></span>
                <div><small>CREACIÓN PRIVADA</small><h4>{turn.answer.title}</h4></div>
                <button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}>Abrir recurso <FoxmindIcon name="arrow-right"/></button>
              </div> : <>{turn.purpose !== 'CHAT' && <h4>{turn.answer.title}</h4>}<div className={styles.chatMarkdown}><FoxyMarkdown markdown={turn.answer.markdown}/></div></>}
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}
              {turn.state === 'READY' && onActivityHandoff && (turn.purpose==='ACTIVITY_IDEAS'||turn.purpose==='RUBRIC') ? <button type="button" onClick={() => onActivityHandoff(state.current!.id,turn.id,turn.purpose==='RUBRIC'?'RUBRIC':'ACTIVITY')}>{turn.purpose==='RUBRIC'?'Usar rúbrica en una actividad':'Preparar en Actividades'}</button> : null}</div>
              : turn.state === 'FAILED' || turn.state === 'STALE' ? <p role="status">No se pudo completar esta respuesta. Podés revisar tu mensaje y hacer una nueva solicitud.</p> : <AsyncFeedback compact showDelay title={turn.state==='QUEUED'?'Tu solicitud está en cola':'Foxy está preparando tu respuesta'}/>}
            {turn.state === 'READY' ? <><button type="button" onClick={() => void controller.loadCitations(turn.id)}>Ver citas</button>
              {(state.citations?.[turn.id] ?? []).map(citation => {
                const expected = `/api/v1/foxy-ai/conversations/${state.current!.id}/turns/${turn.id}/citations/${citation.id}/file?mode=preview`;
                const safe = /^c[1-9][0-9]*$/u.test(citation.id) && citation.availability === 'AVAILABLE' && citation.href === expected;
                return <p key={citation.id}>{citation.sourceTitle ?? 'Fuente'} {citation.documentTitle ?? ''} {citation.page ? `· página ${citation.page}` : ''}
                  {safe ? <> <a href={expected} target="_blank" rel="noopener noreferrer">Ver documento</a></> : citation.availability === 'TEXT_ONLY' ? ' · Texto' : ' · No disponible'}</p>;
              })}</> : null}
          </article>)}
          {pendingVisible&&<article className={styles.turn}><div className={styles.request}><ChatByline user identity={identity}/><p>{pendingText}</p></div>{state.error?<p role="status">Envío sin confirmar. Tu mensaje se conserva; usá Reintentar envío.</p>:<AsyncFeedback compact showDelay title={state.pending?'Enviando tu mensaje':state.activeTurn?.state==='QUEUED'?'Tu solicitud está en cola':'Foxy está preparando tu respuesta'}/>}</article>}
          {state.activeTurn&&!state.turns.some(t=>t.id===state.activeTurn?.id)&&(!pendingVisible||!!state.error)&&<AsyncFeedback compact showDelay title={state.activeTurn.state==='QUEUED'?'Tu solicitud está en cola':'Foxy está preparando tu respuesta'}/>}
          {state.busy&&!pendingVisible&&!state.activeTurn&&<AsyncFeedback compact title="Cargando conversación…"/>}</div>
          {chatFollow.unread&&<button type="button" onClick={chatFollow.jump}>Ver mensajes nuevos ↓</button>}
          {state.nextAfterSequence !== null ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button> : null}
          {!enabled ? <p>{mode === 'DIAGRAM' ? 'La generación de esquemas no está disponible en este momento.' : 'La generación de texto no está disponible en este momento.'}</p> : null}
        </> : <div className={styles.empty}>{submittedMessage?<><div className={styles.request}><ChatByline user identity={identity}/><p>{submittedMessage.text}</p></div><AsyncFeedback compact title="Preparando tu conversación…"/></>:<FoxyWelcome tool={tool} onExample={() => setText('Dame una idea para cerrar una clase en tres minutos.')} />}</div>}
          <form className={styles.composer} onSubmit={event => { event.preventDefault(); if (!validMessage || disabled) return;
            const submitted = text;
            if(mode!=='DIAGRAM')setSubmittedMessage({text:outbound,after:Math.max(0,...state.turns.map(t=>t.sequence))});
            if (draftMode) {
              const title = [...submitted.trim().replace(/\s+/gu, ' ')].slice(0, 120).join('');
              const chosen = context === 'GENERAL' ? { kind: 'GENERAL' as const } : { kind: 'CLASSROOM' as const, classroomId: context };
              setStarting({ title, text: submitted, message: outbound, purpose, mode, context, previousId: state.current?.id });
              void Promise.resolve(controller.create({ requestId: crypto.randomUUID(), title, context: chosen })).then(() => setStartReady(true)).catch(() => { setStarting(null); setSubmittedMessage(null); setStartReady(false); });
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
            <ChatAttachmentList items={attachments.items} error={attachments.error}
              disabled={attachments.busy || state.busy || !!state.activeTurn || !!state.pending || state.curriculum?.archived}
              onRemove={id => void attachments.remove(id)}/>
            {tool ? <div className={styles.activeMode}><span>{tool.label}</span><button type="button" aria-label="Quitar tipo de ayuda" onClick={() => setMode(null)}>Quitar</button></div> : null}
            <label>Tu mensaje <textarea rows={2} placeholder={tool?.placeholder ?? 'Escribile a Foxy…'} value={text} onChange={event => setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter' && !event.shiftKey && !event.nativeEvent.isComposing){event.preventDefault();if(validMessage&&!disabled)event.currentTarget.form?.requestSubmit();}}} required /></label>
            <div className={styles.composerActions}>
              <div className={styles.composerTools}>
                <ChatAttachmentButton disabled={attachments.busy || preparingContext || !!starting || state.busy ||
                  !!state.activeTurn || !!state.pending || (!draftMode && state.curriculum?.archived)} onUpload={attach}/>
                <button type="button" onClick={() => setView('tools')}><FoxmindIcon name="spark"/> Herramientas</button>
              </div>
              <button type="submit" className="p5-primary" disabled={disabled || !validMessage}>Enviar <FoxmindIcon name="arrow-right" /></button>
            </div>
            {mode === 'RUBRIC' ? <small className={styles.rubricHint}>Propuesta como texto editable. Podés revisarla y usar sus criterios en un borrador de actividad.</small> : null}
            <small className={styles.disclosure}>Foxy puede equivocarse. Revisá el contenido antes de usarlo.</small>
          </form>
        {state.error ? <div role="alert"><p>{state.error}</p>{state.pending ? <button type="button" disabled={state.busy}
          onClick={() => void controller.retry()}>Reintentar envío</button> : null}</div> : null}
      </div>
    </FoxyChatLayout>
    {renameOpen ? <Dialog title="Renombrar conversación" onClose={() => { if (!state.busy) setRenameOpen(false); }}><form className={styles.renameForm} onSubmit={event => { event.preventDefault(); if (!renameValid || state.busy) return; void Promise.resolve(controller.rename(renameTitle.trim())).then(saved => { if (saved) setRenameOpen(false); }); }}><label>Título de la conversación<input autoFocus value={renameTitle} aria-invalid={!renameValid} aria-describedby="foxy-rename-help" onChange={event => setRenameTitle(event.target.value)} /></label><p id="foxy-rename-help">Entre 1 y 120 caracteres.</p>{state.error ? <p role="alert">{state.error}</p> : null}<div><button type="button" disabled={state.busy} onClick={() => setRenameOpen(false)}>Cancelar</button><button type="submit" disabled={state.busy || !renameValid}>{state.busy ? 'Guardando…' : 'Guardar título'}</button></div></form></Dialog> : null}
  </section>;
}
function FoxyWelcome({ onExample, tool }: { onExample: () => void; tool?: { label: string; placeholder: string } }) {
  return <div className={styles.welcome}>
    <div className={styles.foxyMark}><i /><img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={68} height={76} /><span aria-hidden="true">✧</span></div>
    <small>TU ASISTENTE DOCENTE</small><h2>{tool?.label ?? '¿Qué preparamos hoy?'}</h2>
    <p>{tool?.placeholder ?? 'Hablá con Foxy sobre tu próxima clase o elegí una herramienta para crear un recurso.'}</p>
    {!tool ? <button className={styles.suggestion} type="button" onClick={onExample}><FoxmindIcon name="lightbulb"/>Pensar un cierre de clase <FoxmindIcon name="arrow-right" /></button> : null}
  </div>;
}

function FoxyContextPicker({ classrooms, current, onApply, onClose }: {
  classrooms: Classroom[]; current: string; onApply: (value: string) => void; onClose: () => void;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(current);
  const choices = [{ id: 'GENERAL', name: 'General' }, ...classrooms]
    .filter(room => room.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return <Dialog labeledClose title="Contexto del chat" onClose={onClose}>
    <div className={styles.contextPicker}>
      <p>Elegí con qué contexto querés conversar. Cambiarlo abre un chat nuevo.</p>
      <label>Buscar aula<input type="search" value={search} onChange={event => setSearch(event.target.value)}/></label>
      <fieldset>
        <legend>Contextos disponibles</legend>
        {choices.map(room => <label key={room.id}>
          <input type="radio" name="foxy-context" checked={selected === room.id} onChange={() => setSelected(room.id)}/>
          <span><strong>{room.name}</strong><small>{room.id === 'GENERAL' ? 'Ideas y consultas sin un aula específica' : 'Plan, Biblioteca y actividades del aula'}</small></span>
        </label>)}
        {!choices.length && <p>No encontramos un contexto con ese nombre.</p>}
      </fieldset>
      <div className={styles.composerActions}><button type="button" onClick={onClose}>Cancelar</button>
        <button type="button" className="p5-primary" disabled={selected === current} onClick={() => onApply(selected)}>Aplicar contexto</button></div>
    </div>
  </Dialog>;
}
