import { useState } from 'react';
import type { FoxyPurpose } from '../../../../src/core/domain/index.ts';
import type { createFoxyChatController } from '../lib/foxy-chat-controller';
import type { createFoxyWorkspaceActions } from '../lib/foxy-workspace-actions';
import styles from './foxy-workspace.module.css';

type Controller = ReturnType<typeof createFoxyChatController>;
type State = ReturnType<Controller['getState']>;
type Classroom = { id: string; name: string };
const purposes: { value: FoxyPurpose; label: string }[] = [
  { value: 'CHAT', label: 'Conversar' }, { value: 'STUDY_MATERIAL', label: 'Material de estudio' },
  { value: 'REVIEW', label: 'Repaso' }, { value: 'SUMMARY', label: 'Resumen' },
  { value: 'ACTIVITY_IDEAS', label: 'Ideas para actividades' }, { value: 'LESSON_PLAN', label: 'Planificación' },
];
export function FoxyWorkspace({ controller, state, classrooms, onOpenResource }: { controller: ReturnType<typeof createFoxyWorkspaceActions>['chat']; state: State; classrooms: Classroom[]; onOpenResource?: (conversationId: string, turnId: string) => void }) {
  const [title, setTitle] = useState(''), [context, setContext] = useState('GENERAL');
  const [purpose, setPurpose] = useState<FoxyPurpose>('CHAT'), [text, setText] = useState('');
  const validMessage = Boolean(text.trim()) && [...text].length <= 5000 && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text);
  const topicCount = state.selection?.topicIds.length ?? 0, sourceCount = state.selection?.sourceIds.length ?? 0;
  const enabled = Boolean(state.capabilities?.textGeneration.enabled), disabled = state.busy || Boolean(state.activeTurn || state.pending) || !enabled
    || (state.current?.context.kind === 'CLASSROOM' && !state.curriculum?.canGenerate);
  return <section className={styles.workspace} aria-label="Espacio Foxy AI">
    <header className={styles.header}>
      <div><h1>Foxy AI</h1><p>Desarrollá ideas y prepará materiales para tus aulas.</p></div>
      <img src="/foxmind-3d/hero/foxy-warm-160.webp" alt="" width={100} height={100} />
    </header>
    <div className={styles.layout}>
      <aside className={styles.history} aria-label="Conversaciones">
        <h2>Conversaciones</h2>
        <ul>{state.conversations.map(item => <li key={item.id}><button type="button" aria-current={state.current?.id === item.id ? 'true' : undefined}
          onClick={() => void controller.select(item.id)}>{item.title}</button></li>)}</ul>
        {state.nextConversationCursor ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMoreConversations()}>Más conversaciones</button> : null}
        <h3>Nueva conversación</h3>
        <form onSubmit={event => { event.preventDefault(); if (!title.trim()) return;
          const chosen = context === 'GENERAL' ? { kind: 'GENERAL' as const } : { kind: 'CLASSROOM' as const, classroomId: context };
          void controller.create({ requestId: crypto.randomUUID(), title: title.trim(), context: chosen }); }}>
          <label>Título <input value={title} maxLength={120} onChange={event => setTitle(event.target.value)} required /></label>
          <label>Contexto <select value={context} onChange={event => setContext(event.target.value)}>
            <option value="GENERAL">General</option>{classrooms.map(room => <option key={room.id} value={room.id}>{room.name}</option>)}
          </select></label>
          <button type="submit" disabled={state.busy}>Crear conversación</button>
        </form>
      </aside>
      <div className={styles.chat}>
        {state.current ? <><div className={styles.chatHeading}><h2>{state.current.title}</h2><p>{state.current.context.kind === 'GENERAL' ? 'Contexto general' : state.curriculum?.classroomTitle
          ? `Contexto del aula: ${state.curriculum.classroomTitle}` : 'Contexto del aula no disponible'}</p></div>
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
            {!state.turns.length && !state.activeTurn ? <p>Escribí una consulta para empezar esta conversación.</p> : null}
            {state.turns.map(turn => <article className={styles.turn} key={turn.id}>
            <div className={styles.request}><h3>Tu solicitud</h3><p>{turn.message}</p></div>
            {turn.answer ? <div className={styles.answer}><p className={styles.reviewNote}>Respuesta de Foxy · Revisá el contenido antes de usarlo</p><h4>{turn.answer.title}</h4><p>{turn.answer.markdown}</p>
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}
              {turn.state === 'READY' && onOpenResource && <button type="button" onClick={() => onOpenResource(state.current!.id, turn.id)}>Editar recurso</button>}</div>
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
          {!enabled ? <p>La generación de texto no está disponible en este momento.</p> : null}
          <form className={styles.composer} onSubmit={event => { event.preventDefault(); if (!validMessage || disabled) return;
            const submitted = text;
            void Promise.resolve(controller.send(purpose, submitted, state.selection ?? { topicIds: [], sourceIds: [] })).then(result => {
              if (result === 'accepted' || result === 'uncertain') setText(current => current === submitted ? '' : current);
            }); }}>
            <label>Tipo de ayuda <select value={purpose} onChange={event => setPurpose(event.target.value as FoxyPurpose)}>
              {purposes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select></label>
            <label>Tu mensaje <textarea rows={3} value={text} onChange={event => setText(event.target.value)} required /></label>
            <button type="submit" className="p5-primary" disabled={disabled || !validMessage}>Enviar</button>
          </form>
        </> : <div className={styles.empty}><h2>Empezá una conversación</h2><p>Elegí una conversación existente o creá una y definí si querés usar el contexto de un aula.</p></div>}
        {state.error ? <div role="alert"><p>{state.error}</p>{state.pending ? <button type="button" disabled={state.busy}
          onClick={() => void controller.retry()}>Reintentar envío</button> : null}</div> : null}
      </div>
    </div>
  </section>;
}
