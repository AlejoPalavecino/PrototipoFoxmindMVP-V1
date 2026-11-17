import { FoxyDialog } from '../../../../../shared-ui/FoxyChatLayout';
import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../shared-ui/feedback';
import type { StudyTopic } from '../model/study-contracts.ts';
export function StudyToolDialog({
  title,
  folderName,
  sourceCount,
  brief,
  selected,
  topics,
  error,
  disabled,
  onBrief,
  onSelected,
  onSubmit,
  onClose,
}: {
  title: string;
  folderName: string;
  sourceCount: number;
  brief: string;
  selected: string[];
  topics: StudyTopic[];
  error: string;
  disabled: boolean;
  onBrief: (value: string) => void;
  onSelected: (value: string[]) => void;
  onSubmit: () => void;
  onClose: () => void;
}) {
  return (
    <FoxyDialog
      description="Contale a Foxy qué necesitás. Después podés revisar y editar."
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
            <p>{sourceCount} materiales incluidos en esta conversación.</p>
          </div>
        </div>
        <label>
          ¿Qué te gustaría preparar?
          <textarea
            autoFocus
            required
            maxLength={1500}
            value={brief}
            onChange={(event) => onBrief(event.target.value)}
            placeholder="Por ejemplo: un apunte con una explicación sencilla y dos ejemplos cotidianos…"
          />
        </label>
        <button
          className="study-exact-example"
          type="button"
          onClick={() =>
            onBrief(
              'Ayudame a repasar las ideas principales con un ejemplo y una pregunta para comprobar si entendí.',
            )
          }
        >
          <FoxmindIcon name="spark" />
          Usar una idea para empezar
        </button>
        {topics.length > 0 && (
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
        {error && <Notice error>{error}</Notice>}
        <footer className="study-exact-dialog-footer">
          <button type="button" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="primary" disabled={disabled}>
            <FoxmindIcon name="spark" />
            Preparar propuesta
          </button>
        </footer>
      </form>
    </FoxyDialog>
  );
}
