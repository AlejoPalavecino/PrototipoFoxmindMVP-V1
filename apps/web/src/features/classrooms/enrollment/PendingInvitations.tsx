import { useEffect, useRef, useState } from 'react';
import type { Invitation } from '../../../../../../src/core/contracts/classrooms.ts';
import { Dialog, Notice } from '../../../../../shared-ui/feedback.tsx';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';

export function PendingInvitations({
  items,
  onAccept,
  onDecline,
  requested,
}: {
  items: Invitation[];
  onAccept: (invitation: Invitation) => Promise<void>;
  onDecline: (invitation: Invitation) => Promise<void>;
  requested?: string;
}) {
  const requestedId = requested?.toLowerCase();
  const requestedItem = items.find(item => item.id.toLowerCase() === requestedId);
  const displayedRequest = useRef(requestedItem ? requestedId : undefined);
  const operation = useRef(false);
  const [selected, setSelected] = useState<Invitation | null>(requestedItem ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!requestedId) {
      displayedRequest.current = undefined;
      return;
    }
    if (busy || displayedRequest.current === requestedId) return;
    displayedRequest.current = requestedItem ? requestedId : undefined;
    setSelected(requestedItem ?? null);
    setError('');
  }, [busy, requestedId, requestedItem]);

  async function respond() {
    if (!selected || operation.current) return;
    operation.current = true;
    setBusy(true);
    setError('');
    try {
      await onAccept(selected);
      setSelected(null);
    } catch {
      setError('No pudimos confirmar tu respuesta. La invitación puede haber cambiado. Volvé a intentarlo.');
    } finally {
      operation.current = false;
      setBusy(false);
    }
  }

  return (
    <section className="invitations-panel" aria-label="Invitaciones pendientes">
      <header className="invitations-heading">
        <div className="invites-symbol">
          <svg
            className="fm3d-icon"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M3 5h18v14H3ZM3 6l9 7 9-7" />
          </svg>
        </div>
        <div>
          <h2>
            Te invitaron a aprender <span>{items.length}</span>
          </h2>
          <p>Un nuevo grupo te está esperando.</p>
        </div>
        <span className="invitation-pending">Pendiente de tu respuesta</span>
      </header>
      <div className="invitation-list">
        {items.map(invitation => (
          <article className="invitation-card" key={invitation.id}>
            <img src={learningCover(invitation.coverKey)} className="invitation-cover" alt="" />
            <div className="invitation-copy">
              <p className="invitation-subject">
                {invitation.subject}
                <span>{invitation.division ? ' · ' + invitation.division : ''}</span>
              </p>
              <h3>{invitation.name}</h3>
              <div className="invitation-person">
                <span className="avatar mint">
                  {invitation.teacher
                    .split(/\s+/)
                    .slice(0, 2)
                    .map(name => name[0])
                    .join('')}
                </span>
                <span>
                  <b>{invitation.teacher}</b> te invita
                </span>
              </div>
            </div>
            <div className="invitation-response">
              <span>
                <FoxmindIcon name="clock" />
                Hasta el {invitationDate(invitation.expiresAt)}
              </span>
              <button
                className="button primary"
                onClick={() => {
                  setSelected(invitation);
                  setError('');
                }}
              >
                <FoxmindIcon name="arrow-right" />
                Revisar invitación
              </button>
            </div>
          </article>
        ))}
      </div>
      {selected ? (
        <Dialog
          className="parity-collection-dialog invitation-dialog"
          title="Hay un lugar para vos"
          onClose={() => {
            if (!busy) setSelected(null);
          }}
        >
          <p className="collection-dialog-subtitle">Revisá el grupo antes de sumarte.</p>
          {InvitationPreview({ classroom: selected, expiresAt: selected.expiresAt })}
          {error ? <Notice error>{error}</Notice> : null}
          <footer className="p5-form-footer">
            <button type="button" disabled={busy} onClick={() => setSelected(null)}>
              Ahora no
            </button>
            <button className="primary" disabled={busy} onClick={() => void respond()}>
              <FoxmindIcon name="arrow-right" />
              {busy ? 'Confirmando…' : 'Aceptar y unirme'}
            </button>
          </footer>
        </Dialog>
      ) : null}
    </section>
  );
}

function invitationDate(value: string) {
  return new Date(value).toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
}
export function InvitationPreview({
  classroom,
  expiresAt,
}: {
  classroom: {
    name: string;
    subject?: string;
    division?: string;
    academicYear?: number;
    teacher: string;
    coverKey?: string;
  };
  expiresAt?: string;
}) {
  return (
    <>
      <div className="invite-detail-cover">
        <img src={learningCover(classroom.coverKey)} alt="" />
        {classroom.subject ? <span>{classroom.subject}</span> : null}
      </div>
      <div className="invite-detail-copy">
        <h3>{classroom.name}</h3>
        <p>
          {[classroom.division, classroom.academicYear ? `Ciclo ${classroom.academicYear}` : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        <div className="invitation-person">
          <span className="avatar mint">
            {classroom.teacher
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map(part => part[0])
              .join('')}
          </span>
          <span>
            Tu docente
            <br />
            <b>{classroom.teacher}</b>
          </span>
        </div>
        <ul className="invite-benefits">
          <li>
            <FoxmindIcon name="book" />
            Un plan para saber por dónde seguir
          </li>
          <li>
            <FoxmindIcon name="folder" />
            Materiales y actividades en un solo lugar
          </li>
          <li>
            <FoxmindIcon name="users" />
            Un espacio para aprender con tu grupo
          </li>
        </ul>
        {expiresAt ? (
          <p className="invite-expiry">
            <FoxmindIcon name="clock" />
            Podés aceptar hasta el {invitationDate(expiresAt)}.
          </p>
        ) : null}
      </div>
    </>
  );
}
