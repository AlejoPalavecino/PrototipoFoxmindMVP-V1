import type { Transaction } from '../application/contracts.ts';
import type { DraftsRepository } from '../application/drafts-repository.ts';
export function createDraftsRepository(): DraftsRepository { return {
async readClassroomDrafts01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL FOR UPDATE', ...values); },
async insertClassroomDrafts02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO classroom_drafts(id,owner_id,updated_at)
        VALUES($1::uuid,$2::uuid,clock_timestamp()) RETURNING *`, ...values); },
async readClassroomDrafts03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT * FROM classroom_drafts
      WHERE owner_id=$1::uuid AND published_classroom_id IS NULL AND deleted_at IS NULL ORDER BY updated_at DESC,id`, ...values); },
async updateClassroomDrafts04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE classroom_drafts SET payload=$2::jsonb,revision=revision+1,updated_at=clock_timestamp()
        WHERE id=$1::uuid RETURNING *`, ...values); },
async updateClassroomDrafts05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE classroom_drafts SET deleted_at=clock_timestamp(),
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, ...values); }
}; }
