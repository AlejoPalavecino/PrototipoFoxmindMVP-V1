/** Minimal structural operations consumed by the participation/attempts transport. */
export interface AttemptsHttpOperations {
    activityHistory(request: unknown, classroomId: string, activityId: string): Promise<unknown>;
    activitySubmissions(request: unknown, classroomId: string, activityId: string): Promise<unknown>;
    reopenActivity(request: unknown, classroomId: string, activityId: string, input: unknown): Promise<unknown>;
    activityAttempt(request: unknown, classroomId: string, attemptId: string): Promise<unknown>;
    activitySession(request: unknown, classroomId: string, activityId: string): Promise<unknown>;
    activityEligibility(request: unknown, classroomId: string, activityId: string): Promise<unknown>;
    startActivity(request: unknown, classroomId: string, activityId: string, input: unknown): Promise<unknown>;
    authorizeFirstSubmission(request: unknown, classroomId: string, activityId: string, input: unknown): Promise<unknown>;
    transferAttemptEditor(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    saveAttemptAnswer(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    submitQuestionnaireAttempt(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    removeAttemptAttachment(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    submitPracticalAttempt(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    savePracticalResponse(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    assignmentSubmissions(request: unknown, classroomId: string, activityId: string): Promise<unknown>;
    assignmentSubmission(request: unknown, classroomId: string, attemptId: string): Promise<unknown>;
}
