import type { HomeSql } from './database-types.ts';
import type { HomeResponse } from '../../../../../../src/core/domain/index.ts';
export const authorizedRooms = `SELECT c.*, CASE WHEN c.teacher_id=$1::uuid THEN 'teacher' ELSE 'student' END AS role
  FROM classrooms c WHERE c.teacher_id=$1::uuid OR EXISTS (SELECT 1 FROM enrollments e
  JOIN membership_periods mp ON mp.enrollment_id=e.id AND mp.ended_at IS NULL
  WHERE e.classroom_id=c.id AND e.student_id=$1::uuid)`;
export async function readParticipation(tx: HomeSql, userId: string): Promise<Pick<HomeResponse, 'participation' | 'memberships' | 'setup'>> {
  const [row] = await tx.query<{ study: number; teach: number; archived: number; drafts: number; invitations: number }>(`
    WITH rooms AS (${authorizedRooms}) SELECT
    (SELECT count(*)::int FROM rooms WHERE role='student' AND archived_at IS NULL) AS study,
    (SELECT count(*)::int FROM rooms WHERE role='teacher' AND archived_at IS NULL) AS teach,
    (SELECT count(*)::int FROM rooms WHERE archived_at IS NOT NULL) AS archived,
    (SELECT count(*)::int FROM classroom_drafts WHERE owner_id=$1::uuid AND published_classroom_id IS NULL AND deleted_at IS NULL) AS drafts,
    (SELECT count(*)::int FROM invitations i JOIN users u ON u.email_normalized=i.recipient_email_normalized
     JOIN classrooms c ON c.id=i.classroom_id WHERE u.id=$1::uuid AND i.accepted_at IS NULL
     AND i.revoked_at IS NULL AND i.declined_at IS NULL AND i.expires_at>clock_timestamp() AND c.archived_at IS NULL) AS invitations`, userId);
  return { participation: row.study ? row.teach ? 'mixed' : 'study' : row.teach ? 'teach' : 'none',
    memberships: { study: row.study, teach: row.teach, archived: row.archived },
    setup: { drafts: row.drafts, invitations: row.invitations } };
}
export async function membershipFingerprint(tx: HomeSql, userId: string): Promise<string> {
  const [row] = await tx.query<{ fingerprint: string }>(`WITH rooms AS (${authorizedRooms})
    SELECT md5(COALESCE(string_agg(id::text || ':' || role || ':' || COALESCE(archived_at::text,''),',' ORDER BY id),'')) AS fingerprint FROM rooms`, userId);
  return row.fingerprint;
}
