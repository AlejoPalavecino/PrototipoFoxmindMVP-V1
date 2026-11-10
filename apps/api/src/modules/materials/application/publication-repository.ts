import type { Transaction } from '../../classrooms/public.ts';
import type { MaterialPublicationInput } from './ports.ts';
export interface MaterialPublicationRepository {
 classroom(tx: Transaction, classroomId: string, actorId: string): Promise<{ revision: bigint } | null>;
 unit(tx: Transaction, unitId: string, classroomId: string): Promise<boolean>;
 topic(tx: Transaction, topicId: string, unitId: string, classroomId: string): Promise<boolean>;
 linked(tx: Transaction, fileId: string): Promise<boolean>;
 insert(tx: Transaction, materialId: string, input: MaterialPublicationInput, title: string, fileId: string, actorId: string): Promise<void>;
}
