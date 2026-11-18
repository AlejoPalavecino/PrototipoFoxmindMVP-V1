import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../shared-ui/feedback';
import type { StudyTopic } from '../model/study-contracts.ts';
export function StudyToolDialog({
  kind,
  title,
  folderName,
  sourceCount,
  brief,
  selected,
  count,
  difficulty,
  topics,
  error,
  disabled,
  onBrief,
  onSelected,
  onCount,
  onDifficulty,
  onSubmit,
  onClose,
}: {
  kind: string;
  title: string;
  folderName: string;
  sourceCount: number;
  brief: string;
  selected: string[];
  count: number;
  difficulty: string;
  topics: StudyTopic[];
  error: string;
  disabled: boolean;
  onBrief: (value: string) => void;
  onSelected: (value: string[]) => void;
  onCount: (value: number) => void;
  onDifficulty: (value: string) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  const image = kind === 'IMAGE';
  const example = image
    ? 'Dibujá una célula vegetal con sus partes principales, como una ilustración de libro escolar.'
    : 'Ayudame a repasar las ideas principales con un ejemplo y una pregunta para comprobar si entendí.';
  return (
    <FoxyDialog
      description={image ? 'Describí la imagen. Podés verla y descargarla desde Creaciones.' : 'Contale a Foxy qué necesitás. Después podés revisar y editar.'}
      title={title}
      className="study-exact-tool-dialog"
      onClose={onClose}
    >
      <form
        className="study-exact-tool-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <div className="study-exact-scope-banner">
          <FoxmindIcon name="book" />
          <div>
            <b>{folderName}</b>
            <p>{image ? 'Foxy usa la descripción que escribís.' : `${sourceCount} materiales incluidos en esta conversación.`}</p>
          </div>
        </div>
        <label>
          {image ? '¿Qué querés ilustrar?' : '¿Qué te gustaría preparar?'}
          <textarea
            autoFocus
            required
            maxLength={1500}
            value={brief}
            onChange={(event) => onBrief(event.target.value)}
            placeholder={image ? example : 'Por ejemplo: un apunte con una explicación sencilla y dos ejemplos cotidianos…'}
          />
        </label>
        <button
          className="study-exact-example"
          type="button"
          onClick={() => onBrief(example)}
        >
          <FoxmindIcon name="spark" />
          Usar una idea para empezar
        </button>
        {!image && topics.length > 0 && (
          <fieldset className="study-exact-choice-group">
            <legend>Temas que querés incluir</legend>
            <div>
              {topics.map((topic) => (
                <label key={topic.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(topic.id)}
                    onChange={(event) =>
                      onSelected(
                        event.target.checked
                          ? [...selected, topic.id]
                          : selected.filter((id) => id !== topic.id),
                      )
                    }
                  />
                  {topic.title}
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {['QUIZ', 'EXERCISE', 'MOCK_EXAM'].includes(kind) && (
          <div className="study-exact-form-pair">
            <label>
              Cantidad de preguntas
              <input type="number" min={1} max={30} required value={count || ''}
                onChange={(event) => onCount(Number(event.target.value))} />
            </label>
            <label>
              Dificultad
              <select value={difficulty} onChange={(event) => onDifficulty(event.target.value)}>
                <option value="EASY">Inicial</option>
                <option value="MEDIUM">Intermedia</option>
                <option value="HARD">Avanzada</option>
              </select>
            </label>
          </div>
        )}
        {error && <Notice error>{error}</Notice>}
        <footer className="study-exact-dialog-footer">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={disabled}>
            <FoxmindIcon name="spark" />
            {image ? 'Generar imagen' : 'Preparar propuesta'}
          </button>
        </footer>
      </form>
    </FoxyDialog>
  );
}
