import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Users, CheckCircle2, AlertTriangle, Sparkles, X, 
  TrendingUp, TrendingDown, Minus, Target, Brain, ShieldAlert, ArrowRight, Zap, Award
} from 'lucide-react';
import { ClassroomPerformance } from './progresoDocenteTypes';

interface AulaDetailModalProps {
  isOpen: boolean;
  aula: ClassroomPerformance | null;
  onClose: () => void;
  onInterveneStudent: (studentName: string, issue: string) => void;
  onOpenQuickDua: (subject: string, course: string) => void;
}

export function AulaDetailModal({
  isOpen,
  aula,
  onClose,
  onInterveneStudent,
  onOpenQuickDua
}: AulaDetailModalProps) {
  if (!isOpen || !aula) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header with subject color banner */}
        <div className="relative p-6 border-b border-fox-border bg-fox-bg/50 shrink-0">
          <div className={`absolute top-0 left-0 w-full h-2 ${aula.color}`} />
          
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-2xl ${aula.bgLight} ${aula.textColor} flex items-center justify-center font-bold text-2xl shadow-sm shrink-0`}>
                <BookOpen size={26} />
              </div>
              <div>
                <div className="flex items-center gap-2.5">
                  <h3 className="font-heading font-extrabold text-fox-text-main text-2xl">
                    {aula.subject}
                  </h3>
                  <span className="bg-fox-surface border border-fox-border text-fox-text-main text-xs font-black px-2.5 py-0.5 rounded-lg">
                    {aula.course}
                  </span>
                  <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
                    aula.status === 'optimal' 
                      ? 'bg-fox-green/10 text-fox-green border border-fox-green/20' 
                      : aula.status === 'critical'
                      ? 'bg-fox-orange/10 text-fox-orange border border-fox-orange/20'
                      : 'bg-fox-purple/10 text-fox-purple border border-fox-purple/20'
                  }`}>
                    {aula.status === 'optimal' ? 'Óptimo' : aula.status === 'critical' ? 'Requiere Atención' : 'En Seguimiento'}
                  </span>
                </div>
                <p className="text-xs text-fox-text-muted mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 font-medium">
                    <Users size={14} /> {aula.studentsCount} matriculados
                  </span>
                  <span>•</span>
                  <span>{aula.activeTasks} tareas en curso</span>
                  <span>•</span>
                  <span>{aula.pendingSubmissions} entregas por calificar</span>
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
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Top Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Promedio</span>
              <div className="text-2xl font-heading font-extrabold text-fox-text-main mt-0.5">
                {aula.avgGrade} <span className="text-xs font-normal text-fox-text-muted">/ 10</span>
              </div>
            </div>

            <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Avance Plan</span>
              <div className={`text-2xl font-heading font-extrabold ${aula.textColor} mt-0.5`}>
                {aula.progress}%
              </div>
            </div>

            <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Tendencia</span>
              <div className="text-sm font-bold text-fox-text-main mt-1.5 flex items-center justify-center gap-1">
                {aula.trend === 'up' && <TrendingUp size={16} className="text-fox-green" />}
                {aula.trend === 'down' && <TrendingDown size={16} className="text-fox-red" />}
                {aula.trend === 'flat' && <Minus size={16} className="text-fox-text-muted" />}
                <span>{aula.trendValue}</span>
              </div>
            </div>

            <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-3.5 text-center">
              <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Alumnos en Foco</span>
              <div className="text-2xl font-heading font-extrabold text-fox-orange mt-0.5">
                {aula.priorityStudents.length}
              </div>
            </div>
          </div>

          {/* Foxy Recommendation Banner */}
          <div className="bg-fox-purple/10 border border-fox-purple/20 rounded-2xl p-4 flex items-start gap-3">
            <Sparkles size={20} className="text-fox-purple shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-fox-purple">
                Recomendación Pedagógica Foxy (DUA)
              </h4>
              <p className="text-xs text-fox-text-main mt-1 leading-relaxed">
                {aula.foxyRecommendation}
              </p>
            </div>
          </div>

          {/* Competency Mastery Breakdown */}
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-sm flex items-center gap-2 mb-3">
              <Target size={16} className="text-fox-primary" /> Matriz de Competencias Curriculares
            </h4>

            <div className="space-y-3">
              {aula.keyCompetencies.map((comp, idx) => (
                <div key={idx} className="bg-fox-bg/50 border border-fox-border/70 rounded-2xl p-3.5">
                  <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                    <span className="text-fox-text-main">{comp.name}</span>
                    <span className={`font-mono ${
                      comp.score >= 80 ? 'text-fox-green' : comp.score >= 65 ? 'text-fox-primary' : 'text-fox-orange'
                    }`}>
                      {comp.score}%
                    </span>
                  </div>
                  <div className="w-full bg-fox-border/50 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        comp.score >= 80 ? 'bg-fox-green' : comp.score >= 65 ? 'bg-fox-primary' : 'bg-fox-orange'
                      }`}
                      style={{ width: `${comp.score}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Strengths & Improvement Opportunities */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-fox-green/5 border border-fox-green/20 rounded-2xl p-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-fox-green flex items-center gap-1.5 mb-2">
                <CheckCircle2 size={16} /> Fortalezas del Grupo
              </h5>
              <ul className="space-y-1.5 text-xs text-fox-text-main">
                {aula.strengths.map((str, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-fox-green font-black">•</span>
                    <span>{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-fox-orange/5 border border-fox-orange/20 rounded-2xl p-4">
              <h5 className="text-xs font-bold uppercase tracking-wider text-fox-orange flex items-center gap-1.5 mb-2">
                <AlertTriangle size={16} /> Oportunidades de Refuerzo
              </h5>
              <ul className="space-y-1.5 text-xs text-fox-text-main">
                {aula.weaknesses.map((w, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-fox-orange font-black">•</span>
                    <span>{w}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Priority Attention Students */}
          {aula.priorityStudents.length > 0 && (
            <div>
              <h4 className="font-heading font-bold text-fox-text-main text-sm flex items-center gap-2 mb-3">
                <ShieldAlert size={16} className="text-red-500" /> Estudiantes en Seguimiento Prioritario
              </h4>

              <div className="space-y-2.5">
                {aula.priorityStudents.map((st, i) => (
                  <div
                    key={i}
                    className="p-3.5 bg-fox-surface border border-fox-border hover:border-fox-border/80 rounded-2xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-fox-text-main">{st.name}</span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          st.risk === 'ALTO' ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-600'
                        }`}>
                          Riesgo {st.risk}
                        </span>
                      </div>
                      <p className="text-xs text-fox-text-muted mt-0.5">{st.issue}</p>
                    </div>

                    <button
                      onClick={() => onInterveneStudent(st.name, st.issue)}
                      className="px-3 py-1.5 bg-fox-primary/10 hover:bg-fox-primary hover:text-white text-fox-primary rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
                    >
                      Intervenir
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-fox-border bg-fox-bg/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-fox-text-muted hover:text-fox-text-main bg-fox-surface border border-fox-border rounded-xl transition-colors cursor-pointer"
          >
            Cerrar
          </button>

          <button
            onClick={() => onOpenQuickDua(aula.subject, aula.course)}
            className="bg-fox-primary hover:bg-fox-primary/90 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-sm cursor-pointer"
          >
            <Zap size={14} /> Generar Actividad Adaptada (DUA) con Foxy
          </button>
        </div>
      </motion.div>
    </div>
  );
}
