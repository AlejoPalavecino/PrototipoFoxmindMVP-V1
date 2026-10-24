import type { ExtractionError } from '../../../../src/core/domain/index.ts';

export class AiError extends Error {
  readonly code: ExtractionError;
  constructor(code: ExtractionError) { super(code); this.code = code; }
}
