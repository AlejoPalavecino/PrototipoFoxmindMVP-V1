import type { DocumentExtension } from '../documents/document-formats.ts';
import type { FoxyContext } from './foxy-ai.ts';
import type { PlanDocument } from '../curriculum/ai.ts';

export interface ChatAttachmentSource {
  fileId: string;
  title: string;
  extension: DocumentExtension;
  sizeBytes: number;
  digest: string;
}

export interface FoxyGroundingFile {
  fileId: string; digest: string; extension: DocumentExtension; sizeBytes: number; purpose: string; targetId: string | null;
}
export interface FoxyGroundingSource {
  sourceId: string; title: string; kind: 'PLAN' | 'MATERIAL' | 'ACTIVITY' | 'ATTACHMENT'; text: string; files: FoxyGroundingFile[];
}
export interface FoxyGroundingSnapshot {
  context: FoxyContext; curriculum: { units: unknown[]; selectedTopicIds: string[] } | null; sources: FoxyGroundingSource[];
  attachments?: ChatAttachmentSource[];
  classroomScope?: { revision: string; excluded: { sourceId: string; title: string; reason: string }[] };
}
export interface FoxyParsedDocument {
  fileId: string; digest: string; document: PlanDocument; pageCount: number | null; warnings: string[];
}
export interface FoxyGrounding {
  context: FoxyContext; curriculum: FoxyGroundingSnapshot['curriculum'];
  sources: { sourceKey: string; title: string; kind: FoxyGroundingSource['kind']; text: string; documentKeys: string[] }[];
  documents: { documentKey: string; sourceKeys: string[]; document: PlanDocument; pageCount: number | null; warnings: string[] }[];
  referenceMap: { sourceKey: string; sourceId: string; documentKeys: string[] }[];
  warnings: string[];
}
