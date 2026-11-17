import type { ExtractionError } from '../domain/curriculum/ai.ts';

export class AiError extends Error {
  readonly code: ExtractionError;
  constructor(code: ExtractionError) { super(code); this.code = code; }
}
