import type { Conversation } from '../../../types';

// Each operation first reads the store array, before any observable effects.
// The store supplies that live array and retains persistence/listener ownership.
export function getConversations(conversations: Conversation[]): Conversation[] {
  return [...conversations];
}

export function getConversationById(conversations: Conversation[], id: string): Conversation | undefined {
  return conversations.find(c => c.id === id);
}

export function getUnreadCount(conversations: Conversation[], role: 'docente' | 'alumno'): number {
  return conversations.reduce((acc, c) => {
    return acc + (role === 'docente' ? (c.unreadCountDocente || 0) : (c.unreadCountAlumno || 0));
  }, 0);
}

export function markAsRead(
  conversations: Conversation[], conversationId: string, role: 'docente' | 'alumno', notify: () => void,
): void {
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return;

  if (role === 'docente' && conv.unreadCountDocente > 0) {
    conv.unreadCountDocente = 0;
    notify();
  } else if (role === 'alumno' && conv.unreadCountAlumno > 0) {
    conv.unreadCountAlumno = 0;
    notify();
  }
}

export function togglePin(conversations: Conversation[], conversationId: string, notify: () => void): void {
  const conv = conversations.find(c => c.id === conversationId);
  if (conv) {
    conv.isPinned = !conv.isPinned;
    notify();
  }
}

export function toggleMute(conversations: Conversation[], conversationId: string, notify: () => void): void {
  const conv = conversations.find(c => c.id === conversationId);
  if (conv) {
    conv.isMuted = !conv.isMuted;
    notify();
  }
}

export function addReaction(
  conversations: Conversation[], conversationId: string, messageId: string,
  emoji: string, userName: string, notify: () => void,
): void {
  const conv = conversations.find(c => c.id === conversationId);
  if (!conv) return;

  const msg = conv.messages.find(m => m.id === messageId);
  if (!msg) return;

  if (!msg.reactions) msg.reactions = [];
  const existing = msg.reactions.find(r => r.emoji === emoji);

  if (existing) {
    if (existing.users.includes(userName)) {
      // Toggle off
      existing.users = existing.users.filter(u => u !== userName);
      existing.count = existing.users.length;
      if (existing.count === 0) {
        msg.reactions = msg.reactions.filter(r => r.emoji !== emoji);
      }
    } else {
      existing.users.push(userName);
      existing.count = existing.users.length;
    }
  } else {
    msg.reactions.push({ emoji, count: 1, users: [userName] });
  }

  notify();
}
