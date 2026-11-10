// Explicitly invoked isolated QA harness. Never imported by the production application.
import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd(), dest = path.join(root, '.test-artifacts/home-polish');
fs.mkdirSync(path.join(dest, 'apps/web/pages'), { recursive: true });
for (const rel of ['node_modules', 'src', 'apps/shared-ui', 'apps/web/public', 'apps/web/styles', 'apps/web/src']) {
  const target = path.join(dest, rel);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (!fs.existsSync(target)) fs.symlinkSync(path.join(root, rel), target, 'junction');
}
fs.copyFileSync(path.join(root, 'apps/web/pages/_app.tsx'), path.join(dest, 'apps/web/pages/_app.tsx'));
fs.writeFileSync(path.join(dest, 'apps/web/package.json'), JSON.stringify({ private: true, type: 'module' }));
fs.writeFileSync(path.join(dest, 'apps/web/next.config.mjs'), 'export default {experimental:{externalDir:true},devIndicators:false};');
fs.writeFileSync(path.join(dest, 'apps/web/tsconfig.json'), JSON.stringify({compilerOptions:{target:'ES2023',lib:['dom','dom.iterable','esnext'],skipLibCheck:true,strict:true,noEmit:true,module:'esnext',esModuleInterop:true,moduleResolution:'bundler',allowImportingTsExtensions:true,jsx:'react-jsx'},include:['pages/**/*.tsx']}));
fs.writeFileSync(path.join(dest, 'apps/web/pages/index.tsx'), `
import {useMemo,useState} from 'react';
import {useRouter} from 'next/router';
import { Home } from '../src/features/home/index.ts';
import {AppNavbar} from '../../shared-ui/AppNavbar';
import type {HomeResponse,HomeRoom,HomeItem} from '../../../src/core/domain/index';
import type { HomeClient } from '../src/features/home/index.ts';
const id='11111111-1111-4111-8111-111111111111';
const empty=()=>({status:'ready' as const,items:[],totalItems:null,nextCursor:null});
function fixture(mode:string):HomeResponse {
 const role=mode.replace('-empty','');
 const participation=['study','teach','mixed'].includes(role)?role as 'study'|'teach'|'mixed':'none';
 const room:HomeRoom={id,name:'Ciencias Naturales',subject:'Biología',division:'3º A',timeZone:'UTC',coverKey:'explore',archived:mode==='archived',role:mode==='study'?'student':'teacher'};
 const base:HomeItem&{classroom:HomeRoom}={id,title:'Ciencias Naturales',classroom:room,target:{kind:'classroom',classroomId:id,section:'plan'}};
 const modules:HomeResponse['modules']={pending:{status:'not-applicable'},review:{status:'not-applicable'},feedback:{status:'not-applicable'},agenda:empty(),queries:empty(),materials:empty(),classrooms:empty()};
 if(participation!=='none') {
  modules.classrooms={...empty(),items:[base],totalItems:1};
  modules.queries={...empty(),items:[{...base,id:'query',title:'¿Cómo se organiza una célula?',updatedAt:'2026-10-25T12:00:00Z',target:{kind:'wall',classroomId:id,postId:id}}]};
  modules.materials={...empty(),items:[{...base,id:'material',title:'Guía de estudio: seres vivos',extension:'pdf',publishedAt:'2026-10-25T12:00:00Z',target:{kind:'material',classroomId:id,materialId:id}}],nextCursor:'fixture-next'};
  modules.agenda={...empty(),items:[{...base,id:'event',title:'Repasar contenidos',source:'PRIVATE_EVENT',allDay:true,startAt:null,date:'2026-10-26',timeZone:'UTC',classroom:null,target:{kind:'private-event',eventId:id,occurrenceId:id,date:'2026-10-26'}}]};
  if(mode!=='teach') {modules.pending={...empty(),items:[{...base,id:'pending',title:'La célula y sus funciones',activityType:'ASSIGNMENT',state:'first-submission',attemptId:null,deadlineAt:null,reception:'open',late:false,target:{kind:'activity',classroomId:id,activityId:id}}]};modules.feedback=empty();}
  if(mode!=='teach') modules.feedback={...empty(),items:[{...base,id:'feedback',title:'Ecosistemas: devolución publicada',activityType:'ASSIGNMENT',attemptNumber:1,finalGrade:'8',publishedAt:'2026-10-25T12:00:00Z',changedAt:'2026-10-25T12:00:00Z',availability:'available',target:{kind:'grade',classroomId:id,activityId:id,attemptId:id,gradeId:id}}]};
  if(mode!=='study') modules.review={...empty(),items:[{...base,id:'review',title:'Trabajo práctico: Ecosistemas',activityType:'ASSIGNMENT',needsReview:4,readyToPublish:2,oldestSubmittedAt:'2026-10-25T12:00:00Z',target:{kind:'submissions',classroomId:id,activityId:id,filter:'unpublished'}}],totals:{attempts:6,needsReview:4,readyToPublish:2}};
 }
 if(mode==='archived') modules.classrooms={...empty(),items:[base],totalItems:1};
 if(mode.endsWith('-empty')) for(const name of Object.keys(modules) as (keyof typeof modules)[]) modules[name]=empty();
 if(mode==='teach-empty') {modules.pending={status:'not-applicable'};modules.feedback={status:'not-applicable'};}
 if(mode==='study-empty') modules.review={status:'not-applicable'};
 if(mode==='error') modules.materials={status:'error',code:'SERVICE_UNAVAILABLE',retryable:true};
 return {version:1,subjectId:id,generatedAt:'2026-10-25T12:00:00Z',timeZone:'America/Argentina/Buenos_Aires',participation,memberships:{teach:role==='teach'||role==='mixed'?1:0,study:role==='study'||role==='mixed'?1:0,archived:mode==='archived'?1:0},setup:{drafts:mode==='archived'?1:0,invitations:0},modules};
}
export default function QA() {
 const router=useRouter(),requestedMode=String(router.query.mode??'none'),[action,setAction]=useState('');
 const accountRole=router.query.role==='student'||requestedMode.startsWith('study')?'student':'teacher';
 const mode=requestedMode==='mixed'?(accountRole==='teacher'?'teach':'study'):requestedMode;
 const client=useMemo<HomeClient>(()=>({read:async()=>fixture(mode),page:async(q)=>{const rooms=fixture('teach').modules.classrooms;const classroom=rooms.status==='ready'?rooms.items[0].classroom:null;return {subjectId:id,generatedAt:'2026-10-25T12:00:00Z',module:q.module,page:q.cursor&&classroom?{...empty(),items:[{id:'next',title:'Segundo recurso',classroom,extension:'pdf',publishedAt:'2026-10-25T12:00:00Z',target:{kind:'material',classroomId:id,materialId:id}}]}:empty()};}}),[mode,accountRole]);
 const act=(value:any)=>setAction(typeof value==='string'?value:JSON.stringify(value));
 return <div className="p5-app fm3-classrooms entry-home"><a className="skip-link" href="#classroom-main">Saltar al contenido</a><AppNavbar logoHref="/mis-aulas" displayName="Alex Prueba" links={[{href:'/inicio',label:'Inicio',current:true},{href:'/mis-aulas',label:'Mis aulas'},{href:'/agenda',label:'Agenda'}]} onNavigate={act}/><main id="classroom-main" className="p5-main"><Home key={mode} accountRole={accountRole} displayName="Alex Prueba" subjectId={id} homeClient={client} onCreate={()=>act('create')} onJoin={()=>act('join')} onClassrooms={()=>act('classrooms')} onAgenda={()=>act('agenda')} onAction={act}/></main><output data-qa-action>{action}</output></div>;
}
`);
console.log(dest);
