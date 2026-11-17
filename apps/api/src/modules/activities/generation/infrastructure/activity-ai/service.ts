import { ActivityAiService as Application } from '../../application/service.ts';
import type { ActivityAiOptions } from '../../application/ai-contracts.ts';
import { createActivityGenerationPorts } from './service-repository.ts';

/** Compatibility construction entry; orchestration lives in application. */
export class ActivityAiService extends Application {
  constructor(options: ActivityAiOptions) { super(options, createActivityGenerationPorts()); }
}
