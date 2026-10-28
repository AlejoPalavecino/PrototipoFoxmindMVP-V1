import {useMemo} from 'react';
import {useRouter} from 'next/router';
import {ClassroomsApp} from '../../classrooms-ui/Classrooms';
import {classroomClient} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),mode=String(router.query.mode??'populated');
  const api=useMemo(()=>classroomClient(mode),[mode]);
  return <ClassroomsApp key={mode} api={api} displayName="Alex Prueba" onNavigate={page=>void router.push(page==='home'?'/inicio':page==='agenda'?'/agenda':'/mis-aulas')}/>;
}
