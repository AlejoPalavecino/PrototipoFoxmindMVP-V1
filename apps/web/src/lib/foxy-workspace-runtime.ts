import type { Classroom, Detail } from '../../../classrooms-ui/api.ts';
import type { createWebClassroomClient } from './classroom-client.ts';
import type { WebFoxyClient } from './foxy-client.ts';
import { createFoxyChatController } from './foxy-chat-controller.ts';
import { createFoxyResourceController } from './foxy-resource-controller.ts';
import { createFoxyPreparationController } from './foxy-preparation-controller.ts';
import { createFoxyPublicationHistoryController } from './foxy-publication-history-controller.ts';
import { createFoxyPublicationConfirmationController } from './foxy-publication-confirmation-controller.ts';

type Snapshot = { subjectId: string; closed: boolean; classrooms: Classroom[]; classroomsError: string | null;
  chat: ReturnType<ReturnType<typeof createFoxyChatController>['getState']> | null;
  resource: ReturnType<ReturnType<typeof createFoxyResourceController>['getState']> | null;
  preparation: ReturnType<ReturnType<typeof createFoxyPreparationController>['getState']> | null;
  history: ReturnType<ReturnType<typeof createFoxyPublicationHistoryController>['getState']> | null;
  confirmation: ReturnType<ReturnType<typeof createFoxyPublicationConfirmationController>['getState']> | null };
type Options = { subjectId: string; createFoxyClient: (identity: (code: string) => void) => WebFoxyClient;
  createClassroomClient: (identity: (code: string) => void) => ReturnType<typeof createWebClassroomClient>;
  onChange: (snapshot: Snapshot) => void; onIdentityRequired: (code: string) => void };
export function createFoxyWorkspaceRuntime(options: Options) {
  let closed = false, depth = 0, dirty = false, initialized: Promise<void> | null = null, classrooms: Classroom[] = [], classroomsError: string | null = null;
  const subjectId = options.subjectId;
  let receiptStamp = '', abort = new AbortController(), classroomEpoch = 0, contextEpoch = 0;
  let resourceKey = '', selectedKey = '';
  const identity = (code: string) => { if (!closed && (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED')) { dispose(); options.onIdentityRequired(code); } };
  const client = options.createFoxyClient(identity), classroomClient = options.createClassroomClient(identity);
  function snapshot(): Snapshot {
    return structuredClone({ subjectId, closed, classrooms: structuredClone(classrooms), classroomsError,
      chat: closed ? null : chat.getState(), resource: closed ? null : resource.getState(), preparation: closed ? null : preparation.getState(),
      history: closed ? null : history.getState(), confirmation: closed ? null : confirmation.getState() });
  }
  function batch(fn: () => void) {
    if (closed) return; depth++;
    try { fn(); dirty = true; } finally { depth--; if (!depth && dirty && !closed) { dirty = false; options.onChange(snapshot()); } }
  }
  async function loadClassroom(id: string, signal?: AbortSignal): Promise<Detail | undefined> {
    if (closed) return;
    const combined = signal ? AbortSignal.any([signal, abort.signal]) : abort.signal;
    const detail = await classroomClient.call<Detail>(`/${id}`, 'GET', undefined, combined);
    return closed || combined.aborted ? undefined : structuredClone(detail);
  }
  const loadDetail = async (id: string, signal: AbortSignal): Promise<Detail> => {
    const detail = await loadClassroom(id, signal); if (!detail) throw new Error('Closed'); return detail;
  };
  const chatBase = createFoxyChatController({ client, onChange: () => batch(() => {}) });
  const emptyChat = structuredClone(chatBase.getState());
  const chat = { ...chatBase, getState: () => structuredClone(closed ? emptyChat : chatBase.getState()) };
  const resourceBase = createFoxyResourceController({ client, onChange: value => batch(() => {
    const next = value.resource?.id.toLowerCase() ?? ''; if (next !== resourceKey) { resourceKey = next; contextEpoch++; }
    preparation.syncResource(); history.syncResource(); confirmation.syncContext();
  }) });
  const preparation = createFoxyPreparationController({ client, resource: resourceBase, loadClassroom: loadDetail, onChange: () => batch(() => {
    void history.syncPreparation(); confirmation.syncContext();
  }) });
  const history = createFoxyPublicationHistoryController({ client, resource: resourceBase, preparation, onChange: value => batch(() => {
    const next = value.selectedId?.toLowerCase() ?? ''; if (next !== selectedKey) { selectedKey = next; contextEpoch++; }
    confirmation.syncContext();
  }) });
  const confirmation = createFoxyPublicationConfirmationController({ client, resource: resourceBase, preparation, history, loadClassroom: loadDetail, onChange: () => batch(() => {
    const receipt = confirmation.getState().receipt, resourceId = resourceBase.getState().resource?.id, selected = history.getState().selectedId;
    if (receipt && resourceId && selected && receipt.publicationId.toLowerCase() === selected.toLowerCase()) {
      const stamp = `${resourceId}:${receipt.publicationId}:${receipt.publicationRevision}:${receipt.classroomRevision}`;
      if (stamp !== receiptStamp) {
        receiptStamp = stamp; const version = contextEpoch;
        queueMicrotask(() => { if (!closed && version === contextEpoch && resourceBase.getState().resource?.id === resourceId && history.getState().selectedId === selected) {
          void history.refreshSelected(); void history.refreshList();
        } });
      }
    }
  }) });
  const resource = { ...resourceBase, async open(conversationId: string, turnId: string) {
    const result = await resourceBase.open(conversationId, turnId);
    if (!closed && result === 'opened') await history.refreshList(); return result;
  } };
  async function reloadClassrooms() {
    if (closed) return;
    const version = ++classroomEpoch;
    try {
      const data = await classroomClient.call<{ teach: Classroom[] }>('', 'GET', undefined, abort.signal);
      if (!closed && version === classroomEpoch) batch(() => { classrooms = data.teach.filter(room => room.role === 'teacher' && !room.archived); classroomsError = null; });
    } catch { if (!closed && version === classroomEpoch) batch(() => { classrooms = []; classroomsError = 'No pudimos cargar tus aulas.'; }); }
  }
  function dispose() {
    if (closed) return; closed = true; abort.abort(); classrooms = []; classroomsError = null;
    chat.dispose(); resourceBase.dispose(); preparation.dispose(); history.dispose(); confirmation.dispose();
  }
  return { getState: snapshot, chat, resource, preparation, history, confirmation, loadClassroom, reloadClassrooms,
    init() { if (closed) return Promise.resolve(); if (!initialized) initialized = Promise.resolve().then(async () => { if (!closed) await Promise.all([chat.init(), reloadClassrooms()]); }); return initialized; }, dispose };
}
