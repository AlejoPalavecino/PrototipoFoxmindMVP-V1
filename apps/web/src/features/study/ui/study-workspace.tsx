import { StudyToolsPanel } from '../tools/study-tools-panel';
import { StudyToolDialog } from '../tools/study-tool-dialog';
import { StudyCreationsPanel } from '../creations/presentation/study-creations-panel';
import { StudyPracticePreview } from '../creations/presentation/study-practice-preview';
import { StudyHistoryPanel } from '../conversations/presentation/study-history-panel';
import { StudySourcesDialog } from '../conversations/presentation/study-sources-dialog';
import { StudyRenameDialog } from '../conversations/presentation/study-rename-dialog';
import { StudyConversation } from '../conversations/presentation/study-conversation';
import { StudyContextDialog } from '../workspace/study-context-dialog';
import { StudyLibraryDialog } from '../workspace/study-library-dialog';
import { StudyFolderOptions } from '../workspace/study-folder-options';
import { useStudyChat } from '../conversations/use-study-chat.ts';
import { useStudyConversations } from '../conversations/use-study-conversations.ts';
import { useStudyCreations } from '../creations/use-study-creations.ts';
import { StudyCreationEditor } from '../creations/study-creation-editor.tsx';
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
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Dialog, Notice } from '../../../../../shared-ui/feedback';
import type { StudyDetail, StudyCollection } from '../model/study-contracts.ts';
import { studyGenerationData, studyGenerationIssue } from '../model/study-transitions.ts';
import { useStudyGeneration } from '../model/use-study-generation';
import { type StudyGenerationInput } from '../model/study-generation';
import { downloadPlainText } from '../../../../../shared-ui/text-document';
import { StudyPracticeView, StudyExamPlanner } from '../practice/study-practice';
import s from './study.module.css';
import { startStudyConversation, studyInitialPreferences } from '../model/study-discovery';
import type { StudyRun } from '../model/study-commands.ts';
import { useStudyPractice } from '../practice/use-study-practice.ts';
export function StudyWorkspace({
  identity,
  detail,
  catalog,
  busy,
  run,
  onReload,
  examId,
  cancelGeneration,
  selectedConversationId,
  onConversationSelect,
}: {
  identity?: ChatIdentity;
  examId?: string;
  selectedConversationId?: string;
  onConversationSelect?: (id: string) => void;
  cancelGeneration?: (requestId: string) => Promise<'CANCELLED' | 'ALREADY_FINISHED'>;
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
  useEffect(() => setArchived(f.status === 'ARCHIVED'), [f.status]);

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
  const [toolTitle, setToolTitle] = useState('Preparar un apunte');
  const [toolBrief, setToolBrief] = useState('');
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
  const generationIssue = studyGenerationIssue(kind, selected);
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
            onChoose={(tool) => {
              Tab('chat');
              if (tool.kind === 'PLAN') {
                setSelectedExam(undefined);
                Panel('exam');
                return;
              }
              Kind(tool.kind);
              setToolTitle(tool.title);
              setToolError('');
              Panel('tool');
            }}
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
            onCreation={(item) => {
              Tab('chat');
              Creation(item);
            }}
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
        context={
          <>
            <Link
              className={`${s.backLink} parity-ai-backLink`}
              href="/carpetas-de-estudio"
              aria-label="Volver a Mis carpetas"
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
          chat={{ pending, operation, cancelling, canStop, send, stop }}
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
          onCreation={Creation}
          onPractice={setPracticePreview}
          onSources={setCitedSources}
          onReload={() =>
            void onReload().catch(() => NoticeText('No pudimos actualizar la carpeta.'))
          }
          onLibrary={(launcher) => openPanelFrom('library', launcher)}
          onAttach={attach}
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
          onDownload={() => {
            const item = detail.practices.find((item) => item.id === practicePreview)!;
            downloadPlainText(
              item.title ?? 'Práctica personal',
              item.questions
                .map(
                  (question, index) =>
                    `${index + 1}. ${question.prompt}\n${question.options?.map((option) => option.text).join('\n') ?? ''}`,
                )
                .join('\n\n'),
            );
          }}
          onStart={() => {
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
      {panel === 'tool' && (
        <StudyToolDialog
          kind={kind}
          title={toolTitle}
          folderName={f.name}
          sourceCount={
            detail.sources.filter((source) => source.available && source.readable !== false).length
          }
          brief={toolBrief}
          selected={selected}
          count={count}
          difficulty={difficulty}
          topics={topics}
          error={toolError || generationIssue || ''}
          disabled={busy || !active || generation.blocked || !!generationIssue}
          onBrief={setToolBrief}
          onSelected={Selected}
          onCount={Count}
          onDifficulty={Difficulty}
          onClose={closePanel}
          onSubmit={() => {
            if (!toolBrief.trim()) {
              setToolError('Contá qué querés preparar para que Foxy tenga un punto de partida.');
              return;
            }
            if (topics.length && !selected.length) {
              setToolError('Elegí al menos un tema de tu carpeta.');
              return;
            }
            const submitted = toolBrief;
            const data = studyGenerationData(
              kind,
              submitted,
              selected,
              count,
              difficulty,
            ) as StudyGenerationInput;
            dismissPanel(false);
            Tab('chat');
            void generation.submit(data).then((ok) => {
              if (ok) setToolBrief((value) => (value === submitted ? '' : value));
            });
          }}
        />
      )}
      {panel === 'options' && (
        <StudyFolderOptions
          folderName={f.name}
          busy={busy}
          archived={archived}
          deleteConfirmation={deleteConfirmation}
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
      {creation && (
        <StudyCreationEditor
          creation={creation}
          disabled={!active || busy}
          onClose={() => Creation(undefined)}
          onSave={async (title, body) => {
            if (await command('EDIT_CREATION', { creationId: creation.id, title, body }))
              Creation(undefined);
          }}
        />
      )}
      {practice && detail.practices.find((item) => item.id === practice) && (
        <StudyPracticeView
          key={practice}
          folderName={f.name}
          onClose={() => {
            if (
              !busy &&
              (!panelDirty || window.confirm('Hay respuestas sin guardar. ¿Querés cerrar?'))
            ) {
              PanelDirty(false);
              Practice('');
            }
          }}
          onNewAttempt={newAttempt}
          onDirtyChange={PanelDirty}
          practice={detail.practices.find((item) => item.id === practice)!}
          busy={busy || !active}
          run={run}
        />
      )}
      {panel === 'exam' && (
        <Dialog
          className="parity-study-plan-dialog"
          title={
            selectedExam || examId ? 'Tu recorrido de repaso' : 'Un plan para llegar con calma'
          }
          onClose={closePanel}
        >
          {examId && !detail.exams.some((exam) => exam.id === examId) && (
            <Notice>Este plan de repaso ya no está disponible.</Notice>
          )}
          <StudyExamPlanner
            onClose={closePanel}
            onPrepared={setSelectedExam}
            examId={selectedExam ?? examId}
            onDirtyChange={PanelDirty}
            detail={detail}
            busy={busy || !active}
            run={run}
          />
        </Dialog>
      )}
    </div>
  );
}
