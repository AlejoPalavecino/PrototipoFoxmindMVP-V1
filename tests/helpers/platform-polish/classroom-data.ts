import type { Detail } from '../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../src/core/contracts/materials.ts';
import type { ActivityDetail } from '../../../src/core/contracts/activities.ts';
import type { ClassroomClient } from '../../../src/core/contracts/academic-client.ts';
import type { GradingData } from '../../../src/core/domain/index.ts';
import type { ProgressData } from '../../../src/core/contracts/grading.ts';
import type { AttemptSessionData } from '../../../src/core/contracts/participation.ts';
export const id = '11111111-1111-4111-8111-111111111111';
export const stamp = '2026-10-28T12:00:00Z';
export function roomFor(mode: string): Detail {
  return {id,revision:'1',name:'Ciencias Naturales',subject:'Biología',division:'3º A',academicYear:2026,
    timezone:'America/Argentina/Buenos_Aires',coverKey:'biology',archived:mode==='archived',role:mode==='student'?'student':'teacher',teacher:'Alex Prueba',plans:[],
    units:mode==='empty'?[]:[{id:'unit-1',name:'Los seres vivos',topics:[{id:'topic-1',name:'La célula y sus funciones',status:'NEXT'},{id:'topic-2',name:'Organización de los seres vivos',status:'PENDING'}]},
      {id:'unit-2',name:'Ecosistemas y biodiversidad',topics:[{id:'topic-3',name:'Relaciones entre especies',status:'TAUGHT'}]}]};
}
export const material: Material = {id:'material-1',title:'Guía de estudio: la célula y sus funciones',fileId:id,fileName:'guia-celula.pdf',extension:'pdf',sizeBytes:'1250000',unitId:'unit-1',topicId:'topic-1',ready:true,previewable:true,linked:true,deleted:false,deletionPending:false};
export const activity: ActivityDetail = {id, title:'La célula y sus funciones', type:'ASSIGNMENT',unitId:'unit-1',topicId:'topic-1',topicIds:['topic-1'],
  status:'PUBLISHED',publishedAt:stamp,deadlineAt:'2026-11-06T21:00:00Z',allowLate:true,locked:false,zone:'America/Argentina/Buenos_Aires',
  instructions:'Observá el material de la unidad. Explicá las funciones de los orgánulos y relacioná su estructura con la vida cotidiana.',attachmentRequired:true,questions:[],instructionFiles:[],materials:[{id:material.id,title:material.title,fileId:id,extension:'pdf'}]};
export const draft = {id:'draft-fixture',revision:'1',publishedClassroomId:null,payload:{name:'Ciencias Naturales',subject:'Biología',division:'3º A',academicYear:2026,timezone:'America/Argentina/Buenos_Aires',coverKey:'biology',units:roomFor('teacher').units}};
export function sessionFor(mode:string): AttemptSessionData {
  const questionnaire=mode.startsWith('questionnaire')||mode==='evaluation';
  const submitted=mode==='submitted',readonly=mode==='readonly';
  return {activity:{...activity,type:questionnaire?(mode==='evaluation'?'EVALUATION':'QUESTIONNAIRE'):'ASSIGNMENT',questions:questionnaire?[
    {id:'q1',type:'DEVELOPMENT',prompt:'Explicá cómo se relacionan la membrana y el intercambio de sustancias.',points:'5',options:[]},
    {id:'q2',type:'SINGLE_CHOICE',prompt:'¿Qué orgánulo participa en la producción de energía?',points:'5',scoringRule:'EXACT',options:[{id:'o1',text:'Mitocondria'},{id:'o2',text:'Pared celular'}]}]:[]},
    expected:true,eligibilityReason:null,archived:false,serverTime:stamp,reception:{deadlineAt:activity.deadlineAt,open:true,late:false},canStart:false,canTransfer:!submitted,
    attempt:{id,number:1,status:submitted?'SUBMITTED':'DRAFT',openedAt:stamp,submittedAt:submitted?stamp:null,appliedDeadlineAt:activity.deadlineAt,submittedLate:false,epoch:'1',revision:'1',answers:[],attachments:[]},
    ...(!submitted&&!readonly?{editor:{token:'synthetic-fixture-only',epoch:'1'}}:{})};
}
export function grading(): GradingData {
  return {revision:'1',archived:false,canSave:true,activity:{...activity,questions:[]},attempt:{id,number:1,submittedAt:stamp,submittedLate:false,firstName:'Estudiante',lastName:'Sintético',attachments:[]},
    grade:{id, isPublished:false,publishedAt:null,finalGrade:'8',overallFeedback:'Relacionaste correctamente la estructura con su función. Revisá los ejemplos del último apartado.',pending:false}};
}
function progress(mode:string): ProgressData {
  const completion = {expected:3,delivered:2,pending:1,onTime:2,late:0,pendingResubmissions:0,percentage:'66.67',emptyLabel:null};
  const common = {revision:'1',archived:mode==='archived',plan:{taught:1,total:3,percentage:'33.33'},completion};
  if(mode==='student') return {...common,scope:'self',studentId:id,firstName:'Estudiante',lastName:'Sintético',currentMember:true,performance:{graded:2,average:'8.5'},activities:[]};
  return {...common,scope:'classroom',studentCount:2,students:[{studentId:id,firstName:'Estudiante',lastName:'Sintético',currentMember:true,completion,performance:{graded:2,average:'8.5'},activities:[]}],performance:{gradedStudents:1,average:'8.5'}};
}
export function classroomClient(mode:string): ClassroomClient {
  const room=roomFor(mode);
  let draftState=structuredClone(draft);
  const call: ClassroomClient['call'] = async <T,>(path:string, method?:string, body?:unknown):Promise<T> => {
    if(mode==='loading') await new Promise(()=>{});
    if(mode==='error') throw new Error('Error sintético de lectura. Reintentá sin perder cambios.');
    if(method&&method!=='GET'&&!path.startsWith('/drafts/')) throw new Error('Fixture visual: esta operación no guarda ni publica cambios.');
    let data:unknown;
    if(path==='' ) data={teach:mode==='empty'?[]:[room,{...room,id:'room-math',name:'Matemática',subject:'Matemática',coverKey:'math'}],study:mode==='empty'?[]:[{...room,id:'room-literature',name:'Lengua y Literatura',subject:'Literatura',coverKey:'literature',role:'student'}]};
    else if(path===`/${id}`) data=room;
    else if(path==='/room-math') data={...room,id:'room-math',name:'Matemática',subject:'Matemática',coverKey:'math'};
    else if(path==='/room-literature') data={...room,id:'room-literature',name:'Lengua y Literatura',subject:'Literatura',coverKey:'literature',role:'student'};
    else if(path==='/drafts') data=[];
    else if(path.startsWith('/drafts/')) {
      if(path.endsWith('/publish')) throw new Error('La fixture no publica aulas.');
      if(method&&method!=='GET') draftState={...draftState,revision:String(Number(draftState.revision)+1),payload:(body as {payload?:typeof draft.payload})?.payload??draftState.payload};
      data=draftState;
    }
    else if(path.endsWith('/library')) data=mode==='empty'?[]:[material];
    else if(path.endsWith('/activities')) data={revision:'1',activities:mode==='empty'?[]:mode==='student'||path.startsWith('/room-literature/')?[activity]:[activity,{...activity,id:'questionnaire',type:'QUESTIONNAIRE',title:'Autoevaluación de la unidad',status:'DRAFT'}]};
    else if(path.endsWith('/preview')) data={revision:'1',preview:true,activity:path.includes('/questionnaire/')?{...sessionFor('questionnaire').activity,id:'questionnaire',status:'DRAFT'}:activity};
    else if(path.endsWith('/session')) data=sessionFor(mode);
    else if(path.includes('/activities/') && (path.endsWith('/history') || path.endsWith('/history-submissions'))) data={activity,attempts:[]};
    else if(path.endsWith('/activity-generations/sources')) data={revision:'1',sources:[{sourceId:material.id,fileId:id,title:material.title,kind:'material',extension:'pdf',sizeBytes:1250000,unitId:'unit-1',topicId:'topic-1',available:true,reason:null}]};
    else if(path.endsWith('/activity-generations')) {
      if(method&&method!=='GET') throw new Error('Generación sintética: no se contacta a ningún proveedor.');
      data={jobs:[]};
    }
    else if(path.endsWith('/result')) data=mode==='pending'?{status:'pending',attemptId:id}:{status:'published',activity:{id,title:activity.title,type:activity.type},attempt:{id,number:1,submittedAt:stamp},grade:{id,finalGrade:'8',publishedAt:stamp,overallFeedback:'Buen trabajo. Revisá el ejemplo final para profundizar la explicación.',isEffective:true},questions:[],attachments:[]};
    else if(path.endsWith('/grading')) data=grading();
    else if(path.endsWith('/progress')) data=progress(path.startsWith('/room-literature/')?'student':mode);
    else if(path.split('?')[0].endsWith('/wall')) data={revision:'1',nextCursor:null,posts:mode==='empty'?[]:[{id,authorName:'Alex Prueba',initials:'AP',body:'Esta semana trabajamos con la guía de la célula. Dejá tus consultas en este espacio para que podamos aprender juntos.',createdAt:stamp,editedAt:null,removedAt:null,canEdit:mode!=='student'&&!path.startsWith('/room-literature/'),canRemove:mode!=='student'&&!path.startsWith('/room-literature/'),type:'NOTICE',replies:[],replyCount:0,repliesNextCursor:null,repliesPreviousCursor:null}]};
    else if(path.endsWith('/members')) data=[{studentId:id,enrollmentId:'enrollment-1',firstName:'Estudiante',lastName:'Sintético',periods:[{joinedAt:stamp,endedAt:null,endReason:null}]}];
    else if(path.endsWith('/attempts')) data={revision:'1',activity,attempts:[{id,number:1,status:'SUBMITTED',openedAt:stamp,submittedAt:stamp,appliedDeadlineAt:activity.deadlineAt,individualDeadlineAt:null,submittedLate:false,studentId:id,firstName:'Estudiante',lastName:'Sintético',currentMember:true,gradePublished:false}]};
    else if(['/notifications','/invitations'].includes(path)||path.endsWith('/history')||path.endsWith('/invitations')) data=[];
    else throw new Error(`Acción fuera de la fixture: ${path}`);
    return structuredClone(data) as T;
  };
  return {call,attempt:async()=>{throw new Error('Fixture visual: no se confirmó ninguna entrega ni guardado.');},upload:async()=>{throw new Error('Carga deshabilitada en fixture');},fileStatus:async()=>({id,name:'guia.pdf',ready:true,upload:'COMPLETE',validation:'APPROVED',scan:'CLEAN',rejectionCode:null}),fileUrl:()=>'/fixture-file'};
}
