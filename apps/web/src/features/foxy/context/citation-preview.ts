import type { FoxyCitation } from '../api/foxy-client.ts';

export function citationPreviewHref(conversationId: string, turnId: string, citation: Pick<FoxyCitation, 'id' | 'availability' | 'href'>): string | null {
  const expected = `/api/v1/foxy-ai/conversations/${conversationId}/turns/${turnId}/citations/${citation.id}/file?mode=preview`;
  return /^c[1-9][0-9]*$/u.test(citation.id) && citation.availability === 'AVAILABLE' && citation.href === expected ? expected : null;
}
