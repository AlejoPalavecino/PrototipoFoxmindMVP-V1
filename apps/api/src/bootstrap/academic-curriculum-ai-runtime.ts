import { createDurableApprovedPlanReader } from '../modules/files/infrastructure/durable-plan-reader.ts';
import { type FileService } from '../modules/files/infrastructure/service.ts';
import { createGeminiExtractionAdapter } from '../modules/curriculum/infrastructure/providers/gemini-adapter.ts';
import { type AiConfiguration } from '../platform/ai/configuration.ts';
import { type StructuredExtractionPort } from '../../../../src/core/domain/index.ts';
import type { ClassroomPorts } from '../modules/classrooms/infrastructure/contracts.ts';
import { ClassroomAiService } from '../modules/curriculum/infrastructure/ai/service.ts';
import { ClassroomAiWorker } from '../modules/curriculum/infrastructure/ai/worker.ts';

import type { StructuredActivityGenerationPort } from '../../../../src/core/domain/index.ts';
import type { StudentAiProvider } from '../modules/grading/infrastructure/student-ai/worker.ts';
import type { GradingAiProvider } from '../modules/grading/infrastructure/grading-ai/runtime.ts';
export interface AiRuntimeOverride { provider: StructuredExtractionPort; activityProvider?: StructuredActivityGenerationPort;
  studentProvider?: StudentAiProvider; gradingProvider?: GradingAiProvider }
export class ClassroomAiRuntime {
  readonly service: ClassroomAiService;
  readonly worker: ClassroomAiWorker;
  constructor(database: ClassroomPorts['database'], authenticate: ClassroomPorts['authenticate'],
    files: FileService, configuration: AiConfiguration, override?: AiRuntimeOverride) {
    const reader = createDurableApprovedPlanReader({ files,
      authorize: (input, signal, tx) => this.worker.authorizeClaim(input, signal, tx) });
    const options = { database, authenticate, reader, configuration,
      provider: override?.provider ?? createGeminiExtractionAdapter(configuration) };
    this.service = new ClassroomAiService(options);
    this.worker = new ClassroomAiWorker(options);
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
