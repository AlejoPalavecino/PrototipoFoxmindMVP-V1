import type { ClassroomService } from '../service.ts';
import type { AiConfiguration } from '../../ai/index.ts';
import { createStudentAiProvider } from './provider.ts';
import { StudentAiWorker, type StudentAiProvider } from './worker.ts';

export class StudentAiRuntime {
  readonly worker: StudentAiWorker;
  constructor(classrooms: ClassroomService, configuration: AiConfiguration, provider?: StudentAiProvider) {
    this.worker = new StudentAiWorker({ classrooms, configuration, provider: provider ?? createStudentAiProvider(configuration) });
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
