/** Minimal structural operations consumed by the curriculum/plan transport. */
export interface PlanHttpOperations {
    changePlan(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
}
