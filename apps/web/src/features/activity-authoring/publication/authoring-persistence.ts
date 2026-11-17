import type { ActivityType } from '../../../../../../src/core/contracts/activities.ts';
import type { ActivityAuthoringOperations, ActivityDeadline, ActivityDraftPayload, ActivityMetadata, PersistedActivity } from '../model/authoring-operations.ts';

/** Owns persisted identity/revision only; form values and visual state stay with React. */
export function createAuthoringPersistence(api: ActivityAuthoringOperations, initial: PersistedActivity) {
  let current = { ...initial };

  async function ensureDraft(type: ActivityType) {
    if (!current.id) current = await api.createDraft(current.revision, type);
    return { ...current };
  }

  async function write(type: ActivityType, operation: (saved: PersistedActivity) => Promise<{ revision: string }>) {
    const saved = await ensureDraft(type);
    const result = await operation(saved);
    current = { id: saved.id, revision: result.revision };
  }

  return {
    snapshot: () => ({ ...current }),
    save: (type: ActivityType, payload: ActivityDraftPayload) =>
      write(type, saved => api.saveDraft(saved.revision, saved.id, payload)),
    metadata: (type: ActivityType, metadata: ActivityMetadata) =>
      write(type, saved => api.updateMetadata(saved.revision, saved.id, metadata)),
    deadline: (type: ActivityType, deadline: ActivityDeadline, allowLate: boolean) =>
      write(type, saved => api.updateDeadline(saved.revision, saved.id, deadline, allowLate)),
    publish: (type: ActivityType) =>
      write(type, saved => api.publish(saved.revision, saved.id)),
  };
}
