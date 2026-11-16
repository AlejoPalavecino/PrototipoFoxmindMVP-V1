import type { Content, GenerateContentParameters } from '@google/genai';
import { getAiTextClient, countForExecution } from '../../../../platform/ai/profile-client.ts';
import { configurationForJob, snapshotForTask } from '../../../../platform/ai/execution-snapshot.ts';
import { createHash } from 'node:crypto';
import type { AiConfiguration } from '../../../../platform/ai/configuration.ts';
import type { GeminiClient } from '../../../../platform/ai/gemini-client.ts';
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
function contents(input: Input): Content[] {
  return [{ role: 'user', parts: [{ text: JSON.stringify(input.evidence) }] }];
}
function fingerprint(input: Input): string {
  return createHash('sha256').update(JSON.stringify(contents(input))).digest('hex');
}
const usage = (value: unknown): number | null => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
export function createStudentAiProvider(configuration: AiConfiguration): StudentAiProvider {
  const client = getAiTextClient(configuration, 'analysis');
  const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, 'analysis'), 'analysis');
  return new GeminiStudentAiProvider(client, pinned);
}
export class GeminiStudentAiProvider implements StudentAiProvider {
  private readonly verified = new WeakMap<Input, string>();
  private readonly client: GeminiClient;
  private readonly config: AiConfiguration;
  constructor(client: GeminiClient, config: AiConfiguration) { this.client = client; this.config = config; }
  async countStudentAiTokens(input: Input): Promise<number> {
    const hash = fingerprint(input);
    const response = await countForExecution(this.client, { model: this.config.model,
      contents: [{ role: 'user', parts: [{ text: `${instruction}\n${JSON.stringify(schema)}` }] }, ...contents(input)],
      config: { abortSignal: input.signal, httpOptions: { retryOptions: { attempts: 1 } } } }, this.generationRequest(input));
    if (!Number.isSafeInteger(response.totalTokens) || response.totalTokens! < 1
      || response.totalTokens! > this.config.maxInputTokens || hash !== fingerprint(input)) throw new Error('AI_INPUT_LIMIT');
    this.verified.set(input, hash);
    return response.totalTokens!;
  }
  async generateStudentAi(input: Input) {
    if (this.verified.get(input) !== fingerprint(input) || input.signal.aborted) throw new Error('AI_UNAVAILABLE');
    this.verified.delete(input);
    const response = await this.client.models.generateContent(this.generationRequest(input));
    if (response.promptFeedback?.blockReason || response.candidates?.length !== 1 || response.candidates[0]?.finishReason !== 'STOP'
      || typeof response.text !== 'string' || Buffer.byteLength(response.text) > 262144) throw new Error('INVALID_AI_OUTPUT');
    const json: unknown = JSON.parse(response.text);
    const output = usage(response.usageMetadata?.candidatesTokenCount);
    const thoughts = response.usageMetadata?.thoughtsTokenCount === undefined ? 0 : usage(response.usageMetadata.thoughtsTokenCount);
    return { json, inputTokens: usage(response.usageMetadata?.promptTokenCount),
      outputTokens: output === null || thoughts === null ? null : usage(output + thoughts) };
  }
  private generationRequest(input: Input): GenerateContentParameters {
    return { model: this.config.model, contents: contents(input), config: {
      abortSignal: input.signal, systemInstruction: instruction, responseMimeType: 'application/json', responseJsonSchema: schema,
      maxOutputTokens: this.config.maxOutputTokens, automaticContinuation: false, candidateCount: 1, temperature: 0,
      httpOptions: { retryOptions: { attempts: 1 } },
    } };
  }
}
