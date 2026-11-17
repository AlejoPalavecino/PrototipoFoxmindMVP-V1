import { createDurableActivitySourceReader } from '../modules/files/custody/infrastructure/activity-source-reader.ts';
import { type FileService } from '../modules/files/custody/infrastructure/service.ts';
import { createGeminiActivityGenerationAdapter } from '../modules/activities/generation/infrastructure/providers/activity-adapter.ts';
import { type AiConfiguration } from '../platform/ai/configuration.ts';
import type { StructuredActivityGenerationPort } from '../../../../src/core/domain/activities/activity-generation.ts';
import type { ActivityAiAccess } from '../modules/activities/generation/infrastructure/activity-ai/contracts.ts';
import { ActivityAiService } from '../modules/activities/generation/infrastructure/activity-ai/service.ts';
import { ActivityAiWorker } from '../modules/activities/generation/infrastructure/activity-ai/worker.ts';
import type { ClassroomAiConfiguration } from '../modules/curriculum/generation/application/ai-contracts.ts';
export class ActivityAiRuntime {
  readonly service: ActivityAiService;
  readonly worker: ActivityAiWorker;
  constructor(access: ActivityAiAccess, files: FileService, configuration: AiConfiguration,
    provider?: StructuredActivityGenerationPort) {
    const reader = createDurableActivitySourceReader({ files,
      authorize: (grant, signal, tx) => this.worker.authorizeClaim(grant, signal, tx) });
    const options = { access, reader, configuration,
      provider: provider ?? createGeminiActivityGenerationAdapter(configuration),
      providerForExecution: provider ? undefined : (config: ClassroomAiConfiguration) => createGeminiActivityGenerationAdapter({ ...configuration, ...config }) };
    this.service = new ActivityAiService(options);
    this.worker = new ActivityAiWorker(options);
  }
  onModuleInit(): void { this.worker.onModuleInit(); }
  onModuleDestroy(): Promise<void> { return this.worker.onModuleDestroy(); }
}
