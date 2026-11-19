import type { SharedStudyStrategy, StudentSharedStudyStrategy } from '../../../../../../../src/core/contracts/study-shared-strategy.ts';
import type { StudyQuery } from '../../application/contracts.ts';
import type { SharedStudyStrategyRepository, StrategyFolder } from '../application/service.ts';

const visibleStrategies = `FROM study_shared_strategies s
  JOIN study_folders f ON f.id=s.folder_id AND f.status='ACTIVE'
    AND lower(f.state #>> '{fields,linkedClassroomId}')=s.classroom_id::text
  JOIN classrooms c ON c.id=s.classroom_id AND c.archived_at IS NULL
  JOIN membership_periods p ON p.id=s.membership_period_id AND p.classroom_id=c.id AND p.ended_at IS NULL
  JOIN enrollments e ON e.id=p.enrollment_id AND e.classroom_id=c.id AND e.student_id=f.owner_id`;

export const sharedStudyStrategyRepository: SharedStudyStrategyRepository = {
  async folder(tx, folderId, owner, write) {
    const [folder] = await tx.query<StrategyFolder>(`
      SELECT status, state #>> '{fields,linkedClassroomId}' AS "linkedClassroomId"
      FROM study_folders WHERE id=$1::uuid AND owner_id=$2::uuid AND status<>'DELETED'
      ${write ? 'FOR UPDATE' : ''}`, folderId, owner);
    return folder;
  },
  async audience(tx, owner, classroomId) {
    const [period] = await tx.query<{ id: string }>(`SELECT p.id FROM classrooms c
      JOIN enrollments e ON e.classroom_id=c.id AND e.student_id=$1::uuid
      JOIN membership_periods p ON p.enrollment_id=e.id AND p.classroom_id=c.id AND p.ended_at IS NULL
      WHERE c.id=$2::uuid AND c.archived_at IS NULL FOR SHARE OF c,p`, owner, classroomId);
    return period?.id;
  },
  async visibleToStudent(tx, folderId, owner) {
    const [strategy] = await tx.query<StudentSharedStudyStrategy>(`
      SELECT s.id,s.classroom_id AS "classroomId",s.text ${visibleStrategies}
      WHERE f.id=$1::uuid AND f.owner_id=$2::uuid`, folderId, owner);
    return strategy;
  },
  async currentId(tx, folderId) {
    const [current] = await tx.query<{ id: string }>(
      'SELECT id FROM study_shared_strategies WHERE folder_id=$1::uuid', folderId);
    return current?.id;
  },
  async upsert(tx, input) {
    const [strategy] = await tx.query<StudentSharedStudyStrategy>(`INSERT INTO study_shared_strategies AS previous
      (id,folder_id,classroom_id,membership_period_id,text) VALUES($1::uuid,$2::uuid,$3::uuid,$4::uuid,$5)
      ON CONFLICT(folder_id) DO UPDATE SET
        id=CASE WHEN previous.text=EXCLUDED.text AND previous.membership_period_id=EXCLUDED.membership_period_id
          THEN previous.id ELSE EXCLUDED.id END,
        classroom_id=EXCLUDED.classroom_id, membership_period_id=EXCLUDED.membership_period_id, text=EXCLUDED.text,
        shared_at=CASE WHEN previous.text=EXCLUDED.text AND previous.membership_period_id=EXCLUDED.membership_period_id
          THEN previous.shared_at ELSE clock_timestamp() END
      RETURNING id,classroom_id AS "classroomId",text`, input.id, input.folderId, input.classroomId, input.periodId, input.text);
    return strategy;
  },
  async withdraw(tx, folderId, strategyId) {
    await tx.query('DELETE FROM study_shared_strategies WHERE folder_id=$1::uuid AND id=$2::uuid RETURNING id', folderId, strategyId);
  },
};

export function readSharedStudyStrategies(tx: StudyQuery, input: { teacherId: string; classroomId: string; studentId: string }) {
  return tx.query<SharedStudyStrategy>(`SELECT s.id,s.text ${visibleStrategies}
    WHERE c.teacher_id=$1::uuid AND c.id=$2::uuid AND e.student_id=$3::uuid
    ORDER BY s.shared_at DESC,s.id`, input.teacherId, input.classroomId, input.studentId);
}
