import { validateMailbox } from '../modules/identity/mail-delivery/infrastructure/mail/mailbox.ts';
import { promoteDraftPlan } from '../modules/files/custody/infrastructure/promotion.ts';
import type { FileStore } from '../modules/files/custody/infrastructure/store.ts';
import { searchClassrooms } from '../modules/classrooms/catalog/infrastructure/brujula-search.ts';
import { ClassroomCore } from '../modules/classrooms/access/infrastructure/core.ts';
import { DraftService } from './academic-management-composition.ts';
import { MembershipService } from './academic-management-composition.ts';
import { InvitationService } from './academic-management-composition.ts';
import { PlanService } from './academic-curriculum-composition.ts';
import { createReadyClassroomFile } from '../modules/materials/publication/infrastructure/classroom-file.ts';
import { advanceClassroomRevision } from '../modules/classrooms/access/infrastructure/revision.ts';
import { newClassroomCode } from './academic-management-composition.ts';
import { createCatalogOperations } from '../modules/classrooms/catalog/public.ts';
import { createCatalogRepository } from '../modules/classrooms/catalog/infrastructure/classroom-queries-repository.ts';
import { decryptDelivery } from '../modules/classrooms/invitations/infrastructure/delivery-envelope.ts';
import { digest } from '../platform/crypto/digest.ts';
import { LibraryService } from './academic-materials-composition.ts';
import { WallService } from './academic-communication-composition.ts';
import { NotificationInboxService } from './academic-notifications-composition.ts';
import { ActivityAuthoringService } from './academic-authoring-composition.ts';
import { studentActivityView, sessionView } from '../modules/participation/attempts/infrastructure/activity-session.ts';
import { ActivityParticipationService } from './academic-student-composition.ts';
import { PracticalSubmissionService } from './academic-student-composition.ts';
import { QuestionnaireAttemptService } from './academic-student-composition.ts';
import { ActivityHistoryService } from './academic-student-composition.ts';
import { GradingService } from './academic-grading-composition.ts';
import { GradingAiService } from './academic-grading-composition.ts';
import { GradePublicationService } from './academic-grading-composition.ts';
import { GradeCorrectionService } from './academic-grading-composition.ts';

import { ProgressService } from './academic-grading-composition.ts';
import { TeacherWritingService } from '../modules/grading/student-analysis/application/teacher-writing-service.ts';
import { teacherWritingRepository } from '../modules/grading/student-analysis/infrastructure/teacher-writing-repository.ts';
import { createTeacherSupportService } from './academic-grading-composition.ts';
import type { ClassroomPorts } from '../modules/classrooms/access/application/runtime-ports.ts';

/** One token and one composed graph per application instance. */
export const ACADEMIC_RUNTIME = Symbol('ACADEMIC_RUNTIME');
export type AcademicRuntimeInput = Omit<ClassroomPorts, 'files' | 'validateMailbox'> & { validateMailbox?: ClassroomPorts['validateMailbox']; files: ClassroomPorts['files'] | FileStore };

function academicPorts(input: AcademicRuntimeInput): ClassroomPorts {
  const ports = { ...input, validateMailbox: input.validateMailbox ?? validateMailbox };
  if ('promoteDraftPlanInTransaction' in input.files) return ports as ClassroomPorts;
  return {
    ...ports,
    files: {
      load: input.files.load.bind(input.files),
      loadAuthorized: input.files.loadAuthorized.bind(input.files),
      promoteDraftPlanInTransaction: (tx, request, id, classroomId) =>
        promoteDraftPlan(input.files as FileStore, tx, request, id, classroomId),
    },
  };
}

export function createAcademicRuntime(input: AcademicRuntimeInput) {
  const ports = academicPorts(input);
  const access = new ClassroomCore(ports,
    createCatalogOperations(createCatalogRepository(), { readCode: decryptDelivery, digest }));
  const drafts = new DraftService(access);
  const membership = new MembershipService(access, {
    newCode: (tx, id) => newClassroomCode(tx, id, access.ports.deliveryKey),
  });
  const invitations = new InvitationService(access, { enroll: membership.enroll.bind(membership) });
  const readyClassroomFile = createReadyClassroomFile(access.ports.files);
  const plan = new PlanService(access);
  const library = new LibraryService(access, { readyClassroomFile, advanceRevision: advanceClassroomRevision });
  const wall = new WallService(access, { advanceRevision: advanceClassroomRevision });
  const notifications = new NotificationInboxService(access);
  const authoring: ActivityAuthoringService = new ActivityAuthoringService(access, {
    readyClassroomFile, advanceRevision: advanceClassroomRevision,
    studentActivityView: (...args): ReturnType<typeof studentActivityView> =>
      studentActivityView(authoring.activityView.bind(authoring), ...args),
  });
  const participation = new ActivityParticipationService(access, {
    activity: authoring.activity.bind(authoring), advanceRevision: advanceClassroomRevision,
    sessionView: (...args) => sessionView(authoring.activityView.bind(authoring), ...args),
  });
  const practical = new PracticalSubmissionService(access, { activity: authoring.activity.bind(authoring) });
  const questionnaire = new QuestionnaireAttemptService(access);
  const history = new ActivityHistoryService(access, {
    activity: authoring.activity.bind(authoring), activitySummary: authoring.activitySummary.bind(authoring),
    advanceRevision: advanceClassroomRevision,
    sessionView: (...args) => sessionView(authoring.activityView.bind(authoring), ...args),
  });
  const grading = new GradingService(access, {
    activity: authoring.activity.bind(authoring), activityView: authoring.activityView.bind(authoring),
    advanceRevision: advanceClassroomRevision,
  });
  const gradingAi = new GradingAiService(access, {
    gradingContext: grading.gradingContext.bind(grading), savePrivateGrading: grading.savePrivateGrading.bind(grading),
  });
  const publication = new GradePublicationService(access, {
    activity: authoring.activity.bind(authoring), activityView: authoring.activityView.bind(authoring),
    gradingContext: grading.gradingContext.bind(grading), gradingView: grading.gradingView.bind(grading),
    scoreCorrection: grading.scoreCorrection.bind(grading), advanceRevision: advanceClassroomRevision,
  });
  const corrections = new GradeCorrectionService(access, {
    gradingContext: grading.gradingContext.bind(grading), advanceRevision: advanceClassroomRevision,
  });
  const progress = new ProgressService(access);
  const teacherWriting = new TeacherWritingService(access, ports.teacherWritingEnabled === true, teacherWritingRepository);
  const teacherSupport = createTeacherSupportService(access);

  return {
    access,
    classrooms: {
      catalog: {
        search: (request: unknown, query: unknown) => searchClassrooms(access, request, query),
        mine: access.mine.bind(access),
        detail: access.detail.bind(access),
      },
      drafts, memberships: membership, invitations,
    },
    curriculum: { plan },
    materials: { library },
    communication: { wall },
    home: { notifications },
    activities: { authoring },
    participation: { attempts: participation, practicalSubmissions: practical, questionnaires: questionnaire, history },
    grading: { review: grading, assistance: gradingAi, publication, corrections, progress, teacherSupport, teacherWriting },
  };
}

export type AcademicRuntime = ReturnType<typeof createAcademicRuntime>;
