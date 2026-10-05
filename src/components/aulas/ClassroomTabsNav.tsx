import React from 'react';
import { motion } from 'motion/react';
import { 
  Users, 
  FileText, 
  LayoutList, 
  Library, 
  BarChart2, 
  MessageSquare 
} from 'lucide-react';

export type AulaTabId = 'alumnos' | 'actividades' | 'curricula' | 'biblioteca' | 'rendimiento' | 'muro';

interface TabItemConfig {
  id: AulaTabId;
  labelDocente: string;
  labelAlumno: string;
  icon: React.ElementType;
  badge?: string | number;
}

interface ClassroomTabsNavProps {
  role: 'docente' | 'alumno';
  activeTab: AulaTabId;
  onChangeTab?: (tabId: AulaTabId) => void;
  onTabChange?: (tabId: AulaTabId) => void;
  studentsCount?: number;
  activeTasksCount?: number;
  activitiesCount?: number;
  counts?: {
    alumnos?: number;
    actividades?: number;
    curriculaProgress?: number;
    biblioteca?: number;
    muroUnread?: number;
  };
}

export const ClassroomTabsNav: React.FC<ClassroomTabsNavProps> = ({
  role,
  activeTab,
  onChangeTab,
  onTabChange,
  studentsCount,
  activeTasksCount,
  activitiesCount,
  counts
}) => {
  const handleTabSelect = onChangeTab || onTabChange || (() => {});
  const numAlumnos = studentsCount ?? counts?.alumnos ?? 28;
  const numActividades = activitiesCount ?? activeTasksCount ?? counts?.actividades ?? 3;

  const tabs: TabItemConfig[] = [
    {
      id: 'alumnos',
      labelDocente: 'Alumnos',
      labelAlumno: 'Compañeros',
      icon: Users,
      badge: numAlumnos
    },
    {
      id: 'actividades',
      labelDocente: 'Actividades',
      labelAlumno: 'Actividades',
      icon: FileText,
      badge: numActividades
    },
    {
      id: 'curricula',
      labelDocente: 'Currícula',
      labelAlumno: 'Currícula',
      icon: LayoutList,
      badge: counts?.curriculaProgress ? `${counts.curriculaProgress}%` : '65%'
    },
    {
      id: 'biblioteca',
      labelDocente: 'Biblioteca',
      labelAlumno: 'Biblioteca',
      icon: Library,
      badge: counts?.biblioteca ?? 6
    },
    {
      id: 'rendimiento',
      labelDocente: 'Rendimiento',
      labelAlumno: 'Mi Rendimiento',
      icon: BarChart2
    },
    {
      id: 'muro',
      labelDocente: 'Muro',
      labelAlumno: 'Muro',
      icon: MessageSquare,
      badge: counts?.muroUnread ?? 3
    }
  ];

  return (
    <div className="bg-fox-surface border-b border-fox-border px-4 sm:px-6 lg:px-8 shrink-0 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto hide-scrollbar py-2.5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            const label = role === 'docente' ? tab.labelDocente : tab.labelAlumno;

            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => handleTabSelect(tab.id)}
                className={`relative px-3.5 sm:px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap flex items-center gap-2 transition-all cursor-pointer ${
                  isActive
                    ? 'text-fox-primary bg-fox-primary/8 shadow-2xs font-extrabold'
                    : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg/80'
                }`}
              >
                <Icon size={17} className={isActive ? 'text-fox-primary' : 'text-fox-text-muted'} />
                <span>{label}</span>

                {tab.badge !== undefined && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full transition-colors ${
                      isActive
                        ? 'bg-fox-primary text-white'
                        : 'bg-fox-border/60 text-fox-text-muted'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}

                {isActive && (
                  <motion.div
                    layoutId={`tabIndicator-${role}`}
                    className="absolute -bottom-2.5 left-2 right-2 h-0.5 bg-fox-primary rounded-full"
                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
