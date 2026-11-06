import type {ClassroomCore} from './core.ts';
import {advanceClassroomRevision,revision} from './revision.ts';
import {fail,object,uuid} from './policy.ts';

/** Teaching progress keeps the classroom lock, teacher authorization and optimistic revision. */
export class PlanService {
 private readonly run:ClassroomCore['run'];
 private readonly classroom:ClassroomCore['classroom'];
 constructor(context:Pick<ClassroomCore,'run'|'classroom'>){this.run=context.run.bind(context);this.classroom=context.classroom.bind(context);}
 changePlan(request:unknown,classroomId:string,input:unknown){
  const body=object(input,['revision','operation']),expected=revision(body.revision);
  const op=object(body.operation,['action','id','status']);
  return this.run(request,true,async(tx,actor)=>{
   const classroom=await this.classroom(tx,actor,classroomId,true,true);
   if(classroom.revision.toString()!==expected)return fail('CONFLICT');
   if(op.action!=='setTopicState'||!uuid(op.id)||!['PENDING','NEXT','TAUGHT'].includes(op.status))return fail('INVALID_INPUT');
   const [topic]=await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE',op.id,classroomId);
   if(!topic)return fail('FORBIDDEN');
   if(op.status==='NEXT')await tx.query("UPDATE topics SET status='PENDING',updated_at=clock_timestamp() WHERE classroom_id=$1::uuid AND status='NEXT' AND id<>$2::uuid RETURNING id",classroomId,op.id);
   await tx.query('UPDATE topics SET status=$2::"TopicStatus",updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id',op.id,op.status);
   return advanceClassroomRevision(tx,classroomId,classroom.revision);
  });
 }
}
