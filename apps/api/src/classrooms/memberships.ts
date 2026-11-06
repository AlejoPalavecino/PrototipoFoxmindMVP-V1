import { previewCodeOperation, confirmCodeOperation } from './memberships-operations-1.ts';
import { endMembershipOperation, membersOperation } from './memberships-operations-2.ts';
import { randomUUID } from 'node:crypto';
import { revision } from './revision.ts';
import { ClassroomCore } from './core.ts';
import { digest, fail, object, uuid } from './policy.ts';
import type { Actor, Transaction } from './contracts.ts';
import { recordActivityEligibility } from './activity-eligibility.ts';

export class MembershipService {
  readonly run: ClassroomCore['run'];
  readonly classroom: ClassroomCore['classroom'];
  readonly tokens: ClassroomCore['tokens'];
  private readonly newCode: (tx:Transaction,classroomId:string)=>Promise<string>;
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'tokens'>, dependencies: { newCode: (tx:Transaction,classroomId:string)=>Promise<string> }) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.tokens = context.tokens;
    this.newCode = dependencies.newCode;
  }
  rotateCode(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, id, true, true);
      return { code: await this.newCode(tx, id) };
    });
  }
  async previewCode(request: unknown, input: unknown) { return previewCodeOperation(this, request, input); }
  confirmCode(request: unknown, confirmation: unknown) { return confirmCodeOperation(this, request, confirmation); }
  async enroll(
    tx: Transaction,
    actor: Actor,
    classroomId: string,
    invitationId: string | null,
  ) {
    if (actor.account_role !== 'student') return fail('FORBIDDEN');
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
      `INSERT INTO membership_periods(id,updated_at,joined_at,enrollment_id,classroom_id,entry_method,invitation_id)
      VALUES($1::uuid,clock_timestamp(),clock_timestamp(),$2::uuid,$3::uuid,$4::"EntryMethod",$5::uuid) RETURNING id`,
      periodId,
      enrollment.id,
      classroomId,
      invitationId ? 'INVITATION' : 'CODE',
      invitationId,
    );
    await recordActivityEligibility(tx, classroomId, { enrollment: enrollment.id });
    await this.membershipEvent(tx, enrollment.id, periodId, 'joined');
  }
  async membershipEvent(
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
  private endMembership(request: unknown, id: string, studentId: string | null) { return endMembershipOperation(this, request, id, studentId); }
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
  members(request: unknown, id: string, history = false) { return membersOperation(this, request, id, history); }
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
        `SELECT a.id,a.activity_id AS "activityId",activity.title,a.submitted_at AS "submittedAt",a.attempt_number AS number,
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
