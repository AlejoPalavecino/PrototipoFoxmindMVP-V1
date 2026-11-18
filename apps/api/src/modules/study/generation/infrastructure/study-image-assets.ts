import { studyFail } from '../../../../../../../src/core/domain/study/folders.ts';
import type { StudyImages, StudyImageRaster } from '../../application/contracts.ts';

export function createStudyImageAssets(quota: bigint): Pick<StudyImages, 'store' | 'read'> {
    return {
        async store(tx, ownerId, folderId, id, raster) {
            await tx.query("SELECT 1 FROM pg_advisory_xact_lock(hashtextextended('study-image-assets:' || $1::text, 0))", ownerId);
            const [usage] = await tx.query<{ used: bigint }>(
                'SELECT COALESCE(sum(octet_length(bytes)), 0)::bigint AS used FROM study_image_assets WHERE owner_id=$1::uuid', ownerId);
            if (usage!.used + BigInt(raster.bytes.byteLength) > quota) studyFail('QUOTA_EXCEEDED');
            const [saved] = await tx.query(`INSERT INTO study_image_assets (id,folder_id,owner_id,mime_type,bytes)
                SELECT $1::uuid,id,owner_id,$4,$5::bytea FROM study_folders
                WHERE id=$2::uuid AND owner_id=$3::uuid AND status='ACTIVE' RETURNING id`,
                id, folderId, ownerId, raster.mimeType, Buffer.from(raster.bytes));
            if (!saved) studyFail('CONFLICT');
        },
        async read(tx, ownerId, folderId, id) {
            const [raster] = await tx.query<StudyImageRaster>(
                'SELECT mime_type AS "mimeType", bytes FROM study_image_assets WHERE id=$1::uuid AND folder_id=$2::uuid AND owner_id=$3::uuid',
                id, folderId, ownerId);
            return raster;
        },
    };
}
