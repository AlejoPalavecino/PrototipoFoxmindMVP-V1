import type { Transaction, ClassroomRow } from '../../access/public.ts';

export interface CatalogRepository {
  listAccessible(tx: Transaction, input: { actorId: string }): Promise<(ClassroomRow & { plan_progress: { taught: number; total: number }; student_count: number })[]>;
  listUnits(tx: Transaction, input: { classroomId: string }): Promise<{ id: string; name: string; position: number; topics: { id: string; name: string; status: string }[] }[]>;
  listPlans(tx: Transaction, input: { classroomId: string }): Promise<{ id: string; fileId: string; version: number }[]>;
  countMembers(tx: Transaction, input: { classroomId: string }): Promise<{ count: number }[]>;
  readAccessCode(tx: Transaction, input: { classroomId: string }): Promise<{code_envelope:string|null;code_digest:string}[]>;
}
