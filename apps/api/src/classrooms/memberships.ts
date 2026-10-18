import { randomUUID } from 'node:crypto';
import { DraftService, revision } from './drafts.ts';
import { digest, fail, object, uuid } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';

export class MembershipService extends DraftService {
  rotateCode(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, id, true, true);
      return { code: await this.newCode(tx, id) };
    });
  }
  async previewCode(request: unknown, input: unknown) {
    if (typeof input !== 'string' || !/^[\w-]{24}$/.test(input))
      return fail('ENROLLMENT_UNAVAILABLE');
    return this.run(request, true, async (tx, actor) => {
      const [code] = await tx.query<{
        id: string;
        classroom_id: string;
        code_digest: string;
      }>(
        'SELECT id,classroom_id,code_digest FROM classroom_codes WHERE code_digest=$1 AND revoked_at IS NULL',
        digest(input),
      );
      if (!code) return fail('ENROLLMENT_UNAVAILABLE');
      const [classroom] = await tx.query<{
        name: string;
        subject: string;
        division: string;
        academic_year: number;
        teacher: string;
        teacher_id: string;
        archived_at: Date | null;
      }>(
        `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher FROM classrooms c JOIN users u ON u.id=c.teacher_id
        WHERE c.id=$1::uuid FOR UPDATE OF c`,
        code.classroom_id,
      );
      const [exists] = await tx.query(
        'SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid',
        code.classroom_id,
        actor.id,
      );
      const [live] = await tx.query(
        'SELECT id FROM classroom_codes WHERE id=$1::uuid AND revoked_at IS NULL',
        code.id,
      );
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
      return {
        classroom: {
          name: classroom.name,
          subject: classroom.subject,
          division: classroom.division,
          academicYear: classroom.academic_year,
          teacher: classroom.teacher,
        },
        confirmation: this.tokens.issue({
          actor: actor.id,
          codeId: code.id,
          digest: code.code_digest,
          classroomId: code.classroom_id,
          expires: now.getTime() + 5 * 60 * 1000,
        }),
      };
    });
  }
  confirmCode(request: unknown, confirmation: unknown) {
    return this.run(request, true, async (tx, actor) => {
      const data = this.tokens.read(
        confirmation,
        actor.id,
        actor.now.getTime(),
      );
      if (!uuid(data.classroomId) || !uuid(data.codeId))
        return fail('ENROLLMENT_UNAVAILABLE');
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
        actor.id,
      );
      const [{ now }] = await tx.query<{ now: Date }>(
        'SELECT clock_timestamp() AS now',
      );
      this.tokens.read(confirmation, actor.id, now.getTime());
      if (
        !classroom ||
        classroom.archived_at ||
        classroom.teacher_id === actor.id ||
        !code ||
        existing
      )
        return fail('ENROLLMENT_UNAVAILABLE');
      await this.enroll(tx, actor, data.classroomId, null);
      return { id: data.classroomId };
    });
  }
  protected async enroll(
    tx: Transaction,
    actor: Actor,
    classroomId: string,
    invitationId: string | null,
  ) {
    let [enrollment] = await tx.query<{ id: string }>(
      'SELECT id FROM enrollments WHERE classroom_id=$1::uuid AND student_id=$2::uuid FOR UPDATE',
      classroomId,
      actor.id,
    );
    if (!enrollment) {
      [enrollment] = await tx.query<{ id: string }>(
        `INSERT INTO enrollments(id,updated_at,classroom_id,student_id)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid) RETURNING id`,
        randomUUID(),
        classroomId,
        actor.id,
      );
    }
    const [active] = await tx.query(
      'SELECT id FROM membership_periods WHERE enrollment_id=$1::uuid AND ended_at IS NULL',
      enrollment.id,
    );
    if (active) return fail('ENROLLMENT_UNAVAILABLE');
    const periodId = randomUUID();
    await tx.query(
      `INSERT INTO membership_periods(id,updated_at,enrollment_id,classroom_id,entry_method,invitation_id)
      VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::"EntryMethod",$5::uuid) RETURNING id`,
      periodId,
      enrollment.id,
      classroomId,
      invitationId ? 'INVITATION' : 'CODE',
      invitationId,
    );
    await this.membershipEvent(tx, enrollment.id, periodId, 'joined');
  }
  protected async membershipEvent(
    tx: Transaction,
    enrollmentId: string,
    periodId: string,
    event: string,
  ) {
    await tx.query(
      `INSERT INTO background_jobs(id,updated_at,type,payload,deduplication_key)
      VALUES($1::uuid,clock_timestamp(),'p5.membership',$2::jsonb,$3) RETURNING id`,
      randomUUID(),
      JSON.stringify({ enrollmentId, periodId, event }),
      `p5:${periodId}:${event}`,
    );
  }
  leave(request: unknown, id: string) {
    return this.endMembership(request, id, null);
  }
  remove(request: unknown, id: string, studentId: string) {
    return this.endMembership(request, id, studentId);
  }
  private endMembership(
    request: unknown,
    id: string,
    studentId: string | null,
  ) {
    return this.run(request, true, async (tx, actor) => {
      const classroom = await this.classroom(
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
      // Pending invitations issued before departure must never be reusable or resended in place.
      await tx.query(
        `UPDATE invitations SET revoked_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE classroom_id=$1::uuid AND recipient_email_normalized=(SELECT email_normalized FROM users WHERE id=$2::uuid)
        AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`,
        id,
        target,
      );
      await this.membershipEvent(
        tx,
        period.enrollment_id,
        period.id,
        studentId ? 'removed' : 'left',
      );
      return { ok: true };
    });
  }
  async setArchive(request: unknown, id: string, input: unknown) {
    const body = object(input, ['archived', 'revision']),
      expected = revision(body.revision);
    if (typeof body.archived !== 'boolean') return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const row = await this.classroom(tx, actor, id, false, true);
      if (row.revision.toString() !== expected) return fail('CONFLICT');
      await tx.query(
        `UPDATE classrooms SET archived_at=CASE WHEN $2 THEN COALESCE(archived_at,clock_timestamp()) ELSE NULL END,
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`,
        id,
        body.archived,
      );
      return {
        revision: (row.revision + 1n).toString(),
        archived: body.archived,
      };
    });
  }
  members(request: unknown, id: string, history = false) {
    return this.run(request, false, async (tx, actor) => {
      const room = await this.classroom(tx, actor, id, false, history);
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
  studentSummary(request: unknown, id: string, studentId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, id, false, true);
      if (!uuid(studentId)) return fail('FORBIDDEN');
      const [student] = await tx.query<{
        id: string;
        firstName: string;
        lastName: string;
      }>(
        `SELECT e.id,u.first_name AS "firstName",u.last_name AS "lastName"
        FROM enrollments e JOIN users u ON u.id=e.student_id WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid`,
        id,
        studentId,
      );
      if (!student) return fail('FORBIDDEN');
      const attempts = await tx.query(
        `SELECT a.id,activity.title,a.submitted_at AS "submittedAt",a.attempt_number AS number,
        g.final_grade::text AS grade,g.is_published AS published FROM attempts a
        JOIN student_activities sa ON sa.id=a.student_activity_id JOIN activities activity ON activity.id=a.activity_id
        LEFT JOIN attempt_grades g ON g.attempt_id=a.id WHERE sa.enrollment_id=$1::uuid AND sa.classroom_id=$2::uuid
        AND a.status='SUBMITTED' ORDER BY a.submitted_at DESC,a.id`,
        student.id,
        id,
      );
      return {
        firstName: student.firstName,
        lastName: student.lastName,
        attempts,
      };
    });
  }
}
