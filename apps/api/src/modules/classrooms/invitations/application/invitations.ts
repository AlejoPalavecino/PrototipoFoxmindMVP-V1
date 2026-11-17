import type { EnrollmentPort } from '../../access/public.ts';
import type { ClassroomAccess } from '../../access/public.ts';
import type { InvitationsRepository } from './invitations-repository.ts';
import type { InvitationOperations } from '../../application/management-operations.ts';
import { fail, uuid } from '../../domain/policy.ts';

export class InvitationService {
  readonly run: ClassroomAccess['run'];
  readonly classroom: ClassroomAccess['classroom'];
  private readonly enroll: EnrollmentPort['enroll'];
  constructor(context: Pick<ClassroomAccess, 'run' | 'classroom'>, dependencies: { enroll: EnrollmentPort['enroll'] }, private readonly repository: InvitationsRepository, private readonly operations: InvitationOperations) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.enroll = dependencies.enroll;
  }
  async invite(request: unknown, classroomId: string, input: unknown) { return this.operations.invite(request, classroomId, input); }
  reserveInvitationBatch(request: unknown, classroomId: string, input: unknown) {
    return this.operations.batch.reserve(request, classroomId, input);
  }
  readInvitationBatch(request: unknown, classroomId: string, requestId: unknown) {
    return this.operations.batch.read(request, classroomId, requestId);
  }
  emitInvitationBatchRecipient(request: unknown, classroomId: string, requestId: unknown, index: number) {
    return this.operations.batch.emit(request, classroomId, requestId, index);
  }
  revokeInvitation(request: unknown, classroomId: string, id: string) {
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true, true);
      if (!uuid(id)) return fail('ENROLLMENT_UNAVAILABLE');
      const [row] = await this.repository.revokeInvitation(tx, { invitationId: id, classroomId: classroomId });
      if (!row) return fail('ENROLLMENT_UNAVAILABLE');
      return { ok: true };
    });
  }
  pendingInvitations(request: unknown) {
    return this.run(request, false, async (tx, actor) =>
      actor.account_role !== 'student' ? [] : this.repository.listPendingInvitations(tx, { email: actor.email_normalized, actorId: actor.id }),
    );
  }
  listInvitations(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const rows = await this.repository.listClassroomInvitations(tx, { classroomId: classroomId });
      return rows.map(({ envelope, ...row }) => {
        if (!envelope) return fail('SERVICE_UNAVAILABLE');
        const recipient = this.operations.recipient(envelope, `p5:${row.id}:${row.generation}`);
        return { ...row, recipient };
      });
    });
  }
  declineInvitation(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      if (actor.account_role !== 'student' || !uuid(id)) return fail('ENROLLMENT_UNAVAILABLE');
      const [snapshot] = await this.repository.findInvitationClassroom(tx, { invitationId: id });
      if (!snapshot) return fail('ENROLLMENT_UNAVAILABLE');
      const [room] = await this.repository.lockInvitationClassroom(tx, { classroomId: snapshot.classroom_id });
      if (!room || room.archived_at || room.teacher_id === actor.id) return fail('ENROLLMENT_UNAVAILABLE');
      const [changed] = await this.repository.declineInvitation(tx, { invitationId: id, classroomId: snapshot.classroom_id, email: actor.email_normalized, actorId: actor.id });
      if (!changed) return fail('ENROLLMENT_UNAVAILABLE');
      return { ok: true };
    });
  }
  acceptInvitation(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      if (actor.account_role !== 'student') return fail('ENROLLMENT_UNAVAILABLE');
      if (!uuid(id)) return fail('ENROLLMENT_UNAVAILABLE');
      const [snapshot] = await this.repository.findInvitationClassroom(tx, { invitationId: id });
      if (!snapshot) return fail('ENROLLMENT_UNAVAILABLE');
      const [room] = await this.repository.lockInvitationClassroom(tx, { classroomId: snapshot.classroom_id });
      if (!room || room.archived_at || room.teacher_id === actor.id)
        return fail('ENROLLMENT_UNAVAILABLE');
      const [invitation] = await this.repository.lockAcceptableInvitation(tx, { invitationId: id, classroomId: snapshot.classroom_id, email: actor.email_normalized, actorId: actor.id });
      if (!invitation) return fail('ENROLLMENT_UNAVAILABLE');
      await this.enroll(tx, actor, snapshot.classroom_id, id);
      await this.repository.acceptInvitation(tx, { invitationId: id, actorId: actor.id });
      return { id: snapshot.classroom_id };
    });
  }
}
