import type { FoxyUnitOfWork } from './ports.ts';
import { agendaId } from '../../../../../../src/core/domain/index.ts';

import type { FoxyCitationPort } from './citation-ports.ts';
type Options = { uow: FoxyUnitOfWork; citations: FoxyCitationPort; readFile: FoxyCitationPort['readFile'] };
function safeTitle(value: string | null): string | null {
  return value?.replace(/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}/giu, '[identificador]') ?? null;
}
export function createFoxyCitationService(options: Options) {
  return {
    readFile: options.readFile,
    async list(request: unknown, conversationId: string, turnId: string) {
      agendaId(conversationId); agendaId(turnId);
      return options.uow.run(request, false, async (tx, actor) => {
        const turn = await options.citations.loadTurn(tx, actor.id, conversationId, turnId);
        const references = options.citations.map({ answer: turn.answer, snapshot: turn.snapshot,
          referenceMap: turn.reference_map, sourceReport: turn.source_report });
        const items = [];
        for (const citation of references) {
          const sameRoom = turn.classroom_id && turn.snapshot?.context?.kind === 'CLASSROOM'
            && turn.snapshot.context.classroomId.toLowerCase() === turn.classroom_id.toLowerCase();
          const found = sameRoom && citation.available && citation.file && citation.sourceKind
            ? await options.citations.document(tx, turn.classroom_id!, citation.sourceId, citation.sourceKind, citation.file) : null;
          const textOnly = sameRoom && citation.available && !citation.file && citation.sourceKind === 'ACTIVITY'
            && citation.documentKey === null && citation.page === null
            ? await options.citations.textActivity(tx, citation.sourceId.slice('activity:'.length), turn.classroom_id!) : false;
          const attached = citation.sourceKind === 'ATTACHMENT' && citation.available
            ? (await tx.query(`SELECT id FROM chat_attachments WHERE id=$1::uuid AND owner_id=$2::uuid
                AND conversation_id=$3::uuid AND folder_id IS NULL AND ready_at IS NOT NULL AND removed_at IS NULL`,
              citation.sourceId.slice('attachment:'.length), actor.id, conversationId)).length > 0 : false;
          items.push({ id: citation.citationKey, sourceKind: citation.sourceKind, sourceTitle: safeTitle(citation.sourceTitle),
            documentTitle: safeTitle(found?.original_name ?? null), page: citation.page, availability: found ? 'AVAILABLE' : textOnly || attached ? 'TEXT_ONLY' : 'UNAVAILABLE',
            href: found ? `/api/v1/foxy-ai/conversations/${conversationId}/turns/${turnId}/citations/${citation.citationKey}/file` : null });
        }
        return items;
      });
    },
  };
}
