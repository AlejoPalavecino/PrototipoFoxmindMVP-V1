/** Technical dispatch only; no framework, backend service or persisted data is exposed. */
export interface AcademicRouteContext {
  request: unknown;
  method: string;
  path: string[];
  body: unknown;
  search: URLSearchParams;
  headers: Readonly<Record<string, string | readonly string[] | undefined>>;
  exact(keys: string[], optional?: string[]): Record<string, unknown>;
}

export type AcademicRouteResult =
  | { handled: false }
  | { handled: true; value: unknown };

export interface AcademicRoute {
  /** Relative precedence of the original transport branch; not a public HTTP field. */
  readonly order: number;
  handle(context: AcademicRouteContext): Promise<AcademicRouteResult>;
}
