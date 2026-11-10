import { AgendaError, agendaId, type AgendaUnitOfWork } from '../../../../../../src/core/domain/agenda/index.ts';
import type { AcademicAgendaFactory, AgendaAuthentication, AgendaDatabase, AgendaQuery } from '../application/ports.ts';
import { createPrivateEventRepository } from './event-repository.ts';

const publicCodes = new Set(['INVALID_INPUT', 'FORBIDDEN', 'CONFLICT', 'SERVICE_UNAVAILABLE',
  'AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'CSRF_INVALID', 'ORIGIN_NOT_ALLOWED', 'RATE_LIMITED']);
export function createAgendaUnitOfWork(database: AgendaDatabase, authenticate: AgendaAuthentication,
  createAcademic: AcademicAgendaFactory): AgendaUnitOfWork {
  return {
    async run(request, write, operation) {
      try {
        return await database.$transaction(async raw => {
          const tx: AgendaQuery = { query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) };
          const userId = agendaId(await authenticate(tx, request, write));
          // Serialize owner writes and revalidate identity after waiting for the mutation lock.
          const rows = await tx.query<{ email_verified_at: Date | null }>(
            `SELECT email_verified_at FROM users WHERE id=$1::uuid ${write ? 'FOR UPDATE' : 'FOR SHARE'}`, userId);
          if (!rows[0]?.email_verified_at || await authenticate(tx, request, write) !== userId) throw new AgendaError('FORBIDDEN');
          const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
          const actor = { userId, now: now.toISOString() };
          const result = await operation({ actor, events: createPrivateEventRepository(tx, userId), academic: createAcademic(tx, actor) });
          if (await authenticate(tx, request, write) !== userId) throw new AgendaError('FORBIDDEN');
          return result;
        }, { maxWait: 2000, timeout: 6000 });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && publicCodes.has(String(error.code))) throw error;
        throw new AgendaError('SERVICE_UNAVAILABLE');
      }
    },
  };
}
