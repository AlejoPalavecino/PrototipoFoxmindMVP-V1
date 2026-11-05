import { projectPrivateTiming, type PrivateTiming } from './private-timing.ts';
import { HomeError, type AgendaItem, type HomeActor, type HomeModules, type HomePageQuery, parseHomeModuleResponse } from '../../../../src/core/domain/index.ts';
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
const privateEvents = `SELECT md5(e.id::text || ':' || occurrence.day::text)::uuid AS id,
  jsonb_build_object('id',md5(e.id::text || ':' || occurrence.day::text)::uuid,'title',e.title,'classroom',null,
    'target',jsonb_build_object('kind','private-event','eventId',e.id,
       'occurrenceId',md5(e.id::text || ':' || occurrence.day::text)::uuid,'date',occurrence.day::text),
    'source','PRIVATE_EVENT','startAt',CASE WHEN e.schedule_kind='ALL_DAY' THEN NULL ELSE ${instant('timing.start_at')} END,
    'date',occurrence.day::text,'timeZone',COALESCE(e.time_zone,$4::text),'allDay',e.schedule_kind='ALL_DAY') AS item,
  timing.start_at, jsonb_build_object('schedule',CASE WHEN e.schedule_kind='ALL_DAY'
    THEN jsonb_build_object('kind','ALL_DAY','startDate',e.start_date::text,'endDateExclusive',e.end_date_exclusive::text)
    ELSE jsonb_build_object('kind','TIMED','timeZone',e.time_zone,'startLocal',e.start_local,'endLocal',e.end_local)
      || CASE WHEN e.start_offset_minutes IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('startOffsetMinutes',e.start_offset_minutes) END
      || CASE WHEN e.end_offset_minutes IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('endOffsetMinutes',e.end_offset_minutes) END END,
    'repeat',CASE WHEN e.repeat_kind='NONE' THEN jsonb_build_object('kind','NONE') ELSE jsonb_build_object('kind','WEEKLY','untilDate',e.repeat_until::text) END) AS timing
  FROM private_parents e CROSS JOIN LATERAL generate_series(0,
    CASE WHEN e.repeat_kind='WEEKLY' THEN (e.repeat_until-e.start_date)/7 ELSE 0 END) n
  CROSS JOIN LATERAL (SELECT e.start_date+(n*7) AS day) occurrence
  CROSS JOIN LATERAL (SELECT CASE WHEN e.schedule_kind='ALL_DAY' THEN occurrence.day::timestamp AT TIME ZONE $4::text
    WHEN n=0 THEN e.start_at ELSE (e.start_local::timestamp+(n*7)*interval '1 day') AT TIME ZONE e.time_zone END AS start_at) timing`;
async function privateParentIds(tx: HomeSql, actor: HomeActor, timeZone: string): Promise<string[]> {
  const parents = await tx.query<{ id: string }>(`SELECT id FROM agenda_events
    WHERE owner_id=$1::uuid AND start_date<=($2::timestamptz AT TIME ZONE $3::text)::date+92
      AND COALESCE(repeat_until,start_date)>=($2::timestamptz AT TIME ZONE $3::text)::date-2
    ORDER BY id LIMIT 201`, actor.userId, actor.now, timeZone);
  if (parents.length > 200) throw new HomeError('SERVICE_UNAVAILABLE');
  return parents.map(parent => parent.id);
}
export async function readMiniagenda(tx: HomeSql, actor: HomeActor, query: HomePageQuery): Promise<HomeModules['agenda']> {
  const after = readCursor(actor, query);
  const parents = await privateParentIds(tx, actor, query.timeZone);
  const rows = await tx.query<{ item: AgendaItem; sort_key: string; timing: PrivateTiming | null }>(`WITH rooms AS (${authorizedRooms}),
    private_parents AS MATERIALIZED (SELECT * FROM agenda_events WHERE owner_id=$1::uuid AND id=ANY($5::uuid[])),
    academic_candidates AS (SELECT * FROM (${academic}) deadlines
      WHERE start_at>$2::timestamptz AND start_at<$2::timestamptz+interval '90 days'
        AND (${instant('start_at')} || '|' || id::text)>$3::text
      ORDER BY start_at,id LIMIT 4),
    source AS (SELECT * FROM academic_candidates UNION ALL ${privateEvents}), future AS (
      SELECT item,timing,${instant('start_at')} || '|' || id::text AS sort_key FROM source
      WHERE start_at>$2::timestamptz-interval '2 days' AND start_at<$2::timestamptz+interval '92 days')
    SELECT * FROM future`,
  actor.userId, actor.now, after, query.timeZone, parents);
  const now = Date.parse(actor.now), end = now + 90 * 86400000;
  const future = rows.map(row => {
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
