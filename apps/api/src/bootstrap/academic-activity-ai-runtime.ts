import { createDurableActivitySourceReader } from '../modules/files/infrastructure/activity-source-reader.ts';
import { type FileService } from '../modules/files/infrastructure/service.ts';
import { createGeminiActivityGenerationAdapter } from '../modules/activities/infrastructure/providers/activity-adapter.ts';
import { type AiConfiguration } from '../platform/ai/configuration.ts';
import type { StructuredActivityGenerationPort } from '../../../../src/core/domain/index.ts';
import type { ActivityAiAccess } from '../modules/activities/infrastructure/activity-ai/contracts.ts';
import { ActivityAiService } from '../modules/activities/infrastructure/activity-ai/service.ts';
import { ActivityAiWorker } from '../modules/activities/infrastructure/activity-ai/worker.ts';
export class ActivityAiRuntime {
  readonly service: ActivityAiService;
  readonly worker: ActivityAiWorker;
  constructor(access: ActivityAiAccess, files: FileService, configuration: AiConfiguration,
    provider?: StructuredActivityGenerationPort) {
    const reader = createDurableActivitySourceReader({ files,
      authorize: (grant, signal, tx) => this.worker.authorizeClaim(grant, signal, tx) });
    const options = { access, reader, configuration,
      provider: provider ?? createGeminiActivityGenerationAdapter(configuration) };
    this.service = new ActivityAiService(options);
    this.worker = new ActivityAiWorker(options);
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
