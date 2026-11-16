import type { EnrollmentPort } from './ports.ts';
import type { ClassroomAccess } from './ports.ts';
import type { InvitationsRepository } from './invitations-repository.ts';
import type { InvitationOperations } from './management-operations.ts';
import { fail, uuid } from '../domain/policy.ts';

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
      const [row] = await this.repository.updateInvitations01(tx, id, classroomId);
      if (!row) return fail('ENROLLMENT_UNAVAILABLE');
      return { ok: true };
    });
  }
  pendingInvitations(request: unknown) {
    return this.run(request, false, async (tx, actor) =>
      actor.account_role !== 'student' ? [] : this.repository.readInvitations02(tx, actor.email_normalized, actor.id),
    );
  }
  listInvitations(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const rows = await this.repository.readInvitations03<{
        id: string;
        generation: string;
        envelope: string | null;
        deliveryStatus: string | null;
        deliveryError: string | null;
      }>(tx, classroomId);
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
      const [snapshot] = await this.repository.readInvitations04<{ classroom_id: string }>(tx, id);
      if (!snapshot) return fail('ENROLLMENT_UNAVAILABLE');
      const [room] = await this.repository.readClassrooms05<{ teacher_id: string; archived_at: Date | null }>(tx, snapshot.classroom_id);
      if (!room || room.archived_at || room.teacher_id === actor.id) return fail('ENROLLMENT_UNAVAILABLE');
      const [changed] = await this.repository.declineInvitation(tx, id, snapshot.classroom_id, actor.email_normalized, actor.id);
      if (!changed) return fail('ENROLLMENT_UNAVAILABLE');
      return { ok: true };
    });
  }
  acceptInvitation(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      if (actor.account_role !== 'student') return fail('ENROLLMENT_UNAVAILABLE');
      if (!uuid(id)) return fail('ENROLLMENT_UNAVAILABLE');
      const [snapshot] = await this.repository.readInvitations04<{ classroom_id: string }>(tx, id);
      if (!snapshot) return fail('ENROLLMENT_UNAVAILABLE');
      const [room] = await this.repository.readClassrooms05<{
        teacher_id: string;
        archived_at: Date | null;
      }>(tx, snapshot.classroom_id);
      if (!room || room.archived_at || room.teacher_id === actor.id)
        return fail('ENROLLMENT_UNAVAILABLE');
      const [invitation] = await this.repository.readInvitations06(tx, id, snapshot.classroom_id, actor.email_normalized, actor.id);
      if (!invitation) return fail('ENROLLMENT_UNAVAILABLE');
      await this.enroll(tx, actor, snapshot.classroom_id, id);
      await this.repository.updateInvitations07(tx, id, actor.id);
      return { id: snapshot.classroom_id };
    });
  }
}
