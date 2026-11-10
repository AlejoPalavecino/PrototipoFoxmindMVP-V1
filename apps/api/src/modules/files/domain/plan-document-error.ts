export class PlanDocumentError extends Error {
  readonly code: 'AI_INPUT_LIMIT' | 'FILE_NOT_READY';
  constructor(code: 'AI_INPUT_LIMIT' | 'FILE_NOT_READY' = 'FILE_NOT_READY') { super(code); this.code = code; }
}
