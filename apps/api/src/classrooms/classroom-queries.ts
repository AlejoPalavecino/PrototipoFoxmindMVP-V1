import type { ClassroomCore } from './context.ts';
import type { ClassroomRow } from './contracts.ts';
import { decryptDelivery } from './delivery-envelope.ts';
import { digest } from './policy.ts';

export function mine(context: ClassroomCore, request: unknown) {
    return context.run(request, false, async (tx, actor) => {
      const rows = await tx.query<ClassroomRow & { plan_progress: { taught: number; total: number }; student_count: number }>(
        `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher_name,
        (SELECT jsonb_build_object('total',count(*)::int,'taught',count(*) FILTER (WHERE t.status='TAUGHT')::int)
          FROM topics t WHERE t.classroom_id=c.id) AS plan_progress,
        (SELECT count(*)::int FROM enrollments e WHERE e.classroom_id=c.id
          AND EXISTS (SELECT 1 FROM membership_periods mp WHERE mp.enrollment_id=e.id AND mp.ended_at IS NULL)) AS student_count
        FROM classrooms c
        JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=$1::uuid OR EXISTS(SELECT 1 FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL)
        ORDER BY c.created_at DESC,c.id`,
        actor.id,
      );
      return {
        teach: rows
          .filter((c) => c.teacher_id === actor.id)
          .map((c) => ({ ...context.summary(c, actor.id), planProgress: c.plan_progress,
            ...(c.teacher_id === actor.id ? { studentCount: c.student_count } : {}) })),
        study: rows
          .filter((c) => c.teacher_id !== actor.id)
          .map((c) => ({ ...context.summary(c, actor.id), planProgress: c.plan_progress,
            ...(c.teacher_id === actor.id ? { studentCount: c.student_count } : {}) })),
      };
    });
  }
export function detail(context: ClassroomCore, request: unknown, id: string) {
    return context.run(request, false, async (tx, actor) => {
      const row = await context.classroom(tx, actor, id);
      const units = await tx.query<{ id: string; name: string; position: number; topics: { id: string; name: string; status: string }[] }>(
        `SELECT u.id,u.name,u.position,COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'status',t.status)
        ORDER BY t.position,t.id) FILTER(WHERE t.id IS NOT NULL),'[]') AS topics FROM units u LEFT JOIN topics t ON t.unit_id=u.id
        WHERE u.classroom_id=$1::uuid GROUP BY u.id ORDER BY u.position,u.id`,
        id,
      );
      const plans = await tx.query(
        'SELECT id,file_id AS "fileId",version_number AS version FROM study_plan_versions WHERE classroom_id=$1::uuid ORDER BY version_number DESC',
        id,
      );
      const [membership] = await tx.query<{ count: number }>(
        `SELECT count(*)::int AS count FROM enrollments e WHERE e.classroom_id=$1::uuid
        AND EXISTS (SELECT 1 FROM membership_periods m WHERE m.enrollment_id=e.id AND m.ended_at IS NULL)`,
        id,
      );
      const topics = units.flatMap((unit: { topics: { status: string }[] }) => unit.topics);
      let accessCode:string|null=null;
      if(row.teacher_id===actor.id){
        const [active]=await tx.query<{code_envelope:string|null;code_digest:string}>(
          'SELECT code_envelope,code_digest FROM classroom_codes WHERE classroom_id=$1::uuid AND revoked_at IS NULL',id);
        if(active?.code_envelope)try{
          const decoded=decryptDelivery(context.ports.deliveryKey,active.code_envelope,`classroom-access:${id.toLowerCase()}`);
          if(typeof decoded?.code==='string'&&digest(decoded.code)===active.code_digest)accessCode=decoded.code;
        }catch{/* Historical codes or changed key require explicit regeneration. */}
      }
      return { ...context.summary(row, actor.id), units, plans, studentCount: membership.count,
        ...(row.teacher_id===actor.id?{accessCode}:{}),
        planProgress: { taught: topics.filter((topic: { status: string }) => topic.status === 'TAUGHT').length, total: topics.length } };
    });
  }
