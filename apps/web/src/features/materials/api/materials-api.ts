import type { ClassroomClient } from '../../../../../../src/core/contracts/academic-client.ts';
import type { ActivitySummary } from '../../../../../../src/core/contracts/activities.ts';
import type { Material } from '../../../../../../src/core/contracts/materials.ts';
import type { MaterialsOperations } from '../model/materials-operations.ts';

export type MaterialsTransport = Pick<ClassroomClient, 'call' | 'uploadClassroom' | 'fileStatus' | 'fileUrl'>;

/** Reuses the host transport so session, CSRF, timeout and abort remain its responsibility. */
export function createMaterialsApi(transport: MaterialsTransport): MaterialsOperations {
  const list: MaterialsOperations['list'] = (classroomId, signal) =>
    transport.call<Material[]>(`/${classroomId}/library`, 'GET', undefined, signal);

  return {
    list,
    async findMaterial(classroomId, materialId, lookup = {}) {
      const materials = lookup.materials ?? await list(classroomId, lookup.signal);
      return materials.find(material => material.id === materialId);
    },
    async listActivities(classroomId, signal) {
      const result = await transport.call<{ activities: ActivitySummary[] }>(
        `/${classroomId}/activities`, 'GET', undefined, signal,
      );
      return result.activities;
    },
    async change(classroomId, revision, operation, signal) {
      await transport.call(`/${classroomId}/library`, 'POST', { revision, operation }, signal);
    },
    async upload(classroomId, file) {
      if (!transport.uploadClassroom) throw new Error('La carga de archivos no está disponible.');
      return transport.uploadClassroom(classroomId, file, 'material');
    },
    fileStatus: (fileId, signal) => transport.fileStatus(fileId, signal),
    fileUrl: (fileId, preview) => transport.fileUrl(fileId, preview),
  };
}
