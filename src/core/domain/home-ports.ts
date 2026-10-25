import type { HomeModules, HomeModuleName, HomePageQuery, HomeResponse } from './home.ts';
export interface HomeActor { userId: string; now: string }
export interface HomeReadPort {
  participation(): Promise<Pick<HomeResponse, 'participation' | 'memberships' | 'setup'>>;
  page<M extends HomeModuleName>(module: M, query: HomePageQuery): Promise<HomeModules[M]>;
}
export interface HomeUnit { actor: HomeActor; read: HomeReadPort }
export interface HomeUnitOfWork {
  run<T>(request: unknown, write: boolean, operation: (unit: HomeUnit) => Promise<T>): Promise<T>;
}
