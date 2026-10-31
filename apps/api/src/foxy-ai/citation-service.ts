import { createCitationFileReader } from './citation-read.ts';
import { agendaId } from '../../../../src/core/domain/index.ts';
import type { createFoxyUnitOfWork } from './unit-of-work.ts';
import { mapFoxyCitations } from './citation-mapping.ts';
import { citationDocument, loadCitationTurn } from './citation-repository.ts';

type Options = { uow: ReturnType<typeof createFoxyUnitOfWork>; files: unknown };
function safeTitle(value: string | null): string | null {
  return value?.replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/giu, '[identificador]') ?? null;
}
export function createFoxyCitationService(options: Options) {
  return {
    readFile: createCitationFileReader(options),
    async list(request: unknown, conversationId: string, turnId: string) {
      agendaId(conversationId); agendaId(turnId);
      return options.uow.run(request, false, async (tx, actor) => {
        const turn = await loadCitationTurn(tx, actor.id, conversationId, turnId);
        const references = mapFoxyCitations({ answer: turn.answer, snapshot: turn.snapshot,
          referenceMap: turn.reference_map, sourceReport: turn.source_report });
        const items = [];
        for (const citation of references) {
          const sameRoom = turn.classroom_id && turn.snapshot?.context?.kind === 'CLASSROOM'
            && turn.snapshot.context.classroomId.toLowerCase() === turn.classroom_id.toLowerCase();
          const found = sameRoom && citation.available && citation.file && citation.sourceKind
            ? await citationDocument(tx, turn.classroom_id!, citation.sourceId, citation.sourceKind, citation.file) : null;
          const textOnly = sameRoom && citation.available && !citation.file && citation.sourceKind === 'ACTIVITY'
            && citation.documentKey === null && citation.page === null
            ? (await tx.query(`SELECT id FROM activities WHERE id=$1::uuid AND classroom_id=$2::uuid
                AND status='PUBLISHED' FOR SHARE`, citation.sourceId.slice('activity:'.length), turn.classroom_id)).length > 0 : false;
          items.push({ id: citation.citationKey, sourceKind: citation.sourceKind, sourceTitle: safeTitle(citation.sourceTitle),
            documentTitle: safeTitle(found?.original_name ?? null), page: citation.page, availability: found ? 'AVAILABLE' : textOnly ? 'TEXT_ONLY' : 'UNAVAILABLE',
            href: found ? `/api/v1/foxy-ai/conversations/${conversationId}/turns/${turnId}/citations/${citation.citationKey}/file` : null });
        }
        return items;
      });
    },
  };
}
