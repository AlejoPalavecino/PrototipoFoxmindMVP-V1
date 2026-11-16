import { useEffect, useRef, useState } from 'react';
import type { ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import type { Invitation } from '../../../../src/core/contracts/classrooms.ts';
import type { InboxNotificationTarget } from '../../../../src/core/contracts/notifications.ts';
import type { PrivateEvent } from '../../../../src/core/domain/agenda/index.ts';
import { Dialog, Notice } from '../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../shared-ui/FoxmindIcon';
import { agendaSurface, EventDetails, EventForm, eventOccurrence, type AgendaClient } from '../features/agenda/index.ts';
import { InvitationPreview } from '../features/classrooms/index.ts';
import styles from './notification-review.module.css';

export type ReviewTarget = Extract<InboxNotificationTarget, { kind: 'event' | 'invitation' }>;
type Props = { target: ReviewTarget; api: ClassroomClient; agenda: AgendaClient;
  onClose: (refresh?: boolean) => void; onChanged: (message: string) => void };
type Resource =
  | { kind: 'loading' }
  | { kind: 'error'; retryable: boolean }
  | { kind: 'event'; event: PrivateEvent; date: string }
  | { kind: 'invitation'; invitation: Invitation };

function isUnavailable(error: unknown) {
  const failure = error as { status?: number; code?: string } | null;
  return failure?.status === 403 || failure?.status === 404
    || failure?.code === 'FORBIDDEN' || failure?.code === 'ENROLLMENT_UNAVAILABLE';
}

export function NotificationReview({ target, api, agenda, onClose, onChanged }: Props) {
  const [resource, setResource] = useState<Resource>({ kind: 'loading' });
  const [retry, setRetry] = useState(0);
  const [editScope, setEditScope] = useState<'single' | 'series' | null>(null);
  const [returnedFromEdit, setReturnedFromEdit] = useState(false);
  const acceptance = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [acceptError, setAcceptError] = useState('');

  useEffect(() => {
    const request = new AbortController();
    setResource({ kind: 'loading' });
    setAcceptError('');
    void (async () => {
      try {
        if (target.kind === 'event') {
          const event = await agenda.get(target.eventId);
          if (request.signal.aborted) return;
          setResource(event.id === target.eventId && eventOccurrence(event, target.date)
            ? { kind: 'event', event, date: target.date } : { kind: 'error', retryable: false });
        } else {
          const pending = await api.call<Invitation[]>('/invitations', 'GET', undefined, request.signal);
          if (request.signal.aborted) return;
          const invitation = pending.find(item => item.id === target.invitationId);
          setResource(invitation ? { kind: 'invitation', invitation } : { kind: 'error', retryable: false });
        }
      } catch (failure) {
        if (!request.signal.aborted) setResource({ kind: 'error', retryable: !isUnavailable(failure) });
      }
    })();
    return () => request.abort();
  }, [target, api, agenda, retry]);

  useEffect(() => () => acceptance.current?.abort(), []);

  async function accept(invitation: Invitation) {
    if (acceptance.current) return;
    const request = new AbortController();
    acceptance.current = request;
    setBusy(true);
    setAcceptError('');
    try {
      await api.call(`/invitations/${encodeURIComponent(invitation.id)}/accept`, 'POST', {}, request.signal);
      if (request.signal.aborted) return;
      onChanged(`Ya sos parte de ${invitation.name}. La encontrás en tus aulas.`);
    } catch (failure) {
      if (request.signal.aborted) return;
      if (isUnavailable(failure)) setResource({ kind: 'error', retryable: false });
      else setAcceptError('No pudimos confirmar tu respuesta. Volvé a intentarlo.');
    } finally {
      if (acceptance.current === request) acceptance.current = null;
      if (!request.signal.aborted) setBusy(false);
    }
  }

  if (resource.kind === 'event') {
    const { event, date } = resource;
    const schedule = eventOccurrence(event, date)?.schedule;
    const zone = schedule?.kind === 'TIMED' ? schedule.timeZone
      : Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    return <div id="notification-agenda-dialog" className={`${agendaSurface.scope} ${styles.agendaHost}`}>
      {editScope ? <EventForm api={agenda} event={event} occurrenceDate={date} initialScope={editScope} day={date} zone={zone}
        onClose={() => { setReturnedFromEdit(true); setEditScope(null); }}
        onSaved={outcome => onChanged(outcome.kind === 'removed' ? 'Evento eliminado.' : 'Cambios guardados.')} />
        : <EventDetails api={agenda} event={event} occurrenceDate={date} onBack={() => onClose()}
          focusEdit={returnedFromEdit} onEdit={setEditScope} onRemoved={() => onChanged('Evento eliminado.')} />}
    </div>;
  }
  if (resource.kind === 'invitation') {
    const { invitation } = resource;
    const close = () => { if (!acceptance.current) onClose(); };
    return <Dialog captureEscape className="parity-collection-dialog invitation-dialog" title="Hay un lugar para vos" onClose={close}>
      <p className="collection-dialog-subtitle">Revisá el grupo antes de sumarte.</p>
      <InvitationPreview classroom={invitation} expiresAt={invitation.expiresAt} />
      {acceptError ? <Notice error>{acceptError}</Notice> : null}
      <footer className="p5-form-footer">
        <button type="button" disabled={busy} onClick={close}>Ahora no</button>
        <button type="button" className="primary" disabled={busy} onClick={() => void accept(invitation)}>
          <FoxmindIcon name="arrow-right"/>{busy ? 'Confirmando…' : 'Aceptar y unirme'}
        </button>
      </footer>
    </Dialog>;
  }
  const unavailable = resource.kind === 'error' && !resource.retryable;
  const close = () => onClose(unavailable);
  return <Dialog captureEscape title={unavailable ? 'Este contenido ya no está disponible'
    : target.kind === 'event' ? 'Tu evento' : 'Revisar invitación'} className={styles.statusDialog} onClose={close}>
    {resource.kind === 'loading' ? <Notice>Abriendo {target.kind === 'event' ? 'el evento' : 'la invitación'}…</Notice>
      : <Notice error>{unavailable ? 'Puede haberse retirado o puede que ya no tengas acceso. Podés seguir revisando tus otras notificaciones.'
        : 'No pudimos abrir este contenido. Podés volver a intentarlo.'}</Notice>}
    <footer className="p5-form-footer">
      <button type="button" onClick={close}>Volver a notificaciones</button>
      {resource.kind === 'error' && resource.retryable ? <button type="button" className="primary" onClick={() => setRetry(value => value + 1)}>Reintentar</button> : null}
    </footer>
  </Dialog>;
}
