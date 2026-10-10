import type { Conversation, DirectMessageItem, MessageAttachment, Role } from '../../../types';

export interface SendMessageParams {
  conversationId: string;
  senderId: string;
  senderName: string;
  senderRole: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy';
  text: string;
  attachment?: MessageAttachment;
  replyTo?: { id: string; senderName: string; text: string };
  categoryTag?: string;
}

type ReplyRole = SendMessageParams['senderRole'] | Role;

export function canAccessConversation(conversation: Conversation, userId: string): boolean {
  return conversation.type !== 'direct' || conversation.participants.some(p => p.id === userId);
}

// The store retains state/persistence and the late-bound private reply hook.
export function sendMessage(
  params: SendMessageParams,
  readConversations: () => Conversation[],
  notify: () => void,
  reply: (conversation: Conversation, params: SendMessageParams) => void,
): void {
  const conv = readConversations().find(c => c.id === params.conversationId);
  if (!conv) return;
  if (!canAccessConversation(conv, params.senderId)) {
    throw new Error('No perteneces a esta conversación.');
  }

  // Strict School Policy Enforcement:
  // Alumnos can only send messages to teachers / staff / classroom channels / Foxy.
  // Alumnos cannot message another alumno directly.
  if (params.senderRole === 'alumno' && conv.type === 'direct') {
    const recipient = conv.participants.find(p => p.id !== params.senderId);
    if (recipient && recipient.role === 'alumno') {
      throw new Error('Normativa escolar: Los alumnos únicamente pueden comunicarse directamente con sus docentes y preceptoría.');
    }
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const newMessage: DirectMessageItem = {
    id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    senderId: params.senderId,
    senderName: params.senderName,
    senderRole: params.senderRole,
    text: params.text,
    timestamp: timeStr,
    dateGroup: 'Hoy',
    status: 'sent',
    replyTo: params.replyTo,
    attachment: params.attachment,
    categoryTag: params.categoryTag
  };

  conv.messages.push(newMessage);
  conv.lastMessage = params.attachment
    ? `📎 ${params.attachment.name} - ${params.text || 'Archivo adjunto'}`
    : params.text;
  conv.lastMessageTime = timeStr;
  conv.lastMessageSender = params.senderName;

  // Increment unread count for other role
  if (params.senderRole === 'docente') {
    conv.unreadCountAlumno = (conv.unreadCountAlumno || 0) + 1;
  } else if (params.senderRole === 'alumno') {
    conv.unreadCountDocente = (conv.unreadCountDocente || 0) + 1;
  }

  notify();

  // Keep both objects captured: listeners and later callers can mutate their fields.
  if (conv.type === 'bot' || conv.id === 'dm-foxy-copilot') {
    setTimeout(() => {
      reply(conv, params);
    }, 900);
  }
}

export function simulateFoxyBotReply(
  conversationId: string,
  userText: string,
  role: ReplyRole,
  readConversations: () => Conversation[],
  notify: () => void,
): void {
  // Resolve current state at fire, not the array/object from send time.
  const conv = readConversations().find(c => c.id === conversationId);
  if (!conv) return;

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  let botReplyText = '';
  const lower = userText.toLowerCase();

  if (role === 'docente') {
    if (lower.includes('ensayo') || lower.includes('rubrica') || lower.includes('evaluacion')) {
      botReplyText = '📋 **Sugerencia pedagógica para evaluación:**\nPara el ensayo de Vanguardias te recomiendo ponderar:\n1. Comprensión de manifiestos (30%)\n2. Justificación de citas textuales (40%)\n3. Coherencia estilística y DUA (30%)\n\n¿Querés que redacte un mensaje de aviso al aula 3°A con estas pautas?';
    } else if (lower.includes('borrador') || lower.includes('mensaje') || lower.includes('aviso')) {
      botReplyText = '✍️ **Borrador de comunicado sugerido:**\n"Estimadas familias y alumnos: Les recordamos que las consultas sobre el trabajo práctico pueden realizarse por este canal hasta las 18:00 hs. ¡Muchos éxitos!"\n\nPodés copiarlo o editarlo libremente.';
    } else {
      botReplyText = `🦊 **Foxy Copiloto:** Entendido. Analicé tu consulta sobre "${userText.slice(0, 40)}...". Te sugiero mantener una respuesta concisa con preguntas de activación socrática para fomentar la autonomía del alumno.`;
    }
  } else {
    if (lower.includes('duda') || lower.includes('ensayo') || lower.includes('vanguardia')) {
      botReplyText = '💡 **Guía de estudio Foxy:**\nPara tu ensayo recordá que Vicente Huidobro (Creacionismo) proponía que *"el poeta es un pequeño Dios"*, mientras que el Ultraísmo buscaba la imagen pura sin adjetivos inútiles.\n\n¿Querés que formulemos una consulta clara para tu profesora Laura Martínez?';
    } else {
      botReplyText = `🦊 **Foxy Tutor:** ¡Muy bien planteado! Recordá que podés consultarle directamente a tus docentes por este canal oficial o dejar tu duda en el canal general de tu aula.`;
    }
  }

  const botMessage: DirectMessageItem = {
    id: `msg-foxy-${Date.now()}`,
    senderId: 'bot-foxy',
    senderName: 'Foxy Copiloto IA',
    senderRole: 'foxy',
    text: botReplyText,
    timestamp: timeStr,
    dateGroup: 'Hoy',
    status: 'read'
  };

  conv.messages.push(botMessage);
  conv.lastMessage = botReplyText.slice(0, 70) + '...';
  conv.lastMessageTime = timeStr;
  conv.lastMessageSender = 'Foxy Copiloto IA';

  if (role === 'docente') {
    conv.unreadCountDocente = (conv.unreadCountDocente || 0) + 1;
  } else {
    conv.unreadCountAlumno = (conv.unreadCountAlumno || 0) + 1;
  }

  notify();
}
