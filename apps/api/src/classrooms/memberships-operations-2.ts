import { randomUUID } from 'node:crypto';
import { revision } from './revision.ts';
import { ClassroomCore } from './core.ts';
import { digest, fail, object, uuid } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import { recordActivityEligibility } from './activity-eligibility.ts';
import type { MembershipService } from './memberships.ts';

export function endMembershipOperation(capability: MembershipService, request: unknown, id: string, studentId: string | null) {
    return capability.run(request, true, async (tx, actor) => {
      const classroom = await capability.classroom(
        tx,
        actor,
        id,
        true,
        studentId !== null,
      );
      const target = studentId ?? actor.id;
      if (!uuid(target) || target === classroom.teacher_id)
        return fail('FORBIDDEN');
      const [period] = await tx.query<{ id: string; enrollment_id: string }>(
        `SELECT m.id,m.enrollment_id FROM membership_periods m
        JOIN enrollments e ON e.id=m.enrollment_id WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid
        AND m.ended_at IS NULL FOR UPDATE OF e,m`,
        id,
        target,
      );
      if (!period) return fail('CONFLICT');
      await tx.query(
        `UPDATE membership_periods SET ended_at=clock_timestamp(),end_reason=$2::"EndReason",
        ended_by_id=$3::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`,
        period.id,
        studentId ? 'REMOVED' : 'LEFT',
        actor.id,
      );
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

export function membersOperation(capability: MembershipService, request: unknown, id: string, history = false) {
    return capability.run(request, false, async (tx, actor) => {
      const room = await capability.classroom(tx, actor, id, false, history);
      const rows = await tx.query<{
        enrollment_id: string;
        student_id: string;
        first_name: string;
        last_name: string;
        active: boolean;
      }>(
        `SELECT e.id AS enrollment_id,e.student_id,u.first_name,u.last_name,EXISTS(SELECT 1 FROM membership_periods m
        WHERE m.enrollment_id=e.id AND m.ended_at IS NULL) AS active FROM enrollments e JOIN users u ON u.id=e.student_id
        WHERE e.classroom_id=$1::uuid ORDER BY u.last_name,u.first_name,e.id`,
        id,
      );
      if (room.teacher_id !== actor.id)
        return rows
          .filter((r) => r.active)
          .map((r) => ({ firstName: r.first_name, lastName: r.last_name }));
      const filtered = rows.filter((r) => (history ? !r.active : r.active));
      const periods = await membershipPeriods(tx, id);
      return filtered.map((r) => ({
        enrollmentId: r.enrollment_id,
        studentId: r.student_id,
        firstName: r.first_name,
        lastName: r.last_name,
        periods: periods
          .filter((p) => p.enrollment_id === r.enrollment_id)
          .map(({ enrollment_id: _, ...p }) => p),
      }));
    });
  }


async function revokePendingInvitations(tx: Transaction, id: string, target: string) {
      // Pending invitations issued before departure must never be reusable or resended in place.
      await tx.query(
        `UPDATE invitations SET revoked_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE classroom_id=$1::uuid AND recipient_email_normalized=(SELECT email_normalized FROM users WHERE id=$2::uuid)
        AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`,
        id,
        target,
      );

}

async function membershipPeriods(tx: Transaction, id: string) {
      const periods = await tx.query<{
        enrollment_id: string;
        joinedAt: Date;
        endedAt: Date | null;
        endReason: string | null;
      }>(
        `SELECT enrollment_id,joined_at AS "joinedAt",ended_at AS "endedAt",end_reason::text AS "endReason"
        FROM membership_periods WHERE classroom_id=$1::uuid ORDER BY joined_at,id`,
        id,
      );

      return periods;
}
