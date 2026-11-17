import type { FileState } from '../../../../../../src/core/contracts/materials.ts';
import type { MaterialMetadata } from '../model/materials-operations.ts';
export type MaterialKind = 'FILE' | 'TEXT';
export type WrittenSource = {
    file: FileState;
    snapshot: string;
};
export const emptyMaterial: MaterialMetadata = { title: '', unitId: null, topicId: null, body: '', resourceUse: 'STUDY' };
