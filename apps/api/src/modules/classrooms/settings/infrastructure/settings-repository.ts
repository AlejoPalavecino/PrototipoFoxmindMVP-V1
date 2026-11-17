

import type { SettingsRepository } from '../application/settings-repository.ts';
export function createSettingsRepository(): SettingsRepository { return {
  async updateSettings(tx, input) { return tx.query<{ id: string }>(`UPDATE classrooms SET name=$2,subject=$3,division=$4,academic_year=$5,
        ai_grading_epoch=ai_grading_epoch+CASE WHEN ai_grading_enabled AND $6::boolean IS FALSE THEN 1 ELSE 0 END,
        ai_grading_enabled=COALESCE($6::boolean,ai_grading_enabled),cover_key=COALESCE($7,cover_key),
        revision=revision+1,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, input.classroomId, input.name, input.subject, input.division, input.academicYear, input.aiGradingEnabled, input.coverKey); },
}; }
