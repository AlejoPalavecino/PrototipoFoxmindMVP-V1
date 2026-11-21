import type { StudyAction, StudyCommandData } from '../model/study-commands.ts';
import { StudyError } from '../api/study-error.ts';
import { createStudyRevisionController } from '../model/study-revision-controller.ts';
import type { StudyDetail } from '../model/study-contracts.ts';
import type { StudyRevisionPort } from '../model/study-commands.ts';

type Observers = {
  onDetail: (detail: StudyDetail) => void;
  onError: (message: string, error?: unknown) => void;
  onBusy: (busy: boolean) => void;
};

export function createStudyFolderOperations(api: StudyRevisionPort, observers: Observers) {
  let contextId: string | undefined;
  let generation = 0;
  let locked = false;
  let controller: ReturnType<typeof createStudyRevisionController> | undefined;
  const publish = (detail: StudyDetail) => {
    if (detail.folder.id === contextId) observers.onDetail(detail);
  };
  return {
    invalidate(folderId?: string) {
      generation++;
      contextId = folderId;
      locked = false;
      observers.onBusy(false);
      observers.onError('');
    },
    replace(detail: StudyDetail) {
      contextId = detail.folder.id;
      if (controller) controller.replace(detail);
      else controller = createStudyRevisionController(detail, api, publish);
    },
    async run<A extends StudyAction>(
      action: A,
      data: StudyCommandData[A] = {} as StudyCommandData[A],
      requestId?: string,
    ) {
      if (!controller || !contextId) throw new StudyError('NOT_FOUND', 404);
      if (locked) throw new StudyError('PENDING', 409);
      const started = generation;
      locked = true;
      observers.onBusy(true);
      observers.onError('');
      try {
        return await controller.run(action, data, requestId);
      } catch (error) {
        if (started === generation) {
          // The linked generation displays its own receipt or local retry in the transcript.
          const inChat = action === 'GENERATE' && 'conversationId' in data;
          observers.onError(inChat ? '' : error instanceof Error ? error.message : 'No pudimos guardar.', error);
        }
        throw error;
      } finally {
        if (started === generation) {
          locked = false;
          observers.onBusy(false);
        }
      }
    },
  };
}
