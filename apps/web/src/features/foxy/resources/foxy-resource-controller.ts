import type { EditFoxyResource } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { FoxyResource, WebFoxyClient } from '../api/foxy-client.ts';

type Draft = { title: string; markdown: string };
type State = { status: 'closed' | 'loading' | 'editing' | 'unavailable'; resource: FoxyResource | null;
  draft: Draft; dirty: boolean; busy: boolean; pending: 'SAVE' | null;
  conflict: FoxyResource | null; errorCode: string | null; error: string | null };
type Options = { client: Pick<WebFoxyClient, 'resourceFromTurn' | 'getResource' | 'editResource'>;
  onChange: (state: State) => void; uuid?: () => string };
const blank = (): State => ({ status: 'closed', resource: null, draft: { title: '', markdown: '' },
  dirty: false, busy: false, pending: null, conflict: null, errorCode: null, error: null });
const snapshot = (state: State): State => ({ ...state, draft: { ...state.draft },
  resource: state.resource && { ...state.resource }, pending: state.pending,
  conflict: state.conflict && { ...state.conflict } });
const sameId = (a: string, b: string) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const sameResource = (a: FoxyResource, b: FoxyResource) => sameId(a.id, b.id) && sameId(a.conversationId, b.conversationId) && sameId(a.sourceTurnId, b.sourceTurnId);
const accessLost = (error: unknown) => ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes((error as { code?: string } | null)?.code ?? '');
const matches = (draft: Draft, resource: FoxyResource) => draft.title === resource.title && draft.markdown === resource.markdown;
const validDraft = (draft: Draft) => [draft.title, draft.markdown].every((value, i) =>
  typeof value === 'string' && !!value.trim() && [...value].length <= (i === 0 ? 200 : 50000)
  && !/[\u0000-\u0008\u000b-\u001f\u007f-\u009f]/u.test(value));

export function createFoxyResourceController(options: Options) {
  let state = blank(), disposed = false, epoch = 0, abort = new AbortController();
  let saving: ReturnType<typeof dispatch> | null = null, conflictPending = false, pendingIntent: EditFoxyResource | null = null;
  const update = (patch: Partial<State>) => { if (!disposed) { state = { ...state, ...patch }; options.onChange(snapshot(state)); } };
  const current = (version: number) => !disposed && version === epoch && !abort.signal.aborted;
  function reset() { pendingIntent = null; conflictPending = false; saving = null; epoch++; abort.abort(); abort = new AbortController(); return epoch; }
  function clear() { reset(); update(blank()); }
  function revoke(error: unknown) { reset(); update({ ...blank(), status: 'unavailable', errorCode: (error as { code: string }).code, error: 'El recurso no está disponible.' }); }
  async function dispatch(intent: EditFoxyResource) {
    const resource = state.resource;
    if (disposed || !resource || state.busy) return;
    const version = epoch;
    pendingIntent = { ...intent };
    update({ busy: true, pending: 'SAVE', error: null, errorCode: null });
    try {
      const result = await options.client.editResource(resource.id, { ...intent }, abort.signal);
      if (!current(version)) return;
      if (!sameResource(resource, result.resource)) throw new Error('Invalid resource identity');
      pendingIntent = null;
      update({ resource: { ...result.resource }, dirty: !matches(state.draft, result.resource), pending: null, busy: false, conflict: null });
      return 'saved' as const;
    } catch (error) {
      if (!current(version)) return;
      if (accessLost(error)) { revoke(error); return; }
      const failure = error as { code?: string; status?: number };
      if (failure.code === 'CONFLICT' || failure.status === 409) {
        pendingIntent = null; conflictPending = true;
        update({ pending: null, errorCode: 'CONFLICT', error: 'El recurso cambió.' });
        try {
          const latest = await options.client.getResource(resource.id, abort.signal);
          if (current(version)) update({ conflict: sameResource(resource, latest) ? { ...latest } : null, busy: false });
        } catch (error) { if (current(version)) { if (accessLost(error)) revoke(error); else update({ busy: false }); } }
        return 'conflict' as const;
      }
      if (failure.code === 'INVALID_INPUT' || failure.status === 400) {
        pendingIntent = null;
        update({ pending: null, busy: false, errorCode: 'INVALID_INPUT', error: 'Revisá el recurso.' });
        return 'invalid' as const;
      }
      update({ busy: false, errorCode: failure.code ?? 'SERVICE_UNAVAILABLE', error: 'No pudimos confirmar el guardado.' });
      return 'uncertain' as const;
    }
  }
  return {
    getState: () => snapshot(state),
    async open(conversationId: string, turnId: string) {
      if (disposed) return;
      if (state.dirty || state.pending || state.busy) return 'blocked' as const;
      const version = reset(); update({ ...blank(), status: 'loading', busy: true });
      try {
        const result = await options.client.resourceFromTurn(conversationId, turnId, abort.signal);
        if (!current(version)) return;
        const resource = { ...result.resource };
        if (!sameId(resource.conversationId, conversationId) || !sameId(resource.sourceTurnId, turnId)) throw new Error('Invalid resource identity');
        update({ status: 'editing', resource, draft: { title: resource.title, markdown: resource.markdown }, busy: false });
        return 'opened' as const;
      } catch (error) {
        if (current(version)) { if (accessLost(error)) revoke(error); else update({ status: 'unavailable', busy: false, errorCode: (error as { code?: string }).code ?? 'SERVICE_UNAVAILABLE', error: 'No pudimos abrir el recurso.' }); }
        return 'failed' as const;
      }
    },
    updateDraft(draft: Draft) {
      if (disposed || !state.resource) return;
      const copy = { title: draft.title, markdown: draft.markdown };
      update({ draft: copy, dirty: !matches(copy, state.resource) });
    },
    save() {
      if (saving) return saving;
      if (disposed || !state.resource || state.busy) return;
      if (state.pending) return Promise.resolve('uncertain' as const);
      if (conflictPending) return Promise.resolve('conflict' as const);
      if (!state.dirty) return Promise.resolve('saved' as const);
      if (!validDraft(state.draft)) { update({ errorCode: 'INVALID_INPUT', error: 'Revisá el recurso.' }); return Promise.resolve('invalid' as const); }
      const intent = { requestId: (options.uuid ? options.uuid() : crypto.randomUUID()), revision: state.resource.revision, ...state.draft };
      const task = dispatch(intent); saving = task;
      void task.finally(() => { if (saving === task) saving = null; });
      return task;
    },
    resolveConflict(choice: 'keep-local' | 'use-server') {
      if (disposed || state.busy || state.pending || !conflictPending || !state.conflict
        || (choice !== 'keep-local' && choice !== 'use-server')) return false;
      const resource = { ...state.conflict };
      const draft = choice === 'use-server' ? { title: resource.title, markdown: resource.markdown } : state.draft;
      conflictPending = false;
      update({ resource, draft, dirty: !matches(draft, resource), conflict: null, errorCode: null, error: null });
      return true;
    },
    async refreshConflict() {
      if (disposed || state.busy || state.pending || !conflictPending || !state.resource) return;
      const version = epoch, original = state.resource; update({ busy: true });
      try {
        const resource = await options.client.getResource(original.id, abort.signal);
        if (current(version)) update({ conflict: sameResource(original, resource) ? { ...resource } : null, busy: false });
      } catch (error) { if (current(version)) { if (accessLost(error)) revoke(error); else update({ busy: false }); } }
    },
    retry() { if (!disposed && pendingIntent && !state.busy) return dispatch(pendingIntent); },
    close() { if (disposed || state.dirty || state.pending || state.busy) return false; clear(); return true; },
    discardAndClose() { if (!disposed) clear(); },
    dispose() { if (!disposed) { reset(); state = blank(); disposed = true; } },
  };
}
