

export type { WallContent, WallPost, WallData, WallRepliesPage, WallThreadData } from '../domain/communication/wall.ts';

export interface WallTarget { classroomId: string; postId: string; replyId: string | null }
