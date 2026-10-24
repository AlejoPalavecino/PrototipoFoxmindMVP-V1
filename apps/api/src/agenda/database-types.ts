export interface AgendaQuery {
  query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
export interface AgendaDatabase {
  $transaction<T>(operation: (raw: {
    $queryRawUnsafe<T = unknown>(sql: string, ...values: unknown[]): Promise<T>;
  }) => Promise<T>, options?: { maxWait: number; timeout: number }): Promise<T>;
}
export type AgendaAuthentication = (tx: AgendaQuery, request: unknown, write: boolean) => Promise<string>;
