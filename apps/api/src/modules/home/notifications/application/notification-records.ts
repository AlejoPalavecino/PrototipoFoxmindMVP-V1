export interface WallNotificationRow {
  id: string;
  classroomId: string;
  classroomName: string;
  eventType: 'WALL_NOTICE' | 'WALL_QUERY' | 'WALL_REPLY';
  postId: string;
  replyId: string | null;
  createdAt: Date;
  readAt: Date | null;
}

