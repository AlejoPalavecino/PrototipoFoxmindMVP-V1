import type { Conversation } from '../../types';

const STORAGE_KEY = 'foxmind_shared_messages_v5';

export function loadMessagingConversations(
  initial: Conversation[],
  assign: (conversations: Conversation[]) => void,
  save: () => void,
): void {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      assign(JSON.parse(saved));
    } else {
      // Publish the live fallback before saving, as the original store did.
      assign(initial);
      save();
    }
  } catch {
    assign(initial);
  }
}

export function saveMessagingConversations(readConversations: () => Conversation[]): void {
  try {
    // Resolve storage AND setItem before reading state, all inside the catch boundary.
    localStorage.setItem(STORAGE_KEY, JSON.stringify(readConversations()));
  } catch {
    // ignore in iframe restricted quota
  }
}
