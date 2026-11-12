import type { ChatIdentity } from '../../../shared-ui/FoxyChatLayout';
import type { CreateFoxyConversation, FoxyContext, StartFoxyVisual } from '../../../../src/core/domain/index.ts';
import { classroomHomeHref } from '../application/navigation/destinations';
import { AsyncFeedback } from '../../../shared-ui/AsyncFeedback';
import { Dialog } from '../../../shared-ui/feedback';
import { useEffect, useRef, useState } from 'react';
import { openDialog } from '../../../shared-ui/dialog-focus';
import { useFoxyWorkspace } from '../application/foxy-workspace';
import { useFoxyWorkspaceActions } from '../features/foxy/index.ts';
import { useFoxyCatalog } from '../features/foxy/index.ts';
import type { FoxyCreation } from '../features/foxy/api.ts';
import { FoxyWorkspace } from '../features/foxy/index.ts';
import { FoxyResourceWorkspace } from './foxy-resource-workspace';
import { FoxyVisualWorkspace } from '../features/foxy/index.ts';
import { FoxyVisualPublicationPanel, foxySurface } from '../features/foxy/index.ts';

type VisualDraft = Pick<StartFoxyVisual, 'kind' | 'aspectRatio' | 'prompt'> & {
  context: FoxyContext; onCreated: () => void; error: string | null;
};

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

export function FoxyWorkspaceSession({ identity, subjectId, onIdentityRequired, onNavigate, onRegister }: { identity?: ChatIdentity; subjectId: string;
  onIdentityRequired: (code: string) => void; onNavigate?: (href: string) => void | Promise<void>;
  onRegister?: (binding: { navigate: (href: string) => void; shouldBlock: () => boolean } | null) => void }) {
  const [visualConversation, setVisualConversation] = useState<string | null>(null);
  const [visualDraft, setVisualDraft] = useState<VisualDraft | null>(null);
  const visualDraftRequest = useRef<CreateFoxyConversation | null>(null);
  const submittingVisualDraft = useRef(false);
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
  const visualChat = state.chat.current;
  const selectedVisual = state.visual?.jobs.find(job => job.id === state.visual?.selectedId);
  const visualSharing = selectedVisual?.state === 'READY' && state.visualPublication?.assetId === selectedVisual.assetId
    ? state.visualPublication : null;
  const capabilities = { IMAGE: !!state.chat.capabilities?.imageGeneration?.enabled, DIAGRAM: !!state.chat.capabilities?.diagramGeneration?.enabled };
  const chatBusy = state.chat.busy || !!state.chat.activeTurn || !!state.chat.pending;
  const activeVisual = visualChat?.id === visualConversation ? state.visual : null;
  function updateVisualDraft(patch: Partial<VisualDraft>) {
    setVisualDraft(current => current ? { ...current, ...patch } : current);
  }
  function generateFirstVisual(draft: VisualDraft) {
    if (!actions || !runtime || submittingVisualDraft.current || runtime.getState().chat?.busy) return;
    const title = [...draft.prompt.trim().replace(/\s+/gu, ' ')].slice(0, 120).join('');
    const request = visualDraftRequest.current ??= { requestId: crypto.randomUUID(), title, context: draft.context };
    submittingVisualDraft.current = true;
    updateVisualDraft({ error: null });
    const showError = () => updateVisualDraft({ error: 'No pudimos crear la conversación. Tu descripción se conservó. Volvé a intentar.' });
    void Promise.resolve(actions.prepareVisualConversation(request, id => {
      if (visualDraftRequest.current !== request) return;
      if (!id) { showError(); return; }
      visualDraftRequest.current = null;
      draft.onCreated();
      setVisualConversation(id);
      setVisualDraft(null);
      runtime.visual.setKind(draft.kind);
      runtime.visual.setAspectRatio(draft.aspectRatio);
      runtime.visual.setPrompt(draft.prompt);
      void runtime.visual.start();
    })).then(result => { if (result === undefined) showError(); }, showError).finally(() => { submittingVisualDraft.current = false; });
  }
  return <>{state.classroomsError && <p role="alert">{state.classroomsError}</p>}
    {initializing && <p role="status">Actualizando Foxy AI…</p>}
    {ui.leave && (!state.resource || (state.resource.status === 'closed' && !ui.openingResource)) &&
      <PendingLeaveDialog cancel={() => actions.cancelLeave()} proceed={() => { void actions.discardAndContinue(); }} />}
    <FoxyWorkspace identity={identity} destinationHref={classroomHomeHref} catalog={catalog?.state} contextClassrooms={state.contextClassrooms}
      onConversationQuery={query => { void catalog?.controller.setConversationQuery(query); }}
      onCreationQuery={query => { void catalog?.controller.setCreationQuery(query); }}
      onMoreConversations={() => { void catalog?.controller.moreConversations(); }} onMoreCreations={() => { void catalog?.controller.moreCreations(); }}
      onRefreshCatalog={() => { void catalog?.controller.refresh(); }}
      onOpenVisual={state.visual ? draft => {
        if (draft) {
          visualDraftRequest.current = null;
          setVisualConversation(null);
          setVisualDraft({ ...draft, kind: !capabilities.IMAGE && capabilities.DIAGRAM ? 'DIAGRAM' : 'IMAGE', aspectRatio: '1:1', prompt: '', error: null });
        } else if (visualChat) setVisualConversation(visualChat.id);
      } : undefined}
      onOpenCreation={(item: FoxyCreation) => {
        if (item.turnId) void actions.resource.openCreation(item.conversationId, item.turnId);
        else if (item.visualJobId) void actions.openVisualCreation(item.conversationId, item.visualJobId,
          () => setVisualConversation(item.conversationId));
      }}
      onNavigate={href => { void actions.requestNavigate(href); }} creationBlocked={!!ui.leave} onCreateDiagram={async prompt => {
      const snapshot = runtime.getState(), chat = snapshot.chat;
      if (snapshot.closed || !chat?.current || !snapshot.visual || snapshot.visual.busy || snapshot.visual.pending
        || snapshot.visualPublication?.busy || snapshot.visualPublication?.pending || chat.busy || chat.activeTurn || chat.pending
        || !chat.capabilities?.diagramGeneration.enabled || (chat.current.context.kind === 'CLASSROOM' && !chat.curriculum?.canGenerate)) return false;
      runtime.visual.setKind('DIAGRAM'); runtime.visual.setPrompt(prompt);
      const before = runtime.visual.getState().jobs.map(job => job.id);
      const request = runtime.visual.start(); if (!request) return false;
      setVisualConversation(chat.current.id);
      await request;
      const result = runtime.visual.getState();
      return !!result.pending || result.jobs.some(job => !before.includes(job.id));
    }} onActivityHandoff={(conversationId, turnId, mode) => { void Promise.resolve(actions.resource.open(conversationId, turnId)).then(result => { if (result === 'opened') setHandoffStart({ turnId, mode }); }); }} controller={actions.chat} state={state.chat} classrooms={state.classrooms}
      onOpenResource={(conversationId, turnId) => { void actions.resource.open(conversationId, turnId); }} />
    {(visualDraft || activeVisual) && <Dialog title="Imágenes y esquemas" labeledClose onClose={() => {
      if (visualDraft && (submittingVisualDraft.current || runtime.getState().chat?.busy)) return;
      visualDraftRequest.current = null;
      setVisualDraft(null);
      setVisualConversation(null);
    }}>
      {visualDraft ? <FoxyVisualWorkspace kind={visualDraft.kind} prompt={visualDraft.prompt} aspectRatio={visualDraft.aspectRatio} jobs={[]} selectedId={null}
        error={visualDraft.error} busy={chatBusy || !!ui.leave} capabilities={capabilities} assetFileUrl={runtime.assetFileUrl}
        actions={{ setKind: kind => updateVisualDraft({ kind }), setPrompt: prompt => updateVisualDraft({ prompt }),
          setAspectRatio: aspectRatio => updateVisualDraft({ aspectRatio }), start: () => generateFirstVisual(visualDraft) }} />
      : activeVisual && <FoxyVisualWorkspace {...activeVisual} capabilities={capabilities}
        busy={activeVisual.busy || chatBusy || !!state.visualPublication?.busy || !!state.visualPublication?.pending || (visualChat?.context.kind === 'CLASSROOM' && !state.chat.curriculum?.canGenerate)}
        actions={runtime.visual} assetFileUrl={runtime.assetFileUrl}
        sharing={visualSharing && <details key={visualSharing.assetId} className={foxySurface.resourceDisclosure}>
          <summary>Compartir</summary>
          <FoxyVisualPublicationPanel state={visualSharing} actions={runtime.visualPublication}
            classrooms={state.classrooms} publicationFileUrl={runtime.publicationFileUrl} />
        </details>} />}
    </Dialog>}
    {state.resource && (state.resource.status !== 'closed' || ui.openingResource) && state.preparation && state.history && state.confirmation && <FoxyResourceWorkspace
      resource={state.resource} preparation={state.preparation} history={state.history} confirmation={state.confirmation} management={state.management}
      classrooms={state.classrooms} ui={ui} actions={actions} handoffRuntime={runtime} handoffState={state.activityHandoff} initialHandoffMode={handoffStart?.turnId === state.resource.resource?.sourceTurnId ? handoffStart?.mode : undefined} publicationFileUrl={runtime.publicationFileUrl} />}
  </>;
}
