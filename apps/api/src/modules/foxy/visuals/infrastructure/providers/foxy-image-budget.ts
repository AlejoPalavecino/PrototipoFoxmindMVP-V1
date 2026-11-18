type Input = { inputTokenCap: number; outputTokenCap: number; inputUsdPerMillion: string; textOutputUsdPerMillion: string; imageOutputUsdPerMillion: string };
function invalid(): never { throw Object.assign(new Error('INVALID_INPUT'), { code: 'INVALID_INPUT' }); }
function rate(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?$/u.test(value)) return invalid();
  const [whole, fraction = ''] = value.split('.'); const result = BigInt(whole!) * 1000000n + BigInt(fraction.padEnd(6, '0'));
  return result > 0n ? result : invalid();
}
function amount(tokens: number, price: bigint): bigint { return (BigInt(tokens) * price + 999999n) / 1000000n; }
export function quoteFoxyImageBudget(value: Input): bigint {
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).sort().join(',') !== 'imageOutputUsdPerMillion,inputTokenCap,inputUsdPerMillion,outputTokenCap,textOutputUsdPerMillion'
    || !Number.isSafeInteger(value.inputTokenCap) || value.inputTokenCap < 1 || value.inputTokenCap > 65536
    || !Number.isSafeInteger(value.outputTokenCap) || value.outputTokenCap < 1 || value.outputTokenCap > 4096) return invalid();
  const input = rate(value.inputUsdPerMillion), text = rate(value.textOutputUsdPerMillion), image = rate(value.imageOutputUsdPerMillion);
  return amount(value.inputTokenCap, input) + amount(value.outputTokenCap, text > image ? text : image);
}
import type { VisualUsage } from '../../application/visual-worker-contracts.ts';


type ImageRates = { inputUsdPerMillion: string; textOutputUsdPerMillion?: string; imageOutputUsdPerMillion?: string };

export function priceFoxyImageUsage(prices: ImageRates, usage?: VisualUsage | null): bigint | null {
  const tokens = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
  if (!tokens(usage?.inputTokens) || !tokens(usage?.outputTokens)) return null;
  const input = amount(usage.inputTokens, rate(prices.inputUsdPerMillion));
  if (usage.outputTokens === 0) return input;
  const text = rate(prices.textOutputUsdPerMillion), image = rate(prices.imageOutputUsdPerMillion);
  if (text === image) return input + amount(usage.outputTokens, text);
  if (!tokens(usage.textOutputTokens) || !tokens(usage.imageOutputTokens)
    || usage.textOutputTokens + usage.imageOutputTokens !== usage.outputTokens) return null;
  const output = BigInt(usage.textOutputTokens) * text + BigInt(usage.imageOutputTokens) * image;
  return input + (output + 999999n) / 1000000n;
}
