import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  TrendingUp, TrendingDown, Minus, Trophy, CheckCircle2, 
  AlertCircle, BookOpen, BrainCircuit, Sparkles, Target, 
  Award, ArrowRight, Clock, Play, ShieldCheck, Zap, 
  BarChart2, Activity, ChevronRight, ArrowUpRight, ArrowDownRight,
  Calendar, Users, MessageSquare, ShieldAlert
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area 
} from 'recharts';
import { 
  ClassroomPerformance, 
  PedagogicalAlert, 
  ScheduledIntervention, 
  TimeframeStats,
  Timeframe
} from './progresoDocenteTypes';

interface ProgresoDocenteOverviewTabProps {
  stats: TimeframeStats;
  aulas: ClassroomPerformance[];
  alerts: PedagogicalAlert[];
  scheduledInterventions: ScheduledIntervention[];
  foxySummary: string;
  currentPoints: number;
  timeframe: Timeframe;
  onOpenQuickIntervention: (subject?: string, course?: string) => void;
  onSelectAula: (aula: ClassroomPerformance) => void;
  onOpenAlertIntervention: (alert: PedagogicalAlert) => void;
  onViewAllAulas: () => void;
  onViewHabits: () => void;
}

// Sparkline helper
const Sparkline = ({ data, color, fillGradientId }: { data: number[], color: string, fillGradientId: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((d, i) => `${(i / (data.length - 1)) * 100},${100 - ((d - min) / range) * 100}`);
  const pathData = `M ${points.join(' L ')}`;
  const areaData = `${pathData} L 100,100 L 0,100 Z`;

  return (
    <svg viewBox="0 0 100 100" className="absolute bottom-0 left-0 w-full h-24 opacity-20 pointer-events-none" preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillGradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="1" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        d={areaData}
        fill={`url(#${fillGradientId})`}
      />
      <motion.path
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: "easeInOut" }}
        d={pathData}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

export function ProgresoDocenteOverviewTab({
  stats,
  aulas,
  alerts,
  scheduledInterventions,
  foxySummary,
  currentPoints,
  timeframe,
  onOpenQuickIntervention,
  onSelectAula,
  onOpenAlertIntervention,
  onViewAllAulas,
  onViewHabits
}: ProgresoDocenteOverviewTabProps) {
  const [chartMetric, setChartMetric] = useState<'promedio' | 'entrega' | 'consultas'>('promedio');

  // Teacher level calculation
  const currentLevel = Math.floor(currentPoints / 250) + 4; // e.g. Level 17
  const pointsInCurrentLevel = currentPoints % 250;
  const pointsNeededForNext = 250;
  const pointsPercentage = Math.round((pointsInCurrentLevel / pointsNeededForNext) * 100);

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <div className="space-y-8">
      {/* Teacher Mastery & Impact Progression Roadmap Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          {/* Level Info */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fox-gold via-yellow-400 to-amber-500 text-fox-text-main flex flex-col items-center justify-center font-heading font-black shadow-md border-2 border-white/60 shrink-0">
              <span className="text-[10px] uppercase font-bold tracking-tighter opacity-80">Nivel</span>
              <span className="text-2xl leading-none font-extrabold">{currentLevel}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-heading font-bold text-fox-text-main">
                  Docente Mentor · Rango Oro
                </h3>
                <span className="bg-fox-gold/20 text-fox-gold border border-fox-gold/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <Award size={13} /> {currentPoints.toLocaleString()} Puntos de Impacto
                </span>
              </div>
              <p className="text-xs text-fox-text-muted mt-1 flex items-center gap-2">
                <span>Faltan <strong>{pointsNeededForNext - pointsInCurrentLevel} Pts</strong> para Nivel {currentLevel + 1}</span>
                <span>•</span>
                <span className="text-fox-primary font-bold">Desbloquea: Asistente de Rúbricas Inteligentes DUA</span>
              </p>
            </div>
          </div>

          {/* Points Progress Bar */}
          <div className="flex-1 max-w-xl">
            <div className="flex justify-between items-center text-xs font-bold text-fox-text-muted mb-1.5">
              <span>Progreso Pedagógico Trimestral</span>
              <span className="text-fox-text-main font-mono">
                {pointsInCurrentLevel} / {pointsNeededForNext} Pts ({pointsPercentage}%)
              </span>
            </div>
            <div className="w-full bg-fox-border/50 h-3 rounded-full overflow-hidden shadow-inner p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pointsPercentage}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full rounded-full bg-gradient-to-r from-fox-gold via-fox-orange to-fox-primary relative"
              >
                <div 
                  className="absolute inset-0 bg-white/20 w-full h-full"
                  style={{ 
                    backgroundImage: 'linear-gradient(45deg,rgba(255,255,255,.2) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.2) 50%,rgba(255,255,255,.2) 75%,transparent 75%,transparent)', 
                    backgroundSize: '0.75rem 0.75rem' 
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Foxy AI Pedagogical Diagnostic Coach */}
      <motion.div
        key={`coach-${timeframe}`}
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.05 }}
        className="bg-gradient-to-r from-fox-purple/10 via-fox-purple/5 to-transparent border border-fox-purple/20 rounded-3xl p-6 flex flex-col md:flex-row gap-5 items-start relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-fox-purple/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fox-purple to-[#5a3a73] text-white flex items-center justify-center shrink-0 shadow-md relative z-10">
          <BrainCircuit size={28} />
          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-fox-green rounded-full border-2 border-fox-surface" />
        </div>
        <div className="relative z-10 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
            <h3 className="font-bold text-fox-text-main flex items-center gap-2 text-lg">
              Diagnóstico Pedagógico de Foxy <Sparkles size={18} className="text-fox-purple" />
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-fox-purple/10 text-fox-purple border border-fox-purple/20">
              Actualizado con analítica DUA y entregas
            </span>
          </div>
          <p className="text-fox-text-main/80 text-sm leading-relaxed max-w-4xl">
            {foxySummary}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={() => onOpenQuickIntervention('Física', '5° B')}
              className="bg-fox-purple text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center gap-2 cursor-pointer"
            >
              <Zap size={16} /> Intervenir en Física 5° B (+Plan DUA)
            </button>
            <button
              onClick={onViewAllAulas}
              className="bg-fox-surface border border-fox-border text-fox-text-main px-4 py-2 rounded-xl text-sm font-bold hover:bg-fox-bg transition-colors cursor-pointer"
            >
              Ver Rendimiento de Todas las Aulas
            </button>
          </div>
        </div>
      </motion.div>

      {/* 4 TOP KPI METRIC CARDS WITH SPARKLINES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1: Promedio Global */}
        <div className="bg-fox-surface rounded-3xl border border-fox-border shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between min-h-[165px] cursor-default">
          <Sparkline data={stats.promedioHistory} color="#1F3F6D" fillGradientId="spark-blue" />
          <div className="p-5 relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-fox-primary/10 text-fox-primary rounded-xl group-hover:bg-fox-primary group-hover:text-white transition-colors">
                  <TrendingUp size={18} />
                </div>
                <span className="text-xs font-bold text-fox-text-muted">Promedio Global</span>
              </div>
              <span className="flex items-center text-[11px] font-bold text-fox-green bg-fox-green/10 px-2 py-0.5 rounded-lg border border-fox-green/20">
                <ArrowUpRight size={13} className="mr-0.5" /> {stats.tendenciaPromedio}
              </span>
            </div>
            <div className="flex items-end gap-1.5 mt-auto">
              <span className="text-4xl font-heading font-extrabold text-fox-text-main tracking-tight">
                {stats.promedio}
              </span>
              <span className="text-xs font-medium text-fox-text-muted mb-1">/ 10</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Tasa de Entrega & Asistencia */}
        <div className="bg-fox-surface rounded-3xl border border-fox-border shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between min-h-[165px] cursor-default">
          <Sparkline data={stats.entregaHistory} color="#3BB54A" fillGradientId="spark-green" />
          <div className="p-5 relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-fox-green/10 text-fox-green rounded-xl group-hover:bg-fox-green group-hover:text-white transition-colors">
                  <CheckCircle2 size={18} />
                </div>
                <span className="text-xs font-bold text-fox-text-muted">Tasa de Entrega</span>
              </div>
              <span className="flex items-center text-[11px] font-bold text-fox-green bg-fox-green/10 px-2 py-0.5 rounded-lg border border-fox-green/20">
                <ArrowUpRight size={13} className="mr-0.5" /> {stats.tendenciaEntrega}
              </span>
            </div>
            <div className="flex items-end gap-1.5 mt-auto">
              <span className="text-4xl font-heading font-extrabold text-fox-text-main tracking-tight">
                {stats.tasaEntrega}
              </span>
              <span className="text-xs font-medium text-fox-text-muted mb-1">al día</span>
            </div>
          </div>
        </div>

        {/* KPI 3: Alumnos en Riesgo / Atención Prioritaria */}
        <div className="bg-fox-surface rounded-3xl border border-red-100 shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between min-h-[165px] cursor-default">
          <div className="p-5 relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-red-100 text-red-600 rounded-xl group-hover:bg-red-600 group-hover:text-white transition-colors">
                  <AlertCircle size={18} />
                </div>
                <span className="text-xs font-bold text-fox-text-muted">Atención Requerida</span>
              </div>
              <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-md border border-red-200">
                Prioridad Alta
              </span>
            </div>
            <div className="mt-auto">
              <div className="flex items-end gap-1.5">
                <span className="text-4xl font-heading font-extrabold text-red-600 tracking-tight">
                  {stats.alumnosRiesgo}
                </span>
                <span className="text-xs font-medium text-fox-text-muted mb-1">de {stats.totalAlumnos} alumnos</span>
              </div>
              <div className="mt-2.5 w-full bg-fox-border/50 rounded-full h-1.5 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(stats.alumnosRiesgo / stats.totalAlumnos) * 100}%` }}
                  transition={{ duration: 1 }}
                  className="bg-red-500 h-full rounded-full"
                />
              </div>
            </div>
          </div>
        </div>

        {/* KPI 4: Adaptaciones DUA & Consultas Foxy */}
        <div className="bg-fox-surface rounded-3xl border border-fox-border shadow-sm hover:shadow-md transition-all relative overflow-hidden group flex flex-col justify-between min-h-[165px] cursor-default">
          <div className="p-5 relative z-10 flex flex-col h-full justify-between">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-fox-purple/10 text-fox-purple rounded-xl group-hover:bg-fox-purple group-hover:text-white transition-colors">
                  <Sparkles size={18} />
                </div>
                <span className="text-xs font-bold text-fox-text-muted">Adaptaciones DUA</span>
              </div>
              <span className="text-[10px] font-bold text-fox-purple bg-fox-purple/10 px-2 py-0.5 rounded-md border border-fox-purple/20">
                100% Cobertura
              </span>
            </div>
            <div className="flex items-end gap-1.5 mt-auto">
              <span className="text-4xl font-heading font-extrabold text-fox-purple tracking-tight">
                {stats.adaptacionesDua}
              </span>
              <span className="text-xs font-medium text-fox-text-muted mb-1">activas ({stats.consultasFoxy} consultas IA)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Próximas Intervenciones y Tutorías (Spaced Reviews & Scheduled Interventions) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
              <Clock size={18} className="text-fox-orange" /> Plan de Intervenciones y Tutorías Programadas
            </h4>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Acciones pedagógicas recomendadas para consolidar la retención y evitar el desgranamiento
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-fox-bg border border-fox-border text-fox-text-muted self-start sm:self-auto">
            {scheduledInterventions.length} intervenciones en agenda
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scheduledInterventions.map(item => (
            <div
              key={item.id}
              className="bg-fox-bg/50 border border-fox-border hover:border-fox-primary/50 rounded-2xl p-4 flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase ${
                    item.urgency === 'alta'
                      ? 'bg-red-500/10 text-red-600 border border-red-500/20'
                      : item.urgency === 'media'
                      ? 'bg-fox-orange/10 text-fox-orange border border-fox-orange/20'
                      : 'bg-fox-green/10 text-fox-green border border-fox-green/20'
                  }`}>
                    Prioridad {item.urgency}
                  </span>
                  <span className="text-[11px] font-bold text-fox-text-muted flex items-center gap-1">
                    <Calendar size={11} /> {item.date} {item.time}
                  </span>
                </div>

                <h5 className="font-heading font-bold text-fox-text-main text-sm line-clamp-1">
                  {item.studentOrGroup}
                </h5>
                <p className="text-xs text-fox-text-muted mt-0.5">
                  {item.subject} • {item.course}
                </p>

                <div className="mt-3 text-[11px] font-medium text-fox-green flex items-center gap-1">
                  <CheckCircle2 size={12} /> Impacto estimado: {item.estimatedImpact}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-fox-border/60">
                <button
                  onClick={() => onOpenQuickIntervention(item.subject, item.course)}
                  className="w-full bg-fox-surface hover:bg-fox-primary hover:text-white border border-fox-border text-fox-text-main py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                >
                  <Play size={12} /> Iniciar Intervención
                </button>
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Interactive Charts & Classroom Progress Grid (12 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Evolution Chart (7 cols) */}
        <div className="lg:col-span-7 bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                  <BarChart2 size={18} className="text-fox-primary" /> Evolución del Rendimiento y Retención
                </h4>
                <p className="text-xs text-fox-text-muted mt-0.5">
                  Progresión temporal de tus aulas ({timeframe})
                </p>
              </div>

              {/* Metric Switcher */}
              <div className="flex items-center p-1 bg-fox-bg border border-fox-border rounded-xl self-start sm:self-auto">
                <button
                  onClick={() => setChartMetric('promedio')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    chartMetric === 'promedio'
                      ? 'bg-fox-surface text-fox-primary shadow-xs'
                      : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  Promedio
                </button>
                <button
                  onClick={() => setChartMetric('entrega')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    chartMetric === 'entrega'
                      ? 'bg-fox-surface text-fox-green shadow-xs'
                      : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  Entregas %
                </button>
                <button
                  onClick={() => setChartMetric('consultas')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    chartMetric === 'consultas'
                      ? 'bg-fox-surface text-fox-purple shadow-xs'
                      : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  Foxy IA
                </button>
              </div>
            </div>

            {/* Recharts Area / Bar Chart */}
            <div className="w-full h-60 mt-2">
              <ResponsiveContainer width="100%" height="100%">
                {chartMetric === 'promedio' ? (
                  <AreaChart data={stats.evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorProm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#1F3F6D" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#1F3F6D" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis domain={[0, 10]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-lg">
                              <div>Período: {payload[0]?.payload?.period}</div>
                              <div className="text-fox-primary">Promedio: {payload[0]?.value} / 10</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area type="monotone" dataKey="promedio" stroke="#1F3F6D" strokeWidth={3} fillOpacity={1} fill="url(#colorProm)" />
                  </AreaChart>
                ) : chartMetric === 'entrega' ? (
                  <BarChart data={stats.evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-lg">
                              <div>Período: {payload[0]?.payload?.period}</div>
                              <div className="text-fox-green">Tasa de Entrega: {payload[0]?.value}%</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="entrega" fill="#3BB54A" radius={[8, 8, 0, 0]} />
                  </BarChart>
                ) : (
                  <BarChart data={stats.evolutionData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <XAxis 
                      dataKey="period" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                    />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                    <RechartsTooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-gray-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-lg">
                              <div>Período: {payload[0]?.payload?.period}</div>
                              <div className="text-fox-purple">Consultas IA: {payload[0]?.value}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar dataKey="consultas" fill="#7D519C" radius={[8, 8, 0, 0]} />
                  </BarChart>
                )}
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/50 flex items-center justify-between text-xs text-fox-text-muted">
            <span>Métricas sincronizadas automáticamente con FoxMind Classroom</span>
            <button 
              onClick={onViewHabits}
              className="text-fox-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
            >
              Ver hábitos y retención <ChevronRight size={14} />
            </button>
          </div>
        </div>

        {/* Rendimiento por Aula Overview (5 cols) */}
        <div className="lg:col-span-5 bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                <BookOpen size={18} className="text-fox-primary" /> Rendimiento por Aula
              </h4>
              <button
                onClick={onViewAllAulas}
                className="text-xs text-fox-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
              >
                Ver todas ({aulas.length}) <ChevronRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {aulas.map(aula => (
                <div
                  key={aula.id}
                  onClick={() => onSelectAula(aula)}
                  className="p-3.5 rounded-2xl bg-fox-bg/50 border border-fox-border hover:border-fox-primary/50 hover:bg-fox-bg transition-all cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-3 h-3 rounded-full ${aula.color}`} />
                      <span className="font-heading font-bold text-fox-text-main text-xs group-hover:text-fox-primary transition-colors">
                        {aula.subject}
                      </span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-fox-surface border border-fox-border text-fox-text-muted">
                        {aula.course}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs font-bold">
                      <span className="text-fox-text-main font-mono">{aula.avgGrade}</span>
                      <span className="text-fox-text-muted font-normal">/ 10</span>
                      {aula.trend === 'up' && <TrendingUp size={14} className="text-fox-green" />}
                      {aula.trend === 'down' && <TrendingDown size={14} className="text-fox-red" />}
                      {aula.trend === 'flat' && <Minus size={14} className="text-fox-text-muted" />}
                    </div>
                  </div>

                  <div className="w-full bg-fox-border/50 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${aula.color}`}
                      style={{ width: `${aula.progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px] text-fox-text-muted mt-1.5 font-medium">
                    <span>{aula.progress}% plan completado</span>
                    <span>{aula.studentsCount} alumnos</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/50 text-center">
            <span className="text-xs text-fox-text-muted">
              Haz clic en cualquier aula para ver el <strong>diagnóstico de competencias</strong>.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
