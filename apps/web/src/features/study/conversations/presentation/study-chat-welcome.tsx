import s from '../../ui/study.module.css';
import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import { StudyToolIconMark } from '../../tools/study-tools-panel';
import { availableStudyTools } from '../../tools/study-tool-catalog.ts';

/** First screen of a conversation: four intents and the rest of the tools, one door each. */
export function StudyChatWelcome({
  disabled,
  imageGenerationAvailable,
  onTool,
}: {
  disabled: boolean;
  imageGenerationAvailable?: boolean;
  onTool: (tool: { kind: string; title: string }) => void;
}) {
  const tools = availableStudyTools(imageGenerationAvailable);
  return (
    <div className={`${s.chatEmpty} parity-ai-chatEmpty study-welcome`}>
      <img className="study-welcome-fox" src="/foxmind/foxy.webp" alt="" />
      <h2>¿Qué hacemos hoy?</h2>
      <p>Elegí los temas y contame qué necesitás. Foxy usa tus materiales y los del aula.</p>
      <div className="study-welcome-intents">
        {tools.filter((tool) => tool.group === 'study').map((tool) => (
          <button key={tool.kind} type="button" disabled={disabled} onClick={() => onTool({ kind: tool.kind, title: tool.title })}>
            <StudyToolIconMark tool={tool} />
            <b>{tool.title}</b>
            <small>{tool.hint}</small>
          </button>
        ))}
      </div>
      <div className="study-welcome-more" role="group" aria-label="Más herramientas">
        <span>Más herramientas</span>
        {tools.filter((tool) => tool.group === 'more').map((tool) => (
          <button key={tool.kind} type="button" disabled={disabled} onClick={() => onTool({ kind: tool.kind, title: tool.title })}>
            <FoxmindIcon name={tool.icon as 'book'} />
            {tool.title}
          </button>
        ))}
      </div>
    </div>
  );
}
