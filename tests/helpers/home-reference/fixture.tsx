import {useMemo,useState} from 'react';
import {useRouter} from 'next/router';
import {Home} from '../../classrooms-ui/Home';
import {AppNavbar} from '../../shared-ui/AppNavbar';
import type {HomeClient} from '../../classrooms-ui/home-api';
import {fixture,subjectId} from '../fixtures/home-reference-data';

export default function HomeReferenceFixture(){
  const router=useRouter(),mode=String(router.query.mode??'mixed');
  const [action,setAction]=useState(''),[reads,setReads]=useState(0);
  const client=useMemo<HomeClient>(()=>({
    read:async()=>{setReads(value=>value+1);if(mode==='loading')await new Promise(()=>{});return fixture(mode);},
    page:async query=>{
      setReads(value=>value+1);
      const aggregate=fixture(mode==='error'?'mixed':mode);
      const next=fixture('teach').modules.classrooms;
      if(next.status==='ready')next.items=next.items.map((item,index)=>{
        const id=`11111111-1111-4111-8111-${String(index+6).padStart(12,'0')}`;
        return {...item,id,classroom:{...item.classroom,id},target:{kind:'classroom',classroomId:id,section:'plan'}};
      });
      const page=query.cursor&&query.module==='classrooms'?next:aggregate.modules[query.module];
      return {subjectId,generatedAt:aggregate.generatedAt,module:query.module,page};
    },
  }),[mode]);
  const act=(value:unknown)=>setAction(typeof value==='string'?value:JSON.stringify(value));
  return <div className="p5-app fm3-classrooms entry-home" data-qa-fixture="true">
    <a className="skip-link" href="#classroom-main">Saltar al contenido</a>
    <AppNavbar logoHref="/mis-aulas" displayName="Alex Prueba" links={[
      {href:'/inicio',label:'Inicio',current:true},{href:'/mis-aulas',label:'Mis aulas'},{href:'/agenda',label:'Agenda'}]} onNavigate={act}/>
    <main id="classroom-main" className="p5-main"><Home key={mode} displayName={mode==='long'?'Alexandra Nombre de Prueba Extendido':'Alex Prueba'}
      subjectId={subjectId} homeClient={client} onCreate={()=>act('create')} onJoin={()=>act('join')}
      onClassrooms={()=>act('classrooms')} onAgenda={()=>act('agenda')} onAction={act}/></main>
    <output data-qa-action aria-label="Última acción sintética">{action}</output>
    <output data-qa-reads hidden>{reads}</output>
  </div>;
}
