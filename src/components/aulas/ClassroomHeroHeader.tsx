import React from 'react';
import { 
  ArrowLeft, 
  BookOpen, 
  Users, 
  FileText, 
  Calendar, 
  Plus, 
  Award,
  Clock
} from 'lucide-react';
import { Classroom } from '../../types';

interface ClassroomHeroHeaderProps {
  role: 'docente' | 'alumno';
  classroom?: Classroom;
  aula?: Classroom;
  subject?: string;
  course?: string;
  color?: string;
  studentsCount?: number;
  activeTab?: string;
  onBack: () => void;
  onNewActivity?: () => void;
  onOpenPlan?: () => void;
  onViewPlan?: () => void;
}

export const ClassroomHeroHeader: React.FC<ClassroomHeroHeaderProps> = ({
  role,
  classroom,
  aula,
  subject,
  course,
  color,
  studentsCount,
  activeTab,
  onBack,
  onNewActivity,
  onOpenPlan,
  onViewPlan
}) => {
  const currentAula: Classroom = classroom || aula || {
    id: 'default',
    subject: subject || 'Materia',
    course: course || 'Curso',
    color: color || 'bg-fox-primary',
    studentsCount: studentsCount || 28,
    progress: 65,
    activeTasks: 3,
    pendingSubmissions: 2,
    avgGrade: 8.5
  };

  const handleOpenPlan = onOpenPlan || onViewPlan;
  const getBannerColor = (colorClass: string) => {
    if (colorClass.includes('purple')) return 'from-purple-600/15 via-purple-500/5 to-transparent text-purple-700 border-purple-200/60';
    if (colorClass.includes('orange')) return 'from-amber-600/15 via-amber-500/5 to-transparent text-amber-700 border-amber-200/60';
    if (colorClass.includes('green')) return 'from-emerald-600/15 via-emerald-500/5 to-transparent text-emerald-700 border-emerald-200/60';
    if (colorClass.includes('blue')) return 'from-blue-600/15 via-blue-500/5 to-transparent text-blue-700 border-blue-200/60';
    if (colorClass.includes('indigo')) return 'from-indigo-600/15 via-indigo-500/5 to-transparent text-indigo-700 border-indigo-200/60';
    return 'from-fox-primary/15 via-fox-primary/5 to-transparent text-fox-primary border-fox-border';
  };

  const getAccentBg = (colorClass: string) => {
    if (colorClass.includes('purple')) return 'bg-purple-600 text-white';
    if (colorClass.includes('orange')) return 'bg-amber-600 text-white';
    if (colorClass.includes('green')) return 'bg-emerald-600 text-white';
    if (colorClass.includes('blue')) return 'bg-blue-600 text-white';
    if (colorClass.includes('indigo')) return 'bg-indigo-600 text-white';
    return 'bg-fox-primary text-white';
  };

  return (
    <div className="relative border-b border-fox-border bg-fox-surface shrink-0 shadow-xs">
      {/* Top color bar indicator */}
      <div className={`h-1.5 w-full ${currentAula.color || 'bg-fox-primary'}`} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          
          {/* Left section: Back button + Icon + Title info */}
          <div className="flex items-start sm:items-center gap-4">
            <button
              onClick={onBack}
              id="btn-back-to-classrooms"
              className="p-2.5 rounded-xl border border-fox-border bg-fox-bg/80 text-fox-text-muted hover:text-fox-text-main hover:bg-fox-border/40 hover:border-fox-primary/30 transition-all shadow-2xs group flex items-center gap-1.5 shrink-0"
              title="Volver a lista de aulas"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-0.5 transition-transform" />
              <span className="text-xs font-bold hidden sm:inline">Aulas</span>
            </button>

            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-xs shrink-0 ${getAccentBg(currentAula.color || '')}`}>
              <BookOpen size={26} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-extrabold text-fox-text-main tracking-tight">
                  {currentAula.subject}
                </h1>
                <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-fox-primary/10 text-fox-primary border border-fox-primary/20">
                  {currentAula.course}
                </span>
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Ciclo Lectivo 2026
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-1.5 text-xs text-fox-text-muted font-medium">
                {role === 'docente' ? (
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-fox-primary" />
                    <strong>{currentAula.studentsCount || 28}</strong> alumnos matriculados
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5">
                    <Users size={14} className="text-fox-primary" />
                    Docente: <strong>{currentAula.teacherName || 'Profa. Martínez'}</strong>
                  </span>
                )}

                <span className="hidden sm:inline text-fox-border">•</span>

                <span className="flex items-center gap-1.5">
                  <FileText size={14} className="text-amber-600" />
                  <strong>{currentAula.activeTasks ?? 3}</strong> actividades activas
                </span>

                <span className="hidden sm:inline text-fox-border">•</span>

                <span className="flex items-center gap-1.5">
                  <Clock size={14} className="text-fox-purple" />
                  {currentAula.nextClass ? `Próxima clase: ${currentAula.nextClass}` : 'Próxima clase: Jueves 08:00'}
                </span>
              </div>
            </div>
          </div>

          {/* Right section: Contextual actions */}
          <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t lg:border-t-0 border-fox-border/60">
            {role === 'docente' && (
              <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                {handleOpenPlan && (
                  <button
                    onClick={handleOpenPlan}
                    id="btn-view-study-plan"
                    className="px-3.5 py-2 rounded-xl border border-fox-border bg-fox-surface hover:bg-fox-bg text-fox-text-main text-xs font-bold transition-all shadow-2xs hover:shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Ver Plan de Estudios y Progresión Curricular"
                  >
                    <FileText size={15} className="text-fox-primary" />
                    <span>Plan de Estudios</span>
                  </button>
                )}

                {onNewActivity && (
                  <button
                    onClick={onNewActivity}
                    id="btn-create-new-activity-header"
                    className="px-4 py-2 rounded-xl bg-fox-primary hover:bg-fox-primary/90 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                    title="Crear una nueva actividad para esta clase"
                  >
                    <Plus size={16} />
                    <span>Nueva Actividad</span>
                  </button>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
