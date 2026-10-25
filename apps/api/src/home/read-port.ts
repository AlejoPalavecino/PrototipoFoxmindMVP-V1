import { HomeError, type HomeActor, type HomeReadPort, type HomePageQuery, type HomeModuleName, type HomeModules, type HomeResponse } from '../../../../src/core/domain/index.ts';
import type { HomeSql } from './database-types.ts';
import { readParticipation } from './queries-participation.ts';
import { readSqlPage } from './sql-page.ts';
import { readMiniagenda } from './miniagenda.ts';
import { readCursor } from './cursor.ts';
const globalCodes = new Set(['AUTH_REQUIRED', 'EMAIL_VERIFICATION_REQUIRED', 'FORBIDDEN']);
export function createHomeReadPort(tx: HomeSql, actor: HomeActor): HomeReadPort {
  let participation: Pick<HomeResponse, 'participation' | 'memberships' | 'setup'> | undefined;
  return {
    async participation() { participation = await readParticipation(tx, actor.userId); return participation; },
    async page<M extends HomeModuleName>(module: M, query: HomePageQuery): Promise<HomeModules[M]> {
      if (!participation) throw new HomeError('SERVICE_UNAVAILABLE');
      readCursor(actor, query);
      if ((['pending', 'feedback'].includes(module) && !participation.memberships.study)
        || (['review', 'queries'].includes(module) && !participation.memberships.teach))
        return { status: 'not-applicable' } as HomeModules[M];
      await tx.query('SAVEPOINT home_module');
      try {
        const result = module === 'agenda' ? await readMiniagenda(tx, actor, query)
          : await readSqlPage(tx, actor, { ...query, module });
        await tx.query('RELEASE SAVEPOINT home_module');
        return result as HomeModules[M];
      } catch (error) {
        // A dead transaction cannot recover this savepoint: propagate globally rather than invent empty data.
        await tx.query('ROLLBACK TO SAVEPOINT home_module');
        await tx.query('RELEASE SAVEPOINT home_module');
        if (error && typeof error === 'object' && 'code' in error && ['57014','25P02','P2028'].includes(String(error.code))) throw new HomeError('SERVICE_UNAVAILABLE');
        if (error && typeof error === 'object' && 'code' in error && globalCodes.has(String(error.code))) throw error;
        return { status: 'error', code: 'SERVICE_UNAVAILABLE', retryable: true } as HomeModules[M];
      }
    },
  };
}
