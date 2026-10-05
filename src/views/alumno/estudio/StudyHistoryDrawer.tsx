import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, 
  Plus, 
  MessageSquare, 
  Pin, 
  Trash2, 
  X, 
  Check, 
  Search, 
  Edit2, 
  Folder 
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudentStudySession } from './estudioTypes';

interface StudyHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: StudentStudySession[];
  activeSessionId: string;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onDeleteSession?: (sessionId: string) => void;
  onTogglePinSession?: (sessionId: string) => void;
}

export const StudyHistoryDrawer: React.FC<StudyHistoryDrawerProps> = ({
  isOpen,
  onClose,
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onDeleteSession = () => {},
  onTogglePinSession = () => {}
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const filtered = sessions.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.folderName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end">
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="w-full max-w-md bg-fox-surface border-l border-fox-border h-full flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-fox-purple/10 text-fox-purple flex items-center justify-center font-bold">
              <History size={20} />
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-fox-text-main text-base">
                Historial de Sesiones de Estudio
              </h3>
              <p className="text-xs text-fox-text-muted">
                Tus conversaciones y consultas previas con Foxy
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

        {/* Action Button & Search */}
        <div className="p-4 border-b border-fox-border bg-fox-bg/40 space-y-3">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="w-full py-2.5 px-4 rounded-2xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold text-xs shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Nueva Sesión de Estudio</span>
          </button>

          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar en el historial..."
              className="w-full bg-fox-surface border border-fox-border rounded-xl pl-9 pr-3 py-2 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none"
            />
          </div>
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filtered.length === 0 ? (
            <div className="text-center py-12 text-xs text-fox-text-muted">
              No se encontraron sesiones de estudio.
            </div>
          ) : (
            filtered.map((sess) => {
              const isActive = sess.id === activeSessionId;
              return (
                <div
                  key={sess.id}
                  onClick={() => {
                    onSelectSession(sess.id);
                    onClose();
                  }}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                    isActive
                      ? 'bg-fox-purple/10 border-fox-purple text-fox-text-main ring-1 ring-fox-purple/30'
                      : 'bg-fox-bg/50 border-fox-border hover:border-fox-purple/40 text-fox-text-main'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isActive ? 'bg-fox-purple text-white' : 'bg-fox-surface border border-fox-border text-fox-text-muted'
                    }`}>
                      <MessageSquare size={15} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        {sess.isPinned && <Pin size={12} className="text-fox-orange fill-fox-orange shrink-0" />}
                        <h4 className="font-heading font-bold text-xs text-fox-text-main truncate">
                          {sess.title}
                        </h4>
                      </div>
                      <p className="text-[10px] text-fox-text-muted truncate mt-0.5">
                        {sess.folderName} • {sess.updatedAt}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTogglePinSession(sess.id);
                      }}
                      className="p-1.5 text-fox-text-muted hover:text-fox-orange rounded-lg hover:bg-fox-bg"
                      title={sess.isPinned ? 'Desfijar' : 'Fijar arriba'}
                    >
                      <Pin size={13} className={sess.isPinned ? 'fill-fox-orange' : ''} />
                    </button>
                    {sessions.length > 1 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(sess.id);
                        }}
                        className="p-1.5 text-fox-text-muted hover:text-red-500 rounded-lg hover:bg-fox-bg"
                        title="Eliminar sesión"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.div>
    </div>
  );
};
