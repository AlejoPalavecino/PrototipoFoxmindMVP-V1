import { FoxmindIcon } from '../../../../../../shared-ui/FoxmindIcon';
import type { StudyConversation } from '../../model/study-contracts.ts';
export function StudyHistoryPanel({
  matchingChats,
  search,
  selectedId,
  disabled,
  locked,
  onSearch,
  onSelect,
  onRename,
}: {
  matchingChats: StudyConversation[];
  search: string;
  selectedId?: string;
  disabled: boolean;
  locked: boolean;
  onSearch: (value: string) => void;
  onSelect: (id: string) => void;
  onRename: (chat: StudyConversation) => void;
}) {
  return (
    <div className="study-exact-history">
      <header className="parity-foxy-sectionHead">
        <h2>Conversaciones</h2>
        <button type="button" disabled={disabled} onClick={() => onSelect('new')}>
          <FoxmindIcon name="plus" />
          Nueva
        </button>
      </header>
      <label className="parity-foxy-search">
        <FoxmindIcon name="search" />
        <input
          aria-label="Buscar conversaciones"
          type="search"
          placeholder="Buscar conversación"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      {!matchingChats.length && <p>No encontramos conversaciones con ese nombre.</p>}
      <ul className="parity-foxy-historyList">
        {[...matchingChats].reverse().map((chat) => (
          <li key={chat.id}>
            <button
              type="button"
              data-foxy-thread
              aria-current={selectedId === chat.id ? 'true' : undefined}
              disabled={locked}
              onClick={() => onSelect(chat.id)}
            >
              <FoxmindIcon name="chat" />
              <span>
                <strong>{chat.title}</strong>
                <small>En esta carpeta</small>
              </span>
            </button>
            <button
              type="button"
              disabled={disabled}
              data-foxy-rename
              aria-label={`Renombrar ${chat.title}`}
              onClick={() => onRename(chat)}
            >
              <FoxmindIcon name="edit" />
            </button>
          </li>
        ))}
      </ul>
      <p className="parity-foxy-privacy">
        <FoxmindIcon name="lock" />
        Este espacio es privado.
      </p>
    </div>
  );
}
