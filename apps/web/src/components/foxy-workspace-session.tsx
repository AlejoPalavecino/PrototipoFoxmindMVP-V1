import { useFoxyWorkspace } from '../lib/use-foxy-workspace';
import { useFoxyWorkspaceActions } from '../lib/use-foxy-workspace-actions';
import { FoxyWorkspace } from './foxy-workspace';
import { FoxyResourceWorkspace } from './foxy-resource-workspace';

export function FoxyWorkspaceSession({ subjectId, onIdentityRequired, onNavigate }: { subjectId: string;
  onIdentityRequired: (code: string) => void; onNavigate?: (href: string) => void | Promise<void> }) {
  const { state, runtime, initializing } = useFoxyWorkspace({ subjectId, onIdentityRequired });
  const { actions, ui } = useFoxyWorkspaceActions({ runtime, state, onNavigate: onNavigate ?? (() => {}) });
  if (!state || !runtime || !actions || !ui || !state.chat) return <p>Cargando Foxy AI…</p>;
  return <>{state.classroomsError && <p role="alert">{state.classroomsError}</p>}
    {initializing && <p role="status">Actualizando Foxy AI…</p>}
    <FoxyWorkspace controller={actions.chat} state={state.chat} classrooms={state.classrooms}
      onOpenResource={(conversationId, turnId) => { void actions.resource.open(conversationId, turnId); }} />
    {state.resource && (state.resource.status !== 'closed' || ui.openingResource) && state.preparation && state.history && state.confirmation && <FoxyResourceWorkspace
      resource={state.resource} preparation={state.preparation} history={state.history} confirmation={state.confirmation}
      classrooms={state.classrooms} ui={ui} actions={actions} publicationFileUrl={runtime.publicationFileUrl} />}
  </>;
}
