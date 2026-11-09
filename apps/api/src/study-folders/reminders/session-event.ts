import {parseAgendaEvent} from '../../../../../src/core/domain/agenda-validation.ts';
function fail():never{throw Object.assign(new Error('INVALID_INPUT'),{code:'INVALID_INPUT'});}
function local(instant:Date,timeZone:string){
  const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(instant);
  const p=Object.fromEntries(parts.map(p=>[p.type,p.value]));
  const value=`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
  return {value,offset:(Date.parse(`${value}:00Z`)-instant.getTime())/60000};
}
export function studySessionEvent(exam:Record<string,unknown>,session:Record<string,unknown>) {
  const start=new Date(String(session.startAt)),end=new Date(String(session.endAt));
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start||end.getTime()-start.getTime()>86400000
    ||end.getTime()>Date.parse(String(exam.examAt))||!Number.isFinite(Date.parse(String(exam.examAt)))
    ||start.getUTCSeconds()||end.getUTCSeconds()||start.getUTCMilliseconds()||end.getUTCMilliseconds())return fail();
  const timeZone=String(session.timeZone??exam.timeZone),a=local(start,timeZone),b=local(end,timeZone);
  const title=String(session.title??exam.title??'Estudio');
  return parseAgendaEvent({title:(/^repaso\s*:/iu.test(title)?title:`Repaso: ${title}`).slice(0,160),description:`Sesión privada de estudio para ${String(exam.title??'evaluación')}.`,category:'EVALUATION',
    schedule:{kind:'TIMED',timeZone,startLocal:a.value,endLocal:b.value,startOffsetMinutes:a.offset,endOffsetMinutes:b.offset},repeat:{kind:'NONE'}});
}
