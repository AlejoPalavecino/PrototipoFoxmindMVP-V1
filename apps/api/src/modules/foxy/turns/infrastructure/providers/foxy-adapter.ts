import { getNeutralAiTextClient } from '../../../../../platform/ai/profile-client.ts';
import { configurationForJob, foxyPromptVersion, snapshotForTask } from '../../../../../platform/ai/execution-snapshot.ts';
import type { FoxyTextInput } from '../../../../../../../../src/core/domain/foxy/text.ts';
import type { GeminiClient } from '../../../../../platform/ai/gemini-client.ts';
import type { AiTextClient } from '../../../../../platform/ai/text-client.ts';
import { injectedTextClient, textClientCompatibilityView } from '../../../../../platform/ai/sdk-text-compat.ts';
import type { AiConfiguration } from '../../../../../platform/ai/configuration.ts';
import { AiError } from '../../../../../platform/ai/errors.ts';
import { foxyMessages, foxyInstructionFor, foxyResponseSchema, foxyQuizInstruction, foxyQuizResponseSchema } from './foxy-prompt.ts';
import { foxyQuizQuestionCount } from '../../../../../../../../src/core/domain/foxy/foxy-quiz.ts';
import { foxyResponse } from './foxy-response.ts';
import { createFoxyStreamPreview } from './foxy-stream-preview.ts';
type Configuration = Pick<AiConfiguration, 'model' | 'maxInputTokens' | 'maxOutputTokens' | 'deadlineMs'>
  & Partial<Pick<AiConfiguration, 'executionProfile'>>;
const streamingSchema = { ...foxyResponseSchema, propertyOrdering: Object.keys(foxyResponseSchema.properties) };
function eligible(input: FoxyTextInput) {
  return input.mode === 'GENERAL' && input.purpose === 'CHAT' && !input.sources.length && !input.documents.length;
}
function validate(input: FoxyTextInput): void {
  if (!input || !['GENERAL', 'CLASSROOM'].includes(input.mode) || !['CHAT', 'STUDY_MATERIAL', 'REVIEW', 'SUMMARY', 'ACTIVITY_IDEAS', 'LESSON_PLAN', 'RUBRIC'].includes(input.purpose)
    || typeof input.message !== 'string' || !input.message.trim() || [...input.message].length > 5000
    || !Array.isArray(input.sources) || input.sources.length > 20 || !Array.isArray(input.documents) || input.documents.length > 6
    || !Array.isArray(input.warnings) || (input.mode === 'GENERAL' && (input.curriculum !== null
      || input.sources.some(source => source.kind !== 'ATTACHMENT') || (input.documents.length > 0 && !input.sources.length)))
    || (input.mode === 'CLASSROOM' && !input.curriculum)) throw new AiError('AI_UNAVAILABLE');
  const history = input.history ?? [];
  if (!Array.isArray(history) || history.length > 10 || history.some(pair => !pair || !pair.assistant
    || typeof pair.user !== 'string' || !pair.user.trim() || [...pair.user].length > 5000
    || typeof pair.assistant.title !== 'string' || !pair.assistant.title.trim() || [...pair.assistant.title].length > 200
    || typeof pair.assistant.markdown !== 'string' || !pair.assistant.markdown.trim() || [...pair.assistant.markdown].length > 50000)) throw new AiError('AI_UNAVAILABLE');
  const safeHistory = history.map(pair => ({ user: pair.user, assistant: { title: pair.assistant.title, markdown: pair.assistant.markdown } }));
  if (Buffer.byteLength(JSON.stringify(safeHistory), 'utf8') > 262144) throw new AiError('AI_INPUT_LIMIT');
  const sources = new Set<string>(), documents = new Set<string>(); let size = 0;
  for (const source of input.sources) {
    if (!/^s[1-9][0-9]*$/u.test(source.sourceKey) || sources.has(source.sourceKey) || !Array.isArray(source.documentKeys)) throw new AiError('AI_UNAVAILABLE');
    sources.add(source.sourceKey);
  }
  for (const doc of input.documents) {
    if (!/^d[1-9][0-9]*$/u.test(doc.documentKey) || documents.has(doc.documentKey) || !Array.isArray(doc.sourceKeys)
      || doc.sourceKeys.some(key => !sources.has(key)) || !doc.document) throw new AiError('AI_UNAVAILABLE');
    documents.add(doc.documentKey);
    if (doc.document.kind === 'pdf' && doc.document.bytes instanceof Uint8Array) size += doc.document.bytes.length;
    else if (doc.document.kind === 'text' && typeof doc.document.text === 'string') size += Buffer.byteLength(doc.document.text);
    else throw new AiError('AI_UNAVAILABLE');
  }
  if (size > 20000000) throw new AiError('AI_INPUT_LIMIT');
  if (input.sources.some(source => source.documentKeys.some(key => !documents.has(key)))) throw new AiError('AI_UNAVAILABLE');
}
export function createGeminiFoxyTextAdapter(configuration: AiConfiguration): GeminiFoxyTextAdapter {
 const client = getNeutralAiTextClient(configuration, 'foxy');
 const pinned = configurationForJob(configuration, configuration.executionProfile ?? snapshotForTask(configuration, 'foxy'), 'foxy');
 return new GeminiFoxyTextAdapter({ client, configuration: pinned });
}
export class GeminiFoxyTextAdapter {
 private readonly execution: AiTextClient;
 private readonly executionProvider: 'gemini' | 'anthropic';
 private readonly promptVersion: string;
 private readonly options: { client: GeminiClient; configuration: Configuration };
 constructor(options: { client: GeminiClient | AiTextClient; configuration: Configuration }) {
  this.execution = injectedTextClient(options.client, options.configuration, 'foxy', true);
  this.executionProvider = options.configuration.executionProfile?.provider ?? 'gemini';
  this.promptVersion = options.configuration.executionProfile?.promptVersion ?? foxyPromptVersion;
  this.options = { client: textClientCompatibilityView(this.execution, options.configuration, 'foxy'), configuration: options.configuration };
 }
 private call(input: FoxyTextInput, publish?: (markdown: string | undefined) => void) {
  const streaming = eligible(input) && this.executionProvider === 'gemini';
  const quizCount = input.purpose === 'ACTIVITY_IDEAS' ? foxyQuizQuestionCount(input.message) : null;
  return { key: input, signal: input.signal, request: () => {
   validate(input);
   const instruction = foxyInstructionFor(input.purpose, this.promptVersion);
   return { system: quizCount ? `${instruction}\n\n${foxyQuizInstruction(quizCount)}` : instruction,
    messages: foxyMessages(input), schema: quizCount ? foxyQuizResponseSchema(quizCount) : streaming ? streamingSchema : foxyResponseSchema,
    // Conversational replies favour a fast first answer; resources keep the model's default reasoning.
    ...(input.purpose === 'CHAT' ? { tuning: { thinking: 'low' as const } } : {}) };
  }, ...(streaming && publish ? { preview: createFoxyStreamPreview(publish) } : {}) };
 }
 async countTokens(input: FoxyTextInput): Promise<number> { return this.execution.count(this.call(input)); }
 async generate(input: FoxyTextInput, preview?: (markdown: string | undefined) => void) {
  validate(input);
  const responseInput = { ...input, sources: input.sources.map(source => ({ ...source, documentKeys: [...source.documentKeys] })),
   documents: input.documents.map(doc => ({ ...doc, sourceKeys: [...doc.sourceKeys] })) };
  const quizCount = input.purpose === 'ACTIVITY_IDEAS' ? foxyQuizQuestionCount(input.message) : null;
  return foxyResponse(await this.execution.generate(this.call(input, preview)), responseInput, quizCount);
 }
}
