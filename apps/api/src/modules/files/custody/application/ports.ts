import type { FileScope, FileTarget, FileAction, FileTransaction } from './contracts.ts';
import type { FileRow } from '../../domain/file-record.ts';

/** Authorization and row access are bound to the integrating caller's current transaction. */
export interface FileCustodyPort {
  transaction<T>(run: (tx: FileTransaction) => Promise<T>): Promise<T>;
  authorize(tx: FileTransaction, request: unknown, target: FileTarget, action: FileAction): Promise<{ quota: bigint; userId: string }>;
  usage(tx: FileTransaction, scope: FileScope): Promise<bigint>;
  load(tx: FileTransaction, id: string): Promise<FileRow>;
  loadAuthorized(tx: FileTransaction, request: unknown, id: string, action: FileAction): Promise<FileRow>;
}
export interface FilePromotionPort {
  promoteDraftPlan(request: unknown, id: string, classroomId: string): Promise<void>;
  promoteDraftPlanInTransaction(tx: FileTransaction, request: unknown, id: string, classroomId: string): Promise<void>;
}
export interface DocumentReader<Grant, Document> { read(grant: Grant, signal: AbortSignal): Promise<Document> }
export interface GradingAttachmentGrant { ownerId: string; classroomId: string; attemptId: string; fileId: string; digest: string }
export interface GradingInstructionGrant extends GradingAttachmentGrant { activityId: string }
export interface GradingAttachmentSnapshot { classroomId: string; attemptId: string; fileId: string; digest: string; extension: string; approved: boolean; clean: boolean }
export interface GradingAttachmentPorts<T> {
  authorize(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<void>;
  snapshot(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<GradingAttachmentSnapshot>;
  readBytes(grant: GradingAttachmentGrant, signal: AbortSignal): Promise<Uint8Array>;
  parse(bytes: Uint8Array, extension: 'pdf' | 'docx', signal: AbortSignal): Promise<T>;
}
