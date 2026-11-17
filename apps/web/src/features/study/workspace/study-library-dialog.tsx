import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { ChatAttachmentList } from '../../../../../shared-ui/ChatAttachmentControls';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import type { StudyDetail, StudyCollection, StudyTopic } from '../model/study-contracts.ts';
import type { useChatAttachments } from '../../../shared/use-chat-attachments';
import type { StudyRun } from '../model/study-commands.ts';
import { StudyLibrary } from '../ui/study-library';
export function StudyLibraryDialog({
  detail,
  catalog,
  busy,
  run,
  attachments,
  attachmentsDisabled,
  onRemove,
  onStudyTopic,
  onContext,
  onClose,
}: {
  detail: StudyDetail;
  catalog: StudyCollection;
  busy: boolean;
  run: StudyRun;
  attachments: Pick<ReturnType<typeof useChatAttachments>, 'items' | 'error'>;
  attachmentsDisabled: boolean;
  onRemove: (id: string) => void;
  onStudyTopic: (topic: StudyTopic) => void;
  onContext: () => void;
  onClose: () => void;
}) {
  return (
    <FoxyDialog
      description="Tus fuentes, siempre a mano para conversar."
      footer={
        <button onClick={onClose}>
          <FoxmindIcon name="arrow-left" />
          Volver al chat
        </button>
      }
      title="Biblioteca de contexto"
      className="parity-ai-tray study-exact-library-dialog"
      onClose={onClose}
    >
      <StudyLibrary
        detail={detail}
        catalog={catalog}
        busy={busy}
        run={run}
        onContext={onContext}
        onClose={onClose}
        onStudyTopic={onStudyTopic}
        attachments={
          attachments.items.length ? (
            <section className="study-exact-chat-attachments">
              <h3>Adjuntos de este chat</h3>
              <ChatAttachmentList
                items={attachments.items}
                error={attachments.error}
                disabled={attachmentsDisabled}
                onRemove={onRemove}
              />
            </section>
          ) : undefined
        }
      />
    </FoxyDialog>
  );
}
