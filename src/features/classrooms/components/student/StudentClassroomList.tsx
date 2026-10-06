import React from 'react';
import { motion } from 'motion/react';
import { BookOpen, Plus, Users, AlertCircle, CheckCircle2, Calendar, Award, Clock, ChevronRight } from 'lucide-react';
import type { Classroom } from '../../model/Classroom';
import { getClassroomColorTheme } from '../../lib/getClassroomColorTheme';

export function StudentClassroomList({ classrooms, onSelect, onJoin }: {
  classrooms: Classroom[]; onSelect: (aula: Classroom) => void; onJoin: () => void;
}) {
  return (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto w-full"
          >
            {/* Header */}
            <header className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
                    <span className="p-2 rounded-2xl bg-fox-primary/10 text-fox-primary border border-fox-primary/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </span>
                    <span>Mis Aulas</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-semibold">
                      Materias Matriculadas
                    </span>
                  </h2>
                  <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
                    Accedé a tus materias, revisá tareas y consignas pendientes, consultá materiales de estudio y enviá tus entregas.
                  </p>
                </div>
                <button
                  onClick={onJoin}
                  className="bg-fox-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-fox-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer w-full md:w-auto"
                >
                  <Plus size={18} /> <span>Unirse a un Aula</span>
                </button>
              </div>
            </header>

            {/* Student Classroom Cards Grid - Matching Docente Design Standards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
              {classrooms.map((aula, idx) => {
                const theme = getClassroomColorTheme(aula.color, aula.subject);
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={aula.id}
                    className="group bg-fox-surface rounded-3xl border border-fox-border shadow-xs hover:shadow-xl hover:border-fox-primary/30 transition-all duration-300 flex flex-col h-full hover:-translate-y-1 overflow-hidden relative cursor-pointer"
                    onClick={() => onSelect(aula)}
                  >
                    {/* Decorative Top Line indicator */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${theme.bar}`}></div>

                    {/* Header section */}
                    <div className="p-6 pb-5 border-b border-fox-border/50">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black mb-3 ${theme.badgeBg} ${theme.badgeText} border ${theme.border}`}>
                            <span className={`w-2 h-2 rounded-full ${theme.bullet} shrink-0`}></span>
                            {aula.course}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${theme.bullet} shrink-0`}></span>
                            <h3 className="text-2xl font-heading font-extrabold text-fox-text-main leading-tight group-hover:text-fox-primary transition-colors line-clamp-1">
                              {aula.subject}
                            </h3>
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-fox-bg border border-fox-border flex items-center justify-center text-fox-text-muted group-hover:bg-fox-primary/5 group-hover:text-fox-primary group-hover:border-fox-primary/20 transition-all shrink-0">
                          <BookOpen size={24} />
                        </div>
                      </div>

                      <p className="flex items-center gap-2 mt-4 text-sm font-medium text-fox-text-muted">
                        <Users size={16} className="opacity-70" />
                        <span>Docente: <strong className="text-fox-text-main">{aula.teacherName || 'Prof. Titular'}</strong></span>
                      </p>
                    </div>

                    {/* Main Body - Progress & Stats */}
                    <div className="p-6 pt-5 flex-1 flex flex-col bg-fox-bg/30">
                      <div className="mb-6">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-sm font-bold text-fox-text-main/80">Tu progreso en la materia</span>
                          <span className={`text-xl font-black ${theme.textAccent}`}>
                            {aula.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-fox-border/60 rounded-full h-2.5 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${aula.progress}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-full rounded-full ${theme.bar} transition-all`}
                          />
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-auto">
                        <div className="bg-fox-surface border border-fox-border rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center shadow-2xs group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                          <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Tareas</span>
                          <div className="flex items-center justify-center gap-1.5 min-w-0 max-w-full">
                            {aula.activeTasks > 0 ? (
                              <AlertCircle size={14} className="text-fox-orange shrink-0" />
                            ) : (
                              <CheckCircle2 size={14} className="text-fox-green shrink-0" />
                            )}
                            <span className="text-base sm:text-lg font-black text-fox-text-main leading-none">{aula.activeTasks}</span>
                          </div>
                        </div>

                        {/* Próxima - Fixed container with min-w-0 and ellipsis */}
                        <div
                          className="bg-fox-surface border border-fox-border rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center shadow-2xs group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center"
                          title={`Próxima clase: ${aula.nextClass || 'Mañana'}`}
                        >
                          <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Próxima</span>
                          <div className="flex items-center justify-center gap-1 min-w-0 max-w-full w-full px-0.5">
                            <Calendar size={13} className="text-fox-primary shrink-0" />
                            <span className="text-[11px] sm:text-xs font-black text-fox-text-main truncate text-center block">
                              {aula.nextClass || 'Mañana'}
                            </span>
                          </div>
                        </div>

                        <div className="bg-fox-surface border border-fox-border rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center shadow-2xs group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                          <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Promedio</span>
                          <div className="flex items-center justify-center gap-1 min-w-0 max-w-full">
                            <Award size={14} className="text-fox-green shrink-0" />
                            <span className="text-xs sm:text-sm font-black text-fox-text-main">{aula.avgGrade ? `${aula.avgGrade}` : '8.8'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Card Footer */}
                    <div className="p-4 px-6 border-t border-fox-border bg-fox-surface flex items-center justify-between group-hover:bg-fox-bg/50 transition-colors">
                      <span className="text-xs font-bold text-fox-text-muted flex items-center gap-1.5">
                        <Clock size={13} /> {aula.lastActivity || 'Activa hoy'}
                      </span>
                      <div className="flex items-center gap-1 text-fox-primary font-bold text-xs group-hover:translate-x-1 transition-transform">
                        <span>Ingresar</span>
                        <ChevronRight size={15} />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
  );
}
