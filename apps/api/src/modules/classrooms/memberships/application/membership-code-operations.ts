import type { MembershipCodeRepository } from './membership-code-operations-repository.ts';
import { normalizeClassroomCode } from '../domain/classroom-code.ts';
import { fail, uuid } from '../../domain/policy.ts';
import type { Actor, Transaction } from '../../access/public.ts';
import type { MembershipAccess } from '../../application/management-operations.ts';

export function createMembershipCodeOperations(repository: MembershipCodeRepository, dependencies: { digest(text: string): string }) {
const { digest } = dependencies;
async function previewCodeOperation(capability: MembershipAccess, request: unknown, input: unknown) {
    const normalized = normalizeClassroomCode(input);
    if (!normalized)
      return fail('ENROLLMENT_UNAVAILABLE');
    return capability.run(request, true, async (tx, actor) => {
      if (actor.account_role !== 'student') return fail('ENROLLMENT_UNAVAILABLE');
      const [code] = await repository.findLiveCode(tx, { digest: digest(normalized) });
      if (!code) return fail('ENROLLMENT_UNAVAILABLE');
      const { classroom, exists, live } = await previewState(tx, code.classroom_id, actor.id, code.id);
      if (
        !classroom ||
        classroom.archived_at ||
        classroom.teacher_id === actor.id ||
        exists ||
        !live
      )
        return fail('ENROLLMENT_UNAVAILABLE');
      const [{ now }] = await repository.readPreviewTime(tx, {  });
      return previewPayload(capability, classroom, code, actor, now);
    });
  }

function confirmCodeOperation(capability: MembershipAccess, request: unknown, confirmation: unknown) {
    return capability.run(request, true, async (tx, actor) => {
      if (actor.account_role !== 'student') return fail('ENROLLMENT_UNAVAILABLE');
      const data = capability.tokens.read(
        confirmation,
        actor.id,
        actor.now.getTime(),
      );
      if (!uuid(data.classroomId) || !uuid(data.codeId))
        return fail('ENROLLMENT_UNAVAILABLE');
      const { classroom, code, existing, now } = await confirmationState(tx, data, actor.id);
      capability.tokens.read(confirmation, actor.id, now.getTime());
      if (
        !classroom ||
        classroom.archived_at ||
        classroom.teacher_id === actor.id ||
        !code ||
        existing
      )
        return fail('ENROLLMENT_UNAVAILABLE');
      await capability.enroll(tx, actor, data.classroomId, null);
      return { id: data.classroomId };
    });
  }


async function previewState(tx: Transaction, classroomId: string, actorId: string, codeId: string) {
      const [classroom] = await repository.lockPreviewClassroom(tx, { classroomId: classroomId });
      const [exists] = await repository.findPreviewEnrollment(tx, { classroomId: classroomId, actorId: actorId });
      const [live] = await repository.findUnrevokedCode(tx, { codeId: codeId });

      return { classroom, exists, live };
}

async function confirmationState(tx: Transaction, data: ReturnType<MembershipAccess['tokens']['read']>, actorId: string) {
      const [classroom] = await repository.lockConfirmationClassroom(tx, { classroomId: data.classroomId });
      const [code] = await repository.findConfirmationCode(tx, { codeId: data.codeId, classroomId: data.classroomId, digest: data.digest });
      const [existing] = await repository.findConfirmationEnrollment(tx, { classroomId: data.classroomId, actorId: actorId });
      const [{ now }] = await repository.readConfirmationTime(tx, {  });

      return { classroom, code, existing, now };
}

function previewPayload(capability: MembershipAccess, classroom: NonNullable<Awaited<ReturnType<typeof previewState>>['classroom']>,
  code: { id: string; classroom_id: string; code_digest: string }, actor: Actor, now: Date) {
      return {
        classroom: {
          name: classroom.name,
          subject: classroom.subject,
          division: classroom.division,
          academicYear: classroom.academic_year,
          ...(classroom.cover_key === undefined ? {} : { coverKey: classroom.cover_key }),
          teacher: classroom.teacher,
        },
        confirmation: capability.tokens.issue({
          actor: actor.id,
          codeId: code.id,
          digest: code.code_digest,
          classroomId: code.classroom_id,
          expires: now.getTime() + 5 * 60 * 1000,
        }),
      };
}

return { previewCodeOperation, confirmCodeOperation };
}
