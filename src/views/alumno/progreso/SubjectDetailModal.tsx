import React from 'react';
import { motion } from 'motion/react';
import { X, BookOpen, Brain, Target, Sparkles, TrendingUp, TrendingDown, Minus, CheckCircle, Clock, ArrowRight, Award } from 'lucide-react';
import { SubjectMastery } from './progresoTypes';

interface SubjectDetailModalProps {
  subject: SubjectMastery | null;
  isOpen: boolean;
  onClose: () => void;
  onStartPractice: (subjectName: string) => void;
}

export function SubjectDetailModal({ subject, isOpen, onClose, onStartPractice }: SubjectDetailModalProps) {
  if (!isOpen || !subject) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-fox-surface border border-fox-border rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="p-6 border-b border-fox-border bg-fox-bg/50 relative overflow-hidden">
          <div className={`absolute -right-8 -top-8 w-32 h-32 rounded-full ${subject.bgLight} opacity-80 blur-xl pointer-events-none`}></div>
          <div className="flex items-start justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl ${subject.bgLight} ${subject.textColor} flex items-center justify-center font-bold shadow-sm`}>
                <BookOpen size={24} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-heading font-bold text-fox-text-main text-xl">
                    {subject.subject}
                  </h3>
                  <span className="bg-fox-border/60 text-fox-text-muted text-xs font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider">
                    Nivel {subject.level}
                  </span>
                </div>
                <p className="text-xs text-fox-text-muted mt-0.5">
                  Seguimiento granular de competencias y retención
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl hover:bg-fox-border text-fox-text-muted hover:text-fox-text-main transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 mt-5 relative z-10">
            <div className="bg-fox-surface p-3 rounded-2xl border border-fox-border">
              <div className="text-[11px] font-bold text-fox-text-muted">Dominio Global</div>
              <div className="text-lg font-heading font-bold text-fox-text-main mt-0.5 flex items-center gap-1.5">
                {subject.progress}%
                {subject.trend === 'up' && <TrendingUp size={16} className="text-fox-green" />}
                {subject.trend === 'down' && <TrendingDown size={16} className="text-fox-red" />}
                {subject.trend === 'flat' && <Minus size={16} className="text-fox-text-muted" />}
              </div>
              <span className="text-[10px] text-fox-text-muted font-medium">{subject.trendValue}</span>
            </div>

            <div className="bg-fox-surface p-3 rounded-2xl border border-fox-border">
              <div className="text-[11px] font-bold text-fox-text-muted">Precisión Active Recall</div>
              <div className="text-lg font-heading font-bold text-fox-primary mt-0.5 flex items-center gap-1">
                <Brain size={16} /> {subject.activeRecallAccuracy}%
              </div>
              <span className="text-[10px] text-fox-text-muted font-medium">En quizzes sin ayuda</span>
            </div>

            <div className="bg-fox-surface p-3 rounded-2xl border border-fox-border">
              <div className="text-[11px] font-bold text-fox-text-muted">Tiempo Invertido</div>
              <div className="text-lg font-heading font-bold text-fox-text-main mt-0.5 flex items-center gap-1">
                <Clock size={16} className="text-fox-text-muted" /> {subject.totalStudyHours}h
              </div>
              <span className="text-[10px] text-fox-text-muted font-medium">Último: {subject.lastReviewed}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Competency Matrix */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-heading font-bold text-fox-text-main text-sm flex items-center gap-2">
                <Target size={16} className={subject.textColor} /> Desglose de Competencias
              </h4>
              <span className="text-xs text-fox-text-muted font-medium">Evaluación continua DUA</span>
            </div>

            <div className="space-y-3">
              {subject.competencies.map((comp, idx) => (
                <div key={idx} className="p-3.5 bg-fox-bg/60 border border-fox-border rounded-2xl">
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-sm font-bold text-fox-text-main">{comp.name}</span>
                    <span className="text-sm font-bold text-fox-text-main">{comp.score}%</span>
                  </div>
                  <div className="w-full bg-fox-border/40 h-2 rounded-full overflow-hidden mb-1.5">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        comp.score >= 80 ? 'bg-fox-green' : comp.score >= 60 ? 'bg-fox-primary' : 'bg-fox-orange'
                      }`}
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                  <p className="text-xs text-fox-text-muted">{comp.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Focus Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-fox-green/10 border border-fox-green/20 rounded-2xl">
              <h5 className="text-xs font-bold text-fox-green uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <CheckCircle size={14} /> Puntos Fuertes
              </h5>
              <ul className="space-y-2">
                {subject.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-fox-text-main flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fox-green mt-1.5 shrink-0" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-4 bg-fox-orange/10 border border-fox-orange/20 rounded-2xl">
              <h5 className="text-xs font-bold text-fox-orange uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                <Sparkles size={14} /> Sugerencias de Foxy
              </h5>
              <ul className="space-y-2">
                {subject.focusAreas.map((f, idx) => (
                  <li key={idx} className="text-xs text-fox-text-main flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-fox-orange mt-1.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Recent Graded Activities */}
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-sm mb-3 flex items-center gap-2">
              <Award size={16} className="text-fox-gold" /> Últimas Actividades Evaluadas
            </h4>
            <div className="space-y-2">
              {subject.recentActivities.map((act, idx) => (
                <div key={idx} className="p-3 bg-fox-bg/60 border border-fox-border rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-fox-text-main block">{act.title}</span>
                    <span className="text-[10px] text-fox-text-muted">{act.date} · {act.type.toUpperCase()}</span>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-fox-surface border border-fox-border text-fox-primary">
                    {act.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-fox-border bg-fox-bg/50 flex items-center justify-between">
          <div className="text-xs text-fox-text-muted">
            Próximo repaso sugerido: <strong className="text-fox-text-main">{subject.nextScheduledReview}</strong>
          </div>
          <button
            onClick={() => {
              onClose();
              onStartPractice(subject.subject);
            }}
            className="px-5 py-2.5 rounded-xl text-sm font-bold bg-fox-primary text-white hover:bg-fox-primary/90 transition-all shadow-sm flex items-center gap-2"
          >
            Practicar con Foxy <ArrowRight size={16} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
