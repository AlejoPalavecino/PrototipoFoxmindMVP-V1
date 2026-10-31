import { useState } from 'react';
import type { FoxyPurpose } from '../../../../src/core/domain/index.ts';
import type { createFoxyChatController } from '../lib/foxy-chat-controller';

type Controller = ReturnType<typeof createFoxyChatController>;
type State = ReturnType<Controller['getState']>;
type Classroom = { id: string; name: string };
const purposes: { value: FoxyPurpose; label: string }[] = [
  { value: 'CHAT', label: 'Conversar' }, { value: 'STUDY_MATERIAL', label: 'Material de estudio' },
  { value: 'REVIEW', label: 'Repaso' }, { value: 'SUMMARY', label: 'Resumen' },
  { value: 'ACTIVITY_IDEAS', label: 'Ideas para actividades' }, { value: 'LESSON_PLAN', label: 'Planificación' },
];
export function FoxyWorkspace({ controller, state, classrooms }: { controller: Controller; state: State; classrooms: Classroom[] }) {
  const [title, setTitle] = useState(''), [context, setContext] = useState('GENERAL');
  const [purpose, setPurpose] = useState<FoxyPurpose>('CHAT'), [text, setText] = useState('');
  const validMessage = Boolean(text.trim()) && [...text].length <= 5000 && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(text);
  const enabled = Boolean(state.capabilities?.textGeneration.enabled), disabled = state.busy || Boolean(state.activeTurn || state.pending) || !enabled;
  return <section aria-label="Espacio Foxy AI">
    <h1>Foxy AI</h1><p>Creá recursos y desarrollá ideas para tus aulas.</p>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 18rem), 1fr))', gap: '1.5rem' }}>
      <aside aria-label="Conversaciones">
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
      <div>
        {state.current ? <><h2>{state.current.title}</h2><p>{state.current.context.kind === 'GENERAL' ? 'Contexto general' : 'Contexto del aula'}</p>
          <p>Las respuestas pueden requerir revisión docente antes de usarlas.</p>
          <div aria-live="polite">{state.turns.map(turn => <article key={turn.id}>
            <h3>Tu solicitud</h3><p style={{ whiteSpace: 'pre-wrap' }}>{turn.message}</p>
            {turn.answer ? <><h4>{turn.answer.title}</h4><p style={{ whiteSpace: 'pre-wrap' }}>{turn.answer.markdown}</p>
              {turn.answer.warnings?.map((warning, i) => <p key={i}>{warning}</p>)}
              {turn.answer.missingInformation?.map((missing, i) => <p key={i}>{missing}</p>)}</>
              : <p>{turn.state === 'FAILED' || turn.state === 'STALE' ? 'No se pudo completar esta respuesta.' : 'Pendiente o procesando…'}</p>}
          </article>)}</div>
          {state.activeTurn ? <p role="status">Solicitud en cola o procesando…</p> : null}
          {state.nextAfterSequence !== null ? <button type="button" disabled={state.busy} onClick={() => void controller.loadMore()}>Más mensajes</button> : null}
          {!enabled ? <p>La generación de texto no está disponible en este momento.</p> : null}
          <form onSubmit={event => { event.preventDefault(); if (!validMessage || disabled) return;
            const submitted = text;
            void controller.send(purpose, submitted, { topicIds: [], sourceIds: [] }).then(result => {
              if (result === 'accepted' || result === 'uncertain') setText(current => current === submitted ? '' : current);
            }); }}>
            <label>Tipo de ayuda <select value={purpose} onChange={event => setPurpose(event.target.value as FoxyPurpose)}>
              {purposes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select></label>
            <label>Tu mensaje <textarea value={text} onChange={event => setText(event.target.value)} required /></label>
            <button type="submit" disabled={disabled || !validMessage}>Enviar</button>
          </form>
        </> : <p>Elegí o creá una conversación para empezar.</p>}
        {state.error ? <div role="alert"><p>{state.error}</p>{state.pending ? <button type="button" disabled={state.busy}
          onClick={() => void controller.retry()}>Reintentar envío</button> : null}</div> : null}
      </div>
    </div>
  </section>;
}
