/** Browser-only in-memory adapter. No provider, database, files or production transport. */
import { classroomClient, roomFor, activity, id, material } from '../platform-polish/classroom-data';
import type { ActivityDetail, ClassroomClient } from '../../../apps/classrooms-ui/api';

export function redesignClient(): ClassroomClient {
  const base = classroomClient('teacher'), room = structuredClone(roomFor('teacher'));
  const drafts = new Map<string, ActivityDetail>();
  const writes: { path: string; action: string }[] = [];
  let sequence = 0;
  const revision = () => { room.revision = String(Number(room.revision) + 1); return room.revision; };
  const call: ClassroomClient['call'] = async (path, method, body, signal) => {
    if (signal?.aborted) throw new Error('Aborted');
    const operation = (body as { operation?: Record<string, unknown> } | undefined)?.operation;
    if (path === `/${id}`) return structuredClone(room) as never;
    if (path === `/${id}/plan` && method === 'POST' && operation?.action === 'setTopicState') {
      if ((body as { revision: string }).revision !== room.revision) throw new Error('Conflicto de revisión sintético');
      const topic = room.units.flatMap(unit => unit.topics).find(item => item.id === operation.id);
      if (!topic) throw new Error('Tema no disponible');
      topic.status = String(operation.status); writes.push({path,action:'setTopicState'}); return {revision:revision()} as never;
    }
    if (path === `/${id}/activities` && method === 'POST' && operation) {
      writes.push({path,action:String(operation.action)});
      if (operation.action === 'create') {
        const createdId = `22222222-2222-4222-8222-${String(++sequence).padStart(12,'0')}`;
        drafts.set(createdId, {...structuredClone(activity), id:createdId, title:'', status:'DRAFT', unitId:null, topicId:null, topicIds:[], instructions:'', questions:[], materials:[], instructionFiles:[], deadlineAt:null, type:operation.type as ActivityDetail['type']});
        return {id:createdId,revision:revision()} as never;
      }
      const draft = drafts.get(String(operation.id));
      if (!draft) throw new Error('Actividad sintética desconocida');
      if (operation.action === 'save') {
        const payload = operation.payload as Record<string, unknown>;
        Object.assign(draft,payload,{topicId:(payload.topicIds as string[])[0]??null,
          materials:(payload.materialIds as string[]).includes(material.id)?[{id:material.id,title:material.title,fileId:material.fileId,extension:material.extension}]:[],instructionFiles:[]});
      } else if (operation.action === 'publish') draft.status='PUBLISHED';
      else throw new Error('Operación sintética no implementada');
      return {revision:revision()} as never;
    }
    if (path === `/${id}/activities` && (!method || method === 'GET')) {
      const list = await base.call<{activities:ActivityDetail[]}>(path);
      return {revision:room.revision,activities:[...list.activities,...structuredClone([...drafts.values()])]} as never;
    }
    if (path.endsWith('/preview')) {
      const draft = drafts.get(path.split('/').at(-2)!);
      if (draft) return {revision:room.revision,activity:structuredClone(draft),preview:true} as never;
    }
    if (path.endsWith('/activities/deadline')) return {zone:room.timezone,local:(body as {local:string}).local,reason:null,choices:[]} as never;
    return base.call(path,method,body,signal);
  };
  if (typeof window !== 'undefined') Object.assign(window,{__classroomRedesignQA:()=>({writes:structuredClone(writes),room:structuredClone(room),drafts:structuredClone([...drafts.values()])})});
  return {...base,call};
}
