import type { StudyUnit } from '../../../../../../src/core/domain/study/folders.ts';
import type { StudyQuery, StudyOptions, StudySource, FolderRow, StudySummaryRow } from './contracts.ts';
export interface StudentUnitOfWork {
 run<T>(request: unknown, write: boolean, operation: (tx: StudyQuery, owner: string) => Promise<T>): Promise<T>;
}
export interface FolderRepository {
 load(tx: StudyQuery, owner: string, id: unknown, write: boolean): Promise<FolderRow>;
 save(tx: StudyQuery, row: FolderRow, serialized: string): Promise<FolderRow>;
 list(tx: StudyQuery, owner: string): Promise<StudySummaryRow[]>;
 count(tx: StudyQuery, owner: string): Promise<bigint>;
 create(tx: StudyQuery, id: string, owner: string, status: string, serialized: string): Promise<FolderRow>;
}
export interface StudyCommandPorts extends Omit<StudyOptions, 'database' | 'authenticate'> {
 newId(): string;
 importPlan(tx: StudyQuery, owner: string, id: string): Promise<{ revision: string; units: StudyUnit[] } | null>;
 sources(tx: StudyQuery, row: FolderRow, options: Omit<StudyOptions, 'database' | 'authenticate'>): Promise<StudySource[]>;
}
export interface StudyApplicationPorts extends StudyCommandPorts {
 uow: StudentUnitOfWork;
 folders: FolderRepository;
 linkedClassrooms(tx: StudyQuery, owner: string): Promise<{ id: string; name: string; academicYear: number; archived?: boolean }[]>;
 verifyLink(tx: StudyQuery, owner: string, id: string | null): Promise<void>;
 digest(text: string): string;
 createTimings?(flow: 'chat' | 'tool' | 'feedback'): {
  now(): number;
  stage(stage: 'prepare', durationMs: number, failure?: unknown): void;
  measure<T>(stage: 'persist', operation: () => Promise<T>, classify?: (result: T) => unknown): Promise<T>;
 };
}
export type StudyAgendaPort = NonNullable<StudyOptions['agenda']>;
export type StudyProviderPort = Pick<StudyOptions, 'generate' | 'feedback' | 'images'>;
