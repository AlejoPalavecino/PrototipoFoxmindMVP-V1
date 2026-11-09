import { AsyncFeedback } from '../../../shared-ui/AsyncFeedback';
import { useEffect, useRef, useState } from 'react';
import { openDialog } from '../../../shared-ui/dialog-focus';
import { useFoxyWorkspace } from '../lib/use-foxy-workspace';
import { useFoxyWorkspaceActions } from '../lib/use-foxy-workspace-actions';
import { useFoxyCatalog } from '../lib/use-foxy-catalog';
import type { FoxyCreation } from '../lib/foxy-client';
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
  const visualPanel = useRef<HTMLDivElement>(null);
  const [handoffStart, setHandoffStart] = useState<{ turnId: string; mode: 'ACTIVITY' | 'RUBRIC' } | null>(null);
  const { state, runtime, initializing } = useFoxyWorkspace({ subjectId, onIdentityRequired });
  const { actions, ui } = useFoxyWorkspaceActions({ runtime, state, onNavigate: onNavigate ?? (() => {}) });
  const catalogStamp = JSON.stringify([state?.chat?.current?.id, state?.chat?.current?.title, state?.chat?.current?.revision,
    state?.chat?.turns?.map(turn => [turn.id, turn.state]), state?.resource?.resource?.id, state?.resource?.resource?.revision,
    state?.confirmation?.receipt, state?.activityHandoff?.receipt, state?.visualPublication?.receipt,
    state?.preparation?.result, state?.history?.items?.map(item => [item.id, item.state, item.revision]), state?.management?.receipt,
    state?.visualPublication?.publication?.state, state?.visualPublication?.publication?.revision,
    state?.visual?.jobs?.map(job => [job.id, job.state])]);
  const catalog = useFoxyCatalog({ subjectId, onIdentityRequired, stamp: catalogStamp });
  useEffect(() => {
    if (!runtime || !actions || !onRegister) return;
    onRegister({ navigate: href => { void actions.requestNavigate(href); }, shouldBlock: () => {
      const current = runtime.getState();
      return !!(current.activityHandoff?.busy || current.activityHandoff?.pending || (current.activityHandoff?.review && !current.activityHandoff.receipt) || current.resource?.dirty || current.resource?.busy || current.resource?.pending || current.preparation?.busy
        || current.preparation?.pending || current.confirmation?.busy || current.confirmation?.pending
        || current.management?.busy || current.management?.pending || current.visual?.busy || current.visual?.pending || current.visualPublication?.busy || current.visualPublication?.pending);
    } });
    return () => onRegister(null);
  }, [runtime, actions, onRegister]);
  if (!state || !runtime || !actions || !ui || !state.chat) return <AsyncFeedback title="Cargando Foxy AI…"/>;
  return <>{state.classroomsError && <p role="alert">{state.classroomsError}</p>}
    {initializing && <p role="status">Actualizando Foxy AI…</p>}
    {ui.leave && (!state.resource || (state.resource.status === 'closed' && !ui.openingResource)) &&
      <PendingLeaveDialog cancel={() => actions.cancelLeave()} proceed={() => { void actions.discardAndContinue(); }} />}
    <FoxyWorkspace catalog={catalog?.state} contextClassrooms={state.contextClassrooms}
      onConversationQuery={query => { void catalog?.controller.setConversationQuery(query); }}
      onCreationQuery={query => { void catalog?.controller.setCreationQuery(query); }}
      onMoreConversations={() => { void catalog?.controller.moreConversations(); }} onMoreCreations={() => { void catalog?.controller.moreCreations(); }}
      onRefreshCatalog={() => { void catalog?.controller.refresh(); }}
      onOpenCreation={(item: FoxyCreation) => {
        if (item.turnId) void actions.resource.openCreation(item.conversationId, item.turnId);
        else if (item.visualJobId) void Promise.resolve(actions.openVisualCreation(item.conversationId, item.visualJobId)).then(opened => {
          if (opened) visualPanel.current?.scrollIntoView({ behavior: 'instant', block: 'start' });
        });
      }}
      onNavigate={href => { void actions.requestNavigate(href); }} creationBlocked={!!ui.leave} onCreateDiagram={async prompt => {
      const snapshot = runtime.getState(), chat = snapshot.chat;
      if (snapshot.closed || !chat?.current || !snapshot.visual || snapshot.visual.busy || snapshot.visual.pending
        || snapshot.visualPublication?.busy || snapshot.visualPublication?.pending || chat.busy || chat.activeTurn || chat.pending
        || !chat.capabilities?.diagramGeneration.enabled || (chat.current.context.kind === 'CLASSROOM' && !chat.curriculum?.canGenerate)) return false;
      runtime.visual.setKind('DIAGRAM'); runtime.visual.setPrompt(prompt);
      const before = runtime.visual.getState().jobs.map(job => job.id);
      const request = runtime.visual.start(); if (!request) return false;
      visualPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      await request;
      const result = runtime.visual.getState();
      return !!result.pending || result.jobs.some(job => !before.includes(job.id));
    }} onActivityHandoff={(conversationId, turnId, mode) => { void Promise.resolve(actions.resource.open(conversationId, turnId)).then(result => { if (result === 'opened') setHandoffStart({ turnId, mode }); }); }} controller={actions.chat} state={state.chat} classrooms={state.classrooms}
      onOpenResource={(conversationId, turnId) => { void actions.resource.open(conversationId, turnId); }} />
    <div ref={visualPanel}>{state.chat.current && state.visual && <FoxyVisualWorkspace {...state.visual} conversationId={state.chat.current.id} revision={state.chat.current.revision}
      selection={state.chat.selection} capabilities={{ IMAGE: !!state.chat.capabilities?.imageGeneration.enabled, DIAGRAM: !!state.chat.capabilities?.diagramGeneration.enabled }}
      busy={state.visual.busy || state.chat.busy || !!state.chat.activeTurn || !!state.chat.pending || !!state.visualPublication?.busy || !!state.visualPublication?.pending || (state.chat.current.context.kind === 'CLASSROOM' && !state.chat.curriculum?.canGenerate)}
      actions={runtime.visual} assetFileUrl={runtime.assetFileUrl} />}</div>
    {state.visualPublication?.assetId && <FoxyVisualPublicationPanel state={state.visualPublication} actions={runtime.visualPublication}
      classrooms={state.classrooms} publicationFileUrl={runtime.publicationFileUrl} />}
    {state.resource && (state.resource.status !== 'closed' || ui.openingResource) && state.preparation && state.history && state.confirmation && <FoxyResourceWorkspace
      resource={state.resource} preparation={state.preparation} history={state.history} confirmation={state.confirmation} management={state.management}
      classrooms={state.classrooms} ui={ui} actions={actions} handoffRuntime={runtime} handoffState={state.activityHandoff} initialHandoffMode={handoffStart?.turnId === state.resource.resource?.sourceTurnId ? handoffStart?.mode : undefined} publicationFileUrl={runtime.publicationFileUrl} />}
  </>;
}
