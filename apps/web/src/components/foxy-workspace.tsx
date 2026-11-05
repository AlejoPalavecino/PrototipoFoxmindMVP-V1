import { useEffect, useState } from 'react';
import type { FoxyPurpose } from '../../../../src/core/domain/index.ts';
import type { createFoxyChatController } from '../lib/foxy-chat-controller';
import type { createFoxyWorkspaceActions } from '../lib/foxy-workspace-actions';
import styles from './foxy-workspace.module.css';

import { FoxmindIcon } from '../../../shared-ui/index.ts';

type Controller = ReturnType<typeof createFoxyChatController>;
type State = ReturnType<Controller['getState']>;
type Classroom = { id: string; name: string };
type ToolMode = 'NOTE' | 'DIAGRAM' | 'ACTIVITY' | 'PLAN' | 'RUBRIC';
const tools: { mode: ToolMode; purpose: FoxyPurpose; label: string; hint: string; icon: 'book' | 'folder' | 'clipboard' | 'calendar' | 'file'; placeholder: string; request?: string }[] = [
  { mode: 'NOTE', purpose: 'STUDY_MATERIAL', label: 'Crear apuntes', hint: 'Explicaciones y ejemplos', icon: 'book', placeholder: '¿Qué tema querés explicar y a quiénes?', request: 'Prepará un apunte con explicaciones y ejemplos.' },
  { mode: 'DIAGRAM', purpose: 'CHAT', label: 'Crear esquema', hint: 'Ideas y relaciones', icon: 'folder', placeholder: '¿Qué conceptos querés relacionar en el esquema?' },
  { mode: 'ACTIVITY', purpose: 'ACTIVITY_IDEAS', label: 'Crear actividad', hint: 'Consignas para el aula', icon: 'clipboard', placeholder: '¿Qué querés que hagan tus estudiantes y con qué objetivo?', request: 'Proponé una actividad con consignas para estudiantes.' },
  { mode: 'PLAN', purpose: 'LESSON_PLAN', label: 'Crear planificación', hint: 'Una secuencia de clase', icon: 'calendar', placeholder: '¿Qué tema vas a trabajar y cuánto dura la clase?', request: 'Prepará una planificación con una secuencia de clase.' },
  { mode: 'RUBRIC', purpose: 'CHAT', label: 'Crear rúbrica', hint: 'Criterios de evaluación', icon: 'file', placeholder: '¿Qué producción querés evaluar y qué criterios te interesan?', request: 'Proponé una rúbrica como texto editable, con criterios, niveles de logro y pesos que sumen 100. No afirmes haberla asociado a una actividad.' },
];
export function FoxyWorkspace({ controller, state, classrooms, onOpenResource, onCreateDiagram, creationBlocked = false, onNavigate, onActivityHandoff }: { controller: ReturnType<typeof createFoxyWorkspaceActions>['chat']; state: State; classrooms: Classroom[]; onActivityHandoff?: (conversationId: string, turnId: string, mode: 'ACTIVITY' | 'RUBRIC') => void; onOpenResource?: (conversationId: string, turnId: string) => void; onCreateDiagram?: (prompt: string) => Promise<boolean> | boolean; creationBlocked?: boolean; onNavigate?: (href: string) => void }) {
  const [newChat, setNewChat] = useState(false), [showTools, setShowTools] = useState(false);
  const [context, setContext] = useState('GENERAL');
  const [starting, setStarting] = useState<{ title: string; text: string; purpose: FoxyPurpose; mode: ToolMode | null; message: string; context: string; previousId?: string } | null>(null);
  const [startReady, setStartReady] = useState(false);
  const draftMode = !state.current || newChat;
  const [mode, setMode] = useState<ToolMode | null>(null), [text, setText] = useState('');
  const tool = tools.find(item => item.mode === mode), purpose = tool?.purpose ?? 'CHAT';
  const outbound = tool?.request ? `${tool.request}\n\n${text}` : text;
  const validMessage = Boolean(text.trim()) && [...outbound].length <= 5000 && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text);
  const topicCount = state.selection?.topicIds.length ?? 0, sourceCount = state.selection?.sourceIds.length ?? 0;
  const enabled = mode === 'DIAGRAM' ? Boolean(onCreateDiagram && state.capabilities?.diagramGeneration.enabled) : Boolean(state.capabilities?.textGeneration.enabled), disabled = !!starting || state.busy || Boolean(state.activeTurn || state.pending) || !enabled
    || (!draftMode && state.current?.context.kind === 'CLASSROOM' && !state.curriculum?.canGenerate);
  useEffect(() => {
    if (!starting || !startReady || state.busy || creationBlocked) return;
    setStarting(null); setStartReady(false);
    const current = state.current;
    const matchingContext = current?.context.kind === 'GENERAL' ? starting.context === 'GENERAL'
      : current?.context.kind === 'CLASSROOM' && current.context.classroomId === starting.context;
    if (!current || current.id === starting.previousId || current.title !== starting.title || !matchingContext) return;
    setNewChat(false);
    if (starting.mode === 'DIAGRAM') {
      void Promise.resolve(onCreateDiagram?.(starting.text)).then(accepted => { if (accepted) { setText(value => value === starting.text ? '' : value); setMode(null); } });
      return;
    }
    void Promise.resolve(controller.send(starting.purpose, starting.message, state.selection ?? { topicIds: [], sourceIds: [] })).then(result => {
      if (result === 'accepted' || result === 'uncertain') { setText(value => value === starting.text ? '' : value); setMode(null); }
    });
  }, [starting, startReady, state.busy, state.current, state.selection, controller, onCreateDiagram, creationBlocked]);
  return <section className={styles.workspace} aria-label="Espacio Foxy AI">
    <nav className={styles.location} aria-label="Ubicación"><a href="/inicio" onClick={event => {
      if (!onNavigate || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault(); onNavigate('/inicio');
    }}>Inicio</a><FoxmindIcon name="chevron-right" /><span aria-current="page">Foxy AI</span></nav>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}><FoxmindIcon name="spark" /> ESTUDIO DOCENTE</span><h1>Foxy AI</h1></div>
      <button type="button" disabled={!!starting || state.busy} onClick={() => { setNewChat(true); setText(''); setContext('GENERAL'); setMode(null); }}><FoxmindIcon name="plus" />Nuevo chat</button>
    </header>
    <button className={styles.mobileTools} type="button" aria-expanded={showTools} onClick={() => setShowTools(!showTools)}><FoxmindIcon name="spark" />Herramientas de Foxy</button>
    <div className={styles.layout}>
      <div className={styles.chat}>
        <p className={styles.srOnly}>{draftMode || state.current?.context.kind === 'GENERAL' ? 'Contexto general' : state.curriculum?.classroomTitle ? `Contexto del aula: ${state.curriculum.classroomTitle}` : 'Contexto del aula no disponible'}</p>
        <div className={styles.chatHeading}><div><FoxmindIcon name="book" /><label><small>CONTEXTO DEL CHAT</small>
          <select aria-label="Contexto del chat" disabled={!!starting || state.busy} value={!draftMode && state.current?.context.kind === 'CLASSROOM' ? state.current.context.classroomId : draftMode ? context : 'GENERAL'}
            onChange={event => { setContext(event.target.value); setNewChat(true); }}>
            <option value="GENERAL">General</option>{classrooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select></label></div><span><FoxmindIcon name="lock" />Solo vos</span></div>
        {!draftMode && state.current ? <>
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
          <div className={styles.transcript} aria-live="polite">
            {!state.turns.length && !state.activeTurn ? <FoxyWelcome tool={tool} onExample={() => setText('Dame una idea para cerrar una clase en tres minutos.')} /> : <div className={styles.threadTitle}>{state.current.title}</div>}
            {state.turns.map(turn => <article className={styles.turn} key={turn.id}>
            <div className={styles.request}><h3>Tu solicitud</h3><p>{turn.message}</p></div>
            {turn.answer ? <div className={styles.answer}><p className={styles.reviewNote}>Respuesta de Foxy · Revisá el contenido antes de usarlo</p><h4>{turn.answer.title}</h4><p>{turn.answer.markdown}</p>
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}
              {turn.state === 'READY' && onOpenResource && <button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}>Editar recurso</button>}{turn.state === 'READY' && onActivityHandoff && <div><button type="button" onClick={() => onActivityHandoff(state.current!.id, turn.id, 'ACTIVITY')}>Preparar en Actividades</button><button type="button" onClick={() => onActivityHandoff(state.current!.id, turn.id, 'RUBRIC')}>Usar rúbrica en una actividad</button></div>}</div>
              : <p>{turn.state === 'FAILED' || turn.state === 'STALE' ? 'No se pudo completar esta respuesta.' : 'Pendiente o procesando…'}</p>}
            {turn.state === 'READY' ? <><button type="button" onClick={() => void controller.loadCitations(turn.id)}>Ver citas</button>
              {(state.citations?.[turn.id] ?? []).map(citation => {
                const expected = `/api/v1/foxy-ai/conversations/${state.current!.id}/turns/${turn.id}/citations/${citation.id}/file?mode=preview`;
                const safe = /^c[1-9][0-9]*$/u.test(citation.id) && citation.availability === 'AVAILABLE' && citation.href === expected;
                return <p key={citation.id}>{citation.sourceTitle ?? 'Fuente'} {citation.documentTitle ?? ''} {citation.page ? `· página ${citation.page}` : ''}
                  {safe ? <> <a href={expected} target="_blank" rel="noopener noreferrer">Ver documento</a></> : citation.availability === 'TEXT_ONLY' ? ' · Texto' : ' · No disponible'}</p>;
              })}</> : null}
          </article>)}</div>
          {state.activeTurn ? <p role="status">Solicitud en cola o procesando…</p> : null}
          {state.nextAfterSequence !== null ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button> : null}
          {!enabled ? <p>{mode === 'DIAGRAM' ? 'La generación de esquemas no está disponible en este momento.' : 'La generación de texto no está disponible en este momento.'}</p> : null}
        </> : <div className={styles.empty}><FoxyWelcome tool={tool} onExample={() => setText('Dame una idea para cerrar una clase en tres minutos.')} /></div>}
          <form className={styles.composer} onSubmit={event => { event.preventDefault(); if (!validMessage || disabled) return;
            const submitted = text;
            if (draftMode) {
              const title = [...submitted.trim()].slice(0, 120).join('');
              const chosen = context === 'GENERAL' ? { kind: 'GENERAL' as const } : { kind: 'CLASSROOM' as const, classroomId: context };
              setStarting({ title, text: submitted, message: outbound, purpose, mode, context, previousId: state.current?.id });
              void Promise.resolve(controller.create({ requestId: crypto.randomUUID(), title, context: chosen })).then(() => setStartReady(true)).catch(() => { setStarting(null); setStartReady(false); });
              return;
            }
            if (mode === 'DIAGRAM') {
              void Promise.resolve(onCreateDiagram?.(submitted)).then(accepted => { if (accepted) { setText(value => value === submitted ? '' : value); setMode(null); } });
              return;
            }
            void Promise.resolve(controller.send(purpose, outbound, state.selection ?? { topicIds: [], sourceIds: [] })).then(result => {
              if (result === 'accepted' || result === 'uncertain') { setText(current => current === submitted ? '' : current); setMode(null); }
            }); }}>
            {tool ? <div className={styles.activeMode}><span>{tool.label}</span><button type="button" aria-label="Quitar tipo de ayuda" onClick={() => setMode(null)}>×</button></div> : null}
            <label>Tu mensaje <textarea rows={2} placeholder={tool?.placeholder ?? 'Contale a Foxy qué querés preparar…'} value={text} onChange={event => setText(event.target.value)} required /></label>
            <button type="submit" className="p5-primary" disabled={disabled || !validMessage}><FoxmindIcon name="arrow-right" /><span className={styles.srOnly}>Enviar</span></button>
            {mode === 'RUBRIC' ? <small className={styles.rubricHint}>Propuesta como texto editable. Podés revisarla y usar sus criterios en un borrador de actividad.</small> : null}
            <small className={styles.disclosure}>Foxy puede equivocarse. Revisá el contenido antes de usarlo.</small>
          </form>
        {state.error ? <div role="alert"><p>{state.error}</p>{state.pending ? <button type="button" disabled={state.busy}
          onClick={() => void controller.retry()}>Reintentar envío</button> : null}</div> : null}
      </div>
      <div className={`${styles.rail}${showTools ? ` ${styles.railOpen}` : ''}`}>
        <aside className={styles.tools} aria-label="Herramientas de Foxy"><h2><FoxmindIcon name="spark" />Herramientas de Foxy</h2>
          <div role="group" aria-label="Tipo de ayuda">{tools.map(item => <button type="button" key={item.mode} aria-pressed={mode === item.mode}
            disabled={!!starting || state.busy || !!state.activeTurn || !!state.pending} onClick={() => setMode(item.mode)}>
            <span className={styles.toolIcon}><FoxmindIcon name={item.icon} /></span>
            <span><strong>{item.label}</strong><small>{item.hint}</small></span><span aria-hidden="true">›</span>
          </button>)}</div>
          <p>Las propuestas se revisan antes de publicarse. Imágenes y esquemas dependen de la disponibilidad del servicio.</p>
        </aside>
        <aside className={styles.history} aria-label="Conversaciones">
        <h2>Conversaciones</h2>
        <ul>{state.conversations.map(item => <li key={item.id}><button type="button" disabled={!!starting || state.busy} aria-current={state.current?.id === item.id ? 'true' : undefined}
          onClick={() => { setNewChat(false); setMode(null); void controller.select(item.id); }}>{item.title}</button></li>)}</ul>
        {state.nextConversationCursor ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMoreConversations()}>Más conversaciones</button> : null}
        </aside>
      </div>
    </div>
  </section>;
}
function FoxyWelcome({ onExample, tool }: { onExample: () => void; tool?: { label: string; placeholder: string } }) {
  return <div className={styles.welcome}>
    <div className={styles.foxyMark}><i /><img src="/brujula/foxy-bienvenida.webp" alt="" width={68} height={76} /><span aria-hidden="true">✧</span></div>
    <small>TU ASISTENTE DOCENTE</small><h2>{tool?.label ?? '¿Qué preparamos hoy?'}</h2>
    <p>{tool?.placeholder ?? 'Hablá con Foxy sobre tu próxima clase o elegí una herramienta para crear un recurso.'}</p>
    {!tool ? <button className={styles.suggestion} type="button" onClick={onExample}>Pensar un cierre de clase <FoxmindIcon name="arrow-right" /></button> : null}
  </div>;
}
