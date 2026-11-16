import Anthropic from '@anthropic-ai/sdk';
import type { MessageCreateParamsNonStreaming, MessageCountTokensParams, MessageParam } from '@anthropic-ai/sdk/resources/messages';
import type { AiTextTransport, AiTransportRequest, AiTextResult } from './text-contract.ts';
import { anthropicUsage } from './usage.ts';

export interface AnthropicTextClient {
  messages: {
    countTokens(input: MessageCountTokensParams, options?: Parameters<Anthropic['messages']['countTokens']>[1]): Promise<{ input_tokens: number }>;
    create(input: MessageCreateParamsNonStreaming, options?: Parameters<Anthropic['messages']['create']>[1]): Promise<{
      content: { type: string; text?: string }[]; stop_reason: string | null; usage?: unknown;
    }>;
  };
}

function messages(input: AiTransportRequest): MessageParam[] {
  return input.messages.map(message => ({ role: message.role,
    content: message.parts.map(part => part.kind === 'text' ? { type: 'text' as const, text: part.text } : {
      type: 'document' as const,
      source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: Buffer.from(part.bytes).toString('base64') },
    }),
  }));
}

function finish(reason: string | null): AiTextResult['finish'] {
  if (reason === 'end_turn' || reason === 'stop_sequence') return 'stop';
  if (reason === 'max_tokens' || reason === 'model_context_window_exceeded') return 'length';
  return reason === 'refusal' ? 'blocked' : 'other';
}

export function createAnthropicTextTransport(options: {
  apiKey: string; deadlineMs: number; client?: AnthropicTextClient;
}): AiTextTransport {
  const { deadlineMs } = options;
  if (!Number.isSafeInteger(deadlineMs) || deadlineMs <= 0) throw new TypeError('Invalid AI deadline');
  if (!options.client && (typeof options.apiKey !== 'string' || !options.apiKey.trim())) throw new TypeError('Invalid AI credential');
  const client: AnthropicTextClient = options.client ?? new Anthropic({ apiKey: options.apiKey, timeout: deadlineMs, maxRetries: 0 });
  const params = (input: AiTransportRequest): MessageCountTokensParams => ({
    model: input.model, system: input.system, messages: messages(input),
    ...(input.schema ? { output_config: { format: { type: 'json_schema', schema: input.schema } } } : {}),
  });
  const requestOptions = (input: AiTransportRequest) => ({ signal: input.signal, timeout: deadlineMs, maxRetries: 0 });
  return {
    provider: 'anthropic',
    async count(input) {
      input.signal.throwIfAborted();
      const result = await client.messages.countTokens(params(input), requestOptions(input));
      if (!Number.isSafeInteger(result.input_tokens) || result.input_tokens < 0) throw new TypeError('Invalid AI token count');
      return result.input_tokens;
    },
    async generate(input) {
      input.signal.throwIfAborted();
      const result = await client.messages.create({ ...params(input), max_tokens: input.maxOutputTokens, stream: false }, requestOptions(input));
      return { text: result.content.filter(part => part.type === 'text').map(part => part.text ?? '').join(''),
        finish: finish(result.stop_reason), usage: anthropicUsage(result.usage) };
    },
  };
}
