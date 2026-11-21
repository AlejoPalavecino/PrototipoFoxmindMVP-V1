import type { StartFoxyVisual } from '../../../../../../src/core/domain/foxy/visual.ts';
export const exactOpeningImageProfileVersion = 'foxy-gemini-image-v4';
export const describedOpeningImageProfileVersion = 'foxy-gemini-image-v5';
export const interactiveDiagramProfileVersion = 'foxy-diagram-provider-v3';
export const visualProfileVersions = {
  IMAGE: { current: describedOpeningImageProfileVersion, historical: ['foxy-gemini-image-v1', 'foxy-gemini-image-v2', 'foxy-gemini-image-v3', exactOpeningImageProfileVersion] },
  DIAGRAM: { current: interactiveDiagramProfileVersion, historical: ['foxy-diagram-provider-v1', 'foxy-diagram-provider-v2'] },
} as const;
export function supportsVisualProfileVersion(kind: StartFoxyVisual['kind'], version: string): boolean {
  return supportsPinnedVisualProfileVersion(kind, visualProfileVersions[kind].current, version);
}
export function supportsPinnedVisualProfileVersion(kind: StartFoxyVisual['kind'], active: string, pinned: string): boolean {
  const { current, historical } = visualProfileVersions[kind];
  const versions: readonly string[] = [...historical, current];
  const index = versions.indexOf(pinned);
  return index >= 0 && index <= versions.indexOf(active);
}
function fail(code: string): never { throw Object.assign(new Error(code), { code }); }
export type VisualProfile = { kind: 'IMAGE' | 'DIAGRAM'; model: string; profileVersion: string; maxInputTokens: number; maxOutputTokens: number;
  inputUsdPerMillion: string; outputUsdPerMillion: string; textOutputUsdPerMillion?: string; imageOutputUsdPerMillion?: string };
function rate(value: unknown): bigint {
  if (typeof value !== 'string' || !/^(?:0|[1-9][0-9]{0,5})(?:\.[0-9]{1,6})?$/u.test(value)) return fail('AI_UNAVAILABLE');
  const [whole,fraction=''] = value.split('.'), amount = BigInt(whole!)*1000000n+BigInt(fraction.padEnd(6,'0'));
  if (!amount) return fail('AI_UNAVAILABLE'); return amount;
}
export function validateVisualProfile(profile: VisualProfile | null, kind: StartFoxyVisual['kind']): VisualProfile {
  if (!profile || profile.kind !== kind || !supportsVisualProfileVersion(kind, profile.profileVersion)
    || typeof profile.model !== 'string' || !profile.model.trim() || profile.model.length > 200
    || !Number.isSafeInteger(profile.maxInputTokens) || profile.maxInputTokens<1 || profile.maxInputTokens>65536
    || !Number.isSafeInteger(profile.maxOutputTokens) || profile.maxOutputTokens<1 || profile.maxOutputTokens>4096) return fail('AI_UNAVAILABLE');
  rate(profile.inputUsdPerMillion); const output = rate(profile.outputUsdPerMillion);
  if (kind === 'IMAGE') {
    if (profile.model !== 'gemini-3.1-flash-lite-image') return fail('AI_UNAVAILABLE');
    const text = rate(profile.textOutputUsdPerMillion), image = rate(profile.imageOutputUsdPerMillion);
    if (output !== (text>image ? text : image)) return fail('AI_UNAVAILABLE');
  }
  return structuredClone(profile);
}
