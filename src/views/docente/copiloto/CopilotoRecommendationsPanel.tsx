import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  AlertTriangle, 
  Users, 
  Lightbulb, 
  Calendar, 
  ArrowRight, 
  CheckCircle2, 
  Send,
  BookOpen,
  Filter
} from 'lucide-react';
import { CopilotoRecommendation } from './copilotoTypes';

interface CopilotoRecommendationsPanelProps {
  recommendations: CopilotoRecommendation[];
  onExecuteRecommendation: (rec: CopilotoRecommendation) => void;
  selectedAulaName?: string;
}

export const CopilotoRecommendationsPanel: React.FC<CopilotoRecommendationsPanelProps> = ({
  recommendations,
  onExecuteRecommendation,
  selectedAulaName,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'urgent' | 'dua' | 'didactic' | 'planning'>('all');

  const filtered = recommendations.filter(rec => {
    const matchesCategory = selectedCategory === 'all' || rec.category === selectedCategory;
    return matchesCategory;
  });

  return (
    <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary flex items-center justify-center font-bold">
            <Sparkles size={20} />
          </div>
          <div>
            <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg">
              Recomendaciones Inteligentes de Foxy IA
            </h3>
            <p className="text-xs text-fox-text-muted">
              Sugerencias proactivas basadas en el calendario escolar, entregas de alumnos y perfiles DUA.
            </p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto hide-scrollbar text-xs">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap ${
              selectedCategory === 'all'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Todas ({recommendations.length})
          </button>
          <button
            onClick={() => setSelectedCategory('urgent')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === 'urgent'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <AlertTriangle size={12} className="text-amber-500" />
            <span>Prioridad</span>
          </button>
          <button
            onClick={() => setSelectedCategory('dua')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === 'dua'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Users size={12} className="text-purple-500" />
            <span>DUA</span>
          </button>
          <button
            onClick={() => setSelectedCategory('didactic')}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors whitespace-nowrap flex items-center gap-1 ${
              selectedCategory === 'didactic'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Lightbulb size={12} className="text-amber-500" />
            <span>Innovación</span>
          </button>
        </div>
      </div>

      {/* Grid of Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {filtered.map((rec) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-fox-bg border border-fox-border rounded-2xl p-4 flex flex-col justify-between hover:border-fox-primary/50 transition-all group"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${
                  rec.category === 'urgent' ? 'bg-amber-100 border-amber-200 text-amber-800' :
                  rec.category === 'dua' ? 'bg-purple-100 border-purple-200 text-purple-800' :
                  rec.category === 'didactic' ? 'bg-blue-100 border-blue-200 text-blue-800' :
                  'bg-emerald-100 border-emerald-200 text-emerald-800'
                }`}>
                  {rec.badge}
                </span>

                <span className="text-[11px] font-bold text-fox-text-muted flex items-center gap-1">
                  <BookOpen size={12} className="text-fox-primary" />
                  {rec.aulaName}
                </span>
              </div>

              <h4 className="font-heading font-bold text-xs sm:text-sm text-fox-text-main group-hover:text-fox-primary transition-colors">
                {rec.title}
              </h4>

              <p className="text-xs text-fox-text-muted leading-relaxed">
                {rec.description}
              </p>
            </div>

            <div className="pt-3 mt-3 border-t border-fox-border/60 flex items-center justify-between">
              <span className="text-[10px] font-semibold text-fox-text-muted">
                Impacto: <strong className="text-fox-text-main">{rec.impactLevel}</strong>
              </span>

              <button
                onClick={() => onExecuteRecommendation(rec)}
                className="px-3.5 py-1.5 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 transition-all flex items-center gap-1.5 shadow-2xs group-hover:shadow-xs cursor-pointer"
              >
                <span>{rec.actionLabel}</span>
                <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
