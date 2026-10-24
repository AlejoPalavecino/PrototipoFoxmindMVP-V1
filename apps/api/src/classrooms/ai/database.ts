import { fail, uuid } from '../policy.ts';
import type { Transaction } from '../contracts.ts';
import type { ClassroomAiOptions, DraftRow, JobRow } from './contracts.ts';

export function transaction<T>(options: Pick<ClassroomAiOptions, 'database'>, operation: (tx: Transaction) => Promise<T>) {
  return options.database.$transaction(raw => operation({ query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) }),
    { maxWait: 2000, timeout: 6000 });
}
export async function owner(tx: Transaction, id: string): Promise<void> {
  if (!uuid(id)) return fail('FORBIDDEN');
  const [user] = await tx.query<{ email_verified_at: Date | null }>(
    'SELECT email_verified_at FROM users WHERE id=$1::uuid FOR SHARE', id);
  if (!user?.email_verified_at) return fail('FORBIDDEN');
}
export async function draft(tx: Transaction, ownerId: string, draftId: string): Promise<DraftRow> {
  if (!uuid(draftId)) return fail('FORBIDDEN');
  const [row] = await tx.query<DraftRow>('SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid FOR UPDATE', draftId, ownerId);
  if (!row) return fail('FORBIDDEN');
  return row;
}
export async function job(tx: Transaction, draftId: string, id: string): Promise<JobRow> {
  if (!uuid(id)) return fail('FORBIDDEN');
  const [row] = await tx.query<JobRow>('SELECT * FROM classroom_curriculum_extractions WHERE id=$1::uuid AND draft_id=$2::uuid', id, draftId);
  if (!row) return fail('FORBIDDEN');
  return row;
}
export function authorized<T>(options: ClassroomAiOptions, request: unknown, draftId: string, write: boolean,
  operation: (tx: Transaction, current: DraftRow) => Promise<T>): Promise<T> {
  return transaction(options, async tx => {
    const id = await options.authenticate(tx, request, write);
    await owner(tx, id);
    if (await options.authenticate(tx, request, write) !== id) return fail('FORBIDDEN');
    return operation(tx, await draft(tx, id, draftId));
  });
}
export function draftView(row: DraftRow) {
  return { id: row.id, revision: String(row.revision), payload: row.payload, publishedClassroomId: row.published_classroom_id };
}
