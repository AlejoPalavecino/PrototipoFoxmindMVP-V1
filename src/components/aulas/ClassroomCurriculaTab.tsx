import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  ChevronDown,
  ChevronRight,
  Layers, 
  Award,
  Search,
  Check,
  Calendar,
  Compass,
  FileText,
  Target,
  Filter
} from 'lucide-react';
import { toast } from '../ui/Toaster';

export interface CurriculumUnit {
  id: number;
  unit: string;
  topics: string[];
  completedTopics: string[];
  description?: string;
  napAlignment?: string;
  durationWeeks?: number;
}

interface ClassroomCurriculaTabProps {
  role: 'docente' | 'alumno';
  subjectName?: string;
  initialCurriculum?: CurriculumUnit[];
  curriculum?: any[];
  onToggleTopic?: (unitId: number, topic: string) => void;
}

const defaultCurriculum: CurriculumUnit[] = [
  { 
    id: 1, 
    unit: 'Unidad 1: Modernismo y Renovación Estética', 
    topics: [
      'Rubén Darío y Azul... (1888)', 
      'Características estilísticas y cromatismo sensorial', 
      'Poesía modernista y simbolismo hispanoamericano', 
      'Impacto en la narrativa y renovación lingüística'
    ],
    completedTopics: [
      'Rubén Darío y Azul... (1888)', 
      'Características estilísticas y cromatismo sensorial', 
      'Poesía modernista y simbolismo hispanoamericano', 
      'Impacto en la narrativa y renovación lingüística'
    ],
    description: 'Búsqueda de la belleza formal, preciosismo y autonomía del lenguaje poético finisecular.',
    napAlignment: 'Eje 1: Lectura comprensiva y canon latinoamericano',
    durationWeeks: 4
  },
  { 
    id: 2, 
    unit: 'Unidad 2: Vanguardias Literarias en América Latina', 
    topics: [
      'Creacionismo (Vicente Huidobro)', 
      'Ultraísmo y manifiestos de ruptura estética', 
      'El estridentismo y la experimentación tipográfica', 
      'La metáfora vanguardista sin nexos ornamentales'
    ],
    completedTopics: [
      'Creacionismo (Vicente Huidobro)', 
      'Ultraísmo y manifiestos de ruptura estética'
    ],
    description: 'Ruptura con las normas métricas tradicionales y experimentación poética radical.',
    napAlignment: 'Eje 2: Producción escrita y experimentación estética',
    durationWeeks: 6
  },
  { 
    id: 3, 
    unit: 'Unidad 3: El Boom Latinoamericano y Realismo Mágico', 
    topics: [
      'Contexto sociopolítico de los años 60', 
      'Gabriel García Márquez y Cien Años de Soledad', 
      'Julio Cortázar y la fragmentación temporal en Rayuela', 
      'Mario Vargas Llosa y la técnica del contrapunto'
    ],
    completedTopics: [],
    description: 'Consagración internacional de la narrativa latinoamericana e innovaciones en el tiempo y espacio narrativo.',
    napAlignment: 'Eje 3: Literatura y contexto histórico-cultural',
    durationWeeks: 7
  },
  { 
    id: 4, 
    unit: 'Unidad 4: Narrativa Contemporánea y Nuevas Voces', 
    topics: [
      'La autoficción y la memoria histórica', 
      'Nuevas voces periféricas y literatura de género', 
      'Hipertexto y literatura transmedia en la era digital'
    ],
    completedTopics: [],
    description: 'Problemáticas de la identidad contemporánea, disolución de géneros y nuevas formas de lectura digital.',
    napAlignment: 'Eje 4: Alfabetización mediática y multimodal',
    durationWeeks: 5
  }
];

export const ClassroomCurriculaTab: React.FC<ClassroomCurriculaTabProps> = ({
  role,
  subjectName = 'Materia',
  initialCurriculum,
  curriculum: customCurriculum,
  onToggleTopic
}) => {
  const [internalCurriculum, setInternalCurriculum] = useState<CurriculumUnit[]>(
    (customCurriculum as CurriculumUnit[]) || initialCurriculum || defaultCurriculum
  );
  const [expandedUnits, setExpandedUnits] = useState<Record<number, boolean>>({
    1: true,
    2: true,
    3: true,
    4: true
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'pending' | 'completed'>('all');

  const curriculum = (customCurriculum as CurriculumUnit[]) || internalCurriculum;

  const totalTopics = curriculum.reduce((acc, u) => acc + (u.topics?.length || 0), 0);
  const totalCompletedTopics = curriculum.reduce((acc, u) => acc + (u.completedTopics?.length || 0), 0);
  const overallPercentage = totalTopics > 0 ? Math.round((totalCompletedTopics / totalTopics) * 100) : 0;

  const toggleExpand = (unitId: number) => {
    setExpandedUnits(prev => ({
      ...prev,
      [unitId]: !prev[unitId]
    }));
  };

  const handleToggleTopic = (unitId: number, topic: string) => {
    if (onToggleTopic) {
      onToggleTopic(unitId, topic);
      return;
    }
    if (role !== 'docente') return;

    setInternalCurriculum(prev => prev.map(unit => {
      if (unit.id !== unitId) return unit;
      const isAlreadyCompleted = unit.completedTopics.includes(topic);
      const newCompleted = isAlreadyCompleted
        ? unit.completedTopics.filter(t => t !== topic)
        : [...unit.completedTopics, topic];

      if (!isAlreadyCompleted) {
        toast.show(`✅ Tema "${topic}" marcado como completado`, 'success');
      }

      return {
        ...unit,
        completedTopics: newCompleted
      };
    }));
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 py-2">
      {/* Top Banner - Visual Progress Dashboard */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-fox-primary/8 via-fox-primary/4 to-transparent rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-gradient-to-br from-fox-primary to-fox-primary/80 text-white rounded-2xl shadow-md shadow-fox-primary/20 shrink-0">
              <Compass size={28} />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-heading font-extrabold text-fox-text-main text-xl sm:text-2xl tracking-tight">
                  Progresión Curricular y Contenidos
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-fox-primary/10 text-fox-primary border border-fox-primary/20">
                  Plan Anual 2026
                </span>
              </div>
              <p className="text-xs sm:text-sm text-fox-text-muted mt-1 max-w-2xl leading-relaxed">
                {role === 'docente'
                  ? `Planificación docente estructurada por ejes temáticos para ${subjectName}. Marca los contenidos completados para actualizar el avance pedagógico en tiempo real.`
                  : `Guía de aprendizaje para ${subjectName}. Revisa los temas trabajados en clase y el estado de avance de la materia.`}
              </p>
            </div>
          </div>

          {/* Metric Widget */}
          <div className="flex items-center gap-4 bg-fox-bg/80 backdrop-blur-sm border border-fox-border/80 rounded-2xl p-3.5 self-start lg:self-auto shrink-0">
            <div className="relative w-14 h-14 flex items-center justify-center">
              <svg className="w-14 h-14 -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-fox-border"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-fox-primary transition-all duration-700 ease-out"
                  strokeDasharray={`${overallPercentage}, 100`}
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute font-heading font-extrabold text-fox-text-main text-xs">
                {overallPercentage}%
              </span>
            </div>
            <div>
              <div className="text-xs font-bold text-fox-text-main">
                {totalCompletedTopics} de {totalTopics} temas
              </div>
              <div className="text-[11px] font-medium text-fox-text-muted">
                {overallPercentage === 100 ? 'Plan Anual Completado' : 'Contenidos trabajados'}
              </div>
              <div className="w-28 bg-fox-border/60 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className="bg-fox-primary h-full rounded-full transition-all duration-500"
                  style={{ width: `${overallPercentage}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-fox-surface border border-fox-border rounded-2xl p-3 shadow-2xs">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar unidad o tema..."
            className="w-full bg-fox-bg border border-fox-border/80 rounded-xl pl-9 pr-3.5 py-1.5 text-xs font-medium text-fox-text-main placeholder:text-fox-text-muted focus:outline-none focus:border-fox-primary focus:ring-1 focus:ring-fox-primary/20 transition-all"
          />
        </div>

        <div className="flex items-center gap-1.5 self-stretch sm:self-auto justify-end">
          <span className="text-[11px] font-bold text-fox-text-muted mr-1 hidden sm:inline">
            Mostrar:
          </span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'all'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            En Curso
          </button>
          <button
            onClick={() => setFilterMode('completed')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              filterMode === 'completed'
                ? 'bg-fox-primary text-white shadow-2xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Completadas
          </button>
        </div>
      </div>

      {/* Units Timeline Cards */}
      <div className="space-y-4">
        {curriculum
          .filter(unit => {
            const allCompleted = unit.completedTopics.length === unit.topics.length && unit.topics.length > 0;
            if (filterMode === 'completed') return allCompleted;
            if (filterMode === 'pending') return !allCompleted;
            return true;
          })
          .filter(unit => {
            if (!searchTerm) return true;
            const term = searchTerm.toLowerCase();
            return (
              unit.unit.toLowerCase().includes(term) ||
              unit.description?.toLowerCase().includes(term) ||
              unit.topics.some(t => t.toLowerCase().includes(term))
            );
          })
          .map((unit, idx) => {
            const allCompleted = unit.completedTopics.length === unit.topics.length && unit.topics.length > 0;
            const someCompleted = unit.completedTopics.length > 0 && !allCompleted;
            const status = allCompleted ? 'completed' : someCompleted ? 'current' : 'pending';
            const unitPercentage = unit.topics.length > 0
              ? Math.round((unit.completedTopics.length / unit.topics.length) * 100)
              : 0;
            const isExpanded = expandedUnits[unit.id] ?? true;

            return (
              <motion.div
                key={unit.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`bg-fox-surface border rounded-3xl overflow-hidden transition-all shadow-xs ${
                  status === 'current'
                    ? 'border-fox-primary/40 ring-2 ring-fox-primary/15 bg-gradient-to-b from-fox-primary/5 via-fox-surface to-fox-surface'
                    : status === 'completed'
                    ? 'border-emerald-200/80'
                    : 'border-fox-border'
                }`}
              >
                {/* Unit Header */}
                <div 
                  onClick={() => toggleExpand(unit.id)}
                  className="p-5 sm:p-6 flex items-start sm:items-center justify-between gap-4 cursor-pointer hover:bg-fox-bg/40 transition-colors select-none"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs ${
                      status === 'completed'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : status === 'current'
                        ? 'bg-fox-primary text-white shadow-sm shadow-fox-primary/20'
                        : 'bg-fox-bg text-fox-text-muted border border-fox-border'
                    }`}>
                      {status === 'completed' ? (
                        <Check size={20} className="stroke-[3]" />
                      ) : (
                        <span>{idx + 1}</span>
                      )}
                    </div>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h4 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg">
                          {unit.unit}
                        </h4>
                        {status === 'completed' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            Unidad Finalizada
                          </span>
                        )}
                        {status === 'current' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fox-primary/15 text-fox-primary border border-fox-primary/30 animate-pulse">
                            En Curso Actualmente
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-fox-bg text-fox-text-muted border border-fox-border">
                            Próxima Unidad
                          </span>
                        )}
                      </div>

                      {unit.description && (
                        <p className="text-xs text-fox-text-muted leading-relaxed max-w-2xl">
                          {unit.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-[11px] font-medium text-fox-text-muted">
                        {unit.napAlignment && (
                          <span className="flex items-center gap-1 text-fox-primary font-semibold">
                            <Target size={13} />
                            {unit.napAlignment}
                          </span>
                        )}
                        {unit.durationWeeks && (
                          <span className="flex items-center gap-1">
                            <Calendar size={13} />
                            Duración: {unit.durationWeeks} semanas
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="hidden md:flex flex-col items-end gap-1 text-right">
                      <span className="text-xs font-bold text-fox-text-main">
                        {unit.completedTopics.length}/{unit.topics.length} temas
                      </span>
                      <div className="w-24 bg-fox-border/60 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            status === 'completed' ? 'bg-emerald-500' : 'bg-fox-primary'
                          }`}
                          style={{ width: `${unitPercentage}%` }}
                        />
                      </div>
                    </div>

                    <div className={`p-2 rounded-xl text-fox-text-muted hover:text-fox-text-main transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                      <ChevronDown size={18} />
                    </div>
                  </div>
                </div>

                {/* Topics Container */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-fox-border/60 bg-fox-bg/30 p-5 sm:p-6"
                    >
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-fox-text-muted flex items-center gap-1.5">
                          <Layers size={14} /> Ejes Temáticos y Saberes Prioritarios
                        </span>
                        {role === 'docente' && (
                          <span className="text-[11px] font-semibold text-fox-text-muted/80">
                            Haz clic en la casilla para registrar el avance
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {unit.topics.map((topic, i) => {
                          const isCompleted = unit.completedTopics.includes(topic);

                          return (
                            <div
                              key={i}
                              className={`p-4 rounded-2xl border transition-all flex flex-col justify-between gap-3 ${
                                isCompleted
                                  ? 'bg-emerald-50/50 border-emerald-200/80 shadow-2xs'
                                  : 'bg-fox-surface border-fox-border hover:border-fox-primary/40 hover:shadow-2xs'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3">
                                  {role === 'docente' ? (
                                    <button
                                      onClick={() => handleToggleTopic(unit.id, topic)}
                                      className="mt-0.5 shrink-0 cursor-pointer group"
                                      title={isCompleted ? 'Marcar como pendiente' : 'Marcar como completado'}
                                    >
                                      {isCompleted ? (
                                        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs group-hover:bg-emerald-700 transition-colors">
                                          <Check size={14} className="stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 rounded-lg border-2 border-fox-border group-hover:border-fox-primary bg-fox-surface transition-colors" />
                                      )}
                                    </button>
                                  ) : (
                                    <div className="mt-0.5 shrink-0">
                                      {isCompleted ? (
                                        <div className="w-5 h-5 rounded-lg bg-emerald-600 text-white flex items-center justify-center shadow-2xs">
                                          <Check size={14} className="stroke-[3]" />
                                        </div>
                                      ) : (
                                        <div className="w-5 h-5 rounded-lg border-2 border-fox-border/80 bg-fox-surface flex items-center justify-center text-fox-text-muted">
                                          <Clock size={11} />
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  <div>
                                    <p className={`text-xs sm:text-sm font-bold leading-snug ${
                                      isCompleted ? 'line-through text-emerald-800/75' : 'text-fox-text-main'
                                    }`}>
                                      {topic}
                                    </p>
                                    <span className="text-[10px] font-semibold text-fox-text-muted mt-0.5 inline-block">
                                      Tema {i + 1} de la unidad
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
      </div>
    </div>
  );
};
