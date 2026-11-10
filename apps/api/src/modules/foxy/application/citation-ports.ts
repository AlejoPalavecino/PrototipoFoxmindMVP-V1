import type { FoxyGroundingSnapshot, FoxyGroundingFile } from '../../../../../../src/core/domain/foxy/grounding.ts';
import type { FoxyAnswer } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
type Reference = { sourceKey: string; sourceId: string; documentKeys: string[] };
type Citation = { sourceId: string; documentKey: string | null; page: number | null };
type Report = { sourceKey: string; title: string; kind: string; documentKeys: string[]; citations: Citation[] };
export interface CitationTurn {
 classroom_id: string | null; answer: FoxyAnswer; snapshot: FoxyGroundingSnapshot;
 reference_map: Reference[]; source_report: Report[];
}
export interface CitationResult {
 citationKey: string; sourceId: string; sourceTitle: string | null; sourceKind: string | null;
 documentKey: string | null; page: number | null; available: boolean; file: FoxyGroundingFile | null;
}
export interface FoxyCitationPort {
 loadTurn(tx: SqlTransaction, owner: string, conversationId: string, turnId: string): Promise<CitationTurn>;
 map(input: { answer: FoxyAnswer; sourceReport: Report[]; referenceMap: Reference[]; snapshot: FoxyGroundingSnapshot }): CitationResult[];
 document(tx: SqlTransaction, classroomId: string, sourceId: string, sourceKind: string, file: FoxyGroundingFile): Promise<{ original_name: string } | null>;
 textActivity(tx: SqlTransaction, activityId: string, classroomId: string): Promise<boolean>;
 readFile(request: unknown, conversationId: string, turnId: string, citationId: string, mode: 'preview' | 'download'): Promise<{ bytes: Uint8Array; headers: Record<string, string> }>;
}
