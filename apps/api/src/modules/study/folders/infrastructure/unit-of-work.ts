import { studyFail, studyId } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyOptions, StudyQuery } from '../../application/contracts.ts';
import type { StudentUnitOfWork } from '../../application/ports.ts';
export function createStudentUnitOfWork(options: Pick<StudyOptions, 'database' | 'authenticate'>): StudentUnitOfWork {
    async function run<T>(request: unknown, write: boolean, op: (tx: StudyQuery, owner: string) => Promise<T>): Promise<T> {
        return options.database.$transaction(async (raw) => {
            const tx: StudyQuery = { query: (sql, ...v) => raw.$queryRawUnsafe(sql, ...v) };
            const owner = studyId(await options.authenticate(tx, request, write));
            const [actor] = await tx.query<{
                account_role: string;
                email_verified_at: Date | null;
            }>(`SELECT account_role,email_verified_at FROM users WHERE id=$1::uuid ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, owner);
            if (actor?.account_role !== 'student' || !actor.email_verified_at)
                studyFail('FORBIDDEN');
            if (await options.authenticate(tx, request, write) !== owner)
                studyFail('FORBIDDEN');
            const result = await op(tx, owner);
            if (await options.authenticate(tx, request, write) !== owner)
                studyFail('FORBIDDEN');
            return result;
        }, { maxWait: 3000, timeout: 30000 });
    }
return { run };
}
