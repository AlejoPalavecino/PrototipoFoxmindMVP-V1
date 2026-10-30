import type { ClassroomCore } from './context.ts';
import type { ClassroomRow } from './contracts.ts';

export function mine(context: ClassroomCore, request: unknown) {
    return context.run(request, false, async (tx, actor) => {
      const rows = await tx.query<ClassroomRow>(
        `SELECT c.*,concat(u.first_name,' ',u.last_name) AS teacher_name FROM classrooms c
        JOIN users u ON u.id=c.teacher_id WHERE c.teacher_id=$1::uuid OR EXISTS(SELECT 1 FROM enrollments e
        JOIN membership_periods m ON m.enrollment_id=e.id WHERE e.classroom_id=c.id AND e.student_id=$1::uuid AND m.ended_at IS NULL)
        ORDER BY c.created_at DESC,c.id`,
        actor.id,
      );
      return {
        teach: rows
          .filter((c) => c.teacher_id === actor.id)
          .map((c) => context.summary(c, actor.id)),
        study: rows
          .filter((c) => c.teacher_id !== actor.id)
          .map((c) => context.summary(c, actor.id)),
      };
    });
  }
export function detail(context: ClassroomCore, request: unknown, id: string) {
    return context.run(request, false, async (tx, actor) => {
      const row = await context.classroom(tx, actor, id);
      const units = await tx.query(
        `SELECT u.id,u.name,u.position,COALESCE(jsonb_agg(jsonb_build_object('id',t.id,'name',t.name,'status',t.status)
        ORDER BY t.position,t.id) FILTER(WHERE t.id IS NOT NULL),'[]') AS topics FROM units u LEFT JOIN topics t ON t.unit_id=u.id
        WHERE u.classroom_id=$1::uuid GROUP BY u.id ORDER BY u.position,u.id`,
        id,
      );
      const plans = await tx.query(
        'SELECT id,file_id AS "fileId",version_number AS version FROM study_plan_versions WHERE classroom_id=$1::uuid ORDER BY version_number DESC',
        id,
      );
      return { ...context.summary(row, actor.id), units, plans };
    });
  }
