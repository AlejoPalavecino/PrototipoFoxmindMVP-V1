// Run only after the user supplies a Gemini test key and authorizes live calls.
import { loadEnvFile } from 'node:process';
import { createGeminiFoxyImageAdapter } from '../apps/api/src/modules/foxy/visuals/infrastructure/providers/foxy-image-adapter.ts';
import { createGeminiFoxyDiagramAdapter } from '../apps/api/src/modules/foxy/visuals/infrastructure/providers/foxy-diagram-adapter.ts';
import { readAiConfiguration } from '../apps/api/src/platform/ai/configuration.ts';
import { readFoxyVisualConfiguration } from '../apps/api/src/modules/foxy/visuals/infrastructure/visual-configuration.ts';
if (!process.argv.includes('--live-authorized')) throw new Error('Pass --live-authorized only after explicit authorization.');
if (Object.keys(process.env).some(key => key.startsWith('AI_') || key === 'FOXY_PRIVATE_ASSET_QUOTA_BYTES')) throw new Error('Remove inherited AI configuration before running this test.');
loadEnvFile('.env.foxy-test');
const ai = readAiConfiguration(process.env), host = readFoxyVisualConfiguration(process.env, ai);
if (!ai || !host || !host.configuration.profiles.IMAGE || !host.configuration.profiles.DIAGRAM) throw new Error('Visual test configuration is incomplete.');
const modes = process.argv.includes('--image-only') ? ['IMAGE'] : ['IMAGE', 'DIAGRAM'];
const reasons = new Set(['RESPONSE_SHAPE','PROMPT_BLOCKED','CANDIDATE_COUNT','FINISH_REASON','PART_SHAPE','PART_FIELDS','SIGNATURE_LIMIT','DATA_VARIANT','TEXT_LIMIT','MIME','BASE64','BYTE_LIMIT','RASTER_SIGNATURE','MISSING_FINAL_IMAGE','MULTIPLE_FINAL_IMAGES']);
for (const kind of modes) {
  const profile = host.configuration.profiles[kind];
  const deadlineMs = kind === 'IMAGE' ? host.imageProviderDeadlineMs : host.providerDeadlineMs;
  const configuration = { model: profile.model, profileVersion: profile.profileVersion, maxInputTokens: profile.maxInputTokens, maxOutputTokens: profile.maxOutputTokens, deadlineMs };
  const adapter = kind === 'IMAGE' ? createGeminiFoxyImageAdapter({ apiKey: ai.apiKey, configuration }) : createGeminiFoxyDiagramAdapter({ apiKey: ai.apiKey, configuration });
  const input = { mode: 'GENERAL', prompt: kind === 'IMAGE' ? 'Ilustración educativa simple del ciclo del agua.' : 'Esquema educativo simple del ciclo del agua.', aspectRatio: '1:1', curriculum: null, sources: [], documents: [], warnings: [], history: [], signal: AbortSignal.timeout(deadlineMs) };
  try { await adapter.countTokens(input); const result = await adapter.generate(input); console.log(`${kind}: OK, ${kind === 'IMAGE' ? 'bytes=' + result.bytes.length : 'nodes=' + result.diagram.nodes.length}`); }
  catch (error) { console.error(`${kind}: ${error?.code === 'INVALID_AI_OUTPUT' ? 'INVALID_AI_OUTPUT' : 'FAILED'}${reasons.has(error?.diagnosticReason) ? ' (' + error.diagnosticReason + ')' : ''}`); process.exitCode = 1; }
}
