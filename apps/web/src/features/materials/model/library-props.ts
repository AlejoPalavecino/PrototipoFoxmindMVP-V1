import type { Detail } from '../../../../../../src/core/contracts/classrooms.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import type { ClassroomCreationContext } from '../../../../../../src/core/contracts/academic-context.ts';
import type { MaterialsOperations } from './materials-operations.ts';
export interface LibraryProps {
    api: MaterialsOperations;
    room: Detail;
    reload: () => Promise<void>;
    targetMaterialId?: string;
    materials?: readonly Material[];
    material?: Material;
    openUpload?: boolean;
    uploadContext?: ClassroomCreationContext | null;
    onUploadContextConsumed?: () => void;
    active?: boolean;
    presentation?: 'library' | 'reader' | 'upload';
    onReaderClose?: () => void;
    onUploadClose?: () => void;
}
