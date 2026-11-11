const header = 'FoxMind · Devolución v1\n';

export const feedbackSections = [
  ['strengths', 'Lo que hiciste bien'],
  ['improvements', 'Para mejorar'],
  ['nextStep', 'Próximo paso'],
  ['general', 'Comentario del docente'],
] as const;

export type OverallFeedback = Record<(typeof feedbackSections)[number][0], string>;
const blank = { strengths: '', improvements: '', nextStep: '', general: '' };

function parseStructured(value: string): OverallFeedback | null {
  if (!value.startsWith(header)) return null;

  const feedback = { ...blank };
  let rest = value.slice(header.length);
  for (const [key, label] of feedbackSections) {
    const lineEnd = rest.indexOf('\n');
    const prefix = `${label}: `;
    const lengthText = rest.slice(prefix.length, lineEnd);
    if (!rest.startsWith(prefix) || lineEnd < 0 || !/^\d{1,6}$/.test(lengthText)) return null;
    const end = lineEnd + 1 + Number(lengthText);
    if (rest[end] !== '\n') return null;
    feedback[key] = rest.slice(lineEnd + 1, end);
    rest = rest.slice(end + 1);
  }
  return rest ? null : feedback;
}

export function parseFeedback(value: string | null): OverallFeedback {
  const general = value ?? '';
  return parseStructured(general) ?? { ...blank, general };
}

export function serializeFeedback(feedback: OverallFeedback): string | null {
  const { strengths, improvements, nextStep, general } = feedback;
  if (!strengths && !improvements && !nextStep && !parseStructured(general)) return general || null;
  // Length prefixes keep text that contains a section label unambiguous.
  return header + feedbackSections.map(([key, label]) => `${label}: ${feedback[key].length}\n${feedback[key]}\n`).join('');
}
