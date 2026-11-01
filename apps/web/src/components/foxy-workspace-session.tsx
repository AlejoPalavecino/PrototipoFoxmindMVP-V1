import { useEffect } from 'react';
import { useFoxyWorkspace } from '../lib/use-foxy-workspace';
import { useFoxyWorkspaceActions } from '../lib/use-foxy-workspace-actions';
import { FoxyWorkspace } from './foxy-workspace';
import { FoxyResourceWorkspace } from './foxy-resource-workspace';

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
        || current.management?.busy || current.management?.pending);
    } });
    return () => onRegister(null);
  }, [runtime, actions, onRegister]);
  if (!state || !runtime || !actions || !ui || !state.chat) return <p>Cargando Foxy AI…</p>;
  return <>{state.classroomsError && <p role="alert">{state.classroomsError}</p>}
    {initializing && <p role="status">Actualizando Foxy AI…</p>}
    <FoxyWorkspace controller={actions.chat} state={state.chat} classrooms={state.classrooms}
      onOpenResource={(conversationId, turnId) => { void actions.resource.open(conversationId, turnId); }} />
    {state.resource && (state.resource.status !== 'closed' || ui.openingResource) && state.preparation && state.history && state.confirmation && <FoxyResourceWorkspace
      resource={state.resource} preparation={state.preparation} history={state.history} confirmation={state.confirmation} management={state.management}
      classrooms={state.classrooms} ui={ui} actions={actions} publicationFileUrl={runtime.publicationFileUrl} />}
  </>;
}
