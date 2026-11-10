import { AsyncFeedback } from '../../../shared-ui/AsyncFeedback';
import { FoxyToolPicker } from '../../../shared-ui/FoxyToolPicker';
import { useChatFollow } from '../../../shared-ui/use-chat-follow';
import { useEffect, useRef, useState } from 'react';
import type { FoxyPurpose } from '../../../../src/core/domain/index.ts';
import type { createFoxyChatController } from '../lib/foxy-chat-controller';
import type { createFoxyWorkspaceActions } from '../lib/foxy-workspace-actions';
import styles from './foxy-workspace.module.css';
import type { FoxyCreation } from '../lib/foxy-client';
import { FoxyCollectionPanel, FoxyConversationPanel, type FoxyCatalogState, type FoxyConversationQuery, type FoxyCreationQuery } from './foxy-collection-panel';
import { FoxyMarkdown } from './foxy-markdown';

import { FoxmindIcon,type IconKey } from '../../../shared-ui/index.ts';
import { Dialog } from '../../../shared-ui/feedback';

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
export function FoxyWorkspace({ controller, state, classrooms, contextClassrooms = classrooms, onOpenResource, onCreateDiagram, creationBlocked = false, onNavigate, onActivityHandoff, catalog, onConversationQuery, onCreationQuery, onMoreConversations, onMoreCreations, onOpenCreation, onRefreshCatalog }: { catalog?: FoxyCatalogState; onConversationQuery?: (query: FoxyConversationQuery) => void; onCreationQuery?: (query: FoxyCreationQuery) => void; onMoreConversations?: () => void; onMoreCreations?: () => void; onOpenCreation?: (item: FoxyCreation) => void; onRefreshCatalog?: () => void; controller: ReturnType<typeof createFoxyWorkspaceActions>['chat']; state: State; classrooms: Classroom[]; contextClassrooms?: Classroom[]; onActivityHandoff?: (conversationId: string, turnId: string, mode: 'ACTIVITY' | 'RUBRIC') => void; onOpenResource?: (conversationId: string, turnId: string) => void; onCreateDiagram?: (prompt: string) => Promise<boolean> | boolean; creationBlocked?: boolean; onNavigate?: (href: string) => void }) {
  const [submittedMessage,setSubmittedMessage]=useState<{text:string;after:number}|null>(null);
  const chatFollow=useChatFollow(state.current?.id,JSON.stringify([state.turns.map(t=>[t.id,t.state]),state.pending?.requestId,state.activeTurn?.state,submittedMessage?.text]));
  const pendingText=state.pending?.text??submittedMessage?.text;
  const pendingVisible=!!pendingText&&!state.turns.some(t=>t.sequence>(submittedMessage?.after??Infinity)&&t.message===pendingText);
  useEffect(()=>{if(submittedMessage&&state.turns.some(t=>t.sequence>submittedMessage.after&&t.message===submittedMessage.text))setSubmittedMessage(null);},[state.turns,submittedMessage]);
  const [newChat, setNewChat] = useState(false), [showTools, setShowTools] = useState(false);
  const [showHistory,setShowHistory]=useState(false), [showCreations, setShowCreations] = useState(false);
  const [panel, setPanel] = useState<'tools' | 'creations'>('tools');
  const [renameOpen, setRenameOpen] = useState(false), [renameTitle, setRenameTitle] = useState('');
  const renameValid = Boolean(renameTitle.trim()) && [...renameTitle.trim()].length <= 120 && !/[\u0000-\u001f\u007f-\u009f]/u.test(renameTitle);
  const [context, setContext] = useState('GENERAL');
  const [preparingContext, setPreparingContext] = useState(false);
  const requestedContext = useRef<{ id: string; previousId?: string } | null>(null);
  const [starting, setStarting] = useState<{ title: string; text: string; purpose: FoxyPurpose; mode: ToolMode | null; message: string; context: string; previousId?: string } | null>(null);
  const [startReady, setStartReady] = useState(false);
  const draftMode = !state.current || newChat;
  const [mode, setMode] = useState<ToolMode | null>(null), [text, setText] = useState('');
  const tool = tools.find(item => item.mode === mode), purpose = tool?.purpose ?? 'CHAT';
  const outbound = tool?.request ? `${tool.request}\n\n${text}` : text;
  const validMessage = Boolean(text.trim()) && [...outbound].length <= 5000 && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text);
  const topicCount = state.selection?.topicIds.length ?? 0, sourceCount = state.selection?.sourceIds.length ?? 0;
  const enabled = mode === 'DIAGRAM' ? Boolean(onCreateDiagram && state.capabilities?.diagramGeneration.enabled) : Boolean(state.capabilities?.textGeneration.enabled), disabled = preparingContext || !!starting || state.busy || Boolean(state.activeTurn || state.pending) || !enabled
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
  const openConversation = (id: string) => { setSubmittedMessage(null); setShowHistory(false); setNewChat(false); setMode(null); void controller.select(id); };
  const toolContents = <FoxyToolPicker items={tools.map(t=>({...t,value:t.mode}))} value={mode}
    disabled={!!starting||state.busy||!!state.activeTurn||!!state.pending} onChange={value=>{setMode(value);setShowTools(false);}}/>;
  const creationContents = <FoxyCollectionPanel page={catalog?.creations ?? { items: [], next: null, loading: false, error: null }} query={catalog?.creationQuery ?? { q: '', context: 'ALL', type: 'ALL', status: 'ALL' }} classrooms={contextClassrooms} onNavigate={onNavigate} onQuery={onCreationQuery} onMore={onMoreCreations} onRefresh={onRefreshCatalog} disabled={state.busy || creationBlocked || !onOpenCreation} onOpen={item => { if (!item.turnId) setShowCreations(false); onOpenCreation?.(item); }} />;
  const conversationContents = catalog ? <FoxyConversationPanel page={catalog.conversations} query={catalog.conversationQuery} classrooms={contextClassrooms} currentId={state.current?.id} disabled={!!starting || state.busy} onQuery={onConversationQuery} onSelect={openConversation} onMore={onMoreConversations} onRefresh={onRefreshCatalog} /> : <><ul>{state.conversations.map(item => <li key={item.id}><button type="button" disabled={!!starting || state.busy} aria-current={state.current?.id === item.id ? 'true' : undefined} onClick={() => openConversation(item.id)}>{item.title}</button></li>)}</ul>{state.nextConversationCursor ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMoreConversations()}>Más conversaciones</button> : null}</>;
  return <section className={styles.workspace} aria-label="Espacio Foxy AI">
    <nav className={styles.location} aria-label="Ubicación"><a href="/inicio" onClick={event => {
      if (!onNavigate || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); onNavigate('/inicio');
    }}>Inicio</a><FoxmindIcon name="chevron-right" /><span aria-current="page">Foxy AI</span></nav>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}><FoxmindIcon name="spark" /> ESTUDIO DOCENTE</span><h1>Foxy AI</h1></div>
      <button type="button" disabled={preparingContext || !!starting || state.busy} onClick={() => { requestedContext.current = null; setNewChat(true); setSubmittedMessage(null); setText(''); setContext('GENERAL'); setMode(null); }}><FoxmindIcon name="plus" />Nuevo chat</button>
    </header>
    <div className={styles.mobileActions}><button className={styles.mobileTools} type="button" onClick={() => setShowTools(true)}><FoxmindIcon name="spark" />Herramientas</button><button className={styles.mobileTools} type="button" onClick={() => setShowCreations(true)}>Creaciones</button><button className={styles.mobileTools} type="button" onClick={() => setShowHistory(true)}><FoxmindIcon name="clock" />Conversaciones</button></div>
    <div className={styles.layout}>
      <div className={styles.chat}>
        <p className={styles.srOnly}>{draftMode || state.current?.context.kind === 'GENERAL' ? 'Contexto general' : state.curriculum?.classroomTitle ? `Contexto del aula: ${state.curriculum.classroomTitle}` : 'Contexto del aula no disponible'}</p>
        <div className={styles.chatHeading}><div><FoxmindIcon name="globe" /><label><small>CONTEXTO</small>
          <select aria-label="Contexto del chat" aria-describedby="foxy-context-help" disabled={preparingContext || !!starting || state.busy} value={!draftMode && state.current?.context.kind === 'CLASSROOM' ? state.current.context.classroomId : draftMode ? context : 'GENERAL'}
            onChange={event => {
              const chosen = event.target.value; setSubmittedMessage(null); setContext(chosen); setNewChat(true); requestedContext.current = null;
              if (chosen !== 'GENERAL') {
                requestedContext.current = { id: chosen, previousId: state.current?.id }; setPreparingContext(true);
                void Promise.resolve(controller.prepareContext(chosen)).then(ready => { if (ready) setNewChat(false); }).finally(() => setPreparingContext(false));
              }
            }}>
            <option value="GENERAL">General</option>{classrooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select></label></div><span><FoxmindIcon name="lock" />Chat privado</span></div>
        <p id="foxy-context-help" className={styles.contextHelp}>Cambiar el contexto inicia otra conversación. Podés elegir temas y fuentes antes de enviar.</p>
        {preparingContext ? <p role="status" className={styles.contextHelp}>Preparando contexto del aula…</p> : null}
        {!draftMode && state.current ? <>
          <div className={styles.conversationTitle}><h2>{state.current.title}</h2><button type="button" disabled={state.busy || !!starting} onClick={() => { setRenameTitle(state.current!.title); setRenameOpen(true); }}>Renombrar</button></div>
          {state.current.context.kind === 'CLASSROOM' && state.curriculum ? <details className={styles.context} key={state.current.id}>
            <summary>Contexto y fuentes · {topicCount} {topicCount === 1 ? 'tema' : 'temas'} · {sourceCount} {sourceCount === 1 ? 'fuente' : 'fuentes'}</summary>
            <section aria-label="Contexto del aula">
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
          </details> : null}
          <p className={styles.srOnly} role="status">{!state.activeTurn&&!state.pending&&state.turns.at(-1)?.state==='READY'?'Respuesta de Foxy lista para leer.':''}</p><div className={styles.transcript} ref={chatFollow.ref} onScroll={chatFollow.onScroll} aria-label="Mensajes con Foxy">
            {!state.turns.length && !state.activeTurn && !pendingVisible ? <FoxyWelcome tool={tool} onExample={() => setText('Dame una idea para cerrar una clase en tres minutos.')} /> : null}
            {state.turns.map(turn => <article className={styles.turn} key={turn.id}>
            <div className={styles.request}><h3>Vos</h3><p>{turn.message}</p></div>
            {turn.answer ? <div className={`${styles.answer}${turn.purpose!=='CHAT' ? ` ${styles.resourceCard}` : ''}`}><p className={styles.reviewNote}><img src="/brujula/foxy-logotipo-redondo.webp" alt="" width={28} height={28}/>Foxy</p>{turn.purpose!=='CHAT' ? <h4>{turn.answer.title}</h4> : null}<FoxyMarkdown markdown={turn.answer.markdown} />
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}
              {turn.state === 'READY' && turn.purpose!=='CHAT' && onOpenResource && <button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}>Abrir recurso</button>}{turn.state === 'READY' && onActivityHandoff && (turn.purpose==='ACTIVITY_IDEAS'||turn.purpose==='RUBRIC') ? <button type="button" onClick={() => onActivityHandoff(state.current!.id,turn.id,turn.purpose==='RUBRIC'?'RUBRIC':'ACTIVITY')}>{turn.purpose==='RUBRIC'?'Usar rúbrica en una actividad':'Preparar en Actividades'}</button> : null}</div>
              : turn.state === 'FAILED' || turn.state === 'STALE' ? <p role="status">No se pudo completar esta respuesta. Podés revisar tu mensaje y hacer una nueva solicitud.</p> : <AsyncFeedback compact title={turn.state==='QUEUED'?'Tu solicitud está en cola':'Foxy está preparando tu respuesta'}/>}
            {turn.state === 'READY' ? <><button type="button" onClick={() => void controller.loadCitations(turn.id)}>Ver citas</button>
              {(state.citations?.[turn.id] ?? []).map(citation => {
                const expected = `/api/v1/foxy-ai/conversations/${state.current!.id}/turns/${turn.id}/citations/${citation.id}/file?mode=preview`;
                const safe = /^c[1-9][0-9]*$/u.test(citation.id) && citation.availability === 'AVAILABLE' && citation.href === expected;
                return <p key={citation.id}>{citation.sourceTitle ?? 'Fuente'} {citation.documentTitle ?? ''} {citation.page ? `· página ${citation.page}` : ''}
                  {safe ? <> <a href={expected} target="_blank" rel="noopener noreferrer">Ver documento</a></> : citation.availability === 'TEXT_ONLY' ? ' · Texto' : ' · No disponible'}</p>;
              })}</> : null}
          </article>)}
          {pendingVisible&&<article className={styles.turn}><div className={styles.request}><h3>Vos</h3><p>{pendingText}</p></div>{state.error?<p role="status">Envío sin confirmar. Tu mensaje se conserva; usá Reintentar envío.</p>:<AsyncFeedback compact title={state.pending?'Enviando tu mensaje':state.activeTurn?.state==='QUEUED'?'Tu solicitud está en cola':'Foxy está preparando tu respuesta'}/>}</article>}
          {state.activeTurn&&!state.turns.some(t=>t.id===state.activeTurn?.id)&&(!pendingVisible||!!state.error)&&<AsyncFeedback compact title={state.activeTurn.state==='QUEUED'?'Tu solicitud está en cola':'Foxy está preparando tu respuesta'}/>}
          {state.busy&&!pendingVisible&&!state.activeTurn&&<AsyncFeedback compact title="Cargando conversación…"/>}</div>
          {chatFollow.unread&&<button type="button" onClick={chatFollow.jump}>Ver mensajes nuevos ↓</button>}
          {state.nextAfterSequence !== null ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button> : null}
          {!enabled ? <p>{mode === 'DIAGRAM' ? 'La generación de esquemas no está disponible en este momento.' : 'La generación de texto no está disponible en este momento.'}</p> : null}
        </> : <div className={styles.empty}>{submittedMessage?<><div className={styles.request}><h3>Vos</h3><p>{submittedMessage.text}</p></div><AsyncFeedback compact title="Preparando tu conversación…"/></>:<FoxyWelcome tool={tool} onExample={() => setText('Dame una idea para cerrar una clase en tres minutos.')} />}</div>}
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
            {tool ? <div className={styles.activeMode}><span>{tool.label}</span><button type="button" aria-label="Quitar tipo de ayuda" onClick={() => setMode(null)}>×</button></div> : null}
            <label>Tu mensaje <textarea rows={2} placeholder={tool?.placeholder ?? 'Escribile a Foxy…'} value={text} onChange={event => setText(event.target.value)} onKeyDown={event=>{if(event.key==='Enter' && !event.shiftKey && !event.nativeEvent.isComposing){event.preventDefault();if(validMessage&&!disabled)event.currentTarget.form?.requestSubmit();}}} required /></label>
            <button type="submit" className="p5-primary" disabled={disabled || !validMessage}><FoxmindIcon name="arrow-right" /><span className={styles.srOnly}>Enviar</span></button>
            {mode === 'RUBRIC' ? <small className={styles.rubricHint}>Propuesta como texto editable. Podés revisarla y usar sus criterios en un borrador de actividad.</small> : null}
            <small className={styles.disclosure}>Foxy puede equivocarse. Revisá el contenido antes de usarlo.</small>
          </form>
        {state.error ? <div role="alert"><p>{state.error}</p>{state.pending ? <button type="button" disabled={state.busy}
          onClick={() => void controller.retry()}>Reintentar envío</button> : null}</div> : null}
      </div>
      <div className={styles.rail}>
        <aside className={styles.tools} aria-label="Herramientas y creaciones de Foxy">
          <div className={styles.segmented} role="group" aria-label="Panel de Foxy"><button type="button" aria-pressed={panel === 'tools'} onClick={() => setPanel('tools')}>Herramientas</button><button type="button" aria-pressed={panel === 'creations'} onClick={() => setPanel('creations')}>Creaciones</button></div>
          {panel === 'tools' ? toolContents : creationContents}
        </aside>
        <aside className={styles.history} aria-label="Conversaciones"><h2>Conversaciones</h2>{conversationContents}</aside>
      </div>
    </div>
    {showTools ? <Dialog title="Herramientas" onClose={() => setShowTools(false)}><div className={styles.tools}>{toolContents}</div></Dialog> : null}
    {showCreations ? <Dialog title="Creaciones" onClose={() => setShowCreations(false)}>{creationContents}</Dialog> : null}
    {showHistory ? <Dialog title="Conversaciones" className="brujula-conversation-history" onClose={() => setShowHistory(false)}>{conversationContents}</Dialog> : null}
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
