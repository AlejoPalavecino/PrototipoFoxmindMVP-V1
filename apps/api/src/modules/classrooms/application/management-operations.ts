import type { ClassroomCodePreview, InvitationBatchReceipt, InvitationBatchRecipient } from '../../../../../../src/core/contracts/classrooms.ts';
import type { Actor, Transaction } from '../access/public.ts';
import type { ClassroomAccess, PreviewTokenPort, EnrollmentPort } from '../access/public.ts';
export interface DraftRow { id: string; owner_id: string; revision: bigint; payload: unknown; published_classroom_id: string | null }
export interface DraftLookup { draft(tx: Transaction, actor: Actor, id: string): Promise<DraftRow> }
export interface DraftOperations {
 randomUUID(): string;
 publishDraft(draft: DraftLookup, request: unknown, id: string, input: unknown): Promise<{ id: string; code: null | string }>;
 updateSettings(draft: DraftLookup, request: unknown, id: string, input: unknown): Promise<{ revision: string }>;
}
export interface MembershipAccess extends Pick<ClassroomAccess, 'run' | 'classroom'>, EnrollmentPort {
 tokens: PreviewTokenPort;
 /** Keys of the classroom code HMAC (S7). */
 codeKeys?: { readonly signingKey?: Buffer; readonly codeDigestKey?: Buffer };
 membershipEvent(tx: Transaction, enrollmentId: string, periodId: string, event: string): Promise<void>;
 recordActivityEligibility(tx: Transaction, classroomId: string, event: {enrollment: string} | {publication: string}): Promise<void>;
}
export interface MembershipOperations {
 randomUUID(): string;
 digest(text: string): string;
 recordActivityEligibility: MembershipAccess['recordActivityEligibility'];
 previewCodeOperation(capability: MembershipAccess, request: unknown, input: unknown): Promise<ClassroomCodePreview>;
 confirmCodeOperation(capability: MembershipAccess, request: unknown, confirmation: unknown): Promise<{id: string}>;
 endMembershipOperation(capability: MembershipAccess, request: unknown, id: string, studentId: string | null): Promise<{ok: boolean}>;
 membersOperation(capability: MembershipAccess, request: unknown, id: string, history?: boolean): Promise<{ firstName: string; lastName: string }[]>;
}
export interface InvitationOperations {
 batch: {
  reserve(request: unknown, classroomId: string, input: unknown): Promise<InvitationBatchReceipt>;
  read(request: unknown, classroomId: string, requestId: unknown): Promise<InvitationBatchReceipt>;
  emit(request: unknown, classroomId: string, requestId: unknown, index: number): Promise<InvitationBatchRecipient>;
 };
 invite(request: unknown, classroomId: string, input: unknown): Promise<{delivery: string; id: string;generation: string}>;
 recipient(envelope: string, aad: string): string;
}
