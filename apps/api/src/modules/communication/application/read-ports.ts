import type { WallPageQuery, NotificationPageQuery } from '../../../../../../src/core/domain/index.ts';
import type { SqlTransaction } from '../../../../../../src/core/contracts/sql.ts';
import type { Actor } from '../../classrooms/public.ts';
type Room = {
    revision: bigint;
    teacher_id: string;
    archived_at: Date | null;
};
export interface WallReadPort {
    repliesPage: (tx: SqlTransaction, actor: Actor, room: Room, classroomId: string, postId: string, query?: WallPageQuery, anchor?: string | undefined) => Promise<{
        revision: string;
        postId: string;
        replies: {
            id: string;
            authorName: string;
            initials: string;
            body: string | null;
            createdAt: Date;
            editedAt: Date | null;
            removedAt: Date | null;
            canEdit: boolean;
            canRemove: boolean;
        }[];
        previousCursor: string | null;
        nextCursor: string | null;
    }>;
    feed: (tx: SqlTransaction, actor: Actor, room: Room, classroomId: string, query?: WallPageQuery) => Promise<{
        revision: string;
        posts: {
            title: string | null;
            type: "NOTICE" | "QUERY" | undefined;
            replies: {
                id: string;
                authorName: string;
                initials: string;
                body: string | null;
                createdAt: Date;
                editedAt: Date | null;
                removedAt: Date | null;
                canEdit: boolean;
                canRemove: boolean;
            }[];
            replyCount: number;
            repliesNextCursor: string | null;
            repliesPreviousCursor: string | null;
            id: string;
            authorName: string;
            initials: string;
            body: string | null;
            createdAt: Date;
            editedAt: Date | null;
            removedAt: Date | null;
            canEdit: boolean;
            canRemove: boolean;
        }[];
        nextCursor: string | null;
    }>;
    thread: (tx: SqlTransaction, actor: Actor, room: Room, classroomId: string, postId: string, anchor?: string | undefined) => Promise<{
        revision: string;
        post: {
            title: string | null;
            type: "NOTICE" | "QUERY" | undefined;
            replies: {
                id: string;
                authorName: string;
                initials: string;
                body: string | null;
                createdAt: Date;
                editedAt: Date | null;
                removedAt: Date | null;
                canEdit: boolean;
                canRemove: boolean;
            }[];
            replyCount: number;
            repliesNextCursor: string | null;
            repliesPreviousCursor: string | null;
            id: string;
            authorName: string;
            initials: string;
            body: string | null;
            createdAt: Date;
            editedAt: Date | null;
            removedAt: Date | null;
            canEdit: boolean;
            canRemove: boolean;
        };
    }>;
    notificationPage: (tx: SqlTransaction, actor: string, query?: NotificationPageQuery) => Promise<{
        items: object[];
        unreadCount: number;
        nextCursor: string | null;
    }>;
    readAllVisibleNotifications: (tx: SqlTransaction, actor: string) => Promise<{
        read: boolean;
        updatedCount: number;
    }>;
}
