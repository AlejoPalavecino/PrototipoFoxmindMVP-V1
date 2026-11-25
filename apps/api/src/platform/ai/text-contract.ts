export type AiProvider = 'gemini' | 'anthropic';
export type AiTask = 'curriculum' | 'activities' | 'analysis' | 'grading' | 'foxy' | 'study';
export type AiCapability = 'text' | 'pdf' | 'json';
export interface AiTextProfile {
  readonly id: string;
  readonly version: string;
  readonly task: AiTask;
  readonly provider: AiProvider;
  readonly model: string;
  readonly capabilities: readonly AiCapability[];
  readonly maxInputTokens: number;
  readonly maxOutputTokens: number;
  readonly deadlineMs: number;
  readonly maxDocumentBytes: number;
}
export type AiPart = { kind: 'text'; text: string } | { kind: 'pdf'; bytes: Uint8Array };
export type AiThinking = 'minimal' | 'low' | 'medium' | 'high';
/** Optional per-request generation hints; providers that cannot honor one ignore it. */
export interface AiTextTuning {
  thinking?: AiThinking;
  temperature?: number;
}
export interface AiTextRequest {
  system: string;
  messages: { role: 'user' | 'assistant'; parts: AiPart[] }[];
  schema?: Record<string, unknown>;
  tuning?: AiTextTuning;
}
export interface AiTransportRequest extends AiTextRequest {
  model: string;
  maxOutputTokens: number;
  signal: AbortSignal;
}
export interface AiTextUsage {
  inputTokens: number | null;
  outputTokens: number | null;
  reasoningTokens: number | null;
  cachedInputTokens: number | null;
}
export interface AiTextResult {
  text: string;
  finish: 'stop' | 'length' | 'blocked' | 'other';
  usage: AiTextUsage;
}
export type AiTextPreview = (accumulatedText: string | undefined) => void;
export interface AiTextTransport {
  readonly provider: AiProvider;
  count(input: AiTransportRequest): Promise<number>;
  generate(input: AiTransportRequest): Promise<AiTextResult>;
  stream?(input: AiTransportRequest, preview: AiTextPreview): Promise<AiTextResult>;
}
