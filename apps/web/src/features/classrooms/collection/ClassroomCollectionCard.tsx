import type { Classroom } from '../../../../../../src/core/contracts/classrooms.ts';
import { FoxmindIcon } from '../../../../../shared-ui/index.ts';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
export function ClassroomCard({room,onEnter}:{room:Classroom;onEnter:(id:string)=>void}) {
 const progress=room.planProgress,percentage=progress&&progress.total>0?Math.round(100*progress.taught/progress.total):0;
 return <a className="class-card cl-course" href={`/mis-aulas?aula=${encodeURIComponent(room.id)}`} aria-label={`Entrar al aula ${room.name}${room.role==='student'&&room.teacher?` · Docente: ${room.teacher}`:''}`} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&!event.shiftKey){event.preventDefault();onEnter(room.id);}}}>
  <div className="class-cover"><img src={learningCover(room.coverKey)} alt=""/><span className="state">{room.division}{room.archived?' · Archivada':''}</span></div>
  <div className="class-body"><h3>{room.name}</h3><p>{room.subject}{room.studentCount===undefined?'':` · ${room.studentCount} ${room.studentCount===1?'estudiante':'estudiantes'}`}</p><div className="class-bottom"><span>{progress?(progress.total?`${progress.taught} de ${progress.total} ${progress.total === 1 ? 'tema dado' : 'temas dados'}`:'Sin temas'):'No disponible'}</span><FoxmindIcon name="arrow-right"/></div>{progress&&progress.total>0?<div className="progress-track" role="progressbar" aria-label={`Avance del plan de ${room.name}`} aria-valuenow={percentage} aria-valuemin={0} aria-valuemax={100}><span style={{width:percentage+'%'}}/></div>:null}</div>
 </a>;
}
