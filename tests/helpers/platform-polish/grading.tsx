import {useMemo} from 'react';
import {useRouter} from 'next/router';
import {GradingEditor} from "../src/features/grading/index.ts";
import {createGradingEditingApi,createGradingPublicationApi,createGradingAiReviewApi,createGradeCorrectionsApi} from '../src/features/grading/api.ts';
import {AppNavbar} from '../../shared-ui/index';
import {classroomClient,id} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),mode=String(router.query.mode??'populated');
  const api=useMemo(()=>classroomClient(mode),[mode]);
  const ports=useMemo(()=>({operations:createGradingEditingApi(api,id,id),publication:createGradingPublicationApi(api,id,id),aiReview:createGradingAiReviewApi(api,id,id),corrections:createGradeCorrectionsApi(api,id,id)}),[api]);
  return <div className="p5-app fm3-classrooms"><AppNavbar displayName="Alex Prueba" logoHref="/" links={[{href:"/inicio",label:"Inicio"},{href:"/mis-aulas",label:"Mis aulas"},{href:"/agenda",label:"Agenda"}]}/><main className="p5-main"><div className="p5-surface"><h1>Corrección de actividades</h1><GradingEditor {...ports} roomId={id} attemptId={id} onClose={()=>void router.push('/classroom')} onChanged={async()=>{}}/></div></main></div>;
}
