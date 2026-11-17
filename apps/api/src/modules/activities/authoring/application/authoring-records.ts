import type { ActivityType } from '../../domain/activity-policy.ts';
import type { EvaluationRubric } from '../../../../../../../src/core/domain/grading/evaluation-rubric.ts';

export interface ActivityRow {
  id: string; classroom_id: string; type: ActivityType; title: string | null; unit_id: string | null; topic_id: string | null;
  objective?: string | null; teacher_brief?: string | null; teacher_comment?: string | null; instructions_text: string | null; ai_grading_rubric?: string; evaluation_rubric?: EvaluationRubric; attachments_required: boolean; status: 'DRAFT' | 'PUBLISHED' | 'WITHDRAWN';
  published_at: Date | null; deadline_at: Date | null; allow_late_submissions: boolean; first_started_at: Date | null;
}
export interface QuestionRow { id: string; type: string; prompt: string; points: string; scoringRule: string | null }
export interface OptionRow { id: string; question_id: string; text: string; correct: boolean }

export interface PendingReviewRow { activity_id: string; count: number }
export interface MaterialLinkRow { file_id: string; deleted_at: Date | null }
export interface InstructionFileRow { id: string; name: string; extension: string; ready: boolean }
export interface ActivityMaterialRow { id: string; title: string; fileId: string; extension: string }
export interface ActivityIdentity { id: string }
