import { createHash } from 'node:crypto';
import { isDeepStrictEqual } from 'node:util';
import { agendaId } from '../../../../../../../src/core/domain/agenda/values.ts';
import type { FoxyGroundingFile } from '../../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyUnitOfWork } from '../../application/ports.ts';
import { mapFoxyCitations } from './citation-mapping.ts';
import { citationDocument, loadCitationTurn } from './citation-repository.ts';

type Files = { read(request: unknown, id: string, mode: 'preview' | 'download'): Promise<{ bytes: Uint8Array }> };
type Target = { classroomId: string; sourceId: string; sourceKind: string; page: number | null; file: FoxyGroundingFile };
function missing(): never { throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' }); }
export function createCitationFileReader(options: { uow: FoxyUnitOfWork; files: unknown }) {
  async function resolve(request: unknown, conversationId: string, turnId: string, citationId: string): Promise<Target> {
    return options.uow.run(request, false, async (tx, actor) => {
      const turn = await loadCitationTurn(tx, actor.id, conversationId, turnId);
      if (!turn.classroom_id || turn.snapshot?.context?.kind !== 'CLASSROOM'
        || turn.snapshot.context.classroomId.toLowerCase() !== turn.classroom_id.toLowerCase()) return missing();
      const citation = mapFoxyCitations({ answer: turn.answer, snapshot: turn.snapshot,
        referenceMap: turn.reference_map, sourceReport: turn.source_report }).find(item => item.citationKey === citationId);
      if (!citation?.available || !citation.file || !citation.sourceKind) return missing();
      if (!await citationDocument(tx, turn.classroom_id, citation.sourceId, citation.sourceKind, citation.file)) return missing();
      return { classroomId: turn.classroom_id, sourceId: citation.sourceId, sourceKind: citation.sourceKind,
        page: citation.page, file: citation.file };
    });
  }
  return async (request: unknown, conversationId: string, turnId: string, citationId: string, mode: 'preview' | 'download') => {
    agendaId(conversationId); agendaId(turnId);
    if (typeof citationId !== 'string' || !/^c[1-9][0-9]*$/u.test(citationId) || !['preview', 'download'].includes(mode)) return missing();
    const files = options.files as Files;
    if (!files || typeof files.read !== 'function') return missing();
    const before = await resolve(request, conversationId, turnId, citationId);
    const result = await files.read(request, before.file.fileId, mode);
    if (!(result.bytes instanceof Uint8Array)) return missing();
    const bytes = Buffer.from(result.bytes);
    if (bytes.length !== before.file.sizeBytes
      || createHash('sha256').update(bytes).digest('hex') !== before.file.digest) return missing();
    const after = await resolve(request, conversationId, turnId, citationId);
    if (!isDeepStrictEqual(before, after) || bytes.length !== after.file.sizeBytes
      || createHash('sha256').update(bytes).digest('hex') !== after.file.digest) return missing();
    const inline = mode === 'preview' && before.file.extension === 'pdf';
    return { bytes, headers: { 'Content-Type': before.file.extension === 'pdf' ? 'application/pdf' : 'application/octet-stream',
      'Content-Length': String(bytes.length), 'Content-Disposition': inline ? 'inline' : 'attachment',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Cross-Origin-Resource-Policy': 'same-origin',
      'Content-Security-Policy': "sandbox; default-src 'none'" } };
  };
}
