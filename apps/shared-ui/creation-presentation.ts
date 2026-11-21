import type { IconKey } from './foxmind-assets';

type Card = { label: string; action: string; icon: IconKey };
const note: Card = { label: 'Apunte', action: 'Leer apunte', icon: 'file' };
const diagram: Card = { label: 'Esquema interactivo', action: 'Explorar esquema', icon: 'layers' };
const cards: Record<string, Card> = {
  NOTE: note, STUDY_MATERIAL: note, SUMMARY: note, REVIEW: note,
  EXPLANATION: { label: 'Explicación', action: 'Leer explicación', icon: 'book' },
  OUTLINE: diagram, DIAGRAM: diagram,
  IMAGE: { label: 'Ilustración', action: 'Ver imagen', icon: 'spark' },
  QUIZ: { label: 'Quiz', action: 'Abrir quiz', icon: 'edit' },
  EXERCISE: { label: 'Ejercicios', action: 'Abrir ejercicios', icon: 'clipboard' },
  MOCK_EXAM: { label: 'Simulacro', action: 'Abrir simulacro', icon: 'clipboard' },
  REVIEW_PLAN: { label: 'Plan de repaso', action: 'Ver mis sesiones', icon: 'calendar' },
  LESSON_PLAN: { label: 'Plan de clase', action: 'Ver clase', icon: 'calendar' },
  RUBRIC: { label: 'Rúbrica', action: 'Revisar criterios', icon: 'list-checks' },
  ACTIVITY_IDEAS: { label: 'Actividad', action: 'Revisar actividad', icon: 'edit' },
};

export function creationPresentation(kind: string) {
  return cards[kind] ?? { label: 'Creación', action: 'Abrir creación', icon: 'file' as const };
}

export function creationExcerpt(markdown?: string) {
  return markdown?.split(/\r?\n/u).map(line => line.trim())
    .find(line => line && !/^[#|{\[]/u.test(line))?.replace(/[*_]/gu, '').slice(0, 200);
}

export function materialsInConversation(count: number) {
  return count === 1 ? '1 material incluido en esta conversación.' : `${count} materiales incluidos en esta conversación.`;
}
