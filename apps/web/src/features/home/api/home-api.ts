import type { AgendaPage, AgendaRange } from '../../../../../../src/core/domain/agenda/index.ts';
import type { HomeResponse, HomeModuleResponse, HomeQuery, HomePageQuery } from '../../../../../../src/core/domain/index.ts';
export interface HomeClient {
  read(query: HomeQuery, signal?: AbortSignal): Promise<HomeResponse>;
  page(query: HomePageQuery, signal?: AbortSignal): Promise<HomeModuleResponse>;
}
export class HomeClientError extends Error {
  readonly code: string;
  readonly status: number;
  constructor(code: string, status: number) { super(code); this.code=code; this.status=status; }
}

/** Read-only calendar port consumed by Home; the application injects its compatible client. */
export interface HomeAgendaReader {
  list(range: AgendaRange, cursor?: string | null, signal?: AbortSignal): Promise<AgendaPage>;
}
