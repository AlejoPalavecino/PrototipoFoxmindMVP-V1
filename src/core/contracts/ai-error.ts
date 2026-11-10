import type { ExtractionError } from '../domain/index.ts';

export class AiError extends Error {
  readonly code: ExtractionError;
  constructor(code: ExtractionError) { super(code); this.code = code; }
}
