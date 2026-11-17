/** Minimal structural operations consumed by the grading/review transport. */
export interface ReviewHttpOperations {
    getAttemptResult(request: unknown, classroomId: string, attemptId: string): Promise<unknown>;
    publishAttemptGrade(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    getGradeCorrections(request: unknown, classroomId: string, attemptId: string): Promise<unknown>;
    correctPublishedGrade(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    getGradingAi(request: unknown, classroomId: string, attemptId: string): Promise<unknown>;
    applyGradingAi(request: unknown, classroomId: string, attemptId: string, generationId: string, input: unknown): Promise<unknown>;
    discardGradingAi(request: unknown, classroomId: string, attemptId: string, generationId: string, input: unknown): Promise<unknown>;
    getAttemptGrading(request: unknown, classroomId: string, attemptId: string): Promise<unknown>;
    saveAttemptGrading(request: unknown, classroomId: string, attemptId: string, input: unknown): Promise<unknown>;
    getStudentAiReport(request: unknown, classroomId: string, studentId: string): Promise<unknown>;
    getProgress(request: unknown, classroomId: string): Promise<unknown>;
    getStudentProgress(request: unknown, classroomId: string, studentId: string): Promise<unknown>;
}
