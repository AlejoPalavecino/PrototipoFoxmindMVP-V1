import { FoxmindIcon } from '../../../../../shared-ui/FoxmindIcon';
import { availableStudyTools, studyToolGroups, type StudyTool } from './study-tool-catalog.ts';

export function StudyToolIconMark({ tool }: { tool: Pick<StudyTool, 'icon' | 'tone'> }) {
  return (
    <span className={`study-exact-tool-icon ${tool.tone}`}>
      {tool.icon === 'flag' ? (
        <svg className="fm3d-icon" aria-hidden="true" viewBox="0 0 24 24">
          <use href="/brujula/icons.svg#flag" />
        </svg>
      ) : (
        <FoxmindIcon name={tool.icon as 'book'} />
      )}
    </span>
  );
}

/** Content of the Herramientas menu: the same catalog as the welcome, grouped by intent. */
export function StudyToolsPanel({
  disabled,
  imageGenerationAvailable,
  current,
  onChoose,
}: {
  disabled: boolean;
  imageGenerationAvailable?: boolean;
  /** Tool whose form is open, marked «En uso». */
  current?: string;
  onChoose: (tool: { kind: string; title: string }) => void;
}) {
  const tools = availableStudyTools(imageGenerationAvailable);
  return (
    <div className="study-exact-tools-panel">
      {studyToolGroups.map((group) => (
        <section key={group.id} className="study-exact-tools" aria-label={group.label}>
          <h3 aria-hidden="true">{group.label}</h3>
          {tools.filter((tool) => tool.group === group.id).map((tool) => (
            <button key={tool.kind} type="button" disabled={disabled} aria-current={current === tool.kind || undefined}
              onClick={() => onChoose({ kind: tool.kind, title: tool.title })}>
              <StudyToolIconMark tool={tool} />
              <span>
                <b>{tool.title}</b>
                <small>{tool.hint}</small>
              </span>
              {current === tool.kind && <em className="study-exact-tool-current">En uso</em>}
            </button>
          ))}
        </section>
      ))}
    </div>
  );
}
