import { randomUUID } from 'node:crypto';
import type { ClassroomCore } from './core.ts';
import { advanceClassroomRevision } from './context.ts';
import { revision } from './drafts.ts';
import { fail, object, text, uuid } from './policy.ts';
import { requireReady } from '../files/service.ts';
import type { Transaction } from './contracts.ts';

/** P6 shares the user/classroom locks and optimistic revision of the existing host. */
export class PlanService {
  private readonly run: ClassroomCore['run'];
  private readonly classroom: ClassroomCore['classroom'];
  private readonly ports: ClassroomCore['ports'];
  constructor(context: Pick<ClassroomCore, 'run' | 'classroom' | 'ports'>) {
    this.run = context.run.bind(context);
    this.classroom = context.classroom.bind(context);
    this.ports = context.ports;
  }
  async changePlan(request: unknown, classroomId: string, input: unknown) {
    const body = object(input, ['revision', 'operation']);
    const expected = revision(body.revision);
    const op = object(body.operation, ['action', 'id', 'unitId', 'name', 'ids', 'status', 'fileId', 'confirm']);
    return this.run(request, true, async (tx, actor) => {
      const classroom = await this.classroom(tx, actor, classroomId, true, true);
      if (classroom.revision.toString() !== expected) return fail('CONFLICT');
      const exact = (keys: string[]) => {
        object(op, ['action', ...keys]);
        if (keys.some(key => !Object.hasOwn(op, key))) fail('INVALID_INPUT');
      };
      const row = async (table: 'units' | 'topics', id: unknown) => {
        if (!uuid(id)) return fail('INVALID_INPUT');
        const [value] = await tx.query<{ id: string; status?: string }>(
          `SELECT * FROM ${table} WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, id, classroomId);
        if (!value) return fail('FORBIDDEN');
        return value;
      };
      switch (op.action) {
        case 'addUnit':
          exact(['name']);
          await tx.query(`INSERT INTO units(id,updated_at,classroom_id,name,position)
            SELECT $1::uuid,clock_timestamp(),$2::uuid,$3,COALESCE(max(position)+1,0)
            FROM units WHERE classroom_id=$2::uuid RETURNING id`, randomUUID(), classroomId, text(op.name, 120));
          break;
        case 'addTopic':
          exact(['unitId', 'name']);
          await row('units', op.unitId);
          await tx.query(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position)
            SELECT $1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4,COALESCE(max(position)+1,0)
            FROM topics WHERE unit_id=$3::uuid RETURNING id`, randomUUID(), classroomId, op.unitId, text(op.name, 120));
          break;
        case 'renameUnit':
        case 'renameTopic': {
          exact(['id', 'name']);
          const table = op.action === 'renameUnit' ? 'units' : 'topics';
          await row(table, op.id);
          await tx.query(`UPDATE ${table} SET name=$2,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, op.id, text(op.name, 120));
          break;
        }
        case 'reorderUnits':
        case 'reorderTopics': {
          const topics = op.action === 'reorderTopics';
          exact(topics ? ['unitId', 'ids'] : ['ids']);
          if (topics) await row('units', op.unitId);
          const table = topics ? 'topics' : 'units';
          const current = await tx.query<{ id: string }>(`SELECT id FROM ${table} WHERE classroom_id=$1::uuid${topics ? ' AND unit_id=$2::uuid' : ''}`,
            classroomId, ...(topics ? [op.unitId] : []));
          const ids: unknown = op.ids;
          if (!Array.isArray(ids) || !ids.every(uuid) || ids.length !== current.length ||
            new Set(ids).size !== ids.length || current.some(item => !ids.includes(item.id))) return fail('INVALID_INPUT');
          for (const [position, id] of ids.entries()) await tx.query(
            `UPDATE ${table} SET position=$2,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, id, position);
          break;
        }
        case 'setTopicState':
          exact(['id', 'status']);
          await row('topics', op.id);
          if (!['PENDING', 'NEXT', 'TAUGHT'].includes(op.status)) return fail('INVALID_INPUT');
          if (op.status === 'NEXT') await tx.query(`UPDATE topics SET status='PENDING',updated_at=clock_timestamp()
            WHERE classroom_id=$1::uuid AND status='NEXT' AND id<>$2::uuid RETURNING id`, classroomId, op.id);
          await tx.query(`UPDATE topics SET status=$2::"TopicStatus",updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, op.id, op.status);
          break;
        case 'deleteUnit':
        case 'deleteTopic': {
          exact(['id', 'confirm']);
          if (op.confirm !== true) return fail('INVALID_INPUT');
          const unit = op.action === 'deleteUnit';
          const target = await row(unit ? 'units' : 'topics', op.id);
          if (!unit && target.status !== 'PENDING') return fail('CONFLICT');
          const column = unit ? 'unit_id' : 'topic_id';
          const [linked] = await tx.query(`SELECT 1 FROM materials WHERE ${column}=$1::uuid
            UNION ALL SELECT 1 FROM activities WHERE ${column}=$1::uuid
            UNION ALL SELECT 1 FROM activity_topics WHERE ${column}=$1::uuid${unit ? ' UNION ALL SELECT 1 FROM topics WHERE unit_id=$1::uuid' : ''} LIMIT 1`, op.id);
          if (linked) return fail('CONFLICT');
          await tx.query(`DELETE FROM ${unit ? 'units' : 'topics'} WHERE id=$1::uuid RETURNING id`, op.id);
          break;
        }
        case 'appendVersion': {
          exact(['fileId']);
          await this.readyClassroomFile(tx, request, classroomId, op.fileId, 'plan');
          const [linked] = await tx.query('SELECT 1 FROM study_plan_versions WHERE file_id=$1::uuid', op.fileId);
          if (linked) return fail('CONFLICT');
          await tx.query(`INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id)
            SELECT $1::uuid,clock_timestamp(),$2::uuid,COALESCE(max(version_number),0)+1,$3::uuid,$4::uuid
            FROM study_plan_versions WHERE classroom_id=$2::uuid RETURNING id`, randomUUID(), classroomId, op.fileId, actor.id);
          break;
        }
        default: return fail('INVALID_INPUT');
      }
      return this.advanceRevision(tx, classroomId, classroom.revision);
    });
  }

  async readyClassroomFile(tx: Transaction, request: unknown, classroomId: string, fileId: unknown, purpose: 'plan' | 'material') {
    if (!uuid(fileId)) return fail('INVALID_INPUT');
    const row = await this.ports.files.load(tx, fileId);
    // Reject a foreign scope before attempting to lock/revalidate another classroom.
    if (row.classroom_id !== classroomId || row.classroom_draft_id !== null || row.purpose !== purpose || row.target_id !== null) return fail('FORBIDDEN');
    const current = await this.ports.files.loadAuthorized(tx, request, fileId, 'read');
    requireReady(current);
    return current;
  }

  async advanceRevision(tx: Transaction, classroomId: string, current: bigint) {
    return advanceClassroomRevision(tx, classroomId, current);
  }
}
