import { studyDetailAfterCommand } from './study-transitions.ts';
import type { StudyAction, StudyCommandData } from './study-commands.ts';
import type { StudyDetail } from './study-contracts.ts';
import type { StudyRevisionPort } from './study-commands.ts';
export function createStudyRevisionController(
  initial: StudyDetail,
  client: StudyRevisionPort,
  onChange: (detail: StudyDetail) => void,
) {
  let current = initial;
  let generation = 0;
  return {
    replace(value: StudyDetail) {
      generation++;
      current = value;
    },
    async run<A extends StudyAction>(
      action: A,
      data: StudyCommandData[A] = {} as StudyCommandData[A],
      requestId?: string,
    ) {
      const snapshot = current,
        started = generation;
      const active = () => started === generation && current.folder.id === snapshot.folder.id;
      try {
        const result = await client.command(
          snapshot.folder.id,
          snapshot.folder.revision,
          action,
          data,
          requestId,
        );
        if (!active()) return result;
        current = studyDetailAfterCommand(snapshot, result);
        try {
          const refreshed = await client.get(snapshot.folder.id);
          if (active()) current = refreshed;
        } catch {
          /* A committed mutation stays successful when its refresh fails. */
        }
        if (active()) onChange(current);
        return result;
      } catch (error) {
        if (active()) {
          try {
            const refreshed = await client.get(snapshot.folder.id);
            if (active()) {
              current = refreshed;
              onChange(refreshed);
            }
          } catch {
            /* Preserve the active context when recovery is unavailable. */
          }
        }
        throw error;
      }
    },
  };
}
