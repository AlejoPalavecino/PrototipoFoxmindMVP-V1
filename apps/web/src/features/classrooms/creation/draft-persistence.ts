import type { Draft, Payload } from '../../../../../../src/core/contracts/classrooms.ts';
import type { ClassroomCreationOperations } from './creation-api.ts';

export type DraftSaveStatus = 'Guardando borrador…' | 'Borrador guardado' | 'No se pudo guardar';

/** Serializes saves and extraction writes against one confirmed draft revision. */
export function createClassroomDraftPersistence(
  operations: ClassroomCreationOperations,
  draft: Pick<Draft, 'id' | 'revision' | 'payload'>,
  currentPayload: () => Payload,
  feedback: { status?: (status: DraftSaveStatus) => void; error?: (error: Error) => void } = {},
) {
  let currentOperations = operations;
  let revision = draft.revision;
  let saved = JSON.stringify(draft.payload);
  let failed = false;
  let queue: Promise<unknown> = Promise.resolve();

  function serialize<T>(operation: () => Promise<T>): Promise<T> {
    const next = queue.catch(() => {}).then(operation);
    queue = next;
    return next;
  }
  function save() {
    return serialize(async () => {
      const snapshot = JSON.stringify(currentPayload());
      if (snapshot === saved) return;
      if (failed) throw new Error('El borrador cambió en otra sesión o se perdió la confirmación. Volvé a Mis Aulas y abrí la versión guardada antes de seguir.');
      feedback.status?.('Guardando borrador…');
      try {
        const next = await currentOperations.saveDraft(draft.id, revision, JSON.parse(snapshot));
        revision = next.revision;
        saved = snapshot;
        feedback.status?.('Borrador guardado');
      } catch (error) {
        failed = true;
        feedback.status?.('No se pudo guardar');
        feedback.error?.(error as Error);
        throw error;
      }
    });
  }
  return {
    save, serialize,
    useOperations(next: ClassroomCreationOperations) { currentOperations = next; },
    revision: () => revision,
    isSaved: (payload: Payload) => JSON.stringify(payload) === saved,
    accept(next: Pick<Draft, 'revision' | 'payload'>) {
      revision = next.revision;
      saved = JSON.stringify(next.payload);
    },
    publish: () => currentOperations.publishDraft(draft.id, revision),
  };
}
