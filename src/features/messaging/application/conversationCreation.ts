import type { Conversation } from '../../../types';

export interface CreateConversationParams {
  title: string;
  type: 'direct' | 'channel';
  participants: { id: string; name: string; role: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy'; course?: string }[];
  initialMessage: string;
  senderId: string;
  senderName: string;
  senderRole: 'docente' | 'alumno';
  categoryTag?: string;
}

export function createConversation(
  params: CreateConversationParams,
  insert: (conversation: Conversation) => void,
  notify: () => void,
): Conversation {
  // School Policy: Alumnos can only initiate direct messages with Docentes/Preceptors
  if (params.senderRole === 'alumno' && params.type === 'direct') {
    const isRecipientAnotherStudent = params.participants.some(p => p.id !== params.senderId && p.role === 'alumno');
    if (isRecipientAnotherStudent) {
      throw new Error('Normativa escolar: Los alumnos solo pueden comunicarse con docentes y autoridades escolares.');
    }
  }

  const id = `conv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newConv: Conversation = {
    id,
    type: params.type,
    title: params.title,
    subtitle: params.type === 'channel' ? 'Canal de grupo creado' : `${params.participants[0]?.name || 'Contacto'}`,
    avatarInitial: params.title.substring(0, 2).toUpperCase(),
    colorScheme: params.type === 'channel' ? 'fox-primary' : 'fox-orange',
    participants: [
      { id: params.senderId, name: params.senderName, role: params.senderRole, status: 'online' },
      ...params.participants.map(p => ({ ...p, status: 'online' as const }))
    ],
    lastMessage: params.initialMessage,
    lastMessageTime: timeStr,
    lastMessageSender: params.senderName,
    unreadCountDocente: params.senderRole === 'alumno' ? 1 : 0,
    unreadCountAlumno: params.senderRole === 'docente' ? 1 : 0,
    isPinned: false,
    messages: [
      {
        id: `msg-${Date.now()}`,
        senderId: params.senderId,
        senderName: params.senderName,
        senderRole: params.senderRole,
        text: params.initialMessage,
        timestamp: timeStr,
        dateGroup: 'Hoy',
        status: 'sent',
        categoryTag: params.categoryTag
      }
    ]
  };

  // Store-owned insertion resolves current state after all construction effects.
  insert(newConv);
  notify();
  return newConv;
}
