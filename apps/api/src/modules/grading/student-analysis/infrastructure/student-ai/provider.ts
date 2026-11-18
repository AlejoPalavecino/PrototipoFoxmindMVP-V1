import { getNeutralAiTextClient } from '../../../../../platform/ai/profile-client.ts';
import { configurationForJob, snapshotForTask, studentAnalysisPromptVersion } from '../../../../../platform/ai/execution-snapshot.ts';
import type { AiConfiguration } from '../../../../../platform/ai/configuration.ts';
import type { GeminiClient } from '../../../../../platform/ai/gemini-client.ts';
import type { AiTextClient } from '../../../../../platform/ai/text-client.ts';
import { injectedTextClient, textClientCompatibilityView } from '../../../../../platform/ai/sdk-text-compat.ts';
import type { StudentAiProvider } from './worker.ts';
type Input = Parameters<StudentAiProvider['countStudentAiTokens']>[0];
const legacyInstruction = 'Analiza únicamente los hechos educativos anónimos suministrados. '
  + 'No infieras identidad, diagnósticos ni características personales. No inventes evidencia. '
  + 'Cada hallazgo debe citar al menos una referencia de actividad existente. '
  + 'Escribe en español sugerencias pedagógicas prudentes y menciona las limitaciones de los datos.';
const pedagogicalInstruction = legacyInstruction
  + ' Dirigí el informe al docente. En el resumen distinguí cumplimiento de entregas, puntualidad y rendimiento publicado. '
  + 'Recordá que una nota ausente no es cero, una reentrega pendiente puede coexistir con una nota publicada y la puntualidad no demuestra dominio. '
  + 'Describí fortalezas y necesidades sólo como observaciones respaldadas por las actividades citadas. Una muestra pequeña no permite concluir que existe una tendencia. '
  + 'Priorizá una acción docente concreta en recommendations. Vinculala con la señal observada y explicá cómo comprobarla en una próxima revisión o conversación. '
  + 'Por ejemplo, ante una reentrega pendiente sugerí revisar el trabajo con el estudiante y acordar qué evidencia buscar en su siguiente versión. '
  + 'En limitations, indicá que la evidencia no contiene respuestas ni criterios de evaluación. Omití causas, contenidos específicos y diagnósticos que los datos no permiten establecer. '
  + 'Usá frases breves, vocabulario natural y evitá repetir el mismo dato en varias secciones.';
const finding = { type: 'object', additionalProperties: false, required: ['text', 'evidenceRefs'],
  properties: { text: { type: 'string' }, evidenceRefs: { type: 'array', items: { type: 'string' } } } };
const schema = { type: 'object', additionalProperties: false,
  required: ['overview', 'strengths', 'supportNeeds', 'recommendations', 'limitations'], properties: {
    overview: { type: 'string' }, strengths: { type: 'array', items: finding },
    supportNeeds: { type: 'array', items: finding }, recommendations: { type: 'array', items: finding },
    limitations: { type: 'array', items: { type: 'string' } },
  } };
export function createStudentAiProvider(configuration: AiConfiguration): StudentAiProvider {
 const client = getNeutralAiTextClient(configuration, 'analysis');
 const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, 'analysis'), 'analysis');
 return new GeminiStudentAiProvider(client, pinned);
}
export class GeminiStudentAiProvider implements StudentAiProvider {
 private readonly execution: AiTextClient;
 private readonly client: GeminiClient;
 private readonly instruction: string;
 constructor(client: GeminiClient | AiTextClient, config: AiConfiguration) {
  this.execution = injectedTextClient(client, config, 'analysis');
  this.client = textClientCompatibilityView(this.execution, config, 'analysis');
  const profile = config.executionProfile ?? snapshotForTask(config, 'analysis');
  this.instruction = profile.promptVersion === studentAnalysisPromptVersion ? pedagogicalInstruction : legacyInstruction;
 }
 private call(input: Input) {
  return { key: input, signal: input.signal, request: () => ({ system: this.instruction, schema,
   messages: [{ role: 'user' as const, parts: [{ kind: 'text' as const, text: JSON.stringify(input.evidence) }] }] }) };
 }
 async countStudentAiTokens(input: Input): Promise<number> { return this.execution.count(this.call(input)); }
 async generateStudentAi(input: Input) {
  const result = await this.execution.generate(this.call(input));
  if (Buffer.byteLength(result.text) > 262144) throw new Error('INVALID_AI_OUTPUT');
  return { json: JSON.parse(result.text) as unknown, inputTokens: result.usage.inputTokens, outputTokens: result.usage.outputTokens };
 }
}
