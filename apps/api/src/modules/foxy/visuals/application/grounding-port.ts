import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyContext, FoxySelection } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';
import type { FoxyGroundingSnapshot } from '../../../../../../../src/core/domain/foxy/grounding.ts';
export interface VisualGroundingPort {
 rebuildGrounding(tx: SqlTransaction, context: FoxyContext, selection: FoxySelection): Promise<FoxyGroundingSnapshot>;
 snapshotSelection(snapshot: FoxyGroundingSnapshot): FoxySelection;
 refreshFoxyAttachmentSnapshot(tx: SqlTransaction, owner: string, conversation: string, snapshot: FoxyGroundingSnapshot, current: FoxyGroundingSnapshot): Promise<void>;
}
