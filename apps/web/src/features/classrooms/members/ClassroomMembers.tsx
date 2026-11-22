import styles from '../styles/classroom-secondary.module.css';
import type { Dispatch, SetStateAction } from 'react';
import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { Detail, Invitation } from '../../../../../../src/core/contracts/classrooms.ts';
import { formatAccessCode } from '../../../../../../src/core/domain/classrooms/access-code.ts';
import { Notice } from '../../../../../shared-ui/feedback.tsx';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { ResourceNotice } from '../workspace/ResourceNotice.tsx';
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string } | null;
type Props = {
  part?:'code'|'invitations';
  api: ClassroomClient; id: string; room: Detail; busy: boolean; code: string | null;
  setCode: Dispatch<SetStateAction<string | null>>; setNotice: Dispatch<SetStateAction<string>>;
  setConfirm: Dispatch<SetStateAction<Confirmation>>; isCurrentRoom: () => boolean;
  invitations: Invitation[]; invitationAction: { busy: boolean; error: string };
  invitationResource: { status: string; error: string; reload: () => Promise<void> };
  action: (task: () => Promise<void>, section?: string) => Promise<void>;
};
export function ClassroomMembers({ api, id, room, busy, code, setCode, setNotice, setConfirm,part,
  isCurrentRoom, invitations, invitationAction, invitationResource, action }: Props) {
  return (
                  <aside className={`classroom-members-aside ${styles.members}`} aria-label="Acceso e invitaciones al aula">
                    {part!=='invitations' ? <section className={styles.code}>
                    <header><div><h3>Un código, una puerta abierta</h3>
                    <p>
                      Compartí este código con tu grupo.
                    </p></div></header>
                    {code ? (
                      <div className={styles.codeValue}>
                        <code aria-label={`Código de acceso: ${formatAccessCode(code).replace('-', ' ')}`}>{formatAccessCode(code)}</code>
                        <button
                          onClick={() =>
                            void action(async () => {
                              await navigator.clipboard.writeText(code);
                              if (isCurrentRoom()) setNotice('Código copiado.');
                            })
                          }
                        >
                          <span>Copiar código</span>
                        </button>
                      </div>
                    ) : (
                      <div><p>El código todavía no está disponible.</p><button disabled={busy || room.archived} onClick={() => setConfirm({
                        title: 'Generar un código nuevo', text: 'El código anterior dejará de funcionar. Las inscripciones actuales se conservan.',
                        run: async () => { const result = await api.call<{ code: string }>(`/${id}/code`, 'POST', {}); if (isCurrentRoom()) setCode(result.code); },
                      })}>Generar código</button></div>
                    )}
                    </section> : null}
                    {part!=='code' && (invitations.length>0 || invitationResource.status==='error') ? <section className={`classroom-members-invitations ${styles.invites}`}>
                    <h3>Invitaciones enviadas</h3>
                    <ResourceNotice resource={invitationResource} />
                    {invitationAction.error ? <Notice error>{invitationAction.error}</Notice> : null}
                    {invitationResource.status === 'ready' && invitations.length === 0 ? (
                      <p>No hay invitaciones enviadas.</p>
                    ) : (
                      <ul className="p5-invite-list" aria-label="Estado de invitaciones enviadas">
                        {invitations.map((invitation) => (
                          <li key={invitation.id}>
                            <span>
                              {invitation.recipient}
                              <small>
                                {invitation.acceptedAt
                                  ? 'Aceptada'
                                  : invitation.declinedAt
                                    ? 'Rechazada'
                                    : invitation.revokedAt
                                    ? 'Revocada'
                                    : new Date(invitation.expiresAt).getTime() <
                                        Date.now()
                                      ? 'Vencida'
                                      : 'Pendiente'}
                              </small>
                              <small>
                                {invitation.deliveryError ===
                                'P5_INVITATION_STALE'
                                  ? 'Correo no enviado: la invitación ya no está activa.'
                                  : invitation.deliveryError
                                    ? 'No se pudo enviar el correo. Podés reenviar la invitación.'
                                    : invitation.deliveryStatus === 'COMPLETED'
                                      ? 'Correo aceptado para envío.'
                                      : 'Correo en cola de envío.'}
                              </small>
                            </span>
                            {!invitation.acceptedAt && !invitation.revokedAt && !invitation.declinedAt ? (
                              <div className="p5-actions">
                                <button
                                  disabled={invitationAction.busy || room.archived}
                                  onClick={() =>
                                    void action(async () => {
                                      await api.call(
                                        `/${id}/invitations`,
                                        'POST',
                                        { email: invitation.recipient },
                                      );
                                      if (!isCurrentRoom()) return;
                                      setNotice('Invitación renovada.');
                                      await invitationResource.reload();
                                    }, 'invitations')
                                  }
                                >
                                  Reenviar
                                </button>
                                <button
                                  disabled={invitationAction.busy || room.archived}
                                  onClick={() =>
                                    setConfirm({
                                      title: 'Revocar invitación',
                                      scope: 'invitations',
                                      text: 'Esta invitación dejará de permitir el ingreso al aula.',
                                      run: async () => {
                                        await api.call(
                                          `/${id}/invitations/${invitation.id}/revoke`,
                                          'POST',
                                          {},
                                        );
                                        await invitationResource.reload();
                                      },
                                    })
                                  }
                                >
                                  Revocar
                                </button>
                              </div>
                ) : null}
                          </li>
                        ))}
                      </ul>
                    )}
                    </section> : null}
                  </aside>
  );
}
