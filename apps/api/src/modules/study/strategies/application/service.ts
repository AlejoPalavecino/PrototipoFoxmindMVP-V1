import type { SharedStudyStrategyView, StudentSharedStudyStrategy } from '../../../../../../../src/core/contracts/study-shared-strategy.ts';
import { studyFail, studyId } from '../../../../../../../src/core/domain/study/folders.ts';
import { parsePutSharedStudyStrategy } from '../../../../../../../src/core/domain/study/shared-strategy.ts';
import type { StudyQuery } from '../../application/contracts.ts';
import type { StudentUnitOfWork } from '../../application/ports.ts';

export interface StrategyFolder {
  status: string;
  linkedClassroomId: string | null;
}

export interface SharedStudyStrategyRepository {
  folder(tx: StudyQuery, folderId: string, owner: string, write: boolean): Promise<StrategyFolder | undefined>;
  audience(tx: StudyQuery, owner: string, classroomId: string): Promise<string | undefined>;
  visibleToStudent(tx: StudyQuery, folderId: string, owner: string): Promise<StudentSharedStudyStrategy | undefined>;
  currentId(tx: StudyQuery, folderId: string): Promise<string | undefined>;
  upsert(tx: StudyQuery, input: StudentSharedStudyStrategy & { folderId: string; periodId: string }): Promise<StudentSharedStudyStrategy>;
  withdraw(tx: StudyQuery, folderId: string, strategyId: string): Promise<void>;
}

export function createSharedStudyStrategyService(
  uow: StudentUnitOfWork,
  repository: SharedStudyStrategyRepository,
  newId: () => string,
) {
  async function ownFolder(tx: StudyQuery, folderId: string, owner: string, write: boolean) {
    return await repository.folder(tx, folderId, owner, write) ?? studyFail('FORBIDDEN');
  }

  return {
    get(request: unknown, inputFolderId: string): Promise<SharedStudyStrategyView> {
      const folderId = studyId(inputFolderId);
      return uow.run(request, false, async (tx, owner) => {
        await ownFolder(tx, folderId, owner, false);
        return { strategy: await repository.visibleToStudent(tx, folderId, owner) ?? null };
      });
    },
    publish(request: unknown, inputFolderId: string, input: unknown): Promise<SharedStudyStrategyView> {
      const folderId = studyId(inputFolderId);
      const { classroomId, text } = parsePutSharedStudyStrategy(input);
      return uow.run(request, true, async (tx, owner) => {
        const folder = await ownFolder(tx, folderId, owner, true);
        if (folder.status !== 'ACTIVE' || folder.linkedClassroomId?.toLowerCase() !== classroomId) return studyFail('FORBIDDEN');
        const periodId = await repository.audience(tx, owner, classroomId);
        if (!periodId) return studyFail('FORBIDDEN');
        const strategy = await repository.upsert(tx, { id: newId(), folderId, classroomId, periodId, text });
        return { strategy };
      });
    },
    withdraw(request: unknown, inputFolderId: string, inputStrategyId: string): Promise<SharedStudyStrategyView> {
      const folderId = studyId(inputFolderId);
      const strategyId = studyId(inputStrategyId).toLowerCase();
      return uow.run(request, true, async (tx, owner) => {
        await ownFolder(tx, folderId, owner, true);
        const currentId = await repository.currentId(tx, folderId);
        if (currentId && currentId !== strategyId) return studyFail('CONFLICT');
        if (currentId) await repository.withdraw(tx, folderId, strategyId);
        return { strategy: null };
      });
    },
  };
}

export type SharedStudyStrategyService = ReturnType<typeof createSharedStudyStrategyService>;
