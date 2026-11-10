import {assertAttemptWrite} from './attempt-access.ts';
import type {AttemptAttachmentsRepository} from '../application/attempt-attachments.ts';
export const repository:AttemptAttachmentsRepository={assertAttemptWrite,
selected(tx,...values){return tx.query<Awaited<ReturnType<AttemptAttachmentsRepository['selected']>>[number]>(`SELECT file_id FROM attempt_attachments
      WHERE attempt_id=$1::uuid AND file_id IS DISTINCT FROM $2::uuid`,...values)},
associate(tx,...values){return tx.query<Awaited<ReturnType<AttemptAttachmentsRepository['associate']>>[number]>(`INSERT INTO attempt_attachments(attempt_id,activity_id,classroom_id,file_id,position)
        SELECT $1::uuid,$2::uuid,$3::uuid,$4::uuid,COALESCE(MAX(position)+1,0) FROM attempt_attachments WHERE attempt_id=$1::uuid
        ON CONFLICT(attempt_id,file_id) DO NOTHING RETURNING file_id`,...values)},
advanceRevision(tx,...values){return tx.query<Awaited<ReturnType<AttemptAttachmentsRepository['advanceRevision']>>[number]>(`UPDATE attempts SET revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING id`,...values)},
};