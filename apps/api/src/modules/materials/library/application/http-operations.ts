/** Minimal structural operations consumed by the materials/library transport. */
export interface LibraryHttpOperations {
    listMaterials(request: unknown, classroomId: string): Promise<unknown>;
    changeLibrary(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
}
