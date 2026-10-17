import { randomUUID } from 'node:crypto';
import { ClassroomError, fail, PreviewTokens, uuid } from './policy.ts';
import type {
  Actor,
  ClassroomPorts,
  ClassroomRow,
  Transaction,
} from './contracts.ts';

export class ClassroomCore {
  readonly ports: ClassroomPorts;
  readonly tokens: PreviewTokens;
  constructor(ports: ClassroomPorts) {
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
  }
  async run<T>(
    request: unknown,
    write: boolean,
    operation: (tx: Transaction, actor: Actor) => Promise<T>,
  ): Promise<T> {
    try {
      return await this.ports.database.$transaction(
        async (raw) => {
          const tx: Transaction = {
            query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args),
          };
          const id = await this.ports.authenticate(tx, request, write);
          if (!uuid(id)) return fail('FORBIDDEN');
          const [user] = await tx.query<
            Actor & { email_verified_at: Date | null }
          >(
            'SELECT id,email,email_normalized,first_name,last_name,email_verified_at FROM users WHERE id=$1::uuid FOR SHARE',
            id,
          );
          if (
            !user?.email_verified_at ||
            (await this.ports.authenticate(tx, request, write)) !== id
          )
            return fail('FORBIDDEN');
          const [{ now }] = await tx.query<{ now: Date }>(
            'SELECT clock_timestamp() AS now',
          );
          const actor = { ...user, now };
          if (write) await this.budget(tx, id, now);
          return operation(tx, actor);
        },
        { maxWait: 2000, timeout: 6000 },
      );
    } catch (e) {
      if (e instanceof ClassroomError) throw e;
      // File errors must retain denial/conflict semantics without leaking internals.
      if (
        e &&
        typeof e === 'object' &&
        'code' in e &&
        [
          'FORBIDDEN',
          'QUOTA_EXCEEDED',
          'UPLOAD_CONFLICT',
          'FILE_NOT_READY',
        ].includes(String(e.code))
      )
        fail('CONFLICT');
      return fail('SERVICE_UNAVAILABLE');
    }
  }
  private async budget(tx: Transaction, id: string, now: Date) {
    const [row] = await tx.query<{ request_count: number }>(
      `INSERT INTO account_action_controls
      (id,updated_at,action,subject_key,last_requested_at,window_started_at,request_count)
      VALUES ($1::uuid,$2,'p5-mutation',$3,$2,$2,1)
      ON CONFLICT(action,subject_key) DO UPDATE SET last_requested_at=$2,updated_at=$2,
      request_count=CASE WHEN account_action_controls.window_started_at <= $2::timestamptz-interval '1 minute' THEN 1 ELSE account_action_controls.request_count+1 END,
      window_started_at=CASE WHEN account_action_controls.window_started_at <= $2::timestamptz-interval '1 minute' THEN $2 ELSE account_action_controls.window_started_at END RETURNING request_count`,
      randomUUID(),
      now,
      id,
    );
    if (row.request_count > 120) fail('CONFLICT');
  }
  async classroom(
    tx: Transaction,
    actor: Actor,
    id: string,
    write = false,
    teacher = false,
  ): Promise<ClassroomRow & { revision: bigint }> {
    if (!uuid(id)) return fail('FORBIDDEN');
    const [row] = await tx.query<ClassroomRow & { revision: bigint }>(
      `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher_name
      FROM classrooms c JOIN users u ON u.id=c.teacher_id WHERE c.id=$1::uuid FOR UPDATE OF c`,
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
      revision: row.revision?.toString(),
    };
  }
  mine(request: unknown) {
    return this.run(request, false, async (tx, actor) => {
      const rows = await tx.query<ClassroomRow>(
        `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher_name FROM classrooms c
        JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=$1::uuid OR EXISTS(SELECT 1 FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL)
        ORDER BY c.created_at DESC,c.id`,
        actor.id,
      );
      return {
        teach: rows
          .filter((c) => c.teacher_id === actor.id)
          .map((c) => this.summary(c, actor.id)),
        study: rows
          .filter((c) => c.teacher_id !== actor.id)
          .map((c) => this.summary(c, actor.id)),
      };
    });
  }
  detail(request: unknown, id: string) {
    return this.run(request, false, async (tx, actor) => {
      const row = await this.classroom(tx, actor, id);
      const units = await tx.query(
        `SELECT u.id,u.name,u.position,COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'status',t.status)
        ORDER BY t.position,t.id) FILTER(WHERE t.id IS NOT NULL),'[]') AS topics FROM units u LEFT JOIN topics t ON t.unit_id=u.id
        WHERE u.classroom_id=$1::uuid GROUP BY u.id ORDER BY u.position,u.id`,
        id,
      );
      const plans = await tx.query(
        'SELECT id,file_id AS "fileId",version_number AS version FROM study_plan_versions WHERE classroom_id=$1::uuid ORDER BY version_number DESC',
        id,
      );
      return { ...this.summary(row, actor.id), units, plans };
    });
  }
}
