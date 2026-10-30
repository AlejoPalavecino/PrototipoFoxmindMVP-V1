import { randomUUID } from 'node:crypto';
import { ClassroomError, fail, uuid } from './policy.ts';
import { ClassroomIdentityError } from './errors.ts';
import { FileIdentityError } from '../files/public/index.ts';
import type { Actor, ClassroomPorts, Transaction } from './contracts.ts';
import { registerTransactionMode } from './context.ts';

type RawTransaction = Parameters<Parameters<ClassroomPorts['database']['$transaction']>[0]>[0];
export class ClassroomTransactionRunner {
  constructor(private readonly ports: ClassroomPorts) {}
  async run<T>(request: unknown, write: boolean, operation: (tx: Transaction, actor: Actor) => Promise<T>): Promise<T> {
    const started = performance.now(), correlationId = randomUUID();
    try {
      const result = await this.ports.database.$transaction(
        raw => this.execute(raw, request, write, operation, correlationId), { maxWait: 2000, timeout: 6000 });
      this.diagnostic('classroom.operation', 'COMPLETED', 'success', performance.now() - started, correlationId);
      return result;
    } catch (error) {
      return this.failure(error, started, correlationId);
    }
  }
  private async execute<T>(raw: RawTransaction, request: unknown, write: boolean,
    operation: (tx: Transaction, actor: Actor) => Promise<T>, correlationId: string): Promise<T> {
    const tx = this.transaction(raw, correlationId);
    registerTransactionMode(tx, write);
    const id = await this.ports.authenticate(tx, request, write);
    if (!uuid(id)) return fail('FORBIDDEN');
    const [user] = await tx.query<Actor & { email_verified_at: Date | null }>(
      'SELECT id,email,email_normalized,first_name,last_name,email_verified_at FROM users WHERE id=$1::uuid FOR SHARE', id);
    if (!user?.email_verified_at || await this.ports.authenticate(tx, request, write) !== id) return fail('FORBIDDEN');
    const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
    if (write) await this.budget(tx, id, now);
    return operation(tx, { ...user, now });
  }
  private transaction(raw: RawTransaction, correlationId: string): Transaction {
    return { query: async <T = Record<string, unknown>>(sql: string, ...args: unknown[]): Promise<T[]> => {
      const start = performance.now();
      const operation = /\bFOR (?:UPDATE|SHARE)\b/i.test(sql) ? 'classroom.lock' : 'classroom.query';
      try {
        const result = await raw.$queryRawUnsafe<T[]>(sql, ...args);
        this.diagnostic(operation, 'COMPLETED', 'success', performance.now() - start, correlationId);
        return result;
      } catch (error) {
        this.diagnostic(operation, 'UNEXPECTED', 'failure', performance.now() - start, correlationId);
        throw error;
      }
    } };
  }
  private failure(error: unknown, started: number, correlationId: string): never {
    if (error instanceof ClassroomError || error instanceof ClassroomIdentityError) throw error;
    if (error instanceof FileIdentityError) throw new ClassroomIdentityError(error);
    if (error && typeof error === 'object' && 'code' in error &&
      ['FORBIDDEN', 'QUOTA_EXCEEDED', 'UPLOAD_CONFLICT', 'FILE_NOT_READY'].includes(String(error.code))) fail('CONFLICT');
    this.diagnostic('classroom.operation', 'UNEXPECTED', 'failure', performance.now() - started, correlationId);
    return fail('SERVICE_UNAVAILABLE');
  }
  private diagnostic(operation: 'classroom.operation' | 'classroom.query' | 'classroom.lock', code: 'COMPLETED' | 'UNEXPECTED',
    outcome: 'success' | 'failure', durationMs: number, correlationId: string) {
    try { this.ports.diagnostics?.record({ operation, code, outcome, durationMs, correlationId }); } catch {}
  }
  private async budget(tx: Transaction, id: string, now: Date) {
    const [row] = await tx.query<{ request_count: number }>(`INSERT INTO account_action_controls
      (id,updated_at,action,subject_key,last_requested_at,window_started_at,request_count)
      VALUES ($1::uuid,$2,'p5-mutation',$3,$2,$2,1)
      ON CONFLICT(action,subject_key) DO UPDATE SET last_requested_at=$2,updated_at=$2,
      request_count=CASE WHEN account_action_controls.window_started_at <= $2::timestamptz-interval '1 minute' THEN 1 ELSE account_action_controls.request_count+1 END,
      window_started_at=CASE WHEN account_action_controls.window_started_at <= $2::timestamptz-interval '1 minute' THEN $2 ELSE account_action_controls.window_started_at END RETURNING request_count`, randomUUID(), now, id);
    if (row.request_count > 120) fail('CONFLICT');
  }
}
