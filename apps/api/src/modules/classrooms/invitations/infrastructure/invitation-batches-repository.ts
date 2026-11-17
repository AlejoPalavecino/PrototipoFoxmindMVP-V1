

import type { InvitationBatchRepository } from '../application/invitation-batches-repository.ts';
export function createInvitationBatchRepository(): InvitationBatchRepository { return {
  async distinctMailboxes(tx, input) { return tx.query<{ email: string }>(`SELECT DISTINCT ON (lower(email)) email
    FROM jsonb_array_elements_text($1::jsonb) WITH ORDINALITY AS source(email, position)
    ORDER BY lower(email), position`, input.emails); },
  async createReceipt(tx, input) { return tx.query<{ request_id: string }>(`INSERT INTO classroom_invitation_batches(classroom_id,request_id,receipt_envelope)
        VALUES ($1::uuid,$2::uuid,$3) RETURNING request_id`, input.classroomId, input.requestId, input.envelope); },
  async updateReceipt(tx, input) { return tx.query<{ request_id: string }>(`UPDATE classroom_invitation_batches SET receipt_envelope=$3
        WHERE classroom_id=$1::uuid AND request_id=$2::uuid RETURNING request_id`, input.classroomId, input.requestId, input.envelope); },
  async normalizeMailbox(tx, input) { return tx.query<{ normalized: string }>('SELECT lower($1::text) AS normalized', input.email); },
  async readReceipt(tx, input) { return tx.query<{ receipt_envelope: string }>(`SELECT receipt_envelope FROM classroom_invitation_batches
      WHERE classroom_id=$1::uuid AND request_id=$2::uuid`, input.classroomId, input.requestId); },
}; }
