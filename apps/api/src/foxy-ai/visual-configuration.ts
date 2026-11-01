import type { AiConfiguration } from '../ai/index.ts';
import type { VisualConfiguration } from './visual-runtime.ts';
import type { VisualProfile } from './visual-repository.ts';
export interface FoxyVisualHostConfiguration { configuration: VisualConfiguration; providerDeadlineMs: number }
const invalid = (): never => { throw Object.assign(new Error('AI_UNAVAILABLE'),{ code: 'AI_UNAVAILABLE' }); };
function flag(env: Record<string,string|undefined>, name: string): boolean {
  const value=env[name]; if (value===undefined || value==='false') return false; if (value==='true') return true; return invalid();
}
function rate(value: string|undefined): { text: string; amount: bigint } {
  if (!value || !/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?$/u.test(value)) return invalid();
  const [whole,fraction='']=value.split('.'), amount=BigInt(whole!)*1000000n+BigInt(fraction.padEnd(6,'0'));
  if (amount===0n) return invalid(); return { text:value,amount };
}
function integer(value: string|undefined, maximum: number): number {
  if (!value || !/^[1-9][0-9]*$/u.test(value) || value.length>6) return invalid();
  const result=Number(value); if (!Number.isSafeInteger(result) || result>maximum) return invalid(); return result;
}
function quota(value: string|undefined): bigint {
  if (!value || !/^[1-9][0-9]*$/u.test(value) || value.length>19) return invalid();
  const result=BigInt(value); if (result<10485760n || result>9223372036854775807n) return invalid(); return result;
}
export function readFoxyVisualConfiguration(env: Record<string,string|undefined>, ai: AiConfiguration | null): FoxyVisualHostConfiguration | null {
  const image=flag(env,'AI_IMAGE_ENABLED'), diagram=flag(env,'AI_DIAGRAM_ENABLED'); if (!image && !diagram) return null;
  if (!ai || ai.backend!=='gemini-developer' || !Number.isSafeInteger(ai.maxJobAgeMs) || ai.maxJobAgeMs<180000
    || !Number.isSafeInteger(ai.maxConcurrency) || ai.maxConcurrency<1 || !Number.isSafeInteger(ai.deadlineMs) || ai.deadlineMs<1) return invalid();
  let imageProfile: VisualProfile | null=null, diagramProfile: VisualProfile | null=null;
  if (image) {
    const input=rate(env.AI_IMAGE_INPUT_USD_PER_MILLION), text=rate(env.AI_IMAGE_TEXT_OUTPUT_USD_PER_MILLION), output=rate(env.AI_IMAGE_OUTPUT_USD_PER_MILLION);
    imageProfile={kind:'IMAGE',model:'gemini-3.1-flash-lite-image',profileVersion:'foxy-gemini-image-v1',maxInputTokens:integer(env.AI_IMAGE_MAX_INPUT_TOKENS,65536),maxOutputTokens:integer(env.AI_IMAGE_MAX_OUTPUT_TOKENS,4096),inputUsdPerMillion:input.text,outputUsdPerMillion:(text.amount>output.amount?text:output).text,textOutputUsdPerMillion:text.text,imageOutputUsdPerMillion:output.text};
  }
  if (diagram) {
    if (!ai.model || !Number.isSafeInteger(ai.maxInputTokens) || ai.maxInputTokens<1 || !Number.isSafeInteger(ai.maxOutputTokens) || ai.maxOutputTokens<1) return invalid();
    diagramProfile={kind:'DIAGRAM',model:ai.model,profileVersion:'foxy-diagram-provider-v1',maxInputTokens:Math.min(ai.maxInputTokens,65536),maxOutputTokens:Math.min(ai.maxOutputTokens,4096),inputUsdPerMillion:rate(env.AI_INPUT_USD_PER_MILLION).text,outputUsdPerMillion:rate(env.AI_OUTPUT_USD_PER_MILLION).text};
  }
  return { configuration:{enabled:{IMAGE:image,DIAGRAM:diagram},profiles:{IMAGE:imageProfile,DIAGRAM:diagramProfile},privateQuotaBytes:quota(env.FOXY_PRIVATE_ASSET_QUOTA_BYTES),maxConcurrency:ai.maxConcurrency,maxJobAgeMs:ai.maxJobAgeMs,deadlineMs:180000},providerDeadlineMs:Math.min(ai.deadlineMs,30000) };
}
