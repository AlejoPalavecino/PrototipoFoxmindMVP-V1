export interface HomeSql { query<T>(sql: string, ...values: unknown[]): Promise<T[]> }
export interface HomeRawTransaction { $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T> }
export interface HomeDatabase {
  $transaction<T>(operation: (tx: HomeRawTransaction) => Promise<T>, options: { maxWait: number; timeout: number }): Promise<T>;
}
export type HomeAuthentication = (tx: HomeSql, request: unknown, write: boolean) => Promise<string>;
