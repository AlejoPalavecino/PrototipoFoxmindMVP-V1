import type { MuroPost } from '../../../types';

export type { MuroPost, MuroComment } from '../../../types';
export type WallRole = 'docente' | 'alumno';
export interface WallPublication {
  role: WallRole;
  title: string;
  content: string;
  isPinned: boolean;
  attachment: MuroPost['attachment'] | null;
}
export interface ClassroomWallRepository {
  read(): MuroPost[];
  replace(posts: MuroPost[]): void;
}
