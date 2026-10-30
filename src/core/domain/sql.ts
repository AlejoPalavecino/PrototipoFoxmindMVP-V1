export interface SqlTransaction {
  query<T = Record<string, unknown>>(sql: string, ...values: unknown[]): Promise<T[]>;
}
export interface SqlDatabase {
  $transaction<T>(operation: (tx: { $queryRawUnsafe<T>(sql: string, ...values: unknown[]): Promise<T> }) => Promise<T>,
    options: { maxWait: number; timeout: number }): Promise<T>;
}
