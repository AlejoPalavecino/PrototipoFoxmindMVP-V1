import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  History, X, Filter, Sparkles, Award, CheckCircle2, 
  MessageSquare, Calendar, BookOpen, Clock, Zap 
} from 'lucide-react';
import { TeacherHistoryEntry } from './progresoDocenteTypes';

interface DocenteHistoryModalProps {
  isOpen: boolean;
  history: TeacherHistoryEntry[];
  onClose: () => void;
}

export function DocenteHistoryModal({
  isOpen,
  history,
  onClose
}: DocenteHistoryModalProps) {
  const [filterType, setFilterType] = useState<string>('all');

  if (!isOpen) return null;

  const filteredHistory = history.filter(item => {
    if (filterType === 'all') return true;
    return item.type === filterType;
  });

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-fox-border flex justify-between items-center bg-fox-bg/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-fox-primary/10 border border-fox-primary/20 text-fox-primary flex items-center justify-center shrink-0">
              <History size={24} />
            </div>
            <div>
              <h3 className="font-heading font-bold text-fox-text-main text-xl">
                Historial de Acciones Pedagógicas
              </h3>
              <p className="text-xs text-fox-text-muted mt-0.5">
                Registro de intervenciones, adaptaciones DUA y tutorías registradas
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 border border-fox-border transition-colors shadow-2xs cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-6 py-3 border-b border-fox-border/60 bg-fox-bg/30 flex items-center gap-2 overflow-x-auto shrink-0">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'intervencion', label: '🛡️ Intervenciones' },
            { id: 'dua', label: '✨ Adaptaciones DUA' },
            { id: 'tutoria', label: '🤝 Tutorías 1-a-1' },
            { id: 'reporte', label: '📊 Reportes' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterType(f.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterType === f.id
                  ? 'bg-fox-primary text-white shadow-xs'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Timeline List */}
        <div className="p-6 overflow-y-auto space-y-3.5 flex-1">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-fox-text-muted text-xs">
              No se encontraron registros para este filtro.
            </div>
          ) : (
            filteredHistory.map((item) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-fox-bg/40 border border-fox-border hover:border-fox-border/80 rounded-2xl p-4 transition-all flex flex-col sm:flex-row sm:items-start justify-between gap-3"
              >
                <div className="flex items-start gap-3.5">
                  <div className="p-2.5 rounded-xl bg-fox-surface border border-fox-border text-fox-primary shrink-0 mt-0.5 shadow-2xs">
                    {item.type === 'intervencion' && <MessageSquare size={18} />}
                    {item.type === 'dua' && <Sparkles size={18} className="text-fox-purple" />}
                    {item.type === 'tutoria' && <Calendar size={18} className="text-fox-green" />}
                    {item.type === 'reporte' && <BookOpen size={18} className="text-fox-orange" />}
                    {item.type === 'evaluacion' && <Award size={18} className="text-fox-gold" />}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h4 className="font-heading font-bold text-fox-text-main text-sm">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-fox-surface border border-fox-border text-fox-text-muted">
                        {item.subject} • {item.course}
                      </span>
                    </div>
                    <p className="text-xs text-fox-text-muted leading-relaxed">
                      {item.summary}
                    </p>
                    {item.impactScore && (
                      <div className="mt-2 text-[11px] font-bold text-fox-green flex items-center gap-1">
                        <CheckCircle2 size={12} /> Impacto: {item.impactScore}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-1 border-t sm:border-t-0 border-fox-border/40">
                  <span className="text-[11px] font-medium text-fox-text-muted flex items-center gap-1">
                    <Clock size={11} /> {item.date} {item.time}
                  </span>
                  <span className="text-xs font-bold text-fox-gold">
                    +{item.pointsEarned} Pts
                  </span>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-fox-border bg-fox-bg/50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold bg-fox-surface border border-fox-border hover:bg-fox-bg text-fox-text-main rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </motion.div>
    </div>
  );
}
