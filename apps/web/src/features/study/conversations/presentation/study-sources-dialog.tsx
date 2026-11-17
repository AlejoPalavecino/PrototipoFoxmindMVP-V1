import { Dialog } from '../../../../../../shared-ui/feedback';
import type { StudySource, StudyTurn } from '../../model/study-contracts.ts';
import type { ChatAttachment } from '../../../../shared/chat-attachments';
import s from '../../ui/study.module.css';
export function StudySourcesDialog({
  citedSources,
  sources,
  attachments,
  onClose,
}: {
  citedSources: NonNullable<StudyTurn['sourceRefs']>;
  sources: StudySource[];
  attachments: Pick<ChatAttachment, 'id' | 'name'>[];
  onClose: () => void;
}) {
  return (
    <Dialog labeledClose title="Fuentes consultadas" onClose={() => onClose()}>
      <ul className={`${s.citedSources} parity-ai-citedSources`}>
        {citedSources.map((ref) => {
          const source = sources.find((item) => item.id === ref.id && item.version === ref.version);
          const attachment = attachments.find((item) => item.id === ref.id);
          return (
            <li key={`${ref.id}:${ref.version}`}>
              {source?.title ?? attachment?.name ?? 'Fuente no disponible'}
            </li>
          );
        })}
      </ul>
    </Dialog>
  );
}
