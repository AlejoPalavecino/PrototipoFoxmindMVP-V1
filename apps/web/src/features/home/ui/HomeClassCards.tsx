import type { HomeResponse, HomeTarget } from '../../../../../../src/core/domain/index.ts';
import { HomeReferenceIcon as FoxmindIcon } from '../../../../../shared-ui/HomeReferenceIcon.tsx';
import { learningCover } from '../../../../../shared-ui/parity-assets.ts';
export function HomeClassCards({data,classrooms=[],onAction,onClassrooms,onRetry}:{data:HomeResponse;classrooms?:{id:string;studentCount?:number}[];onAction:(v:HomeTarget)=>void;onClassrooms:()=>void;onRetry:()=>void}) {
 const page=data.modules.classrooms;
 return <section className="parity-home-rooms">
  <header className="section-head"><h2>Tus aulas</h2><button className="text-button" onClick={onClassrooms}><FoxmindIcon name="arrow-right"/>Ver mis aulas</button></header>
  {page.status==='error'?<div role="alert"><p>No pudimos cargar tus aulas.</p><button onClick={onRetry}>Reintentar</button></div>:page.status==='ready'?<div className="class-grid parity-class-grid">{page.items.filter(r=>!r.classroom.archived).slice(0,3).map(({classroom:room,planProgress,target})=>{
   const studentCount=classrooms.find(item=>item.id===room.id)?.studentCount;
   const percent=planProgress?.total?Math.round(planProgress.taught/planProgress.total*100):0;
   return <a className="class-card parity-class-card" key={room.id} href={`/mis-aulas?aula=${encodeURIComponent(room.id)}&section=plan`} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onAction(target);}}}>
    <div className="class-cover"><img src={learningCover(room.coverKey)} alt=""/>{room.division?<span className="state">{room.division}</span>:null}</div>
    <div className="class-body"><h3>{room.name}</h3><p>{room.subject}{studentCount!==undefined?` · ${studentCount} ${studentCount===1?'estudiante':'estudiantes'}`:''}</p><div className="class-bottom"><span>{planProgress?`${planProgress.taught} de ${planProgress.total} temas dados`:'Abrir el plan del aula'}</span><FoxmindIcon name="arrow-right"/></div>
     {planProgress&&planProgress.total>0?<div className="progress-track" role="progressbar" aria-label={`Avance del plan de ${room.name}`} aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100}><span style={{width:percent+'%'}}/></div>:null}
    </div>
   </a>;
  })}</div>:null}
 </section>;
}
