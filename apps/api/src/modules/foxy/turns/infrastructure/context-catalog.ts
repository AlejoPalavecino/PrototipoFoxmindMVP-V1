import { loadSources } from './context-sources.ts';
import { parseFoxySourceQuery } from '../../../../../../../src/core/domain/foxy/source-query.ts';
import type { SqlTransaction } from '../../../../../../../src/core/contracts/sql.ts';
import type { FoxyContext } from '../../../../../../../src/core/domain/foxy/foxy-ai.ts';

type Unit = { id: string; name: string; position: number };
type Topic = { id: string; unit_id: string; name: string; position: number; status: 'PENDING' | 'NEXT' | 'TAUGHT' };
type CurriculumUnit = Unit & { topics: Omit<Topic, 'unit_id'>[] };
type Conversations = { get(tx: SqlTransaction, owner: string, id: string): Promise<{ context: FoxyContext } | null> };
type Catalogue = { context: FoxyContext; units: CurriculumUnit[]; classroomRevision: string | null;
  classroomTitle: string | null; archived: boolean; canGenerate: boolean };
type Outcome = { kind: 'ok'; value: Catalogue } | { kind: 'forbidden' | 'limit' };

type ReadActor = { id: string; account_role: 'teacher' | 'student' };
export interface FoxyClassroomReadContext {
  run<T>(request: unknown, write: false, operation: (tx: SqlTransaction, actor: ReadActor) => Promise<T>): Promise<T>;
  classroom(tx: SqlTransaction, actor: ReadActor, id: string, write: false, teacher: true):
    Promise<{ id: string; name: string; revision: bigint; archived_at: Date | null }>;
}

async function loadUnits(tx: SqlTransaction, classroomId: string): Promise<CurriculumUnit[] | null> {
  const units = await tx.query<Unit>('SELECT id,name,position FROM units WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 101', classroomId);
  if (units.length > 100) return null;
  const topics = await tx.query<Topic>('SELECT id,unit_id,name,position,status FROM topics WHERE classroom_id=$1::uuid ORDER BY position,id LIMIT 501', classroomId);
  if (topics.length > 500) return null;
  return units.map(unit => ({ id: unit.id, name: unit.name, position: unit.position,
    topics: topics.filter(topic => topic.unit_id === unit.id).map(topic => ({
      id: topic.id, name: topic.name, position: topic.position, status: topic.status,
    })) }));
}
export class FoxyContextCatalogService {
  private readonly run: FoxyClassroomReadContext['run'];
  private readonly classroom: FoxyClassroomReadContext['classroom'];
  private readonly conversations: Conversations;
  constructor(context: FoxyClassroomReadContext, conversations: Conversations) {
    this.run = context.run.bind(context); this.classroom = context.classroom.bind(context); this.conversations = conversations;
  }
  async curriculum(request: unknown, conversationId: string): Promise<Catalogue> {
    const outcome = await this.run<Outcome>(request, false, async (tx, actor) => {
      if (actor.account_role !== 'teacher') return { kind: 'forbidden' };
      const conversation = await this.conversations.get(tx, actor.id, conversationId);
      if (!conversation) return { kind: 'forbidden' };
      if (conversation.context.kind === 'GENERAL') return { kind: 'ok', value: { context: conversation.context,
        units: [], classroomRevision: null, classroomTitle: null, archived: false, canGenerate: true } };
      const room = await this.classroom(tx, actor, conversation.context.classroomId, false, true);
      const units = await loadUnits(tx, room.id);
      if (!units) return { kind: 'limit' };
      const archived = Boolean(room.archived_at);
      return { kind: 'ok', value: { context: conversation.context, units, classroomRevision: String(room.revision),
        classroomTitle: room.name, archived, canGenerate: !archived } };
    });
    if (outcome.kind !== 'ok') {
      const code = outcome.kind === 'limit' ? 'AI_INPUT_LIMIT' : 'FORBIDDEN';
      throw Object.assign(new Error(code), { code });
    }
    return outcome.value;
  }
  async sources(request: unknown, conversationId: string, input: unknown) {
    const query = parseFoxySourceQuery(input);
    const outcome = await this.run(request, false, async (tx, actor) => {
      if (actor.account_role !== 'teacher') return null;
      const conversation = await this.conversations.get(tx, actor.id, conversationId);
      if (!conversation) return null;
      if (conversation.context.kind === 'GENERAL') return { context: conversation.context, items: [], next: null };
      const room = await this.classroom(tx, actor, conversation.context.classroomId, false, true);
      return { context: conversation.context, ...await loadSources(tx, room.id, query) };
    });
    if (!outcome) throw Object.assign(new Error('FORBIDDEN'), { code: 'FORBIDDEN' });
    return outcome;
  }
}
