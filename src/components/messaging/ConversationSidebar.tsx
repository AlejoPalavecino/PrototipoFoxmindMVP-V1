import { Search, X, Star, MessageSquare, Users } from 'lucide-react';
import type { Conversation, Role } from '../../types';

interface ConversationSidebarProps {
  currentRole: Role;
  searchQuery: string;
  filterType: string;
  activeConversationId: string | null;
  isMobileListVisible: boolean;
  filteredConversations: Conversation[];
  pinnedConversations: Conversation[];
  regularConversations: Conversation[];
  onSearchChange: (query: string) => void;
  onClearSearch: () => void;
  onFilterChange: (filter: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function ConversationSidebar({
  currentRole, searchQuery, filterType, activeConversationId, isMobileListVisible,
  filteredConversations, pinnedConversations, regularConversations,
  onSearchChange, onClearSearch, onFilterChange, onSelectConversation, onNewConversation,
}: ConversationSidebarProps) {
  return (
    <div className={`w-full md:w-80 lg:w-[360px] border-r border-fox-border flex flex-col shrink-0 bg-fox-surface ${isMobileListVisible ? 'flex' : 'hidden md:flex'}`}>
      {/* Search and Role Filter */}
      <div className="p-4 border-b border-fox-border space-y-3 bg-fox-bg/30">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted/60" size={17} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => onSearchChange(e.target.value)}
            placeholder="Buscar conversación o contacto..."
            className="w-full bg-fox-bg border border-fox-border rounded-xl py-2.5 pl-10 pr-4 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-fox-orange/40 transition-all font-medium text-fox-text-main placeholder:text-fox-text-muted/60"
          />
          {searchQuery && (
            <button 
              onClick={onClearSearch}
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
              onClick={() => onFilterChange(f.id)}
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
              onClick={onNewConversation}
              className="text-xs font-bold text-fox-primary hover:underline block mx-auto"
            >
              Iniciar nuevo mensaje
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // Helper renderer for contact item in sidebar
  function renderConversationItem(conv: Conversation) {
    const isSelected = activeConversationId === conv.id;
    const unread = currentRole === 'docente' ? conv.unreadCountDocente : conv.unreadCountAlumno;

    return (
      <button
        key={conv.id}
        onClick={() => onSelectConversation(conv.id)}
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
