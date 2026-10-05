import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  BookOpen, Users, CheckCircle2, AlertTriangle, Sparkles, 
  TrendingUp, TrendingDown, Minus, Target, Brain, ShieldAlert, 
  ArrowRight, Zap, Filter, Award, ChevronRight
} from 'lucide-react';
import { ClassroomPerformance } from './progresoDocenteTypes';

interface ProgresoDocenteAulasTabProps {
  aulas: ClassroomPerformance[];
  onSelectAula: (aula: ClassroomPerformance) => void;
  onOpenQuickDua: (subject?: string, course?: string) => void;
}

export function ProgresoDocenteAulasTab({
  aulas,
  onSelectAula,
  onOpenQuickDua
}: ProgresoDocenteAulasTabProps) {
  const [filterStatus, setFilterStatus] = useState<'all' | 'optimal' | 'needs_review' | 'critical'>('all');

  const filteredAulas = aulas.filter(aula => {
    if (filterStatus === 'all') return true;
    return aula.status === filterStatus;
  });

  const optimalCount = aulas.filter(a => a.status === 'optimal').length;
  const needsReviewCount = aulas.filter(a => a.status === 'needs_review').length;
  const criticalCount = aulas.filter(a => a.status === 'critical').length;

  return (
    <div className="space-y-6">
      {/* Header and Filter Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-heading font-bold text-fox-text-main">
            Rendimiento y Competencias por Aula 🏫
          </h3>
          <p className="text-xs text-fox-text-muted mt-0.5">
            Diagnóstico curricular detallado, fortalezas y andamiaje DUA por grupo
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: `Todas (${aulas.length})` },
            { id: 'optimal', label: `Óptimas (${optimalCount})`, color: 'text-fox-green' },
            { id: 'needs_review', label: `En Seguimiento (${needsReviewCount})`, color: 'text-fox-purple' },
            { id: 'critical', label: `Atención Prioritaria (${criticalCount})`, color: 'text-fox-orange' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilterStatus(f.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                filterStatus === f.id
                  ? 'bg-fox-primary text-white shadow-xs'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Aulas Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredAulas.map(aula => (
          <motion.div
            key={aula.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-fox-surface border border-fox-border hover:border-fox-primary/40 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
          >
            {/* Top Color Accent Line */}
            <div className={`absolute top-0 left-0 w-full h-1.5 ${aula.color}`} />

            <div>
              {/* Classroom Title & Status */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl ${aula.bgLight} ${aula.textColor} flex items-center justify-center font-bold text-xl shadow-2xs shrink-0`}>
                    <BookOpen size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-heading font-bold text-fox-text-main text-lg group-hover:text-fox-primary transition-colors">
                        {aula.subject}
                      </h4>
                      <span className="bg-fox-bg border border-fox-border text-fox-text-main text-xs font-black px-2 py-0.5 rounded-md">
                        {aula.course}
                      </span>
                    </div>
                    <p className="text-xs text-fox-text-muted mt-0.5 flex items-center gap-2">
                      <span className="flex items-center gap-1 font-medium">
                        <Users size={13} /> {aula.studentsCount} estudiantes
                      </span>
                      <span>•</span>
                      <span>{aula.activeTasks} tareas activas</span>
                    </p>
                  </div>
                </div>

                <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${
                  aula.status === 'optimal'
                    ? 'bg-fox-green/10 text-fox-green border border-fox-green/20'
                    : aula.status === 'critical'
                    ? 'bg-fox-orange/10 text-fox-orange border border-fox-orange/20'
                    : 'bg-fox-purple/10 text-fox-purple border border-fox-purple/20'
                }`}>
                  {aula.status === 'optimal' ? 'Óptimo' : aula.status === 'critical' ? 'Atención' : 'Seguimiento'}
                </span>
              </div>

              {/* Progress & Average Strip */}
              <div className="bg-fox-bg/50 border border-fox-border/60 rounded-2xl p-3.5 mb-4">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-fox-text-muted">Avance de Plan de Estudios</span>
                  <div className="flex items-center gap-3">
                    <span className="text-fox-text-main font-mono">Promedio: <strong>{aula.avgGrade}</strong></span>
                    <span className="flex items-center gap-0.5 text-fox-green">
                      <TrendingUp size={13} /> {aula.trendValue.split(' ')[0]}
                    </span>
                  </div>
                </div>
                <div className="w-full bg-fox-border/50 h-2.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${aula.color}`}
                    style={{ width: `${aula.progress}%` }}
                  />
                </div>
              </div>

              {/* Competencies Preview */}
              <div className="space-y-2 mb-4">
                <span className="text-[11px] font-bold uppercase tracking-wider text-fox-text-muted block mb-1">
                  Competencias Curriculares Clave
                </span>
                {aula.keyCompetencies.slice(0, 3).map((comp, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-fox-text-main truncate pr-2 font-medium">{comp.name}</span>
                    <span className={`font-mono font-bold text-[11px] px-1.5 py-0.5 rounded ${
                      comp.score >= 80 ? 'bg-fox-green/10 text-fox-green' : comp.score >= 65 ? 'bg-fox-primary/10 text-fox-primary' : 'bg-fox-orange/10 text-fox-orange'
                    }`}>
                      {comp.score}%
                    </span>
                  </div>
                ))}
              </div>

              {/* Foxy AI DUA Note */}
              <div className="bg-fox-purple/5 border border-fox-purple/20 rounded-2xl p-3 flex items-start gap-2.5 mb-2">
                <Sparkles size={16} className="text-fox-purple shrink-0 mt-0.5" />
                <p className="text-[11px] text-fox-text-main leading-relaxed">
                  <strong className="text-fox-purple">DUA Foxy:</strong> {aula.foxyRecommendation}
                </p>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="pt-4 border-t border-fox-border/60 flex items-center justify-between gap-3">
              <button
                onClick={() => onSelectAula(aula)}
                className="text-xs font-bold text-fox-primary hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ver diagnóstico completo <ChevronRight size={14} />
              </button>

              <button
                onClick={() => onOpenQuickDua(aula.subject, aula.course)}
                className="bg-fox-surface hover:bg-fox-primary hover:text-white border border-fox-border text-fox-text-main px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Zap size={13} /> Adaptar Tarea DUA
              </button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
