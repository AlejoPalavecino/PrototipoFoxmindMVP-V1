import type { Detail } from '../model/classroom-port.ts';
import type { PrepareFoxyPublication, FoxyPublicationSummary } from '../../../../../../src/core/domain/foxy/resource.ts';
import type { WebFoxyClient } from '../api/foxy-client.ts';
import type { createFoxyResourceController } from './foxy-resource-controller.ts';

type Metadata = { title: string; unitId: string | null; topicId: string | null };
type State = { destination: Detail | null; metadata: Metadata; canPrepare: boolean; busy: boolean;
  pending: 'PREPARE' | null; result: FoxyPublicationSummary | null; error: string | null; errorCode: string | null };
type Options = { client: Pick<WebFoxyClient, 'preparePublication'>; resource: Pick<ReturnType<typeof createFoxyResourceController>, 'getState'>;
  loadClassroom: (id: string, signal: AbortSignal) => Promise<Detail>; onChange: (state: State) => void; uuid?: () => string };
const initial = (): State => ({ destination: null, metadata: { title: '', unitId: null, topicId: null },
  canPrepare: false, busy: false, pending: null, result: null, error: null, errorCode: null });
const uuid = (value: unknown): value is string => typeof value === 'string' && /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value);
const same = (a: string, b: string) => a.toLowerCase() === b.toLowerCase();
const validTitle = (v: string) => !!v.trim() && [...v].length <= 200 && !/[\u0000-\u001f\u007f-\u009f]/u.test(v);
function unique<T extends { id?: string }>(items: T[], id: string | null): T | null {
  if (!uuid(id)) return null;
  const matches = items.filter(item => uuid(item.id) && same(item.id, id));
  return matches.length === 1 ? matches[0]! : null;
}
export function createFoxyPreparationController(options: Options) {
  let state = initial(), disposed = false, epoch = 0, abort = new AbortController();
  let identityLost = false;
  let resourceId: string | null = null, intent: { id: string; input: PrepareFoxyPublication } | null = null;
  let inFlight: Promise<unknown> | null = null;
  function canPrepare() {
    const editor = options.resource.getState(), resource = editor.resource, dest = state.destination;
    return !identityLost && !!resource && !!resourceId && same(resource.id, resourceId) && !editor.dirty && !editor.busy && !editor.pending && !editor.conflict && editor.errorCode !== 'CONFLICT'
      && !!dest && dest.role === 'teacher' && !dest.archived && !state.busy && !state.pending && validTitle(state.metadata.title);
  }
  function emit(patch: Partial<State>) {
    if (disposed) return;
    state = { ...state, ...patch }; state.canPrepare = canPrepare(); options.onChange(structuredClone(state));
  }
  function resetEpoch() { epoch++; abort.abort(); abort = new AbortController(); inFlight = null; }
  const current = (version: number) => !disposed && version === epoch && !abort.signal.aborted;
  function revoke(code: string) {
    const auth = code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED';
    resetEpoch(); intent = null; identityLost ||= auth;
    if (auth) resourceId = null;
    emit({ ...initial(), metadata: auth ? initial().metadata : { ...initial().metadata, title: state.metadata.title },
      errorCode: code, error: 'El recurso o aula no está disponible.' });
  }
  async function dispatch(value: { id: string; input: PrepareFoxyPublication }) {
    const version = epoch; intent = { id: value.id, input: { ...value.input } };
    emit({ busy: true, pending: 'PREPARE', error: null, errorCode: null });
    try {
      const response = await options.client.preparePublication(value.id, { ...value.input }, abort.signal);
      if (!current(version)) return;
      const p = response.publication, input = value.input;
      if (!same(p.resourceId, value.id) || p.resourceRevision !== input.resourceRevision || !same(p.classroomId, input.classroomId)) throw new Error('Invalid publication identity');
      intent = null; emit({ busy: false, pending: null, result: { ...p } }); return 'prepared' as const;
    } catch (error) {
      if (!current(version)) return;
      const failure = error as { code?: string; status?: number };
      if (['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes(failure.code ?? '')) {
        revoke(failure.code!); return;
      }
      if (failure.status === 400 || failure.status === 409 || ['INVALID_INPUT', 'CONFLICT', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED'].includes(failure.code ?? '')) {
        intent = null; emit({ busy: false, pending: null, errorCode: failure.code ?? 'INVALID_INPUT', error: 'No pudimos preparar el recurso.' }); return 'invalid' as const;
      }
      emit({ busy: false, errorCode: failure.code ?? 'SERVICE_UNAVAILABLE', error: 'No pudimos confirmar la preparación.' }); return 'uncertain' as const;
    }
  }
  function run(value: { id: string; input: PrepareFoxyPublication }) {
    if (inFlight) return inFlight;
    const task = dispatch(value); inFlight = task;
    void task.finally(() => { if (inFlight === task) inFlight = null; }); return task;
  }
  return {
    getState: () => structuredClone(state),
    syncResource() {
      if (disposed || identityLost) return;
      const resource = options.resource.getState().resource;
      if (!resource || !resourceId || !same(resource.id, resourceId)) {
        resetEpoch(); intent = null; resourceId = resource?.id ?? null;
        emit({ ...initial(), metadata: { ...initial().metadata, title: resource?.title ?? '' } });
      } else emit({});
    },
    async selectDestination(id: string) {
      if (disposed || identityLost || state.busy || state.pending || !uuid(id)) return;
      const version = ++epoch; abort.abort(); abort = new AbortController();
      emit({ destination: null, metadata: { ...state.metadata, unitId: null, topicId: null }, result: null, error: null });
      try {
        const detail = await options.loadClassroom(id, abort.signal);
        if (current(version) && uuid(detail.id) && same(detail.id, id) && detail.role === 'teacher') emit({ destination: structuredClone(detail) });
      } catch (error) {
        if (current(version)) {
          const code = (error as { code?: string } | null)?.code;
          if (['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN', 'NOT_FOUND'].includes(code ?? '')) {
            revoke(code!);
          } else emit({ error: 'No pudimos cargar el aula.' });
        }
      }
    },
    setTitle(title: string) { if (!disposed && !state.busy && !state.pending) emit({ metadata: { ...state.metadata, title } }); },
    selectUnit(id: string | null) {
      if (disposed || state.busy || state.pending) return;
      const unit = state.destination && unique(state.destination.units, id);
      emit({ metadata: { ...state.metadata, unitId: unit?.id ?? null, topicId: null } });
    },
    selectTopic(id: string | null) {
      if (disposed || state.busy || state.pending) return;
      const unit = state.destination && unique(state.destination.units, state.metadata.unitId);
      const topic = unit && unique(unit.topics, id);
      emit({ metadata: { ...state.metadata, topicId: topic?.id ?? null } });
    },
    prepare() {
      if (inFlight) return inFlight;
      if (disposed || !canPrepare()) return;
      const resource = options.resource.getState().resource!, destination = state.destination!;
      const input: PrepareFoxyPublication = { requestId: options.uuid ? options.uuid() : crypto.randomUUID(), resourceRevision: resource.revision,
        classroomId: destination.id, ...state.metadata };
      return run({ id: resource.id, input });
    },
    retry() { if (!disposed && intent && !state.busy) return run(intent); },
    reset() { if (!disposed) { resetEpoch(); intent = null; resourceId = null; emit(initial()); } },
    dispose() { if (!disposed) { resetEpoch(); intent = null; resourceId = null; state = initial(); disposed = true; } },
  };
}
