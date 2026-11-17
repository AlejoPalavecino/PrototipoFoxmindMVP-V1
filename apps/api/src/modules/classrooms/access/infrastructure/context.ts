import { ClassroomTransactionRunner } from './context-run.ts';
import type { createCatalogOperations } from '../../catalog/public.ts';
import { randomUUID } from 'node:crypto';
import { ClassroomError, fail, PreviewTokens, uuid } from './policy.ts';
import { ClassroomIdentityError } from './errors.ts';
import type {
  Actor,
  ClassroomPorts,
  ClassroomRow,
  Transaction,
} from '../application/runtime-ports.ts';



import { isVerifiedRead } from '../application/transaction-mode.ts';
export { registerTransactionMode, isVerifiedRead } from '../application/transaction-mode.ts';
import { advanceClassroomRevision } from './revision.ts';

export class ClassroomCore {
  readonly ports: ClassroomPorts;
  readonly tokens: PreviewTokens;
  private readonly runner: ClassroomTransactionRunner;
  constructor(ports: ClassroomPorts, private readonly catalog: ReturnType<typeof createCatalogOperations>) {
    if (
      !ports ||
      typeof ports.authenticate !== 'function' ||
      !ports.database ||
      !ports.files ||
      typeof ports.classroomQuotaBytes !== 'bigint' ||
      ports.classroomQuotaBytes < 1n ||
      !Buffer.isBuffer(ports.deliveryKey) ||
      ports.deliveryKey.length !== 32
    )
      fail('SERVICE_UNAVAILABLE');
    const origin = new URL(ports.webOrigin);
    if (
      origin.origin !== ports.webOrigin ||
      origin.username ||
      origin.password ||
      (origin.protocol !== 'https:' &&
        !(
          origin.protocol === 'http:' &&
          ['localhost', '127.0.0.1'].includes(origin.hostname)
        ))
    )
      fail('SERVICE_UNAVAILABLE');
    this.ports = { ...ports, deliveryKey: Buffer.from(ports.deliveryKey) };
    this.tokens = new PreviewTokens(ports.signingKey);
    this.runner = new ClassroomTransactionRunner(this.ports);
  }
  run<T>(request: unknown, write: boolean, operation: (tx: Transaction, actor: Actor) => Promise<T>): Promise<T> {
    return this.runner.run(request, write, operation);
  }


  async classroom(
    tx: Transaction,
    actor: Pick<Actor, 'id'>,
    id: string,
    write = false,
    teacher = false,
  ): Promise<ClassroomRow & { revision: bigint }> {
    if (!uuid(id)) return fail('FORBIDDEN');
    const [row] = await tx.query<ClassroomRow & { revision: bigint }>(
      `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher_name
      FROM classrooms c JOIN users u ON u.id=c.teacher_id WHERE c.id=$1::uuid FOR ${isVerifiedRead(tx) && !write ? 'SHARE' : 'UPDATE'} OF c`,
      id,
    );
    if (!row) return fail('FORBIDDEN');
    if (row.teacher_id !== actor.id) {
      if (teacher) return fail('FORBIDDEN');
      const [membership] = await tx.query(
        `SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=$2::uuid AND m.ended_at IS NULL FOR SHARE OF e,m`,
        id,
        actor.id,
      );
      if (!membership) return fail('FORBIDDEN');
    }
    if (write && row.archived_at) return fail('CONFLICT');
    return row;
  }
  summary(row: ClassroomRow & { revision?: bigint }, actorId?: string) {
    return {
      id: row.id,
      name: row.name,
      subject: row.subject,
      division: row.division,
      academicYear: row.academic_year,
      timezone: row.timezone,
      coverKey: row.cover_key,
      archived: !!row.archived_at,
      teacher: row.teacher_name,
      role: actorId === row.teacher_id ? 'teacher' : 'student',
      ...(actorId === row.teacher_id ? { aiGradingEnabled: row.ai_grading_enabled ?? false, aiGradingAvailable: this.ports.gradingAiAvailable === true } : {}),
      revision: row.revision?.toString(),
    };
  }
  advanceRevision(tx: Transaction, classroomId: string, current: bigint) {
    return advanceClassroomRevision(tx, classroomId, current);
  }
  mine(request: unknown) { return this.catalog.mine(this, request); }
  detail(request: unknown, id: string) { return this.catalog.detail(this, request, id); }
}
