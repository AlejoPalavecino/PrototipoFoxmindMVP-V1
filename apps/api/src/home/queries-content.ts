import { baseJson, targetJson, instant } from './query-values.ts';
export const queriesQuery = `SELECT p.id,
  ${baseJson('p.id', "left(regexp_replace(p.body,'[[:cntrl:]]',' ','g'),160)", targetJson('wall', ",'postId',p.id"))}
  || jsonb_build_object('updatedAt',${instant('GREATEST(p.created_at,p.edited_at,reply.changed_at)')}) AS item,
  ${instant('GREATEST(p.created_at,p.edited_at,reply.changed_at)')} || '|' || p.id::text AS sort_key
  FROM rooms c JOIN wall_posts p ON p.classroom_id=c.id AND p.type='QUERY' AND p.removed_at IS NULL
  LEFT JOIN LATERAL (SELECT max(GREATEST(created_at,edited_at)) AS changed_at FROM wall_replies
    WHERE post_id=p.id AND removed_at IS NULL) reply ON true
  WHERE c.role='teacher' AND c.archived_at IS NULL`;
export const materialsQuery = `SELECT m.id, ${baseJson('m.id', 'm.title', targetJson('material', ",'materialId',m.id"))}
  || jsonb_build_object('publishedAt',${instant('m.created_at')},'extension',f.extension) AS item,
  ${instant('m.created_at')} || '|' || m.id::text AS sort_key
  FROM rooms c JOIN materials m ON m.classroom_id=c.id AND m.deleted_at IS NULL
  JOIN files f ON f.id=m.file_id AND f.classroom_id=c.id
  JOIN file_custodies custody ON custody.file_id=f.id JOIN uploads u ON u.file_id=f.id
  WHERE c.archived_at IS NULL AND f.blob_deleted_at IS NULL AND custody.phase='ready'
    AND f.validation_status='APPROVED' AND f.scan_status='CLEAN' AND u.status='COMPLETED'
    AND custody.digest IS NOT NULL AND custody.digest=custody.validated_digest AND custody.digest=custody.scanned_digest`;
export const classroomsQuery = `SELECT c.id, ${baseJson('c.id', 'c.name', targetJson('classroom', ",'section','plan'"))} AS item,
  CASE WHEN c.archived_at IS NULL THEN '0|' ELSE '1|' END || c.name || '|' || c.id::text AS sort_key FROM rooms c`;
