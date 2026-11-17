import type { PublicationRepository } from './drafts-operations-repository.ts';
import type { ClassroomRuntimeAccess } from '../../access/public.ts';
import { draftPayload, fail, object, uuid } from '../../domain/policy.ts';
import type { Actor, Transaction } from '../../access/public.ts';
import { revision } from '../../domain/revision.ts';

import type { DraftRow } from '../../application/management-operations.ts';

type DraftPublicationAccess = Pick<ClassroomRuntimeAccess, 'run' | 'classroom'> & {
  ports: Pick<ClassroomRuntimeAccess['ports'], 'files' | 'classroomQuotaBytes' | 'gradingAiAvailable' | 'deliveryKey'>;
  draft(tx: Transaction, actor: Actor, id: string): Promise<DraftRow>;
};

export function createDraftPublicationOperations(repository: PublicationRepository, dependencies: { randomUUID(): string; newClassroomCode(tx: Transaction, classroomId: string, key: Buffer): Promise<string> }) {
const { randomUUID, newClassroomCode } = dependencies;
async function publishDraftOperation(capability: DraftPublicationAccess, request: unknown, id: string, input: unknown) {
    const expected = revision(object(input, ['revision']).revision);
    return capability.run(request, true, async (tx, actor) => {
      if (!uuid(id)) return fail('FORBIDDEN');
      const [snapshot] = await repository.readSnapshot(tx, { draftId: id, ownerId: actor.id });
      if (!snapshot) return fail('FORBIDDEN');
      if (snapshot.published_classroom_id)
        return { id: snapshot.published_classroom_id, code: null };
      const payload = draftPayload(snapshot.payload, true),
        classroomId = randomUUID();
      await createClassroom(tx, capability, classroomId, actor, payload);
      const current = await capability.draft(tx, actor, id);
      if (
        current.published_classroom_id ||
        current.revision.toString() !== expected ||
        snapshot.revision !== current.revision
      )
        return fail('CONFLICT');
      await repository.markPublished(tx, { draftId: id, classroomId: classroomId });
      await populateClassroom(tx, capability, request, classroomId, actor, payload);
      return { id: classroomId, code: await newClassroomCode(tx, classroomId,capability.ports.deliveryKey) };
    });
  }

async function createClassroom(tx: Transaction, capability: DraftPublicationAccess, classroomId: string, actor: Actor, payload: ReturnType<typeof draftPayload>) {
      // A new, invisible destination is created/locked before the source draft, matching P4 order.
      await repository.createDestination(tx, { classroomId: classroomId, teacherId: actor.id, name: payload.name, subject: payload.subject, division: payload.division, academicYear: payload.academicYear, timezone: payload.timezone, coverKey: payload.coverKey, quota: capability.ports.classroomQuotaBytes });

}
async function populateClassroom(tx: Transaction, capability: DraftPublicationAccess, request: unknown, classroomId: string, actor: Actor, payload: ReturnType<typeof draftPayload>) {
    if (payload.planFileId) {
      await capability.ports.files.promoteDraftPlanInTransaction(
        tx,
        request,
        payload.planFileId!,
        classroomId,
      );
      await repository.addPlanVersion(tx, { versionId: randomUUID(), classroomId: classroomId, fileId: payload.planFileId, actorId: actor.id });
    }
      await populateUnits(tx, classroomId, payload);

}

async function populateUnits(tx: Transaction, classroomId: string, payload: ReturnType<typeof draftPayload>) {
      for (const [position, unit] of payload.units!.entries()) {
        const unitId = randomUUID();
        await repository.addUnit(tx, { unitId: unitId, classroomId: classroomId, name: unit.name, position: position });
        for (const [index, topic] of unit.topics.entries())
          await repository.addTopic(tx, { topicId: randomUUID(), classroomId: classroomId, unitId: unitId, name: topic.name, position: index });
      }
}


return { publishDraftOperation };
}
