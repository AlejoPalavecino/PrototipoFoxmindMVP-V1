import type { MembershipOperations } from '../../application/management-operations.ts';
import type { MembershipsRepository } from './memberships-repository.ts';
import { revision } from '../../domain/revision.ts';
import type { ClassroomAccess, PreviewTokenPort } from '../../access/public.ts';
import { fail, object, uuid } from '../../domain/policy.ts';
import type { Actor, Transaction } from '../../access/public.ts';

export class MembershipService {
  readonly run: ClassroomAccess['run'];
  readonly classroom: ClassroomAccess['classroom'];
  readonly tokens: PreviewTokenPort;
  private readonly newCode: (tx:Transaction,classroomId:string)=>Promise<string>;
  constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'> & { tokens: PreviewTokenPort }, dependencies: { newCode: (tx:Transaction,classroomId:string)=>Promise<string> }, private readonly repository: MembershipsRepository, private readonly operations: MembershipOperations) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.tokens = context.tokens;
    this.newCode = dependencies.newCode;
  }
  readonly recordActivityEligibility: MembershipOperations['recordActivityEligibility'] = (...args) => this.operations.recordActivityEligibility(...args);
  rotateCode(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, id, true, true);
      return { code: await this.newCode(tx, id) };
    });
  }
  async previewCode(request: unknown, input: unknown) { return this.operations.previewCodeOperation(this, request, input); }
  confirmCode(request: unknown, confirmation: unknown) { return this.operations.confirmCodeOperation(this, request, confirmation); }
  async enroll(
    tx: Transaction,
    actor: Actor,
    classroomId: string,
    invitationId: string | null,
  ) {
    if (actor.account_role !== 'student') return fail('FORBIDDEN');
    let [enrollment] = await this.repository.lockEnrollment(tx, { classroomId: classroomId, studentId: actor.id });
    if (!enrollment) {
      [enrollment] = await this.repository.createEnrollment(tx, { enrollmentId: this.operations.randomUUID(), classroomId: classroomId, studentId: actor.id });
    }
    const [active] = await this.repository.findActivePeriod(tx, { enrollmentId: enrollment.id });
    if (active) return fail('ENROLLMENT_UNAVAILABLE');
    const periodId = this.operations.randomUUID();
    await this.repository.createPeriod(tx, { periodId: periodId, enrollmentId: enrollment.id, classroomId: classroomId, entryMethod: invitationId ? 'INVITATION' : 'CODE', invitationId: invitationId });
    await this.operations.recordActivityEligibility(tx, classroomId, { enrollment: enrollment.id });
    await this.membershipEvent(tx, enrollment.id, periodId, 'joined');
  }
  async membershipEvent(
    tx: Transaction,
    enrollmentId: string,
    periodId: string,
    event: string,
  ) {
    await this.repository.enqueueMembershipEvent(tx, { jobId: this.operations.randomUUID(), payload: JSON.stringify({ enrollmentId, periodId, event }), deduplicationKey: `p5:${periodId}:${event}` });
  }
  leave(request: unknown, id: string) {
    return this.endMembership(request, id, null);
  }
  remove(request: unknown, id: string, studentId: string) {
    return this.endMembership(request, id, studentId);
  }
  private endMembership(request: unknown, id: string, studentId: string | null) { return this.operations.endMembershipOperation(this, request, id, studentId); }
  async setArchive(request: unknown, id: string, input: unknown) {
    const body = object(input, ['archived', 'revision']),
      expected = revision(body.revision);
    if (typeof body.archived !== 'boolean') return fail('INVALID_INPUT');
    return this.run(request, true, async (tx, actor) => {
      const row = await this.classroom(tx, actor, id, false, true);
      if (row.revision.toString() !== expected) return fail('CONFLICT');
      await this.repository.setArchive(tx, { classroomId: id, archived: body.archived });
      return {
        revision: (row.revision + 1n).toString(),
        archived: body.archived,
      };
    });
  }
  members(request: unknown, id: string, history = false) { return this.operations.membersOperation(this, request, id, history); }
  studentSummary(request: unknown, id: string, studentId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, id, false, true);
      if (!uuid(studentId)) return fail('FORBIDDEN');
      const [student] = await this.repository.findStudent(tx, { classroomId: id, studentId: studentId });
      if (!student) return fail('FORBIDDEN');
      const attempts = await this.repository.listSubmittedAttempts(tx, { enrollmentId: student.id, classroomId: id });
      return {
        firstName: student.firstName,
        lastName: student.lastName,
        attempts,
      };
    });
  }
}
