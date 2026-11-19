'use client';
import { useEffect, useRef, useState } from 'react';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import { SHARED_STUDY_STRATEGY_MAX_CHARS as maxLength } from '../../../../../../src/core/contracts/study-shared-strategy.ts';
import type { SharedStrategyClient } from '../api/study-http.ts';
import styles from './study-shared-strategy.module.css';

type Room = { id: string; name: string };
type Screen = 'editor' | 'review' | 'shared' | 'withdraw';

export function StudySharedStrategyDialog({client, folderId, room, onClose}: {
  client: SharedStrategyClient; folderId: string; room: Room; onClose: () => void;
}) {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<SharedStrategyClient['sharedStrategy']>>['strategy']>(null);
  const [screen,setScreen] = useState<Screen>('editor');
  const [text,setText] = useState('');
  const [selected,setSelected] = useState(false);
  const [loading,setLoading] = useState(true);
  const [saving,setSaving] = useState(false);
  const [failure,setFailure] = useState('');
  const [blocked,setBlocked] = useState(false);
  const [status,setStatus] = useState('');
  const [revision,setRevision] = useState(0);
  const request = useRef<AbortController|null>(null);
  const mutating = useRef(false);
  const content = useRef<HTMLDivElement|null>(null);
  const previousScreen = useRef<Screen>('editor');
  const length = [...text].length;
  const canReview = selected && !!text.trim() && length <= maxLength;
  const ready = !loading && !blocked;

  useEffect(() => {
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setFailure('');
    setBlocked(false);
    void client.sharedStrategy(folderId,controller.signal).then(({strategy}) => {
      if (controller.signal.aborted) return;
      setSnapshot(strategy?.classroomId === room.id ? strategy : null);
      setScreen(strategy?.classroomId === room.id ? 'shared' : 'editor');
    }).catch(() => {
      if (controller.signal.aborted) return;
      setSnapshot(null);
      setFailure('No pudimos consultar la estrategia. Si cambió el vínculo con tu aula, volvé a abrir la carpeta.');
      setBlocked(true);
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { request.current?.abort(); controller.abort(); };
  }, [client,folderId,room.id,revision]);

  useEffect(() => {
    if (!ready || screen===previousScreen.current) return;
    const selector = screen==='editor' ? 'textarea' : 'h3';
    content.current?.querySelector<HTMLElement>(selector)?.focus();
    previousScreen.current=screen;
  },[ready,screen]);

  async function change(operation: 'share'|'withdraw') {
    if (mutating.current || !ready || (operation === 'share' && !canReview) || (operation === 'withdraw' && !snapshot)) return;
    const controller = new AbortController();
    request.current = controller;
    mutating.current = true;
    setSaving(true);
    setFailure('');
    setStatus('');
    try {
      const response = operation === 'share'
        ? await client.shareStrategy(folderId,{classroomId:room.id,text},controller.signal)
        : await client.withdrawStrategy(folderId,snapshot!.id,controller.signal);
      if (controller.signal.aborted) return;
      if (operation === 'share'
        ? response.strategy?.classroomId !== room.id || response.strategy.text !== text
        : response.strategy !== null) throw new Error('Unexpected strategy response');
      setSnapshot(response.strategy);
      setScreen(response.strategy ? 'shared' : 'editor');
      if (operation === 'withdraw') {
        setText('');
        setSelected(false);
      }
      setStatus(operation === 'share'
        ? 'Tu docente ya puede consultar el texto que compartiste.'
        : 'Retiraste la estrategia. Tu docente ya no puede consultarla.');
    } catch (error) {
      if (controller.signal.aborted) return;
      const status = (error as {status?:number}).status;
      setSnapshot(null);
      setFailure(status === 409
        ? 'La estrategia cambió mientras revisabas. Actualizá el estado antes de realizar otro cambio.'
        : 'No pudimos confirmar el cambio. Actualizá el estado antes de volver a intentarlo.');
      setBlocked(true);
    } finally {
      mutating.current = false;
      if (!controller.signal.aborted) setSaving(false);
    }
  }

  return <Dialog title="Compartir una estrategia" onClose={() => { if (!mutating.current) onClose(); }}>
    <div className={styles.content} ref={content} aria-busy={loading || saving}>
      <p>Contale al docente qué te ayuda a aprender. Va a ver solamente el texto que confirmes.</p>
      {loading ? <p role="status">Consultando estrategia…</p> : null}
      {status ? <Notice>{status}</Notice> : null}
      {failure ? <Notice error>{failure} <button type="button" onClick={() => setRevision(value => value + 1)}>Actualizar estrategia</button></Notice> : null}
      {ready && screen === 'editor' ? <>
        <label className={styles.field}>Texto de la estrategia
          <textarea rows={5} value={text} onChange={event => setText(event.target.value)} placeholder="Me sirve ver un ejemplo y después resolver otro por mi cuenta." />
        </label>
        <small>{length} de {maxLength} caracteres</small>
        <fieldset>
          <legend>Compartir con</legend>
          <label className={styles.room}><input type="radio" name="strategy-room" checked={selected} onChange={() => setSelected(true)}/><span>Docente de {room.name}</span></label>
        </fieldset>
        <footer><button type="button" onClick={onClose}>Cerrar</button><button type="button" className="primary" disabled={!canReview} onClick={() => { setStatus(''); setScreen('review'); }}>Revisar texto</button></footer>
      </> : null}
      {ready && screen === 'review' ? <>
        <h3 tabIndex={-1}>Así lo va a ver el docente de {room.name}</h3>
        <blockquote>{text}</blockquote>
        <footer><button type="button" disabled={saving} onClick={() => setScreen('editor')}>Volver a editar</button>
          <button type="button" className="primary" disabled={saving || !canReview} onClick={() => void change('share')}>Confirmar y compartir</button></footer>
      </> : null}
      {ready && snapshot && (screen==='shared' || screen==='withdraw') ? <>
        <h3 tabIndex={-1}>Compartida con el docente de {room.name}</h3>
        <blockquote>{snapshot.text}</blockquote>
        {screen==='withdraw' ? <>
          <p>El docente dejará de ver este texto en tu ficha.</p>
          <footer><button type="button" disabled={saving} onClick={() => setScreen('shared')}>Cancelar</button>
            <button type="button" className="primary" disabled={saving} onClick={() => void change('withdraw')}>Confirmar retiro</button></footer>
        </> : <footer><button type="button" onClick={() => { setText(snapshot.text); setSelected(true); setStatus(''); setScreen('editor'); }}>Cambiar estrategia</button>
          <button type="button" onClick={() => { setStatus(''); setScreen('withdraw'); }}>Retirar estrategia</button></footer>}
      </> : null}
    </div>
  </Dialog>;
}
