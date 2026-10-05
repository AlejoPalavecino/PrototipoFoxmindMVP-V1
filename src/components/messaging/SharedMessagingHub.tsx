import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, Edit, Send, Paperclip, Mic, MicOff, Sparkles, Pin, PinOff, 
  MoreVertical, ChevronLeft, MessageSquare, BookOpen, User, Users, 
  Check, CheckCheck, Smile, CornerUpLeft, X, FileText, Download, 
  Volume2, ExternalLink, Filter, Star, Info, PhoneCall, Video, Bot,
  AlertCircle, RefreshCw, GraduationCap, Copy, ArrowRight, CheckCircle2,
  Clock, ShieldCheck
} from 'lucide-react';
import { Role, Conversation, DirectMessageItem, MessageAttachment } from '../../types';
import { messagingStore } from '../../features/messaging/messagingStore';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { NewConversationModal } from './NewConversationModal';
import { FoxyMessageCopilotModal } from './FoxyMessageCopilotModal';
import { useAppContext } from '../../context';
import { toast } from '../ui/Toaster';

interface SharedMessagingHubProps {
  currentRole: Role;
  initialConversationId?: string;
}

export function SharedMessagingHub({ currentRole, initialConversationId }: SharedMessagingHubProps) {
  const { setView } = useAppContext();

  // Store state
  const [conversations, setConversations] = useState<Conversation[]>(() => messagingStore.getConversations());
  const [activeConversationId, setActiveConversationId] = useState<string | null>(initialConversationId || 'dm-laura-valentina');
  
  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('todos');
  const [isMobileListVisible, setIsMobileListVisible] = useState(true);
  const [showNewModal, setShowNewModal] = useState(false);
  const [showFoxyModal, setShowFoxyModal] = useState(false);
  const [showInfoSidebar, setShowInfoSidebar] = useState(false);
  
  // In-chat search
  const [inChatSearchOpen, setInChatSearchOpen] = useState(false);
  const [inChatSearchQuery, setInChatSearchQuery] = useState('');

  // Composer states
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<DirectMessageItem | null>(null);
  const [attachedFile, setAttachedFile] = useState<MessageAttachment | null>(null);
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

  // Current user identity details based on active role
  const effectiveRole: 'docente' | 'alumno' = currentRole === 'alumno' ? 'alumno' : 'docente';
  const currentUserId = effectiveRole === 'docente' ? 'docente-laura' : 'alumno-valentina';
  const currentUserName = effectiveRole === 'docente' ? 'Prof. Laura Martínez' : 'Valentina Rodríguez';

  // Subscribe to store updates
  useEffect(() => {
    const unsubscribe = messagingStore.subscribe(() => {
      setConversations(messagingStore.getConversations());
    });
    return unsubscribe;
  }, []);

  // Handle initial ID change from props/navigation
  useEffect(() => {
    if (initialConversationId) {
      setActiveConversationId(initialConversationId);
      setIsMobileListVisible(false);
    }
  }, [initialConversationId]);

  // Mark active conversation as read
  useEffect(() => {
    if (activeConversationId) {
      messagingStore.markAsRead(activeConversationId, currentRole === 'docente' ? 'docente' : 'alumno');
    }
  }, [activeConversationId, currentRole, conversations]);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [activeConversationId, conversations]);

  // Audio recording timer
  useEffect(() => {
    let timer: any;
    if (isRecordingAudio) {
      timer = setInterval(() => {
        setRecordingSeconds(s => s + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecordingAudio]);

  const activeConversation = conversations.find(c => c.id === activeConversationId);

  // Filter conversations for the left panel
  const filteredConversations = conversations.filter(conv => {
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

  // Send message handler
  const handleSendMessage = () => {
    if (!activeConversationId) return;
    if (!inputText.trim() && !attachedFile) return;

    messagingStore.sendMessage({
      conversationId: activeConversationId,
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
    });

    setInputText('');
    setReplyingTo(null);
    setAttachedFile(null);
    setSelectedTag(null);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Send Voice Note Simulation
  const handleSendVoiceNote = () => {
    if (!activeConversationId) return;
    setIsRecordingAudio(false);

    const dur = recordingSeconds > 0 
      ? `0:${recordingSeconds < 10 ? '0' : ''}${recordingSeconds}` 
      : '0:15';

    messagingStore.sendMessage({
      conversationId: activeConversationId,
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
    });

    setSelectedTag(null);
    toast.show('Nota de voz enviada', 'success');
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
        <div className={`w-full md:w-80 lg:w-[360px] border-r border-fox-border flex flex-col shrink-0 bg-fox-surface ${isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {/* Search and Role Filter */}
          <div className="p-4 border-b border-fox-border space-y-3 bg-fox-bg/30">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted/60" size={17} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar conversación o contacto..."
                className="w-full bg-fox-bg border border-fox-border rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-fox-orange/40 transition-all font-medium text-fox-text-main placeholder:text-fox-text-muted/60"
              />
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-fox-text-muted hover:text-fox-text-main"
                >
                  <X size={15} />
                </button>
              )}
            </div>

            {/* Role-Specific Filter Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 hide-scrollbar">
              {(currentRole === 'docente' ? [
                { id: 'todos', label: 'Todos' },
                { id: 'unread', label: 'No leídos' },
                { id: 'alumnos', label: 'Alumnos' },
                { id: 'canales', label: 'Canales 3°' },
                { id: 'docentes', label: 'Colegas' },
                { id: 'foxy', label: 'Foxy IA' }
              ] : [
                { id: 'todos', label: 'Todos' },
                { id: 'unread', label: 'No leídos' },
                { id: 'docentes', label: 'Mis Profes' },
                { id: 'canales', label: 'Canales de Aula' },
                { id: 'foxy', label: 'Foxy Tutor' }
              ]).map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterType(f.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                    filterType === f.id
                      ? 'bg-fox-orange text-white shadow-sm'
                      : 'bg-fox-bg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-border/60 border border-fox-border'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto divide-y divide-fox-border/40">
            {filteredConversations.length > 0 ? (
              <>
                {/* Pinned Section */}
                {pinnedConversations.length > 0 && filterType === 'todos' && !searchQuery && (
                  <div className="bg-fox-bg/20 py-2">
                    <div className="px-4 py-1 text-[10px] font-bold uppercase tracking-wider text-fox-text-muted flex items-center gap-1.5">
                      <Star size={11} className="text-fox-gold fill-fox-gold" /> Fijados
                    </div>
                    {pinnedConversations.map(conv => renderConversationItem(conv))}
                  </div>
                )}

                {/* Regular Conversations */}
                {regularConversations.length > 0 && (
                  <div>
                    {pinnedConversations.length > 0 && filterType === 'todos' && !searchQuery && (
                      <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">
                        Todas las conversaciones
                      </div>
                    )}
                    {regularConversations.map(conv => renderConversationItem(conv))}
                  </div>
                )}
              </>
            ) : (
              <div className="p-8 text-center text-fox-text-muted space-y-2">
                <MessageSquare size={32} className="mx-auto opacity-30" />
                <p className="text-sm font-medium">No se encontraron conversaciones.</p>
                <button
                  onClick={() => setShowNewModal(true)}
                  className="text-xs font-bold text-fox-primary hover:underline block mx-auto"
                >
                  Iniciar nuevo mensaje
                </button>
              </div>
            )}
          </div>
        </div>

        {/* ===================== CHAT VIEWPORT ===================== */}
        <div className={`flex-1 flex flex-col bg-fox-bg/20 min-w-0 ${!isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
          {activeConversation ? (
            <>
              {/* Conversation Top Header */}
              <div className="px-4 sm:px-6 py-3.5 border-b border-fox-border bg-fox-surface flex justify-between items-center shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    onClick={() => setIsMobileListVisible(true)}
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
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
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
                            <div className={`mt-3.5 rounded-2xl overflow-hidden border shadow-sm ${
                              isMe
                                ? 'bg-black/20 border-white/25 text-white'
                                : 'bg-fox-surface border-fox-border text-fox-text-main'
                            }`}>
                              {/* Card Header with gradient / classroom color */}
                              <div className={`px-4 py-3 flex items-center justify-between border-b ${
                                isMe 
                                  ? 'bg-white/10 border-white/15' 
                                  : 'bg-gradient-to-r from-fox-primary/10 via-fox-purple/10 to-transparent border-fox-border'
                              }`}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-white shrink-0 shadow-xs ${
                                    msg.invitation.color || 'bg-fox-purple'
                                  }`}>
                                    <GraduationCap size={18} />
                                  </div>
                                  <div className="min-w-0">
                                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-75 block truncate">
                                      Invitación a Aula Virtual
                                    </span>
                                    <h4 className="text-sm font-bold truncate">
                                      {msg.invitation.subject}
                                    </h4>
                                  </div>
                                </div>
                                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-xl shrink-0 ${
                                  isMe ? 'bg-white/20 text-white' : 'bg-fox-primary/15 text-fox-primary border border-fox-primary/20'
                                }`}>
                                  {msg.invitation.course}
                                </span>
                              </div>

                              {/* Card Body */}
                              <div className="p-3.5 space-y-2.5">
                                {msg.invitation.description && (
                                  <p className={`text-xs leading-relaxed ${
                                    isMe ? 'text-white/90' : 'text-fox-text-muted'
                                  }`}>
                                    {msg.invitation.description}
                                  </p>
                                )}

                                {/* Metadata chips: Teacher & Code */}
                                <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 p-2.5 rounded-xl text-xs ${
                                  isMe ? 'bg-black/20' : 'bg-fox-bg/80 border border-fox-border/60'
                                }`}>
                                  <div className="flex items-center gap-1.5 min-w-0">
                                    <User size={13} className="shrink-0 opacity-70" />
                                    <span className="truncate"><strong>Docente:</strong> {msg.invitation.teacherName}</span>
                                  </div>
                                  <div className="flex items-center justify-between gap-1.5">
                                    <div className="flex items-center gap-1.5 font-mono text-[11px] font-bold">
                                      <span className="opacity-70">Código:</span>
                                      <span className={`px-1.5 py-0.5 rounded ${
                                        isMe ? 'bg-white/20' : 'bg-fox-primary/10 text-fox-primary'
                                      }`}>
                                        {msg.invitation.code}
                                      </span>
                                    </div>
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(msg.invitation!.code);
                                        toast.show('Código copiado al portapapeles', 'info');
                                      }}
                                      className={`p-1 rounded-lg transition-colors ${
                                        isMe ? 'hover:bg-white/20' : 'hover:bg-fox-border text-fox-text-muted hover:text-fox-text-main'
                                      }`}
                                      title="Copiar código de aula"
                                    >
                                      <Copy size={12} />
                                    </button>
                                  </div>
                                </div>

                                {/* Schedule info if available */}
                                {msg.invitation.schedule && msg.invitation.schedule.length > 0 && (
                                  <div className="flex items-center gap-1.5 text-[11px] opacity-80">
                                    <Clock size={12} className="shrink-0 text-fox-orange" />
                                    <span className="truncate">Horario: {msg.invitation.schedule.join(' • ')}</span>
                                  </div>
                                )}

                                {/* Action Buttons according to status and role */}
                                <div className="pt-2 flex items-center justify-between gap-2 border-t border-fox-border/40">
                                  {msg.invitation.status === 'pending' ? (
                                    effectiveRole === 'alumno' ? (
                                      <div className="flex items-center gap-2 w-full">
                                        <button
                                          onClick={() => {
                                            messagingStore.respondToClassroomInvitation({
                                              conversationId: activeConversation.id,
                                              messageId: msg.id,
                                              response: 'accepted',
                                              responderId: currentUserId,
                                              responderName: currentUserName
                                            });
                                            toast.show(`🎉 ¡Te uniste al aula ${msg.invitation?.subject}! Ya está en tus Aulas.`, 'success');
                                          }}
                                          className="flex-1 py-2 px-3 rounded-xl bg-fox-primary hover:bg-fox-primary/90 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md active:scale-98 transition-all"
                                        >
                                          <Check size={14} /> Aceptar e Ingresar
                                        </button>
                                        <button
                                          onClick={() => {
                                            messagingStore.respondToClassroomInvitation({
                                              conversationId: activeConversation.id,
                                              messageId: msg.id,
                                              response: 'declined',
                                              responderId: currentUserId,
                                              responderName: currentUserName
                                            });
                                            toast.show('Invitación declinada', 'info');
                                          }}
                                          className={`py-2 px-3 rounded-xl text-xs font-bold transition-colors ${
                                            isMe 
                                              ? 'hover:bg-white/20 text-white/80' 
                                              : 'hover:bg-fox-bg text-fox-text-muted hover:text-fox-text-main border border-fox-border'
                                          }`}
                                        >
                                          Declinar
                                        </button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between w-full text-xs">
                                        <span className="flex items-center gap-1.5 text-fox-orange font-semibold text-[11px]">
                                          <Clock size={13} /> Invitación enviada • Esperando aceptación
                                        </span>
                                        <span className="text-[10px] text-fox-text-muted font-mono">
                                          {msg.invitation.code}
                                        </span>
                                      </div>
                                    )
                                  ) : msg.invitation.status === 'accepted' ? (
                                    <div className="flex items-center justify-between w-full gap-2">
                                      <span className="flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
                                        <CheckCircle2 size={15} /> Invitación Aceptada
                                      </span>
                                      <button
                                        onClick={() => setView('aulas')}
                                        className="py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
                                      >
                                        Ir al Aula <ArrowRight size={13} />
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="w-full text-xs text-fox-text-muted flex items-center gap-1.5">
                                      <X size={14} className="text-red-500" /> Invitación declinada por el estudiante
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
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
                              onClick={() => {
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
                <div ref={messagesEndRef} />
              </div>

              {/* Quick Prompt Chips Bar */}
              <div className="px-4 py-2 border-t border-fox-border bg-fox-surface/80 flex items-center gap-2 overflow-x-auto hide-scrollbar">
                <span className="text-[11px] font-bold text-fox-text-muted whitespace-nowrap flex items-center gap-1">
                  <Sparkles size={12} className="text-fox-primary" /> Respuestas rápidas:
                </span>
                {quickTemplates.map((t, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputText(t.text);
                      setSelectedTag(t.tag);
                      textareaRef.current?.focus();
                    }}
                    className="px-3 py-1 rounded-xl text-xs font-bold bg-fox-bg border border-fox-border text-fox-text-main hover:bg-fox-primary/10 hover:border-fox-primary/30 transition-colors whitespace-nowrap"
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Composer Input Area */}
              <div className="p-4 bg-fox-surface border-t border-fox-border shrink-0 space-y-2">
                {/* Active Reply Banner */}
                {replyingTo && (
                  <div className="bg-fox-bg border border-fox-border rounded-2xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <CornerUpLeft size={14} className="text-fox-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-fox-text-main">Respondiendo a {replyingTo.senderName}:</span>
                        <p className="text-fox-text-muted truncate">{replyingTo.text}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 rounded-lg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Active Attached File Banner */}
                {attachedFile && (
                  <div className="bg-fox-primary/10 border border-fox-primary/30 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <FileText size={16} className="text-fox-primary shrink-0" />
                      <div className="min-w-0">
                        <span className="font-bold text-fox-text-main">{attachedFile.name}</span>
                        <span className="text-fox-text-muted text-[10px] ml-2">{attachedFile.size}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => setAttachedFile(null)}
                      className="p-1 rounded-lg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}

                {/* Voice Recorder Active Bar */}
                {isRecordingAudio ? (
                  <div className="flex items-center justify-between bg-red-500/10 border border-red-500/30 rounded-2xl p-3 animate-pulse">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                      <span className="text-sm font-bold text-red-600">
                        Grabando nota de voz... 0:{recordingSeconds < 10 ? '0' : ''}{recordingSeconds}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsRecordingAudio(false)}
                        className="px-3 py-1.5 rounded-xl text-xs font-bold text-fox-text-muted hover:bg-fox-bg"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={handleSendVoiceNote}
                        className="px-4 py-1.5 rounded-xl text-xs font-bold bg-fox-primary text-white hover:bg-fox-primary/90 flex items-center gap-1.5 shadow-sm"
                      >
                        <Send size={13} /> Enviar Audio
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-end gap-2 bg-fox-bg border border-fox-border rounded-2xl p-2 focus-within:ring-2 focus-within:ring-fox-primary/30 transition-all shadow-inner">
                    {/* Attachment trigger */}
                    <div className="relative">
                      <button
                        onClick={() => setShowAttachmentPicker(!showAttachmentPicker)}
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-fox-text-muted hover:text-fox-primary hover:bg-fox-surface transition-colors"
                        title="Adjuntar archivo (PDF, Imagen, TP)"
                      >
                        <Paperclip size={18} />
                      </button>

                      {/* Attachment Selector Dropdown */}
                      {showAttachmentPicker && (
                        <div className="absolute bottom-full mb-2 left-0 w-64 bg-fox-surface border border-fox-border rounded-2xl shadow-xl p-2 z-30 space-y-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted px-2 py-1">
                            Seleccionar Archivo
                          </p>
                          {sampleAttachments.map(att => (
                            <button
                              key={att.id}
                              onClick={() => {
                                setAttachedFile(att);
                                setShowAttachmentPicker(false);
                                toast.show(`Adjuntado: ${att.name}`, 'info');
                              }}
                              className="w-full text-left p-2 rounded-xl text-xs hover:bg-fox-bg flex items-center gap-2 text-fox-text-main"
                            >
                              <FileText size={14} className="text-fox-primary shrink-0" />
                              <div className="truncate min-w-0">
                                <p className="truncate font-bold">{att.name}</p>
                                <p className="text-[10px] text-fox-text-muted">{att.size}</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Voice note trigger */}
                    <button
                      onClick={() => setIsRecordingAudio(true)}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-fox-text-muted hover:text-fox-primary hover:bg-fox-surface transition-colors"
                      title="Grabar nota de voz"
                    >
                      <Mic size={18} />
                    </button>

                    {/* Text Input */}
                    <textarea
                      ref={textareaRef}
                      value={inputText}
                      onChange={e => setInputText(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      placeholder={`Escribe a ${activeConversation.title}... (Enter para enviar)`}
                      className="flex-1 bg-transparent border-none focus:ring-0 resize-none max-h-32 min-h-[44px] py-3 text-xs sm:text-sm text-fox-text-main outline-none px-2 font-medium placeholder:text-fox-text-muted/60"
                      rows={1}
                    />

                    {/* Send Button */}
                    <button
                      onClick={handleSendMessage}
                      disabled={!inputText.trim() && !attachedFile}
                      className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center transition-all ${
                        inputText.trim() || attachedFile
                          ? 'bg-fox-orange hover:bg-fox-orange/90 text-white shadow-md active:scale-95'
                          : 'bg-fox-border text-fox-text-muted/40 cursor-not-allowed'
                      }`}
                      title="Enviar mensaje"
                    >
                      <Send size={16} className="ml-0.5" />
                    </button>
                  </div>
                )}
              </div>
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
        onConversationCreated={(newId) => {
          setActiveConversationId(newId);
          setIsMobileListVisible(false);
        }}
      />

      {/* Foxy AI Copilot Assistant Modal */}
      {activeConversation && (
        <FoxyMessageCopilotModal
          isOpen={showFoxyModal}
          onClose={() => setShowFoxyModal(false)}
          conversation={activeConversation}
          currentRole={currentRole}
          onApplyDraft={(draftText) => {
            setInputText(draftText);
            textareaRef.current?.focus();
          }}
        />
      )}
    </div>
  );

  // Helper renderer for contact item in sidebar
  function renderConversationItem(conv: Conversation) {
    const isSelected = activeConversationId === conv.id;
    const unread = currentRole === 'docente' ? conv.unreadCountDocente : conv.unreadCountAlumno;

    return (
      <button
        key={conv.id}
        onClick={() => {
          setActiveConversationId(conv.id);
          setIsMobileListVisible(false);
        }}
        className={`w-full flex items-start gap-3 p-3.5 sm:p-4 text-left transition-all border-b border-fox-border/40 relative group ${
          isSelected 
            ? 'bg-fox-orange/10 border-l-4 border-l-fox-orange' 
            : 'hover:bg-fox-bg/60'
        }`}
      >
        {/* Avatar */}
        <div className="relative shrink-0 mt-0.5">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-xs shadow-sm ${
            conv.type === 'channel'
              ? 'bg-fox-primary/15 text-fox-primary border border-fox-primary/20'
              : conv.type === 'bot'
              ? 'bg-fox-gold/15 text-fox-gold border border-fox-gold/20'
              : 'bg-fox-purple/15 text-fox-purple border border-fox-purple/20'
          }`}>
            {conv.type === 'channel' ? (
              <Users size={18} />
            ) : conv.type === 'bot' ? (
              '🦊'
            ) : (
              conv.avatarInitial || conv.title.substring(0, 2).toUpperCase()
            )}
          </div>
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1 bg-fox-orange text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-fox-surface shadow-sm animate-bounce">
              {unread}
            </span>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-baseline mb-1">
            <h4 className={`text-xs sm:text-sm truncate pr-2 ${
              unread > 0 ? 'font-bold text-fox-text-main' : 'font-semibold text-fox-text-main/90'
            }`}>
              {conv.title}
            </h4>
            <span className={`text-[10px] shrink-0 ${
              unread > 0 ? 'text-fox-orange font-bold' : 'text-fox-text-muted'
            }`}>
              {conv.lastMessageTime}
            </span>
          </div>

          {/* Subtitle / Role Tag */}
          <div className="flex items-center gap-1.5 mb-1">
            {conv.type === 'channel' ? (
              <span className="text-[9px] font-bold uppercase tracking-wider text-fox-primary bg-fox-primary/10 px-1.5 py-0.2 rounded">
                Canal Aula
              </span>
            ) : (
              <span className="text-[10px] text-fox-text-muted truncate font-medium">
                {conv.subtitle || 'Directo'}
              </span>
            )}
          </div>

          {/* Last message snippet */}
          <p className={`text-xs truncate ${
            unread > 0 ? 'font-bold text-fox-text-main' : 'text-fox-text-muted'
          }`}>
            {conv.lastMessage}
          </p>
        </div>
      </button>
    );
  }
}
