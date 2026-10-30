import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ClassroomClient } from './api.ts';
import { Dialog, Notice } from './components.tsx';
import { Progress } from './Progress.tsx';
import { StudentAiSummary } from './StudentAiSummary.tsx';
import type { Summary } from './ClassroomRoster.tsx';
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string } | null;
type Props = {
  api: ClassroomClient; id: string; tab: string; inviting: boolean; setInviting: Dispatch<SetStateAction<boolean>>;
  email: string; setEmail: Dispatch<SetStateAction<string>>; invite: () => Promise<void>;
  invitationAction: { busy: boolean; error: string }; actionStates: Record<string, { busy: boolean; error: string }>;
  confirm: Confirmation; setConfirm: Dispatch<SetStateAction<Confirmation>>; isCurrentRoom: () => boolean;
  summary: (Summary & { studentId: string }) | null; setSummary: Dispatch<SetStateAction<(Summary & { studentId: string }) | null>>;
  action: (task: () => Promise<void>, section?: string) => Promise<void>;
};
export function ClassroomDialogs({ api, id, tab, inviting, setInviting, email, setEmail, invite,
  invitationAction, actionStates, confirm, setConfirm, isCurrentRoom, summary, setSummary, action }: Props) {
  return <>
      {inviting ? (
        <Dialog
          title="Invitar estudiantes"
          onClose={() => {
            if (!invitationAction.busy) setInviting(false);
          }}
        >
          <p>
            Enviaremos una invitación que deberán aceptar con ese mismo correo.
          </p>
          {invitationAction.error ? <Notice error>{invitationAction.error}</Notice> : null}
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void action(invite, 'invitations');
            }}
          >
            <label>
              Correo electrónico
              <input
                required
                type="text"
                inputMode="email"
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <footer className="p5-form-footer">
              <button
                type="button"
                disabled={invitationAction.busy}
                onClick={() => setInviting(false)}
              >
                Cancelar
              </button>
              <button className="primary" disabled={invitationAction.busy}>
                {invitationAction.busy ? 'Guardando…' : 'Enviar invitación'}
              </button>
            </footer>
          </form>
        </Dialog>
      ) : null}
      {confirm ? (
        <Dialog
          title={confirm.title}
          onClose={() => {
            if (!(actionStates[confirm.scope ?? tab]?.busy)) setConfirm(null);
          }}
        >
          <p>{confirm.text}</p>
          {actionStates[confirm.scope ?? tab]?.error ? <Notice error>{actionStates[confirm.scope ?? tab].error}</Notice> : null}
          <footer className="p5-form-footer">
            <button disabled={actionStates[confirm.scope ?? tab]?.busy} onClick={() => setConfirm(null)}>
              Cancelar
            </button>
            <button
              className="primary"
              disabled={actionStates[confirm.scope ?? tab]?.busy}
              onClick={() =>
                void action(async () => {
                  await confirm.run();
                  if (isCurrentRoom()) setConfirm(previous => previous === confirm ? null : previous);
                }, confirm.scope)
              }
            >
              {actionStates[confirm.scope ?? tab]?.busy ? 'Procesando…' : 'Confirmar'}
            </button>
          </footer>
        </Dialog>
      ) : null}
      {summary ? (
        <Dialog
          title={`${summary.firstName} ${summary.lastName}`}
          onClose={() => setSummary(null)}
        >
          <StudentAiSummary api={api} classroomId={id} studentId={summary.studentId} />
          <Progress api={api} classroomId={id} studentId={summary.studentId} />
          <h3>Entregas y calificaciones</h3>
          {summary.attempts.length ? (
            <ul>
              {summary.attempts.map((attempt) => (
                <li key={attempt.id}>
                  <strong>{attempt.title}</strong>
                  <p>
                    Intento {attempt.number} ·{' '}
                    {new Date(attempt.submittedAt).toLocaleDateString('es-AR')}
                  </p>
                  <p>
                    {attempt.grade === null
                      ? 'Sin calificación'
                      : `${Number(attempt.grade).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${attempt.published ? 'Publicada' : 'Sin publicar'}`}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p>Todavía no hay entregas registradas.</p>
          )}
        </Dialog>
      ) : null}
  </>;
}
