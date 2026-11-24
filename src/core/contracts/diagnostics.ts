export type DiagnosticOperation = 'classroom.operation' | 'classroom.query' | 'classroom.lock' | 'grading-ai.recover' | 'grading-ai.claim' | 'grading-ai.scheduler' | 'home.read';
export type DiagnosticCode = 'COMPLETED' | 'UNEXPECTED' | 'TIMEOUT';
export interface DiagnosticEvent {
  operation: DiagnosticOperation;
  code: DiagnosticCode;
  outcome: 'success' | 'failure';
  durationMs: number;
  correlationId: string;
  /** Database error code only (Prisma `Pnnnn` or PostgreSQL SQLSTATE), or `other`. Never messages or values. */
  cause?: string;
}
export interface DiagnosticSink { record(event: DiagnosticEvent): void }
