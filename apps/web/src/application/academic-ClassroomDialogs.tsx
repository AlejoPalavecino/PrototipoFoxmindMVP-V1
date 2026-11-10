import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ClassroomClient } from '../../../../src/core/contracts/academic-client.ts';
import { Dialog, Notice } from '../../../shared-ui/feedback.tsx';
import { StudentRecord } from '../features/grading/index.ts';
import type { Summary } from '../../../../src/core/contracts/grading.ts';
type Confirmation = { title: string; text: string; run: () => Promise<void>; scope?: string; confirmLabel?: string } | null;
type Props = {
  api: ClassroomClient; id: string; tab: string; inviting: boolean; setInviting: Dispatch<SetStateAction<boolean>>;
  email: string; setEmail: Dispatch<SetStateAction<string>>; invite: () => Promise<void>;
  invitationAction: { busy: boolean; error: string }; actionStates: Record<string, { busy: boolean; error: string }>;
  confirm: Confirmation; setConfirm: Dispatch<SetStateAction<Confirmation>>; isCurrentRoom: () => boolean;
  summary: (Summary & { studentId: string }) | null; setSummary: Dispatch<SetStateAction<(Summary & { studentId: string }) | null>>;
  action: (task: () => Promise<void>, section?: string) => Promise<void>;
  onOpenActivity?: (activityId: string, attemptId?: string) => void;
  onRemoveStudent?: () => void;
};
export function ClassroomDialogs({ api, id, tab, inviting, setInviting, email, setEmail, invite,
  invitationAction, actionStates, confirm, setConfirm, isCurrentRoom, summary, setSummary, action, onOpenActivity, onRemoveStudent }: Props) {
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
              {actionStates[confirm.scope ?? tab]?.busy ? 'Procesando…' : confirm.confirmLabel ?? 'Confirmar'}
            </button>
          </footer>
        </Dialog>
      ) : null}
      {summary ? <StudentRecord key={summary.studentId} api={api} classroomId={id} summary={summary}
        onBack={()=>setSummary(null)} onOpenActivity={onOpenActivity} onRemove={onRemoveStudent}/> : null}
  </>;
}
