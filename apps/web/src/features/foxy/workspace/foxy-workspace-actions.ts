import type { createFoxyWorkspaceRuntime } from './foxy-workspace-runtime.ts';

type Runtime = ReturnType<typeof createFoxyWorkspaceRuntime>;
type State = { leave: { reason: 'unsaved' | 'pending' | 'busy'; canSave: boolean } | null;
  openingResource: boolean; loadingDestinationId: string | null; error: string | null };
type Options = { runtime: Runtime; onChange: (state: State) => void; onNavigate?: (path: string) => void | Promise<void> };
export function createFoxyWorkspaceActions(options: Options) {
  const runtime = options.runtime;
  const empty = (): State => ({ leave: null, openingResource: false, loadingDestinationId: null, error: null });
  let disposed = false, state: State = empty();
  let target: (() => unknown | Promise<unknown>) | null = null, continuing = false, destinationEpoch = 0, openingEpoch = 0, actionEpoch = 0;
  const active = () => !disposed && !runtime.getState().closed;
  function emit(patch: Partial<State>) { if (active()) { state = { ...state, ...patch }; options.onChange(structuredClone(state)); } }
  function block() {
    const s = runtime.getState(), r = s.resource, p = s.preparation, c = s.confirmation, m = s.management;
    if (s.activityHandoff?.pending || r?.pending || p?.pending || c?.pending || m?.pending || s.visual?.pending || s.visualPublication?.pending || s.visualEditor?.pending) return { reason: 'pending' as const, canSave: false };
    if (s.activityHandoff?.busy || r?.busy || p?.busy || c?.busy || m?.busy || s.visual?.busy || s.visualPublication?.busy || s.visualEditor?.busy) return { reason: 'busy' as const, canSave: false };
    if (s.visualEditor?.dirty) return {reason:'unsaved' as const,canSave:false};
    if (s.activityHandoff?.review && !s.activityHandoff.receipt) return { reason: 'unsaved' as const, canSave: false };
    if (r?.dirty) {
      const draft = r.draft, valid = !!r.resource && r.status !== 'loading' && !!draft && [draft.title, draft.markdown].every((v, i) =>
        typeof v === 'string' && !!v.trim() && [...v].length <= (i ? 50000 : 200) && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(v));
      return { reason: 'unsaved' as const, canSave: !r.conflict && r.errorCode !== 'CONFLICT' && valid };
    }
    return null;
  }
  function guarded(action: () => unknown | Promise<unknown>) {
    if (!active() || continuing || target) return;
    const reason = block();
    if (reason) { target = action; emit({ leave: reason }); return false; }
    return action();
  }
  function locked() { const s = runtime.getState(); return !active() || !!s.activityHandoff?.pending || !!s.activityHandoff?.busy || !!s.confirmation?.pending || !!s.confirmation?.busy; }
  async function continueTarget(before?: () => void): Promise<boolean> {
    const action = target; if (!action || !active() || continuing) return false;
    target = null; continuing = true; const version = actionEpoch;
    try {
      before?.(); emit({ leave: null });
      if (!active() || version !== actionEpoch) return false;
      const result = await action(); return result !== false && active() && version === actionEpoch;
    } catch { if (version === actionEpoch) emit({ error: 'No pudimos completar la navegación.' }); return false; }
    finally { continuing = false; }
  }
  function ready(conversationId: string, turnId: string) {
    const chat = runtime.getState().chat;
    return !!chat?.current && chat.current.id.toLowerCase() === conversationId.toLowerCase()
      && chat.turns.some(turn => turn.id.toLowerCase() === turnId.toLowerCase() && turn.state === 'READY' && !!turn.answer);
  }
  function managementLocked() { const m = runtime.getState().management; return !!m?.busy || !!m?.pending; }
  function prepLocked() { const p = runtime.getState().preparation; return locked() || managementLocked() || !!p?.pending || !!p?.busy; }
  function mutationLocked() { const s = runtime.getState(); return locked() || managementLocked() || !!s.resource?.pending || !!s.resource?.busy || !!s.preparation?.pending || !!s.preparation?.busy; }
  return {
    prepareVisualConversation: (input: Parameters<Runtime['chat']['create']>[0], onSelected: (id: string | undefined) => void | Promise<void>) => guarded(async () => {
      const id = await runtime.chat.create(input);
      if (!active()) return false;
      const selected = id && runtime.getState().chat?.current?.id === id ? id : undefined;
      await onSelected(selected);
      return !!selected;
    }),
    openVisualCreation: (conversationId: string, jobId: string, onSelected?: () => void) => guarded(async () => {
      if (!await runtime.chat.select(conversationId)) return false;
      const opened = await runtime.visual.openJob(jobId);
      if (active() && runtime.getState().chat?.current?.id === conversationId) onSelected?.();
      return opened;
    }),
    getState: () => structuredClone(active() ? state : empty()),
    sync() { if (active() && state.leave) { const next = block() ?? state.leave; if (next.reason !== state.leave.reason || next.canSave !== state.leave.canSave) emit({ leave: next }); } },
    chat: {
      rename: (title: string) => guarded(() => runtime.chat.rename(title)),
      prepareContext: (id: string) => guarded(() => runtime.chat.prepareContext(id)),
      select: (id: string) => guarded(() => runtime.chat.select(id)),
      create: (...args: Parameters<Runtime['chat']['create']>) => { const copied = structuredClone(args); return guarded(() => runtime.chat.create(...copied)); },
      send: (...args: Parameters<Runtime['chat']['send']>) => { if (active()) return runtime.chat.send(...args); },
      retry: () => { if (active()) return runtime.chat.retry(); },
      refreshActiveTurn: () => { if (active()) return runtime.chat.refreshActiveTurn(); },
      cancel: () => { if (active()) return runtime.chat.cancel(); },
      setFullClassroom: (value: boolean) => { if (active()) return runtime.chat.setFullClassroom(value); },
      loadMore: () => { if (active()) return runtime.chat.loadMore(); },
      loadMoreConversations: () => { if (active()) return runtime.chat.loadMoreConversations(); },
      loadSources: (...args: Parameters<Runtime['chat']['loadSources']>) => { if (active()) return runtime.chat.loadSources(...args); },
      selectSource: (id: string) => { if (active()) return runtime.chat.selectSource(id); },
      selectTopic: (id: string) => { if (active()) return runtime.chat.selectTopic(id); },
      resolveToolSelection: (...args: Parameters<Runtime['chat']['resolveToolSelection']>) => { if (active()) return runtime.chat.resolveToolSelection(...args); },
      loadCitations: (...args: Parameters<Runtime['chat']['loadCitations']>) => { if (active()) return runtime.chat.loadCitations(...args); },
    },
    resource: {
      openCreation: (conversationId: string, turnId: string) => guarded(async () => {
        const version = ++openingEpoch; emit({ openingResource: true, error: null });
        try { return await runtime.resource.open(conversationId, turnId); }
        finally { if (version === openingEpoch) emit({ openingResource: false }); }
      }),
      open: (conversationId: string, turnId: string) => !active() || !ready(conversationId, turnId) ? undefined : guarded(async () => {
        if (!ready(conversationId, turnId)) return false;
        const version = ++openingEpoch; emit({ openingResource: true, error: null });
        try { return await runtime.resource.open(conversationId, turnId); }
        finally { if (version === openingEpoch) emit({ openingResource: false }); }
      }),
      close: () => { if (!active() || continuing || target) return false; if (block()) { guarded(() => { runtime.resource.close(); }); return false; } return runtime.resource.close(); },
      updateDraft: (...args: Parameters<Runtime['resource']['updateDraft']>) => { if (!locked()) runtime.resource.updateDraft(...args); },
      save: () => { if (!mutationLocked()) return runtime.resource.save(); },
      retry: () => { const s = runtime.getState(), p = s.preparation, r = s.resource; if (!locked() && !managementLocked() && !p?.pending && !p?.busy && r?.pending === 'SAVE' && !r.busy) return runtime.resource.retry(); },
      resolveConflict: (...args: Parameters<Runtime['resource']['resolveConflict']>) => { if (!locked()) return runtime.resource.resolveConflict(...args); },
      refreshConflict: () => { if (!locked()) return runtime.resource.refreshConflict(); },
    },
    preparation: {
      selectDestination: async (id: string) => { if (prepLocked()) return; const version = ++destinationEpoch; emit({ loadingDestinationId: id });
        try { return await runtime.preparation.selectDestination(id); } finally { if (version === destinationEpoch) emit({ loadingDestinationId: null }); } },
      setTitle: (title: string) => { if (!prepLocked()) runtime.preparation.setTitle(title); },
      selectUnit: (id: string | null) => { if (!prepLocked()) runtime.preparation.selectUnit(id); },
      selectTopic: (id: string | null) => { if (!prepLocked()) runtime.preparation.selectTopic(id); },
      prepare: () => { if (!mutationLocked()) return runtime.preparation.prepare(); },
      retry: () => { const r = runtime.getState().resource; if (!locked() && !managementLocked() && !r?.pending && !r?.busy) return runtime.preparation.retry(); },
    },
    history: {
      select: (id: string) => { if (!locked() && !managementLocked()) return runtime.history.select(id); },
      loadMore: () => { if (active()) return runtime.history.loadMore(); },
      refreshList: () => { if (active()) return runtime.history.refreshList(); },
      refreshSelected: () => { if (active()) return runtime.history.refreshSelected(); },
    },
    confirmation: {
      review: () => { if (!mutationLocked()) return runtime.confirmation.review(); },
      setReviewed: (value: boolean) => { if (active()) runtime.confirmation.setReviewed(value); },
      confirm: () => { if (!mutationLocked()) return runtime.confirmation.confirm(); },
      retry: () => { if (active() && !managementLocked()) return runtime.confirmation.retry(); },
      reset: () => { if (active()) runtime.confirmation.reset(); },
    },
    management: {
      refresh: async () => { if (active()) { await runtime.history.refreshSelected(); if (active()) await runtime.management.refresh(); } },
      retryPreparation: () => { if (active()) return runtime.management.retryPreparation(); },
      reviewDiscard: () => { if (active()) runtime.management.reviewDiscard(); },
      setDiscardReviewed: (value: boolean) => { if (active()) runtime.management.setDiscardReviewed(value); },
      discard: () => { if (active()) return runtime.management.discard(); },
      retryRequest: () => { if (active()) return runtime.management.retryRequest(); },
      cancelDiscardReview: () => { if (active()) runtime.management.cancelDiscardReview(); },
    },
    async requestNavigate(path: string): Promise<boolean> {
      if (!active() || continuing || target) return false;
      if (typeof path !== 'string' || !/^\/(?!\/)/u.test(path) || /[\\\u0000-\u001f\u007f-\u009f]/u.test(path) || !options.onNavigate) {
        emit({ error: 'No pudimos completar la navegación.' }); return false;
      }
      const reason = block();
      const action = () => options.onNavigate!(path);
      if (reason) { target = action; emit({ leave: reason }); return false; }
      continuing = true; const version = actionEpoch;
      try { await action(); return active() && version === actionEpoch; } catch { if (version === actionEpoch) emit({ error: 'No pudimos completar la navegación.' }); return false; }
      finally { continuing = false; }
    },
    cancelLeave() { if (active()) { actionEpoch++; target = null; emit({ leave: null }); } },
    async discardAndContinue(): Promise<boolean> {
      if (!active() || !target) return false;
      return continueTarget(() => { runtime.activityHandoff?.discard(); runtime.visualEditor?.discard(); runtime.visualPublication?.syncAsset('', ''); runtime.resource.discardAndClose(); });
    },
    async saveAndContinue(): Promise<boolean> {
      if (!active() || !target || !block()?.canSave) return false;
      const original = target; const result = await runtime.resource.save();
      if (active() && target === original && result === 'saved' && !block()) return continueTarget();
      return false;
    },
    dispose() { actionEpoch++; disposed = true; target = null; state = { leave: null, openingResource: false, loadingDestinationId: null, error: null }; },
  };
}
