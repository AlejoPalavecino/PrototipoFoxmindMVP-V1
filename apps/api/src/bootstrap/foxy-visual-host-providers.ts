import { createGeminiFoxyImageAdapter } from '../modules/foxy/visuals/infrastructure/providers/foxy-image-adapter.ts';
import { createGeminiFoxyDiagramAdapter } from '../modules/foxy/visuals/infrastructure/providers/foxy-diagram-adapter.ts';
import { type AiConfiguration } from '../platform/ai/configuration.ts';
import type { FoxyVisualHostConfiguration } from '../modules/foxy/visuals/infrastructure/visual-configuration.ts';
import type { VisualProviders } from '../modules/foxy/visuals/application/visual-runtime-contracts.ts';
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
