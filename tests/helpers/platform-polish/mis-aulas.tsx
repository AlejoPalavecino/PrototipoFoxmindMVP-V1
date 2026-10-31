import {useMemo} from 'react';
import {useRouter} from 'next/router';
import {ClassroomsApp} from '../../classrooms-ui/Classrooms';
import {classroomClient} from './classroom-data';
export default function Fixture() {
  const router=useRouter(),mode=String(router.query.mode??'populated');
  const accountRole=router.query.role==='student'||mode==='student'?'student':'teacher';
  const api=useMemo(()=>{const client=classroomClient(mode);return {...client,call:async <T,>(path:string,method='GET',body?:unknown,signal?:AbortSignal):Promise<T>=>{
    const result=await client.call<T>(path,method,body,signal);
    if(method==='GET'&&path==='')return {...(result as object),...(accountRole==='teacher'?{study:[]}:{teach:[]})} as T;
    if(method==='GET'&&((accountRole==='student'&&path==='/drafts')||(accountRole==='teacher'&&path==='/invitations')))return [] as T;
    return result;
  }};},[mode,accountRole]);
  return <ClassroomsApp key={`${mode}:${accountRole}`} accountRole={accountRole} api={api} displayName="Alex Prueba" onNavigate={page=>void router.push(page==='home'?'/inicio':page==='agenda'?'/agenda':'/mis-aulas')}/>;
}
