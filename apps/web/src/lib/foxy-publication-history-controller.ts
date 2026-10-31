import type { FoxyPublicationSummary, FoxyPublicationInspection } from '../../../../src/core/domain/index.ts';
import type { WebFoxyClient } from './foxy-client.ts';
import type { createFoxyResourceController } from './foxy-resource-controller.ts';
import type { createFoxyPreparationController } from './foxy-preparation-controller.ts';

type State = { resourceId: string | null; items: FoxyPublicationSummary[]; nextAfterId: string | null; selectedId: string | null;
  inspection: FoxyPublicationInspection | null; staleResource: boolean; loading: boolean; inspectionLoading: boolean;
  error: string | null; inspectionError: string | null };
type Options = { client: Pick<WebFoxyClient, 'listPublications' | 'inspectPublication'>;
  resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>;
  preparation: Pick<ReturnType<typeof createFoxyPreparationController>, 'getState'>; onChange: (state: State) => void;
  setTimeout?: typeof setTimeout; clearTimeout?: typeof clearTimeout };
const initial = (): State => ({ resourceId: null, items: [], nextAfterId: null, selectedId: null, inspection: null,
  staleResource: false, loading: false, inspectionLoading: false, error: null, inspectionError: null });
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const newer = (a: FoxyPublicationSummary, b: FoxyPublicationSummary) => BigInt(a.revision) >= BigInt(b.revision) ? a : b;
const accessLost = (e: unknown) => ['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes((e as { code?: string } | null)?.code ?? '');

export function createFoxyPublicationHistoryController(options: Options) {
  let state = initial(), disposed = false, identityLost = false, generation = 0, selection = 0;
  let listAbort = new AbortController(), selectedAbort = new AbortController(), timer: ReturnType<typeof setTimeout> | undefined;
  let listed = false, preparationId: string | null = null;
  let listTask: Promise<void> | null = null;
  const classroomRevisions = new Map<string, bigint>(), publications = new Map<string, FoxyPublicationSummary>();
  const schedule = options.setTimeout ?? setTimeout, cancel = options.clearTimeout ?? clearTimeout;
  function stopTimer() { if (timer !== undefined) cancel(timer); timer = undefined; }
  function emit(patch: Partial<State>) { if (!disposed) { state = { ...state, ...patch }; options.onChange(structuredClone(state)); } }
  function reset() {
    generation++; selection++; listAbort.abort(); selectedAbort.abort(); stopTimer();
    listAbort = new AbortController(); selectedAbort = new AbortController(); listTask = null; listed = false; preparationId = null; classroomRevisions.clear(); publications.clear();
  }
  function revoke(error: unknown) {
    const code = (error as { code?: string }).code; identityLost ||= code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED';
    reset(); emit({ ...initial(), error: 'El recurso no estÃ¡ disponible.' });
  }
  const stale = (p: FoxyPublicationSummary) => options.resource.getState().resource?.revision !== p.resourceRevision;
  function merge(old: FoxyPublicationSummary[], incoming: FoxyPublicationSummary[]) {
    const merged = old.map(item => ({ ...item }));
    for (const item of incoming) {
      const index = merged.findIndex(row => same(row.id, item.id));
      if (index < 0) merged.push({ ...item }); else merged[index] = { ...newer(merged[index]!, item) };
    }
    return merged;
  }
  async function load(refresh: boolean) {
    if (disposed || identityLost || !state.resourceId || state.loading || (!refresh && listed && !state.nextAfterId)) return;
    const version = generation, id = state.resourceId, afterId = refresh ? null : state.nextAfterId;
    emit({ loading: true, error: null });
    try {
      const page = await options.client.listPublications(id, { limit: 20, afterId }, listAbort.signal);
      if (disposed || version !== generation) return;
      const safeItems = page.items.filter(p => same(p.resourceId, id)).map(p => {
        const key = p.id.toLowerCase(), known = publications.get(key);
        if (known?.state === 'PUBLISHED' && p.state !== 'PUBLISHED') return { ...known };
        const latest = known ? newer(known, p) : p;
        publications.set(key, { ...latest }); return { ...latest };
      });
      const existing = refresh ? [] : state.items;
      let items = merge(existing, safeItems.filter(p => same(p.resourceId, id)));
      if (refresh) items = items.map(item => { const prior = state.items.find(p => same(p.id, item.id)); return prior ? newer(prior, item) : item; });
      if (state.inspection) items = items.map(item => same(item.id, state.inspection!.publication.id) ? newer(item, state.inspection!.publication) : item);
      listed = true; emit({ items, nextAfterId: page.nextAfterId, loading: false });
    } catch (error) {
      if (!disposed && version === generation) { if (accessLost(error)) revoke(error); else emit({ loading: false, error: 'No pudimos cargar las preparaciones.' }); }
    }
  }
  function requestList(refresh: boolean): Promise<void> {
    if (listTask) {
      if (!refresh) return listTask;
      const version = generation, running = listTask;
      return running.then(() => { if (!disposed && version === generation) return requestList(true); });
    }
    const task = load(refresh); listTask = task;
    void task.finally(() => { if (listTask === task) listTask = null; });
    return task;
  }
  function poll() {
    if (disposed || timer !== undefined || state.inspectionLoading || state.staleResource || state.inspectionError
      || state.inspection?.publication.state !== 'PREPARING') return;
    timer = schedule(() => { timer = undefined; return inspect(); }, 2000);
  }
  async function inspect() {
    if (disposed || identityLost || !state.selectedId || !state.resourceId || state.inspectionLoading) return;
    const version = generation, chosen = selection, id = state.selectedId, resourceId = state.resourceId;
    stopTimer(); emit({ inspectionLoading: true, inspectionError: null });
    try {
      const value = await options.client.inspectPublication(id, selectedAbort.signal);
      if (disposed || version !== generation || chosen !== selection) return;
      if (!same(value.publication.id, id) || !same(value.publication.resourceId, resourceId)) throw new Error('Invalid publication identity');
      const p = value.publication, classroomKey = p.classroomId.toLowerCase();
      const high = classroomRevisions.get(classroomKey), priorPublication = publications.get(p.id.toLowerCase());
      if ((high !== undefined && BigInt(value.classroomRevision) < high)
        || (priorPublication?.state === 'PUBLISHED' && p.state !== 'PUBLISHED')) {
        emit({ inspection: null, inspectionLoading: false, inspectionError: 'La preparación cambió; actualizá su estado.' }); return;
      }
      const known = priorPublication ?? state.items.find(item => same(item.id, id));
      if (known && BigInt(known.revision) > BigInt(value.publication.revision)) {
        emit({ inspection: null, inspectionLoading: false, inspectionError: 'La preparación cambió; actualizá su estado.' }); return;
      }
      classroomRevisions.set(classroomKey, BigInt(value.classroomRevision));
      publications.set(p.id.toLowerCase(), { ...p });
      const previous = state.inspection;
      const inspection = structuredClone(value);
      if (previous && same(previous.publication.id, id)) {
        if (BigInt(previous.publication.revision) > BigInt(inspection.publication.revision)) {
          emit({ inspectionLoading: false, inspectionError: 'La preparación cambió; actualizá su estado.' }); return;
        }
      }
      const items = state.items.map(item => same(item.id, inspection.publication.id) ? newer(item, inspection.publication) : item);
      emit({ items, inspection, staleResource: stale(inspection.publication), inspectionLoading: false }); poll();
    } catch (error) {
      if (!disposed && version === generation && chosen === selection) {
        if (accessLost(error)) revoke(error); else emit({ inspectionLoading: false, inspectionError: 'No pudimos actualizar la preparaciÃ³n.' });
      }
    }
  }
  return {
    getState: () => structuredClone(state),
    syncResource() {
      if (disposed || identityLost) return;
      const resource = options.resource.getState().resource;
      if (!resource || !state.resourceId || !same(resource.id, state.resourceId)) {
        reset(); emit({ ...initial(), resourceId: resource?.id ?? null });
      } else if (state.inspection) { const isStale = stale(state.inspection.publication); if (isStale) stopTimer(); emit({ staleResource: isStale }); }
    },
    loadMore: () => requestList(false), refreshList: () => requestList(true),
    select(id: string) {
      if (disposed || identityLost || !state.resourceId) return;
      selection++; selectedAbort.abort(); selectedAbort = new AbortController(); stopTimer();
      emit({ selectedId: id, inspection: null, staleResource: false, inspectionLoading: false, inspectionError: null });
      return inspect();
    },
    refreshSelected: () => inspect(),
    async syncPreparation() {
      if (disposed || identityLost || !state.resourceId) return;
      const result = options.preparation.getState().result;
      if (!result || !same(result.resourceId, state.resourceId) || (preparationId && same(result.id, preparationId))) return;
      preparationId = result.id; selection++; selectedAbort.abort(); selectedAbort = new AbortController(); stopTimer();
      emit({ selectedId: result.id, inspection: null, staleResource: false, inspectionLoading: false, inspectionError: null });
      await Promise.all([inspect(), requestList(true)]);
    },
    dispose() { if (!disposed) { reset(); state = initial(); disposed = true; } },
  };
}
