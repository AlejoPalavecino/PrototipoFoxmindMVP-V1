import { useEffect, useRef, useState } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { InvitationBatchReceipt, InvitationBatchRecipient } from '../../../../../../src/core/contracts/classrooms.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { continueInvitationBatch, parseInvitationEmails } from './invitation-batch.ts';
import s from '../styles/classroom-experience.module.css';

const labels: Record<InvitationBatchRecipient['status'], string> = {
  pending: 'Sin procesar', created: 'Invitación en cola', already_member: 'Ya integra el aula',
  already_invited: 'Ya tiene invitación', failed: 'No se pudo invitar',
};
export function InvitationBatchDialog({ api, classroomId, onClose, onChanged }: {
  api: ClassroomClient; classroomId: string; onClose: () => void; onChanged: () => Promise<void>;
}) {
  const [text, setText] = useState('');
  const [receipt, setReceipt] = useState<InvitationBatchReceipt | null>(null);
  const [busy, setBusy] = useState(true), [error, setError] = useState('');
  const [recoverId, setRecoverId] = useState<string | null>(null);
  const alive = useRef(true), stopped = useRef(false), locked = useRef(false);
  const reservation = useRef<{ requestId: string; emails: string[] } | null>(null);
  const storageKey = `foxmind:invitation-batch:${classroomId}`;
  const parsed = parseInvitationEmails(text);
  function remember(id: string | null) {
    try { if (id) sessionStorage.setItem(storageKey, id); else sessionStorage.removeItem(storageKey); } catch { /* Private browser storage may be unavailable. */ }
  }
  async function recover(requestId: string) {
    try {
      const value = await api.call<InvitationBatchReceipt>(`/${classroomId}/invitations/batch/${requestId}`);
      if (alive.current) { setReceipt(value); setRecoverId(null); }
      return value;
    } catch (cause) {
      if ((cause as {status?:number}).status !== 404) throw cause;
      if (alive.current) { remember(null); reservation.current = null; setRecoverId(null); setReceipt(null); setError(''); }
      return null;
    }
  }
  useEffect(() => {
    alive.current = true; stopped.current = false;
    let requestId: string | null = null;
    try { requestId = sessionStorage.getItem(storageKey); } catch { /* No saved batch. */ }
    if (requestId) {
      setRecoverId(requestId);
      void recover(requestId).catch(cause => {
        if (!alive.current) return;
        setError('No pudimos consultar el lote anterior. Revisá su estado antes de enviar otro.');
      }).finally(() => { if (alive.current) setBusy(false); });
    } else setBusy(false);
    return () => { alive.current = false; stopped.current = true; };
  }, [classroomId]);

  async function run(initial?: InvitationBatchReceipt) {
    if (locked.current) return;
    locked.current = true; stopped.current = false; setBusy(true); setError('');
    try {
      let batch = initial;
      if (!batch && recoverId) { batch = (await recover(recoverId)) ?? undefined; if (!batch) return; }
      if (!batch) {
        const payload = reservation.current ?? { requestId: crypto.randomUUID(), emails: parsed.emails };
        reservation.current = payload; remember(payload.requestId);
        batch = await api.call<InvitationBatchReceipt>(`/${classroomId}/invitations/batch`, 'POST', payload);
        if (alive.current) setReceipt(batch);
      }
      const result = await continueInvitationBatch(api, classroomId, batch, () => stopped.current || !alive.current,
        value => { if (alive.current) setReceipt(value); });
      if (alive.current && result.paused && !stopped.current) setError('Se interrumpió el envío. Conservamos el estado: podés continuar sin duplicar invitaciones.');
      await onChanged();
    } catch (cause) {
      if ((cause as { status?: number }).status === 400 && !receipt) { reservation.current = null; remember(null); }
      if (alive.current) setError((cause as Error).message || 'No pudimos procesar las invitaciones. Volvé a intentar.');
    } finally { locked.current = false; if (alive.current) setBusy(false); }
  }
  function newBatch(emails: string[] = []) {
    remember(null); reservation.current = null; setReceipt(null); setRecoverId(null); setError(''); setText(emails.join('\n'));
  }
  const pending = receipt?.recipients.filter(item => item.status === 'pending').length ?? 0;
  const failed = receipt?.recipients.filter(item => item.status === 'failed') ?? [];
  const processed = receipt ? receipt.recipients.length - pending : 0;
  return <Dialog title="Invitar alumnos" className={s.dialog} onClose={() => { stopped.current = true; onClose(); }}>
    <div className={s.invitationIntro}><span><FoxmindIcon name="users" /></span><div><h3>Sumá a tu grupo en un solo paso</h3>
      <p>Cada persona recibirá una invitación para aceptar con su propio correo. Podés invitar hasta 50 personas por vez.</p></div></div>
    {error ? <Notice error>{error}</Notice> : null}
    {!receipt && !recoverId ? <form onSubmit={event => { event.preventDefault(); void run(); }}>
      <label className={s.emailField}>Correos electrónicos<textarea autoFocus rows={6} value={text} disabled={busy || !!reservation.current}
        placeholder={'ana@ejemplo.com\njuan@ejemplo.com'} aria-describedby="invitation-email-help" onChange={event => setText(event.target.value)} /></label>
      <p id="invitation-email-help">Pegá una lista separada por comas, punto y coma o saltos de línea.</p>
      {parsed.emails.length ? <p role="status"><strong>{parsed.emails.length} {parsed.emails.length === 1 ? 'destinatario único' : 'destinatarios únicos'}</strong>{parsed.duplicates ? ` · ${parsed.duplicates} ${parsed.duplicates === 1 ? 'repetido se omitirá' : 'repetidos se omitirán'}` : ''}</p> : null}
      {parsed.invalid.length ? <Notice error>Revisá estos correos: {parsed.invalid.join(', ')}</Notice> : null}
      {parsed.emails.length > 50 ? <Notice error>El máximo es 50 destinatarios por lote. Dividí la lista para continuar.</Notice> : null}
      <footer className={s.actions}><button type="button" onClick={() => { stopped.current = true; onClose(); }}>Cerrar</button>
        <button className="primary" disabled={busy || !parsed.emails.length || !!parsed.invalid.length || parsed.emails.length > 50}>
          {busy ? 'Preparando invitaciones…' : reservation.current ? 'Reintentar preparación' : `Invitar${parsed.emails.length ? ` a ${parsed.emails.length} ${parsed.emails.length === 1 ? 'persona' : 'personas'}` : ''}`}</button></footer>
    </form> : receipt ? <>
      <div className={s.batchProgress} role="status"><strong>{busy ? 'Procesando invitaciones' : pending ? 'Envío pausado' : 'Lote procesado'}</strong>
        <span>{processed} de {receipt.recipients.length} procesadas</span><progress max={receipt.recipients.length} value={processed} aria-label="Invitaciones procesadas" /></div>
      <p>Las invitaciones en cola se enviarán por correo. La inscripción se confirma cuando cada estudiante acepta.</p>
      {receipt.recipients.some(item => item.status === 'already_invited') ? <p>Las invitaciones existentes se conservan. En Alumnos podés revisar su vigencia y reenviar las que hayan vencido.</p> : null}
      <ul className={s.recipients} aria-label="Resultado por destinatario">{receipt.recipients.map(item => <li key={item.email} data-status={item.status}>
        <span>{item.email}</span><strong>{labels[item.status]}</strong></li>)}</ul>
      <footer className={s.actions}>{busy ? <button onClick={() => { stopped.current = true; }}>Pausar después de esta invitación</button> : <>
        <button onClick={onClose}>Cerrar</button>
        {pending ? <button className="primary" onClick={() => void run(receipt)}>Continuar pendientes ({pending})</button>
          : failed.length ? <button className="primary" onClick={() => newBatch(failed.map(item => item.email))}>Reintentar solo fallidas ({failed.length})</button>
            : <button className="primary" onClick={() => newBatch()}>Invitar a más personas</button>}
      </>}</footer>
    </> : <div role="status"><p>{busy ? 'Recuperando el estado de tus invitaciones…' : 'Hay un lote pendiente de recuperar.'}</p>
      <button disabled={busy} onClick={() => void run()}>Recuperar y continuar</button></div>}
  </Dialog>;
}
