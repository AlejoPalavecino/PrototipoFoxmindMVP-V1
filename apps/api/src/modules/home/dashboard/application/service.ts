import { HOME_MODULES, type HomeModules, type HomeResponse, type HomeModuleResponse } from '../../../../../../../src/core/domain/home/home.ts';
import { parseHomeQuery, parseHomePageQuery, parseHomeResponse, parseHomeModuleResponse } from '../../../../../../../src/core/domain/home/validation.ts';
import { type HomeUnitOfWork } from '../../../../../../../src/core/domain/home/ports.ts';
export interface HomeService {
  read(request: unknown, input: unknown): Promise<HomeResponse>;
  page(request: unknown, input: unknown): Promise<HomeModuleResponse>;
}
export function createHomeService(uow: HomeUnitOfWork): HomeService {
  return {
    async read(request, input) {
      const query = parseHomeQuery(input);
      return uow.run(request, false, async ({ actor, read }) => {
        const participation = await read.participation();
        const modules: Partial<HomeModules> = {};
        for (const module of HOME_MODULES) {
          const page = await read.page(module, { ...query, module, cursor: null });
          Object.assign(modules, { [module]: page });
        }
        return parseHomeResponse({ version: 1, subjectId: actor.userId, generatedAt: actor.now,
          timeZone: query.timeZone, ...participation, modules });
      });
    },
    async page(request, input) {
      const query = parseHomePageQuery(input);
      return uow.run(request, false, async ({ actor, read }) => {
        await read.participation();
        return parseHomeModuleResponse({ subjectId: actor.userId, generatedAt: actor.now,
          module: query.module, page: await read.page(query.module, query) });
      });
    },
  };
}
