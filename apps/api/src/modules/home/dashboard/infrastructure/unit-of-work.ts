import { HomeError } from '../../../../../../../src/core/domain/home/home.ts';
import { agendaId } from '../../../../../../../src/core/domain/agenda/values.ts';
import { type HomeUnitOfWork } from '../../../../../../../src/core/domain/home/ports.ts';
import type { HomeAuthentication, HomeDatabase, HomeSql } from './database-types.ts';
import { createHomeReadPort } from './read-port.ts';
import { membershipFingerprint } from './queries-participation.ts';
const publicCodes = new Set(['INVALID_INPUT','FORBIDDEN','SERVICE_UNAVAILABLE','AUTH_REQUIRED','EMAIL_VERIFICATION_REQUIRED','CSRF_INVALID','ORIGIN_NOT_ALLOWED','RATE_LIMITED']);
export function createHomeUnitOfWork(database: HomeDatabase, authenticate: HomeAuthentication): HomeUnitOfWork {
  return {
    async run(request, write, operation) {
      if (write) throw new HomeError('FORBIDDEN');
      try {
        return await database.$transaction(async raw => {
          const tx: HomeSql = { query: (sql, ...values) => raw.$queryRawUnsafe(sql, ...values) };
          const userId = agendaId(await authenticate(tx, request, false));
          const [{ now }] = await tx.query<{ now: Date }>('SELECT clock_timestamp() AS now');
          const actor = { userId, now: now.toISOString() }, fingerprint = await membershipFingerprint(tx, userId);
          const result = await operation({ actor, read: createHomeReadPort(tx, actor) });
          if (await authenticate(tx, request, false) !== userId || await membershipFingerprint(tx, userId) !== fingerprint)
            throw new HomeError('FORBIDDEN');
          return result;
        }, { maxWait: 2000, timeout: 6000 });
      } catch (error) {
        if (error && typeof error === 'object' && 'code' in error && publicCodes.has(String(error.code))) throw error;
        throw new HomeError('SERVICE_UNAVAILABLE');
      }
    },
  };
}
