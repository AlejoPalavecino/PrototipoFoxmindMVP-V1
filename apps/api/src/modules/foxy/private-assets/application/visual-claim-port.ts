import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyPrivateAssetLease } from '../../application/authority-ports.ts';
export type VisualClaimPort = (tx: SqlTransaction, lease: FoxyPrivateAssetLease & { jobId: string }, maxJobAgeMs: number) => Promise<{ fresh: boolean }>;
