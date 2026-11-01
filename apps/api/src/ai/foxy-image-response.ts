import { imageUsage } from './foxy-image-response-usage.ts';
type ImageResponse = { bytes: Uint8Array; declaredMimeType: 'image/png' | 'image/jpeg'; usage: { inputTokens: number; outputTokens: number } | null };
type Reason = 'RESPONSE_SHAPE' | 'PROMPT_BLOCKED' | 'CANDIDATE_COUNT' | 'FINISH_REASON' | 'PART_SHAPE' | 'PART_FIELDS' | 'SIGNATURE_LIMIT' | 'DATA_VARIANT' | 'TEXT_LIMIT' | 'MIME' | 'BASE64' | 'BYTE_LIMIT' | 'RASTER_SIGNATURE' | 'MISSING_FINAL_IMAGE' | 'MULTIPLE_FINAL_IMAGES';
function invalid(reason: Reason): never { const error = Object.assign(new Error('INVALID_AI_OUTPUT'), { code: 'INVALID_AI_OUTPUT' }); Object.defineProperty(error, 'diagnosticReason', { value: reason }); throw error; }
function record(value: unknown): value is Record<string, unknown> { return !!value && typeof value === 'object' && !Array.isArray(value); }
function image(value: unknown): { bytes: Uint8Array; mime: ImageResponse['declaredMimeType'] } {
  if (!record(value) || (value.mimeType !== 'image/png' && value.mimeType !== 'image/jpeg')) return invalid('MIME');
  if (typeof value.data !== 'string' || !value.data.length || value.data.length % 4 !== 0 || /[^A-Za-z0-9+/=]/u.test(value.data)) return invalid('BASE64');
  if (value.data.length > 13981016) return invalid('BYTE_LIMIT');
  const bytes = Buffer.from(value.data, 'base64');
  if (!bytes.length || bytes.toString('base64') !== value.data) return invalid('BASE64');
  if (bytes.length > 10485760) return invalid('BYTE_LIMIT');
  const signature = value.mimeType === 'image/png' ? [137,80,78,71,13,10,26,10] : [255,216,255];
  if (bytes.length < signature.length || !signature.every((b,i) => bytes[i] === b)) return invalid('RASTER_SIGNATURE');
  return { bytes: Uint8Array.from(bytes), mime: value.mimeType };
}
export function parseGeminiFoxyImageResponse(response: unknown): ImageResponse {
  if (!record(response)) return invalid('RESPONSE_SHAPE');
  if (response.promptFeedback !== undefined && (!record(response.promptFeedback) || response.promptFeedback.blockReason !== undefined)) return invalid('PROMPT_BLOCKED');
  if (!Array.isArray(response.candidates) || response.candidates.length !== 1) return invalid('CANDIDATE_COUNT');
  const candidate = response.candidates[0];
  if (!record(candidate)) return invalid('RESPONSE_SHAPE');
  if (candidate.finishReason !== 'STOP') return invalid('FINISH_REASON');
  if (!record(candidate.content) || !Array.isArray(candidate.content.parts) || candidate.content.parts.length > 64) return invalid('PART_SHAPE');
  let result: ReturnType<typeof image> | null = null, textBytes = 0;
  for (const part of candidate.content.parts) {
    if (!record(part)) return invalid('PART_SHAPE');
    if (Object.keys(part).some(key => !['thought','thoughtSignature','text','inlineData'].includes(key))) return invalid('PART_FIELDS');
    if (part.thought !== undefined && typeof part.thought !== 'boolean') return invalid('PART_SHAPE');
    if (part.thoughtSignature !== undefined && (typeof part.thoughtSignature !== 'string' || part.thoughtSignature.length > 65536)) return invalid('SIGNATURE_LIMIT');
    if ((part.text === undefined) === (part.inlineData === undefined)) return invalid('DATA_VARIANT');
    if (part.text !== undefined) { if (typeof part.text !== 'string') return invalid('PART_SHAPE'); textBytes += Buffer.byteLength(part.text); if (textBytes > 65536) return invalid('TEXT_LIMIT'); }
    else { const parsed = image(part.inlineData); if (part.thought !== true) { if (result) return invalid('MULTIPLE_FINAL_IMAGES'); result = parsed; } }
  }
  if (!result) return invalid('MISSING_FINAL_IMAGE');
  return { bytes: result.bytes, declaredMimeType: result.mime, usage: imageUsage(response.usageMetadata) };
}
