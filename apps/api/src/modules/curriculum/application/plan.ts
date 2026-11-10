import type { ClassroomAccess } from '../../classrooms/public.ts';
import type { TopicProgressRepository } from './ports.ts';
import {revision} from '../../classrooms/public.ts';
import {fail,object,uuid} from '../../classrooms/public.ts';

/** Teaching progress keeps the classroom lock, teacher authorization and optimistic revision. */
export class PlanService {
 private readonly run:ClassroomAccess['run'];
 private readonly classroom:ClassroomAccess['classroom'];
 private readonly advanceRevision:ClassroomAccess['advanceRevision'];
 constructor(context:Pick<ClassroomAccess,'run'|'classroom'|'advanceRevision'>, private readonly topics: TopicProgressRepository){this.run=context.run.bind(context);this.classroom=context.classroom.bind(context);this.advanceRevision=context.advanceRevision.bind(context);}
 changePlan(request:unknown,classroomId:string,input:unknown){
  const body=object(input,['revision','operation']),expected=revision(body.revision);
  const op=object(body.operation,['action','id','status']);
  return this.run(request,true,async(tx,actor)=>{
   const classroom=await this.classroom(tx,actor,classroomId,true,true);
   if(classroom.revision.toString()!==expected)return fail('CONFLICT');
   if(op.action!=='setTopicState'||!uuid(op.id)||!['PENDING','NEXT','TAUGHT'].includes(op.status))return fail('INVALID_INPUT');
   const topic=await this.topics.lock(tx,op.id,classroomId);
   if(!topic)return fail('FORBIDDEN');
   if(op.status==='NEXT')await this.topics.resetNext(tx,classroomId,op.id);
   await this.topics.set(tx,op.id,op.status as 'PENDING'|'NEXT'|'TAUGHT');
   return this.advanceRevision(tx,classroomId,classroom.revision);
  });
 }
}
