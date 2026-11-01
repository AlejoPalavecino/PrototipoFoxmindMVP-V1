import { imageUsage } from './foxy-image-response-usage.ts';
type ImageResponse = { bytes: Uint8Array; declaredMimeType: 'image/png' | 'image/jpeg'; usage: { inputTokens: number; outputTokens: number } | null };
function invalid(): never { throw Object.assign(new Error('INVALID_AI_OUTPUT'), { code: 'INVALID_AI_OUTPUT' }); }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function image(value: unknown): { bytes: Uint8Array; mime: ImageResponse['declaredMimeType'] } {
  if (!record(value) || (value.mimeType !== 'image/png' && value.mimeType !== 'image/jpeg') || typeof value.data !== 'string'
    || !value.data.length || value.data.length > 13981016 || value.data.length % 4 !== 0 || /[^A-Za-z0-9+/=]/u.test(value.data)) return invalid();
  const bytes = Buffer.from(value.data, 'base64');
  if (!bytes.length || bytes.length > 10485760 || bytes.toString('base64') !== value.data) return invalid();
  const signature = value.mimeType === 'image/png' ? [137,80,78,71,13,10,26,10] : [255,216,255];
  if (bytes.length < signature.length || !signature.every((b,i) => bytes[i] === b)) return invalid();
  return { bytes: Uint8Array.from(bytes), mime: value.mimeType };
}
export function parseGeminiFoxyImageResponse(response: unknown): ImageResponse {
  if (!record(response) || (response.promptFeedback !== undefined && (!record(response.promptFeedback) || response.promptFeedback.blockReason !== undefined)) || !Array.isArray(response.candidates) || response.candidates.length !== 1) return invalid();
  const candidate = response.candidates[0];
  if (!record(candidate) || candidate.finishReason !== 'STOP' || !record(candidate.content) || !Array.isArray(candidate.content.parts) || candidate.content.parts.length > 64) return invalid();
  let result: ReturnType<typeof image> | null = null, textBytes = 0;
  for (const part of candidate.content.parts) {
    if (!record(part) || Object.keys(part).some(key => !['thought','thoughtSignature','text','inlineData'].includes(key))
      || (part.thought !== undefined && typeof part.thought !== 'boolean') || (part.thoughtSignature !== undefined && (typeof part.thoughtSignature !== 'string' || part.thoughtSignature.length > 65536))) return invalid();
    if ((part.text === undefined) === (part.inlineData === undefined)) return invalid();
    if (part.text !== undefined) { if (typeof part.text !== 'string') return invalid(); textBytes += Buffer.byteLength(part.text); if (textBytes > 65536) return invalid(); }
    else { const parsed = image(part.inlineData); if (part.thought !== true) { if (result) return invalid(); result = parsed; } }
  }
  if (!result) return invalid();
  return { bytes: result.bytes, declaredMimeType: result.mime, usage: imageUsage(response.usageMetadata) };
}
