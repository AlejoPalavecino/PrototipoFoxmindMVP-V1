import surface from '../src/application/academic-classrooms-surface.module.css';
import {useMemo,useState} from 'react';
import {useRouter} from 'next/router';
import {Home} from "../src/features/home/index.ts";
import {AppNavbar} from '../../shared-ui/AppNavbar';
import type {HomeClient} from "../src/features/home/index.ts";
import type {HomeResponse} from '../../../src/core/domain/index';
import {fixture,subjectId} from '../fixtures/home-reference-data';

function forRole(data:HomeResponse,role:'teacher'|'student'):HomeResponse {
  const rooms=data.modules.classrooms;
  const classrooms=rooms.status==='ready'?{...rooms,items:rooms.items.filter(item=>item.classroom.role===role)}:rooms;
  const active=data.participation!=='none';
  const materials=data.modules.materials.status==='ready'?{...data.modules.materials,items:data.modules.materials.items.map(item=>({...item,classroom:{...item.classroom,role}}))}:data.modules.materials;
  const agenda=data.modules.agenda.status==='ready'?{...data.modules.agenda,items:data.modules.agenda.items.map(item=>({...item,classroom:item.classroom?{...item.classroom,role}:null}))}:data.modules.agenda;
  return {...data,participation:active?(role==='teacher'?'teach':'study'):'none',
    memberships:{...data.memberships,teach:role==='teacher'?data.memberships.teach:0,study:role==='student'?data.memberships.study:0},
    modules:{...data.modules,classrooms,materials,agenda,...(role==='teacher'?{pending:{status:'not-applicable'},feedback:{status:'not-applicable'}}:{review:{status:'not-applicable'},queries:{status:'not-applicable'}})}};
}

export default function HomeReferenceFixture(){
  const router=useRouter(),mode=String(router.query.mode??'mixed');
  const accountRole=router.query.role==='student'||mode==='study'?'student':'teacher';
  const [action,setAction]=useState(''),[reads,setReads]=useState(0);
  const client=useMemo<HomeClient>(()=>({
    read:async()=>{setReads(value=>value+1);if(mode==='loading')await new Promise(()=>{});return forRole(fixture(mode),accountRole);},
    page:async query=>{
      setReads(value=>value+1);
      const aggregate=forRole(fixture(mode==='error'?'mixed':mode),accountRole);
      const next=fixture(accountRole==='teacher'?'teach':'study').modules.classrooms;
      if(next.status==='ready')next.items=next.items.map((item,index)=>{
        const id=`11111111-1111-4111-8111-${String(index+6).padStart(12,'0')}`;
        return {...item,id,classroom:{...item.classroom,id},target:{kind:'classroom',classroomId:id,section:'plan'}};
      });
      const page=query.cursor&&query.module==='classrooms'?next:aggregate.modules[query.module];
      return {subjectId,generatedAt:aggregate.generatedAt,module:query.module,page};
    },
  }),[mode,accountRole]);
  const act=(value:unknown)=>setAction(typeof value==='string'?value:JSON.stringify(value));
  return <div className={`p5-app fm3-classrooms entry-home ${surface.scope}`} data-qa-fixture="true">
    <a className="skip-link" href="#classroom-main">Saltar al contenido</a>
    <AppNavbar homeNavigation logoHref="/mis-aulas" displayName="Alex Prueba" links={[
      {href:'/inicio',label:'Inicio',current:true},{href:'/mis-aulas',label:'Mis aulas'},{href:'/agenda',label:'Agenda'}]} onNavigate={act}
      accountActions={<button onClick={()=>act('logout')}>Cerrar sesión</button>}/>
    <main id="classroom-main" className="p5-main"><Home key={`${mode}:${accountRole}`} accountRole={accountRole} displayName={mode==='long'?'Alexandra Nombre de Prueba Extendido':'Alex Prueba'}
      subjectId={subjectId} homeClient={client} onCreate={()=>act('create')} onJoin={()=>act('join')}
      onClassrooms={()=>act('classrooms')} onAgenda={()=>act('agenda')} onAction={act}/></main>
    <output data-qa-action aria-label="Última acción sintética">{action}</output>
    <output data-qa-reads hidden>{reads}</output>
  </div>;
}
