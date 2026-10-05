import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Clock, 
  Brain, 
  Target, 
  AlertTriangle, 
  ArrowRight, 
  Layers, 
  CheckCircle2, 
  Flame, 
  Calendar,
  Send,
  Zap
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudentFoxyReminder } from './estudioTypes';

interface StudyRemindersPanelProps {
  reminders: StudentFoxyReminder[];
  folderId?: string;
  folderName?: string;
  onExecuteReminderAction: (reminder: StudentFoxyReminder) => void;
}

export const StudyRemindersPanel: React.FC<StudyRemindersPanelProps> = ({
  reminders,
  folderId,
  folderName,
  onExecuteReminderAction
}) => {
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'urgent' | 'spaced_review' | 'exam_target' | 'tip'>('all');

  const filtered = reminders.filter(rem => {
    const matchesFolder = !folderId || rem.folderId === folderId;
    const matchesFilter = selectedFilter === 'all' || rem.priority === selectedFilter;
    return matchesFolder && matchesFilter;
  });

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 border border-rose-500/20">
            <Flame size={11} /> Repaso Hoy
          </span>
        );
      case 'exam_target':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-orange/10 text-fox-orange border border-fox-orange/20">
            <Target size={11} /> Meta de Parcial
          </span>
        );
      case 'spaced_review':
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-purple/10 text-fox-purple border border-fox-purple/20">
            <Clock size={11} /> Repetición Espaciada
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20">
            <Sparkles size={11} /> Consejo Didáctico
          </span>
        );
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'clock': return <Clock size={20} className="text-rose-500" />;
      case 'target': return <Target size={20} className="text-fox-orange" />;
      case 'brain': return <Brain size={20} className="text-blue-500" />;
      case 'sparkles': return <Sparkles size={20} className="text-fox-purple" />;
      default: return <Zap size={20} className="text-amber-500" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Banner */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center font-bold">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
              Recordatorios y Sugerencias de Foxy
            </h2>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Recomendaciones inteligentes de Active Recall, curvas de olvido y metas personalizadas
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-xs">
          <button
            onClick={() => setSelectedFilter('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedFilter === 'all'
                ? 'bg-fox-purple text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Todas ({reminders.length})
          </button>
          <button
            onClick={() => setSelectedFilter('urgent')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              selectedFilter === 'urgent'
                ? 'bg-fox-purple text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Flame size={12} className="text-rose-500" />
            <span>Repaso Urgente</span>
          </button>
          <button
            onClick={() => setSelectedFilter('spaced_review')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              selectedFilter === 'spaced_review'
                ? 'bg-fox-purple text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Clock size={12} className="text-purple-500" />
            <span>Espaciado</span>
          </button>
          <button
            onClick={() => setSelectedFilter('exam_target')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all whitespace-nowrap flex items-center gap-1 cursor-pointer ${
              selectedFilter === 'exam_target'
                ? 'bg-fox-purple text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Target size={12} className="text-fox-orange" />
            <span>Parciales</span>
          </button>
        </div>
      </div>

      {/* Cards List */}
      {filtered.length === 0 ? (
        <div className="bg-fox-surface border border-dashed border-fox-border rounded-3xl p-12 text-center space-y-3">
          <CheckCircle2 size={32} className="text-emerald-500 mx-auto" />
          <h4 className="font-heading font-bold text-fox-text-main text-base">
            ¡Estás al día con tus repasos!
          </h4>
          <p className="text-xs text-fox-text-muted max-w-sm mx-auto">
            Foxy te notificará cuando sea el momento óptimo según el cronograma de memoria a largo plazo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((rem) => (
            <motion.div
              key={rem.id}
              whileHover={{ y: -2 }}
              className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs hover:shadow-md transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-5 group"
            >
              <div className="flex items-start gap-4 flex-1">
                <div className="w-12 h-12 rounded-2xl bg-fox-bg border border-fox-border flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                  {getIcon(rem.iconType)}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    {getPriorityBadge(rem.priority)}
                    <span className="text-xs font-bold text-fox-text-muted">
                      {rem.folderName}
                    </span>
                  </div>

                  <h4 className="font-heading font-extrabold text-base text-fox-text-main">
                    {rem.title}
                  </h4>

                  <p className="text-xs text-fox-text-muted leading-relaxed max-w-2xl">
                    {rem.description}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onExecuteReminderAction(rem)}
                className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-fox-purple text-white hover:bg-fox-purple/90 font-bold text-xs shadow-sm hover:shadow-md transition-all shrink-0 cursor-pointer"
              >
                <span>Comenzar con Foxy</span>
                <ArrowRight size={14} />
              </button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};
