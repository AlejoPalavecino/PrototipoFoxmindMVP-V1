import React from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Award, 
  BrainCircuit, 
  Clock, 
  ChevronRight, 
  ShieldAlert,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface StudentRiskItem {
  id: string | number;
  name: string;
  lastSeen: string;
  risk: 'ALTO' | 'MEDIO' | 'BAJO' | string;
  dua?: string[];
  avgGrade?: number;
}

interface ClassroomRendimientoTabProps {
  role: 'docente' | 'alumno';
  subjectName?: string;
  students?: StudentRiskItem[];
  onSelectStudentProfile?: (student: any) => void;
}

export const ClassroomRendimientoTab: React.FC<ClassroomRendimientoTabProps> = ({
  role,
  subjectName = 'Materia',
  students = [],
  onSelectStudentProfile
}) => {
  const teacherMetrics = [
    { label: 'Promedio General', value: '7.8', trend: '+0.5 pts vs mes anterior', isPositive: true, highlight: 'text-fox-primary' },
    { label: 'Asistencia Regular', value: '92%', trend: 'Estable en el trimestre', isPositive: true, highlight: 'text-fox-text-main' },
    { label: 'Entregas a Tiempo', value: '85%', trend: '↓ 2% respecto al anterior', isPositive: false, highlight: 'text-amber-600' },
    { label: 'Alumnos con DUA', value: '4', trend: 'Adaptaciones activas', isPositive: true, highlight: 'text-purple-700' }
  ];

  const studentMetrics = [
    { label: 'Mi Promedio', value: '8.5', trend: '↑ +0.5 pts en el trimestre', isPositive: true, highlight: 'text-fox-primary' },
    { label: 'Mi Asistencia', value: '95%', trend: 'Excelente asistencia', isPositive: true, highlight: 'text-fox-text-main' },
    { label: 'Entregas a Tiempo', value: '100%', trend: '¡Todas al día!', isPositive: true, highlight: 'text-emerald-700' },
    { label: 'Posición de Avance', value: 'Top 15%', trend: 'Racha de 5 tareas', isPositive: true, highlight: 'text-purple-700' }
  ];

  const metrics = role === 'docente' ? teacherMetrics : studentMetrics;

  const teacherGradeDist = [
    { grade: '4-5', pct: 8, count: 2 },
    { grade: '6', pct: 15, count: 4 },
    { grade: '7', pct: 35, count: 10 },
    { grade: '8', pct: 25, count: 7 },
    { grade: '9', pct: 12, count: 3 },
    { grade: '10', pct: 5, count: 2 }
  ];

  const studentLastGrades = [
    { label: 'Ensayo Vanguardias', grade: 9.0, height: 90 },
    { label: 'Foro Boom Lit.', grade: 8.5, height: 85 },
    { label: 'Cuestionario Modernismo', grade: 9.0, height: 90 },
    { label: 'TP Historia del Arte', grade: 8.0, height: 80 },
    { label: 'Autoevaluación Lírica', grade: 9.5, height: 95 }
  ];

  const riskStudents: StudentRiskItem[] = students.filter(s => s.risk === 'ALTO' || s.risk === 'MEDIO');

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      
      {/* Top 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => (
          <div key={idx} className="bg-fox-surface border border-fox-border rounded-2xl p-5 shadow-xs flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1">
                {m.label}
              </p>
              <p className={`text-3xl sm:text-4xl font-heading font-extrabold ${m.highlight}`}>
                {m.value}
              </p>
            </div>
            <div className="mt-3 pt-2.5 border-t border-fox-border/60 flex items-center gap-1.5 text-xs font-semibold">
              {m.isPositive ? (
                <ArrowUpRight size={14} className="text-emerald-600 shrink-0" />
              ) : (
                <ArrowDownRight size={14} className="text-amber-600 shrink-0" />
              )}
              <span className={m.isPositive ? 'text-emerald-700' : 'text-amber-700'}>
                {m.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Visual Analytics Grid: Histogram & Line Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Grade Distribution or Recent Student Grades */}
        <div className="bg-fox-surface border border-fox-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading font-bold text-fox-text-main text-base sm:text-lg">
                {role === 'docente' ? 'Distribución de Calificaciones del Aula' : 'Mis Últimas Calificaciones'}
              </h4>
              <span className="text-xs font-bold text-fox-primary bg-fox-primary/10 px-2.5 py-1 rounded-lg">
                {role === 'docente' ? '28 Alumnos' : 'Promedio 8.8'}
              </span>
            </div>
            <p className="text-xs text-fox-text-muted mb-6">
              {role === 'docente'
                ? 'Porcentaje de estudiantes agrupados por rango de notas en las últimas 3 actividades.'
                : 'Puntajes obtenidos en evaluaciones, ensayos y trabajos prácticos.'}
            </p>
          </div>

          <div className="flex items-end justify-between gap-3 pt-6 min-h-[220px] px-2">
            {role === 'docente'
              ? teacherGradeDist.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[36px] bg-fox-bg rounded-t-xl relative flex items-end h-[160px]">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.pct * 2.5}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className="w-full bg-fox-primary rounded-t-xl hover:bg-fox-primary/80 transition-all cursor-pointer shadow-2xs"
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-bold py-1 px-2 rounded-lg pointer-events-none transition-opacity z-20 whitespace-nowrap shadow-md">
                        {item.count} alumnos ({item.pct}%)
                      </div>
                    </div>
                    <span className="text-xs font-bold text-fox-text-muted group-hover:text-fox-text-main">
                      {item.grade}
                    </span>
                  </div>
                ))
              : studentLastGrades.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                    <div className="w-full max-w-[36px] bg-fox-bg rounded-t-xl relative flex items-end h-[160px]">
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${item.height}%` }}
                        transition={{ duration: 0.8, delay: i * 0.08 }}
                        className="w-full bg-gradient-to-t from-fox-primary to-indigo-500 rounded-t-xl hover:brightness-110 transition-all cursor-pointer shadow-2xs"
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[11px] font-bold py-1 px-2 rounded-lg pointer-events-none transition-opacity z-20 whitespace-nowrap shadow-md">
                        Nota: {item.grade}/10
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-fox-text-muted truncate max-w-[65px] text-center" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                ))}
          </div>
        </div>

        {/* Card 2: Evolution Line Chart */}
        <div className="bg-fox-surface border border-fox-border rounded-2xl p-5 sm:p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-heading font-bold text-fox-text-main text-base sm:text-lg">
                {role === 'docente' ? 'Evolución del Rendimiento del Aula' : 'Evolución de mi Desempeño'}
              </h4>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                <TrendingUp size={13} /> Tendencia Positiva
              </span>
            </div>
            <p className="text-xs text-fox-text-muted mb-6">
              Trayectoria histórica mensual del promedio de calificaciones.
            </p>
          </div>

          <div className="relative pt-6 min-h-[220px] flex flex-col justify-end">
            <div className="relative w-full h-[150px] mb-8">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                <motion.path
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  d={role === 'docente' 
                    ? "M 0,75 L 20,68 L 40,70 L 60,45 L 80,32 L 100,22" 
                    : "M 0,60 L 20,50 L 40,55 L 60,30 L 80,20 L 100,15"
                  }
                  fill="none"
                  stroke="#1F3F6D"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>

              {(role === 'docente'
                ? [
                    { x: 0, y: 75, val: '6.5' },
                    { x: 20, y: 68, val: '6.8' },
                    { x: 40, y: 70, val: '6.7' },
                    { x: 60, y: 45, val: '7.2' },
                    { x: 80, y: 32, val: '7.6' },
                    { x: 100, y: 22, val: '7.8' }
                  ]
                : [
                    { x: 0, y: 60, val: '7.5' },
                    { x: 20, y: 50, val: '7.8' },
                    { x: 40, y: 55, val: '7.7' },
                    { x: 60, y: 30, val: '8.2' },
                    { x: 80, y: 20, val: '8.4' },
                    { x: 100, y: 15, val: '8.5' }
                  ]
              ).map((pt, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.8 + i * 0.08 }}
                  className="absolute w-3.5 h-3.5 bg-fox-surface border-2 border-fox-primary rounded-full -translate-x-1/2 -translate-y-1/2 shadow-xs z-10 hover:scale-150 transition-transform cursor-pointer group"
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                >
                  <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-[10px] font-bold text-white bg-fox-primary px-1.5 py-0.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity shadow-xs whitespace-nowrap">
                    {pt.val} pts
                  </span>
                </motion.div>
              ))}
            </div>

            <div className="flex justify-between text-xs font-bold text-fox-text-muted/80 border-t border-fox-border/60 pt-2 px-1">
              <span>Marzo</span>
              <span>Abril</span>
              <span>Mayo</span>
              <span>Junio</span>
              <span>Julio</span>
              <span>Agosto</span>
            </div>
          </div>
        </div>
      </div>

      {/* Role-specific Highlights Card */}
      {role === 'docente' ? (
        <div className="bg-rose-50/60 border border-rose-200/80 rounded-2xl p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-rose-100 text-rose-800 rounded-xl">
                <ShieldAlert size={22} />
              </div>
              <div>
                <h4 className="font-heading font-bold text-rose-900 text-base">
                  Alumnos en Seguimiento Prioritario y Alertas DUA
                </h4>
                <p className="text-xs text-rose-800/80">
                  Estudiantes con ausencias reiteradas o tareas pendientes que requieren intervención formativa.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {(riskStudents.length > 0 ? riskStudents : [
              { id: 1, name: 'Marcos Pérez', lastSeen: 'Hace 8 días', risk: 'ALTO', avgGrade: 5.5, dua: ['Sin entregas'] },
              { id: 2, name: 'Sofía Herrera', lastSeen: 'Hoy 09:15', risk: 'MEDIO', avgGrade: 6.8, dua: ['Dislexia'] }
            ]).map((st) => (
              <div
                key={st.id}
                className="bg-fox-surface border border-rose-200 rounded-xl p-4 flex items-center justify-between shadow-2xs hover:border-rose-300 transition-all"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-800 flex items-center justify-center font-bold text-xs">
                    {st.name.split(' ').map(n => n[0]).join('')}
                  </div>
                  <div>
                    <p className="font-bold text-sm text-fox-text-main">{st.name}</p>
                    <p className="text-[11px] text-fox-text-muted">Última actividad: {st.lastSeen}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
                    st.risk === 'ALTO' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    Riesgo {st.risk}
                  </span>
                  {onSelectStudentProfile && (
                    <button
                      onClick={() => onSelectStudentProfile(st)}
                      className="px-2.5 py-1 rounded-lg border border-fox-border hover:border-fox-primary text-xs font-bold text-fox-primary hover:bg-fox-bg transition-colors"
                    >
                      Ver Ficha
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-br from-purple-600/10 via-purple-500/5 to-transparent border border-purple-200 rounded-2xl p-5 sm:p-6 shadow-xs space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-fox-surface text-purple-600 rounded-2xl shadow-2xs shrink-0">
              <BrainCircuit size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-heading font-bold text-fox-text-main text-base">
                  Recomendación Pedagógica
                </h4>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-100 text-purple-700">
                  Estrategia de Aprendizaje
                </span>
              </div>
              <p className="text-xs sm:text-sm text-fox-text-main/80 leading-relaxed">
                ¡Tu rendimiento en {subjectName} se encuentra en el 15% superior de la clase! Continúa con este ritmo preparando las lecturas de la próxima unidad de <strong>El Boom Latinoamericano</strong>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
