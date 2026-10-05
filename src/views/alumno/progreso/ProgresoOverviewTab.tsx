import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Flame, Trophy, Folder, CheckCircle, TrendingUp, TrendingDown, Minus, 
  Calendar, BookOpen, BrainCircuit, Sparkles, Target, Award, ArrowRight, 
  Clock, Play, ShieldCheck, Zap, BarChart2, Activity, ChevronRight
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Cell, ReferenceLine, AreaChart, Area 
} from 'recharts';
import { SubjectMastery, ReviewScheduleItem } from './progresoTypes';
import { mockWeeklyStudyData } from './progresoData';

interface ProgresoOverviewTabProps {
  subjects: SubjectMastery[];
  reviews: ReviewScheduleItem[];
  currentXp: number;
  onOpenQuiz: (topic?: string) => void;
  onSelectSubject: (subject: SubjectMastery) => void;
  onStartReview: (review: ReviewScheduleItem) => void;
  onViewAllSubjects: () => void;
  onViewHabits: () => void;
}

export function ProgresoOverviewTab({
  subjects,
  reviews,
  currentXp,
  onOpenQuiz,
  onSelectSubject,
  onStartReview,
  onViewAllSubjects,
  onViewHabits,
}: ProgresoOverviewTabProps) {
  const [chartMetric, setChartMetric] = useState<'minutes' | 'accuracy' | 'xp'>('minutes');

  // Gamification level calculation
  const currentLevel = Math.floor(currentXp / 200) + 3; // level 15
  const xpInCurrentLevel = currentXp % 200;
  const xpNeededForNext = 200;
  const xpPercentage = Math.round((xpInCurrentLevel / xpNeededForNext) * 100);

  return (
    <div className="space-y-8">
      {/* Level & XP Progression Roadmap Banner */}
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
                  Explorador Sagaz · Rango Oro
                </h3>
                <span className="bg-fox-gold/20 text-fox-gold border border-fox-gold/30 px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1">
                  <Award size={13} /> {currentXp.toLocaleString()} XP
                </span>
              </div>
              <p className="text-xs text-fox-text-muted mt-1 flex items-center gap-2">
                <span>Faltan <strong>{xpNeededForNext - xpInCurrentLevel} XP</strong> para Nivel {currentLevel + 1}</span>
                <span>•</span>
                <span className="text-fox-primary font-bold">Desbloquea: Tema de Foxy Astral</span>
              </p>
            </div>
          </div>

          {/* XP Progress Bar */}
          <div className="flex-1 max-w-xl">
            <div className="flex justify-between items-center text-xs font-bold text-fox-text-muted mb-1.5">
              <span>Progreso de Nivel</span>
              <span className="text-fox-text-main font-mono">{xpInCurrentLevel} / {xpNeededForNext} XP ({xpPercentage}%)</span>
            </div>
            <div className="w-full bg-fox-border/50 h-3 rounded-full overflow-hidden shadow-inner p-0.5">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${xpPercentage}%` }}
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

      {/* Foxy AI Diagnostic Coach */}
      <motion.div 
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
              Diagnóstico de Foxy <Sparkles size={18} className="text-fox-purple" />
            </h3>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-fox-purple/10 text-fox-purple border border-fox-purple/20">
              Actualizado hoy con Active Recall
            </span>
          </div>
          <p className="text-fox-text-main/80 text-sm leading-relaxed max-w-4xl">
            ¡Gran constancia! Tu racha semanal se mantiene en <strong>7 días</strong>. En <strong>Literatura</strong> alcanzaste 85% de dominio, pero he detectado que en <strong>Matemáticas (Fracciones y Números Decimales)</strong> tu precisión cayó al 48%. Te he preparado un quiz rápido adaptativo de 3 preguntas para consolidar tu memoria a largo plazo.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button 
              onClick={() => onOpenQuiz('Matemáticas')}
              className="bg-fox-purple text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center gap-2"
            >
              <Zap size={16} /> Iniciar Quiz de Matemáticas (+50 XP)
            </button>
            <button
              onClick={() => {
                const mathSub = subjects.find(s => s.subject === 'Matemáticas');
                if (mathSub) onSelectSubject(mathSub);
              }}
              className="bg-fox-surface border border-fox-border text-fox-text-main px-4 py-2 rounded-xl text-sm font-bold hover:bg-fox-bg transition-colors"
            >
              Ver Análisis de Matemáticas
            </button>
          </div>
        </div>
      </motion.div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 md:gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-fox-surface p-5 rounded-3xl shadow-sm border border-fox-border flex flex-col justify-between hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 rounded-2xl bg-fox-orange/10 text-fox-orange">
              <Flame size={26} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fox-green/10 text-fox-green border border-fox-green/20 flex items-center gap-1">
              <ShieldCheck size={12} /> Racha protegida
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-heading font-bold text-fox-text-main">7 días</h4>
            <p className="text-sm text-fox-text-muted font-bold mt-0.5">Racha de estudio activa</p>
            <p className="text-xs text-fox-orange font-bold mt-2 flex items-center gap-1">
              🔥 ¡A 1 día de tu récord del mes!
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-fox-surface p-5 rounded-3xl shadow-sm border border-fox-border flex flex-col justify-between hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 rounded-2xl bg-fox-primary/10 text-fox-primary">
              <Target size={26} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fox-primary/10 text-fox-primary">
              +4% vs mes anterior
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-heading font-bold text-fox-text-main">82%</h4>
            <p className="text-sm text-fox-text-muted font-bold mt-0.5">Precisión en Active Recall</p>
            <p className="text-xs text-fox-green font-bold mt-2">
              ↑ 18/22 respuestas correctas
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-fox-surface p-5 rounded-3xl shadow-sm border border-fox-border flex flex-col justify-between hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 rounded-2xl bg-fox-purple/10 text-fox-purple">
              <Clock size={26} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fox-purple/10 text-fox-purple">
              Meta: 5h / sem
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-heading font-bold text-fox-text-main">6h 15m</h4>
            <p className="text-sm text-fox-text-muted font-bold mt-0.5">Tiempo invertido esta semana</p>
            <p className="text-xs text-fox-purple font-bold mt-2">
              ✓ Meta semanal superada
            </p>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-fox-surface p-5 rounded-3xl shadow-sm border border-fox-border flex flex-col justify-between hover:shadow-md transition-all group"
        >
          <div className="flex items-center justify-between">
            <div className="p-3.5 rounded-2xl bg-fox-green/10 text-fox-green">
              <CheckCircle size={26} />
            </div>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-fox-green/10 text-fox-green">
              47 en total
            </span>
          </div>
          <div className="mt-4">
            <h4 className="text-3xl font-heading font-bold text-fox-text-main">12</h4>
            <p className="text-sm text-fox-text-muted font-bold mt-0.5">Repasos y tareas del mes</p>
            <p className="text-xs text-fox-green font-bold mt-2">
              ↑ 100% entregas a tiempo
            </p>
          </div>
        </motion.div>
      </div>

      {/* Próximos Repasos (Spaced Repetition Schedule) */}
      <div className="space-y-4">
        <div className="flex justify-between items-end">
          <div>
            <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
              <Calendar size={22} className="text-fox-primary" /> Próximos Repasos Espaciados
            </h3>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Programados por el algoritmo de retención para evitar el olvido
            </p>
          </div>
          <button 
            onClick={onViewHabits}
            className="text-xs font-bold text-fox-primary hover:underline flex items-center gap-1"
          >
            Ver curva de retención <ArrowRight size={14} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reviews.map(item => (
            <motion.div
              key={item.id}
              whileHover={{ y: -3 }}
              className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden"
            >
              <div className={`absolute top-0 left-0 w-full h-1 ${item.color}`} />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    item.urgency === 'alta' 
                      ? 'bg-fox-orange/15 text-fox-orange border border-fox-orange/30' 
                      : 'bg-fox-bg text-fox-text-muted border border-fox-border'
                  }`}>
                    {item.date}
                  </span>
                  <span className="text-[11px] text-fox-text-muted flex items-center gap-1 font-medium">
                    <Clock size={12} /> {item.duration}
                  </span>
                </div>

                <h4 className="font-bold text-fox-text-main text-sm mb-1 leading-snug">
                  {item.title}
                </h4>

                <div className="flex items-center gap-1.5 text-xs text-fox-text-muted mb-3">
                  <BookOpen size={13} className={item.textColor} />
                  <span>{item.subject}</span>
                </div>

                <div className="mb-4">
                  <div className="flex justify-between text-[10px] font-bold text-fox-text-muted mb-1">
                    <span>Retención estimada</span>
                    <span className={item.retentionRate < 50 ? 'text-fox-orange' : 'text-fox-green'}>
                      {item.retentionRate}%
                    </span>
                  </div>
                  <div className="w-full bg-fox-border/40 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${item.retentionRate < 50 ? 'bg-fox-orange' : 'bg-fox-green'}`} 
                      style={{ width: `${item.retentionRate}%` }}
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => onStartReview(item)}
                className="w-full py-2 px-3 rounded-xl bg-fox-bg border border-fox-border text-fox-text-main text-xs font-bold hover:bg-fox-primary hover:text-white hover:border-fox-primary transition-all flex items-center justify-center gap-1.5 group/btn"
              >
                <Play size={13} className="text-fox-primary group-hover/btn:text-white" />
                <span>Iniciar Repaso</span>
              </button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Interactive Charts & Subject Progress Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Weekly Study Evolution Chart (7 cols) */}
        <div className="lg:col-span-7 bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h3 className="text-base font-heading font-bold text-fox-text-main flex items-center gap-2">
                <BarChart2 size={18} className="text-fox-primary" /> Evolución de Estudio
              </h3>
              <p className="text-xs text-fox-text-muted mt-0.5">Seguimiento de esfuerzo y rendimiento diario</p>
            </div>

            {/* Metric Switcher */}
            <div className="flex items-center p-1 bg-fox-bg border border-fox-border rounded-xl">
              <button
                onClick={() => setChartMetric('minutes')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  chartMetric === 'minutes' 
                    ? 'bg-fox-surface text-fox-text-main shadow-xs' 
                    : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                Minutos
              </button>
              <button
                onClick={() => setChartMetric('accuracy')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  chartMetric === 'accuracy' 
                    ? 'bg-fox-surface text-fox-text-main shadow-xs' 
                    : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                Precisión %
              </button>
              <button
                onClick={() => setChartMetric('xp')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  chartMetric === 'xp' 
                    ? 'bg-fox-surface text-fox-text-main shadow-xs' 
                    : 'text-fox-text-muted hover:text-fox-text-main'
                }`}
              >
                XP Ganado
              </button>
            </div>
          </div>

          {/* Chart Container */}
          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              {chartMetric === 'accuracy' ? (
                <AreaChart data={mockWeeklyStudyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorAcc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#489980" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#489980" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis domain={[50, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-lg">
                            Precisión: {payload[0].value}%
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <ReferenceLine y={80} stroke="#52a874" strokeDasharray="3 3" />
                  <Area type="monotone" dataKey="accuracy" stroke="#489980" strokeWidth={3} fillOpacity={1} fill="url(#colorAcc)" />
                </AreaChart>
              ) : (
                <BarChart data={mockWeeklyStudyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 12, fontWeight: 700 }}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <RechartsTooltip
                    cursor={{ fill: '#f4f4f5', radius: 6 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const val = payload[0].value;
                        const label = chartMetric === 'minutes' ? `${val} min` : `${val} XP`;
                        return (
                          <div className="bg-gray-900 text-white text-xs font-bold py-1.5 px-3 rounded-lg shadow-lg">
                            {label}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  {chartMetric === 'minutes' && <ReferenceLine y={45} stroke="#d4d4d8" strokeDasharray="3 3" />}
                  <Bar 
                    dataKey={chartMetric === 'minutes' ? 'minutes' : 'xp'} 
                    radius={[6, 6, 6, 6]} 
                    maxBarSize={36}
                  >
                    {mockWeeklyStudyData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.day === 'Jue' ? '#827397' : '#489980'} 
                        className="hover:opacity-80 transition-opacity cursor-pointer"
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/50 flex items-center justify-between text-xs text-fox-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-fox-purple" /> Jueves: Día con mayor rendimiento
            </span>
            <span className="font-bold text-fox-primary">Promedio: 52 min / día</span>
          </div>
        </div>

        {/* Dominio por Materia Overview (5 cols) */}
        <div className="lg:col-span-5 bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-heading font-bold text-fox-text-main flex items-center gap-2">
                <Target size={18} className="text-fox-orange" /> Dominio por Materia
              </h3>
              <button 
                onClick={onViewAllSubjects}
                className="text-xs font-bold text-fox-primary hover:underline flex items-center gap-1"
              >
                Ver detalle <ChevronRight size={14} />
              </button>
            </div>
            <p className="text-xs text-fox-text-muted mb-4">
              Toca una materia para ver competencias y áreas de mejora
            </p>

            <div className="space-y-3.5">
              {subjects.map(sub => (
                <div
                  key={sub.id}
                  onClick={() => onSelectSubject(sub)}
                  className="p-3 rounded-2xl bg-fox-bg/60 border border-fox-border hover:border-fox-primary/50 hover:bg-fox-surface transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-center mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fox-text-main group-hover:text-fox-primary transition-colors">
                        {sub.subject}
                      </span>
                      <span className="bg-fox-surface text-fox-text-muted text-[10px] font-bold px-2 py-0.5 rounded-md border border-fox-border uppercase">
                        Lvl {sub.level}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-fox-text-main">{sub.progress}%</span>
                      {sub.trend === 'up' && <TrendingUp size={14} className="text-fox-green" />}
                      {sub.trend === 'down' && <TrendingDown size={14} className="text-fox-red" />}
                      {sub.trend === 'flat' && <Minus size={14} className="text-fox-text-muted" />}
                    </div>
                  </div>

                  <div className="w-full bg-fox-border/40 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${sub.color}`}
                      style={{ width: `${sub.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/50 flex justify-between items-center text-xs">
            <span className="text-fox-text-muted">Materias en nivel óptimo:</span>
            <strong className="text-fox-green font-bold">2 de 4</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
