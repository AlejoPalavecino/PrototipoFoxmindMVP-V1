import { useEffect, useRef, useState } from 'react';
import type { StudyDetail } from '../model/study-contracts.ts';

export function useStudyConversations(
  detail: StudyDetail,
  selected?: string,
  onSelect?: (id: string) => void,
) {
  const [conversation, setConversation] = useState(selected ?? '');
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [historyOpenKey, setHistoryOpenKey] = useState(0);
  const [renaming, setRenaming] = useState<{ id: string; title: string }>();
  const [renameTitle, setRenameTitle] = useState('');
  const [renameError, setRenameError] = useState('');
  const drafts = useRef(new Map<string, string>());
  useEffect(() => {
    if (selected !== undefined) setConversation(selected);
  }, [selected]);
  const current =
    conversation === 'new'
      ? undefined
      : conversation
        ? detail.conversations.find((item) => item.id === conversation)
        : detail.conversations.at(-1);
  const messages = current?.messages ?? current?.turns ?? [];
  const matchingChats = detail.conversations.filter((chat) =>
    chat.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  );
  function selectConversation(id: string) {
    setConversation(id);
    onSelect?.(id);
  }
  function openChat(id: string) {
    drafts.current.set(current?.id ?? 'new', text);
    setText(drafts.current.get(id) ?? '');
    selectConversation(id);
  }
  return {
    current,
    messages,
    text,
    setText,
    search,
    setSearch,
    matchingChats,
    selectConversation,
    openChat,
    historyOpenKey,
    setHistoryOpenKey,
    renaming,
    setRenaming,
    renameTitle,
    setRenameTitle,
    renameError,
    setRenameError,
  };
}
