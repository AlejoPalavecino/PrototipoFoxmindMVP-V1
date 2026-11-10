import surface from '../src/application/academic-classrooms-surface.module.css';
import {useMemo} from 'react';
import {useRouter} from 'next/router';
import {ClassroomView} from '../src/application/academic-ClassroomView.tsx';
import {AppNavbar} from '../../shared-ui/index';
import {classroomClient,id} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),mode=String(router.query.mode??'teacher');
  const api=useMemo(()=>classroomClient(mode),[mode]);
  return <div className={`p5-app fm3-classrooms ${surface.scope}`}><AppNavbar displayName="Alex Prueba" logoHref="/" links={[{href:'/inicio',label:'Inicio'},{href:'/mis-aulas',label:'Mis aulas',current:true},{href:'/agenda',label:'Agenda'}]}/>
    <main className="p5-main"><ClassroomView key={mode} id={id} api={api} initialCode={null} onExit={()=>void router.push('/mis-aulas')}/></main></div>;
}
