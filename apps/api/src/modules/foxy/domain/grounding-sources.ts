import type { FoxyGroundingSnapshot, FoxyGroundingSource } from '../../../../../../src/core/domain/foxy/grounding.ts';
export function groundingSources(snapshot: FoxyGroundingSnapshot): FoxyGroundingSource[] {
  return [...snapshot.sources, ...(snapshot.attachments ?? []).map(file => ({
    sourceId: `attachment:${file.fileId}`, title: file.title, kind: 'ATTACHMENT' as const, text: '',
    files: [{ fileId: file.fileId, digest: file.digest, sizeBytes: file.sizeBytes, extension: file.extension,
      purpose: 'attachment', targetId: null }],
  }))];
}
