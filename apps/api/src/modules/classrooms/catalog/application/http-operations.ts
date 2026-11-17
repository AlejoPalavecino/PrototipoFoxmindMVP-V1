/** Minimal structural operations consumed by the classrooms/catalog transport. */
export interface CatalogHttpOperations {
    mine(request: unknown): Promise<unknown>;
    search(request: unknown, query: URLSearchParams): Promise<unknown>;
    listDrafts(request: unknown): Promise<unknown>;
    createDraft(request: unknown): Promise<unknown>;
    getDraft(request: unknown, draftId: string): Promise<unknown>;
    saveDraft(request: unknown, draftId: string, input: unknown): Promise<unknown>;
    deleteDraft(request: unknown, draftId: string, input: unknown): Promise<unknown>;
    publishDraft(request: unknown, draftId: string, input: unknown): Promise<unknown>;
    previewCode(request: unknown, code: unknown): Promise<unknown>;
    confirmCode(request: unknown, confirmation: unknown): Promise<unknown>;
    pendingInvitations(request: unknown): Promise<unknown>;
    declineInvitation(request: unknown, invitationId: string): Promise<unknown>;
    acceptInvitation(request: unknown, invitationId: string): Promise<unknown>;
    detail(request: unknown, classroomId: string): Promise<unknown>;
    updateSettings(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
    setArchive(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
    rotateCode(request: unknown, classroomId: string): Promise<unknown>;
    members(request: unknown, classroomId: string, includeHistory: boolean): Promise<unknown>;
    studentSummary(request: unknown, classroomId: string, studentId: string): Promise<unknown>;
    listInvitations(request: unknown, classroomId: string): Promise<unknown>;
    invite(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
    reserveInvitationBatch(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
    readInvitationBatch(request: unknown, classroomId: string, batchId: string): Promise<unknown>;
    emitInvitationBatchRecipient(request: unknown, classroomId: string, batchId: string, index: number): Promise<unknown>;
    revokeInvitation(request: unknown, classroomId: string, invitationId: string): Promise<unknown>;
    leave(request: unknown, classroomId: string): Promise<unknown>;
    remove(request: unknown, classroomId: string, studentId: string): Promise<unknown>;
}
