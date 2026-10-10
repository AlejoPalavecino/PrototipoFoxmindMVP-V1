import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Edit, MicOff, Sparkles, Pin, PinOff, 
  MoreVertical, ChevronLeft, MessageSquare, BookOpen, User, Users, 
  Check, CheckCheck, Smile, CornerUpLeft, X, FileText, Download, 
  Volume2, ExternalLink, Filter, Star, Info, PhoneCall, Video, Bot,
  AlertCircle, RefreshCw, ShieldCheck
} from 'lucide-react';
import { Role, Conversation, DirectMessageItem, MessageAttachment } from '../../types';
import { messagingStore } from '../../features/messaging/messagingStore';
import { canAccessConversation } from '../../features/messaging/application/messageSending';
import { runMessageSend, sendLocalMessage, type MessageSendState } from '../../features/messaging/application/messageSendState';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { ConversationSidebar } from './ConversationSidebar';
import { ClassroomInvitationCard } from './ClassroomInvitationCard';
import { MessageComposer } from './MessageComposer';
import { NewConversationModal } from './NewConversationModal';
import { FoxyMessageCopilotModal } from './FoxyMessageCopilotModal';
import { useAppContext } from '../../context';
import { toast } from '../ui/Toaster';

interface SharedMessagingHubProps {
  currentRole: Role;
  initialConversationId?: string;
}

export function resolveAccessibleConversation(
  conversations: Conversation[], userId: string, requestedId: string | null,
): Conversation | null {
  return conversations.find(c => c.id === requestedId && canAccessConversation(c, userId))
    ?? conversations.find(c => canAccessConversation(c, userId))
    ?? null;
}

interface ComposerContext {
  conversationId: string | null;
  replyingTo: DirectMessageItem | null;
  attachedFile: MessageAttachment | null;
}

export function isolateComposerContext(context: ComposerContext, conversationId: string | null): ComposerContext {
  return context.conversationId === conversationId
    ? context
    : { conversationId, replyingTo: null, attachedFile: null };
}

export function SharedMessagingHub({ currentRole, initialConversationId }: SharedMessagingHubProps) {
  const { setView } = useAppContext();

  // Current user identity details based on active role
  const effectiveRole: 'docente' | 'alumno' = currentRole === 'alumno' ? 'alumno' : 'docente';
  const currentUserId = effectiveRole === 'docente' ? 'docente-laura' : 'alumno-valentina';
  const currentUserName = effectiveRole === 'docente' ? 'Prof. Laura Martínez' : 'Valentina Rodríguez';

  // Resolve access during render, including prop/user/store changes before effects.
  const [conversations, setConversations] = useState<Conversation[]>(() => messagingStore.getConversations());
  const [selection, setSelection] = useState<{
    conversationId: string | null; navigationId: string | undefined;
  }>(() => ({
    conversationId: initialConversationId || 'dm-laura-valentina', navigationId: initialConversationId,
  }));
  const navigationChanged = selection.navigationId !== initialConversationId;
  const requestedConversationId = navigationChanged
    ? initialConversationId || 'dm-laura-valentina' : selection.conversationId;
  const activeConversation = resolveAccessibleConversation(conversations, currentUserId, requestedConversationId);
  const activeConversationId = activeConversation?.id ?? null;
  if (navigationChanged || selection.conversationId !== activeConversationId) {
    setSelection({ conversationId: activeConversationId, navigationId: initialConversationId });
  }
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [isMobileListVisible, setIsMobileListVisible] = useState(!initialConversationId);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showFoxyModal, setShowFoxyModal] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  
  // In-chat search
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Composer states
  const [inputText, setInputText] = useState('');
  const [storedComposerContext, setComposerContext] = useState<ComposerContext>(() => ({
    conversationId: activeConversationId, replyingTo: null, attachedFile: null,
  }));
  const composerContext = isolateComposerContext(storedComposerContext, activeConversationId);
  const sendGate = useRef(false);
  const sendLifetimeRef = useRef({ generation: 0, live: false });
  useEffect(() => {
    const lifetime = sendLifetimeRef.current;
    lifetime.generation++;
    lifetime.live = true;
    return () => {
      lifetime.generation++;
      lifetime.live = false;
    };
  }, []);
  const [sendState, setSendState] = useState<MessageSendState>({ pending: false, error: null });
  // Object identity distinguishes A -> B -> A from the original conversation visit.
  const currentComposerRef = useRef({ context: composerContext, userId: currentUserId });
  currentComposerRef.current = { context: composerContext, userId: currentUserId };
  const { replyingTo, attachedFile } = composerContext;
  const setReplyingTo = (reply: DirectMessageItem | null) => {
    setComposerContext(context => ({ ...isolateComposerContext(context, activeConversationId), replyingTo: reply }));
  };
  const setAttachedFile = (file: MessageAttachment | null) => {
    setComposerContext(context => ({ ...isolateComposerContext(context, activeConversationId), attachedFile: file }));
  };
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // Audio recording simulation
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);

  // Reaction picker hover state
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [activeReactionPickerId, setActiveReactionPickerId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Reset the complete composer before committing a different thread, including
  // traversal back to the no-ID default. Same-thread rerenders preserve drafts.
  if (composerContext !== storedComposerContext) {
    setComposerContext(composerContext);
    setInputText('');
    setSelectedTag(null);
    setIsRecordingAudio(false);
    setShowAttachmentPicker(false);
    if (sendState.error) setSendState(state => ({ ...state, error: null }));
  }

  const selectConversation = (conversationId: string) => {
    const conversation = messagingStore.getConversationById(conversationId);
    if (!conversation || !canAccessConversation(conversation, currentUserId)) return;
    setSelection({ conversationId, navigationId: initialConversationId });
    setIsMobileListVisible(false);
    setView('mensajes', { conversationId });
  };
  if (navigationChanged && isMobileListVisible !== !initialConversationId) {
    setIsMobileListVisible(!initialConversationId);
  }

  // Only an explicit unresolved request needs canonical correction. A no-ID
  // desktop default must leave the mobile list URL alone, including after Back.
  useEffect(() => {
    if (initialConversationId && initialConversationId !== activeConversationId) {
      setView('mensajes', activeConversationId ? { conversationId: activeConversationId } : undefined, 'replace');
    }
  }, [initialConversationId, activeConversationId, setView]);

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = messagingStore.subscribe(() => {
      setConversations(messagingStore.getConversations());
    });
    return unsubscribe;
  }, []);

  // Mark active conversation as read
  useEffect(() => {
    if (activeConversationId) {
      messagingStore.markAsRead(activeConversationId, currentRole === 'docente' ? 'docente' : 'alumno');
    }
  }, [activeConversationId, currentRole, conversations]);

  // Scroll only the message list; scrollIntoView also moves main/window ancestors.
  const scrollToBottom = () => {
    const container = messagesEndRef.current;
    container?.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
  };

  // Visibility commits before this effect, so opening the already-active mobile
  // default thread scrolls with a measurable list instead of its hidden layout.
  useEffect(() => {
    scrollToBottom();
  }, [activeConversationId, conversations, isMobileListVisible]);

  // Audio recording timer
  useEffect(() => {
    let timer: any;
    if (isRecordingAudio && !sendState.pending) {
      timer = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else if (!isRecordingAudio) {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecordingAudio, sendState.pending]);

  // Membership applies before search and every tab; channels retain their access.
  const accessibleConversations = conversations.filter(conv => canAccessConversation(conv, currentUserId));
  const filteredConversations = accessibleConversations.filter(conv => {
    // Search match
    const titleMatch = conv.title.toLowerCase().includes(searchQuery.toLowerCase());
    const subtitleMatch = (conv.subtitle || '').toLowerCase().includes(searchQuery.toLowerCase());
    const lastMsgMatch = conv.lastMessage.toLowerCase().includes(searchQuery.toLowerCase());
    const hasSearch = titleMatch || subtitleMatch || lastMsgMatch;

    if (!hasSearch) return false;

    // Role-tailored filter tabs
    if (filterType === 'todos') return true;
    if (filterType === 'unread') {
      return currentRole === 'docente' ? conv.unreadCountDocente > 0 : conv.unreadCountAlumno > 0;
    }
    if (filterType === 'pinned') return conv.isPinned;
    if (filterType === 'canales') return conv.type === 'channel';
    if (filterType === 'alumnos') return conv.type === 'direct' && conv.participants.some(p => p.role === 'alumno');
    if (filterType === 'docentes') return conv.type === 'direct' && conv.participants.some(p => p.role === 'docente');
    if (filterType === 'foxy') return conv.type === 'bot' || conv.id === 'dm-foxy-copilot';

    return true;
  });

  // Split pinned and unpinned
  const pinnedConversations = filteredConversations.filter(c => c.isPinned);
  const regularConversations = filteredConversations.filter(c => !c.isPinned);

  // Text/attachment and simulated voice share the same immediate in-flight gate.
  const handleSendMessage = () => {
    if (!inputText.trim() && !attachedFile) return;
    const capturedContext = composerContext;
    const capturedGeneration = sendLifetimeRef.current.generation;
    const isLive = () => sendLifetimeRef.current.live
      && sendLifetimeRef.current.generation === capturedGeneration;
    const isCurrent = () => isLive() && currentComposerRef.current.context === capturedContext
      && currentComposerRef.current.userId === currentUserId;

    return runMessageSend(sendGate, {
      operation: () => sendLocalMessage(messagingStore, {
        conversationId: activeConversationId || '',
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: effectiveRole,
        text: inputText.trim(),
        attachment: attachedFile || undefined,
        replyTo: replyingTo ? {
          id: replyingTo.id,
          senderName: replyingTo.senderName,
          text: replyingTo.text
        } : undefined,
        categoryTag: selectedTag || undefined
      }),
      isCurrent,
      isLive,
      onState: state => setSendState({ ...state, error: isCurrent() ? state.error : null }),
      onConfirmed: () => {
        setInputText('');
        setReplyingTo(null);
        setAttachedFile(null);
        setSelectedTag(null);
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
      },
    });
  };

  // Keep the simulated recording available after failure, without fake transport.
  const handleSendVoiceNote = () => {
    const capturedContext = composerContext;
    const capturedGeneration = sendLifetimeRef.current.generation;
    const isLive = () => sendLifetimeRef.current.live
      && sendLifetimeRef.current.generation === capturedGeneration;
    const isCurrent = () => isLive() && currentComposerRef.current.context === capturedContext
      && currentComposerRef.current.userId === currentUserId;
    const dur = recordingSeconds > 0
      ? `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}`
      : '0:15';

    return runMessageSend(sendGate, {
      operation: () => sendLocalMessage(messagingStore, {
        conversationId: activeConversationId || '',
        senderId: currentUserId,
        senderName: currentUserName,
        senderRole: effectiveRole,
        text: `🎙️ Nota de voz (${dur})`,
        attachment: {
          id: `voice-${Date.now()}`,
          name: `Audio_${effectiveRole === 'docente' ? 'ProfLaura' : 'Valentina'}.m4a`,
          size: `${Math.round(recordingSeconds * 12 + 100)} KB`,
          type: 'audio',
          duration: dur
        },
        categoryTag: selectedTag || undefined
      }),
      isCurrent,
      isLive,
      onState: state => setSendState({ ...state, error: isCurrent() ? state.error : null }),
      onConfirmed: () => {
        setIsRecordingAudio(false);
        setSelectedTag(null);
        toast.show('Nota de voz agregada al historial local', 'success');
      },
    });
  };

  // Sample quick templates
  const quickTemplates = currentRole === 'docente' ? [
    { label: '📢 Recordar entrega TP', text: 'Estimados: Recuerden que mañana vence el plazo para subir el trabajo práctico al aula.', tag: 'Aviso' },
    { label: '✅ Entrega recibida', text: 'Recibido. Estoy revisando tu entrega y en breve te comparto la devolución.', tag: 'Consulta' },
    { label: '📖 Guía en Biblioteca', text: 'Te recomiendo consultar el material complementario en la sección de Biblioteca del aula.', tag: 'Material' },
    { label: '💡 Reforzar citas', text: 'Recordá incorporar las dos citas textuales requeridas con formato APA.', tag: 'Duda TP' }
  ] : [
    { label: '❓ Duda de consigna', text: 'Hola profe, tengo una duda sobre la consigna del trabajo práctico: ¿podemos incluir imágenes?', tag: 'Duda TP' },
    { label: '📤 Ya subí el TP', text: 'Hola profe, le aviso que ya subí el archivo corregido a la sección de Aulas.', tag: 'Entrega' },
    { label: '💡 ¿Entra en examen?', text: 'Profe, ¿este tema entra en la evaluación de la semana que viene?', tag: 'Examen' },
    { label: '🙏 ¡Muchas gracias!', text: '¡Muchas gracias por la explicación y el material adjunto!', tag: 'Consulta' }
  ];

  // Sample simulated files for attachment picker
  const sampleAttachments: MessageAttachment[] = [
    { id: 'att-sample-1', name: 'Borrador_Ensayo_Vanguardias.pdf', size: '1.2 MB', type: 'pdf' },
    { id: 'att-sample-2', name: 'Guia_Trabajo_Practico_Literatura.docx', size: '850 KB', type: 'doc' },
    { id: 'att-sample-3', name: 'Foto_Apunte_Pizarron.jpg', size: '2.1 MB', type: 'image' },
    { id: 'att-sample-4', name: 'Resumen_Manifiestos_Huidobro.pdf', size: '640 KB', type: 'pdf' }
  ];

  // Emojis for quick reactions
  const EMOJIS = ['👍', '❤️', '💡', '👏', '❓', '🌟'];

  // In-chat filtered messages
  const displayMessages = (activeConversation?.messages || []).filter(msg => {
    if (!inChatSearchQuery.trim()) return true;
    return msg.text.toLowerCase().includes(inChatSearchQuery.toLowerCase()) ||
           msg.senderName.toLowerCase().includes(inChatSearchQuery.toLowerCase());
  });

  return (
    <div className="flex h-full flex-col font-sans overflow-hidden">
      {/* Top Header & Cross-Role Sync Banner */}
      <header className="flex flex-col gap-4 mb-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-2xl bg-fox-orange/10 text-fox-orange border border-fox-orange/20 flex items-center justify-center shrink-0">
                <MessageSquare className="w-6 h-6" />
              </span>
              <span>Mensajería Escolar</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-semibold flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Sincronizado en Vivo
              </span>
            </h2>
            <p className="text-fox-text-muted mt-1.5 text-xs sm:text-sm max-w-2xl leading-relaxed">
              Conectado como <strong className="text-fox-text-main font-bold">{currentUserName}</strong> ({currentRole === 'docente' ? 'Docente' : 'Alumna'}).
              Espacio unificado de consultas pedagógicas, seguimiento y comunicación escolar directa.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <button
              onClick={() => setShowNewModal(true)}
              className="bg-fox-orange hover:bg-fox-orange/90 text-white px-4 py-2.5 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-sm font-bold text-xs sm:text-sm active:scale-98 shrink-0 w-full sm:w-auto hover:shadow-md hover:scale-[1.02]"
            >
              <Edit size={16} /> <span>Nuevo Mensaje</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Messaging Container Dual-Pane */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl shadow-sm flex flex-1 min-h-0 overflow-hidden">
        {/* ===================== SIDEBAR CONVERSATIONS ===================== */}
        <ConversationSidebar
          currentRole={currentRole}
          searchQuery={searchQuery}
          filterType={filterType}
          activeConversationId={activeConversationId}
          isMobileListVisible={isMobileListVisible}
          filteredConversations={filteredConversations}
          pinnedConversations={pinnedConversations}
          regularConversations={regularConversations}
          onSearchChange={setSearchQuery}
          onClearSearch={() => setSearchQuery('')}
          onFilterChange={setFilterType}
          onSelectConversation={selectConversation}
          onNewConversation={() => setShowNewModal(true)}
        />

        {/* ===================== CHAT VIEWPORT ===================== */}
        <div className={`flex-1 flex flex-col bg-fox-bg/20 min-w-0 ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {activeConversation ? (
            <>
              {/* Conversation Top Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-fox-border bg-fox-surface flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => {
                      setIsMobileListVisible(true);
                      setView('mensajes', undefined, 'replace');
                    }}
                    className="md:hidden p-1.5 -ml-1 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg rounded-xl transition-colors"
                  >
                    <ChevronLeft size={22} />
                  </button>

                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm shadow-sm ${
                      activeConversation.type === 'channel'
                        ? 'bg-fox-primary/20 text-fox-primary border border-fox-primary/30'
                        : activeConversation.type === 'bot'
                        ? 'bg-fox-gold/20 text-fox-gold border border-fox-gold/30'
                        : 'bg-fox-purple/20 text-fox-purple border border-fox-purple/30'
                    }`}>
                      {activeConversation.type === 'channel' ? (
                        <Users size={18} />
                      ) : activeConversation.type === 'bot' ? (
                        '🦊'
                      ) : (
                        activeConversation.avatarInitial || activeConversation.title.substring(0, 2).toUpperCase()
                      )}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-fox-green border-2 border-fox-surface" />
                  </div>

                  {/* Info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-heading font-bold text-fox-text-main text-sm sm:text-base truncate">
                        {activeConversation.title}
                      </h3>
                      {activeConversation.isPinned && (
                        <Star size={13} className="text-fox-gold fill-fox-gold shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-fox-text-muted truncate">
                      {activeConversation.subtitle || (activeConversation.type === 'channel' ? `${activeConversation.participants.length} participantes` : 'En línea')}
                    </p>
                  </div>
                </div>

                {/* Right Action Icons */}
                <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                  {/* Link to Classroom if available */}
                  {activeConversation.classroomLink && (
                    <button
                      onClick={() => setView('aulas')}
                      title="Ir al Aula vinculada"
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-fox-primary/10 text-fox-primary hover:bg-fox-primary/20 transition-colors"
                    >
                      <BookOpen size={14} /> <span>Ver Aula</span>
                    </button>
                  )}

                  {/* Foxy AI Assistant Trigger */}
                  <button
                    onClick={() => setShowFoxyModal(true)}
                    title="Asistente Foxy Copiloto"
                    className="p-2 rounded-xl text-fox-purple hover:bg-fox-purple/10 transition-colors flex items-center gap-1.5 text-xs font-bold"
                  >
                    <Sparkles size={18} />
                    <span className="hidden lg:inline">Foxy Copiloto</span>
                  </button>

                  {/* Search in chat toggle */}
                  <button
                    onClick={() => setInChatSearchOpen(!inChatSearchOpen)}
                    title="Buscar en mensajes"
                    className={`p-2 rounded-xl transition-colors ${
                      inChatSearchOpen ? 'bg-fox-primary text-white' : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg'
                    }`}
                  >
                    <Search size={18} />
                  </button>

                  {/* Pin conversation */}
                  <button
                    onClick={() => {
                      messagingStore.togglePin(activeConversation.id);
                      toast.show(activeConversation.isPinned ? 'Conversación desfijada' : 'Conversación fijada al inicio', 'info');
                    }}
                    title={activeConversation.isPinned ? 'Desfijar' : 'Fijar conversación'}
                    className="p-2 rounded-xl text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg transition-colors hidden sm:block"
                  >
                    {activeConversation.isPinned ? <PinOff size={18} /> : <Pin size={18} />}
                  </button>
                </div>
              </div>

              {/* In-Chat Search Bar (Dropdown) */}
              <AnimatePresence>
                {inChatSearchOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-fox-surface border-b border-fox-border px-6 py-2.5 flex items-center gap-3 overflow-hidden"
                  >
                    <Search size={16} className="text-fox-text-muted" />
                    <input
                      type="text"
                      value={inChatSearchQuery}
                      onChange={e => setInChatSearchQuery(e.target.value)}
                      placeholder="Buscar palabras o consignas en este chat..."
                      className="flex-1 bg-transparent text-xs sm:text-sm text-fox-text-main focus:outline-none font-medium"
                      autoFocus
                    />
                    {inChatSearchQuery && (
                      <span className="text-xs text-fox-text-muted font-bold">
                        {displayMessages.length} resultados
                      </span>
                    )}
                    <button
                      onClick={() => {
                        setInChatSearchQuery('');
                        setInChatSearchOpen(false);
                      }}
                      className="text-fox-text-muted hover:text-fox-text-main"
                    >
                      <X size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Message Thread Scroll Area */}
              <div ref={messagesEndRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {displayMessages.length > 0 ? (
                  displayMessages.map((msg, idx) => {
                    const isMe = msg.senderId === currentUserId || 
                                 (currentRole === 'docente' && msg.senderRole === 'docente') ||
                                 (currentRole === 'alumno' && msg.senderRole === 'alumno' && msg.senderName === currentUserName);
                    
                    const isFoxyBot = msg.senderRole === 'foxy';

                    return (
                      <motion.div
                        key={msg.id || idx}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}
                        onMouseEnter={() => setHoveredMessageId(msg.id)}
                        onMouseLeave={() => {
                          setHoveredMessageId(null);
                          if (activeReactionPickerId === msg.id) setActiveReactionPickerId(null);
                        }}
                      >
                        {/* Sender Label for Group/Other messages */}
                        {!isMe && (
                          <div className="flex items-center gap-2 mb-1 pl-1">
                            <span className="text-[11px] font-bold text-fox-text-main">
                              {msg.senderName}
                            </span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                              msg.senderRole === 'docente' ? 'bg-fox-primary/15 text-fox-primary' :
                              msg.senderRole === 'alumno' ? 'bg-fox-purple/15 text-fox-purple' :
                              msg.senderRole === 'foxy' ? 'bg-fox-gold/20 text-fox-gold font-bold' :
                              'bg-fox-orange/15 text-fox-orange'
                            }`}>
                              {msg.senderRole}
                            </span>
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div className={`relative max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 transition-all shadow-sm ${
                          isMe
                            ? 'bg-gradient-to-br from-fox-orange to-orange-600 text-white rounded-tr-sm'
                            : isFoxyBot
                            ? 'bg-gradient-to-br from-fox-surface to-amber-50/50 border border-fox-gold/40 text-fox-text-main rounded-tl-sm'
                            : 'bg-fox-surface border border-fox-border text-fox-text-main rounded-tl-sm'
                        }`}>
                          {/* Category Tag if set */}
                          {msg.categoryTag && (
                            <div className="mb-2">
                              <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                                isMe 
                                  ? 'bg-white/20 text-white' 
                                  : 'bg-fox-orange/15 text-fox-orange border border-fox-orange/20'
                              }`}>
                                🏷️ {msg.categoryTag}
                              </span>
                            </div>
                          )}

                          {/* Reply Quote preview if replying */}
                          {msg.replyTo && (
                            <div className={`mb-2.5 p-2 rounded-xl text-xs border-l-4 leading-snug ${
                              isMe
                                ? 'bg-black/15 border-white/80 text-white/90'
                                : 'bg-fox-bg border-fox-primary text-fox-text-muted'
                            }`}>
                              <span className="font-bold block text-[10px] opacity-80">{msg.replyTo.senderName}</span>
                              <span className="line-clamp-1 italic">{msg.replyTo.text}</span>
                            </div>
                          )}

                          {/* Message Text with simple formatting */}
                          <div className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed break-words font-medium">
                            {msg.text}
                          </div>

                          {/* Classroom Invitation Card */}
                          {msg.invitation && (
                            <ClassroomInvitationCard
                              invitation={msg.invitation}
                              isMe={isMe}
                              effectiveRole={effectiveRole}
                              onCopy={() => {
                                navigator.clipboard.writeText(msg.invitation!.code);
                                toast.show('Código copiado al portapapeles', 'info');
                              }}
                              onAccept={() => {
                                messagingStore.respondToClassroomInvitation({
                                  conversationId: activeConversation.id,
                                  messageId: msg.id,
                                  response: 'accepted',
                                  responderId: currentUserId,
                                  responderName: currentUserName
                                });
                                toast.show(`🎉 ¡Te uniste al aula ${msg.invitation?.subject}! Ya está en tus Aulas.`, 'success');
                              }}
                              onDecline={() => {
                                messagingStore.respondToClassroomInvitation({
                                  conversationId: activeConversation.id,
                                  messageId: msg.id,
                                  response: 'declined',
                                  responderId: currentUserId,
                                  responderName: currentUserName
                                });
                                toast.show('Invitación declinada', 'info');
                              }}
                              onNavigate={() => setView('aulas')}
                            />
                          )}

                          {/* Document / File Attachment */}
                          {msg.attachment && msg.attachment.type !== 'audio' && (
                            <div className={`mt-3 p-3 rounded-2xl flex items-center justify-between border ${
                              isMe 
                                ? 'bg-black/15 border-white/20 text-white' 
                                : 'bg-fox-bg/70 border-fox-border text-fox-text-main'
                            }`}>
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isMe ? 'bg-white/20 text-white' : 'bg-fox-primary/10 text-fox-primary'
                                }`}>
                                  <FileText size={18} />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate">{msg.attachment.name}</p>
                                  <p className="text-[10px] opacity-75">{msg.attachment.size} • {msg.attachment.type.toUpperCase()}</p>
                                </div>
                              </div>
                              <button
                                onClick={() => toast.show(`Descargando ${msg.attachment?.name}...`, 'info')}
                                className={`p-2 rounded-xl transition-colors shrink-0 ml-2 ${
                                  isMe ? 'hover:bg-white/20 text-white' : 'hover:bg-fox-border text-fox-text-muted hover:text-fox-text-main'
                                }`}
                                title="Descargar archivo"
                              >
                                <Download size={15} />
                              </button>
                            </div>
                          )}

                          {/* Audio Voice Note Player */}
                          {msg.attachment && msg.attachment.type === 'audio' && (
                            <VoiceNotePlayer
                              attachment={msg.attachment}
                              isMyMessage={isMe}
                            />
                          )}

                          {/* Timestamp & Status */}
                          <div className={`flex items-center justify-end gap-1.5 mt-2 text-[10px] ${
                            isMe ? 'text-white/80' : 'text-fox-text-muted'
                          }`}>
                            <span>{msg.timestamp}</span>
                            {isMe && (
                              <span title={msg.status === 'read' ? 'Leído' : 'Entregado'}>
                                {msg.status === 'read' ? (
                                  <CheckCheck size={13} className="text-blue-200" />
                                ) : (
                                  <Check size={13} />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Reactions Bar below bubble */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex items-center gap-1.5 mt-1 px-1">
                            {msg.reactions.map((rx, rIdx) => {
                              const hasReacted = rx.users.includes(currentUserName);
                              return (
                                <button
                                  key={rIdx}
                                  onClick={() => messagingStore.addReaction(activeConversation.id, msg.id, rx.emoji, currentUserName)}
                                  className={`px-2 py-0.5 rounded-full text-xs font-bold flex items-center gap-1 border transition-all ${
                                    hasReacted
                                      ? 'bg-fox-primary/15 border-fox-primary/40 text-fox-primary scale-105'
                                      : 'bg-fox-surface border-fox-border text-fox-text-muted hover:bg-fox-bg'
                                  }`}
                                  title={`Reacciones de: ${rx.users.join(', ')}`}
                                >
                                  <span>{rx.emoji}</span>
                                  <span>{rx.count}</span>
                                </button>
                              );
                            })}
                          </div>
                        )}

                        {/* Hover Quick Action Toolbar (Reply & Reaction) */}
                        {hoveredMessageId === msg.id && (
                          <div className={`absolute top-0 -translate-y-1/2 z-20 flex items-center gap-1 bg-fox-surface border border-fox-border rounded-full px-2 py-1 shadow-lg ${
                            isMe ? 'right-2' : 'left-2'
                          }`}>
                            {/* Emoji Reaction button */}
                            <div className="relative">
                              <button
                                onClick={() => setActiveReactionPickerId(activeReactionPickerId === msg.id ? null : msg.id)}
                                className="p-1 text-fox-text-muted hover:text-fox-text-main rounded-full hover:bg-fox-bg"
                                title="Reaccionar"
                              >
                                <Smile size={14} />
                              </button>

                              {/* Emoji Picker Popover */}
                              {activeReactionPickerId === msg.id && (
                                <div className="absolute top-full mt-1 left-0 bg-fox-surface border border-fox-border rounded-2xl p-1.5 shadow-xl flex items-center gap-1 z-30">
                                  {EMOJIS.map(em => (
                                    <button
                                      key={em}
                                      onClick={() => {
                                        messagingStore.addReaction(activeConversation.id, msg.id, em, currentUserName);
                                        setActiveReactionPickerId(null);
                                      }}
                                      className="w-7 h-7 flex items-center justify-center text-sm hover:scale-125 transition-transform"
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>

                            {/* Reply Button */}
                            <button
                              disabled={sendState.pending}
                              onClick={() => {
                                if (sendGate.current) return;
                                setReplyingTo(msg);
                                textareaRef.current?.focus();
                              }}
                              className="p-1 text-fox-text-muted hover:text-fox-primary rounded-full hover:bg-fox-bg"
                              title="Responder a este mensaje"
                            >
                              <CornerUpLeft size={14} />
                            </button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-fox-text-muted space-y-3 py-16">
                    <MessageSquare size={48} className="opacity-20" />
                    <p className="text-sm font-medium">No se encontraron mensajes en esta búsqueda.</p>
                  </div>
                )}
              </div>

              <MessageComposer
                activeConversationTitle={activeConversation.title}
                quickTemplates={quickTemplates}
                sampleAttachments={sampleAttachments}
                inputText={inputText}
                replyingTo={replyingTo}
                attachedFile={attachedFile}
                isRecordingAudio={isRecordingAudio}
                recordingSeconds={recordingSeconds}
                showAttachmentPicker={showAttachmentPicker}
                textareaRef={textareaRef}
                sendPending={sendState.pending}
                sendError={sendState.error}
                onTemplateClick={t => {
                  if (sendGate.current) return;
                  setInputText(t.text);
                  setSelectedTag(t.tag);
                  textareaRef.current?.focus();
                }}
                onClearReply={() => { if (!sendGate.current) setReplyingTo(null); }}
                onClearFile={() => { if (!sendGate.current) setAttachedFile(null); }}
                onRecordCancel={() => { if (!sendGate.current) setIsRecordingAudio(false); }}
                onVoiceSend={handleSendVoiceNote}
                onTogglePicker={() => { if (!sendGate.current) setShowAttachmentPicker(!showAttachmentPicker); }}
                onSelectAttachment={att => {
                  if (sendGate.current) return;
                  setAttachedFile(att);
                  setShowAttachmentPicker(false);
                  toast.show(`Adjuntado: ${att.name}`, 'info');
                }}
                onRecordStart={() => { if (!sendGate.current) setIsRecordingAudio(true); }}
                onTextChange={e => { if (!sendGate.current) setInputText(e.target.value); }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                onSend={handleSendMessage}
              />
            </>
          ) : (
            /* Empty State when no conversation selected */
            <div className="hidden md:flex flex-1 flex-col items-center justify-center p-8 text-center bg-fox-bg/10">
              <div className="w-20 h-20 bg-fox-surface rounded-3xl flex items-center justify-center mb-5 border border-fox-border shadow-sm">
                <MessageSquare size={36} className="text-fox-orange/60" />
              </div>
              <h3 className="text-xl font-heading font-bold text-fox-text-main mb-2">
                Bandeja de Mensajería Escolar
              </h3>
              <p className="text-xs sm:text-sm text-fox-text-muted max-w-md mb-6 leading-relaxed">
                Selecciona una conversación de la lista para leer el historial y comunicarte, o inicia un nuevo mensaje con cualquier miembro del colegio.
              </p>
              <button
                onClick={() => setShowNewModal(true)}
                className="px-5 py-2.5 rounded-2xl bg-fox-orange text-white font-bold text-xs sm:text-sm hover:bg-fox-orange/90 transition-all shadow-md flex items-center gap-2"
              >
                <Edit size={16} /> Redactar Mensaje
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Conversation / Announcement Modal */}
      <NewConversationModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        currentRole={currentRole}
        onConversationCreated={selectConversation}
      />

      {/* Foxy AI Copilot Assistant Modal */}
      {activeConversation && (
        <FoxyMessageCopilotModal
          isOpen={showFoxyModal}
          onClose={() => setShowFoxyModal(false)}
          conversation={activeConversation}
          currentRole={currentRole}
          onApplyDraft={(draftText) => {
            if (sendGate.current) return;
            setInputText(draftText);
            textareaRef.current?.focus();
          }}
        />
      )}
    </div>
  );


}
