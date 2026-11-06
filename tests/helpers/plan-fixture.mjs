import{randomUUID}from'node:crypto';

/** Explicit SQL setup for historical/freshness scenarios; never a production command or HTTP bypass. */
export async function seedPlan(query,classroomId,operation,teacherId){
 const op=operation;
 switch(op.action){
  case'addUnit':await query('INSERT INTO units(id,updated_at,classroom_id,name,position) SELECT $1,now(),$2,$3,COALESCE(max(position)+1,0) FROM units WHERE classroom_id=$2',[randomUUID(),classroomId,op.name]);break;
  case'addTopic':await query('INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position) SELECT $1,now(),$2,$3,$4,COALESCE(max(position)+1,0) FROM topics WHERE unit_id=$3',[randomUUID(),classroomId,op.unitId,op.name]);break;
  case'renameTopic':case'renameUnit':{
   const table=op.action==='renameTopic'?'topics':'units';await query(`UPDATE ${table} SET name=$3,updated_at=now() WHERE id=$1 AND classroom_id=$2`,[op.id,classroomId,op.name]);break;
  }
  case'deleteTopic':case'deleteUnit':{
   const table=op.action==='deleteTopic'?'topics':'units';await query(`DELETE FROM ${table} WHERE id=$1 AND classroom_id=$2`,[op.id,classroomId]);break;
  }
  case'appendVersion':{
   const owner=teacherId??(await query('SELECT teacher_id FROM classrooms WHERE id=$1',[classroomId])).rows[0].teacher_id;
   await query('INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id) SELECT $1,now(),$2,COALESCE(max(version_number),0)+1,$3,$4 FROM study_plan_versions WHERE classroom_id=$2',[randomUUID(),classroomId,op.fileId,owner]);break;
  }
  default:throw Error('Unsupported fixture operation '+op.action);
 }
 const row=(await query('UPDATE classrooms SET revision=revision+1,updated_at=now() WHERE id=$1 RETURNING revision',[classroomId])).rows[0];
 return{revision:String(row.revision)};
}
