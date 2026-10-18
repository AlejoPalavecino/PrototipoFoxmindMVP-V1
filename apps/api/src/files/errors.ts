export type FileErrorCode = 'INVALID_UPLOAD' | 'FILE_TOO_LARGE' | 'FILE_REJECTED' | 'FILE_NOT_READY'
  | 'FORBIDDEN' | 'NOT_FOUND' | 'UPLOAD_CONFLICT' | 'QUOTA_EXCEEDED' | 'SERVICE_UNAVAILABLE';
export class FileError extends Error {
  readonly code: FileErrorCode;
  constructor(code: FileErrorCode) { super(code); this.name = 'FileError'; this.code = code; }
}
