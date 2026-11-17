import type { AcademicRuntime } from './academic-composition.ts';
import type { AcademicHttpServices } from './academic-http.ts';

type MethodKey<T> = { [Key in keyof T]: T[Key] extends Function ? Key : never }[keyof T];
function boundMethods<T, Key extends MethodKey<T>>(service: T, keys: readonly Key[]): Pick<T, Key> {
  const result = {} as Pick<T, Key>;
  for (const key of keys) {
    const operation = service[key];
    if (typeof operation !== 'function') throw new TypeError('Invalid academic HTTP operation.');
    result[key] = operation.bind(service) as T[Key];
  }
  return result;
}

/** The host connects eight consumer ports; it does not introduce another service facade. */
export function academicHttpServices(runtime: AcademicRuntime): AcademicHttpServices {
  const { classrooms, participation, grading } = runtime;
  return {
    catalog: {
      ...classrooms.catalog,
      ...boundMethods(classrooms.drafts, ['createDraft', 'listDrafts', 'getDraft', 'saveDraft', 'deleteDraft', 'publishDraft', 'updateSettings']),
      ...boundMethods(classrooms.memberships, ['rotateCode', 'previewCode', 'confirmCode', 'leave', 'remove', 'setArchive', 'members', 'studentSummary']),
      ...boundMethods(classrooms.invitations, ['invite', 'reserveInvitationBatch', 'readInvitationBatch', 'emitInvitationBatchRecipient',
        'revokeInvitation', 'pendingInvitations', 'listInvitations', 'declineInvitation', 'acceptInvitation']),
    },
    plan: runtime.curriculum.plan,
    library: runtime.materials.library,
    wall: runtime.communication.wall,
    authoring: runtime.activities.authoring,
    notifications: runtime.home.notifications,
    attempts: {
      ...boundMethods(participation.attempts, ['activitySession', 'startActivity', 'transferAttemptEditor', 'activityEligibility', 'authorizeFirstSubmission']),
      ...boundMethods(participation.practicalSubmissions, ['removeAttemptAttachment', 'submitPracticalAttempt', 'savePracticalResponse',
        'assignmentSubmissions', 'assignmentSubmission']),
      ...boundMethods(participation.questionnaires, ['saveAttemptAnswer', 'submitQuestionnaireAttempt']),
      ...boundMethods(participation.history, ['activityHistory', 'activitySubmissions', 'activityAttempt', 'reopenActivity']),
    },
    review: {
      ...boundMethods(grading.review, ['getAttemptGrading', 'saveAttemptGrading']),
      ...boundMethods(grading.assistance, ['getGradingAi', 'applyGradingAi', 'discardGradingAi']),
      ...boundMethods(grading.publication, ['publishAttemptGrade', 'getAttemptResult']),
      ...boundMethods(grading.corrections, ['getGradeCorrections', 'correctPublishedGrade']),
      ...boundMethods(grading.progress, ['getProgress', 'getStudentProgress', 'getStudentAiReport']),
    },
  };
}
