import { getNeutralAiTextClient } from '../../../../../platform/ai/profile-client.ts';
import { configurationForJob, snapshotForTask } from '../../../../../platform/ai/execution-snapshot.ts';
import type { AiConfiguration } from '../../../../../platform/ai/configuration.ts';
import type { GeminiClient } from '../../../../../platform/ai/gemini-client.ts';
import type { AiTextClient } from '../../../../../platform/ai/text-client.ts';
import { injectedTextClient, textClientCompatibilityView } from '../../../../../platform/ai/sdk-text-compat.ts';
import type { StudentAiProvider } from './worker.ts';
type Input = Parameters<StudentAiProvider['countStudentAiTokens']>[0];
const instruction = 'Analiza únicamente los hechos educativos anónimos suministrados. '
  + 'No infieras identidad, diagnósticos ni características personales. No inventes evidencia. '
  + 'Cada hallazgo debe citar al menos una referencia de actividad existente. '
  + 'Escribe en español sugerencias pedagógicas prudentes y menciona las limitaciones de los datos.';
const finding = { type: 'object', additionalProperties: false, required: ['text', 'evidenceRefs'],
  properties: { text: { type: 'string' }, evidenceRefs: { type: 'array', items: { type: 'string' } } } };
const schema = { type: 'object', additionalProperties: false,
  required: ['overview', 'strengths', 'supportNeeds', 'recommendations', 'limitations'], properties: {
    overview: { type: 'string' }, strengths: { type: 'array', items: finding },
    supportNeeds: { type: 'array', items: finding }, recommendations: { type: 'array', items: finding },
    limitations: { type: 'array', items: { type: 'string' } },
  } };
export function createStudentAiProvider(configuration: AiConfiguration): StudentAiProvider {
 const client = getNeutralAiTextClient(configuration, 'analysis');
 const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, 'analysis'), 'analysis');
 return new GeminiStudentAiProvider(client, pinned);
}
export class GeminiStudentAiProvider implements StudentAiProvider {
 private readonly execution: AiTextClient;
 private readonly client: GeminiClient;
 constructor(client: GeminiClient | AiTextClient, config: AiConfiguration) { this.execution = injectedTextClient(client, config, 'analysis'); this.client = textClientCompatibilityView(this.execution, config, 'analysis'); }
 private call(input: Input) {
  return { key: input, signal: input.signal, request: () => ({ system: instruction, schema,
   messages: [{ role: 'user' as const, parts: [{ kind: 'text' as const, text: JSON.stringify(input.evidence) }] }] }) };
 }
 async countStudentAiTokens(input: Input): Promise<number> { return this.execution.count(this.call(input)); }
 async generateStudentAi(input: Input) {
  const result = await this.execution.generate(this.call(input));
  if (Buffer.byteLength(result.text) > 262144) throw new Error('INVALID_AI_OUTPUT');
  return { json: JSON.parse(result.text) as unknown, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens };
 }
}
