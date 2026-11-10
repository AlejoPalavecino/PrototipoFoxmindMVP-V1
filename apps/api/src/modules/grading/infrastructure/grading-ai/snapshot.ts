import { createHash } from 'node:crypto';
import type { GradingAiSpec } from '../../../../../../../src/core/domain/index.ts';
import type { GradingAiEvidence } from './provider.ts';

type SourceFile = { id: string; digest: string; text?: string; ready: boolean; name?: string };
type SourceQuestion = { id: string; type: 'DEVELOPMENT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE'; prompt: string; points: string; manual: boolean;
  options: { id: string; text: string; correct: boolean }[]; answer: { text: string | null; optionIds: string[] } };
export interface GradingAiSnapshotInput {
  epoch: string; rubricSnapshot: string;
  activity: { id: string; type: GradingAiEvidence['type']; title: string | null; instructions: string | null; questions: SourceQuestion[] };
  attempt: { id: string; attachments: SourceFile[]; practicalResponse?:string }; instructionFiles: SourceFile[];
  grade: unknown;
}
export interface GradingAiSnapshot {
  evidence: GradingAiEvidence; spec: GradingAiSpec; hash: string;
  references: { questions: Record<string, string>; files: Record<string, string>; options: Record<string, Record<string, string>> };
}
function readFile(file: SourceFile): string {
  if (!file.ready || typeof file.text !== 'string' || !file.text.trim() || file.text.length > 200000
    || typeof file.digest !== 'string' || !/^[a-f0-9]{64}$/i.test(file.digest)) throw new Error('SOURCE_UNAVAILABLE');
  return file.text;
}
function questionSnapshot(question: SourceQuestion, index: number) {
  const ref = `Q${index + 1}`, optionRefs = new Map(question.options.map((option, i) => [option.id, `O${i + 1}`]));
  if (optionRefs.size !== question.options.length || new Set(question.answer.optionIds).size !== question.answer.optionIds.length)
    throw new Error('SOURCE_UNAVAILABLE');
  const selectedOptionRefs = question.answer.optionIds.map(id => {
    const option = optionRefs.get(id); if (!option) throw new Error('SOURCE_UNAVAILABLE'); return option;
  });
  return { ref, optionRefs, selectedOptionRefs,
    evidence: { ref, type: question.type, manual: question.manual, prompt: question.prompt, points: question.points,
      options: question.options.map(option => ({ ref: optionRefs.get(option.id)!, text: option.text, correct: option.correct })) } };
}
/** Builds provider-safe evidence and retains private references only in the server snapshot. */
export function createGradingAiSnapshot(input: GradingAiSnapshotInput): GradingAiSnapshot {
  const instructions = [input.activity.instructions ?? '', ...input.instructionFiles.map((file, index) =>
    `Consigna adjunta ${index + 1}:\n${readFile(file)}`)].filter(Boolean).join('\n\n');
  if (!instructions.trim() && input.activity.questions.length === 0) throw new Error('SOURCE_UNAVAILABLE');
  const items = input.activity.questions.map(questionSnapshot);
  const references: GradingAiSnapshot['references'] = { questions: {}, files: {}, options: {} };
  if(input.attempt.practicalResponse!==undefined&&(input.activity.type!=='ASSIGNMENT'||typeof input.attempt.practicalResponse!=='string'||[...input.attempt.practicalResponse].length>5000))throw new Error('SOURCE_UNAVAILABLE');
  const evidence: GradingAiEvidence = { type: input.activity.type, instructions, rubric: input.rubricSnapshot,
    ...(input.attempt.practicalResponse!==undefined?{practicalResponse:input.attempt.practicalResponse}:{}),
    questions: items.map(item => item.evidence),
    answers: items.map((item, i) => ({ ref: item.ref, text: input.activity.questions[i]!.answer.text ?? '', selectedOptionRefs: item.selectedOptionRefs })),
    files: input.attempt.attachments.map((file, i) => ({ ref: `F${i + 1}`, kind: 'text', text: readFile(file) })) };
  for (const [i, item] of items.entries()) {
    references.questions[item.ref] = input.activity.questions[i]!.id;
    references.options[item.ref] = Object.fromEntries([...item.optionRefs].map(([id, ref]) => [ref, id]));
  }
  for (const [i, file] of input.attempt.attachments.entries()) references.files[`F${i + 1}`] = file.id;
  const spec: GradingAiSpec = { type: input.activity.type, questions: items.map((item, i) => ({
    ref: item.ref, maxPoints: input.activity.questions[i]!.points, manual: input.activity.questions[i]!.manual })) };
  const hash = createHash('sha256').update(JSON.stringify({ epoch: input.epoch, rubric: input.rubricSnapshot,
    evidence, references, instructionFiles: input.instructionFiles.map(f => ({ id: f.id, digest: f.digest })),
    attachments: input.attempt.attachments.map(f => ({ id: f.id, digest: f.digest })), grade: input.grade })).digest('hex');
  return { evidence, spec, hash, references };
}
