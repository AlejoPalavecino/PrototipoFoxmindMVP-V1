import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, Flame, Calendar, Clock, Sparkles, Brain, 
  TrendingUp, CheckCircle2, Zap, Award, Target, BookOpen, 
  ShieldCheck, AlertCircle 
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';
import { mockDuaProfilesDocente } from './progresoDocenteData';

export function ProgresoDocenteHabitosTab() {
  const [selectedDayInfo, setSelectedDayInfo] = useState<{ day: number; submissions: number; attendance: string } | null>(null);

  // 30 days activity data
  const days30 = Array.from({ length: 30 }, (_, i) => {
    const dayNum = i + 1;
    const isWeekend = dayNum % 7 === 0 || dayNum % 7 === 6;
    const count = isWeekend ? Math.floor(Math.random() * 8) : Math.floor(Math.random() * 35) + 15;
    const attendance = isWeekend ? 'Sin clases' : `${Math.floor(Math.random() * 8) + 90}%`;
    return { day: dayNum, count, attendance };
  });

  // Collective retention curve with spaced repetition
  const retentionCurveData = [
    { day: 'Día 1', tradicional: 100, foxmindSpaced: 100 },
    { day: 'Día 2', tradicional: 58, foxmindSpaced: 92 },
    { day: 'Día 4', tradicional: 42, foxmindSpaced: 96 },
    { day: 'Día 7', tradicional: 33, foxmindSpaced: 90 },
    { day: 'Día 14', tradicional: 24, foxmindSpaced: 88 },
    { day: 'Día 21', tradicional: 18, foxmindSpaced: 85 },
    { day: 'Día 30', tradicional: 15, foxmindSpaced: 84 },
  ];

  // Preferred learning hours by student cohorts
  const studyHours = [
    { hour: '08:00', students: 65 },
    { hour: '10:00', students: 120 },
    { hour: '12:00', students: 95 },
    { hour: '14:00', students: 45 },
    { hour: '16:00', students: 110 },
    { hour: '18:00', students: 140 },
    { hour: '20:00', students: 85 },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-fox-surface via-fox-surface to-fox-bg border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-fox-primary/10 border border-fox-primary/20 text-fox-primary flex items-center justify-center font-bold text-2xl shrink-0">
            <Activity size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-heading font-bold text-fox-text-main">
                Hábitos, Asistencia y Ciencia del Aprendizaje 🧬
              </h3>
              <span className="bg-fox-primary/10 text-fox-primary border border-fox-primary/20 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                Evidencia Pedagógica
              </span>
            </div>
            <p className="text-xs text-fox-text-muted mt-1 max-w-xl">
              Análisis cognitivo de la retención a largo plazo, constancia en entregas y diversidad de perfiles DUA en tus aulas.
            </p>
          </div>
        </div>

        {/* Quick Streak Card */}
        <div className="bg-fox-bg/80 border border-fox-border rounded-2xl px-5 py-3 flex items-center gap-3.5 shrink-0 self-stretch sm:self-auto justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Racha Docente</span>
            <div className="text-xl font-heading font-extrabold text-fox-orange flex items-center gap-1.5 mt-0.5">
              <Flame size={20} className="fill-fox-orange" /> 18 días
            </div>
          </div>
          <div className="text-right pl-4 border-l border-fox-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Asistencia Media</span>
            <div className="text-xl font-heading font-extrabold text-fox-green mt-0.5">
              92.4%
            </div>
          </div>
        </div>
      </motion.div>

      {/* 30-Day Activity & Attendance Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
              <Calendar size={18} className="text-fox-primary" /> Mapa de Actividad y Entregas (Últimos 30 Días)
            </h4>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Intensidad de entregas, quizzes formativos y asistencia de los 145 estudiantes
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-fox-text-muted">
            <span>Menos</span>
            <div className="flex gap-1">
              <div className="w-3.5 h-3.5 rounded bg-fox-border/40" />
              <div className="w-3.5 h-3.5 rounded bg-fox-primary/20" />
              <div className="w-3.5 h-3.5 rounded bg-fox-primary/50" />
              <div className="w-3.5 h-3.5 rounded bg-fox-primary/80" />
              <div className="w-3.5 h-3.5 rounded bg-fox-primary" />
            </div>
            <span>Más</span>
          </div>
        </div>

        {/* Heatmap Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
          {days30.map((d) => {
            const intensity = 
              d.count === 0 ? 'bg-fox-border/40' :
              d.count < 15 ? 'bg-fox-primary/20 hover:bg-fox-primary/30 text-fox-text-muted' :
              d.count < 25 ? 'bg-fox-primary/50 hover:bg-fox-primary/60 text-white' :
              d.count < 35 ? 'bg-fox-primary/80 hover:bg-fox-primary/90 text-white' :
              'bg-fox-primary text-white shadow-xs';

            return (
              <div
                key={d.day}
                onMouseEnter={() => setSelectedDayInfo({ day: d.day, submissions: d.count, attendance: d.attendance })}
                className={`h-11 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-transform hover:scale-105 p-1 ${intensity}`}
              >
                <span className="text-[10px] font-bold opacity-80">{d.day}</span>
                <span className="text-[10px] font-black">{d.count}</span>
              </div>
            );
          })}
        </div>

        {/* Hovered day details */}
        {selectedDayInfo && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 p-3 bg-fox-bg border border-fox-border rounded-2xl flex flex-wrap items-center justify-between text-xs gap-3"
          >
            <span className="font-bold text-fox-text-main">
              Día {selectedDayInfo.day} del mes
            </span>
            <span className="text-fox-primary font-bold">
              {selectedDayInfo.submissions} interacciones pedagógicas registradas
            </span>
            <span className="text-fox-green font-bold">
              Asistencia: {selectedDayInfo.attendance}
            </span>
          </motion.div>
        )}
      </motion.div>

      {/* Retention Science & Spaced Repetition vs Forgetting Curve */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Retention Chart (7 cols) */}
        <div className="lg:col-span-7 bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                  <Brain size={18} className="text-fox-purple" /> Curva de Retención Colectiva (Spaced Repetition)
                </h4>
                <p className="text-xs text-fox-text-muted mt-0.5">
                  Comparativa de fijación a 30 días vs Curva del Olvido de Ebbinghaus
                </p>
              </div>
              <span className="text-xs font-black text-fox-green bg-fox-green/10 border border-fox-green/20 px-2.5 py-1 rounded-full">
                +69% Retención
              </span>
            </div>

            <div className="w-full h-64 mt-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={retentionCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFox" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3BB54A" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#3BB54A" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorTrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }} />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 text-white text-xs font-bold p-3 rounded-2xl shadow-xl space-y-1">
                            <div>{payload[0]?.payload?.day}</div>
                            <div className="text-fox-green">FoxMind Spaced: {payload[0]?.value}%</div>
                            <div className="text-red-400">Curva Tradicional: {payload[1]?.value}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area type="monotone" dataKey="foxmindSpaced" stroke="#3BB54A" strokeWidth={3} fillOpacity={1} fill="url(#colorFox)" />
                  <Area type="monotone" dataKey="tradicional" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" fillOpacity={1} fill="url(#colorTrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/60 flex items-center justify-between text-xs text-fox-text-muted">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-fox-green" /> Con Repasos Activos FoxMind
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" /> Sin Repaso Espaciado
            </span>
          </div>
        </div>

        {/* DUA Diversity Breakdown (5 cols) */}
        <div className="lg:col-span-5 bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                <Sparkles size={18} className="text-fox-primary" /> Perfiles DUA Atendidos
              </h4>
              <span className="text-[11px] font-bold text-fox-purple bg-fox-purple/10 px-2 py-0.5 rounded-md border border-fox-purple/20">
                100% Adaptados
              </span>
            </div>

            <p className="text-xs text-fox-text-muted mb-4">
              Distribución de estudiantes con apoyos específicos registrados en tus 4 cursos:
            </p>

            <div className="space-y-3">
              {mockDuaProfilesDocente.map(item => (
                <div
                  key={item.profile}
                  className="p-3 bg-fox-bg/50 border border-fox-border rounded-2xl"
                >
                  <div className="flex justify-between items-center text-xs font-bold mb-1">
                    <span className="text-fox-text-main flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      {item.profile}
                    </span>
                    <span className="font-mono text-fox-text-muted">
                      {item.count} estudiantes ({item.percentage}%)
                    </span>
                  </div>
                  <p className="text-[11px] text-fox-text-muted leading-tight mt-1">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/60 text-[11px] text-fox-text-muted text-center">
            Configuraciones gestionadas conforme al Diseño Universal para el Aprendizaje.
          </div>
        </div>
      </div>
    </div>
  );
}
