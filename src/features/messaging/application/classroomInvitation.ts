import type { Classroom, Conversation, DirectMessageItem } from '../../../types';
import type { ClassroomEnrollment } from '../../classrooms';

export interface SendClassroomInvitationParams {
  recipientStudentId?: string;
  recipientStudentName?: string;
  recipientEmail?: string;
  senderTeacherId: string;
  senderTeacherName: string;
  classroom: Classroom | {
    id: string;
    subject: string;
    course: string;
    color?: string;
    description?: string;
    activeTasks?: number;
    schedule?: string[];
  };
  code: string;
  customNote?: string;
}

export interface RespondToClassroomInvitationParams {
  conversationId: string;
  messageId: string;
  response: 'accepted' | 'declined';
  responderId: string;
  responderName: string;
}

// The store remains the mutable owner. Read its current array at each original
// access point; formatting and notification can synchronously reenter the store.
export function sendClassroomInvitation(
  params: SendClassroomInvitationParams,
  conversations: () => Conversation[],
  notify: () => void,
): { conversationId: string; messageId: string } {
  const studentName = params.recipientStudentName ||
    (params.recipientEmail ? params.recipientEmail.split('@')[0] : 'Estudiante');
  const studentId = params.recipientStudentId || `alumno-${studentName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;

  // Find existing direct conversation between this teacher and student
  let conv = conversations().find(c =>
    c.type === 'direct' &&
    c.participants.some(p => p.id === params.senderTeacherId || (p.role === 'docente' && p.name === params.senderTeacherName)) &&
    c.participants.some(p => p.id === studentId || p.name.toLowerCase() === studentName.toLowerCase() || (params.recipientEmail && p.email === params.recipientEmail))
  );

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  if (!conv) {
    // Create new direct conversation
    const convId = `dm-${params.senderTeacherId.replace('docente-', '')}-${studentId.replace('alumno-', '')}-${Date.now()}`;
    conv = {
      id: convId,
      type: 'direct',
      title: studentName,
      subtitle: `Alumna/o — ${params.classroom.course}`,
      avatarInitial: studentName.substring(0, 2).toUpperCase(),
      colorScheme: 'fox-purple',
      classroomLink: params.classroom.id,
      participants: [
        { id: params.senderTeacherId, name: params.senderTeacherName, role: 'docente', course: `${params.classroom.subject} ${params.classroom.course}`, status: 'online' },
        { id: studentId, name: studentName, role: 'alumno', course: params.classroom.course, email: params.recipientEmail, status: 'online' }
      ],
      lastMessage: `🎓 Invitación al aula ${params.classroom.subject}`,
      lastMessageTime: timeStr,
      lastMessageSender: params.senderTeacherName,
      unreadCountDocente: 0,
      unreadCountAlumno: 1,
      isPinned: false,
      tags: [params.classroom.subject, params.classroom.course, 'Invitación'],
      messages: []
    };
    conversations().unshift(conv);
  }

  const invitationMsgId = `msg-inv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
  const introText = params.customNote?.trim()
    ? params.customNote.trim()
    : `¡Hola ${studentName}! Te envío la invitación oficial para unirte a nuestra aula virtual de ${params.classroom.subject} (${params.classroom.course}).`;

  const newMsg: DirectMessageItem = {
    id: invitationMsgId,
    senderId: params.senderTeacherId,
    senderName: params.senderTeacherName,
    senderRole: 'docente',
    text: `${introText}\n\nPuedes aceptar la invitación directamente desde esta tarjeta interactiva o ingresar con el código de clase.`,
    timestamp: timeStr,
    dateGroup: 'Hoy',
    status: 'delivered',
    categoryTag: 'Invitación',
    invitation: {
      classroomId: params.classroom.id,
      subject: params.classroom.subject,
      course: params.classroom.course,
      teacherName: params.senderTeacherName,
      code: params.code,
      status: 'pending',
      color: params.classroom.color || 'bg-fox-purple',
      schedule: params.classroom.schedule || ['Martes 10:00 hs', 'Jueves 11:30 hs'],
      description: params.classroom.description || `Espacio pedagógico oficial de ${params.classroom.subject} en FoxMind.`,
      activeTasks: params.classroom.activeTasks ?? 1
    }
  };

  conv.messages.push(newMsg);
  conv.lastMessage = `🎓 Invitación al aula ${params.classroom.subject} (${params.classroom.course})`;
  conv.lastMessageTime = timeStr;
  conv.lastMessageSender = params.senderTeacherName;
  conv.unreadCountAlumno = (conv.unreadCountAlumno || 0) + 1;

  notify();
  return { conversationId: conv.id, messageId: invitationMsgId };
}

export function respondToClassroomInvitation(
  params: RespondToClassroomInvitationParams,
  conversations: () => Conversation[],
  enroll: (classroom: ClassroomEnrollment) => void,
  notify: () => void,
): void {
  const conv = conversations().find(c => c.id === params.conversationId);
  if (!conv) return;

  const msg = conv.messages.find(m => m.id === params.messageId);
  if (!msg || !msg.invitation) return;

  msg.invitation.status = params.response;

  // Enrollment stays synchronous and precedes the confirmation reply.
  if (params.response === 'accepted') {
    enroll({
      id: msg.invitation.classroomId,
      subject: msg.invitation.subject,
      course: msg.invitation.course,
      color: msg.invitation.color || 'bg-fox-blue',
      teacherName: msg.invitation.teacherName || msg.senderName,
      activeTasks: msg.invitation.activeTasks || 1
    });
  }

  const now = new Date();
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Send confirmation reply in the conversation
  const replyText = params.response === 'accepted'
    ? `✅ ¡Muchas gracias ${msg.senderName}! He aceptado la invitación y ya me sumé al aula virtual de ${msg.invitation.subject} (${msg.invitation.course}).`
    : `He recibido la invitación para ${msg.invitation.subject} (${msg.invitation.course}), pero en este momento no me será posible cursarla. ¡Muchas gracias por la convocatoria!`;

  const confirmationMsg: DirectMessageItem = {
    id: `msg-resp-${Date.now()}`,
    senderId: params.responderId,
    senderName: params.responderName,
    senderRole: 'alumno',
    text: replyText,
    timestamp: timeStr,
    dateGroup: 'Hoy',
    status: 'sent',
    replyTo: {
      id: msg.id,
      senderName: msg.senderName,
      text: `Invitación al aula: ${msg.invitation.subject}`
    },
    categoryTag: params.response === 'accepted' ? 'Confirmación' : 'Consulta'
  };

  conv.messages.push(confirmationMsg);
  conv.lastMessage = replyText;
  conv.lastMessageTime = timeStr;
  conv.lastMessageSender = params.responderName;
  conv.unreadCountDocente = (conv.unreadCountDocente || 0) + 1;

  notify();
}
