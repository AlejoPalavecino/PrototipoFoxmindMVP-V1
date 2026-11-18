import {resolveAgendaMinute} from '../../../../../../src/core/domain/agenda/time.ts';
import {localMinuteAt,shiftDate} from '../../../../../../src/core/domain/agenda/values.ts';
export function studyInstant(local:string,zone:string):string{try{return resolveAgendaMinute(local,zone);}catch{throw new Error('Revisá la zona y el horario: esa hora no existe o se repite por el cambio de hora. Elegí otro horario.');}}
export function studyLocalMinute(instant:string,zone:string):string{return localMinuteAt(Date.parse(instant),zone);}
export function studyReviewStartDate(now: string, zone: string, time: string): string {
  const local = studyLocalMinute(now, zone);
  const date = local.slice(0, 10);
  return local.slice(11) < time ? date : shiftDate(date, 1);
}
/** Convert the review brief into real availability, leaving allocation to the Study command. */
export function studyReviewAvailability({start,exam,count,time,minutes,zone,now=Date.now()}:{start:string;exam:string;count:number;time:string;minutes:number;zone:string;now?:number}):{start:string;minutes:number}[]{
 const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
 if(!validDate(start)||!validDate(exam)||exam<=start)throw new Error('Elegí una evaluación posterior al inicio.');
 if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)||![15,25,40].includes(minutes))throw new Error('Revisá el horario y la duración de las sesiones.');
 const [hour,minute]=time.split(':').map(Number);
 if(hour*60+minute+minutes>=1440)throw new Error('Elegí un horario que permita terminar la sesión en el mismo día.');
 const first=studyInstant(`${start}T${time}`,zone);
 if(Date.parse(first)<=now)throw new Error('El horario de inicio ya pasó. Elegí una fecha de inicio futura o un horario posterior.');
 const days=Math.round((Date.parse(exam)-Date.parse(start))/86400000);
 if(!Number.isInteger(count)||count<2||count>5||count>days)throw new Error('Elegí entre 2 y 5 sesiones, con al menos un día disponible por sesión.');
 return Array.from({length:count},(_,index)=>{
  const date=new Date(Date.parse(start)+Math.floor(index*(days-1)/(count-1))*86400000).toISOString().slice(0,10);
  return {start:index===0?first:studyInstant(`${date}T${time}`,zone),minutes};
 });
}
