import type { MembershipLifecycleRepository } from './membership-lifecycle-operations-repository.ts';

import type { ClassroomRuntimeAccess } from '../../access/public.ts';
import { fail, object, uuid } from '../../domain/policy.ts';
import type { Actor, Transaction } from '../../access/public.ts';
import type { MembershipAccess } from '../../application/management-operations.ts';

export function createMembershipLifecycleOperations(repository: MembershipLifecycleRepository) {
function endMembershipOperation(capability: MembershipAccess, request: unknown, id: string, studentId: string | null) {
    return capability.run(request, true, async (tx, actor) => {
      const removing = studentId !== null;
      // The write transaction still locks the classroom. Only self-departure may bypass the archive write guard.
      const classroom = await capability.classroom(
        tx,
        actor,
        id,
        removing,
        removing,
      );
      const target = studentId ?? actor.id;
      if (!uuid(target) || target === classroom.teacher_id)
        return fail('FORBIDDEN');
      const [period] = await repository.lockActivePeriod(tx, { classroomId: id, studentId: target });
      if (!period) return fail('CONFLICT');
      await repository.endPeriod(tx, { periodId: period.id, reason: studentId ? 'REMOVED' : 'LEFT', actorId: actor.id });
      await revokePendingInvitations(tx, id, target);
      await capability.membershipEvent(
        tx,
        period.enrollment_id,
        period.id,
        studentId ? 'removed' : 'left',
      );
      return { ok: true };
    });
  }

function membersOperation(capability: MembershipAccess, request: unknown, id: string, history = false) {
    return capability.run(request, false, async (tx, actor) => {
      const room = await capability.classroom(tx, actor, id, false, history);
      const rows = await repository.listMembers(tx, { classroomId: id });
      if (room.teacher_id !== actor.id)
        return rows
          .filter((r) => r.active)
          .map((r) => ({ firstName: r.first_name, lastName: r.last_name, isSelf: r.student_id === actor.id }));
      const filtered = rows.filter((r) => (history ? !r.active : r.active));
      const periods = await membershipPeriods(tx, id);
      return filtered.map((r) => ({
        enrollmentId: r.enrollment_id,
        studentId: r.student_id,
        firstName: r.first_name,
        lastName: r.last_name,
        email: r.email,
        periods: periods
          .filter((p) => p.enrollment_id === r.enrollment_id)
          .map(({ enrollment_id: _, ...p }) => p),
      }));
    });
  }


async function revokePendingInvitations(tx: Transaction, id: string, target: string) {
      // Pending invitations issued before departure must never be reusable or resended in place.
      await repository.revokePendingInvitations(tx, { classroomId: id, studentId: target });

}

async function membershipPeriods(tx: Transaction, id: string) {
      const periods = await repository.listPeriods(tx, { classroomId: id });

      return periods;
}

return { endMembershipOperation, membersOperation };
}
