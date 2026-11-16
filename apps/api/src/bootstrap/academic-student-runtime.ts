import type { AiConfiguration } from '../platform/ai/configuration.ts';
import { createStudentAiProvider } from '../modules/grading/infrastructure/student-ai/provider.ts';
import { StudentAiWorker, type StudentAiAccess, type StudentAiProvider } from '../modules/grading/infrastructure/student-ai/worker.ts';

export class StudentAiRuntime {
  readonly worker: StudentAiWorker;
  constructor(access: StudentAiAccess, configuration: AiConfiguration, provider?: StudentAiProvider) {
    this.worker = new StudentAiWorker({ ...access, configuration, provider: provider ?? createStudentAiProvider(configuration),
      ...(!provider ? { providerForExecution: (execution: AiConfiguration) => createStudentAiProvider(execution) } : {}) });
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
