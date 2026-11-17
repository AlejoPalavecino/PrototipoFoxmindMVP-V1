import type { FoxyCitation, FoxyTurn } from '../api/foxy-client.ts';
import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { citationPreviewHref } from './citation-preview.ts';

function sourceExclusion(reason: string) {
  return ({ FILE_NOT_READY: 'Archivo sin preparar', UNSUPPORTED_FORMAT: 'Formato sin lectura de IA', AI_INPUT_LIMIT: 'Supera el límite individual', EMPTY_CONTENT: 'Sin contenido legible' } as Record<string, string>)[reason] ?? 'No disponible';
}

export function renderFoxySourceReport({ conversationId, turnId, scopeReport, citations, onClose }: {
  conversationId: string;
  turnId: string;
  scopeReport?: FoxyTurn['classroomSources'];
  citations: FoxyCitation[];
  onClose: () => void;
}) {
  return <FoxyDialog title="Fuentes de esta respuesta" onClose={onClose}>
    {scopeReport && <>
      <h3>Usadas</h3>
      {scopeReport.used.length ? <ul>{scopeReport.used.map(item => <li key={item.sourceId}>{item.title}</li>)}</ul> : <p>La respuesta usó los temas del plan.</p>}
      {scopeReport.excluded.length > 0 && <>
        <h3>Excluidas</h3><ul>{scopeReport.excluded.map(item => <li key={item.sourceId}>{item.title} · {sourceExclusion(item.reason)}</li>)}</ul>
      </>}
    </>}
    {citations.map(citation => {
      const href = citationPreviewHref(conversationId, turnId, citation);
      return <p key={citation.id}>{citation.sourceTitle ?? 'Fuente'} {citation.documentTitle ?? ''} {citation.page ? `· página ${citation.page}` : ''}
        {href ? <> <a href={href} target="_blank" rel="noopener noreferrer">Ver documento</a></> : citation.availability === 'TEXT_ONLY' ? ' · Texto' : ' · No disponible'}
      </p>;
    })}
  </FoxyDialog>;
}
