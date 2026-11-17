import type { Transaction } from '../../../classrooms/public.ts';
import type { ActivityType } from '../../domain/activity-policy.ts';
import type { StudentActivityListRow } from '../../domain/activity-list-state.ts';
import type { ActivityRow, PendingReviewRow, ActivityIdentity, MaterialLinkRow, QuestionRow, OptionRow, InstructionFileRow, ActivityMaterialRow } from './authoring-records.ts';

/** All operations use the transaction owned by the authoring use case. */
export interface AuthoringRepository {
  findActivity(tx: Transaction, input: { activityId: string; classroomId: string; lock: 'share' | 'update' }): Promise<ActivityRow[]>;
  listActivities(tx: Transaction, input: { classroomId: string; includeDrafts: boolean }): Promise<ActivityRow[]>;
  listPendingReviews(tx: Transaction, input: { classroomId: string }): Promise<PendingReviewRow[]>;
  listStudentActivityStates(tx: Transaction, input: { classroomId: string; studentId: string }): Promise<StudentActivityListRow[]>;
  createDraft(tx: Transaction, input: { activityId: string; now: Date; classroomId: string; type: ActivityType }): Promise<ActivityIdentity[]>;
  updateMetadata(tx: Transaction, input: { activityId: string; title: string | null; unitId: string | null; topicId: string | null; now: Date }): Promise<ActivityIdentity[]>;
  updateDeadline(tx: Transaction, input: { activityId: string; deadline: Date | null; allowLate: boolean; now: Date }): Promise<ActivityIdentity[]>;
  saveContent(tx: Transaction, input: { activityId: string; title: string | null; unitId: string | null; topicId: string | null; instructions: string | null; attachmentRequired: boolean; deadline: Date | null; allowLate: boolean; now: Date; aiGradingRubric: string | null | undefined; evaluationRubric: string | null; hasObjective: boolean; objective: string | null; hasTeacherComment: boolean; teacherComment: string | null; hasTeacherBrief: boolean; teacherBrief: string | null }): Promise<ActivityIdentity[]>;
  publishActivity(tx: Transaction, input: { activityId: string; now: Date }): Promise<ActivityIdentity[]>;
  withdrawActivity(tx: Transaction, input: { activityId: string; now: Date }): Promise<ActivityIdentity[]>;
  findMaterial(tx: Transaction, input: { materialId: string; classroomId: string }): Promise<MaterialLinkRow[]>;
  listQuestions(tx: Transaction, input: { activityId: string }): Promise<QuestionRow[]>;
  listQuestionOptions(tx: Transaction, input: { activityId: string }): Promise<OptionRow[]>;
  listInstructionFiles(tx: Transaction, input: { activityId: string }): Promise<InstructionFileRow[]>;
  listMaterials(tx: Transaction, input: { activityId: string }): Promise<ActivityMaterialRow[]>;
}
