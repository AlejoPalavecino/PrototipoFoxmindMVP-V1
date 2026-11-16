import type { HomeAgendaReader } from '../api/home-api.ts';
import type { AgendaItem } from '../../../../../../src/core/domain/index.ts';
import type { EventOccurrence } from '../../../../../../src/core/domain/agenda/index.ts';
import { homeCalendarWeek } from './home-presentation.ts';

export function homeLocalDate(instant:string,timeZone:string):string {
 const parts=new Intl.DateTimeFormat('en',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(instant));
 return ['year','month','day'].map(type=>parts.find(part=>part.type===type)!.value).join('-');
}
export async function readHomeDay(client:HomeAgendaReader,generatedAt:string,timeZone:string,signal:AbortSignal) {
 const date=homeLocalDate(generatedAt,timeZone), monday=homeCalendarWeek(generatedAt,timeZone)[0].date;
 const end=new Date(monday+'T12:00Z');end.setUTCDate(end.getUTCDate()+7);
 const range={startDate:monday,endDateExclusive:end.toISOString().slice(0,10),timeZone};
 const occurrences=new Map<string,EventOccurrence>(),seen=new Set<string>();let cursor:string|null=null;
 do {
  signal.throwIfAborted();
  const page=await client.list(range,cursor,signal);signal.throwIfAborted();
  for(const item of page.items)if(item.kind==='PRIVATE_EVENT')occurrences.set(item.occurrenceId,item);
  cursor=page.nextCursor;
  if(cursor){if(seen.has(cursor)||seen.size>=100)throw new Error('Invalid agenda pagination');seen.add(cursor);}
 }while(cursor);
 const dates=new Set<string>(),events:AgendaItem[]=[];
 for(const item of occurrences.values()){
  const start=item.startAt?homeLocalDate(item.startAt,timeZone):item.startDate;
  const finish=item.endAt?homeLocalDate(new Date(Date.parse(item.endAt)-1).toISOString(),timeZone):new Date(Date.parse(item.endDateExclusive+'T12:00Z')-86400000).toISOString().slice(0,10);
  for(const day of homeCalendarWeek(generatedAt,timeZone))if(day.date>=start&&day.date<=finish)dates.add(day.date);
  if(date<start||date>finish)continue;
  events.push({id:item.occurrenceId,title:item.event.title,source:'PRIVATE_EVENT',classroom:null,category:item.event.category,color:item.event.color,
   startAt:item.startAt,endAt:item.endAt,date:start,timeZone,allDay:item.event.schedule.kind==='ALL_DAY',
   target:{kind:'private-event',eventId:item.event.id,occurrenceId:item.occurrenceId,date:item.occurrenceDate??item.occurrenceId.slice(item.event.id.length+1)}});
 }
 events.sort((a,b)=>(a.startAt??'').localeCompare(b.startAt??'')||a.id.localeCompare(b.id));
 return {date,events,dates};
}
