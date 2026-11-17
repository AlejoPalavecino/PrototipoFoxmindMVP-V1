import { createHash } from 'node:crypto';
import type { CountTokensParameters, GenerateContentParameters } from '@google/genai';
import type { AiExecutionTask } from '../../../../../src/core/contracts/ai-execution.ts';
import type { AiConfiguration } from './configuration.ts';
import type { GeminiClient } from './gemini-client.ts';
import type { AiTextProfile, AiTextTransport } from './text-contract.ts';
import { AiError } from './errors.ts';
import { configurationForJob, snapshotForTask, executionConfigurationSource } from './execution-snapshot.ts';
import { createAiTextClient, normalizeTextError as normalized, type AiTextClient } from './text-client.ts';
import { legacyTextClient } from './sdk-text-compat.ts';
import { textProfileForSnapshot } from './text-profiles.ts';
import { createGeminiTextTransport } from './gemini-text-transport.ts';
import { createAnthropicTextTransport } from './anthropic-text-transport.ts';
import { getGeminiClient } from './sdk-clients.ts';
const clients = new WeakMap<AiConfiguration, Map<AiExecutionTask, { signature: string; client: AiTextClient }>>();
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail = (): never => { throw new AiError('AI_UNAVAILABLE'); };
export function countForExecution(client: GeminiClient, countRequest: CountTokensParameters, generationRequest: GenerateContentParameters) {
 return client.models.countForGeneration ? client.models.countForGeneration(generationRequest) : client.models.countTokens(countRequest);
}
export function createExecutionTransport(configuration: AiConfiguration, task: AiExecutionTask): AiTextTransport {
  try {
    const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, task), task);
    const snapshot = pinned.executionProfile;
    const key = snapshot.provider === 'anthropic' ? pinned.anthropicApiKey : pinned.apiKey;
    if (typeof key !== 'string' || !key.trim()) return fail();
    return snapshot.provider === 'gemini'
      ? createGeminiTextTransport({ apiKey: key, deadlineMs: snapshot.deadlineMs, client: getGeminiClient(executionConfigurationSource(configuration)) })
      : createAnthropicTextTransport({ apiKey: key, deadlineMs: snapshot.deadlineMs });
  } catch (error) { throw normalized(error); }
}

export function getNeutralAiTextClient(configuration: AiConfiguration, task: AiExecutionTask): AiTextClient {
  try {
    const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, task), task);
    const snapshot = pinned.executionProfile;
    const key = snapshot.provider === 'anthropic' ? pinned.anthropicApiKey : pinned.apiKey;
    if (typeof key !== 'string' || !key.trim()) return fail();
    const signature = hash({ snapshot, key: snapshot.provider === 'anthropic' ? pinned.anthropicApiKey : pinned.apiKey });
    // A pinned configuration belongs to one job. Share only the underlying SDK;
    // preflight tickets and deadlines must never be shared across jobs.
    const byTask = clients.get(configuration) ?? new Map();
    const existing = byTask.get(task);
    if (existing?.signature === signature) return existing.client;
    const profile: AiTextProfile = { id: snapshot.profileId, version: snapshot.profileVersion, task, provider: snapshot.provider,
      model: snapshot.model, capabilities: ['text', 'pdf', 'json'], maxInputTokens: snapshot.maxInputTokens, maxOutputTokens: snapshot.maxOutputTokens,
      deadlineMs: snapshot.deadlineMs, maxDocumentBytes: snapshot.maxDocumentBytes };
    const transport = createExecutionTransport(configuration, task);
    const client = createAiTextClient({ profile, transport });
    byTask.set(task, { signature, client }); clients.set(configuration, byTask);
    return client;
  } catch (error) { throw normalized(error); }
}

/** Compatibility surface only: serialization delegates to the same neutral preflight client. */
export function getAiTextClient(configuration: AiConfiguration, task: AiExecutionTask): GeminiClient {
 const client = getNeutralAiTextClient(configuration, task);
 const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, task), task);
 return legacyTextClient(client, textProfileForSnapshot(pinned.executionProfile));
}
