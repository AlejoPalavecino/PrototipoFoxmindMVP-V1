import { parseFoxyActivityPayload, type FoxyActivityPayload, type FoxyActivityDraftInput, type FoxyActivityDraftReceipt } from '../../../../../../src/core/domain/foxy/foxy-activity-draft.ts';
import type { Detail } from './classroom-port.ts';
type Source = { resource: { id: string; revision: string } | null; dirty: boolean; busy: boolean; pending: unknown };
type Destination = Pick<Detail, 'id' | 'role' | 'archived' | 'revision' | 'units'>;
type State = { review: { sourceId: string; input: FoxyActivityDraftInput } | null; busy: boolean; pending: boolean;
  receipt: FoxyActivityDraftReceipt | null; error: string | null };
export function createFoxyActivityHandoff(options: { source: () => Source; prepare: (id: string, input: FoxyActivityDraftInput, signal?: AbortSignal) => Promise<FoxyActivityDraftReceipt>;
  onChange: (state: State) => void; uuid?: () => string }) {
  let state: State = { review: null, busy: false, pending: false, receipt: null, error: null }, disposed = false, epoch = 0;
  const abort = new AbortController();
  const emit = (patch: Partial<State>) => { if (!disposed) { state = { ...state, ...patch }; options.onChange(structuredClone(state)); } };
  const clean = () => { const s = options.source(); return !s.dirty && !s.busy && !s.pending ? s.resource : null; };
  async function send() {
    if (disposed || state.busy || !state.review) return;
    const review = state.review, source = clean(), version = epoch;
    if (!source || source.id !== review.sourceId || source.revision !== review.input.resourceRevision) {
      emit({ review: null, pending: false, error: 'El recurso cambió. Revisá la versión guardada antes de continuar.' }); return;
    }
    emit({ busy: true, pending: true, error: null });
    try {
      const receipt = await options.prepare(review.sourceId, structuredClone(review.input), abort.signal);
      if (disposed || version !== epoch) return;
      if (!receipt || receipt.classroomId !== review.input.classroomId || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(receipt.activityId)
        || !/^(0|[1-9]\d{0,17})$/u.test(receipt.revision)) throw new Error('Invalid receipt');
      emit({ receipt, pending: false, busy: false });
    } catch (error) {
      if (disposed || version !== epoch) return;
      const known = ['INVALID_INPUT', 'CONFLICT', 'FORBIDDEN', 'NOT_FOUND', 'AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED'].includes((error as { code?: string })?.code ?? '');
      emit({ busy: false, pending: !known, ...(known ? { review: null } : {}),
        error: known ? 'El recurso o el aula cambió. Actualizá el destino y volvé a revisar.' : 'No pudimos confirmar el resultado. Reintentá la misma solicitud para evitar duplicados.' });
    }
  }
  return {
    getState: () => structuredClone(state),
    review(room: Destination, input: FoxyActivityPayload): boolean {
      if (disposed || state.busy || state.pending) return false;
      const source = clean(); if (!source || room.role !== 'teacher' || room.archived) return false;
      let payload: FoxyActivityPayload;
      try { payload = parseFoxyActivityPayload(input); } catch { emit({ error: 'Completá el contenido y una rúbrica cuyos pesos sumen 100%.' }); return false; }
      const unit = room.units.find(item => item.id === payload.unitId);
      if (!unit || payload.topicIds.some(id => !unit.topics.some(topic => topic.id === id))) return false;
      emit({ review: { sourceId: source.id, input: { requestId: (options.uuid ?? (() => crypto.randomUUID()))(), resourceRevision: source.revision,
        classroomId: room.id, classroomRevision: room.revision, payload } }, receipt: null, error: null }); return true;
    },
    confirm: () => state.pending || state.receipt ? undefined : send(),
    retry: () => state.pending ? send() : undefined,
    reset() { if (!state.busy && !state.pending) emit({ review: null, receipt: null, error: null }); },
    discard() { epoch++; emit({ review: null, receipt: null, error: null, busy: false, pending: false }); },
    dispose() { disposed = true; abort.abort(); },
  };
}
