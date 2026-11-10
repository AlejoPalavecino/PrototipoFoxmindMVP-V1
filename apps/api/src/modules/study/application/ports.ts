import type { FolderFields } from '../../../../../../src/core/domain/study/folders.ts';
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
 sources(tx: StudyQuery, row: FolderRow, options: Omit<StudyOptions, 'database' | 'authenticate'>): Promise<StudySource[]>;
}
export interface StudyApplicationPorts extends StudyCommandPorts {
 uow: StudentUnitOfWork;
 folders: FolderRepository;
 linkedClassrooms(tx: StudyQuery, owner: string): Promise<{ id: string; name: string; academicYear: number }[]>;
 verifyLink(tx: StudyQuery, owner: string, id: string | null): Promise<void>;
 digest(text: string): string;
}
export type StudyAgendaPort = NonNullable<StudyOptions['agenda']>;
export type StudyProviderPort = Pick<StudyOptions, 'generate' | 'feedback'>;
