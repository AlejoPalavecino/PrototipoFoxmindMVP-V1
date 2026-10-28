import {useMemo} from 'react';
import {useRouter} from 'next/router';
import {AttemptSession} from '../../classrooms-ui/AttemptSession';
import {ActivityAuthoring} from '../../classrooms-ui/ActivityAuthoring';
import {ActivityGeneration} from '../../classrooms-ui/ActivityGeneration';
import {PublishedResult} from '../../classrooms-ui/PublishedResult';
import {AppNavbar} from '../../shared-ui/index';
import {classroomClient,sessionFor,roomFor,activity,material,id} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),kind=String(router.query.kind??'attempt'),mode=String(router.query.mode??'assignment');
  const api=useMemo(()=>classroomClient(mode),[mode]),close=()=>void router.push('/');
  const room=roomFor(kind==='attempt'?'student':'teacher');
  return <div className="p5-app fm3-classrooms"><AppNavbar displayName="Alex Prueba" logoHref="/" links={[{href:'/inicio',label:'Inicio'},{href:'/mis-aulas',label:'Mis aulas'},{href:'/agenda',label:'Agenda'}]}/>
    <main className="p5-main"><section className="p5-surface"><h1>{kind==='authoring'?'Preparar actividad':kind==='generation'?'Generación de actividades':kind==='result'?'Devolución publicada':'Actividad de aprendizaje'}</h1>
      {kind==='attempt'?<AttemptSession key={mode} api={api} room={room} initial={sessionFor(mode)} onClose={close} onChanged={async()=>{}}/>:null}
      {kind==='authoring'?<ActivityAuthoring key={mode} api={api} room={room} data={{revision:'1',preview:true,activity:{...sessionFor(mode).activity,status:'DRAFT',publishedAt:null}}} materials={[material]} onSaved={async()=>{}} onClose={close}/>:null}
      {kind==='generation'?<ActivityGeneration api={api} room={room} onApplied={async()=>{}} onClose={close}/>:null}
      {kind==='result'?<PublishedResult api={api} roomId={id} attemptId={id}/>:null}
    </section></main></div>;
}
