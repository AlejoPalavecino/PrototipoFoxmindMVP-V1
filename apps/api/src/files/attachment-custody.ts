import type { FileTransaction } from './contracts.ts';

export const attachmentCustody = {
  async uploadIsUsable(tx: FileTransaction, fileId: string): Promise<boolean> {
    const [upload] = await tx.query<{ status: string; phase: string }>(`SELECT u.status::text,c.phase FROM uploads u
      JOIN file_custodies c ON c.file_id=u.file_id WHERE u.file_id=$1::uuid FOR UPDATE OF u,c`, fileId);
    return !!upload && !['CANCELLED', 'FAILED'].includes(upload.status)
      && !['deleting', 'deleted', 'rejected'].includes(upload.phase);
  },

  async pendingReservationCount(tx: FileTransaction, attemptId: string, excludedFileIds: readonly string[]): Promise<number> {
    const [row] = await tx.query<{ count: bigint }>(`SELECT count(*) AS count FROM file_custodies c JOIN uploads u ON u.file_id=c.file_id
      WHERE c.target_id=$1::uuid AND c.purpose='attachment' AND c.file_id<>ALL($2::uuid[])
      AND u.status NOT IN ('COMPLETED','CANCELLED','FAILED') AND u.reservation_released_at IS NULL`, attemptId, excludedFileIds);
    return Number(row.count);
  },
};
