import { inviteOperation } from './invitations-operations.ts';
import {
  randomUUID,
  randomBytes,
  createCipheriv,
  createDecipheriv,
} from 'node:crypto';
import type { MembershipService } from './memberships.ts';
import type { ClassroomCore } from './core.ts';
import { fail, uuid } from './policy.ts';
import { validateMailbox } from '../mail/mailbox.ts';

export function encryptDelivery(key: Buffer, value: unknown, aad: string) {
  const iv = randomBytes(12),
    cipher = createCipheriv('aes-256-gcm', key, iv);
  cipher.setAAD(Buffer.from(aad));
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(value)),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString('base64');
}
export function decryptDelivery(key: Buffer, value: string, aad: string) {
  const bytes = Buffer.from(value, 'base64'),
    decipher = createDecipheriv('aes-256-gcm', key, bytes.subarray(0, 12));
  decipher.setAAD(Buffer.from(aad));
  decipher.setAuthTag(bytes.subarray(12, 28));
  return JSON.parse(
    Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString(),
  );
}
export class InvitationService {
  readonly run: ClassroomCore['run'];
  readonly classroom: ClassroomCore['classroom'];
  readonly ports: ClassroomCore['ports'];
  private readonly enroll: MembershipService['enroll'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>, dependencies: { enroll: MembershipService['enroll'] }) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.ports = context.ports;
    this.enroll = dependencies.enroll;
  }
  async invite(request: unknown, classroomId: string, input: unknown) { return inviteOperation(this, request, classroomId, input); }
  revokeInvitation(request: unknown, classroomId: string, id: string) {
    return this.run(request, true, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, true, true);
      if (!uuid(id)) return fail('ENROLLMENT_UNAVAILABLE');
      const [row] = await tx.query(
        `UPDATE invitations SET revoked_at=clock_timestamp(),updated_at=clock_timestamp()
        WHERE id=$1::uuid AND classroom_id=$2::uuid AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id`,
        id,
        classroomId,
      );
      if (!row) return fail('ENROLLMENT_UNAVAILABLE');
      return { ok: true };
    });
  }
  pendingInvitations(request: unknown) {
    return this.run(request, false, async (tx, actor) =>
      tx.query(
        `SELECT i.id,i.expires_at AS "expiresAt",c.name,c.subject,c.division,
      c.academic_year AS "academicYear",concat(u.first_name,' ',u.last_name) AS teacher FROM invitations i
      JOIN classrooms c ON c.id=i.classroom_id JOIN users u ON u.id=c.teacher_id
      WHERE i.recipient_email_normalized=$1 AND i.accepted_at IS NULL AND i.revoked_at IS NULL
      AND i.expires_at>clock_timestamp() AND c.archived_at IS NULL AND c.teacher_id<>$2::uuid
      AND NOT EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=c.id AND e.student_id=$2::uuid AND (m.ended_at IS NULL OR m.ended_at>=i.issued_at))
      ORDER BY i.issued_at DESC,i.id`,
        actor.email_normalized,
        actor.id,
      ),
    );
  }
  listInvitations(request: unknown, classroomId: string) {
    return this.run(request, false, async (tx, actor) => {
      await this.classroom(tx, actor, classroomId, false, true);
      const rows = await tx.query<{
        id: string;
        generation: string;
        envelope: string | null;
        deliveryStatus: string | null;
        deliveryError: string | null;
      }>(
        `SELECT i.id,i.generation::text,i.issued_at AS "issuedAt",i.expires_at AS "expiresAt",i.accepted_at AS "acceptedAt",i.revoked_at AS "revokedAt",
        j.payload->>'envelope' AS envelope,j.status::text AS "deliveryStatus",j.last_error_code AS "deliveryError" FROM invitations i
        LEFT JOIN background_jobs j ON j.deduplication_key='p5:'||i.id::text||':'||i.generation::text
        WHERE i.classroom_id=$1::uuid ORDER BY i.issued_at DESC,i.id`,
        classroomId,
      );
      return rows.map(({ envelope, ...row }) => {
        if (!envelope) return fail('SERVICE_UNAVAILABLE');
        const recipient = validateMailbox(
          decryptDelivery(
            this.ports.deliveryKey,
            envelope,
            `p5:${row.id}:${row.generation}`,
          ).to,
        );
        return { ...row, recipient };
      });
    });
  }
  acceptInvitation(request: unknown, id: string) {
    return this.run(request, true, async (tx, actor) => {
      if (!uuid(id)) return fail('ENROLLMENT_UNAVAILABLE');
      const [snapshot] = await tx.query<{ classroom_id: string }>(
        'SELECT classroom_id FROM invitations WHERE id=$1::uuid',
        id,
      );
      if (!snapshot) return fail('ENROLLMENT_UNAVAILABLE');
      const [room] = await tx.query<{
        teacher_id: string;
        archived_at: Date | null;
      }>(
        'SELECT teacher_id,archived_at FROM classrooms WHERE id=$1::uuid FOR UPDATE',
        snapshot.classroom_id,
      );
      if (!room || room.archived_at || room.teacher_id === actor.id)
        return fail('ENROLLMENT_UNAVAILABLE');
      const [invitation] = await tx.query(
        `SELECT id FROM invitations i WHERE i.id=$1::uuid AND i.classroom_id=$2::uuid
        AND i.recipient_email_normalized=$3 AND i.accepted_at IS NULL AND i.revoked_at IS NULL AND i.expires_at>clock_timestamp()
        AND NOT EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
          WHERE e.classroom_id=i.classroom_id AND e.student_id=$4::uuid AND (m.ended_at IS NULL OR m.ended_at>=i.issued_at)) FOR UPDATE OF i`,
        id,
        snapshot.classroom_id,
        actor.email_normalized,
        actor.id,
      );
      if (!invitation) return fail('ENROLLMENT_UNAVAILABLE');
      await this.enroll(tx, actor, snapshot.classroom_id, id);
      await tx.query(
        'UPDATE invitations SET accepted_at=clock_timestamp(),accepted_by_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',
        id,
        actor.id,
      );
      return { id: snapshot.classroom_id };
    });
  }
}
