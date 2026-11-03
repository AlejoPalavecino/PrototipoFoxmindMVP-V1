import { bindClassroomMethods } from './composition-bindings.ts';
import { ClassroomCore } from './core.ts';
import { DraftService } from './drafts.ts';
import { MembershipService } from './memberships.ts';
import { InvitationService } from './invitations.ts';
import { PlanService } from './plan.ts';
import { createReadyClassroomFile } from './classroom-file.ts';
import { advanceClassroomRevision } from './revision.ts';
import { newClassroomCode } from './classroom-codes.ts';
import { LibraryService } from './library.ts';
import { WallService } from './wall.ts';
import { ActivityAuthoringService } from './activity-authoring.ts';
import { studentActivityView, sessionView } from './activity-session.ts';
import { ActivityParticipationService } from './activity-participation.ts';
import { PracticalSubmissionService } from './practical-submissions.ts';
import { QuestionnaireAttemptService } from './questionnaire-attempts.ts';
import { ActivityHistoryService } from './activity-history.ts';
import { GradingService } from './grading.ts';
import { GradingAiService } from './grading-ai/service.ts';
import { GradePublicationService } from './grade-publication.ts';
import { GradeCorrectionService } from './grade-corrections.ts';

import { ProgressService } from './progress.ts';
import type { ClassroomPorts } from './contracts.ts';
import type { Actor, Transaction } from './contracts.ts';

export class ClassroomService {
  readonly ports: ClassroomCore['ports'];
  readonly tokens: ClassroomCore['tokens'];
  private readonly context: ClassroomCore;
  private readonly drafts: DraftService;
  private readonly membership: MembershipService;
  private readonly invitations: InvitationService;
  private readonly plan: PlanService;
  private readonly library: LibraryService;
  private readonly wall: WallService;
  private readonly authoring: ActivityAuthoringService;
  private readonly participation: ActivityParticipationService;
  private readonly practical: PracticalSubmissionService;
  private readonly questionnaire: QuestionnaireAttemptService;
  private readonly history: ActivityHistoryService;
  private readonly grading: GradingService;
  private readonly gradingAi: GradingAiService;
  private readonly publication: GradePublicationService;
  private readonly corrections: GradeCorrectionService;
  private readonly progress: ProgressService;
  constructor(ports: ClassroomPorts) {
    this.context = new ClassroomCore(ports);
    this.ports = this.context.ports;
    this.tokens = this.context.tokens;
    this.drafts = new DraftService(this.context);
    this.membership = new MembershipService(this.context, { newCode: newClassroomCode });
    this.invitations = new InvitationService(this.context, { enroll: this.membership.enroll.bind(this.membership) });
    const readyClassroomFile = createReadyClassroomFile(this.context.ports.files);
    this.plan = new PlanService(this.context, readyClassroomFile);
    this.library = new LibraryService(this.context, { readyClassroomFile, advanceRevision: advanceClassroomRevision });
    this.wall = new WallService(this.context, { advanceRevision: advanceClassroomRevision });
    this.authoring = new ActivityAuthoringService(this.context, {
      readyClassroomFile, advanceRevision: advanceClassroomRevision,
      studentActivityView: (...args): ReturnType<typeof studentActivityView> => studentActivityView(this.authoring.activityView.bind(this.authoring), ...args),
    });
    this.participation = new ActivityParticipationService(this.context, {
    activity: this.authoring.activity.bind(this.authoring), advanceRevision: advanceClassroomRevision,
    sessionView: (...args) => sessionView(this.authoring.activityView.bind(this.authoring), ...args),
  });
    this.practical = new PracticalSubmissionService(this.context, { activity: this.authoring.activity.bind(this.authoring) });
    this.questionnaire = new QuestionnaireAttemptService(this.context);
    this.history = new ActivityHistoryService(this.context, {
    activity: this.authoring.activity.bind(this.authoring), activitySummary: this.authoring.activitySummary.bind(this.authoring),
    advanceRevision: advanceClassroomRevision,
    sessionView: (...args) => sessionView(this.authoring.activityView.bind(this.authoring), ...args),
  });
    this.grading = new GradingService(this.context, { activity: this.authoring.activity.bind(this.authoring),
    activityView: this.authoring.activityView.bind(this.authoring), advanceRevision: advanceClassroomRevision });
    this.gradingAi = new GradingAiService(this.context, { gradingContext: this.grading.gradingContext.bind(this.grading),
    savePrivateGrading: this.grading.savePrivateGrading.bind(this.grading) });
    this.publication = new GradePublicationService(this.context, { activity: this.authoring.activity.bind(this.authoring),
    activityView: this.authoring.activityView.bind(this.authoring), gradingContext: this.grading.gradingContext.bind(this.grading),
    gradingView: this.grading.gradingView.bind(this.grading), scoreCorrection: this.grading.scoreCorrection.bind(this.grading),
    advanceRevision: advanceClassroomRevision });
    this.corrections = new GradeCorrectionService(this.context, { gradingContext: this.grading.gradingContext.bind(this.grading),
    advanceRevision: advanceClassroomRevision });
    this.progress = new ProgressService(this.context);
    bindClassroomMethods(this);
  }
  createDraft(...args: Parameters<DraftService['createDraft']>): ReturnType<DraftService['createDraft']> { return this.drafts.createDraft(...args); }
  listDrafts(...args: Parameters<DraftService['listDrafts']>): ReturnType<DraftService['listDrafts']> { return this.drafts.listDrafts(...args); }
  getDraft(...args: Parameters<DraftService['getDraft']>): ReturnType<DraftService['getDraft']> { return this.drafts.getDraft(...args); }
  saveDraft(...args: Parameters<DraftService['saveDraft']>): ReturnType<DraftService['saveDraft']> { return this.drafts.saveDraft(...args); }
  publishDraft(...args: Parameters<DraftService['publishDraft']>): ReturnType<DraftService['publishDraft']> { return this.drafts.publishDraft(...args); }
  updateSettings(...args: Parameters<DraftService['updateSettings']>): ReturnType<DraftService['updateSettings']> { return this.drafts.updateSettings(...args); }
  rotateCode(...args: Parameters<MembershipService['rotateCode']>): ReturnType<MembershipService['rotateCode']> { return this.membership.rotateCode(...args); }
  previewCode(...args: Parameters<MembershipService['previewCode']>): ReturnType<MembershipService['previewCode']> { return this.membership.previewCode(...args); }
  confirmCode(...args: Parameters<MembershipService['confirmCode']>): ReturnType<MembershipService['confirmCode']> { return this.membership.confirmCode(...args); }
  leave(...args: Parameters<MembershipService['leave']>): ReturnType<MembershipService['leave']> { return this.membership.leave(...args); }
  remove(...args: Parameters<MembershipService['remove']>): ReturnType<MembershipService['remove']> { return this.membership.remove(...args); }
  setArchive(...args: Parameters<MembershipService['setArchive']>): ReturnType<MembershipService['setArchive']> { return this.membership.setArchive(...args); }
  members(...args: Parameters<MembershipService['members']>): ReturnType<MembershipService['members']> { return this.membership.members(...args); }
  studentSummary(...args: Parameters<MembershipService['studentSummary']>): ReturnType<MembershipService['studentSummary']> { return this.membership.studentSummary(...args); }
  invite(...args: Parameters<InvitationService['invite']>): ReturnType<InvitationService['invite']> { return this.invitations.invite(...args); }
  revokeInvitation(...args: Parameters<InvitationService['revokeInvitation']>): ReturnType<InvitationService['revokeInvitation']> { return this.invitations.revokeInvitation(...args); }
  pendingInvitations(...args: Parameters<InvitationService['pendingInvitations']>): ReturnType<InvitationService['pendingInvitations']> { return this.invitations.pendingInvitations(...args); }
  listInvitations(...args: Parameters<InvitationService['listInvitations']>): ReturnType<InvitationService['listInvitations']> { return this.invitations.listInvitations(...args); }
  acceptInvitation(...args: Parameters<InvitationService['acceptInvitation']>): ReturnType<InvitationService['acceptInvitation']> { return this.invitations.acceptInvitation(...args); }
  changePlan(...args: Parameters<PlanService['changePlan']>): ReturnType<PlanService['changePlan']> { return this.plan.changePlan(...args); }
  listMaterials(...args: Parameters<LibraryService['listMaterials']>): ReturnType<LibraryService['listMaterials']> { return this.library.listMaterials(...args); }
  changeLibrary(...args: Parameters<LibraryService['changeLibrary']>): ReturnType<LibraryService['changeLibrary']> { return this.library.changeLibrary(...args); }
  listWall(...args: Parameters<WallService['listWall']>): ReturnType<WallService['listWall']> { return this.wall.listWall(...args); }
  wallThread(...args: Parameters<WallService['wallThread']>): ReturnType<WallService['wallThread']> { return this.wall.wallThread(...args); }
  listWallReplies(...args: Parameters<WallService['listWallReplies']>): ReturnType<WallService['listWallReplies']> { return this.wall.listWallReplies(...args); }
  changeWall(...args: Parameters<WallService['changeWall']>): ReturnType<WallService['changeWall']> { return this.wall.changeWall(...args); }
  listNotifications(...args: Parameters<WallService['listNotifications']>): ReturnType<WallService['listNotifications']> { return this.wall.listNotifications(...args); }
  listNotificationPage(...args: Parameters<WallService['listNotificationPage']>): ReturnType<WallService['listNotificationPage']> { return this.wall.listNotificationPage(...args); }
  readNotification(...args: Parameters<WallService['readNotification']>): ReturnType<WallService['readNotification']> { return this.wall.readNotification(...args); }
  openNotification(...args: Parameters<WallService['openNotification']>): ReturnType<WallService['openNotification']> { return this.wall.openNotification(...args); }
  listActivities(...args: Parameters<ActivityAuthoringService['listActivities']>): ReturnType<ActivityAuthoringService['listActivities']> { return this.authoring.listActivities(...args); }
  activityDetail(...args: Parameters<ActivityAuthoringService['activityDetail']>): ReturnType<ActivityAuthoringService['activityDetail']> { return this.authoring.activityDetail(...args); }
  activityDeadlineChoices(...args: Parameters<ActivityAuthoringService['activityDeadlineChoices']>): ReturnType<ActivityAuthoringService['activityDeadlineChoices']> { return this.authoring.activityDeadlineChoices(...args); }
  changeActivities(...args: Parameters<ActivityAuthoringService['changeActivities']>): ReturnType<ActivityAuthoringService['changeActivities']> { return this.authoring.changeActivities(...args); }
  activitySession(...args: Parameters<ActivityParticipationService['activitySession']>): ReturnType<ActivityParticipationService['activitySession']> { return this.participation.activitySession(...args); }
  startActivity(...args: Parameters<ActivityParticipationService['startActivity']>): ReturnType<ActivityParticipationService['startActivity']> { return this.participation.startActivity(...args); }
  transferAttemptEditor(...args: Parameters<ActivityParticipationService['transferAttemptEditor']>): ReturnType<ActivityParticipationService['transferAttemptEditor']> { return this.participation.transferAttemptEditor(...args); }
  activityEligibility(...args: Parameters<ActivityParticipationService['activityEligibility']>): ReturnType<ActivityParticipationService['activityEligibility']> { return this.participation.activityEligibility(...args); }
  authorizeFirstSubmission(...args: Parameters<ActivityParticipationService['authorizeFirstSubmission']>): ReturnType<ActivityParticipationService['authorizeFirstSubmission']> { return this.participation.authorizeFirstSubmission(...args); }
  removeAttemptAttachment(...args: Parameters<PracticalSubmissionService['removeAttemptAttachment']>): ReturnType<PracticalSubmissionService['removeAttemptAttachment']> { return this.practical.removeAttemptAttachment(...args); }
  submitPracticalAttempt(...args: Parameters<PracticalSubmissionService['submitPracticalAttempt']>): ReturnType<PracticalSubmissionService['submitPracticalAttempt']> { return this.practical.submitPracticalAttempt(...args); }
  assignmentSubmissions(...args: Parameters<PracticalSubmissionService['assignmentSubmissions']>): ReturnType<PracticalSubmissionService['assignmentSubmissions']> { return this.practical.assignmentSubmissions(...args); }
  assignmentSubmission(...args: Parameters<PracticalSubmissionService['assignmentSubmission']>): ReturnType<PracticalSubmissionService['assignmentSubmission']> { return this.practical.assignmentSubmission(...args); }
  saveAttemptAnswer(...args: Parameters<QuestionnaireAttemptService['saveAttemptAnswer']>): ReturnType<QuestionnaireAttemptService['saveAttemptAnswer']> { return this.questionnaire.saveAttemptAnswer(...args); }
  submitQuestionnaireAttempt(...args: Parameters<QuestionnaireAttemptService['submitQuestionnaireAttempt']>): ReturnType<QuestionnaireAttemptService['submitQuestionnaireAttempt']> { return this.questionnaire.submitQuestionnaireAttempt(...args); }
  activityHistory(...args: Parameters<ActivityHistoryService['activityHistory']>): ReturnType<ActivityHistoryService['activityHistory']> { return this.history.activityHistory(...args); }
  activitySubmissions(...args: Parameters<ActivityHistoryService['activitySubmissions']>): ReturnType<ActivityHistoryService['activitySubmissions']> { return this.history.activitySubmissions(...args); }
  activityAttempt(...args: Parameters<ActivityHistoryService['activityAttempt']>): ReturnType<ActivityHistoryService['activityAttempt']> { return this.history.activityAttempt(...args); }
  reopenActivity(...args: Parameters<ActivityHistoryService['reopenActivity']>): ReturnType<ActivityHistoryService['reopenActivity']> { return this.history.reopenActivity(...args); }
  getAttemptGrading(...args: Parameters<GradingService['getAttemptGrading']>): ReturnType<GradingService['getAttemptGrading']> { return this.grading.getAttemptGrading(...args); }
  saveAttemptGrading(...args: Parameters<GradingService['saveAttemptGrading']>): ReturnType<GradingService['saveAttemptGrading']> { return this.grading.saveAttemptGrading(...args); }
  getGradingAi(...args: Parameters<GradingAiService['getGradingAi']>): ReturnType<GradingAiService['getGradingAi']> { return this.gradingAi.getGradingAi(...args); }
  applyGradingAi(...args: Parameters<GradingAiService['applyGradingAi']>): ReturnType<GradingAiService['applyGradingAi']> { return this.gradingAi.applyGradingAi(...args); }
  discardGradingAi(...args: Parameters<GradingAiService['discardGradingAi']>): ReturnType<GradingAiService['discardGradingAi']> { return this.gradingAi.discardGradingAi(...args); }
  publishAttemptGrade(...args: Parameters<GradePublicationService['publishAttemptGrade']>): ReturnType<GradePublicationService['publishAttemptGrade']> { return this.publication.publishAttemptGrade(...args); }
  getAttemptResult(...args: Parameters<GradePublicationService['getAttemptResult']>): ReturnType<GradePublicationService['getAttemptResult']> { return this.publication.getAttemptResult(...args); }
  getGradeCorrections(...args: Parameters<GradeCorrectionService['getGradeCorrections']>): ReturnType<GradeCorrectionService['getGradeCorrections']> { return this.corrections.getGradeCorrections(...args); }
  correctPublishedGrade(...args: Parameters<GradeCorrectionService['correctPublishedGrade']>): ReturnType<GradeCorrectionService['correctPublishedGrade']> { return this.corrections.correctPublishedGrade(...args); }
  run<T>(request: unknown, write: boolean, operation: (tx: Transaction, actor: Actor) => Promise<T>): Promise<T> {
    return this.context.run(request, write, operation);
  }
  classroom(...args: Parameters<ClassroomCore['classroom']>): ReturnType<ClassroomCore['classroom']> { return this.context.classroom(...args); }
  summary(...args: Parameters<ClassroomCore['summary']>): ReturnType<ClassroomCore['summary']> { return this.context.summary(...args); }
  mine(...args: Parameters<ClassroomCore['mine']>): ReturnType<ClassroomCore['mine']> { return this.context.mine(...args); }
  detail(...args: Parameters<ClassroomCore['detail']>): ReturnType<ClassroomCore['detail']> { return this.context.detail(...args); }
  progressView(...args: Parameters<ProgressService['progressView']>): ReturnType<ProgressService['progressView']> { return this.progress.progressView(...args); }
  getProgress(...args: Parameters<ProgressService['getProgress']>): ReturnType<ProgressService['getProgress']> { return this.progress.getProgress(...args); }
  getStudentProgress(...args: Parameters<ProgressService['getStudentProgress']>): ReturnType<ProgressService['getStudentProgress']> { return this.progress.getStudentProgress(...args); }
  getStudentAiReport(...args: Parameters<ProgressService['getStudentAiReport']>): ReturnType<ProgressService['getStudentAiReport']> { return this.progress.getStudentAiReport(...args); }
}
