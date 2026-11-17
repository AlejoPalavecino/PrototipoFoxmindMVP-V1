import type { ClassroomRow } from '../../access/public.ts';

import type { CatalogRepository } from '../application/classroom-queries-repository.ts';
export function createCatalogRepository(): CatalogRepository { return {
  async listAccessible(tx, input) { return tx.query<ClassroomRow & { plan_progress: { taught: number; total: number }; student_count: number }>(`SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher_name,
        (SELECT jsonb_build_object('total',count(*)::int,'taught',count(*) FILTER (WHERE t.status='TAUGHT')::int)
          FROM topics t WHERE t.classroom_id=c.id) AS plan_progress,
        (SELECT count(*)::int FROM enrollments e WHERE e.classroom_id=c.id
          AND EXISTS (SELECT 1 FROM membership_periods mp WHERE mp.enrollment_id=e.id AND mp.ended_at IS NULL)) AS student_count
        FROM classrooms c
        JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=$1::uuid OR EXISTS(SELECT 1 FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL)
        ORDER BY c.created_at DESC,c.id`, input.actorId); },
  async listUnits(tx, input) { return tx.query<{ id: string; name: string; position: number; topics: { id: string; name: string; status: string }[] }>(`SELECT u.id,u.name,u.position,COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'status',t.status)
        ORDER BY t.position,t.id) FILTER(WHERE t.id IS NOT NULL),'[]') AS topics FROM units u LEFT JOIN topics t ON t.unit_id=u.id
        WHERE u.classroom_id=$1::uuid GROUP BY u.id ORDER BY u.position,u.id`, input.classroomId); },
  async listPlans(tx, input) { return tx.query<{ id: string; fileId: string; version: number }>('SELECT id,file_id AS "fileId",version_number AS version FROM study_plan_versions WHERE classroom_id=$1::uuid ORDER BY version_number DESC', input.classroomId); },
  async countMembers(tx, input) { return tx.query<{ count: number }>(`SELECT count(*)::int AS count FROM enrollments e WHERE e.classroom_id=$1::uuid
        AND EXISTS (SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)`, input.classroomId); },
  async readAccessCode(tx, input) { return tx.query<{code_envelope:string|null;code_digest:string}>('SELECT code_envelope,code_digest FROM classroom_codes WHERE classroom_id=$1::uuid AND revoked_at IS NULL', input.classroomId); },
}; }
