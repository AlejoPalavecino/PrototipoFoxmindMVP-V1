import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Brain, Target, Sparkles, TrendingUp, TrendingDown, Minus, 
  CheckCircle2, AlertTriangle, ArrowRight, Zap, Award, Clock 
} from 'lucide-react';
import { SubjectMastery } from './progresoTypes';

interface ProgresoMateriasTabProps {
  subjects: SubjectMastery[];
  onSelectSubject: (subject: SubjectMastery) => void;
  onOpenQuiz: (topic?: string) => void;
}

export function ProgresoMateriasTab({
  subjects,
  onSelectSubject,
  onOpenQuiz,
}: ProgresoMateriasTabProps) {
  const [filter, setFilter] = useState<'all' | 'optimal' | 'needs_review' | 'critical'>('all');

  const filteredSubjects = subjects.filter(s => {
    if (filter === 'all') return true;
    return s.status === filter;
  });

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
            <BookOpen size={22} className="text-fox-primary" /> Diagnóstico Granular por Materia
          </h3>
          <p className="text-xs text-fox-text-muted mt-0.5">
            Competencias evaluadas según el Diseño Universal para el Aprendizaje (DUA)
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'all'
                ? 'bg-fox-primary text-white shadow-sm'
                : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Todas ({subjects.length})
          </button>
          <button
            onClick={() => setFilter('optimal')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'optimal'
                ? 'bg-fox-green text-white shadow-sm'
                : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Óptimas (2)
          </button>
          <button
            onClick={() => setFilter('needs_review')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'needs_review'
                ? 'bg-fox-blue text-white shadow-sm'
                : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            En Seguimiento (1)
          </button>
          <button
            onClick={() => setFilter('critical')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
              filter === 'critical'
                ? 'bg-fox-orange text-white shadow-sm'
                : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Requiere Atención (1)
          </button>
        </div>
      </div>

      {/* Grid of Subject Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredSubjects.map(sub => (
          <motion.div
            key={sub.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between hover:shadow-md transition-all relative overflow-hidden group"
          >
            <div className={`absolute top-0 left-0 w-full h-1.5 ${sub.color}`} />

            <div>
              {/* Top Row */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-12 h-12 rounded-2xl ${sub.bgLight} ${sub.textColor} flex items-center justify-center font-bold text-lg shadow-sm shrink-0`}>
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-fox-text-main text-lg">
                        {sub.subject}
                      </h4>
                      <span className="bg-fox-bg border border-fox-border text-fox-text-muted text-[10px] font-bold px-2 py-0.5 rounded-md uppercase">
                        Nivel {sub.level}
                      </span>
                    </div>
                    <p className="text-xs text-fox-text-muted mt-0.5">
                      {sub.totalStudyHours} horas de estudio acumuladas
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center gap-1.5 justify-end">
                    <span className="text-2xl font-heading font-bold text-fox-text-main">
                      {sub.progress}%
                    </span>
                    {sub.trend === 'up' && <TrendingUp size={18} className="text-fox-green" />}
                    {sub.trend === 'down' && <TrendingDown size={18} className="text-fox-red" />}
                    {sub.trend === 'flat' && <Minus size={18} className="text-fox-text-muted" />}
                  </div>
                  <span className="text-[10px] font-semibold text-fox-text-muted block">
                    {sub.trendValue}
                  </span>
                </div>
              </div>

              {/* Dominio Bar */}
              <div className="w-full bg-fox-border/40 h-2.5 rounded-full overflow-hidden mb-5">
                <div
                  className={`h-full rounded-full ${sub.color} transition-all duration-700`}
                  style={{ width: `${sub.progress}%` }}
                />
              </div>

              {/* Mini Competency Summary */}
              <div className="space-y-2.5 mb-5">
                <div className="text-xs font-bold text-fox-text-muted uppercase tracking-wider flex items-center justify-between">
                  <span>Competencias Clave</span>
                  <span className="font-mono text-[10px]">Puntaje</span>
                </div>
                {sub.competencies.slice(0, 3).map((comp, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-fox-bg/60 border border-fox-border/70 flex items-center justify-between text-xs">
                    <span className="font-medium text-fox-text-main truncate max-w-[240px]">
                      {comp.name}
                    </span>
                    <span className={`font-bold ${comp.score >= 80 ? 'text-fox-green' : comp.score >= 60 ? 'text-fox-primary' : 'text-fox-orange'}`}>
                      {comp.score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Foxy AI Recommendation badge */}
              <div className="p-3 bg-fox-purple/5 border border-fox-purple/20 rounded-2xl mb-5 flex items-start gap-2.5 text-xs">
                <Sparkles size={16} className="text-fox-purple shrink-0 mt-0.5" />
                <p className="text-fox-text-main/90 leading-snug">
                  <strong>Recomendación Foxy:</strong> {sub.focusAreas[0]}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="pt-4 border-t border-fox-border/60 flex items-center justify-between gap-3">
              <button
                onClick={() => onSelectSubject(sub)}
                className="text-xs font-bold text-fox-text-muted hover:text-fox-text-main transition-colors flex items-center gap-1"
              >
                Ver competencias completas <ArrowRight size={14} />
              </button>

              <button
                onClick={() => onOpenQuiz(sub.subject)}
                className="px-4 py-2 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 transition-colors shadow-sm flex items-center gap-1.5"
              >
                <Zap size={14} /> Quiz Rápido (+25 XP)
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
