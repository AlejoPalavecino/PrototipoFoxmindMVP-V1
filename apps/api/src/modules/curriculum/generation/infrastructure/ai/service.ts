import { ClassroomAiService as Application } from '../../application/service.ts';
import type { ClassroomAiOptions } from '../../application/ai-contracts.ts';
import { createClassroomGenerationPorts } from './service-repository.ts';

/** Compatibility construction entry; orchestration lives in application. */
export class ClassroomAiService extends Application {
  constructor(options: ClassroomAiOptions) { super(options, createClassroomGenerationPorts()); }
}
