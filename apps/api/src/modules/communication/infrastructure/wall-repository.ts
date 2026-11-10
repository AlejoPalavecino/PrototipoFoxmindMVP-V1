import type { Transaction } from '../../classrooms/public.ts';
import type { WallRepository } from '../application/wall-repository.ts';
import { notificationSelection } from './notification-selection.ts';
export function createWallRepository(selections: {academic: string; grade: string}): WallRepository { return {
async readWallPosts01<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT id FROM wall_posts WHERE classroom_id=$1::uuid AND id=$2::uuid', ...values); },
async insertWallPosts02<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO wall_posts(id,updated_at,classroom_id,author_id,type,body,title)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::"PostType",$5,$6) RETURNING id`, ...values); },
async insertWallReplies03<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO wall_replies(id,updated_at,post_id,classroom_id,author_id,body)
          VALUES($1::uuid,clock_timestamp(),$2::uuid,$3::uuid,$4::uuid,$5) RETURNING id`, ...values); },
async updateWallPosts04<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('UPDATE wall_posts SET title=$2 WHERE id=$1::uuid RETURNING id', ...values); },
async updateNotifications05<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE ${fragment0} SET body=$2,edited_at=clock_timestamp(),updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, ...values); },
async updateNotifications06<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, fragment1: unknown, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE ${fragment0} SET ${fragment1}body=NULL,removed_at=clock_timestamp(),removed_by_id=$2::uuid,updated_at=clock_timestamp() WHERE id=$1::uuid RETURNING id`, ...values); },
async readNotifications07<T = Record<string, unknown>>(tx: Transaction, fragment0: unknown, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`SELECT id,author_id,removed_at FROM ${fragment0} WHERE id=$1::uuid AND classroom_id=$2::uuid FOR UPDATE`, ...values); },
async insertNotifications08<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`INSERT INTO notifications(id,updated_at,recipient_id,classroom_id,event_type,post_id,reply_id)
      SELECT gen_random_uuid(),clock_timestamp(),u.id,$1::uuid,$2,$3::uuid,$4::uuid FROM users u
      WHERE u.id<>$5::uuid AND ($6::uuid IS NULL OR u.id=$6::uuid)
      AND (($6::uuid IS NOT NULL AND u.id=$7::uuid) OR EXISTS(SELECT 1 FROM enrollments e JOIN membership_periods m ON m.enrollment_id=e.id
        WHERE e.classroom_id=$1::uuid AND e.student_id=u.id AND m.ended_at IS NULL))
      AND NOT EXISTS(SELECT 1 FROM notifications n WHERE n.recipient_id=u.id AND n.event_type=$2 AND n.post_id=$3::uuid
        AND n.reply_id IS NOT DISTINCT FROM $4::uuid) RETURNING id`, ...values); },
async readNotifications09<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>('SELECT classroom_id FROM notifications WHERE id=$1::uuid AND recipient_id=$2::uuid', ...values); },
async updateOF10<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`${notificationSelection} AND n.id=$2::uuid FOR UPDATE OF n`, ...values); },
async updateOF11<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`${selections.academic} AND n.id=$2::uuid FOR UPDATE OF n`, ...values); },
async updateOF12<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`${selections.grade} AND n.id=$2::uuid FOR UPDATE OF n`, ...values); },
async updateNotifications13<T = Record<string, unknown>>(tx: Transaction, ...values: unknown[]): Promise<T[]> { return tx.query<T>(`UPDATE notifications SET read_at=COALESCE(read_at,clock_timestamp()),
        updated_at=CASE WHEN read_at IS NULL THEN clock_timestamp() ELSE updated_at END WHERE id=$1::uuid RETURNING id`, ...values); }
}; }
