import {resolveAgendaMinute} from '../../../../src/core/domain/agenda-time.ts';
import {localMinuteAt} from '../../../../src/core/domain/agenda-values.ts';
export function studyInstant(local:string,zone:string):string{try{return resolveAgendaMinute(local,zone);}catch{throw new Error('Revisá la zona y el horario: esa hora no existe o se repite por el cambio de hora. Elegí otro horario.');}}
export function studyLocalMinute(instant:string,zone:string):string{return localMinuteAt(Date.parse(instant),zone);}
