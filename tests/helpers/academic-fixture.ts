import { createRequire } from 'node:module';
import type { AcademicRuntime, AcademicRuntimeInput } from '../../apps/api/src/bootstrap/academic-composition.ts';

const fixtureRequire = createRequire(import.meta.url);

/** Test-only flat API. All services are composed by the production factory exactly once. */
type FixtureServices = {
  access: AcademicRuntime['access'];
  catalog: AcademicRuntime['classrooms']['catalog'];
  drafts: AcademicRuntime['classrooms']['drafts'];
  membership: AcademicRuntime['classrooms']['memberships'];
  invitations: AcademicRuntime['classrooms']['invitations'];
  plan: AcademicRuntime['curriculum']['plan'];
  library: AcademicRuntime['materials']['library'];
  wall: AcademicRuntime['communication']['wall'];
  notifications: AcademicRuntime['home']['notifications'];
  authoring: AcademicRuntime['activities']['authoring'];
  participation: AcademicRuntime['participation']['attempts'];
  practical: AcademicRuntime['participation']['practicalSubmissions'];
  questionnaire: AcademicRuntime['participation']['questionnaires'];
  history: AcademicRuntime['participation']['history'];
  grading: AcademicRuntime['grading']['review'];
  gradingAi: AcademicRuntime['grading']['assistance'];
  publication: AcademicRuntime['grading']['publication'];
  corrections: AcademicRuntime['grading']['corrections'];
  progress: AcademicRuntime['grading']['progress'];
};

const methodOwners = {
  "search": "catalog",
  "createDraft": "drafts",
  "listDrafts": "drafts",
  "deleteDraft": "drafts",
  "getDraft": "drafts",
  "saveDraft": "drafts",
  "publishDraft": "drafts",
  "updateSettings": "drafts",
  "rotateCode": "membership",
  "previewCode": "membership",
  "confirmCode": "membership",
  "leave": "membership",
  "remove": "membership",
  "setArchive": "membership",
  "members": "membership",
  "studentSummary": "membership",
  "invite": "invitations",
  "reserveInvitationBatch": "invitations",
  "readInvitationBatch": "invitations",
  "emitInvitationBatchRecipient": "invitations",
  "revokeInvitation": "invitations",
  "pendingInvitations": "invitations",
  "listInvitations": "invitations",
  "declineInvitation": "invitations",
  "acceptInvitation": "invitations",
  "changePlan": "plan",
  "listMaterials": "library",
  "changeLibrary": "library",
  "listWall": "wall",
  "wallThread": "wall",
  "listWallReplies": "wall",
  "changeWall": "wall",
  "listNotifications": "notifications",
  "listNotificationPage": "notifications",
  "readNotification": "notifications",
  "readAllNotifications": "notifications",
  "openNotification": "notifications",
  "listActivities": "authoring",
  "activityDetail": "authoring",
  "activityDeadlineChoices": "authoring",
  "changeActivities": "authoring",
  "activitySession": "participation",
  "startActivity": "participation",
  "transferAttemptEditor": "participation",
  "activityEligibility": "participation",
  "authorizeFirstSubmission": "participation",
  "removeAttemptAttachment": "practical",
  "submitPracticalAttempt": "practical",
  "savePracticalResponse": "practical",
  "assignmentSubmissions": "practical",
  "assignmentSubmission": "practical",
  "saveAttemptAnswer": "questionnaire",
  "submitQuestionnaireAttempt": "questionnaire",
  "activityHistory": "history",
  "activitySubmissions": "history",
  "activityAttempt": "history",
  "reopenActivity": "history",
  "getAttemptGrading": "grading",
  "saveAttemptGrading": "grading",
  "getGradingAi": "gradingAi",
  "applyGradingAi": "gradingAi",
  "discardGradingAi": "gradingAi",
  "publishAttemptGrade": "publication",
  "getAttemptResult": "publication",
  "getGradeCorrections": "corrections",
  "correctPublishedGrade": "corrections",
  "run": "access",
  "classroom": "access",
  "summary": "access",
  "mine": "access",
  "detail": "access",
  "progressView": "progress",
  "getProgress": "progress",
  "getStudentProgress": "progress",
  "getStudentAiReport": "progress"
} as const satisfies Record<string, keyof FixtureServices>;

type ValidOwners<T extends Record<string, keyof FixtureServices>> = {
  [Name in keyof T]: Name extends keyof FixtureServices[T[Name]] ? T[Name] : never;
};
const checkedOwners: ValidOwners<typeof methodOwners> = methodOwners;
type FixtureMethod = keyof typeof checkedOwners;
export type AcademicFixtureOperations = {
  [Name in FixtureMethod]: Name extends keyof FixtureServices[typeof checkedOwners[Name]]
    ? FixtureServices[typeof checkedOwners[Name]][Name] : never;
};

function fixtureServices(runtime: AcademicRuntime): FixtureServices {
  return {
    access: runtime.access,
    catalog: runtime.classrooms.catalog,
    drafts: runtime.classrooms.drafts,
    membership: runtime.classrooms.memberships,
    invitations: runtime.classrooms.invitations,
    plan: runtime.curriculum.plan,
    library: runtime.materials.library,
    wall: runtime.communication.wall,
    notifications: runtime.home.notifications,
    authoring: runtime.activities.authoring,
    participation: runtime.participation.attempts,
    practical: runtime.participation.practicalSubmissions,
    questionnaire: runtime.participation.questionnaires,
    history: runtime.participation.history,
    grading: runtime.grading.review,
    gradingAi: runtime.grading.assistance,
    publication: runtime.grading.publication,
    corrections: runtime.grading.corrections,
    progress: runtime.grading.progress,
  };
}

export interface ClassroomService extends AcademicFixtureOperations {}
export class ClassroomService {
  readonly runtime: AcademicRuntime;
  readonly ports: AcademicRuntime['access']['ports'];
  readonly tokens: AcademicRuntime['access']['tokens'];
  constructor(input: AcademicRuntimeInput) {
    // Fixtures and p5-runtime use the strict build, preserving native Node execution flags.
    const { createAcademicRuntime } = fixtureRequire('../../.build/api/apps/api/src/bootstrap/academic-composition.js') as
      typeof import('../../apps/api/src/bootstrap/academic-composition.ts');
    this.runtime = createAcademicRuntime(input);
    this.ports = this.runtime.access.ports;
    this.tokens = this.runtime.access.tokens;
    for (const method of Object.keys(checkedOwners) as FixtureMethod[]) {
      Object.defineProperty(this, method, { value: ClassroomService.prototype[method].bind(this), configurable: true, writable: true });
    }
  }
}

// Prototype entries are retained for the existing capability/prototype acceptance checks.
for (const method of Object.keys(checkedOwners) as FixtureMethod[]) {
  Object.defineProperty(ClassroomService.prototype, method, {
    configurable: true, writable: true,
    value: function(this: ClassroomService, ...args: never[]) {
      const owner = fixtureServices(this.runtime)[checkedOwners[method]];
      return Reflect.apply(Reflect.get(owner, method), owner, args);
    },
  });
}
