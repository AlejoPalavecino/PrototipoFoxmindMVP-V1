import surface from "../src/application/academic-classrooms-surface.module.css";
import {useMemo} from 'react';
import {useRouter} from 'next/router';
import { Wizard } from '../src/application/academic-Wizard.tsx';
import {AppNavbar} from '../../shared-ui/index';
import {classroomClient,draft,id} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),api=useMemo(()=>classroomClient('populated'),[]);
  const prepared=router.query.mode==='prepared';
  const initial=prepared?{...draft,payload:{...draft.payload,planFileId:id}}:draft;
  return <div className={`p5-app fm3-classrooms ${surface.scope}`}><AppNavbar displayName="Alex Prueba" logoHref="/" links={[{href:"/inicio",label:"Inicio"},{href:"/mis-aulas",label:"Mis aulas"},{href:"/agenda",label:"Agenda"}]}/><main className="p5-main"><Wizard key={String(prepared)} api={api} draft={initial} onExit={()=>void router.push('/')} onPublished={()=>{}}/></main></div>;
}
