import { studyFail, studyId } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyQuery, FolderRow, StudySummaryRow } from '../../application/contracts.ts';
import type { FolderRepository } from '../../application/ports.ts';
export function createFolderRepository(): FolderRepository {
    async function load(tx: StudyQuery, owner: string, id: unknown, write: boolean) { const [r] = await tx.query<FolderRow>(`SELECT * FROM study_folders WHERE id=$1::uuid AND owner_id=$2::uuid AND status<>'DELETED' ${write ? 'FOR UPDATE' : ''}`, studyId(id), owner); if (!r)
        studyFail('FORBIDDEN'); return r; }
    async function save(tx: StudyQuery, r: FolderRow, json: string) { const [saved] = await tx.query<FolderRow>(`UPDATE study_folders SET state=$3::jsonb,status=$4,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid AND owner_id=$2::uuid RETURNING *`, r.id, r.owner_id, json, r.status); if (!saved)
        studyFail('CONFLICT'); return saved; }

 async function list(tx: StudyQuery, owner: string) { return tx.query<StudySummaryRow>(`SELECT id,owner_id,status,revision,created_at,updated_at,(state->'fields')-'units' AS fields FROM study_folders WHERE owner_id=$1::uuid AND status<>'DELETED' ORDER BY updated_at DESC,id`, owner); }
 async function count(tx: StudyQuery, owner: string) { const [{ count }] = await tx.query<{count: bigint}>(`SELECT count(*) AS count FROM study_folders WHERE owner_id=$1::uuid AND status<>'DELETED'`, owner); return count; }
 async function create(tx: StudyQuery, id: string, owner: string, status: string, json: string) { const [row] = await tx.query<FolderRow>(`INSERT INTO study_folders(id,owner_id,status,state) VALUES($1::uuid,$2::uuid,$3,$4::jsonb) RETURNING *`, id, owner, status, json); return row!; }
return { load, save, list, count, create };
}
