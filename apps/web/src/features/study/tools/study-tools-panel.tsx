import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
export function StudyToolsPanel({
  disabled,
  imageGenerationAvailable,
  onChoose,
}: {
  disabled: boolean;
  imageGenerationAvailable?: boolean;
  onChoose: (tool: { kind: string; title: string }) => void;
}) {
  return (
    <div className="study-exact-tools-panel">
      <div className="study-exact-tools">
        {[
          {
            kind: 'NOTE',
            title: 'Entender un tema',
            hint: 'Un ejemplo, paso a paso.',
            icon: 'book',
            color: 'sky',
          },
          {
            kind: 'NOTE',
            title: 'Preparar un apunte',
            hint: 'Lo esencial, con tus palabras.',
            icon: 'file',
            color: 'peach',
          },
          {
            kind: 'OUTLINE',
            title: 'Conectar ideas',
            hint: 'Un esquema para relacionar.',
            icon: 'layers',
            color: 'mint',
          },
          {
            kind: 'IMAGE',
            title: 'Crear una imagen',
            hint: 'Ilustrá un concepto para repasarlo.',
            icon: 'spark',
            color: 'mint',
          },
          {
            kind: 'QUIZ',
            title: 'Practicar',
            hint: 'Preguntas con orientación.',
            icon: 'pencil',
            color: 'rose',
          },
          {
            kind: 'EXERCISE',
            title: 'Crear ejercicios',
            hint: 'Aplicá lo aprendido con una devolución.',
            icon: 'clipboard',
            color: 'rose',
          },
          {
            kind: 'MOCK_EXAM',
            title: 'Preparar una evaluación',
            hint: 'Un simulacro sin nota académica.',
            icon: 'flag',
            color: 'sky',
          },
          {
            kind: 'PLAN',
            title: 'Organizar mi repaso',
            hint: 'Un plan que llega a tu agenda.',
            icon: 'calendar',
            color: 'peach',
          },
        ].filter((tool) => tool.kind !== 'IMAGE' || imageGenerationAvailable).map((tool) => (
          <button key={tool.title} disabled={disabled} onClick={() => onChoose(tool)}>
            <span className={`study-exact-tool-icon ${tool.color}`}>
              {tool.icon === 'flag' ? (
                <svg className="fm3d-icon" aria-hidden="true" viewBox="0 0 24 24">
                  <use href="/brujula/icons.svg#flag" />
                </svg>
              ) : (
                <FoxmindIcon name={tool.icon as 'book'} />
              )}
            </span>
            <span>
              <b>{tool.title}</b>
              <small>{tool.hint}</small>
            </span>
            <FoxmindIcon name="chevron-right" />
          </button>
        ))}
      </div>
    </div>
  );
}
