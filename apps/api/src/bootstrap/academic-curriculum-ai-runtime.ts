import { createDurableApprovedPlanReader } from '../modules/files/custody/infrastructure/durable-plan-reader.ts';
import { type FileService } from '../modules/files/custody/infrastructure/service.ts';
import { createGeminiExtractionAdapter } from '../modules/curriculum/generation/infrastructure/providers/gemini-adapter.ts';
import { type AiConfiguration } from '../platform/ai/configuration.ts';
import { type StructuredExtractionPort } from '../../../../src/core/domain/curriculum/ai.ts';
import type { ClassroomPorts } from '../modules/classrooms/access/application/runtime-ports.ts';
import { ClassroomAiService } from '../modules/curriculum/generation/infrastructure/ai/service.ts';
import { ClassroomAiWorker } from '../modules/curriculum/generation/infrastructure/ai/worker.ts';
import type { ClassroomAiConfiguration } from '../modules/curriculum/generation/application/ai-contracts.ts';

import type { StructuredActivityGenerationPort } from '../../../../src/core/domain/activities/activity-generation.ts';
import type { StudentAiProvider } from '../modules/grading/student-analysis/infrastructure/student-ai/worker.ts';
import type { GradingAiProvider } from '../modules/grading/assistance/infrastructure/grading-ai/runtime.ts';
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
      provider: override?.provider ?? createGeminiExtractionAdapter(configuration),
      providerForExecution: override ? undefined : (config: ClassroomAiConfiguration) => createGeminiExtractionAdapter({ ...configuration, ...config }) };
    this.service = new ClassroomAiService(options);
    this.worker = new ClassroomAiWorker(options);
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
