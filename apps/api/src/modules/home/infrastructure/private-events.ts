import { createHash } from 'node:crypto';
import { HomeError, expandAgendaEvent, parseAgendaEvent, type AgendaItem, type HomeActor, type PrivateEvent } from '../../../../../../src/core/domain/index.ts';
import type { HomeSql } from './database-types.ts';

/** Bound parent reads, then use Agenda's canonical recurrence/exception rules. */
export async function privateHomeEvents(tx: HomeSql, actor: HomeActor, timeZone: string): Promise<{item:AgendaItem;sort_key:string;timing:null}[]> {
  const now=Date.parse(actor.now),range={startDate:new Date(now-2*86400000).toISOString().slice(0,10),endDateExclusive:new Date(now+92*86400000).toISOString().slice(0,10),timeZone};
  const parents=await tx.query<{id:string}>(`SELECT id FROM agenda_events WHERE owner_id=$1::uuid AND (
    (start_date<=$3::date AND COALESCE(repeat_until,start_date)>=$2::date)
    OR EXISTS(SELECT 1 FROM jsonb_array_elements(exceptions) ex WHERE COALESCE(ex->'replacement'->'schedule'->>'startDate',left(ex->'replacement'->'schedule'->>'startLocal',10))::date BETWEEN $2::date AND $3::date))
    ORDER BY id LIMIT 201`,actor.userId,range.startDate,range.endDateExclusive);
  if(parents.length>200)throw new HomeError('SERVICE_UNAVAILABLE');
  if(!parents.length)return [];
  const rows=await tx.query<{id:string;revision:bigint;created_at:Date;updated_at:Date;payload:unknown;exceptions:PrivateEvent['exceptions']}>(`SELECT id,revision,created_at,updated_at,exceptions,
    jsonb_build_object('title',title,'description',description,'category',category,
      'schedule',CASE WHEN schedule_kind='ALL_DAY' THEN jsonb_build_object('kind','ALL_DAY','startDate',start_date::text,'endDateExclusive',end_date_exclusive::text)
      ELSE jsonb_build_object('kind','TIMED','timeZone',time_zone,'startLocal',start_local,'endLocal',end_local)
        || CASE WHEN start_offset_minutes IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('startOffsetMinutes',start_offset_minutes) END
        || CASE WHEN end_offset_minutes IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('endOffsetMinutes',end_offset_minutes) END END,
      'repeat',CASE WHEN repeat_kind='NONE' THEN jsonb_build_object('kind','NONE') ELSE jsonb_build_object('kind',repeat_kind,'untilDate',repeat_until::text) END)
      || CASE WHEN color IS NULL THEN '{}'::jsonb ELSE jsonb_build_object('color',color) END AS payload
    FROM agenda_events WHERE owner_id=$1::uuid AND id=ANY($2::uuid[])`,actor.userId,parents.map(row=>row.id));
  const occurrences=rows.flatMap(row=>expandAgendaEvent({...parseAgendaEvent(row.payload),id:row.id,revision:String(row.revision),createdAt:row.created_at.toISOString(),updatedAt:row.updated_at.toISOString(),exceptions:row.exceptions},range));
  const days=[...new Set(occurrences.filter(item=>!item.startAt).map(item=>item.startDate))];
  const midnights=days.length?await tx.query<{date:string;start:string}>(`SELECT day::text AS date,to_char(day::timestamp AT TIME ZONE $2::text AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS start FROM unnest($1::date[]) day`,days,timeZone):[];
  return occurrences.map(occurrence=>{
    const event=occurrence.event,hex=createHash('md5').update(occurrence.occurrenceId).digest('hex'),id=hex.replace(/^(.{8})(.{4})(.{4})(.{4})(.{12})$/,'$1-$2-$3-$4-$5');
    const item: AgendaItem = {
      id, title: event.title, classroom: null, source: 'PRIVATE_EVENT', category: event.category,
      ...(event.color ? { color: event.color } : {}),
      target: { kind: 'private-event', eventId: event.id, occurrenceId: id, date: occurrence.occurrenceDate ?? occurrence.startDate },
      startAt: occurrence.startAt, endAt: occurrence.endAt, date: occurrence.startDate,
      timeZone: event.schedule.kind === 'TIMED' ? event.schedule.timeZone : timeZone, allDay: event.schedule.kind === 'ALL_DAY',
    };
    return {item,sort_key:`${occurrence.startAt??midnights.find(row=>row.date===occurrence.startDate)!.start}|${id}`,timing:null};
  });
}
