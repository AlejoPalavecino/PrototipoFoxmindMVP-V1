import type {HomeResponse,HomeRoom,HomeItem} from '../../../src/core/domain/index';

export const subjectId='11111111-1111-4111-8111-111111111111';
const stamp='2026-10-28T12:00:00Z';
const empty=()=>({status:'ready' as const,items:[],totalItems:null,nextCursor:null});
const unavailable={status:'error',code:'SERVICE_UNAVAILABLE',retryable:true} as const;
const classroom=(index:number,role:'teacher'|'student',archived=false):HomeRoom=>({
  id:`11111111-1111-4111-8111-${String(index+1).padStart(12,'0')}`,
  name:['Ciencias Naturales','Matemática','Literatura y escritura creativa'][index%3],
  subject:['Biología','Matemática','Literatura'][index%3],division:'3º A',timeZone:'UTC',
  coverKey:['biology','math','literature'][index%3],role,archived,
});
const item=(room:HomeRoom):HomeItem&{classroom:HomeRoom}=>({id:room.id,title:room.name,classroom:room,
  target:{kind:'classroom',classroomId:room.id,section:'plan'}});

export function fixture(mode:string):HomeResponse {
  const active=!['none','archived'].includes(mode);
  const participation=!active?'none':mode==='study'?'study':mode==='teach'?'teach':'mixed';
  const rooms=Array.from({length:mode==='many'?5:3},(_,i)=>classroom(i,
    mode==='study'?'student':mode==='teach'?'teacher':i===2?'teacher':'student',mode==='archived'));
  if(mode==='long')rooms[0].name='Ciencias Naturales: exploración de ecosistemas, biodiversidad y las relaciones entre seres vivos';
  const student=item(rooms[0]),teacher=item(rooms[2]);
  const modules:HomeResponse['modules']={pending:{status:'not-applicable'},review:{status:'not-applicable'},
    feedback:{status:'not-applicable'},queries:{status:'not-applicable'},agenda:empty(),materials:empty(),classrooms:empty()};
  if(active||mode==='archived')modules.classrooms={...empty(),items:rooms.map((room,index)=>({...item(room),...(room.role==='teacher' && !room.archived?{planProgress:{taught:index,total:4}}:{})})),totalItems:mode==='many'?9:3,nextCursor:mode==='many'?'next-rooms':null};
  if(active){
    modules.agenda={...empty(),items:[
      {...student,id:'event-1',title:'Entrega de Ciencias Naturales',source:'ACADEMIC_DEADLINE',allDay:false,
        startAt:'2026-10-29T13:30:00Z',date:'2026-10-29',timeZone:'UTC',target:{kind:'activity',classroomId:student.id,activityId:subjectId}},
      {...student,id:'event-2',title:'Repaso para Matemática',source:'PRIVATE_EVENT',allDay:true,startAt:null,
        date:'2026-10-30',timeZone:'UTC',classroom:null,target:{kind:'private-event',eventId:subjectId,occurrenceId:subjectId,date:'2026-10-30'}},
    ]};
    modules.materials={...empty(),items:[{...student,id:'material',title:'Guía de estudio de ecosistemas',extension:'pdf',
      publishedAt:stamp,target:{kind:'material',classroomId:student.id,materialId:subjectId}}],nextCursor:'next-material'};
    if(mode!=='teach'){
      modules.pending={...empty(),totalItems:7,items:[{...student,id:'pending',title:'La célula y sus funciones',
        activityType:'ASSIGNMENT',state:'first-submission',attemptId:null,deadlineAt:'2026-10-29T13:30:00Z',reception:'open',late:false,
        target:{kind:'activity',classroomId:student.id,activityId:subjectId}}]};
      modules.feedback={...empty(),totalItems:2,items:[{...student,id:'feedback',title:'Ecosistemas: devolución publicada',
        activityType:'ASSIGNMENT',attemptNumber:1,finalGrade:'8',publishedAt:stamp,changedAt:stamp,availability:'available',
        target:{kind:'grade',classroomId:student.id,activityId:subjectId,attemptId:subjectId,gradeId:subjectId}}]};
    }
    if(mode!=='study'){
      modules.review={...empty(),totalItems:3,items:[{...teacher,id:'review',title:'Trabajo práctico: Narrativas',
        activityType:'ASSIGNMENT',needsReview:4,readyToPublish:2,oldestSubmittedAt:stamp,
        target:{kind:'submissions',classroomId:teacher.id,activityId:subjectId,filter:'unpublished'}}],
        totals:{attempts:14,needsReview:11,readyToPublish:3}};
      modules.queries={...empty(),items:[{...teacher,id:'query',title:'¿Cómo presentamos las fuentes del trabajo?',updatedAt:stamp,
        target:{kind:'wall',classroomId:teacher.id,postId:subjectId}}]};
    }
  }
  if(mode==='error')for(const name of ['pending','feedback','review','materials'] as const)modules[name]=unavailable;
  if(mode==='unknown'){
    if(modules.pending.status==='ready')modules.pending.totalItems=null;
    if(modules.feedback.status==='ready')modules.feedback.totalItems=null;
    if(modules.review.status==='ready')modules.review.totals=undefined;
  }
  return {version:1,subjectId,generatedAt:stamp,timeZone:'America/Argentina/Buenos_Aires',participation,
    memberships:{teach:active&&mode!=='study'?(mode==='teach'?3:1):0,study:active&&mode!=='teach'?(mode==='study'?3:2):0,archived:mode==='archived'?3:0},
    setup:{drafts:0,invitations:0},modules};
}
