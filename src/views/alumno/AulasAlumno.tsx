import React, { useState, useEffect } from 'react';
import { classroomRepository, joinClassroomByCode, getClassroomColorTheme } from '../../features/classrooms';
import { StudentClassroomDetail } from '../../features/classrooms/ui';
import type { Classroom } from '../../features/classrooms';
import { messagingStore } from '../../features/messaging/messagingStore';
import { 
  BookOpen, FileText, Users, Calendar, Clock, ChevronRight, 
  CheckCircle2, AlertCircle, Plus, X, Search, LayoutGrid, List,
  LayoutList, Award, Sparkles, Check
} from 'lucide-react';
import { toast } from '../../components/ui/Toaster';
import { useAppContext } from '../../context';
import { motion, AnimatePresence } from 'motion/react';

export function AulasAlumno() {
  const { navigationParams, setView } = useAppContext();
  const [selectedAula, setSelectedAula] = useState<Classroom | null>(null);
  const [classrooms, setClassrooms] = useState<Classroom[]>(() => [...classroomRepository.readMembership()]);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [invitationCode, setInvitationCode] = useState('');

  // Synchronize classrooms with session membership on mount and on messagingStore updates
  useEffect(() => {
    setClassrooms([...classroomRepository.readMembership()]);
    const unsubscribe = messagingStore.subscribe(() => {
      setClassrooms([...classroomRepository.readMembership()]);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (navigationParams?.aulaId) {
      const aula = classrooms.find(a => a.id === navigationParams.aulaId);
      if (aula) {
        setSelectedAula(aula);
      }
    }
  }, [navigationParams, classrooms]);

  const handleBack = () => {
    setSelectedAula(null);
    if (navigationParams?.aulaId) {
      setView('aulas', undefined);
    }
  };

  const handleJoinClassroom = () => {
    const result = joinClassroomByCode(invitationCode, classrooms);
    if (result.status === 'rejected') return;
    const aula = result.classroom;
    if (result.status === 'duplicate') {
      toast.show(`Ya estás matriculado en ${aula.subject} (${aula.course})`, 'info');
      setIsJoinModalOpen(false);
      setInvitationCode('');
      return;
    }

    setClassrooms([...classroomRepository.readMembership()]);
    setIsJoinModalOpen(false);
    setInvitationCode('');
    if (result.status === 'catalogue') {
      toast.show(`🎉 ¡Te has unido exitosamente al aula de ${aula.subject} (${aula.course})!`, 'success');
      return;
    }
    toast.show(`🎉 Te has unido al aula de ${aula.subject} (${aula.course}) mediante tu código de acceso`, 'success');
  };

  return (
    <div className={`flex-1 flex flex-col ${!selectedAula ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-8' : ''}`}>
      <AnimatePresence mode="wait">
        {!selectedAula ? (
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
                  onClick={() => setIsJoinModalOpen(true)}
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
                    onClick={() => setSelectedAula(aula)}
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
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 flex flex-col bg-fox-surface w-full h-full rounded-3xl overflow-hidden shadow-xs border border-fox-border mb-6"
          >
            <StudentClassroomDetail aula={selectedAula} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modal: Unirse a un aula */}
      <AnimatePresence>
        {isJoinModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-fox-border"
            >
              <div className="p-6 border-b border-fox-border bg-fox-surface flex justify-between items-center relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-fox-primary"></div>
                <h3 className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                  <Plus size={22} className="text-fox-primary" /> Unirse a un Aula
                </h3>
                <button 
                  onClick={() => setIsJoinModalOpen(false)} 
                  className="p-2 text-fox-text-muted hover:bg-fox-border/50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-4 bg-fox-bg/40">
                <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border">
                  <label className="text-xs font-bold uppercase tracking-wider text-fox-text-main mb-2 block">
                    Código de Invitación
                  </label>
                  <p className="text-xs text-fox-text-muted mb-3 font-medium">
                    Ingresa el código alfanumérico provisto por tu docente para matricularte.
                  </p>
                  <input 
                    type="text" 
                    value={invitationCode}
                    onChange={(e) => setInvitationCode(e.target.value)}
                    placeholder="Ej. LIT-2026-X"
                    className="w-full bg-fox-bg border border-fox-border rounded-xl px-4 py-3 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all font-mono font-bold text-sm text-fox-text-main"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-fox-border bg-fox-surface flex justify-end gap-3">
                <button 
                  onClick={() => setIsJoinModalOpen(false)} 
                  className="px-4 py-2 font-bold text-xs text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleJoinClassroom}
                  disabled={!invitationCode.trim()}
                  className="px-6 py-2.5 bg-fox-primary text-white font-bold text-xs rounded-xl hover:bg-fox-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-xs cursor-pointer"
                >
                  Unirme al Aula
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
