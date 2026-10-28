import {useMemo} from 'react';
import {useRouter} from 'next/router';
import {Wizard} from '../../classrooms-ui/Wizard';
import {AppNavbar} from '../../shared-ui/index';
import {classroomClient,draft} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),api=useMemo(()=>classroomClient('populated'),[]);
  return <div className="p5-app fm3-classrooms"><AppNavbar displayName="Alex Prueba" logoHref="/" links={[{href:"/inicio",label:"Inicio"},{href:"/mis-aulas",label:"Mis aulas"},{href:"/agenda",label:"Agenda"}]}/><main className="p5-main"><Wizard api={api} draft={draft} onExit={()=>void router.push('/')} onPublished={()=>{}}/></main></div>;
}
