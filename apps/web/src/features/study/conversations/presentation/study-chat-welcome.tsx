import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import s from '../../ui/study.module.css';

export function StudyChatWelcome({ onPrompt }: { onPrompt: (value: string) => void }) {
  return (
    <div className={`${s.chatEmpty} parity-ai-chatEmpty`}>
      <div className={`${s.welcomeArt} parity-ai-foxyMark`}>
        <img src="/foxmind/foxy.webp" alt="" />
        <span className="parity-ai-orbitOne">
          <FoxmindIcon name="book" />
        </span>
        <span className="parity-ai-orbitTwo">
          <FoxmindIcon name="spark" />
        </span>
      </div>
      <h2>Un espacio para tus preguntas.</h2>
      <p>Preguntá, probá otra explicación o prepará tu próximo repaso. A tu ritmo.</p>
      <div className={`${s.welcomeActions} parity-ai-welcomeActions`}>
        <button onClick={() => onPrompt('Explicamelo con un ejemplo')}>
          <FoxmindIcon name="chat-square" />
          Explicamelo con un ejemplo
        </button>
        <button onClick={() => onPrompt('Quiero organizar mi repaso')}>
          <FoxmindIcon name="calendar" />
          Quiero organizar mi repaso
        </button>
      </div>
    </div>
  );
}
