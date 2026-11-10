import type { Transaction } from '../../classrooms/public.ts';
/** Updates topics under the classroom transaction and lock acquired by the caller. */
export interface TopicProgressRepository {
 lock(tx: Transaction, topicId: string, classroomId: string): Promise<boolean>;
 resetNext(tx: Transaction, classroomId: string, exceptTopicId: string): Promise<void>;
 set(tx: Transaction, topicId: string, status: 'PENDING' | 'NEXT' | 'TAUGHT'): Promise<void>;
}
