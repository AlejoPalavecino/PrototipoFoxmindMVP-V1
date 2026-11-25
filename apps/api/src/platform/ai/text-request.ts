import type { AiPart, AiTextProfile, AiTextRequest, AiTextTuning } from './text-contract.ts';
import { executionFailure } from './text-profiles.ts';

function exact(value: unknown, keys: string[]): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !keys.includes(key))) throw executionFailure('AI_INPUT_LIMIT');
}
export function snapshotTextRequest(input: AiTextRequest, profile: AiTextProfile): AiTextRequest {
  exact(input, ['system', 'messages', 'schema', 'tuning']);
  if (typeof input.system !== 'string' || !Array.isArray(input.messages) || !input.messages.length || input.messages.length > 40)
    throw executionFailure('AI_INPUT_LIMIT');
  let documentBytes = 0, documents = 0, textBytes = Buffer.byteLength(input.system);
  const messages = input.messages.map(message => {
    exact(message, ['role', 'parts']);
    if (!['user', 'assistant'].includes(message.role) || !Array.isArray(message.parts) || !message.parts.length || message.parts.length > 50)
      throw executionFailure('AI_INPUT_LIMIT');
    const parts = message.parts.map((part): AiPart => {
      if (part?.kind === 'text') {
        exact(part, ['kind', 'text']);
        if (typeof part.text !== 'string') throw executionFailure('AI_INPUT_LIMIT');
        textBytes += Buffer.byteLength(part.text);
        return { kind: 'text', text: part.text };
      }
      if (part?.kind === 'pdf') {
        exact(part, ['kind', 'bytes']);
        if (!profile.capabilities.includes('pdf') || !(part.bytes instanceof Uint8Array) || !part.bytes.byteLength)
          throw executionFailure('AI_INPUT_LIMIT');
        documentBytes += part.bytes.byteLength; documents++;
        if (part.bytes.byteLength > 20_000_000 || documentBytes > profile.maxDocumentBytes || documents > (profile.task === 'grading' ? 20 : 6)) throw executionFailure('AI_INPUT_LIMIT');
        return { kind: 'pdf', bytes: new Uint8Array(part.bytes) };
      }
      throw executionFailure('AI_INPUT_LIMIT');
    });
    return { role: message.role, parts };
  });
  if (textBytes > Math.max(2_000_000, profile.maxDocumentBytes)) throw executionFailure('AI_INPUT_LIMIT');
  let schema: Record<string, unknown> | undefined;
  if (input.schema !== undefined) {
    if (!profile.capabilities.includes('json') || !input.schema || typeof input.schema !== 'object' || Array.isArray(input.schema))
      throw executionFailure();
    try {
      const json = JSON.stringify(input.schema);
      if (Buffer.byteLength(json) > 100_000) throw executionFailure();
      schema = JSON.parse(json);
    } catch { throw executionFailure(); }
  }
  let tuning: AiTextTuning | undefined;
  if (input.tuning !== undefined) {
    exact(input.tuning, ['thinking', 'temperature']);
    const { thinking, temperature } = input.tuning;
    if (thinking !== undefined && !['minimal', 'low', 'medium', 'high'].includes(thinking)) throw executionFailure();
    if (temperature !== undefined && (typeof temperature !== 'number' || !Number.isFinite(temperature) || temperature < 0 || temperature > 2))
      throw executionFailure();
    tuning = { ...(thinking ? { thinking } : {}), ...(temperature !== undefined ? { temperature } : {}) };
  }
  return { system: input.system, messages, ...(schema ? { schema } : {}), ...(tuning ? { tuning } : {}) };
}
