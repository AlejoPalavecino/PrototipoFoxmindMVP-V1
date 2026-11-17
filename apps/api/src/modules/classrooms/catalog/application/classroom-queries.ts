import type { CatalogRepository } from './classroom-queries-repository.ts';
import type { ClassroomRuntimeAccess } from '../../access/public.ts';
type QueryAccess = Pick<ClassroomRuntimeAccess,'run'|'classroom'|'ports'> & { summary(row: ClassroomRow & {revision?: bigint}, actorId?: string): {id: string;name: string;subject: string;division: string;academicYear: number;timezone: string;coverKey: string;archived: boolean;teacher: string|undefined;role: string;revision: string|undefined;aiGradingEnabled?: boolean;aiGradingAvailable?: boolean} };
import type { ClassroomRow } from '../../access/public.ts';


export function createCatalogOperations(repository: CatalogRepository, dependencies: { readCode(key: Buffer, envelope: string, aad: string): { code?: unknown }; digest(text: string): string }) {
const { readCode: decryptDelivery, digest } = dependencies;
function mine(context: QueryAccess, request: unknown) {
    return context.run(request, false, async (tx, actor) => {
      const rows = await repository.listAccessible(tx, { actorId: actor.id });
      return {
        teach: rows
          .filter((c) => c.teacher_id === actor.id)
          .map((c) => ({ ...context.summary(c, actor.id), planProgress: c.plan_progress,
            studentCount: c.student_count })),
        study: rows
          .filter((c) => c.teacher_id !== actor.id)
          .map((c) => ({ ...context.summary(c, actor.id), planProgress: c.plan_progress,
            studentCount: c.student_count })),
      };
    });
  }
function detail(context: QueryAccess, request: unknown, id: string) {
    return context.run(request, false, async (tx, actor) => {
      const row = await context.classroom(tx, actor, id);
      const units = await repository.listUnits(tx, { classroomId: id });
      const plans = await repository.listPlans(tx, { classroomId: id });
      const [membership] = await repository.countMembers(tx, { classroomId: id });
      const topics = units.flatMap((unit: { topics: { status: string }[] }) => unit.topics);
      let accessCode:string|null=null;
      if(row.teacher_id===actor.id){
        const [active]=await repository.readAccessCode(tx, { classroomId: id });
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

return { mine, detail };
}
