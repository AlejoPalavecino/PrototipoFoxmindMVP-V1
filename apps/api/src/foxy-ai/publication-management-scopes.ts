import type { SqlTransaction } from '../../../../src/core/domain/index.ts';
type Scope = { resource_id: string; conversation_id: string; source_room: string | null; classroom_id: string };
function fail(): never { throw Object.assign(new Error('NOT_FOUND'), { code: 'NOT_FOUND' }); }
export async function lockFoxyManagementScopes(tx: SqlTransaction, actor: string, id: string): Promise<Scope> {
  if (!(await tx.query("SELECT id FROM users WHERE id=$1::uuid AND account_role='teacher' AND email_verified_at IS NOT NULL FOR UPDATE", actor)).length) return fail();
  const [scope] = await tx.query<Scope>(`SELECT r.id resource_id,c.id conversation_id,c.classroom_id source_room,p.classroom_id
    FROM foxy_publications p JOIN foxy_resources r ON r.id=p.resource_id AND r.owner_id=p.owner_id
    JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
    WHERE p.id=$1::uuid AND p.owner_id=$2::uuid AND c.deleted_at IS NULL`, id, actor);
  if (!scope) return fail();
  const rooms = await tx.query<{ id: string; teacher_id: string }>(`SELECT id,teacher_id FROM classrooms WHERE id IN ($1::uuid,$2::uuid) ORDER BY id FOR UPDATE`, scope.classroom_id, scope.source_room);
  if (!rooms.some(r => r.id === scope.classroom_id && r.teacher_id === actor) || (scope.source_room && !rooms.some(r => r.id === scope.source_room && r.teacher_id === actor))) return fail();
  const [live] = await tx.query(`SELECT r.id FROM foxy_resources r JOIN foxy_conversations c ON c.id=r.conversation_id AND c.owner_id=r.owner_id
    WHERE r.id=$1::uuid AND r.owner_id=$2::uuid AND c.id=$3::uuid AND c.deleted_at IS NULL AND c.classroom_id IS NOT DISTINCT FROM $4::uuid FOR SHARE OF r,c`, scope.resource_id, actor, scope.conversation_id, scope.source_room);
  if (!live) return fail();
  await tx.query('SELECT pg_advisory_xact_lock(78123003)'); return scope;
}
