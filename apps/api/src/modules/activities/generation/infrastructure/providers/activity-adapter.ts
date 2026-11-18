import type { AiConfiguration } from '../../../../../platform/ai/configuration.ts';
import type { GeminiClient } from '../../../../../platform/ai/gemini-client.ts';
import type { AiTextClient } from '../../../../../platform/ai/text-client.ts';
import { injectedTextClient, textClientCompatibilityView } from '../../../../../platform/ai/sdk-text-compat.ts';
import { getNeutralAiTextClient } from '../../../../../platform/ai/profile-client.ts';
import { activityPromptVersion, configurationForJob, legacyActivityPromptVersion, previousActivityPromptVersion, snapshotForTask } from '../../../../../platform/ai/execution-snapshot.ts';
import { activityGenerationSchemaVersion, type ActivityGenerationInput, type StructuredActivityGenerationPort } from '../../../../../../../../src/core/domain/activities/activity-generation.ts';
import { activityGenerationResponseSchemaV1 } from '../../../../../../../../src/core/domain/activities/activity-proposal-schema.ts';
import { AiError } from '../../../../../platform/ai/errors.ts';
import { activityMessages, activitySystemInstruction, activitySystemInstructionV1, activitySystemInstructionV2 } from './activity-prompt.ts';
import { activityResponse } from './activity-response.ts';
type Configuration = Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs' | 'executionProfile'>;
const instructions = new Map([
 [legacyActivityPromptVersion, activitySystemInstructionV1],
 [previousActivityPromptVersion, activitySystemInstructionV2],
 [activityPromptVersion, activitySystemInstruction],
]);
export function createGeminiActivityGenerationAdapter(configuration: AiConfiguration) {
 const client = getNeutralAiTextClient(configuration, 'activities');
 const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, 'activities'), 'activities');
 return new GeminiActivityGenerationAdapter({ client, configuration: pinned });
}
export class GeminiActivityGenerationAdapter implements StructuredActivityGenerationPort {
 private readonly execution: AiTextClient;
 private readonly options: { client: GeminiClient; configuration: Configuration };
 private readonly systemInstruction: string;
 constructor(options: { client: GeminiClient | AiTextClient; configuration: Configuration }) {
  const promptVersion = options.configuration.executionProfile?.promptVersion ?? activityPromptVersion;
  const systemInstruction = instructions.get(promptVersion);
  if (!systemInstruction) throw new AiError('AI_UNAVAILABLE');
  this.systemInstruction = systemInstruction;
  this.execution = injectedTextClient(options.client, options.configuration, 'activities', true);
  this.options = { client: textClientCompatibilityView(this.execution, options.configuration, 'activities'), configuration: options.configuration };
 }
 private call(input: ActivityGenerationInput) {
  if (input.schemaVersion !== activityGenerationSchemaVersion) throw new AiError('AI_UNAVAILABLE');
  return { key: input, signal: input.signal, request: () => ({ system: this.systemInstruction,
   messages: activityMessages(input), schema: activityGenerationResponseSchemaV1 }) };
 }
 async countActivityTokens(input: ActivityGenerationInput): Promise<number> { return this.execution.count(this.call(input)); }
 async generateActivity(input: ActivityGenerationInput) { return activityResponse(await this.execution.generate(this.call(input)), input); }
}
