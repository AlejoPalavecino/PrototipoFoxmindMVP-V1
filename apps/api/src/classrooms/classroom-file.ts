import { requireReady } from '../files/public/index.ts';
import type { ClassroomPorts, Transaction } from './contracts.ts';
import { fail, uuid } from './policy.ts';
import type { advanceClassroomRevision } from './revision.ts';

export function createReadyClassroomFile(files: Pick<ClassroomPorts['files'], 'load' | 'loadAuthorized'>) {
  return async (tx: Transaction, request: unknown, classroomId: string, fileId: unknown, purpose: 'plan' | 'material') => {
    if (!uuid(fileId)) return fail('INVALID_INPUT');
    const row = await files.load(tx, fileId);
    // Reject a foreign scope before taking a lock in a different classroom.
    if (row.classroom_id !== classroomId || row.classroom_draft_id !== null || row.purpose !== purpose || row.target_id !== null) return fail('FORBIDDEN');
    const current = await files.loadAuthorized(tx, request, fileId, 'read');
    requireReady(current);
    return current;
  };
}

export interface ClassroomFileOperations {
  readyClassroomFile: ReturnType<typeof createReadyClassroomFile>;
  advanceRevision: typeof advanceClassroomRevision;
}
