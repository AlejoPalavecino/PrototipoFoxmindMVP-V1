export type Role = 'none' | 'docente' | 'alumno';
export type ViewDocente = 'dashboard' | 'agenda' | 'aulas' | 'progreso' | 'copiloto' | 'mensajes' | 'config';
export type ViewAlumno = 'dashboard' | 'estudia' | 'aulas' | 'progreso' | 'mensajes' | 'config';

export interface StudentRisk {
  id: string;
  name: string;
  course: string;
  riskLevel: 'ALTO' | 'MEDIO' | 'BAJO';
  reason: string;
  duaProfile?: string[];
}

export interface Classroom {
  id: string;
  subject: string;
  course: string;
  studentsCount: number;
  progress: number;
  activeTasks: number;
  pendingSubmissions: number;
  avgGrade: number;
  color: string;
  teacherName?: string;
  nextClass?: string;
  lastActivity?: string;
  schedule?: string[];
  description?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export interface StudyFolderTopic {
  id: string;
  name: string;
  subtopics: string[];
  selected?: boolean;
  masteryLevel?: number;
  concepts?: string[];
}

export interface StudyFolder {
  id: string;
  name: string;
  linkedClassroom?: string;
  nextReview: string;
  progress: number;
  isPersonal?: boolean;
  color?: string;
  focusArea?: string;
  observation?: string;
  topics?: StudyFolderTopic[];
  files?: { name: string; size: string; type: string; url?: string }[];
  filesCount?: number;
  topicsCount?: number;
}

export interface Achievement {
  id: string;
  title: string;
  icon: string;
  earned: boolean;
  description?: string;
}

export interface MuroComment {
  id: string;
  authorName: string;
  authorRole: 'docente' | 'alumno' | 'foxy';
  timestamp: string;
  content: string;
}

export interface MuroPost {
  id: string;
  authorName: string;
  authorRole: 'docente' | 'alumno' | 'foxy';
  timestamp: string;
  title?: string;
  content: string;
  isPinned?: boolean;
  type?: 'announcement' | 'activity_notice' | 'material_notice' | 'doubt';
  attachment?: { name: string; size: string; type: string };
  likesCount: number;
  isLiked?: boolean;
  comments: MuroComment[];
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: string;
  type: 'pdf' | 'image' | 'audio' | 'doc' | 'link';
  url?: string;
  duration?: string; // For voice notes, e.g. "0:38"
}

export interface MessageReaction {
  emoji: string;
  count: number;
  users: string[];
}

export interface ClassroomInvitationData {
  classroomId: string;
  subject: string;
  course: string;
  teacherName: string;
  code: string;
  status: 'pending' | 'accepted' | 'declined';
  color?: string;
  schedule?: string[];
  description?: string;
  activeTasks?: number;
}

export interface DirectMessageItem {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy';
  senderAvatar?: string;
  text: string;
  timestamp: string;
  dateGroup: string;
  status: 'sending' | 'sent' | 'delivered' | 'read';
  replyTo?: {
    id: string;
    senderName: string;
    text: string;
  };
  attachment?: MessageAttachment;
  invitation?: ClassroomInvitationData;
  reactions?: MessageReaction[];
  categoryTag?: string; // 'Duda TP' | 'Examen' | 'Institucional' | 'Material' | 'Urgente' | 'Invitación'
}

export interface ConversationParticipant {
  id: string;
  name: string;
  role: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy';
  course?: string;
  email?: string;
  status?: 'online' | 'offline' | 'busy' | 'away';
  duaProfile?: string[];
}

export interface Conversation {
  id: string;
  type: 'direct' | 'channel' | 'bot';
  title: string;
  subtitle?: string;
  avatar?: string;
  avatarInitial?: string;
  colorScheme?: string;
  participants: ConversationParticipant[];
  classroomLink?: string; // Classroom ID if tied to a classroom
  lastMessage: string;
  lastMessageTime: string;
  lastMessageSender: string;
  unreadCountDocente: number;
  unreadCountAlumno: number;
  isPinned?: boolean;
  isMuted?: boolean;
  tags?: string[];
  messages: DirectMessageItem[];
}

