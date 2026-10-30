import type { Dispatch, SetStateAction, MutableRefObject } from 'react';
import type { ClassroomClient, Detail, Invitation } from './api.ts';
import { Notice } from './components.tsx';
import { EntryIcon } from '../shared-ui/EntryIcon';
import { ResourceNotice } from './ResourceNotice.tsx';
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string } | null;
type Props = {
  api: ClassroomClient; id: string; room: Detail; busy: boolean; code: string | null;
  setCode: Dispatch<SetStateAction<string | null>>; setNotice: Dispatch<SetStateAction<string>>;
  setConfirm: Dispatch<SetStateAction<Confirmation>>; isCurrentRoom: () => boolean;
  invitations: Invitation[]; invitationAction: { busy: boolean; error: string };
  invitationResource: { status: string; error: string; reload: () => Promise<void> };
  action: (task: () => Promise<void>, section?: string) => Promise<void>;
};
export function ClassroomMembers({ api, id, room, busy, code, setCode, setNotice, setConfirm,
  isCurrentRoom, invitations, invitationAction, invitationResource, action }: Props) {
  return (
                  <aside className="classroom-members-aside">
                    <section className="classroom-members-code">
                    <hr />
                    <h3><EntryIcon name="grid" /> Código del aula</h3>
                    <p>
                      Solo sirve para el primer ingreso. Para reingresar, hace
                      falta una invitación nueva.
                    </p>
                    {code ? (
                      <div className="p5-code">
                        <code>{code}</code>
                        <button
                          onClick={() =>
                            void action(async () => {
                              await navigator.clipboard.writeText(code);
                              if (isCurrentRoom()) setNotice('Código copiado.');
                            })
                          }
                        >
                          Copiar código
                        </button>
                      </div>
                    ) : (
                      <p>Generá un código nuevo para compartirlo.</p>
                    )}
                    <button
                      disabled={busy || room.archived}
                      onClick={() =>
                        setConfirm({
                          title: 'Generar un código nuevo',
                          text: 'El código anterior dejará de funcionar. Las inscripciones actuales se conservan.',
                          run: async () => {
                            const result = await api.call<{ code: string }>(
                              `/${id}/code`,
                              'POST',
                              {},
                            );
                            if (isCurrentRoom()) setCode(result.code);
                          },
                        })
                      }
                    >
                      Generar código nuevo
                    </button>
                    </section>
                    <section className="classroom-members-invitations">
                    <h3><EntryIcon name="envelope" /> Invitaciones enviadas</h3>
                    <ResourceNotice resource={invitationResource} />
                    {invitationAction.error ? <Notice error>{invitationAction.error}</Notice> : null}
                    {invitationResource.status === 'ready' && invitations.length === 0 ? (
                      <p>No hay invitaciones enviadas.</p>
                    ) : (
                      <ul className="p5-invite-list">
                        {invitations.map((invitation) => (
                          <li key={invitation.id}>
                            <span>
                              {invitation.recipient}
                              <small>
                                {invitation.acceptedAt
                                  ? 'Aceptada'
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
                            {!invitation.acceptedAt && !invitation.revokedAt ? (
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
                    </section>
                  </aside>
  );
}
