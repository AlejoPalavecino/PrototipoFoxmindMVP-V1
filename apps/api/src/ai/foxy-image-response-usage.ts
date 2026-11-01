type Usage = { inputTokens: number; outputTokens: number };
function number(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0; }
function details(value: unknown, maximum: number): boolean {
  if (!Array.isArray(value) || value.length > 16) return false;
  let sum = 0; const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== 'object' || !['TEXT','IMAGE'].includes(item.modality) || seen.has(item.modality) || !number(item.tokenCount)) return false;
    seen.add(item.modality); sum += item.tokenCount; if (!Number.isSafeInteger(sum)) return false;
  }
  return sum === maximum;
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
  if (v.candidatesTokensDetails !== undefined && (!number(candidates) || !details(v.candidatesTokensDetails,candidates))) return null;
  return { inputTokens: prompt, outputTokens: output };
}
