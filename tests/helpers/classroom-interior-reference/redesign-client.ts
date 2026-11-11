/** Browser-only in-memory adapter. No provider, database, files or production transport. */
import { classroomClient, roomFor, activity, id, material, grading } from '../platform-polish/classroom-data';
import type { ActivityDetail } from '../../../src/core/contracts/activities.ts';
import type { ClassroomClient } from '../../../src/core/contracts/academic-client.ts';
import type { InvitationBatchReceipt } from '../../../src/core/contracts/classrooms.ts';
import type { WallPost } from '../../../src/core/contracts/communication.ts';

export function redesignClient(): ClassroomClient {
  const base = classroomClient('teacher'), room = structuredClone(roomFor('teacher'));
  const drafts = new Map<string, ActivityDetail>();
  const batches = new Map<string, InvitationBatchReceipt>();
  const correction = grading();
  const posts: WallPost[] = [{id:'11111111-1111-4111-8111-111111111112',authorName:'Alex Sintético',initials:'AS',title:'Una semana para observar',body:'Traigan sus preguntas sobre la célula. Vamos a trabajar juntos con ejemplos cotidianos.',createdAt:'2026-11-11T12:00:00Z',editedAt:null,removedAt:null,canEdit:true,canRemove:true,type:'NOTICE',replies:[],replyCount:0,repliesNextCursor:null,repliesPreviousCursor:null}];
  correction.attempt.practicalResponse = 'La membrana regula el intercambio de sustancias. El núcleo contiene la información genética y las mitocondrias transforman nutrientes en energía.';
  const writes: { path: string; action: string }[] = [];
  let sequence = 0;
  const revision = () => { room.revision = String(Number(room.revision) + 1); return room.revision; };
  const call: ClassroomClient['call'] = async (path, method, body, signal) => {
    if (signal?.aborted) throw new Error('Aborted');
    const operation = (body as { operation?: Record<string, unknown> } | undefined)?.operation;
    if (path.split('?')[0] === `/${id}/wall`) {
      if (method === 'POST' && operation) {
        const content = {id:crypto.randomUUID(),authorName:'Alex Sintético',initials:'AS',body:String(operation.body??''),createdAt:new Date().toISOString(),editedAt:null,removedAt:null,canEdit:true,canRemove:true};
        if(operation.action==='publish') posts.unshift({...content,title:String(operation.title??''),type:'NOTICE',replies:[],replyCount:0,repliesNextCursor:null,repliesPreviousCursor:null});
        else if(operation.action==='reply') { const post=posts.find(item=>item.id===operation.postId)!;post.replies.push(content);post.replyCount++; }
        else if(operation.action==='editPost') Object.assign(posts.find(item=>item.id===operation.id)!,{body:operation.body,title:operation.title,editedAt:new Date().toISOString()});
        else if(operation.action==='removePost') Object.assign(posts.find(item=>item.id===operation.id)!,{body:null,removedAt:new Date().toISOString()});
        else throw new Error('Operación sintética de muro no implementada');
        return {revision:revision()} as never;
      }
      const filter=new URLSearchParams(path.split('?')[1]).get('type');
      return {revision:room.revision,posts:structuredClone(posts.filter(post=>!filter||post.type===filter)),nextCursor:null} as never;
    }
    if (path.endsWith('/history-submissions')) return base.call(path.replace(/\/history-submissions$/, '/attempts'));
    if (path.endsWith('/grading-ai') && (!method || method === 'GET')) return null as never;
    if (path.endsWith('/publish-grade') && method === 'POST') {
      correction.grade.isPublished = true; correction.grade.publishedAt = new Date().toISOString(); correction.canSave = false;
      correction.revision = String(Number(correction.revision) + 1);
      return structuredClone(correction) as never;
    }
    if (path.endsWith('/grading')) {
      if (method === 'POST') {
        const payload = body as { overallGrade: string | null; overallFeedback: string | null };
        correction.grade.finalGrade = payload.overallGrade; correction.grade.overallFeedback = payload.overallFeedback;
        correction.revision = String(Number(correction.revision) + 1);
      }
      return structuredClone(correction) as never;
    }
    const batchPath = `/${id}/invitations/batch`;
    if (path === batchPath && method === 'POST') {
      const payload = body as {requestId:string;emails:string[]};
      if (!batches.has(payload.requestId)) batches.set(payload.requestId,{requestId:payload.requestId,recipients:payload.emails.map(email=>({email,status:'pending'}))});
      return structuredClone(batches.get(payload.requestId)) as never;
    }
    if (path.startsWith(batchPath + '/')) {
      const [requestId,index] = path.slice(batchPath.length+1).split('/');
      const receipt = batches.get(requestId);
      if (!receipt) throw Object.assign(new Error('Lote sintético no disponible'),{status:404});
      if (index !== undefined && method === 'POST') {
        await new Promise(resolve=>setTimeout(resolve,250));
        const item = receipt.recipients[Number(index)];
        if (item.status === 'pending') receipt.recipients[Number(index)] = item.email.startsWith('fail')
          ? {...item,status:'failed',code:'CONFLICT'} : {...item,status:'created',invitationId:`synthetic-${index}`};
        return structuredClone(receipt.recipients[Number(index)]) as never;
      }
      return structuredClone(receipt) as never;
    }
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
