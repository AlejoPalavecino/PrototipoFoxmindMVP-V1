import { projectPendingPolicy, type PendingPolicyRow } from './pending-policy.ts';
import type { HomeActor, HomeModuleName, HomeModules, HomePageQuery } from '../../../../../../src/core/domain/index.ts';
import { parseHomeModuleResponse } from '../../../../../../src/core/domain/index.ts';
import type { HomeSql } from './database-types.ts';
import { authorizedRooms } from './queries-participation.ts';
import { pendingQuery } from './queries-pending.ts';
import { reviewQuery } from './queries-review.ts';
import { feedbackQuery } from './queries-feedback.ts';
import { queriesQuery, materialsQuery, classroomsQuery } from './queries-content.ts';
import { draftsQuery, submittedQuery } from './queries-desk.ts';
import { readCursor, nextCursor } from './cursor.ts';
const sources = { drafts: draftsQuery, submitted: submittedQuery, pending: pendingQuery, review: reviewQuery, feedback: feedbackQuery,
  queries: queriesQuery, materials: materialsQuery, classrooms: classroomsQuery };
type SqlModule = Exclude<HomeModuleName, 'agenda'>;
interface PageRow { item: unknown | null; policy: PendingPolicyRow | null; sort_key: string | null; total: number; needs_review: number; ready_to_publish: number }
export async function readSqlPage<M extends SqlModule>(tx: HomeSql, actor: HomeActor, query: HomePageQuery & { module: M }): Promise<HomeModules[M]> {
  const after = readCursor(actor, query), descending = ['feedback', 'queries', 'materials'].includes(query.module);
  const comparison = descending ? '<' : '>', order = descending ? 'DESC' : 'ASC';
  const totals = query.module === 'review' ? 'COALESCE(sum(needs_review),0)::int AS needs_review, COALESCE(sum(ready_to_publish),0)::int AS ready_to_publish'
    : '0::int AS needs_review,0::int AS ready_to_publish';
  const countSql = query.module === 'materials' ? '0::int AS total,' + totals : 'count(*)::int AS total,' + totals + ' FROM source';
  const rows = await tx.query<PageRow>(`WITH parameters AS (SELECT $2::timestamptz), rooms AS (${authorizedRooms}), source AS (${sources[query.module]}),
    totals AS (SELECT ${countSql}), selected AS
    (SELECT item,sort_key,${query.module === 'pending' ? 'policy' : 'NULL::jsonb AS policy'} FROM source WHERE ($3::text='' OR sort_key ${comparison} $3::text) ORDER BY sort_key ${order} LIMIT 6)
    SELECT selected.*,totals.* FROM totals LEFT JOIN selected ON true ORDER BY sort_key ${order} NULLS LAST`, actor.userId, actor.now, after);
  const actual = rows.filter(row => row.item !== null), visible = actual.slice(0, 5), meta = rows[0];
  const page = { status: 'ready', items: visible.map(row => query.module === 'pending' ? projectPendingPolicy(row.item, row.policy!, actor.now) : row.item),
    totalItems: query.module === 'materials' ? null : meta.total,
    nextCursor: actual.length > 5 ? nextCursor(actor, query, visible[4].sort_key!) : null,
    ...(query.module === 'review' ? { totals: { attempts: meta.needs_review + meta.ready_to_publish,
      needsReview: meta.needs_review, readyToPublish: meta.ready_to_publish } } : {}) };
  return parseHomeModuleResponse({ subjectId: actor.userId, generatedAt: actor.now, module: query.module, page }).page as HomeModules[M];
}
