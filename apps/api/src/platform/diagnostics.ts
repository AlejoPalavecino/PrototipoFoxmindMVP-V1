import type { DiagnosticEvent, DiagnosticSink } from '../../../../src/core/contracts/diagnostics.ts';

type Options = { maxEventsPerWindow?: number; windowMs?: number; now?: () => number };
const operations = new Set(['classroom.operation', 'classroom.query', 'classroom.lock', 'grading-ai.recover', 'grading-ai.claim', 'grading-ai.scheduler', 'home.read']);
const codes = new Set(['COMPLETED', 'UNEXPECTED', 'TIMEOUT']);
const causePattern = /^(?:P\d{4}|[0-9A-Z]{5}|other)$/;
/** Reduces an error to a database code (raw-query SQLSTATE first, then Prisma or driver code) without any message. */
export function diagnosticCause(error: unknown): string {
  const read = (value: unknown) => value && typeof value === 'object' && 'code' in value && typeof value.code === 'string' ? value.code : undefined;
  const meta = error && typeof error === 'object' && 'meta' in error ? read(error.meta) : undefined;
  for (const code of [meta, read(error)]) if (code && code !== 'other' && causePattern.test(code)) return code;
  return 'other';
}
export function createDiagnosticSink(write: (line: string) => void, options: Options = {}): DiagnosticSink {
  let start = 0, count = 0, suppressed = 0;
  const seen = new Set<string>();
  return { record(event: DiagnosticEvent) {
    try {
      if (!operations.has(event.operation) || !codes.has(event.code) || !['success', 'failure'].includes(event.outcome)
        || !Number.isFinite(event.durationMs) || event.durationMs < 0
        || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(event.correlationId)) return;
      const now = (options.now ?? Date.now)();
      if (now - start >= (options.windowMs ?? 60000)) { start = now; count = 0; seen.clear(); }
      const key = `${event.operation}:${event.code}:${event.outcome}`;
      if (seen.has(key) || count >= (options.maxEventsPerWindow ?? 100)) { suppressed++; return; }
      const { operation, code, outcome, durationMs, correlationId } = event;
      const cause = typeof event.cause === 'string' && causePattern.test(event.cause) ? { cause: event.cause } : {};
      write(JSON.stringify({ operation, code, outcome, durationMs, correlationId, ...cause, ...(suppressed ? { suppressedCount: suppressed } : {}) }) + '\n');
      count++; seen.add(key); suppressed = 0;
    } catch { /* Diagnostics must never affect the operation. */ }
  } };
}
