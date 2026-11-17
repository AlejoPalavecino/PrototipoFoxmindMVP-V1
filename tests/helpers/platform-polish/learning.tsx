import {useMemo} from 'react';
import {useRouter} from 'next/router';
import { AttemptSession } from '../src/application/academic-AttemptSession.tsx';
import { ActivityAuthoring } from '../src/features/activity-authoring/index.ts';
import { ActivityGeneration } from '../src/features/activity-authoring/index.ts';
import { PublishedResult } from '../src/features/grading/index.ts';
import {createActivityAuthoringApi} from '../src/features/activity-authoring/api.ts';
import {createGradingResultsApi} from '../src/features/grading/api.ts';
import {AppNavbar} from '../../shared-ui/index';
import {classroomClient,sessionFor,roomFor,activity,material,id} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),kind=String(router.query.kind??'attempt'),mode=String(router.query.mode??'assignment');
  const api=useMemo(()=>classroomClient(mode),[mode]),close=()=>void router.push('/');
  const room=roomFor(kind==='attempt'?'student':'teacher');
  const authoring=useMemo(()=>createActivityAuthoringApi(api,room.id),[api,room.id]);
  const result=useMemo(()=>createGradingResultsApi(api,id,id),[api]);
  return <div className="p5-app fm3-classrooms"><AppNavbar displayName="Alex Prueba" logoHref="/" links={[{href:'/inicio',label:'Inicio'},{href:'/mis-aulas',label:'Mis aulas'},{href:'/agenda',label:'Agenda'}]}/>
    <main className="p5-main"><section className="p5-surface"><h1>{kind==='authoring'?'Preparar actividad':kind==='generation'?'Generación de actividades':kind==='result'?'Devolución publicada':'Actividad de aprendizaje'}</h1>
      {kind==='attempt'?<AttemptSession key={mode} api={api} room={room} initial={sessionFor(mode)} onClose={close} onChanged={async()=>{}}/>:null}
      {kind==='authoring'?<ActivityAuthoring key={mode} api={authoring} room={room} data={{revision:'1',preview:true,activity:{...sessionFor(mode).activity,status:'DRAFT',publishedAt:null}}} materials={[material]} onSaved={async()=>{}} onClose={close}/>:null}
      {kind==='generation'?<ActivityGeneration api={authoring.generation} room={room} onApplied={async()=>{}} onClose={close}/>:null}
      {kind==='result'?<PublishedResult operations={result} roomId={id} attemptId={id}/>:null}
    </section></main></div>;
}
