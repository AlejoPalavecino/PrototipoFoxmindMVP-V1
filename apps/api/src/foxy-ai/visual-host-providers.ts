import { createGeminiFoxyImageAdapter, createGeminiFoxyDiagramAdapter, type AiConfiguration } from '../ai/index.ts';
import type { FoxyVisualHostConfiguration } from './visual-configuration.ts';
import type { VisualProviders } from './visual-runtime.ts';
export function selectFoxyVisualProviders(ai: AiConfiguration | undefined, visual: FoxyVisualHostConfiguration | undefined,
  overrides: { enabled: boolean; providers?: { IMAGE?: VisualProviders['IMAGE']; DIAGRAM?: VisualProviders['DIAGRAM'] } }): VisualProviders | null {
  if (!ai || !visual) return null;
  const config = visual.configuration, supplied = overrides.providers;
  if (overrides.enabled) return { IMAGE: config.enabled.IMAGE ? supplied?.IMAGE ?? null : null, DIAGRAM: config.enabled.DIAGRAM ? supplied?.DIAGRAM ?? null : null };
  const image = config.profiles.IMAGE, diagram = config.profiles.DIAGRAM;
  return {
    IMAGE: config.enabled.IMAGE && image ? createGeminiFoxyImageAdapter({ apiKey: ai.apiKey, configuration: { model:image.model, profileVersion:image.profileVersion, maxInputTokens:image.maxInputTokens, maxOutputTokens:image.maxOutputTokens, deadlineMs:visual.providerDeadlineMs } }) : null,
    DIAGRAM: config.enabled.DIAGRAM && diagram ? createGeminiFoxyDiagramAdapter({ apiKey: ai.apiKey, configuration: { model:diagram.model, profileVersion:'foxy-diagram-provider-v1', maxInputTokens:diagram.maxInputTokens, maxOutputTokens:diagram.maxOutputTokens, deadlineMs:visual.providerDeadlineMs } }) : null,
  };
}
