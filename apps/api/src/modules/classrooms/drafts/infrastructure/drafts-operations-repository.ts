
import type { DraftRow } from '../../application/management-operations.ts';
import type { PublicationRepository } from '../application/drafts-operations-repository.ts';
export function createPublicationRepository(): PublicationRepository { return {
  async readSnapshot(tx, input) { return tx.query<DraftRow>('SELECT * FROM classroom_drafts WHERE id=$1::uuid AND owner_id=$2::uuid AND deleted_at IS NULL', input.draftId, input.ownerId); },
  async markPublished(tx, input) { return tx.query<{ id: string }>('UPDATE classroom_drafts SET published_classroom_id=$2::uuid,revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id', input.draftId, input.classroomId); },
  async createDestination(tx, input) { return tx.query<{ id: string }>(`INSERT INTO classrooms(id,updated_at,teacher_id,name,subject,division,academic_year,timezone,cover_key,storage_quota_bytes)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4,$5,$6,$7,$8,$9) RETURNING id`, input.classroomId, input.teacherId, input.name, input.subject, input.division, input.academicYear, input.timezone, input.coverKey, input.quota); },
  async addPlanVersion(tx, input) { return tx.query<{ id: string }>(`INSERT INTO study_plan_versions(id,updated_at,classroom_id,version_number,file_id,uploaded_by_id)
        VALUES($1::uuid,clock_timestamp(),$2::uuid,1,$3::uuid,$4::uuid) RETURNING id`, input.versionId, input.classroomId, input.fileId, input.actorId); },
  async addUnit(tx, input) { return tx.query<{ id: string }>('INSERT INTO units(id,updated_at,classroom_id,name,position) VALUES($1::uuid,clock_timestamp(),$2::uuid,$3,$4) RETURNING id', input.unitId, input.classroomId, input.name, input.position); },
  async addTopic(tx, input) { return tx.query<{ id: string }>(`INSERT INTO topics(id,updated_at,classroom_id,unit_id,name,position)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4,$5) RETURNING id`, input.topicId, input.classroomId, input.unitId, input.name, input.position); },
}; }
