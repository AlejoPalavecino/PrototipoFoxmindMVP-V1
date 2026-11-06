import type { ClassroomService } from './composition.ts';

export function bindClassroomMethods(service: ClassroomService): void {
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
