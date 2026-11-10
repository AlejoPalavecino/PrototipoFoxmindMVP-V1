

export type { WallContent, WallPost, WallData, WallRepliesPage, WallThreadData } from '../domain/index.ts';

export interface WallTarget { classroomId: string; postId: string; replyId: string | null }
