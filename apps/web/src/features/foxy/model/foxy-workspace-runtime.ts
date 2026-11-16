import type { FoxyClassroomReadPort } from './classroom-port.ts';
import { createFoxyActivityHandoff } from './foxy-activity-handoff.ts';
import type { Classroom, Detail } from './classroom-port.ts';
import type { WebFoxyClient } from '../api/foxy-client.ts';
import { createFoxyChatController } from './foxy-chat-controller.ts';
import { createFoxyVisualController } from './foxy-visual-controller.ts';
import { createFoxyVisualEditorController } from './foxy-visual-editor-controller.ts';
import { createFoxyVisualPublicationController } from './foxy-visual-publication-controller.ts';
import { createFoxyResourceController } from './foxy-resource-controller.ts';
import { createFoxyPreparationController } from './foxy-preparation-controller.ts';
import { createFoxyPublicationHistoryController } from './foxy-publication-history-controller.ts';
import { createFoxyPublicationConfirmationController } from './foxy-publication-confirmation-controller.ts';
import { createFoxyPublicationManagementController } from './foxy-publication-management-controller.ts';

type Snapshot = { activityHandoff: ReturnType<ReturnType<typeof createFoxyActivityHandoff>['getState']> | null; subjectId: string; closed: boolean; classrooms: Classroom[]; contextClassrooms: Classroom[]; classroomsError: string | null;
  chat: ReturnType<ReturnType<typeof createFoxyChatController>['getState']> | null;
  resource: ReturnType<ReturnType<typeof createFoxyResourceController>['getState']> | null;
  preparation: ReturnType<ReturnType<typeof createFoxyPreparationController>['getState']> | null;
  history: ReturnType<ReturnType<typeof createFoxyPublicationHistoryController>['getState']> | null;
  confirmation: ReturnType<ReturnType<typeof createFoxyPublicationConfirmationController>['getState']> | null;
  management: ReturnType<ReturnType<typeof createFoxyPublicationManagementController>['getState']> | null;
  visual: ReturnType<ReturnType<typeof createFoxyVisualController>['getState']> | null;
  visualEditor: ReturnType<ReturnType<typeof createFoxyVisualEditorController>['getState']> | null;
  visualPublication: ReturnType<ReturnType<typeof createFoxyVisualPublicationController>['getState']> | null };
type Options = { subjectId: string; createFoxyClient: (identity: (code: string) => void) => WebFoxyClient;
  createClassroomClient: (identity: (code: string) => void) => FoxyClassroomReadPort;
  onChange: (snapshot: Snapshot) => void; onIdentityRequired: (code: string) => void };
export function createFoxyWorkspaceRuntime(options: Options) {
  let closed = false, depth = 0, dirty = false, initialized: Promise<void> | null = null, classrooms: Classroom[] = [], classroomsError: string | null = null;
  const subjectId = options.subjectId;
  let contextClassrooms: Classroom[] = [];
  let receiptStamp = '', abort = new AbortController(), classroomEpoch = 0, contextEpoch = 0;
  let resourceKey = '', selectedKey = '', managementStamp = '', reconcilePending = false, reconcileVersion = -1, reconcileQueued = false;
  const identity = (code: string) => { if (!closed && (code === 'AUTH_REQUIRED' || code === 'EMAIL_VERIFICATION_REQUIRED')) { dispose(); options.onIdentityRequired(code); } };
  const client = options.createFoxyClient(identity), classroomClient = options.createClassroomClient(identity);
  let visual: ReturnType<typeof createFoxyVisualController> | undefined, visualAssetKey = '';
  function snapshot(): Snapshot {
    return structuredClone({ activityHandoff: closed ? null : activityHandoff.getState(), subjectId, closed, classrooms: structuredClone(classrooms), contextClassrooms: structuredClone(contextClassrooms), classroomsError,
      chat: closed ? null : chat.getState(), resource: closed ? null : resource.getState(), preparation: closed ? null : preparation.getState(),
      history: closed ? null : history.getState(), confirmation: closed ? null : confirmation.getState(), management: closed ? null : management.getState(), visual: closed ? null : visual?.getState() ?? null,
      visualEditor: closed ? null : visualEditor.getState(), visualPublication: closed ? null : visualPublication.getState() });
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
  const visualPublication = createFoxyVisualPublicationController({ client, loadClassroom: loadDetail, onChange: () => batch(() => { syncVisualAsset(); }) });
  const visualEditor = createFoxyVisualEditorController({client,onChange:editor=>batch(()=>{
    const info=editor.inspection,publication=visualPublication.getState();
    if(publication.busy||publication.pending)return;
    if(info?.canPreview&&info.asset.id===editor.assetId&&info.asset.state==='READY')visualPublication.syncAsset(info.asset.id,info.asset.revision,info.editorial?.revision??'0',info.editorial?.title??info.payload?.title??'');
    else visualPublication.syncAsset('','');
  })});
  function syncVisualAsset() {
    const pending=visualPublication.getState(); if (pending.busy || pending.pending) return;
    const s=visual?.getState(), job=s?.jobs.find(item => item.id===s.selectedId && item.state==='READY'), id=job?.assetId ?? '';
    if (id===visualAssetKey) return; visualAssetKey=id;
    visualPublication.syncAsset('', ''); visualEditor.syncAsset(id);
  }
  const chatBase = createFoxyChatController({ client, onChange: () => batch(() => { visual?.syncContext(); }) });
  const emptyChat = structuredClone(chatBase.getState());
  const chat = { ...chatBase, getState: () => structuredClone(closed ? emptyChat : chatBase.getState()),
    send: (...args: Parameters<typeof chatBase.send>) => visual?.getState().pending || visual?.getState().busy ? undefined : chatBase.send(...args) };
  visual = createFoxyVisualController({ client, onChange: () => batch(() => { syncVisualAsset(); }),
    current: () => { const state = chatBase.getState(); return { conversation: state.current, selection: state.selection, busy: state.busy || !!state.activeTurn || !!state.pending,
      canGenerate: state.current?.context.kind !== 'CLASSROOM' || !!state.curriculum?.canGenerate,
      enabled: { IMAGE: !!state.capabilities?.imageGeneration.enabled, DIAGRAM: !!state.capabilities?.diagramGeneration.enabled } }; },
    onRevision: (id, expected, revision) => chatBase.adoptVisualRevision(id,expected,revision) });
  const resourceBase = createFoxyResourceController({ client, onChange: value => batch(() => {
    const next = value.resource?.id.toLowerCase() ?? ''; if (next !== resourceKey) { resourceKey = next; contextEpoch++; }
    preparation.syncResource(); history.syncResource(); confirmation.syncContext(); management.syncContext();
  }) });
  const preparation = createFoxyPreparationController({ client, resource: resourceBase, loadClassroom: loadDetail, onChange: () => batch(() => {
    void history.syncPreparation(); confirmation.syncContext(); management.syncContext();
  }) });
  const history = createFoxyPublicationHistoryController({ client, resource: resourceBase, preparation, onChange: value => batch(() => {
    const next = value.selectedId?.toLowerCase() ?? ''; if (next !== selectedKey) { selectedKey = next; contextEpoch++; }
    confirmation.syncContext(); management.syncContext(); scheduleManagement();
  }) });
  const confirmation = createFoxyPublicationConfirmationController({ client, resource: resourceBase, preparation, history, loadClassroom: loadDetail, onChange: () => batch(() => {
    management.syncContext();
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
  function scheduleManagement() {
    const r = resourceBase.getState().resource, h = history.getState(), p = h.inspection?.publication;
    if (!r || !h.selectedId || !p || p.id.toLowerCase() !== h.selectedId.toLowerCase() || p.resourceId.toLowerCase() !== r.id.toLowerCase()) {
      managementStamp = ''; return;
    }
    const stamp = `${r.id.toLowerCase()}:${p.id.toLowerCase()}:${p.revision}:${p.state}`;
    if (stamp === managementStamp) return;
    managementStamp = stamp; const version = contextEpoch;
    queueMicrotask(() => { if (!closed && version === contextEpoch && stamp === managementStamp) void management.refresh(); });
  }
  function reconcileManagement() {
    if (closed) return;
    if (reconcilePending) { if (reconcileVersion !== contextEpoch) reconcileQueued = true; return; }
    reconcilePending = true; const version = contextEpoch; reconcileVersion = version;
    queueMicrotask(() => { void (async () => {
      try {
        if (closed || version !== contextEpoch) return;
        await Promise.all([history.refreshSelected(), history.refreshList()]);
        if (!closed && version === contextEpoch) await management.refresh();
      } finally { reconcilePending = false; if (reconcileQueued && !closed) { reconcileQueued = false; reconcileManagement(); } }
    })().catch(() => {}); });
  }
  const management = createFoxyPublicationManagementController({ client, resource: resourceBase, preparation, history, confirmation,
    onChange: () => batch(() => {}), onReconcile: reconcileManagement });
  const resource = { ...resourceBase, async open(conversationId: string, turnId: string) {
    const result = await resourceBase.open(conversationId, turnId);
    if (!closed && result === 'opened') await history.refreshList(); return result;
  } };
  const activityHandoff = createFoxyActivityHandoff({ source: () => resourceBase.getState(),
    prepare: (id, input, signal) => client.prepareActivity(id, input, signal), onChange: () => batch(() => {}) });
  async function reloadClassrooms() {
    if (closed) return;
    const version = ++classroomEpoch;
    try {
      const data = await classroomClient.call<{ teach: Classroom[] }>('', 'GET', undefined, abort.signal);
      if (!closed && version === classroomEpoch) batch(() => { contextClassrooms = data.teach.filter(room => room.role === 'teacher'); classrooms = contextClassrooms.filter(room => !room.archived); classroomsError = null; });
    } catch { if (!closed && version === classroomEpoch) batch(() => { classrooms = []; contextClassrooms = []; classroomsError = 'No pudimos cargar tus aulas.'; }); }
  }
  function dispose() {
    if (closed) return; closed = true; abort.abort(); classrooms = []; contextClassrooms = []; classroomsError = null;
    activityHandoff.dispose(); chat.dispose(); visual?.dispose(); visualEditor.dispose(); visualPublication.dispose(); resourceBase.dispose(); preparation.dispose(); history.dispose(); confirmation.dispose(); management.dispose();
  }
  const publicationFileUrl = (id: string, mode: 'preview' | 'download') => closed ? '' : client.publicationFileUrl(id, mode);
  return { getState: snapshot, activityHandoff, chat, visual: visual!, visualEditor, visualPublication, assetFileUrl: client.assetFileUrl, resource, preparation, history, confirmation, management, loadClassroom, reloadClassrooms, publicationFileUrl,
    init() { if (closed) return Promise.resolve(); if (!initialized) initialized = Promise.resolve().then(async () => { if (!closed) await Promise.all([chat.init(), reloadClassrooms()]); }); return initialized; }, dispose };
}
