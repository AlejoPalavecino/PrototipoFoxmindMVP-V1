import type { Detail } from '../../../classrooms-ui/api.ts';
import type { ConfirmFoxyPublication, FoxyPublicationConfirmation, FoxyPublicationSummary } from '../../../../src/core/domain/index.ts';
import type { WebFoxyClient } from './foxy-client.ts';
import type { createFoxyResourceController } from './foxy-resource-controller.ts';
import type { createFoxyPreparationController } from './foxy-preparation-controller.ts';
import type { createFoxyPublicationHistoryController } from './foxy-publication-history-controller.ts';

type Review = { publication: FoxyPublicationSummary; classroomRevision: string; classroomName: string; unitName: string | null; topicName: string | null };
type State = { review: Review | null; reviewed: boolean; reviewing: boolean; busy: boolean; pending: 'CONFIRM' | null;
  canReview: boolean; canConfirm: boolean; receipt: FoxyPublicationConfirmation | null; error: string | null; errorCode: string | null };
type Options = { client: Pick<WebFoxyClient, 'getResource' | 'inspectPublication' | 'confirmPublication'>;
  resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>;
  preparation: Pick<ReturnType<typeof createFoxyPreparationController>, 'getState'>;
  history: Pick<ReturnType<typeof createFoxyPublicationHistoryController>, 'getState'>;
  loadClassroom: (id: string, signal: AbortSignal) => Promise<Detail>; onChange: (state: State) => void; uuid?: () => string };
const blank = (): State => ({ review: null, reviewed: false, reviewing: false, busy: false, pending: null,
  canReview: false, canConfirm: false, receipt: null, error: null, errorCode: null });
const same = (a: string, b: string) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const uuid = (v: unknown): v is string => typeof v === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(v);
const revision = (v: unknown): v is string => typeof v === 'string' && /^(0|[1-9][0-9]{0,18})$/u.test(v) && BigInt(v) <= 9223372036854775807n;
function unique<T extends { id?: string }>(items: T[], id: string): T | null {
  const found = items.filter(x => x.id && same(x.id, id)); return found.length === 1 ? found[0]! : null;
}
export function createFoxyPublicationConfirmationController(options: Options) {
  let state = blank(), disposed = false, identityLost = false, epoch = 0, abort = new AbortController(), signature = '';
  const classroomFloor = new Map<string, bigint>();
  let intent: { id: string; resourceId: string; input: ConfirmFoxyPublication } | null = null, task: Promise<unknown> | null = null;
  function eligible() {
    const editor = options.resource.getState(), history = options.history.getState(), prep = options.preparation.getState();
    const p = history.inspection?.publication;
    const newerHistory = history.items?.find(item => p && same(item.id, p.id) &&
      (BigInt(item.revision) > BigInt(p.revision) || (item.state === 'PUBLISHED' && p.state !== 'PUBLISHED')));
    const prepared = prep.result;
    const newerPreparation = prepared && p && same(prepared.id, p.id) &&
      (BigInt(prepared.revision) > BigInt(p.revision) || (prepared.state === 'PUBLISHED' && p.state !== 'PUBLISHED'));
    return !history.inspectionError && !history.inspectionLoading && !newerHistory && !newerPreparation && !!editor.resource && !editor.dirty && !editor.busy && !editor.pending && !editor.conflict && editor.errorCode !== 'CONFLICT'
      && !prep.busy && !prep.pending && !!p && !!history.selectedId && same(p.id, history.selectedId)
      && same(p.resourceId, editor.resource.id) && p.resourceRevision === editor.resource.revision && p.state === 'READY' && !history.staleResource;
  }
  function context() {
    const editor = options.resource.getState(), history = options.history.getState(), prep = options.preparation.getState();
    return JSON.stringify([editor.resource?.id, editor.resource?.revision, editor.dirty, editor.busy, editor.pending, editor.conflict,
      editor.errorCode, history.selectedId, history.staleResource, history.inspectionError, prep.busy, prep.pending, prep.metadata, prep.destination, prep.result]);
  }
  function reviewAdvanced(): boolean {
    const review = state.review, history = options.history.getState();
    if (!review) return false;
    const inspected = history.inspection, selected = history.items?.find(item => same(item.id, review.publication.id));
    if (inspected && same(inspected.publication.id, review.publication.id)) {
      if (BigInt(inspected.classroomRevision) > BigInt(review.classroomRevision) || inspected.classroomArchived
        || BigInt(inspected.publication.revision) > BigInt(review.publication.revision)
        || inspected.publication.state !== 'READY') return true;
    }
    return !!selected && (BigInt(selected.revision) > BigInt(review.publication.revision) || selected.state !== 'READY');
  }
  function emit(patch: Partial<State>) {
    if (disposed) return;
    state = { ...state, ...patch }; state.canReview = !identityLost && !state.receipt && !state.busy && !state.pending && !state.reviewing && eligible();
    state.canConfirm = state.canReview && !!state.review && state.reviewed && !state.receipt;
    options.onChange(structuredClone(state));
  }
  function resetEpoch() { epoch++; abort.abort(); abort = new AbortController(); task = null; }
  const current = (version: number) => !disposed && version === epoch && !abort.signal.aborted;
  function lose(error: unknown) {
    const code = (error as { code?: string } | null)?.code ?? 'SERVICE_UNAVAILABLE';
    identityLost ||= code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED';
    resetEpoch(); intent = null; signature = ''; classroomFloor.clear(); emit({ ...blank(), errorCode: code, error: 'El recurso o aula no está disponible.' });
  }
  async function dispatch(value: { id: string; resourceId: string; input: ConfirmFoxyPublication }) {
    const version = epoch; intent = { id: value.id, resourceId: value.resourceId, input: { ...value.input } };
    emit({ busy: true, pending: 'CONFIRM', error: null, errorCode: null });
    try {
      const receipt = await options.client.confirmPublication(value.id, { ...value.input }, abort.signal);
      if (!current(version)) return;
      syncContext(); if (!current(version)) return;
      if (!uuid(receipt.publicationId) || !same(receipt.publicationId, value.id) || !uuid(receipt.materialId)
        || !revision(receipt.publicationRevision) || !revision(receipt.classroomRevision)
        || BigInt(receipt.publicationRevision) !== BigInt(value.input.publicationRevision) + 1n
        || BigInt(receipt.classroomRevision) !== BigInt(value.input.classroomRevision) + 1n) throw new Error('Invalid receipt');
      intent = null; emit({ busy: false, pending: null, receipt: { publicationId: receipt.publicationId, materialId: receipt.materialId, publicationRevision: receipt.publicationRevision, classroomRevision: receipt.classroomRevision } }); return 'confirmed' as const;
    } catch (error) {
      if (!current(version)) return;
      syncContext(); if (!current(version)) return;
      const e = error as { code?: string; status?: number };
      if (['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes(e.code ?? '')) { lose(error); return; }
      if (e.status === 409 || e.status === 400 || ['CONFLICT', 'INVALID_INPUT', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED'].includes(e.code ?? '')) {
        intent = null; emit({ busy: false, pending: null, review: null, reviewed: false, errorCode: e.code ?? 'CONFLICT', error: 'Revisá nuevamente la publicación.' }); return 'conflict' as const;
      }
      emit({ busy: false, errorCode: e.code ?? 'SERVICE_UNAVAILABLE', error: 'No pudimos confirmar la publicación.' }); return 'uncertain' as const;
    }
  }
  function run(value: { id: string; resourceId: string; input: ConfirmFoxyPublication }) {
    if (task) return task;
    const running = dispatch(value); task = running; void running.finally(() => { if (task === running) task = null; }); return running;
  }
  function syncContext() {
      if (disposed || identityLost) return;
      const next = context(), resource = options.resource.getState().resource, selected = options.history.getState().selectedId;
      if (intent && (!resource || !selected || !same(resource.id, intent.resourceId) || !same(selected, intent.id))) {
        resetEpoch(); intent = null; emit(blank());
      }
      if (!intent && ((signature && signature !== next) || (!state.receipt && reviewAdvanced()))) { resetEpoch(); emit({ ...blank() }); }
      signature = next; emit({});
  }
  return {
    getState: () => structuredClone(state),
    syncContext,
    async review() {
      if (disposed || identityLost || state.busy || state.pending || state.reviewing || state.receipt || !eligible()) return;
      const version = epoch, before = context(), editor = options.resource.getState().resource!, p = options.history.getState().inspection!.publication;
      emit({ reviewing: true, review: null, reviewed: false, error: null, errorCode: null });
      try {
        const [resource, inspection, classroom] = await Promise.all([options.client.getResource(editor.id, abort.signal),
          options.client.inspectPublication(p.id, abort.signal), options.loadClassroom(p.classroomId, abort.signal)]);
        if (!current(version)) return;
        if (before !== context()) { syncContext(); if (current(version)) emit({ reviewing: false, review: null, reviewed: false }); return; }
        const pub = inspection.publication, unit = pub.unitId ? unique(classroom.units, pub.unitId) : null;
        const topic = pub.topicId && unit ? unique(unit.topics, pub.topicId) : null;
        if (!same(resource.id, editor.id) || !same(resource.conversationId, editor.conversationId) || !same(resource.sourceTurnId, editor.sourceTurnId)
          || resource.revision !== editor.revision || !same(pub.id, p.id) || !same(pub.resourceId, resource.id) || pub.resourceRevision !== resource.revision
          || !same(pub.classroomId, p.classroomId) || pub.title !== p.title || pub.unitId !== p.unitId || pub.topicId !== p.topicId
          || !revision(pub.revision) || !revision(p.revision) || BigInt(pub.revision) < BigInt(p.revision) || BigInt(pub.revision) >= 9223372036854775807n
          || !revision(inspection.classroomRevision) || !revision(options.history.getState().inspection!.classroomRevision)
          || BigInt(inspection.classroomRevision) < BigInt(options.history.getState().inspection!.classroomRevision)
          || pub.state !== 'READY' || !same(pub.classroomId, classroom.id) || classroom.role !== 'teacher' || classroom.archived || inspection.classroomArchived
          || BigInt(inspection.classroomRevision) < (classroomFloor.get(classroom.id.toLowerCase()) ?? 0n)
          || BigInt(inspection.classroomRevision) >= 9223372036854775807n || classroom.revision !== inspection.classroomRevision || (!!pub.unitId && !unit) || (!!pub.topicId && !topic)) throw new Error('Review unavailable');
        classroomFloor.set(classroom.id.toLowerCase(), BigInt(classroom.revision));
        emit({ reviewing: false, review: { publication: { ...pub }, classroomRevision: classroom.revision, classroomName: classroom.name,
          unitName: unit?.name ?? null, topicName: topic?.name ?? null } });
      } catch (error) {
        if (current(version) && before !== context()) { syncContext(); if (current(version)) emit({ reviewing: false, review: null, reviewed: false }); return; }
        if (current(version)) {
          const code = (error as { code?: string } | null)?.code;
          if (['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes(code ?? '')) lose(error);
          else emit({ reviewing: false, error: 'No pudimos revisar la publicación.', errorCode: code ?? 'SERVICE_UNAVAILABLE' });
        }
      }
    },
    setReviewed(value: boolean) { if (!disposed && !state.busy && !state.pending && state.review) emit({ reviewed: value === true }); },
    confirm() {
      if (task) return task;
      syncContext();
      if (disposed || !state.canConfirm || !state.review) return;
      const review = state.review;
      return run({ id: review.publication.id, resourceId: review.publication.resourceId, input: { requestId: options.uuid ? options.uuid() : crypto.randomUUID(),
        publicationRevision: review.publication.revision, classroomRevision: review.classroomRevision, confirm: true } });
    },
    retry() { if (!disposed) { syncContext(); if (intent && !state.busy) return run(intent); } },
    reset() { if (!disposed && !intent) { resetEpoch(); intent = null; signature = ''; emit(blank()); } },
    dispose() { if (!disposed) { resetEpoch(); intent = null; classroomFloor.clear(); state = blank(); disposed = true; } },
  };
}
