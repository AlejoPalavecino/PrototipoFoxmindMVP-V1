import { validateMailbox } from '../modules/identity/infrastructure/mail/mailbox.ts';
import { promoteDraftPlan } from '../modules/files/infrastructure/promotion.ts';
import type { FileStore } from '../modules/files/infrastructure/store.ts';
import { searchClassrooms } from '../modules/classrooms/infrastructure/brujula-search.ts';
import { ClassroomCore } from '../modules/classrooms/infrastructure/core.ts';
import { DraftService } from './academic-management-composition.ts';
import { MembershipService } from './academic-management-composition.ts';
import { InvitationService } from './academic-management-composition.ts';
import { PlanService } from './academic-curriculum-composition.ts';
import { createReadyClassroomFile } from '../modules/materials/infrastructure/classroom-file.ts';
import { advanceClassroomRevision } from '../modules/classrooms/infrastructure/revision.ts';
import { newClassroomCode } from '../modules/classrooms/infrastructure/classroom-codes.ts';
import { LibraryService } from './academic-materials-composition.ts';
import { WallService } from './academic-communication-composition.ts';
import { ActivityAuthoringService } from './academic-authoring-composition.ts';
import { studentActivityView, sessionView } from '../modules/participation/infrastructure/activity-session.ts';
import { ActivityParticipationService } from './academic-student-composition.ts';
import { PracticalSubmissionService } from './academic-student-composition.ts';
import { QuestionnaireAttemptService } from './academic-student-composition.ts';
import { ActivityHistoryService } from './academic-student-composition.ts';
import { GradingService } from './academic-grading-composition.ts';
import { GradingAiService } from './academic-grading-composition.ts';
import { GradePublicationService } from './academic-grading-composition.ts';
import { GradeCorrectionService } from './academic-grading-composition.ts';

import { ProgressService } from './academic-grading-composition.ts';
import type { ClassroomPorts } from '../modules/classrooms/infrastructure/contracts.ts';
import type { Actor, Transaction } from '../modules/classrooms/infrastructure/contracts.ts';

export class ClassroomService {
  search(request: unknown, query: unknown) { return searchClassrooms(this.context, request, query); }
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
  constructor(input: Omit<ClassroomPorts, 'files' | 'validateMailbox'> & { validateMailbox?: ClassroomPorts['validateMailbox']; files: ClassroomPorts['files'] | FileStore }) {
    const ports: ClassroomPorts = 'promoteDraftPlanInTransaction' in input.files ? { ...input, validateMailbox: input.validateMailbox ?? validateMailbox } as ClassroomPorts : { ...input, validateMailbox: input.validateMailbox ?? validateMailbox, files: { load: input.files.load.bind(input.files), loadAuthorized: input.files.loadAuthorized.bind(input.files), promoteDraftPlanInTransaction: (tx, request, id, classroomId) => promoteDraftPlan(input.files as FileStore, tx, request, id, classroomId) } };
    this.context = new ClassroomCore(ports);
    this.ports = this.context.ports;
    this.tokens = this.context.tokens;
    this.drafts = new DraftService(this.context);
    this.membership = new MembershipService(this.context, { newCode: (tx,id)=>newClassroomCode(tx,id,this.ports.deliveryKey) });
    this.invitations = new InvitationService(this.context, { enroll: this.membership.enroll.bind(this.membership) });
    const readyClassroomFile = createReadyClassroomFile(this.context.ports.files);
    this.plan = new PlanService(this.context);
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
  deleteDraft(...args: Parameters<DraftService['deleteDraft']>): ReturnType<DraftService['deleteDraft']> { return this.drafts.deleteDraft(...args); }
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
  reserveInvitationBatch(...args: Parameters<InvitationService['reserveInvitationBatch']>): ReturnType<InvitationService['reserveInvitationBatch']> { return this.invitations.reserveInvitationBatch(...args); }
  readInvitationBatch(...args: Parameters<InvitationService['readInvitationBatch']>): ReturnType<InvitationService['readInvitationBatch']> { return this.invitations.readInvitationBatch(...args); }
  emitInvitationBatchRecipient(...args: Parameters<InvitationService['emitInvitationBatchRecipient']>): ReturnType<InvitationService['emitInvitationBatchRecipient']> { return this.invitations.emitInvitationBatchRecipient(...args); }
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
  readAllNotifications(...args: Parameters<WallService['readAllNotifications']>): ReturnType<WallService['readAllNotifications']> { return this.wall.readAllNotifications(...args); }
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
  savePracticalResponse(...args: Parameters<PracticalSubmissionService['savePracticalResponse']>): ReturnType<PracticalSubmissionService['savePracticalResponse']> { return this.practical.savePracticalResponse(...args); }
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


function bindClassroomMethods(service: ClassroomService): void {
  bindGroup1(service);
  bindGroup2(service);
  bindGroup3(service);
  bindGroup4(service);
}
function bindGroup1(service: ClassroomService): void {
  service.search = service.search.bind(service);
  service.createDraft = service.createDraft.bind(service);
  service.listDrafts = service.listDrafts.bind(service);
  service.getDraft = service.getDraft.bind(service);
  service.saveDraft = service.saveDraft.bind(service);
  service.publishDraft = service.publishDraft.bind(service);
  service.updateSettings = service.updateSettings.bind(service);
  service.rotateCode = service.rotateCode.bind(service);
  service.previewCode = service.previewCode.bind(service);
  service.confirmCode = service.confirmCode.bind(service);
  service.leave = service.leave.bind(service);
  service.remove = service.remove.bind(service);
  service.setArchive = service.setArchive.bind(service);
  service.members = service.members.bind(service);
  service.studentSummary = service.studentSummary.bind(service);
  service.invite = service.invite.bind(service);
  service.reserveInvitationBatch = service.reserveInvitationBatch.bind(service);
  service.readInvitationBatch = service.readInvitationBatch.bind(service);
  service.emitInvitationBatchRecipient = service.emitInvitationBatchRecipient.bind(service);
  service.revokeInvitation = service.revokeInvitation.bind(service);
  service.pendingInvitations = service.pendingInvitations.bind(service);
  service.listInvitations = service.listInvitations.bind(service);
  service.acceptInvitation = service.acceptInvitation.bind(service);
  service.changePlan = service.changePlan.bind(service);
}
function bindGroup2(service: ClassroomService): void {
  service.listMaterials = service.listMaterials.bind(service);
  service.changeLibrary = service.changeLibrary.bind(service);
  service.listWall = service.listWall.bind(service);
  service.wallThread = service.wallThread.bind(service);
  service.listWallReplies = service.listWallReplies.bind(service);
  service.changeWall = service.changeWall.bind(service);
  service.listNotifications = service.listNotifications.bind(service);
  service.listNotificationPage = service.listNotificationPage.bind(service);
  service.readNotification = service.readNotification.bind(service);
  service.readAllNotifications = service.readAllNotifications.bind(service);
  service.openNotification = service.openNotification.bind(service);
  service.listActivities = service.listActivities.bind(service);
  service.activityDetail = service.activityDetail.bind(service);
  service.activityDeadlineChoices = service.activityDeadlineChoices.bind(service);
  service.changeActivities = service.changeActivities.bind(service);
  service.activitySession = service.activitySession.bind(service);
  service.startActivity = service.startActivity.bind(service);
  service.transferAttemptEditor = service.transferAttemptEditor.bind(service);
  service.activityEligibility = service.activityEligibility.bind(service);
  service.authorizeFirstSubmission = service.authorizeFirstSubmission.bind(service);
  service.removeAttemptAttachment = service.removeAttemptAttachment.bind(service);
}
function bindGroup3(service: ClassroomService): void {
  service.submitPracticalAttempt = service.submitPracticalAttempt.bind(service);
  service.savePracticalResponse = service.savePracticalResponse.bind(service);
  service.assignmentSubmissions = service.assignmentSubmissions.bind(service);
  service.assignmentSubmission = service.assignmentSubmission.bind(service);
  service.saveAttemptAnswer = service.saveAttemptAnswer.bind(service);
  service.submitQuestionnaireAttempt = service.submitQuestionnaireAttempt.bind(service);
  service.activityHistory = service.activityHistory.bind(service);
  service.activitySubmissions = service.activitySubmissions.bind(service);
  service.activityAttempt = service.activityAttempt.bind(service);
  service.reopenActivity = service.reopenActivity.bind(service);
  service.getAttemptGrading = service.getAttemptGrading.bind(service);
  service.saveAttemptGrading = service.saveAttemptGrading.bind(service);
  service.getGradingAi = service.getGradingAi.bind(service);
  service.applyGradingAi = service.applyGradingAi.bind(service);
  service.discardGradingAi = service.discardGradingAi.bind(service);
  service.publishAttemptGrade = service.publishAttemptGrade.bind(service);
  service.getAttemptResult = service.getAttemptResult.bind(service);
  service.getGradeCorrections = service.getGradeCorrections.bind(service);
  service.correctPublishedGrade = service.correctPublishedGrade.bind(service);
  service.classroom = service.classroom.bind(service);
  service.summary = service.summary.bind(service);
}
function bindGroup4(service: ClassroomService): void {
  service.mine = service.mine.bind(service);
  service.detail = service.detail.bind(service);
  service.progressView = service.progressView.bind(service);
  service.getProgress = service.getProgress.bind(service);
  service.getStudentProgress = service.getStudentProgress.bind(service);
  service.getStudentAiReport = service.getStudentAiReport.bind(service);
  service.run = service.run.bind(service);
}
