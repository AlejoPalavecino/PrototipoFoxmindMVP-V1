import type { FoxyPublicationManagement, FoxyPublicationSummary, FoxyPublicationCommandReceipt, RetryFoxyPublication, DiscardFoxyPublication } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { WebFoxyClient } from '../api/foxy-client.ts';
import type { createFoxyResourceController } from '../resources/foxy-resource-controller.ts';
import type { createFoxyPreparationController } from '../resources/foxy-preparation-controller.ts';
import type { createFoxyPublicationHistoryController } from './foxy-publication-history-controller.ts';
import type { createFoxyPublicationConfirmationController } from './foxy-publication-confirmation-controller.ts';

type State = { management: FoxyPublicationManagement | null; loading: boolean; busy: boolean; pending: 'RETRY' | 'DISCARD' | null;
  discardReview: FoxyPublicationSummary | null; discardReviewed: boolean; canRetry: boolean; canReviewDiscard: boolean; canDiscard: boolean;
  receipt: FoxyPublicationCommandReceipt | null; error: string | null; errorCode: string | null };
type Intent = { resourceId: string; publicationId: string; action: 'RETRY' | 'DISCARD'; input: RetryFoxyPublication | DiscardFoxyPublication };
type Options = { client: Pick<WebFoxyClient, 'inspectPublicationManagement' | 'retryPublication' | 'discardPublication'>;
  resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>; preparation: Pick<ReturnType<typeof createFoxyPreparationController>, 'getState'>;
  history: Pick<ReturnType<typeof createFoxyPublicationHistoryController>, 'getState'>; confirmation: Pick<ReturnType<typeof createFoxyPublicationConfirmationController>, 'getState'>;
  onChange: (state: State) => void; onReconcile: () => void; uuid?: () => string; setTimeout?: typeof setTimeout; clearTimeout?: typeof clearTimeout };
const blank = (): State => ({ management: null, loading: false, busy: false, pending: null, discardReview: null, discardReviewed: false,
  canRetry: false, canReviewDiscard: false, canDiscard: false, receipt: null, error: null, errorCode: null });
const same = (a: string, b: string) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const revision = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9][0-9]{0,18})$/u.test(v) && BigInt(v) <= 9223372036854775807n;
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(v);
const reasons = new Set(['STATE','SOURCE_CHANGED','DESTINATION_UNAVAILABLE','INVALID_RESOURCE','REFERENCED','BUSY','CONTENT_REJECTED','FILE_UNAVAILABLE']);
function project(v: FoxyPublicationManagement, id: string): FoxyPublicationManagement {
  if (!v || !uuid(v.publicationId) || !same(v.publicationId,id) || !revision(v.publicationRevision) || typeof v.canRetry !== 'boolean'
    || typeof v.canDiscard !== 'boolean' || (v.retryReason !== null && !reasons.has(v.retryReason)) || v.canRetry !== (v.retryReason === null)
    || !['NOT_REQUESTED','PENDING','FAILED','DONE'].includes(v.cleanupState)) throw new Error('Invalid management');
  return { publicationId: v.publicationId, publicationRevision: v.publicationRevision, canRetry: v.canRetry,
    retryReason: v.retryReason, canDiscard: v.canDiscard, cleanupState: v.cleanupState };
}
export function createFoxyPublicationManagementController(options: Options) {
  let state = blank(), disposed = false, identityLost = false, epoch = 0, readEpoch = 0;
  let readAbort = new AbortController(), commandAbort = new AbortController(), timer: ReturnType<typeof setTimeout> | undefined;
  let resourceId = '', publicationId = '', signature = '', done = false, floor = 0n, intent: Intent | null = null;
  const floors = new Map<string, bigint>(), completed = new Set<string>(), reconciled = new Set<string>();
  let reading: Promise<void> | null = null, writing: Promise<unknown> | null = null;
  const schedule = options.setTimeout ?? setTimeout, cancel = options.clearTimeout ?? clearTimeout;
  const selected = () => options.history.getState().inspection?.publication ?? null;
  function stopTimer() { if (timer !== undefined) cancel(timer); timer = undefined; }
  function clear(preserve = false) { epoch++; readEpoch++; readAbort.abort(); commandAbort.abort(); readAbort = new AbortController(); commandAbort = new AbortController();
    stopTimer(); resourceId = ''; publicationId = ''; signature = ''; done = false; floor = 0n; intent = null; reading = null; writing = null;
    if (!preserve) { floors.clear(); completed.clear(); reconciled.clear(); } }
  const valid = (v: number) => {
    const r = options.resource.getState().resource, selectedId = options.history.getState().selectedId;
    return !disposed && !identityLost && v === epoch && !!r && !!selectedId && same(r.id,resourceId) && same(selectedId,publicationId);
  };
  function coherent() {
    const h = options.history.getState(), r = options.resource.getState(), p = selected(), m = state.management;
    if (!p || !m || !r.resource || !h.selectedId || h.inspectionLoading || h.inspectionError || !same(p.id,h.selectedId)
      || !same(p.resourceId,r.resource.id) || !same(m.publicationId,p.id) || m.publicationRevision !== p.revision) return false;
    const newer = h.items?.some(item => same(item.id,p.id) && (BigInt(item.revision)>BigInt(p.revision) || ((item.state==='DISCARDED' || item.state==='PUBLISHED') && item.state!==p.state)));
    const prepared = options.preparation.getState().result;
    if (newer || (prepared && same(prepared.id,p.id) && (BigInt(prepared.revision)>BigInt(p.revision) ||
      ((prepared.state === 'PUBLISHED' || prepared.state === 'DISCARDED') && prepared.state !== p.state)))) return false;
    if (BigInt(m.publicationRevision) < floor || BigInt(m.publicationRevision) >= 9223372036854775807n) return false;
    if (p.state === 'DISCARDED') return m.cleanupState !== 'NOT_REQUESTED' && !m.canRetry && !m.canDiscard;
    if (p.state === 'PUBLISHED') return m.cleanupState === 'NOT_REQUESTED' && !m.canRetry && !m.canDiscard;
    return m.cleanupState === 'NOT_REQUESTED' && (!m.canRetry || p.state === 'FAILED');
  }
  function sameReview(a: FoxyPublicationSummary, b: FoxyPublicationSummary) {
    return same(a.id,b.id) && same(a.resourceId,b.resourceId) && same(a.classroomId,b.classroomId) && a.revision === b.revision
      && a.resourceRevision === b.resourceRevision && a.state === b.state && a.title === b.title
      && (a.unitId?.toLowerCase() ?? null) === (b.unitId?.toLowerCase() ?? null)
      && (a.topicId?.toLowerCase() ?? null) === (b.topicId?.toLowerCase() ?? null);
  }
  function freeNow() {
    const r = options.resource.getState(), p = options.preparation.getState(), c = options.confirmation.getState(), h = options.history.getState();
    return !disposed && !identityLost && !!r.resource && !!h.selectedId && same(r.resource.id,resourceId) && same(h.selectedId,publicationId)
      && !state.error && !state.busy && !state.pending && !state.loading && !r.busy && !r.pending && !p.busy && !p.pending && !c.busy && !c.pending && coherent();
  }
  function emit(patch: Partial<State>) {
    if (disposed) return;
    state = { ...state, ...patch }; const r = options.resource.getState(), p = options.preparation.getState(), c = options.confirmation.getState(), selectedPub = selected();
    const free = !state.error && !state.busy && !state.pending && !state.loading && !r.busy && !r.pending && !p.busy && !p.pending && !c.busy && !c.pending && coherent();
    state.canRetry = !!(free && state.management?.canRetry && r.resource && selectedPub && r.resource.revision === selectedPub.resourceRevision);
    state.canReviewDiscard = !!(free && state.management?.canDiscard);
    state.canDiscard = !!(state.canReviewDiscard && state.discardReview && state.discardReviewed && selectedPub && sameReview(state.discardReview, selectedPub));
    options.onChange(structuredClone(state));
  }
  function reconcile() { try { void Promise.resolve(options.onReconcile()).catch(() => {}); } catch { /* Successful command remains acknowledged. */ } }
  function poll() {
    if (disposed || timer !== undefined || !state.management || done || !['PENDING','FAILED'].includes(state.management.cleanupState)) return;
    timer = schedule(() => { timer = undefined; void refresh(); }, 5000);
  }
  function syncContext() {
    if (disposed || identityLost) return;
    const r = options.resource.getState().resource, h = options.history.getState(), id = h.selectedId;
    if (!r) { if (resourceId || publicationId) { clear(); emit(blank()); } return; }
    if (!id) { if (resourceId || publicationId) { const preserve = same(resourceId,r.id); clear(preserve); resourceId = r.id; emit(blank()); } return; }
    if (!same(resourceId,r.id) || !same(publicationId,id)) { const preserve = same(resourceId,r.id); clear(preserve); resourceId = r.id; publicationId = id;
      floor = floors.get(id.toLowerCase()) ?? 0n; done = completed.has(id.toLowerCase()); emit(blank()); }
    const p = selected(), next = p && same(p.id,id) && same(p.resourceId,r.id) ? JSON.stringify([p.revision,p.state,p.resourceId.toLowerCase(),p.classroomId.toLowerCase(),p.title,p.unitId?.toLowerCase() ?? null,p.topicId?.toLowerCase() ?? null]) : '';
    if (next !== signature) { signature = next; readEpoch++; readAbort.abort(); readAbort = new AbortController(); reading = null; stopTimer();
      emit({ management: null, loading: false, discardReview: null, discardReviewed: false }); }
    else emit({});
  }
  async function performRead(version: number, readVersion: number, id: string) {
    try {
      const value = project(await options.client.inspectPublicationManagement(id, readAbort.signal), id);
      if (!valid(version) || readVersion !== readEpoch) return;
      const p = selected();
      if (!p || !same(p.id,id) || !revision(p.revision)) throw new Error('No current inspection');
      if (BigInt(value.publicationRevision) < floor) throw new Error('Stale management');
      if (BigInt(value.publicationRevision) > BigInt(p.revision)) {
        const key = `${id.toLowerCase()}:${value.publicationRevision}`; floor = BigInt(value.publicationRevision); floors.set(id.toLowerCase(), floor);
        const notify = !reconciled.has(key); if (notify) reconciled.add(key);
        emit({ management: null, loading: false, error: 'Actualizá la preparación.', errorCode: 'CONFLICT' });
        if (notify && valid(version) && readVersion === readEpoch) reconcile(); return;
      }
      if (BigInt(value.publicationRevision) < floor || value.publicationRevision !== p.revision || (p.state === 'DISCARDED' ? value.cleanupState === 'NOT_REQUESTED' || value.canRetry || value.canDiscard : value.cleanupState !== 'NOT_REQUESTED')) throw new Error('Stale management');
      if (done && value.cleanupState !== 'DONE') throw new Error('Stale cleanup');
      floor = BigInt(value.publicationRevision); floors.set(id.toLowerCase(), floor);
      if (value.cleanupState === 'DONE') { done = true; completed.add(id.toLowerCase()); }
      emit({ management: value, loading: false, error: null, errorCode: null }); poll();
    } catch (error) {
      if (!valid(version) || readVersion !== readEpoch) return;
      const code = (error as { code?: string } | null)?.code;
      if (['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'].includes(code ?? '')) { clear(); identityLost = true; emit(blank()); return; }
      if (['FORBIDDEN','NOT_FOUND'].includes(code ?? '')) { clear(); emit({ ...blank(), error: 'La preparación no está disponible.', errorCode: code ?? null }); return; }
      emit({ loading: false, error: 'No pudimos actualizar la preparación.', errorCode: 'SERVICE_UNAVAILABLE' }); poll();
    }
  }
  function refresh(): Promise<void> {
    if (disposed || identityLost || !resourceId || !publicationId) return Promise.resolve();
    if (reading) return reading; stopTimer(); const version = epoch, currentRead = readEpoch, id = publicationId;
    let resolve!: () => void, reject!: (error: unknown) => void;
    const task = new Promise<void>((yes, no) => { resolve = yes; reject = no; }); reading = task;
    emit({ loading: true, error: null, errorCode: null });
    if (valid(version)) void performRead(version, currentRead, id).then(resolve, reject); else resolve();
    void task.finally(() => { if (reading === task) reading = null; }).catch(() => {}); return task;
  }
  async function dispatch(value: Intent) {
    const version = epoch; intent = structuredClone(value); emit({ busy: true, pending: value.action, error: null, errorCode: null });
    if (!valid(version)) return;
    try {
      const result = value.action === 'RETRY' ? await options.client.retryPublication(value.publicationId, { ...value.input }, commandAbort.signal)
        : await options.client.discardPublication(value.publicationId, { ...value.input, confirm: true }, commandAbort.signal);
      if (!valid(version)) return;
      if (!uuid(result.publicationId) || !same(result.publicationId,value.publicationId) || result.action !== value.action
        || !revision(result.publicationRevision) || BigInt(result.publicationRevision) !== BigInt(value.input.publicationRevision)+1n) throw new Error('Invalid receipt');
      const receipt = { publicationId: result.publicationId, action: value.action, publicationRevision: result.publicationRevision };
      floor = floor > BigInt(receipt.publicationRevision) ? floor : BigInt(receipt.publicationRevision); floors.set(value.publicationId.toLowerCase(), floor);
      intent = null; emit({ busy: false, pending: null, receipt, management: null, discardReview: null, discardReviewed: false });
      if (valid(version)) reconcile(); return 'applied' as const;
    } catch (error) {
      if (!valid(version)) return;
      const e = error as { code?: string; status?: number };
      if (['AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED'].includes(e.code ?? '')) { clear(); identityLost = true; emit(blank()); return 'unavailable' as const; }
      if (['FORBIDDEN','NOT_FOUND'].includes(e.code ?? '')) { clear(); emit({ ...blank(), error: 'La preparación no está disponible.', errorCode: e.code ?? null }); return 'unavailable' as const; }
      if (e.status === 400 || e.status === 409 || ['INVALID_INPUT','CONFLICT','CSRF_INVALID','ORIGIN_NOT_ALLOWED'].includes(e.code ?? '')) {
        intent = null; emit({ busy: false, pending: null, management: null, discardReview: null, discardReviewed: false, error: 'Actualizá la preparación.', errorCode: e.code ?? 'CONFLICT' }); if (valid(version)) reconcile(); return 'conflict' as const;
      }
      emit({ busy: false, error: 'No pudimos confirmar la solicitud.', errorCode: 'SERVICE_UNAVAILABLE' }); return 'uncertain' as const;
    }
  }
  function run(value: Intent) {
    if (writing) return writing;
    let resolve!: (value: unknown) => void, reject!: (error: unknown) => void;
    const task = new Promise<unknown>((yes, no) => { resolve = yes; reject = no; }); writing = task;
    void task.finally(() => { if (writing === task) writing = null; }).catch(() => {});
    if (valid(epoch)) void dispatch(value).then(resolve, reject); else resolve(undefined);
    return task;
  }
  return {
    getState: () => structuredClone(state), syncContext, refresh,
    retryPreparation() { if (writing) return writing; if (!state.canRetry || !freeNow() || !state.management || !resourceId) return;
      return run({ resourceId, publicationId, action: 'RETRY', input: { requestId: options.uuid ? options.uuid() : crypto.randomUUID(), publicationRevision: state.management.publicationRevision } }); },
    reviewDiscard() { const p = selected(); if (state.canReviewDiscard && freeNow() && p) emit({ discardReview: { ...p }, discardReviewed: false }); },
    setDiscardReviewed(value: boolean) { if (!state.pending && state.discardReview && freeNow() && selected() && sameReview(state.discardReview, selected()!)) emit({ discardReviewed: value === true }); },
    cancelDiscardReview() { if (!state.pending) emit({ discardReview: null, discardReviewed: false }); },
    discard() { if (writing) return writing; if (!state.canDiscard || !freeNow() || !state.management || !state.discardReview || !selected() || !sameReview(state.discardReview, selected()!)) return;
      return run({ resourceId, publicationId, action: 'DISCARD', input: { requestId: options.uuid ? options.uuid() : crypto.randomUUID(), publicationRevision: state.management.publicationRevision, confirm: true } }); },
    retryRequest() { if (valid(epoch) && intent && !state.busy) return run(intent); },
    dispose() { if (!disposed) { clear(); state = blank(); disposed = true; } },
  };
}
