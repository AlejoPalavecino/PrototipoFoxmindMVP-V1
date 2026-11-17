import type { StudyCommandResponse } from './study-commands.ts';
import type { StudyDetail, StudyUnit } from './study-contracts.ts';
import { StudyError } from '../api/study-error.ts';
export function validateStudyPlan(
  name: string,
  year: string,
  units: StudyUnit[],
  active = true,
): string | null {
  const valid = (s: string) => !!s.trim() && [...s.trim()].length <= 120;
  if (!valid(name)) return 'Escribí un nombre de entre 1 y 120 caracteres.';
  if (!/^\d{1,4}$/.test(String(year)) || Number(year) < 1 || Number(year) > 9999)
    return 'Revisá el año académico.';
  if (
    active &&
    (!units.length ||
      units.some(
        (u) => !valid(u.title) || !u.topics.length || u.topics.some((t) => !valid(t.title)),
      ))
  )
    return 'Cada unidad necesita un nombre y al menos un tema de hasta 120 caracteres.';
  return null;
}
export function studyGenerationData(
  kind: string,
  message: string,
  topicIds: string[],
  questionCount: number,
  difficulty: string,
): Record<string, unknown> {
  if (studyGenerationIssue(kind, topicIds)) throw new StudyError('TOPICS_REQUIRED', 400);
  return { kind, topicIds, questionCount, difficulty, ...(message.trim() ? { message } : {}) };
}
export function studyAnswerValue(
  type: string,
  previous: string | string[] | undefined,
  value: string,
  checked: boolean,
): string | string[] {
  if (type === 'DEVELOPMENT') return value;
  if (type === 'SINGLE') return [value];
  const current = Array.isArray(previous) ? previous : [];
  return checked ? [...new Set([...current, value])] : current.filter((id) => id !== value);
}
export function studyGenerationIssue(kind: string, topicIds: string[]): string | null {
  return ['QUIZ', 'EXERCISE', 'MOCK_EXAM'].includes(kind) && !topicIds.length
    ? 'Elegí al menos un tema en Temas y fuentes para practicar.'
    : null;
}

/** Preserve the exact practice confirmed by the receipt even if its follow-up read fails. */
export function studyDetailAfterCommand(
  detail: StudyDetail,
  response: StudyCommandResponse,
): StudyDetail {
  const practice = response.result?.practice;
  if (!practice) return { ...detail, folder: response.folder };
  const practices = detail.practices.some((item) => item.id === practice.id)
    ? detail.practices.map((item) => (item.id === practice.id ? practice : item))
    : [...detail.practices, practice];
  return { ...detail, folder: response.folder, practices };
}
