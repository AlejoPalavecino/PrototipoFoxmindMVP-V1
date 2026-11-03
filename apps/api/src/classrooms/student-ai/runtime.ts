import type { AiConfiguration } from '../../ai/index.ts';
import { createStudentAiProvider } from './provider.ts';
import { StudentAiWorker, type StudentAiAccess, type StudentAiProvider } from './worker.ts';

export class StudentAiRuntime {
  readonly worker: StudentAiWorker;
  constructor(access: StudentAiAccess, configuration: AiConfiguration, provider?: StudentAiProvider) {
    this.worker = new StudentAiWorker({ ...access, configuration, provider: provider ?? createStudentAiProvider(configuration) });
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
