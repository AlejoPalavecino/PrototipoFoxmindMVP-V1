/** Minimal structural operations consumed by the activities/authoring transport. */
export interface AuthoringHttpOperations {
    listActivities(request: unknown, classroomId: string): Promise<unknown>;
    changeActivities(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
    activityDeadlineChoices(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
    activityDetail(request: unknown, classroomId: string, activityId: string, preview?: boolean): Promise<unknown>;
}
