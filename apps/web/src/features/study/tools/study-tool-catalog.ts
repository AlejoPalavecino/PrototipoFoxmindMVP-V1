/**
 * One catalog for every door to a study tool (welcome, Herramientas menu, follow-ups and the docked form),
 * so a tool keeps the same name, hint and action wherever the student meets it.
 */
export type StudyToolIcon = 'book' | 'file' | 'layers' | 'spark' | 'pencil' | 'clipboard' | 'flag' | 'calendar';
export type StudyTool = {
  kind: string;
  title: string;
  hint: string;
  icon: StudyToolIcon;
  tone: 'sky' | 'peach' | 'mint' | 'rose';
  /** Label of the composer's submit button while the tool is open. */
  action: string;
  group: 'study' | 'more';
};

export const studyTools: StudyTool[] = [
  { kind: 'EXPLANATION', title: 'Entender un tema', hint: 'Un ejemplo, paso a paso.', icon: 'book', tone: 'sky', action: 'Pedir explicación', group: 'study' },
  { kind: 'QUIZ', title: 'Practicar', hint: 'Preguntas con devolución al momento.', icon: 'pencil', tone: 'rose', action: 'Preparar práctica', group: 'study' },
  { kind: 'MOCK_EXAM', title: 'Preparar una evaluación', hint: 'Un simulacro sin nota académica.', icon: 'flag', tone: 'sky', action: 'Preparar simulacro', group: 'study' },
  { kind: 'PLAN', title: 'Organizar mi repaso', hint: 'Un plan que llega a tu agenda.', icon: 'calendar', tone: 'peach', action: 'Organizar mi repaso', group: 'study' },
  { kind: 'NOTE', title: 'Preparar un apunte', hint: 'Lo esencial, con tus palabras.', icon: 'file', tone: 'peach', action: 'Preparar apunte', group: 'more' },
  { kind: 'OUTLINE', title: 'Conectar ideas', hint: 'Un esquema para relacionar.', icon: 'layers', tone: 'mint', action: 'Preparar esquema', group: 'more' },
  { kind: 'EXERCISE', title: 'Crear ejercicios', hint: 'Aplicá lo aprendido con una devolución.', icon: 'clipboard', tone: 'rose', action: 'Preparar ejercicios', group: 'more' },
  { kind: 'IMAGE', title: 'Crear una imagen', hint: 'Ilustrá un concepto para repasarlo.', icon: 'spark', tone: 'mint', action: 'Generar imagen', group: 'more' },
];

export const studyToolGroups = [
  { id: 'study', label: 'Para estudiar' },
  { id: 'more', label: 'Más herramientas' },
] as const;

export function availableStudyTools(imageGenerationAvailable?: boolean) {
  return studyTools.filter((tool) => tool.kind !== 'IMAGE' || imageGenerationAvailable);
}

export function studyTool(kind: string): StudyTool {
  return studyTools.find((tool) => tool.kind === kind) ?? studyTools[4];
}

/** Tools that read the folder materials and ask for a number of questions. */
export const studyQuestionTools = ['QUIZ', 'EXERCISE', 'MOCK_EXAM'];

/** A starting idea for each tool: the docked form sends it when the student leaves the box empty. */
export function studyToolExample(kind: string, topic?: string): string {
  const subject = topic ?? 'el tema que estoy estudiando';
  const examples: Record<string, string> = {
    EXPLANATION: `Ayudame a entender ${subject} paso a paso, con un ejemplo y una pregunta para ver si lo entendí.`,
    NOTE: `Prepará un apunte sobre ${subject} con las ideas principales de mis materiales y un ejemplo para repasar.`,
    OUTLINE: `Mostrame cómo se relacionan los conceptos principales de ${subject}. Explicá qué significa cada flecha.`,
    IMAGE: topic ? `Ilustrá ${topic} para que pueda reconocer sus partes principales.` : 'Dibujá una célula vegetal con sus partes principales, como una ilustración de libro escolar.',
    QUIZ: `Prepará preguntas sobre ${subject} que me ayuden a distinguir las ideas que se suelen confundir.`,
    EXERCISE: `Dame ejercicios sobre ${subject} para aplicar lo que aprendí en situaciones distintas.`,
    MOCK_EXAM: `Armá un simulacro sobre ${subject} con preguntas de aplicación para resolver por mi cuenta.`,
  };
  return examples[kind] ?? examples.NOTE;
}
