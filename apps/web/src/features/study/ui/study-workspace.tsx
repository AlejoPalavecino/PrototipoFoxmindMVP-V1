import { StudyToolsPanel } from '../tools/study-tools-panel';
import { StudyToolDock } from '../tools/study-tool-dock';
import { studyTool, studyToolExample } from '../tools/study-tool-catalog.ts';
import { StudyMaterialAlert } from '../workspace/study-material-alert';
import { StudyCreationsPanel } from '../creations/presentation/study-creations-panel';
import { StudyPracticePreview } from '../creations/presentation/study-practice-preview';
import { StudyHistoryPanel } from '../conversations/presentation/study-history-panel';
import { StudySourcesDialog } from '../conversations/presentation/study-sources-dialog';
import { StudyRenameDialog } from '../conversations/presentation/study-rename-dialog';
import { StudyConversation } from '../conversations/presentation/study-conversation';
import { StudyContextDialog } from '../workspace/study-context-dialog';
import { StudyLibraryDialog } from '../workspace/study-library-dialog';
import { StudyFolderOptions } from '../workspace/study-folder-options';
import { StudyRail, StudyRailMini } from '../workspace/study-rail';
import { StudySharedStrategyDialog } from '../workspace/StudySharedStrategyDialog.tsx';
import { createStudyClient } from '../api.ts';
import { useStudyChat } from '../conversations/use-study-chat.ts';
import { useStudyConversations } from '../conversations/use-study-conversations.ts';
import { useStudyCreations } from '../creations/use-study-creations.ts';
import { StudyCreationEditor } from '../creations/study-creation-editor.tsx';
import { StudyImagePreview } from '../creations/study-image-preview.tsx';
import {
  FoxyChatLayout,
  type ChatIdentity,
  type ChatView,
} from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { useChatAttachments } from '../../../shared/use-chat-attachments';
import { studentAttachmentPath } from '../../../shared/chat-attachments';
import { commitChatTiming } from '../../../shared/chat-timing';
import { useChatFollow } from '../../../../../shared-ui/use-chat-follow';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useResetOnChange } from '../../../../../shared-ui/use-reset-on-change.ts';
import Link from 'next/link';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import type { StudyCreation, StudyDetail, StudyCollection } from '../model/study-contracts.ts';
import { studyGenerationData, studyGenerationIssue } from '../model/study-transitions.ts';
import { useStudyGeneration } from '../model/use-study-generation';
import { type StudyGenerationInput } from '../model/study-generation';
import { StudyPracticeView, StudyExamPlanner } from '../practice/study-practice';
import s from './study.module.css';
import { startStudyConversation, studyInitialPreferences } from '../model/study-discovery';
import type { StudyRun } from '../model/study-commands.ts';
import { useStudyPractice } from '../practice/use-study-practice.ts';
import { studyCsrf } from '../model/study-csrf.ts';
async function fetchStudyChatPreview(folderId: string, requestId: string, signal: AbortSignal): Promise<string | null> {
  const response = await fetch(`/api/v1/study-folders/${encodeURIComponent(folderId)}/chat-previews/${encodeURIComponent(requestId)}`,
    { credentials: 'same-origin', cache: 'no-store', signal });
  if (!response.ok) return null;
  const body = await response.json() as { markdown?: unknown };
  return typeof body.markdown === 'string' && body.markdown.trim() ? body.markdown : null;
}
export function StudyWorkspace({
  identity,
  detail,
  catalog,
  busy,
  run,
  onReload,
  examId,
  cancelGeneration,
  readChatPreview,
  selectedConversationId,
  onConversationSelect,
}: {
  identity?: ChatIdentity;
  examId?: string;
  selectedConversationId?: string;
  onConversationSelect?: (id: string) => void;
  cancelGeneration?: (requestId: string) => Promise<'CANCELLED' | 'ALREADY_FINISHED'>;
  readChatPreview?: (folderId: string, requestId: string, signal: AbortSignal) => Promise<string | null>;
  detail: StudyDetail;
  catalog: StudyCollection;
  busy: boolean;
  run: StudyRun;
  onReload: () => Promise<void>;
}) {
  const f = detail.folder;
  const initialPreferences = studyInitialPreferences(
    detail.memory,
    f.units.flatMap((u) => u.topics.map((t) => t.id)),
  );
  const [panel, Panel] = useState(examId ? 'exam' : '');
  useEffect(() => {
    if (examId) Panel('exam');
  }, [examId]);
  const [panelDirty, PanelDirty] = useState(false);
  const [tab, Tab] = useState<ChatView>('chat');
  const {
    current,
    messages,
    text,
    setText: Text,
    search: conversationSearch,
    setSearch: ConversationSearch,
    matchingChats,
    selectConversation,
    openChat: chooseChat,
    historyOpenKey,
    setHistoryOpenKey,
    renaming,
    setRenaming,
    renameTitle,
    setRenameTitle,
    renameError,
    setRenameError,
  } = useStudyConversations(detail, selectedConversationId, onConversationSelect);
  const {
    search,
    setSearch: Search,
    kind: creationType,
    setKind: CreationType,
    creation,
    setCreation: Creation,
    matchingCreations,
    matchingPractices,
    matchingPlans,
  } = useStudyCreations(detail);
  const [selected, Selected] = useState<string[]>(initialPreferences.topicIds);
  const [kind, Kind] = useState(initialPreferences.lastTool);
  const [count, Count] = useState(initialPreferences.questionCount);
  const [difficulty, Difficulty] = useState(initialPreferences.difficulty);
  const [archived, setArchived] = useState(f.status === 'ARCHIVED');
  const topics = f.units.flatMap((u) => u.topics);
  const active = !archived;
  const strategyRoom = active ? catalog.classrooms.find(room => room.id===f.linkedClassroomId && !room.archived) : undefined;
  const strategyClient = useMemo(() => createStudyClient(fetch, studyCsrf),[]);
  useResetOnChange([f.status], () => setArchived(f.status === 'ARCHIVED'));

  const panelLauncher = useRef<HTMLButtonElement | null>(null);
  function openPanelFrom(next: 'context' | 'library' | 'options', launcher: HTMLButtonElement) {
    panelLauncher.current = launcher;
    Panel(next);
  }
  function dismissPanel(restoreFocus = true) {
    const launcher = panelLauncher.current;
    panelLauncher.current = null;
    Panel('');
    if (!restoreFocus || !launcher) return;
    requestAnimationFrame(() => {
      const doc = launcher.ownerDocument;
      if (launcher.isConnected && doc.activeElement === doc.body)
        launcher.focus({ preventScroll: true });
    });
  }
  function closePanel() {
    if (
      busy ||
      contextWorking ||
      (panelDirty && !window.confirm('Tenés cambios sin guardar. ¿Querés cerrar esta vista?'))
    )
      return;
    PanelDirty(false);
    dismissPanel();
  }
  const [contextReady, setContextReady] = useState(false),
    [contextWorking, setContextWorking] = useState(false);

  const [selectedExam, setSelectedExam] = useState(examId);
  const [repeatPlan, setRepeatPlan] = useState<StudyGenerationInput>();
  const [repeatSources, setRepeatSources] = useState<string[]>();
  // The open tool is docked on the composer; it stays open while a dialog (library, context) is on top.
  const [toolOpen, setToolOpen] = useState(false);
  const [toolBriefs, setToolBriefs] = useState<Record<string, string>>({});
  const toolBrief = toolBriefs[kind] ?? '';
  // Each tool keeps its own draft: a failed request must not leak into another tool.
  const setToolBrief = (value: string | ((current: string) => string), target: string = kind) =>
    setToolBriefs((all) => ({ ...all, [target]: typeof value === 'function' ? value(all[target] ?? '') : value }));
  const [toolError, setToolError] = useState('');

  const [citedSources, setCitedSources] = useState<
    NonNullable<(typeof messages)[number]['sourceRefs']>
  >([]);

  const [deleteConfirmation, setDeleteConfirmation] = useState(false);
  const attachmentPath = current ? studentAttachmentPath(f.id, current.id) : undefined;
  const attachments = useChatAttachments(attachmentPath);
  const generation = useStudyGeneration({
    detail,
    current,
    busy: busy || attachments.busy,
    active,
    run,
    onConversation: selectConversation,
    onReload,
    cancelGeneration,
  });
  const {
    pending,
    partial,
    operation,
    notice,
    setNotice: NoticeText,
    command,
    stop,
    cancelling,
    canStop,
    send,
  } = useStudyChat({
    run,
    currentId: current?.id,
    text,
    setText: Text,
    selected,
    busy: busy || attachments.busy,
    active,
    blocked: generation.blocked,
    onConversation: selectConversation,
    cancelGeneration,
    readPreview: (requestId, signal) => (readChatPreview ?? fetchStudyChatPreview)(f.id, requestId, signal),
  });
  const {
    practice,
    setPractice: Practice,
    preview: practicePreview,
    setPreview: setPracticePreview,
    newAttempt,
  } = useStudyPractice(command, () => PanelDirty(false));
  useEffect(() => {
    const answer = messages.at(-1);
    if (tab === 'chat' && !practice && !pending && answer?.id && answer.role === 'assistant'
      && (answer.content ?? answer.text)?.trim()) {
      commitChatTiming('study', answer.id, 'first_text');
      commitChatTiming('study', answer.id, 'final');
    }
  }, [messages, pending, practice, tab]);
  const follow = useChatFollow(
    current?.id,
    JSON.stringify([
      messages.length,
      pending,
      generation.local?.requestId,
      generation.local?.phase,
      messages.map((message) => message.generation?.status),
    ]),
  );
  async function attach(id: string, file: File, copy: boolean) {
    await attachments.upload(
      async () => {
        if (attachmentPath) return attachmentPath;
        const chatId = await startStudyConversation(
          () => run('NEW_CONVERSATION', { title: 'Nueva conversación' }),
          selectConversation,
        );
        return studentAttachmentPath(f.id, chatId);
      },
      id,
      file,
      copy,
    );
    if (copy) {
      try {
        await onReload();
      } catch {
        NoticeText('El material se guardó. Actualizá la carpeta para verlo.');
      }
    }
  }
  function openChat(id: string) {
    chooseChat(id);
    Tab('chat');
  }
  function prepareAgain(id: string, resourceKind: string, title: string) {
    let original: StudyGenerationInput | undefined;
    for (const chat of detail.conversations) {
      const turns = chat.messages ?? chat.turns ?? [];
      const reply = turns.find(turn => turn.creationId === id || turn.practiceId === id || turn.examId === id);
      if (!reply) continue;
      const request = turns.find(turn => turn.generation && turn.generation.requestId === reply.generationRequestId);
      if (request?.generation) original = { ...request.generation, message: request.content ?? request.text ?? title };
      chooseChat(chat.id);
      break;
    }
    Tab('chat');
    setRepeatPlan(original);
    if (resourceKind === 'REVIEW_PLAN') {
      setSelectedExam(undefined);
      Panel('exam');
      return;
    }
    Kind(resourceKind);
    setToolBrief(original?.message ?? title, resourceKind);
    setToolError('');
    setRepeatSources(original?.sourceIds);
    if (original) {
      Selected(original.topicIds.filter(id => topics.some(topic => topic.id === id)));
      Count(original.questionCount);
      Difficulty(original.difficulty);
    }
    openTool();
  }
  function focusComposer() {
    if (typeof requestAnimationFrame === 'function')
      requestAnimationFrame(() => document.getElementById('study-message')?.focus());
  }
  function openTool() {
    setToolOpen(true);
    focusComposer();
  }
  function closeTool() {
    setToolOpen(false);
    setToolError('');
    focusComposer();
  }
  function chooseTool(tool: { kind: string; title: string }) {
    Tab('chat');
    setRepeatPlan(undefined);
    setRepeatSources(undefined);
    if (tool.kind === 'PLAN') {
      setSelectedExam(undefined);
      // The plan starts from the topics already chosen in the rail; the student can change them in its second step.
      if (selected.length)
        setRepeatPlan({ kind: 'REVIEW_PLAN', message: '', topicIds: selected, questionCount: 5, difficulty: 'MEDIUM' } as StudyGenerationInput);
      Panel('exam');
      return;
    }
    Kind(tool.kind);
    setToolError('');
    openTool();
  }
  function submitTool() {
    if (toolNeedsMaterial) return;
    if (kind !== 'IMAGE' && topics.length && !selected.length) {
      setToolError('Elegí al menos un tema de tu carpeta.');
      return;
    }
    // An empty box sends the tool's starting idea: the student can just press the button.
    const submitted = toolBrief.trim() ? toolBrief : studyToolExample(kind, selectedTopics[0]?.title), submittedKind = kind;
    const data = studyGenerationData(kind, submitted, selected, count, difficulty) as StudyGenerationInput;
    setToolOpen(false);
    setToolError('');
    Tab('chat');
    void generation.submit(repeatSources ? { ...data, sourceIds: repeatSources } : data).then((ok) => {
      if (ok) setToolBrief((value) => (value === toolBrief ? '' : value), submittedKind);
    });
  }
  function toggleTopic(id: string) {
    Selected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }
  const selectedTopics = topics.filter((topic) => selected.includes(topic.id));
  const generationIssue = studyGenerationIssue(kind, selected);
  const toolSourceCount = detail.sources.filter((source) => source.available && source.readable !== false).length + attachments.items.length;
  // Study answers are grounded in folder materials; only images and review plans work without them.
  const toolNeedsMaterial = !['IMAGE', 'REVIEW_PLAN', 'PLAN'].includes(kind) && toolSourceCount === 0;
  const openedPractice = detail.practices.find((item) => item.id === practice);
  const inlinePractice = openedPractice?.kind === 'QUIZ';
  const practiceSources = inlinePractice ? detail.sources.filter(source => source.available &&
    openedPractice.questions.some(question => question.sourceRefs?.some(ref => ref.id === source.id && ref.version === source.version))) : [];
  const inlineDiagram = creation?.kind === 'OUTLINE' && !!creation.diagram;
  function openCreation(item?: StudyCreation) {
    Tab('chat');
    if (inlinePractice && !closePractice()) return;
    if (item?.kind === 'OUTLINE' && item.diagram && item.conversationId && item.conversationId !== current?.id)
      chooseChat(item.conversationId);
    Creation(item);
  }
  function closeCreation() {
    Creation(undefined);
    if (inlineDiagram && typeof requestAnimationFrame === 'function')
      requestAnimationFrame(() => document.getElementById('study-message')?.focus());
  }
  const creationReader = creation && creation.kind !== 'IMAGE' && (
    <StudyCreationEditor
      key={creation.id}
      creation={creation}
      inlineDiagram={inlineDiagram}
      diagramSources={creation.diagram && creation.sourceRefs ? {
        folderId: f.id,
        items: detail.sources.filter(source => source.available &&
          creation.sourceRefs?.some(ref => ref.id === source.id && ref.version === source.version)),
      } : undefined}
      onRepeatDiagram={active && creation.diagram ? () => prepareAgain(creation.id, creation.kind, creation.title) : undefined}
      availableIllustrations={inlineDiagram ? undefined : detail.creations.filter(item => item.kind === 'IMAGE').map(item => ({
        url: `/api/v1/study-folders/${encodeURIComponent(f.id)}/images/${encodeURIComponent(item.id)}`,
        caption: item.title,
      }))}
      disabled={!active || busy}
      onClose={closeCreation}
      onSave={async (title, body) => {
        const response = await command('EDIT_CREATION', { creationId: creation.id, title, body });
        if (!response || !response.result?.creation) return false;
        Creation({ ...creation, ...response.result.creation });
        return true;
      }}
    />
  );
  function closePractice() {
    if (busy || (panelDirty && !window.confirm('Hay respuestas sin guardar. ¿Querés cerrar?'))) return false;
    PanelDirty(false);
    Practice('');
    return true;
  }
  const practiceReader = openedPractice && (
    <StudyPracticeView
      key={openedPractice.id}
      inline={inlinePractice}
      sources={practiceSources.length ? { folderId: f.id, items: practiceSources } : undefined}
      folderName={f.name}
      closeLabel="Cerrar práctica"
      onClose={closePractice}
      onNewAttempt={newAttempt}
      onSelectAttempt={Practice}
      practices={detail.practices}
      onDirtyChange={PanelDirty}
      practice={openedPractice}
      busy={busy || !active}
      run={run}
      onPracticeMissed={active ? (topicIds) => {
        if (!closePractice()) return;
        Selected(topicIds.filter((id) => topics.some((topic) => topic.id === id)));
        chooseTool({ kind: 'QUIZ', title: 'Practicar' });
      } : undefined}
      onPlanReview={active ? (topicIds) => {
        if (!closePractice()) return;
        const chosen = topicIds.filter((id) => topics.some((topic) => topic.id === id));
        Tab('chat');
        setSelectedExam(undefined);
        // Seeds the planner with the topics to review; dates and times stay for the student to choose.
        setRepeatPlan({ kind: 'REVIEW_PLAN', message: '', topicIds: chosen.length ? chosen : selected, questionCount: 5, difficulty: 'MEDIUM' } as StudyGenerationInput);
        Panel('exam');
      } : undefined}
    />
  );
  const rail = () => (
    <StudyRail
      detail={detail}
      classroomName={catalog.classrooms.find((room) => room.id === f.linkedClassroomId)?.name}
      selected={selected}
      disabled={busy || !active}
      sourceCount={detail.sources.length + attachments.items.length}
      onTopic={toggleTopic}
      onAddMaterial={(launcher) => openPanelFrom('library', launcher)}
    />
  );
  return (
    <div className={`${s.workspaceFrame} parity-study-workspace`}>
      {archived && (
        <Notice>
          Esta carpeta está archivada. Podés consultar tu trabajo y reactivarla desde Opciones.
        </Notice>
      )}
      {notice && (
        <p role="status" className={notice === 'Respuesta recibida.' ? s.sr : s.status}>
          {notice}
        </p>
      )}
      <FoxyChatLayout
        view={tab}
        onView={Tab}
        history={
          <StudyHistoryPanel
            matchingChats={matchingChats}
            search={conversationSearch}
            selectedId={current?.id}
            disabled={busy || !active}
            locked={busy || !!pending}
            onSearch={ConversationSearch}
            onSelect={openChat}
            onRename={(chat) => {
              setRenaming({ id: chat.id, title: chat.title });
              setRenameTitle(chat.title);
              setRenameError('');
              Tab('chat');
            }}
          />
        }
        historyKey={current?.id}
        historyOpenKey={historyOpenKey}
        tools={
          <StudyToolsPanel
            disabled={busy || !active || generation.blocked}
            imageGenerationAvailable={detail.imageGenerationAvailable}
            current={toolOpen ? kind : undefined}
            onChoose={chooseTool}
          />
        }
        creations={
          <StudyCreationsPanel
            search={search}
            creationType={creationType}
            matchingCreations={matchingCreations}
            matchingPractices={matchingPractices}
            matchingPlans={matchingPlans}
            onSearch={Search}
            onKind={CreationType}
            repeatDisabled={busy || !active || generation.blocked}
            onRepeat={prepareAgain}
            onCreation={openCreation}
            onPractice={(id) => {
              Tab('chat');
              setPracticePreview(id);
            }}
            onExam={(id) => {
              Tab('chat');
              setSelectedExam(id);
              Panel('exam');
            }}
            onTools={() => Tab('tools')}
          />
        }
        creationsCount={detail.creations.length + detail.practices.length + detail.exams.length}
        newDisabled={busy || attachments.busy || !active}
        onNew={() => openChat('new')}
        aside={rail()}
        asideMini={
          <StudyRailMini
            bannerKey={f.bannerKey}
            folderName={f.name}
            selectedCount={selected.length}
            sourceCount={detail.sources.length + attachments.items.length}
            disabled={busy || !active || generation.blocked}
            onTopics={(launcher) => openPanelFrom('context', launcher)}
            onMaterials={(launcher) => openPanelFrom('library', launcher)}
            onReview={() => chooseTool({ kind: 'PLAN', title: 'Organizar mi repaso' })}
          />
        }
        asideFoldKey="foxmind:study-rail"
        asideLabel="Temas y materiales de la carpeta"
        panel={inlineDiagram ? creationReader : inlinePractice ? practiceReader : undefined}
        panelLabel={inlineDiagram ? 'Esquema abierto' : 'Práctica abierta'}
        context={
          <>
            <Link
              className={`${s.backLink} parity-ai-backLink`}
              href="/carpetas-de-estudio"
              aria-label="Volver a Mis carpetas"
              onClick={(event) => { if (inlinePractice && !closePractice()) event.preventDefault(); }}
            >
              <FoxmindIcon name="arrow-left" />
            </Link>
            <button
              type="button"
              className={`${s.contextLaunch} parity-ai-contextLaunch`}
              aria-haspopup="dialog"
              onClick={(event) => openPanelFrom('context', event.currentTarget)}
            >
              <FoxmindIcon name="book" />
              <span>
                <small>
                  {f.linkedClassroomId ? 'Carpeta + aula vinculada' : 'Contexto de tu carpeta'}
                </small>
                <strong>{f.name}</strong>
              </span>
              <FoxmindIcon name="chevron-right" />
            </button>
            <button
              type="button"
              className="study-exact-folder-options-launch"
              aria-haspopup="dialog"
              aria-label="Opciones de la carpeta"
              title="Opciones de la carpeta"
              disabled={busy}
              onClick={(event) => openPanelFrom('options', event.currentTarget)}
            >
              <FoxmindIcon name="more" />
            </button>
          </>
        }
      >
        <StudyConversation
          identity={identity}
          current={current}
          detail={detail}
          messages={messages}
          generation={generation}
          chat={{ pending, partial, operation, cancelling, canStop, send, stop }}
          busy={busy}
          active={active}
          follow={follow}
          text={text}
          folderName={f.name}
          attachmentsBusy={attachments.busy}
          sourceCount={detail.sources.length + attachments.items.length}
          onPrompt={(value) => {
            Text(value);
            requestAnimationFrame(() => document.getElementById('study-message')?.focus());
          }}
          onText={Text}
          onCreation={openCreation}
          onPractice={setPracticePreview}
          onExam={(id) => {
            setSelectedExam(id);
            Panel('exam');
          }}
          onSources={setCitedSources}
          onReload={() =>
            void onReload().catch(() => NoticeText('No pudimos actualizar la carpeta.'))
          }
          onLibrary={(launcher) => openPanelFrom('library', launcher)}
          onAttach={attach}
          onTool={chooseTool}
          topics={selectedTopics}
          onDropTopic={toggleTopic}
          onChooseTopics={(launcher) => openPanelFrom('context', launcher)}
          notice={active && toolSourceCount === 0 ? (
            <StudyMaterialAlert disabled={busy} onAdd={(launcher) => openPanelFrom('library', launcher)} />
          ) : undefined}
          dock={toolOpen ? (
            <StudyToolDock
              kind={kind}
              selected={selected}
              topics={topics}
              count={count}
              difficulty={difficulty}
              error={toolError || generationIssue || ''}
              onBrief={(value) => setToolBrief(value)}
              onCount={Count}
              onDifficulty={Difficulty}
              onClose={closeTool}
            />
          ) : undefined}
          composerTool={toolOpen ? {
            action: studyTool(kind).action,
            placeholder: kind === 'IMAGE' ? 'Describí la imagen que querés' : 'Opcional: contale a Foxy en qué querés hacer foco',
            value: toolBrief,
            disabled: busy || !active || generation.blocked || !!generationIssue || toolNeedsMaterial,
            onValue: (value) => setToolBrief(value),
            onSubmit: submitTool,
          } : undefined}
        />
      </FoxyChatLayout>
      {citedSources.length > 0 && (
        <StudySourcesDialog
          citedSources={citedSources}
          sources={detail.sources}
          attachments={attachments.items}
          onClose={() => setCitedSources([])}
        />
      )}
      {renaming && (
        <StudyRenameDialog
          busy={busy}
          title={renameTitle}
          error={renameError}
          onTitle={setRenameTitle}
          onClose={() => {
            setRenaming(undefined);
            setHistoryOpenKey((value) => value + 1);
          }}
          onSubmit={() => {
            if (!renameTitle.trim()) {
              setRenameError('Dale un nombre a esta conversación.');
              return;
            }
            void command('RENAME_CONVERSATION', {
              conversationId: renaming.id,
              title: renameTitle.trim(),
            }).then((ok) => {
              if (ok) {
                setRenaming(undefined);
                setHistoryOpenKey((value) => value + 1);
              } else setRenameError('No pudimos guardar el nombre. Podés reintentar.');
            });
          }}
        />
      )}
      {practicePreview && detail.practices.find((item) => item.id === practicePreview) && (
        <StudyPracticePreview
          practice={detail.practices.find((item) => item.id === practicePreview)!}
          onClose={() => setPracticePreview('')}
          onStart={() => {
            if (inlineDiagram) Creation(undefined);
            Practice(practicePreview);
            setPracticePreview('');
          }}
        />
      )}
      {panel === 'context' && (
        <StudyContextDialog
          detail={detail}
          catalog={catalog}
          busy={busy}
          working={contextWorking}
          ready={contextReady}
          onReady={setContextReady}
          onWorking={setContextWorking}
          onReload={onReload}
          onClose={closePanel}
          onLibrary={() => Panel('library')}
          overview={rail()}
        />
      )}
      {(panel === 'library' || panel === 'materials') && (
        <StudyLibraryDialog
          detail={detail}
          catalog={catalog}
          busy={busy}
          run={run}
          attachments={attachments}
          attachmentsDisabled={attachments.busy || busy || !!pending || !active}
          onRemove={(id) => void attachments.remove(id)}
          onClose={closePanel}
          onContext={() => Panel('context')}
          onStudyTopic={(topic) => {
            Selected([topic.id]);
            Text('Ayudame a estudiar ' + topic.title + '.');
            dismissPanel(false);
            Tab('chat');
            requestAnimationFrame(() => document.getElementById('study-message')?.focus());
          }}
        />
      )}
      {panel === 'options' && (
        <StudyFolderOptions
          folderName={f.name}
          busy={busy}
          archived={archived}
          deleteConfirmation={deleteConfirmation}
          onSharedStrategy={strategyRoom ? () => Panel('strategy') : undefined}
          onClose={closePanel}
          onArchive={() =>
            void command(archived ? 'REACTIVATE' : 'ARCHIVE').then((ok) => {
              if (ok) dismissPanel();
            })
          }
          onDelete={() => setDeleteConfirmation(true)}
          onCancelDelete={() => setDeleteConfirmation(false)}
          onConfirmDelete={async () => {
            await run('DELETE', { confirmed: true });
            window.location.assign('/carpetas-de-estudio');
          }}
        />
      )}
      {panel === 'strategy' && strategyRoom ? <StudySharedStrategyDialog key={f.id+':'+strategyRoom.id} client={strategyClient}
        folderId={f.id} room={strategyRoom} onClose={closePanel}/> : null}
      {creation?.kind === 'IMAGE' && (
        <StudyImagePreview folderId={f.id} creation={creation} onClose={() => Creation(undefined)}
          onRepeat={active ? () => { Creation(undefined); prepareAgain(creation.id, creation.kind, creation.title); } : undefined} />
      )}
      {!inlineDiagram && creationReader}
      {!inlinePractice && practiceReader}
      {panel === 'exam' && (
        <Dialog
          className="parity-study-plan-dialog"
          title={
            selectedExam ? 'Tu recorrido de repaso' : 'Un plan para llegar con calma'
          }
          onClose={closePanel}
        >
          {selectedExam && !detail.exams.some((exam) => exam.id === selectedExam) && (
            <Notice>Este plan de repaso ya no está disponible.</Notice>
          )}
          <StudyExamPlanner
            initialRequest={repeatPlan}
            onClose={closePanel}
            onGenerate={(data) => {
              dismissPanel(false);
              Tab('chat');
              void generation.submit(data);
            }}
            examId={selectedExam}
            onDirtyChange={PanelDirty}
            detail={detail}
            busy={busy || !active || (!selectedExam && generation.blocked)}
            run={run}
          />
        </Dialog>
      )}
    </div>
  );
}
