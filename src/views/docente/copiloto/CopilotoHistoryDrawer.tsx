import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Search, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Pin, 
  Download, 
  MessageSquare, 
  Calendar,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { CopilotoSession } from './copilotoTypes';

interface CopilotoHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: CopilotoSession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession: (sessionId: string) => void;
  onRenameSession: (sessionId: string, newTitle: string) => void;
  onTogglePinSession: (sessionId: string) => void;
}

export const CopilotoHistoryDrawer: React.FC<CopilotoHistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession,
  onRenameSession,
  onTogglePinSession,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAulaFilter, setSelectedAulaFilter] = useState('all');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitleText, setEditTitleText] = useState('');

  if (!isOpen) return null;

  const aulasList = Array.from(new Set(sessions.map(s => s.aulaName))).filter(Boolean);

  const filteredSessions = sessions.filter(s => {
    const matchesSearch = s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          s.aulaName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAula = selectedAulaFilter === 'all' || s.aulaName === selectedAulaFilter;
    return matchesSearch && matchesAula;
  });

  const handleStartRename = (session: CopilotoSession, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitleText(session.title);
  };

  const handleSaveRename = (sessionId: string, e: React.FormEvent) => {
    e.preventDefault();
    if (editTitleText.trim()) {
      onRenameSession(sessionId, editTitleText.trim());
      setEditingId(null);
      toast.show('Sesión renombrada exitosamente', 'success');
    }
  };

  const handleExportSession = (session: CopilotoSession, e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `# Transcripción de Consulta: ${session.title}\nAula: ${session.aulaName}\nFecha: ${session.createdAt}\n\n` +
      session.messages.map(m => `**[${m.sender === 'user' ? 'Docente' : 'Foxy IA'}]** (${m.timestamp}):\n${m.text}\n`).join('\n---\n\n');
    
    const blob = new Blob([text], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Foxy_IA_${session.title.replace(/\s+/g, '_')}.md`;
    a.click();
    toast.show('Transcripción exportada en formato Markdown', 'info');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex justify-start">
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: 0 }}
        exit={{ x: '-100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-fox-surface border-r border-fox-border w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-fox-border bg-fox-bg/70 shrink-0 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-fox-orange/10 text-fox-orange flex items-center justify-center font-bold">
                <History size={20} />
              </div>
              <div>
                <h3 className="font-heading font-extrabold text-fox-text-main text-lg">
                  Historial de Consultas
                </h3>
                <p className="text-xs text-fox-text-muted">
                  {sessions.length} conversaciones registradas
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* New Chat Button */}
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full py-2.5 px-4 bg-fox-primary hover:bg-fox-primary/90 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            <span>Iniciar Nueva Consulta</span>
          </button>

          {/* Search and Filters */}
          <div className="space-y-2 pt-1">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted" />
              <input
                type="text"
                placeholder="Buscar por tema o aula..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-fox-surface border border-fox-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-fox-text-main outline-none focus:border-fox-primary"
              />
            </div>

            {/* Aula Filter Chips */}
            <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar pb-1 text-[11px]">
              <button
                onClick={() => setSelectedAulaFilter('all')}
                className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                  selectedAulaFilter === 'all'
                    ? 'bg-fox-primary text-white'
                    : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                Todas las Aulas
              </button>
              {aulasList.map(a => (
                <button
                  key={a}
                  onClick={() => setSelectedAulaFilter(a)}
                  className={`px-2.5 py-1 rounded-lg font-bold whitespace-nowrap transition-colors ${
                    selectedAulaFilter === a
                      ? 'bg-fox-primary text-white'
                      : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-2">
          {filteredSessions.length > 0 ? (
            filteredSessions.map((session) => {
              const isActive = session.id === activeSessionId;
              const isEditing = editingId === session.id;

              return (
                <div
                  key={session.id}
                  onClick={() => {
                    if (!isEditing) {
                      onSelectSession(session.id);
                      onClose();
                    }
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer group relative ${
                    isActive
                      ? 'bg-fox-primary/10 border-fox-primary/40 shadow-xs'
                      : 'bg-fox-surface border-fox-border hover:border-fox-primary/30 hover:bg-fox-bg/50'
                  }`}
                >
                  {isEditing ? (
                    <form onSubmit={(e) => handleSaveRename(session.id, e)} className="flex items-center gap-2">
                      <input
                        type="text"
                        autoFocus
                        value={editTitleText}
                        onChange={(e) => setEditTitleText(e.target.value)}
                        className="flex-1 bg-fox-bg border border-fox-primary rounded-lg px-2 py-1 text-xs text-fox-text-main outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1.5 bg-emerald-600 text-white rounded-lg text-xs"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="p-1.5 bg-fox-border text-fox-text-main rounded-lg text-xs"
                      >
                        <X size={14} />
                      </button>
                    </form>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {session.isPinned && (
                            <Pin size={12} className="text-fox-orange fill-fox-orange shrink-0" />
                          )}
                          <h4 className={`text-xs sm:text-sm font-bold truncate ${
                            isActive ? 'text-fox-primary' : 'text-fox-text-main'
                          }`}>
                            {session.title}
                          </h4>
                        </div>

                        <span className="text-[10px] text-fox-text-muted shrink-0">
                          {session.createdAt}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-fox-text-muted">
                        <span className="flex items-center gap-1 font-medium truncate max-w-[180px]">
                          <BookOpen size={12} className="text-fox-primary" />
                          {session.aulaName}
                        </span>

                        <span>{session.messagesCount} mensajes</span>
                      </div>

                      {/* Quick Action Icons on hover */}
                      <div className="absolute right-2 top-2 hidden group-hover:flex items-center gap-1 bg-fox-surface/90 backdrop-blur-xs p-1 rounded-xl border border-fox-border shadow-xs">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onTogglePinSession(session.id);
                          }}
                          className="p-1 text-fox-text-muted hover:text-fox-orange"
                          title={session.isPinned ? 'Desanclar' : 'Anclar'}
                        >
                          <Pin size={12} className={session.isPinned ? 'fill-fox-orange text-fox-orange' : ''} />
                        </button>
                        <button
                          onClick={(e) => handleStartRename(session, e)}
                          className="p-1 text-fox-text-muted hover:text-fox-primary"
                          title="Renombrar sesión"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={(e) => handleExportSession(session, e)}
                          className="p-1 text-fox-text-muted hover:text-fox-primary"
                          title="Exportar transcripción"
                        >
                          <Download size={12} />
                        </button>
                        {sessions.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id);
                              toast.show('Sesión eliminada', 'info');
                            }}
                            className="p-1 text-fox-text-muted hover:text-rose-600"
                            title="Eliminar sesión"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })
          ) : (
            <div className="text-center py-12 text-fox-text-muted text-xs">
              No se encontraron consultas con ese criterio.
            </div>
          )}
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-fox-border bg-fox-bg/70 shrink-0 text-center">
          <p className="text-[11px] text-fox-text-muted">
            Todas tus consultas se guardan de forma segura para dar continuidad a tus clases.
          </p>
        </div>
      </motion.div>
    </div>
  );
};
