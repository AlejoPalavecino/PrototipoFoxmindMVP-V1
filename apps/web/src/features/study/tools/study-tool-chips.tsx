/** Quick access to the study tools, right above the composer. Titles match the tools tray. */
export const studyToolChips = [
  { label: 'Entender un tema', kind: 'EXPLANATION', title: 'Entender un tema' },
  { label: 'Apunte', kind: 'NOTE', title: 'Preparar un apunte' },
  { label: 'Esquema', kind: 'OUTLINE', title: 'Conectar ideas' },
  { label: 'Practicar', kind: 'QUIZ', title: 'Practicar' },
  { label: 'Ejercicios', kind: 'EXERCISE', title: 'Crear ejercicios' },
  { label: 'Simulacro', kind: 'MOCK_EXAM', title: 'Preparar una evaluación' },
  { label: 'Organizar repaso', kind: 'PLAN', title: 'Organizar mi repaso' },
  { label: 'Imagen', kind: 'IMAGE', title: 'Crear una imagen' },
];
export function StudyToolChips({
  disabled,
  imageGenerationAvailable,
  onChoose,
}: {
  disabled: boolean;
  imageGenerationAvailable?: boolean;
  onChoose: (tool: { kind: string; title: string }) => void;
}) {
  return (
    <div className="study-chips" role="group" aria-label="Herramientas de estudio">
      {studyToolChips
        .filter((tool) => tool.kind !== 'IMAGE' || imageGenerationAvailable)
        .map((tool) => (
          <button key={tool.kind} type="button" className="study-chip" disabled={disabled} onClick={() => onChoose(tool)}>
            {tool.label}
          </button>
        ))}
    </div>
  );
}
