import type { Transaction } from '../../classrooms/public.ts';
import type { LibraryActivityLink, LibraryRepository } from '../application/library-repository.ts';
export function createLibraryRepository(): LibraryRepository { return {
activitiesForLinks(tx, classroomId, materialId, activityIds) {
  return tx.query<LibraryActivityLink>(`SELECT a.id,a.status,a.first_started_at,(link.material_id IS NOT NULL) AS linked
    FROM activities a LEFT JOIN activity_materials link ON link.activity_id=a.id AND link.classroom_id=a.classroom_id
      AND link.material_id=$2::uuid
    WHERE a.classroom_id=$1::uuid AND (a.id=ANY($3::uuid[]) OR link.material_id IS NOT NULL)
    ORDER BY a.id FOR UPDATE OF a`, classroomId, materialId, activityIds);
},
addActivityLinks(tx, classroomId, materialId, activityIds) {
  return tx.query(`INSERT INTO activity_materials(classroom_id,material_id,activity_id)
    SELECT $1::uuid,$2::uuid,id FROM unnest($3::uuid[]) AS ids(id) RETURNING activity_id`, classroomId, materialId, activityIds);
},
removeActivityLinks(tx, classroomId, materialId, activityIds) {
  return tx.query(`DELETE FROM activity_materials WHERE classroom_id=$1::uuid AND material_id=$2::uuid
    AND activity_id=ANY($3::uuid[]) RETURNING activity_id`, classroomId, materialId, activityIds);
},
updateDescription(tx, id, description) {
  return tx.query(`UPDATE materials SET description=$2,
    body=CASE WHEN content_kind='FILE' THEN NULL ELSE body END WHERE id=$1::uuid RETURNING id`, id, description);
},
async readActivityMaterials01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT m.id,m.title,m.body,
        CASE WHEN m.content_kind='FILE' THEN COALESCE(m.description,m.body) ELSE m.description END AS description,m.resource_use AS "resourceUse",m.content_kind AS "contentKind",m.file_id AS "fileId",m.unit_id AS "unitId",m.topic_id AS "topicId",
        f.original_name AS "fileName",f.extension,f.size_bytes::text AS "sizeBytes",
        (m.deleted_at IS NOT NULL) AS deleted,(m.deleted_at IS NOT NULL AND f.blob_deleted_at IS NULL) AS "deletionPending",
        (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN'
          AND u.status='COMPLETED' AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest) AS ready,
        (m.deleted_at IS NULL AND f.extension IN ('pdf','jpg','jpeg','png')) AS previewable,
        linked_activities.ids AS "activityIds",cardinality(linked_activities.ids)>0 AS linked,
        (SELECT r.current_id FROM material_revisions r WHERE r.previous_id=m.id) AS "supersededBy"
        FROM materials m JOIN files f ON f.id=m.file_id JOIN file_custodies c ON c.file_id=f.id JOIN uploads u ON u.file_id=f.id
        CROSS JOIN LATERAL (SELECT ARRAY(
          SELECT link.activity_id FROM activity_materials link JOIN activities a ON a.id=link.activity_id AND a.classroom_id=link.classroom_id
          WHERE link.material_id=m.id AND link.classroom_id=m.classroom_id AND ($2::boolean OR a.status='PUBLISHED')
          ORDER BY a.title,a.id) AS ids) linked_activities
        WHERE m.classroom_id=$1::uuid AND ($2::boolean OR (m.deleted_at IS NULL AND f.blob_deleted_at IS NULL
          AND c.phase='ready' AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND u.status='COMPLETED'
          AND c.digest IS NOT NULL AND c.digest=c.validated_digest AND c.digest=c.scanned_digest))
        ORDER BY m.created_at DESC,m.id`, ...values); },
async readMaterialRevisions02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT r.current_id,r.classroom_revision FROM material_revisions r
          WHERE r.previous_id=$1::uuid AND r.command_hash=$2`, ...values); },
async readMaterialRevisions03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid', ...values); },
async updateMaterials04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid', ...values); },
async insertMaterialRevisions05<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('INSERT INTO material_revisions(previous_id,current_id,classroom_id,classroom_revision,command_hash) VALUES($1::uuid,$2::uuid,$3::uuid,$4::bigint,$5)', ...values); },
async updateMaterials06<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('UPDATE materials SET body=$2,resource_use=$3,content_kind=$4 WHERE id=$1::uuid RETURNING id', ...values); },
async readMaterialRevisions07<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid', ...values); },
async updateMaterials08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE materials SET body=$2,resource_use=$3,content_kind=$4,
    description=CASE WHEN $5::boolean THEN NULL ELSE description END WHERE id=$1::uuid RETURNING id`, ...values); },
async updateMaterials09<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE materials SET title=$2,unit_id=$3::uuid,topic_id=$4::uuid,updated_at=clock_timestamp()
            WHERE id=$1::uuid RETURNING id`, ...values); },
async readMaterialRevisions10<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT 1 FROM material_revisions WHERE previous_id=$1::uuid', ...values); },
async readActivityMaterials11<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT 1 FROM activity_materials WHERE material_id=$1::uuid
          UNION ALL SELECT 1 FROM materials WHERE file_id=$2::uuid AND id<>$1::uuid
          UNION ALL SELECT 1 FROM study_plan_versions WHERE file_id=$2::uuid
          UNION ALL SELECT 1 FROM activity_instruction_files WHERE file_id=$2::uuid
          UNION ALL SELECT 1 FROM attempt_attachments WHERE file_id=$2::uuid LIMIT 1`, ...values); },
async updateMaterials12<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE materials SET deleted_at=clock_timestamp(),unit_id=NULL,topic_id=NULL,updated_at=clock_timestamp()
          WHERE id=$1::uuid RETURNING id`, ...values); },
async readMaterials13<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT id,title,file_id,deleted_at,content_kind,body,description,resource_use FROM materials WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE', ...values); },
async readUnits14<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE', ...values); },
async readTopics15<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE', ...values); }
}; }
