import type { MembershipOperations } from './management-operations.ts';
import type { MembershipsRepository } from './memberships-repository.ts';
import { revision } from '../domain/revision.ts';
import type { ClassroomAccess, PreviewTokenPort } from './ports.ts';
import { fail, object, uuid } from '../domain/policy.ts';
import type { Actor, Transaction } from './contracts.ts';

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
    let [enrollment] = await this.repository.readEnrollments01<{ id: string }>(tx, classroomId, actor.id);
    if (!enrollment) {
      [enrollment] = await this.repository.insertEnrollments02<{ id: string }>(tx, this.operations.randomUUID(), classroomId, actor.id);
    }
    const [active] = await this.repository.readMembershipPeriods03(tx, enrollment.id);
    if (active) return fail('ENROLLMENT_UNAVAILABLE');
    const periodId = this.operations.randomUUID();
    await this.repository.insertMembershipPeriods04(tx, periodId, enrollment.id, classroomId, invitationId ? 'INVITATION' : 'CODE', invitationId);
    await this.operations.recordActivityEligibility(tx, classroomId, { enrollment: enrollment.id });
    await this.membershipEvent(tx, enrollment.id, periodId, 'joined');
  }
  async membershipEvent(
    tx: Transaction,
    enrollmentId: string,
    periodId: string,
    event: string,
  ) {
    await this.repository.insertBackgroundJobs05(tx, this.operations.randomUUID(), JSON.stringify({ enrollmentId, periodId, event }), `p5:${periodId}:${event}`);
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
      await this.repository.updateClassrooms06(tx, id, body.archived);
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
      const [student] = await this.repository.readEnrollments07<{
        id: string;
        firstName: string;
        lastName: string;
      }>(tx, id, studentId);
      if (!student) return fail('FORBIDDEN');
      const attempts = await this.repository.readAttempts08(tx, student.id, id);
      return {
        firstName: student.firstName,
        lastName: student.lastName,
        attempts,
      };
    });
  }
}
