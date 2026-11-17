import type { WallPageQuery } from '../../../../../../../src/core/domain/communication/wall.ts';
/** Minimal structural operations consumed by the communication/wall transport. */
export interface WallHttpOperations {
    listWall(request: unknown, classroomId: string, query: WallPageQuery): Promise<unknown>;
    wallThread(request: unknown, classroomId: string, postId: string, replyId?: string): Promise<unknown>;
    listWallReplies(request: unknown, classroomId: string, postId: string, query: WallPageQuery): Promise<unknown>;
    changeWall(request: unknown, classroomId: string, input: unknown): Promise<unknown>;
}
