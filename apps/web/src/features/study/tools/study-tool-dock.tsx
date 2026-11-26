import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { Notice } from '../../../../../shared-ui/feedback';
import type { StudyTopic } from '../model/study-contracts.ts';
import { StudyToolIconMark } from './study-tools-panel';
import { studyQuestionTools, studyTool, studyToolExample } from './study-tool-catalog.ts';

const difficulties = [
  { value: 'EASY', label: 'Inicial' },
  { value: 'MEDIUM', label: 'Intermedia' },
  { value: 'HARD', label: 'Avanzada' },
];

function Choice<T extends string | number>({ label, values, current, onChange }: {
  label: string; values: { value: T; label: string }[]; current: T; onChange: (value: T) => void;
}) {
  return (
    <div className="study-tool-field">
      <span id={`study-tool-${label}`}>{label}</span>
      <div className="study-tool-segments" role="group" aria-labelledby={`study-tool-${label}`}>
        {values.map((item) => (
          <button key={item.value} type="button" aria-pressed={item.value === current} onClick={() => onChange(item.value)}>
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * The open tool, docked on top of the composer: it shares the composer's text box, so there is a single place to
 * write and the send button says what will happen. Topics come from the rail or the chips in the composer.
 */
export function StudyToolDock({
  kind,
  selected,
  topics,
  count,
  difficulty,
  error,
  onBrief,
  onCount,
  onDifficulty,
  onClose,
}: {
  kind: string;
  selected: string[];
  topics: StudyTopic[];
  count: number;
  difficulty: string;
  error: string;
  onBrief: (value: string) => void;
  onCount: (value: number) => void;
  onDifficulty: (value: string) => void;
  onClose: () => void;
}) {
  const tool = studyTool(kind);
  const image = kind === 'IMAGE';
  const chosen = topics.filter((topic) => selected.includes(topic.id)).map((topic) => topic.title);
  const counts = [...new Set([5, 10, 15, count].filter((value) => value > 0))].sort((a, b) => a - b);
  return (
    <section className="study-tool-dock" aria-labelledby="study-tool-dock-title">
      <header>
        <StudyToolIconMark tool={tool} />
        <span>
          <strong id="study-tool-dock-title">{tool.title}</strong>
          <small>{image ? 'Foxy usa la descripción que escribís abajo.' : `Sobre ${chosen.length ? chosen.join(', ') : 'todos los temas de la carpeta'}`}</small>
        </span>
        <button type="button" className="study-tool-close" aria-label={`Cerrar ${tool.title}`} onClick={onClose}>
          <FoxmindIcon name="close" />
        </button>
      </header>
      {studyQuestionTools.includes(kind) && (
        <div className="study-tool-fields">
          <Choice label="Cantidad de preguntas" values={counts.map((value) => ({ value, label: String(value) }))} current={count} onChange={onCount} />
          <Choice label="Dificultad" values={difficulties} current={difficulty} onChange={onDifficulty} />
        </div>
      )}
      <p className="study-tool-hint">
        {image ? 'Describí la imagen abajo. La vas a encontrar en Creaciones.' : 'Escribí abajo en qué querés que haga foco, o mandalo así.'}
        <button type="button" className="study-exact-example" onClick={() => onBrief(studyToolExample(kind, chosen[0]))}>
          <FoxmindIcon name="spark" />
          Usar una idea para empezar
        </button>
      </p>
      {error && <Notice error>{error}</Notice>}
    </section>
  );
}
