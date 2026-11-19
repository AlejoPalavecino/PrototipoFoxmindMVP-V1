type Text = { prompt: string | null; text: string };
type Criterion = { name: string; description: string };
type WritingMaterial = { instructions: string | null; criteria: Criterion[]; texts: Text[] };
type SourceIdentity = { activityId: string; attemptId: string; title: string };
export type WritingSource = SourceIdentity & WritingMaterial;
export type WritingReference = SourceIdentity & { ref: string };
export type WritingEvidence = { activities: (WritingMaterial & { ref: string })[] };

export const writingPromptVersion = 'teacher-writing-v1';

function boundedText(value: string, limit: number) {
  const redacted = value.replace(/[\w.+-]+@[\w.-]+\.[a-z]{2,}/gi, '[correo omitido]')
    .replace(/\bhttps?:\/\/[^\s<>]+/gi, '[enlace omitido]').trim();
  const characters = Array.from(redacted);
  return characters.length <= limit ? redacted : characters.slice(0, limit - 12).join('') + ' [fragmento]';
}

export function makeWritingSnapshot(sources: readonly WritingSource[]) {
  const activities: WritingEvidence['activities'] = [], references: WritingReference[] = [];
  for (const source of sources.slice(0, 3)) {
    const texts = source.texts.filter(row => row.text.trim()).slice(0, 4).map(row => ({
      prompt: row.prompt ? boundedText(row.prompt, 1000) : null,
      text: boundedText(row.text, 1600),
    }));
    if (!texts.length) continue;
    const ref = `A${activities.length + 1}`;
    activities.push({ ref, texts, instructions: source.instructions ? boundedText(source.instructions, 2000) : null,
      criteria: source.criteria.slice(0, 8).map(criterion => ({
        name: boundedText(criterion.name, 120), description: boundedText(criterion.description, 300),
      })) });
    references.push({ ref, activityId: source.activityId, attemptId: source.attemptId, title: source.title });
  }
  return activities.length ? { evidence: { activities }, references } : null;
}

export function parseWritingReport(input: unknown, references: readonly WritingReference[]) {
  const invalid = (): never => { throw new Error('INVALID_AI_OUTPUT'); };
  function exact(value: unknown, keys: string[]) {
    if (!value || typeof value !== 'object' || Array.isArray(value) ||
        Object.keys(value).length !== keys.length || keys.some(key => !Object.hasOwn(value, key))) return invalid();
    return value as Record<string, unknown>;
  }
  const byRef = new Map(references.map(({ ref, ...source }) => [ref, source]));
  function finding(value: unknown) {
    const { text, evidenceRefs } = exact(value, ['text', 'evidenceRefs']);
    if (typeof text !== 'string' || !text.trim() || text.length > 450 || !Array.isArray(evidenceRefs) ||
        evidenceRefs.length !== 1 ||
        evidenceRefs.some(ref => typeof ref !== 'string' || !byRef.has(ref))) return invalid();
    return { text: text.trim(), sources: evidenceRefs.map(ref => byRef.get(ref)!) };
  }
  const { strengths, improvements, nextStep } = exact(input, ['strengths', 'improvements', 'nextStep']);
  if (!Array.isArray(strengths) || strengths.length > 3 || !Array.isArray(improvements) || improvements.length > 3) return invalid();
  return { strengths: strengths.map(finding), improvements: improvements.map(finding),
    nextStep: nextStep === null ? null : finding(nextStep) };
}
