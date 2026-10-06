import { Conversation, MessageAttachment, MessageReaction, Role, ClassroomInvitationData } from '../../types';
import { classroomRepository } from '../classrooms';
import { loadMessagingConversations, saveMessagingConversations } from './messagingPersistence';
import { sendClassroomInvitation, respondToClassroomInvitation } from './application/classroomInvitation';
import type { SendClassroomInvitationParams, RespondToClassroomInvitationParams } from './application/classroomInvitation';
import * as conversationActions from './application/conversationActions';
import * as messageSending from './application/messageSending';
import { createConversation } from './application/conversationCreation';
import { createInitialConversations } from './fixtures/initialConversations';

// Initial pre-populated conversations with true bidirectional link between Docente and Alumno
const INITIAL_CONVERSATIONS: Conversation[] = createInitialConversations();

// In-memory singleton with localStorage persistence fallback
class MessagingStore {
  private conversations: Conversation[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.load();
  }

  private load() {
    loadMessagingConversations(
      INITIAL_CONVERSATIONS,
      conversations => { this.conversations = conversations; },
      () => this.save(),
    );
  }

  private save() {
    saveMessagingConversations(() => this.conversations);
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.save();
    this.listeners.forEach(fn => fn());
  }

  public getConversations(): Conversation[] {
    return conversationActions.getConversations(this.conversations);
  }

  public getConversationById(id: string): Conversation | undefined {
    return conversationActions.getConversationById(this.conversations, id);
  }

  public getUnreadCount(role: 'docente' | 'alumno'): number {
    return conversationActions.getUnreadCount(this.conversations, role);
  }

  public markAsRead(conversationId: string, role: 'docente' | 'alumno') {
    conversationActions.markAsRead(this.conversations, conversationId, role, () => this.notify());
  }

  public togglePin(conversationId: string) {
    conversationActions.togglePin(this.conversations, conversationId, () => this.notify());
  }

  public toggleMute(conversationId: string) {
    conversationActions.toggleMute(this.conversations, conversationId, () => this.notify());
  }

  public addReaction(conversationId: string, messageId: string, emoji: string, userName: string) {
    conversationActions.addReaction(this.conversations, conversationId, messageId, emoji, userName, () => this.notify());
  }

  public sendMessage(params: {
    conversationId: string;
    senderId: string;
    senderName: string;
    senderRole: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy';
    text: string;
    attachment?: MessageAttachment;
    replyTo?: { id: string; senderName: string; text: string };
    categoryTag?: string;
  }) {
    messageSending.sendMessage(
      params,
      () => this.conversations,
      () => this.notify(),
      (conv, input) => this.simulateFoxyBotReply(conv.id, input.text, input.senderRole),
    );
  }

  private simulateFoxyBotReply(conversationId: string, userText: string, role: 'docente' | 'alumno' | 'foxy' | 'directivo' | 'preceptor' | Role) {
    messageSending.simulateFoxyBotReply(
      conversationId, userText, role, () => this.conversations, () => this.notify(),
    );
  }

  public createConversation(params: {
    title: string;
    type: 'direct' | 'channel';
    participants: { id: string; name: string; role: 'docente' | 'alumno' | 'directivo' | 'preceptor' | 'foxy'; course?: string }[];
    initialMessage: string;
    senderId: string;
    senderName: string;
    senderRole: 'docente' | 'alumno';
    categoryTag?: string;
  }): Conversation {
    return createConversation(
      params,
      conversation => { this.conversations.unshift(conversation); },
      () => this.notify(),
    );
  }

  public sendClassroomInvitation(params: SendClassroomInvitationParams): { conversationId: string; messageId: string } {
    return sendClassroomInvitation(params, () => this.conversations, () => this.notify());
  }

  public respondToClassroomInvitation(params: RespondToClassroomInvitationParams): void {
    respondToClassroomInvitation(
      params,
      () => this.conversations,
      classroom => classroomRepository.add(classroom),
      () => this.notify(),
    );
  }

  public resetToDefault() {
    this.conversations = INITIAL_CONVERSATIONS;
    this.notify();
  }
}

export const messagingStore = new MessagingStore();
