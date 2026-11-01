import { useEffect, useRef } from 'react';
import { openDialog } from '../../../shared-ui/dialog-focus';
import { useFoxyWorkspace } from '../lib/use-foxy-workspace';
import { useFoxyWorkspaceActions } from '../lib/use-foxy-workspace-actions';
import { FoxyWorkspace } from './foxy-workspace';
import { FoxyResourceWorkspace } from './foxy-resource-workspace';
import { FoxyVisualWorkspace } from './foxy-visual-workspace';
import { FoxyVisualPublicationPanel } from './foxy-visual-publication-panel';

function PendingLeaveDialog({ cancel, proceed }: { cancel: () => void; proceed: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { if (ref.current) return openDialog(ref.current); }, []);
  return <dialog ref={ref} role="dialog" aria-modal="true" aria-labelledby="foxy-pending-leave-title" className="p5-dialog"
    onCancel={event => { event.preventDefault(); cancel(); }}>
    <h2 id="foxy-pending-leave-title">Antes de salir</h2>
    <p>La solicitud está pendiente y puede haberse completado. Podés consultar el resultado al volver.</p>
    <button type="button" className="p5-action" onClick={proceed}>Cerrar vista y continuar</button>
    <button type="button" className="p5-action" onClick={cancel}>Seguir acá</button>
  </dialog>;
}

export function FoxyWorkspaceSession({ subjectId, onIdentityRequired, onNavigate, onRegister }: { subjectId: string;
  onIdentityRequired: (code: string) => void; onNavigate?: (href: string) => void | Promise<void>;
  onRegister?: (binding: { navigate: (href: string) => void; shouldBlock: () => boolean } | null) => void }) {
  const { state, runtime, initializing } = useFoxyWorkspace({ subjectId, onIdentityRequired });
  const { actions, ui } = useFoxyWorkspaceActions({ runtime, state, onNavigate: onNavigate ?? (() => {}) });
  useEffect(() => {
    if (!runtime || !actions || !onRegister) return;
    onRegister({ navigate: href => { void actions.requestNavigate(href); }, shouldBlock: () => {
      const current = runtime.getState();
      return !!(current.resource?.dirty || current.resource?.busy || current.resource?.pending || current.preparation?.busy
        || current.preparation?.pending || current.confirmation?.busy || current.confirmation?.pending
        || current.management?.busy || current.management?.pending || current.visual?.busy || current.visual?.pending || current.visualPublication?.busy || current.visualPublication?.pending);
    } });
    return () => onRegister(null);
  }, [runtime, actions, onRegister]);
  if (!state || !runtime || !actions || !ui || !state.chat) return <p>Cargando Foxy AI…</p>;
  return <>{state.classroomsError && <p role="alert">{state.classroomsError}</p>}
    {initializing && <p role="status">Actualizando Foxy AI…</p>}
    {ui.leave && (!state.resource || (state.resource.status === 'closed' && !ui.openingResource)) &&
      <PendingLeaveDialog cancel={() => actions.cancelLeave()} proceed={() => { void actions.discardAndContinue(); }} />}
    <FoxyWorkspace controller={actions.chat} state={state.chat} classrooms={state.classrooms}
      onOpenResource={(conversationId, turnId) => { void actions.resource.open(conversationId, turnId); }} />
    {state.chat.current && state.visual && <FoxyVisualWorkspace {...state.visual} conversationId={state.chat.current.id} revision={state.chat.current.revision}
      selection={state.chat.selection} capabilities={{ IMAGE: !!state.chat.capabilities?.imageGeneration.enabled, DIAGRAM: !!state.chat.capabilities?.diagramGeneration.enabled }}
      busy={state.visual.busy || state.chat.busy || !!state.chat.activeTurn || !!state.chat.pending || !!state.visualPublication?.busy || !!state.visualPublication?.pending || (state.chat.current.context.kind === 'CLASSROOM' && !state.chat.curriculum?.canGenerate)}
      actions={runtime.visual} assetFileUrl={runtime.assetFileUrl} />}
    {state.visualPublication?.assetId && <FoxyVisualPublicationPanel state={state.visualPublication} actions={runtime.visualPublication}
      classrooms={state.classrooms} publicationFileUrl={runtime.publicationFileUrl} />}
    {state.resource && (state.resource.status !== 'closed' || ui.openingResource) && state.preparation && state.history && state.confirmation && <FoxyResourceWorkspace
      resource={state.resource} preparation={state.preparation} history={state.history} confirmation={state.confirmation} management={state.management}
      classrooms={state.classrooms} ui={ui} actions={actions} publicationFileUrl={runtime.publicationFileUrl} />}
  </>;
}
