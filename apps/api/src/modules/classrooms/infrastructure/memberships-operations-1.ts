import { normalizeClassroomCode } from './classroom-codes.ts';
import { revision } from './revision.ts';
import { digest, fail, uuid } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import type { MembershipAccess } from '../application/management-operations.ts';

export async function previewCodeOperation(capability: MembershipAccess, request: unknown, input: unknown) {
    const normalized = normalizeClassroomCode(input);
    if (!normalized)
      return fail('ENROLLMENT_UNAVAILABLE');
    return capability.run(request, true, async (tx, actor) => {
      if (actor.account_role !== 'student') return fail('ENROLLMENT_UNAVAILABLE');
      const [code] = await tx.query<{
        id: string;
        classroom_id: string;
        code_digest: string;
      }>(
        'SELECT id,classroom_id,code_digest FROM classroom_codes WHERE code_digest=$1 AND revoked_at IS NULL',
        digest(normalized),
      );
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
      const [{ now }] = await tx.query<{ now: Date }>(
        'SELECT clock_timestamp() AS now',
      );
      return previewPayload(capability, classroom, code, actor, now);
    });
  }

export function confirmCodeOperation(capability: MembershipAccess, request: unknown, confirmation: unknown) {
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
      const [classroom] = await tx.query<{
        name: string;
        subject: string;
        division: string;
        academic_year: number;
        cover_key?: string;
        teacher: string;
        teacher_id: string;
        archived_at: Date | null;
      }>(
        `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher FROM classrooms c JOIN users u ON u.id=c.teacher_id
        WHERE c.id=$1::uuid FOR UPDATE OF c`,
        classroomId,
      );
      const [exists] = await tx.query(
        'SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid',
        classroomId,
        actorId,
      );
      const [live] = await tx.query(
        'SELECT id FROM classroom_codes WHERE id=$1::uuid AND revoked_at IS NULL',
        codeId,
      );

      return { classroom, exists, live };
}

async function confirmationState(tx: Transaction, data: ReturnType<MembershipAccess['tokens']['read']>, actorId: string) {
      const [classroom] = await tx.query<{
        teacher_id: string;
        archived_at: Date | null;
      }>(
        'SELECT teacher_id,archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE',
        data.classroomId,
      );
      const [code] = await tx.query(
        'SELECT id FROM classroom_codes WHERE id=$1::uuid AND classroom_id=$2::uuid AND code_digest=$3 AND revoked_at IS NULL',
        data.codeId,
        data.classroomId,
        data.digest,
      );
      const [existing] = await tx.query(
        'SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid',
        data.classroomId,
        actorId,
      );
      const [{ now }] = await tx.query<{ now: Date }>(
        'SELECT clock_timestamp() AS now',
      );

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
