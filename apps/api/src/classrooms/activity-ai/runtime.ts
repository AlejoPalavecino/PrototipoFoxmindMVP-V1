import { createDurableActivitySourceReader, type FileService } from '../../files/index.ts';
import { createGeminiActivityGenerationAdapter, type AiConfiguration } from '../../ai/index.ts';
import type { StructuredActivityGenerationPort } from '../../../../../src/core/domain/index.ts';
import type { ActivityAuthoringService } from '../activity-authoring.ts';
import { ActivityAiService } from './service.ts';
import { ActivityAiWorker } from './worker.ts';
import { validateActivityGeneration } from './provenance.ts';
export class ActivityAiRuntime {
  readonly service: ActivityAiService;
  readonly worker: ActivityAiWorker;
  constructor(classrooms: ActivityAuthoringService, files: FileService, configuration: AiConfiguration,
    provider?: StructuredActivityGenerationPort) {
    const reader = createDurableActivitySourceReader({ files,
      authorize: (grant, signal, tx) => this.worker.authorizeClaim(grant, signal, tx) });
    const options = { classrooms, reader, configuration,
      provider: provider ?? createGeminiActivityGenerationAdapter(configuration) };
    this.service = new ActivityAiService(options);
    this.worker = new ActivityAiWorker(options);
    classrooms.ports.validateActivityGeneration = (tx, request, id) => validateActivityGeneration(options, tx, request, id);
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
