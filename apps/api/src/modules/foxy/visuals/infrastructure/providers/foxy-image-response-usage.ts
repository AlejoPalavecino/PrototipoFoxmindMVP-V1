type Usage = { inputTokens: number; outputTokens: number; textOutputTokens?: number; imageOutputTokens?: number };
function number(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function details(value: unknown, maximum: number): Map<string, number> | null {
  if (!Array.isArray(value) || value.length > 16) return null;
  let sum = 0; const counts = new Map<string, number>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || !['TEXT','IMAGE'].includes(item.modality) || counts.has(item.modality) || !number(item.tokenCount)) return null;
    counts.set(item.modality, item.tokenCount); sum += item.tokenCount; if (!Number.isSafeInteger(sum)) return null;
  }
  return sum === maximum ? counts : null;
}
export function imageUsage(value: unknown): Usage | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>, prompt = v.promptTokenCount, total = v.totalTokenCount;
  if (!number(prompt) || !prompt || !number(total) || total <= prompt) return null;
  if ((v.cachedContentTokenCount !== undefined && v.cachedContentTokenCount !== 0) || (v.toolUsePromptTokenCount !== undefined && v.toolUsePromptTokenCount !== 0)
    || v.cacheTokensDetails !== undefined || v.toolUsePromptTokensDetails !== undefined) return null;
  const candidates = v.candidatesTokenCount, thoughts = v.thoughtsTokenCount, output = total - prompt;
  if ((candidates !== undefined && !number(candidates)) || (thoughts !== undefined && !number(thoughts))) return null;
  if (number(candidates) && number(thoughts) && candidates + thoughts !== output) return null;
  if (number(candidates) && candidates > output || number(thoughts) && thoughts > output) return null;
  if (v.promptTokensDetails !== undefined && !details(v.promptTokensDetails,prompt)) return null;
  const usage: Usage = { inputTokens: prompt, outputTokens: output };
  if (v.candidatesTokensDetails !== undefined) {
    const counts = number(candidates) ? details(v.candidatesTokensDetails,candidates) : null;
    if (!counts) return null;
    if (number(thoughts) || candidates === output) {
      usage.textOutputTokens = (counts.get('TEXT') ?? 0) + (thoughts ?? 0);
      usage.imageOutputTokens = counts.get('IMAGE') ?? 0;
    }
  }
  return usage;
}
