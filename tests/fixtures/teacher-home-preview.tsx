import React from 'react';
import {createRoot} from 'react-dom/client';
import {Home} from '../../apps/web/src/features/home/dashboard/Home';
import {AppNavbar} from '../../apps/shared-ui/AppNavbar';
import '../../apps/shared-ui/design-tokens.css';
import '../../apps/web/styles/globals.css';
import '../../apps/web/src/application/shell/styles/academic.css';
import '../../apps/web/src/application/shell/styles/folders.css';
import '../../apps/web/src/application/shell/styles/foxmind-3d.css';
import '../../apps/web/src/application/shell/styles/workspace.css';

const names=['pending','review','feedback','agenda','queries','materials','classrooms','drafts','submitted'];
const page=(items:any[]=[],nextCursor:string|null=null)=>({status:'ready',items,nextCursor,totalItems:items.length});
const rooms=['Ciencias naturales','Matemática','Literatura','Historia','Biología','Arte y expresión'].map((name,i)=>({
  id:'room-'+i,title:name,classroom:{id:'room-'+i,name,division:i%2?'2° B':'1° A',subject:name,role:'teacher',archived:false,timeZone:'America/Argentina/Buenos_Aires',coverKey:['science','math','literature','society','biology','creative'][i]},
  target:{kind:'classroom',classroomId:'room-'+i,section:'plan'},planProgress:{taught:i+2,total:12},
  nextTopic:{unitId:'unit-'+i,unitName:'Unidad '+(i+1),topicId:'topic-'+i,topicName:['Los ecosistemas y sus relaciones','Fracciones equivalentes','La narración fantástica','Transformaciones sociales','La célula y sus funciones','El color y la composición'][i]}
}));
const reviews=Array.from({length:7},(_,i)=>({id:'review-'+i,title:'Exploramos el ecosistema',studentName:['Ana Prueba','Bruno Demo','Clara Prueba','Diego Demo','Elena Prueba','Fabián Demo','Gabriela Prueba'][i],classroom:rooms[i%2].classroom,
  activityType:'ASSIGNMENT',needsReview:1,readyToPublish:0,oldestSubmittedAt:`2026-11-${String(4+i).padStart(2,'0')}T12:00:00Z`,
  target:{kind:'submissions',classroomId:rooms[i%2].id,activityId:'activity',attemptId:'attempt-'+i,filter:'unpublished'}}));
const queries=Array.from({length:7},(_,i)=>({id:'query-'+i,title:['Consulta sobre la actividad','Material para repasar','Duda sobre el próximo tema'][i%3]+' '+(i+1),classroom:rooms[i%2].classroom,updatedAt:`2026-11-${String(4+i).padStart(2,'0')}T12:00:00Z`,target:{kind:'wall',classroomId:rooms[i%2].id,postId:'post-'+i}}));
const personal=['Preparar materiales de clase','Reunión con el equipo docente'].map((title,i)=>({id:'event-'+i,title,source:'PRIVATE_EVENT',startAt:`2026-11-1${1+i}T18:00:00Z`,date:`2026-11-1${1+i}`,timeZone:'America/Argentina/Buenos_Aires',allDay:false,classroom:null,target:{kind:'private-event',eventId:'event-'+i,occurrenceId:'occ-'+i,date:`2026-11-1${1+i}`}}));
const deadline={id:'deadline',title:'Entrega: Exploramos el ecosistema',source:'ACADEMIC_DEADLINE',date:'2026-11-13',startAt:'2026-11-13T21:00:00Z',timeZone:'America/Argentina/Buenos_Aires',allDay:false,classroom:rooms[0].classroom,target:{kind:'activity',classroomId:rooms[0].id,activityId:'activity'}};
const params=new URLSearchParams(location.search),scenario=params.get('scenario'),student=params.get('role')==='student';
const data:any={version:1,subjectId:'synthetic-teacher',generatedAt:'2026-11-11T12:00:00Z',timeZone:'America/Argentina/Buenos_Aires',participation:student?'study':'teach',memberships:{teach:6,study:0,archived:0},setup:{drafts:0,invitations:0},modules:Object.fromEntries(names.map(name=>[name,page()]))};
const dataset:any={review:reviews,queries,classrooms:rooms};
function getPage(module:string,order?:string,cursor?:string|null){
  let items=[...(dataset[module]??[])];
  if((order??(module==='queries'?'desc':'asc'))==='desc')items.reverse();
  const offset=Number(cursor??0),limit=module==='classrooms'?2:5;
  return {...page(items.slice(offset,offset+limit),offset+limit<items.length?String(offset+limit):null),totalItems:items.length};
}
data.modules.review=getPage('review');data.modules.queries=getPage('queries');data.modules.classrooms=getPage('classrooms');
data.modules.agenda={...page([...personal,deadline]),preview:{personal,deadline}};
if(scenario==='empty')for(const name of names)data.modules[name]=page();
if(scenario==='single')data.modules.classrooms=page([rooms[0]]);
if(scenario==='error')for(const name of ['classrooms','review','queries','agenda'])data.modules[name]={status:'error',code:'SERVICE_UNAVAILABLE',retryable:true};
const requests:any[]=[];Object.assign(window,{homePreview:{requests,targets:[]}});
const client={
  read:async()=>structuredClone(data),
  page:async(query:any)=>{requests.push(query);return {subjectId:data.subjectId,generatedAt:data.generatedAt,module:query.module,page:query.module==='agenda'?data.modules.agenda:getPage(query.module,query.order,query.cursor)};}
};
function action(target:any){(window as any).homePreview.targets.push(target);document.querySelector('#preview-target')!.textContent=JSON.stringify(target);}
createRoot(document.getElementById('root')!).render(<React.StrictMode><div className="fm3d-theme">
  <AppNavbar homeNavigation logoHref="/inicio" currentPath="/inicio" displayName="Lucía Demo" links={[{href:'/inicio',label:'Inicio',current:true},{href:'/mis-aulas',label:'Mis aulas'},{href:'/agenda',label:'Agenda'},{href:'/foxy',label:'Foxy AI'}]}/>
  <main className="fm3-classrooms p5-app entry-wizard-reference"><div id="classroom-main" style={{padding:'28px'}}><Home accountRole={student?'student':'teacher'} displayName="Lucía Demo" subjectId={data.subjectId} homeClient={client} onCreate={()=>action({kind:'create-classroom'})} onJoin={()=>{}} onClassrooms={()=>action({kind:'classrooms'})} onAgenda={()=>action({kind:'agenda'})} onAction={action}/></div></main>
  <output id="preview-target" hidden/>
</div></React.StrictMode>);
