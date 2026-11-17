import { createStudyClient } from '../api.ts';
import type { StudyFolderInput } from '../model/study-commands.ts';
const client = createStudyClient();
export const studyDraftOperations = {
  load: client.get,
  create: (data: StudyFolderInput) => client.create(data),
  save: (id: string, data: StudyFolderInput) => client.update(id, data),
  importPlan: (id: string, revision: string, classroomId: string) =>
    client.command(id, revision, 'IMPORT_CLASSROOM_PLAN', { classroomId }),
  analyzePlan: (id: string, revision: string) =>
    client.command(id, revision, 'GENERATE', { kind: 'PLAN' }),
  remove: (id: string, revision: string) =>
    client.command(id, revision, 'DELETE', { confirmed: true }),
};
export const studyFolderSettings = {
  save: (id: string, data: Pick<StudyFolderInput, 'revision' | 'units' | 'linkedClassroomId'>) =>
    client.update(id, data),
  setPlan: (id: string, revision: string, planFileId: string) =>
    client.update(id, { revision, planFileId }),
};
export async function readStudyDocxPreview(folderId: string, sourceId: string) {
  return client.call<{ text: string }>(
    `/${encodeURIComponent(folderId)}/docx-preview/${encodeURIComponent(sourceId)}`,
  );
}
