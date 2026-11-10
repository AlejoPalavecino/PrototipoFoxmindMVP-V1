import { privateHomeEvents } from './private-events.ts';
import { projectPrivateTiming, type PrivateTiming } from './private-timing.ts';
import { HomeError, type AgendaItem, type HomeActor, type HomeModules, type HomePageQuery, parseHomeModuleResponse } from '../../../../../../src/core/domain/index.ts';
import type { HomeSql } from './database-types.ts';
import { authorizedRooms } from './queries-participation.ts';
import { baseJson, targetJson, instant } from './query-values.ts';
import { nextCursor, readCursor } from './cursor.ts';
const academic = `SELECT a.id,
  ${baseJson('a.id', 'a.title', targetJson('activity', ",'activityId',a.id"))}
  || jsonb_build_object('source','ACADEMIC_DEADLINE','startAt',${instant('d.deadline')},
    'date',to_char(d.deadline AT TIME ZONE $4::text,'YYYY-MM-DD'),'timeZone',c.timezone,'allDay',false) AS item,
  d.deadline AS start_at, NULL::jsonb AS timing
  FROM rooms c JOIN activities a ON a.classroom_id=c.id AND a.status='PUBLISHED'
  LEFT JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
  LEFT JOIN student_activities sa ON sa.enrollment_id=e.id AND sa.activity_id=a.id
  LEFT JOIN LATERAL (SELECT status,individual_deadline_at FROM attempts WHERE student_activity_id=sa.id ORDER BY attempt_number DESC LIMIT 1) t ON true
  CROSS JOIN LATERAL (SELECT CASE WHEN c.role='teacher' THEN a.deadline_at
    ELSE GREATEST(a.deadline_at,COALESCE(t.individual_deadline_at,sa.first_submission_deadline_at)) END AS deadline) d
  WHERE c.archived_at IS NULL AND (c.role='teacher' OR (sa.is_expected AND COALESCE(t.status::text,'DRAFT')<>'SUBMITTED'))`;
export async function readMiniagenda(tx: HomeSql, actor: HomeActor, query: HomePageQuery): Promise<HomeModules['agenda']> {
  const after = readCursor(actor, query);
  const privateRows = await privateHomeEvents(tx,actor,query.timeZone);
  const rows = await tx.query<{ item: AgendaItem; sort_key: string; timing: PrivateTiming | null }>(`WITH rooms AS (${authorizedRooms}),
    academic_candidates AS (SELECT * FROM (${academic}) deadlines
      WHERE start_at>$2::timestamptz AND start_at<$2::timestamptz+interval '90 days'
        AND (${instant('start_at')} || '|' || id::text)>$3::text
      ORDER BY start_at,id LIMIT 4),
    source AS (SELECT * FROM academic_candidates), future AS (
      SELECT item,timing,${instant('start_at')} || '|' || id::text AS sort_key FROM source
      WHERE start_at>$2::timestamptz-interval '2 days' AND start_at<$2::timestamptz+interval '92 days')
    SELECT * FROM future`,
  actor.userId, actor.now, after, query.timeZone);
  const now = Date.parse(actor.now), end = now + 90 * 86400000;
  const future = [...rows,...privateRows].map(row => {
    const item = projectPrivateTiming(row.item, row.timing, query.timeZone);
    const instant = item.startAt ?? row.sort_key.split('|')[0];
    return { item, sort_key: `${instant}|${item.id}`, start: Date.parse(instant) };
  }).filter(row => row.start > now && row.start < end && row.sort_key > after)
    .sort((left, right) => left.sort_key < right.sort_key ? -1 : left.sort_key > right.sort_key ? 1 : 0);
  const visible = future.slice(0, 3);
  const week=future.filter(row=>row.start<now+7*86400000).map(row=>row.item);
  const preview=query.cursor===null?{preview:{personal:week.filter(item=>item.source==='PRIVATE_EVENT').slice(0,2),deadline:week.find(item=>item.source==='ACADEMIC_DEADLINE'&&item.classroom?.role==='teacher')??null}}:{};
  return parseHomeModuleResponse({ subjectId: actor.userId, generatedAt: actor.now, module: 'agenda',
    page: { status: 'ready', items: visible.map(row => row.item), totalItems: null,...preview,
      nextCursor: future.length > 3 ? nextCursor(actor, query, visible[2].sort_key) : null } }).page as HomeModules['agenda'];
}
