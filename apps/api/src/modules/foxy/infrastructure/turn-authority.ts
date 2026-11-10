import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
function fail(): never { throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' }); }
export async function activeRoom(tx: SqlTransaction, owner: string, id: string): Promise<void> {
  const [room] = await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE', id, owner);
  if (!room) return fail();
}

export async function ownedRoom(tx: SqlTransaction, owner: string, id: string): Promise<void> {
 const [owned] = await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid FOR SHARE', id, owner);
 if (!owned) return fail();
}

export async function activeClassroom(tx: SqlTransaction, classroomId: string, owner: string): Promise<boolean> { return (await tx.query('SELECT id FROM classrooms WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR SHARE',classroomId,owner)).length > 0; }
