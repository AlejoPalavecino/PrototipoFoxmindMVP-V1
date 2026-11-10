import type { MaterialPublicationRepository } from '../application/publication-repository.ts';
export function createMaterialPublicationRepository(): MaterialPublicationRepository {
 return {
 async classroom(tx,classroomId,actorId) { const [classroom] = await tx.query<{revision:bigint}>(`SELECT revision FROM classrooms
      WHERE id=$1::uuid AND teacher_id=$2::uuid AND archived_at IS NULL FOR UPDATE`,classroomId,actorId); return classroom ?? null; },
 async unit(tx,unitId,classroomId) { return (await tx.query('SELECT id FROM units WHERE id=$1::uuid AND classroom_id=$2::uuid FOR SHARE',unitId,classroomId)).length > 0; },
 async topic(tx,topicId,unitId,classroomId) { return (await tx.query('SELECT id FROM topics WHERE id=$1::uuid AND unit_id=$2::uuid AND classroom_id=$3::uuid FOR SHARE',topicId,unitId,classroomId)).length > 0; },
 async linked(tx,fileId) { return (await tx.query('SELECT id FROM materials WHERE file_id=$1::uuid',fileId)).length > 0; },
 async insert(tx,materialId,input,title,fileId,actorId) { await tx.query(`INSERT INTO materials(id,updated_at,classroom_id,title,file_id,unit_id,topic_id,created_by_id)
      VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4::uuid,$5::uuid,$6::uuid,$7::uuid) RETURNING id`,materialId,input.classroomId,title,fileId,input.unitId,input.topicId,actorId); }
 };
}
