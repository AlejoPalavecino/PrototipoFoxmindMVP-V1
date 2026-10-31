import type { SqlDatabase, SqlTransaction } from '../../../../src/core/domain/index.ts';

export interface FoxyActor { id: string; accountRole: 'teacher'; now: Date }
type Authenticate = (tx: SqlTransaction, request: unknown, write: boolean) => Promise<string>;
const publicCodes = new Set(['INVALID_INPUT', 'NOT_FOUND', 'FORBIDDEN', 'CONFLICT', 'SERVICE_UNAVAILABLE',
  'AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED', 'RATE_LIMITED',
  'FILE_NOT_READY', 'AI_INPUT_LIMIT', 'EMPTY_CONTENT', 'AI_UNAVAILABLE', 'AI_BUDGET_EXCEEDED']);
type UserRow = { id: string; account_role: string; email_verified_at: Date | null };
function forbidden(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
function identity(value: unknown): string {
  if (typeof value !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/iu.test(value)) return forbidden();
  return value;
}
export function createFoxyUnitOfWork(options: { database: SqlDatabase; authenticate: Authenticate }) {
  return {
    async run<T>(request: unknown, write: boolean, operation: (tx: SqlTransaction, actor: FoxyActor) => Promise<T>): Promise<T> {
      try { return await options.database.$transaction(async raw => {
        const tx: SqlTransaction = { query: (sql, ...args) => raw.$queryRawUnsafe(sql, ...args) };
        const id = identity(await options.authenticate(tx, request, write));
        const [user] = await tx.query<UserRow>(`SELECT id,account_role,email_verified_at FROM users WHERE id=$1::uuid ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, id);
        if (!user || user.account_role !== 'teacher' || !user.email_verified_at || user.id.toLowerCase() !== id.toLowerCase()) return forbidden();
        if (identity(await options.authenticate(tx, request, write)).toLowerCase() !== id.toLowerCase()) return forbidden();
        const result = await operation(tx, { id: user.id, accountRole: 'teacher', now: new Date() });
        if (identity(await options.authenticate(tx, request, write)).toLowerCase() !== id.toLowerCase()) return forbidden();
        return result;
      }, { maxWait: 2000, timeout: 6000 });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && publicCodes.has(String(error.code))) throw error;
        throw Object.assign(new Error('SERVICE_UNAVAILABLE'), { code: 'SERVICE_UNAVAILABLE' });
      }
    },
  };
}
