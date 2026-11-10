import type { FileCustodyPort, FilePromotionPort } from '../../files/public.ts';
import type { Actor, ClassroomRow, Transaction } from './contracts.ts';
export type { Actor, ClassroomRow, Transaction } from './contracts.ts';
/** Access always receives the existing transaction; it never starts an academic subtransaction. */
export interface ClassroomAccess {
 run<T>(request: unknown, write: boolean, operation: (tx: Transaction, actor: Actor) => Promise<T>): Promise<T>;
 classroom(tx: Transaction, actor: Pick<Actor, 'id'>, id: string, write?: boolean, teacher?: boolean): Promise<ClassroomRow & { revision: bigint }>;
 advanceRevision(tx: Transaction, classroomId: string, current: bigint): Promise<{ revision: string }>;
}
export interface PreviewData { actor: string; codeId: string; digest: string; classroomId: string; expires: number }
export interface PreviewTokenPort {
 issue(data: PreviewData): string;
 read(token: unknown, actor: string, now: number): PreviewData;
}
export interface EnrollmentPort {
 enroll(tx: Transaction, actor: Actor, classroomId: string, invitationId: string | null): Promise<void>;
}

export interface AcademicFeaturePorts {
 files: Pick<FileCustodyPort, 'load' | 'loadAuthorized'>;
 gradingAiAvailable?: boolean;
 studentAiEnabled?: boolean;
 validateActivityGeneration?(tx: Transaction, request: unknown, activityId: string): Promise<void>;
}
export interface AcademicFeatureContext extends ClassroomAccess { ports: AcademicFeaturePorts }
export type RevisionPort = ClassroomAccess['advanceRevision'];

export type { AcademicAgendaPort } from '../../../../../../src/core/domain/agenda/index.ts';
