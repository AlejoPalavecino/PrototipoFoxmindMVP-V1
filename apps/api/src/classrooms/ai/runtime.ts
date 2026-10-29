import { createDurableApprovedPlanReader, type FileService } from '../../files/index.ts';
import { createGeminiExtractionAdapter, type AiConfiguration, type StructuredExtractionPort } from '../../ai/index.ts';
import type { ClassroomPorts } from '../contracts.ts';
import { ClassroomAiService } from './service.ts';
import { ClassroomAiWorker } from './worker.ts';

import type { StructuredActivityGenerationPort } from '../../../../../src/core/domain/index.ts';
import type { StudentAiProvider } from '../student-ai/worker.ts';
import type { GradingAiProvider } from '../grading-ai/runtime.ts';
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
