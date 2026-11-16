import type { AiTextUsage } from './text-contract.ts';

const record = (value: unknown): Record<string, unknown> =>
  value !== null && typeof value === 'object' ? value as Record<string, unknown> : {};
const tokens = (value: unknown): number | null =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
const optionalTokens = (value: unknown): number | null => value === undefined ? 0 : tokens(value);
const sum = (...values: (number | null)[]): number | null => {
  if (values.some(value => value === null)) return null;
  return tokens(values.reduce<number>((total, value) => total + value!, 0));
};

/** Gemini prompt count includes cache; candidate count excludes billable thoughts. */
export function geminiUsage(value: unknown): AiTextUsage {
  const usage = record(value);
  return {
    inputTokens: tokens(usage.promptTokenCount),
    outputTokens: sum(tokens(usage.candidatesTokenCount), optionalTokens(usage.thoughtsTokenCount)),
    reasoningTokens: tokens(usage.thoughtsTokenCount),
    cachedInputTokens: tokens(usage.cachedContentTokenCount),
  };
}

/** Anthropic input splits cache categories; output already includes reasoning. */
export function anthropicUsage(value: unknown): AiTextUsage {
  const usage = record(value);
  return {
    inputTokens: sum(tokens(usage.input_tokens), optionalTokens(usage.cache_creation_input_tokens), optionalTokens(usage.cache_read_input_tokens)),
    outputTokens: tokens(usage.output_tokens),
    reasoningTokens: tokens(record(usage.output_tokens_details).thinking_tokens),
    cachedInputTokens: tokens(usage.cache_read_input_tokens),
  };
}
