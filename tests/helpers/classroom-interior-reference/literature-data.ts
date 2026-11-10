// Synthetic, read-only data for matching the populated classroom references.
import type { ClassroomClient } from '../../../src/core/contracts/academic-client.ts';
import type { Detail, Member } from '../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../src/core/contracts/materials.ts';
import type { ProgressData } from '../../../src/core/contracts/grading.ts';
import type { WallData } from '../../../src/core/domain/index.ts';
import type { ActivitySummary } from '../../../src/core/contracts/activities.ts';
import { classroomClient, id, roomFor, stamp } from './classroom-data';

const room: Detail = { ...roomFor('teacher'), name: 'Literatura - Demo', subject: 'Literatura', division: 'Demo', coverKey: 'literature', teacher: 'FoxMind Demo',
  units: [
    { id: 'unit-1', name: 'Narrativa', topics: [{ id: 'topic-1', name: 'Un cuento en tres momentos', status: 'NEXT' }, { id: 'topic-2', name: 'Narrador y personajes', status: 'TAUGHT' }] },
    { id: 'unit-2', name: 'Poesía', topics: [{ id: 'topic-3', name: 'El lenguaje poético', status: 'PENDING' }] },
    { id: 'unit-3', name: 'Comprensión lectora', topics: [{ id: 'topic-4', name: 'Lectura y reflexión', status: 'PENDING' }] },
  ] };
const people: Member[] = ['Lucía Castro', 'Mateo Torres', 'Sofía Villalba', 'Benjamín Rojas', 'Emma Martínez', 'Thiago Herrera'].map((name, i) => {
  const [firstName, ...surname] = name.split(' ');
  return { studentId: `student-${i}`, enrollmentId: `enrollment-${i}`, firstName, lastName: surname.join(' '),
    periods: [{ joinedAt: `2026-09-${String(12+i).padStart(2,'0')}T12:00:00Z`, endedAt: null, endReason: null }] };
});
const history: Member[] = [{ studentId:'former-1', enrollmentId:'former-enrollment-1', firstName:'María', lastName:'González', periods:[{joinedAt:stamp, endedAt:'2026-11-05T21:00:00Z', endReason:'LEFT'}] },
  { studentId:'former-2', enrollmentId:'former-enrollment-2', firstName:'Tomás', lastName:'Rivas', periods:[{joinedAt:stamp, endedAt:'2026-11-06T21:00:00Z', endReason:'REMOVED'}] }];
const materialNames = ['Guía de Literatura', 'Lectura: Cuentos breves', 'Presentación de narrativa', 'Lecturas compartidas', 'Análisis de un cuento', 'Autores latinoamericanos'];
const materials: Material[] = materialNames.map((title, i) => ({ id:`material-${i}`, title, fileId:`file-${i}`, fileName:`material-${i}.pdf`, extension:'pdf', sizeBytes:'1200000',
  unitId:'unit-1', topicId:i === 0 ? 'topic-1' : 'topic-2', ready:true, previewable:true, linked:true, deleted:false, deletionPending:false }));
const activities: ActivitySummary[] = [
  { id:'activity-1', type:'ASSIGNMENT', title:'Un cuento en tres momentos', unitId:'unit-1', topicId:'topic-1', topicIds:['topic-1'], status:'PUBLISHED', publishedAt:stamp, deadlineAt:'2026-11-05T21:00:00Z', allowLate:true, locked:false, zone:room.timezone },
  { id:'activity-2', type:'ASSIGNMENT', title:'Personajes que dejan huella', unitId:'unit-1', topicId:'topic-2', topicIds:['topic-2'], status:'DRAFT', publishedAt:null, deadlineAt:null, allowLate:true, locked:false, zone:room.timezone },
  { id:'activity-3', type:'EVALUATION', title:'Evaluación: Comprensión lectora', unitId:'unit-3', topicId:'topic-4', topicIds:['topic-4'], status:'DRAFT', publishedAt:null, deadlineAt:null, allowLate:true, locked:false, zone:room.timezone },
];
const wall: WallData = { revision:'1', posts: [
  { id:'post-1', type:'NOTICE', authorName:'Docente Demo', initials:'FD', body:'¡Bienvenidos al aula de Literatura! En este espacio pueden compartir sus ideas y hacer preguntas sobre las lecturas.', createdAt:stamp, editedAt:null, removedAt:null, canEdit:true, canRemove:true, replies:[] },
  { id:'post-2', type:'QUERY', authorName:'Lucía Martínez', initials:'LM', body:'Me encantó el cuento que leímos en clase. ¿Qué opinan del final?', createdAt:'2026-10-29T12:00:00Z', editedAt:null, removedAt:null, canEdit:false, canRemove:true, replies:[] },
] };
const completion = {expected:1,delivered:1,pending:0,onTime:1,late:0,pendingResubmissions:0,percentage:'100',emptyLabel:null};
const progress: ProgressData = { revision:'1', archived:false, scope:'classroom', plan:{taught:1,total:4,percentage:'25'}, completion, studentCount:people.length,
  performance:{gradedStudents:1,average:'8.5'}, students:people.map((person,i)=>({studentId:person.studentId!,firstName:person.firstName,lastName:person.lastName,currentMember:true,completion:i===0?completion:{...completion,delivered:0,pending:1,onTime:0,percentage:'0'},performance:{graded:i===0?1:0,average:i===0?'8.5':null},activities:[]})) };

export function literatureClient(): ClassroomClient {
  const base = classroomClient('teacher');
  const call: ClassroomClient['call'] = async <T,>(path:string, method?:string, body?:unknown, signal?:AbortSignal):Promise<T> => {
    if(method && method !== 'GET') throw new Error('Fixture visual: esta operación no guarda ni publica cambios.');
    let data: unknown;
    if(path === `/${id}`) data = room;
    else if(path === `/${id}/members`) data = people;
    else if(path === `/${id}/history`) data = history;
    else if(path === `/${id}/invitations`) data = [{id:'invitation-1', name:room.name, teacher:room.teacher, recipient:'agustina@example.com', issuedAt:stamp, expiresAt:'2099-01-01T00:00:00Z'}, {id:'invitation-2', name:room.name, teacher:room.teacher, recipient:'facundo@example.com', issuedAt:stamp, expiresAt:'2099-01-01T00:00:00Z'}];
    else if(path === `/${id}/library`) data = materials;
    else if(path === `/${id}/activities`) data = {revision:'1', activities};
    else if(path === `/${id}/wall`) data = wall;
    else if(path === `/${id}/progress`) data = progress;
    else return base.call<T>(path, method, body, signal);
    return structuredClone(data) as T;
  };
  return {...base, call};
}
