import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Activity, Flame, Clock, Brain, CheckCircle, Sparkles, 
  TrendingUp, Calendar, Zap, AlertCircle, Info 
} from 'lucide-react';
import { 
  LineChart, Line, XAxis, YAxis, Tooltip as RechartsTooltip, 
  ResponsiveContainer, ReferenceLine 
} from 'recharts';

export function ProgresoHabitosTab() {
  // Generate 30 days of activity heatmap
  const daysInMonth = Array.from({ length: 30 }, (_, i) => {
    const dayNumber = i + 1;
    // mock some intensities: 0 = none, 1 = light, 2 = medium, 3 = high
    const intensityMap: Record<number, number> = {
      1: 2, 2: 3, 3: 1, 4: 0, 5: 3, 6: 2, 7: 1,
      8: 2, 9: 3, 10: 3, 11: 2, 12: 0, 13: 1, 14: 3,
      15: 3, 16: 2, 17: 3, 18: 3, 19: 2, 20: 3, 21: 2,
      22: 3, 23: 3, 24: 2, 25: 3, 26: 3, 27: 3, 28: 3,
      29: 0, 30: 0
    };
    return {
      day: dayNumber,
      intensity: intensityMap[dayNumber] || 0,
      minutes: (intensityMap[dayNumber] || 0) * 25 + (intensityMap[dayNumber] > 0 ? 10 : 0),
    };
  });

  // Ebbinghaus forgetting curve vs spaced repetition curve
  const retentionCurveData = [
    { day: 'Día 0', sinRepaso: 100, conFoxy: 100 },
    { day: 'Día 1', sinRepaso: 55, conFoxy: 92 },
    { day: 'Día 3', sinRepaso: 35, conFoxy: 88 },
    { day: 'Día 7', sinRepaso: 22, conFoxy: 85 },
    { day: 'Día 14', sinRepaso: 14, conFoxy: 82 },
    { day: 'Día 30', sinRepaso: 8, conFoxy: 80 },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
          <Activity size={22} className="text-fox-primary" /> Hábitos y Ciencia del Aprendizaje
        </h3>
        <p className="text-xs text-fox-text-muted mt-0.5">
          Cómo tus rutinas y sesiones de Active Recall protegen tu retención a largo plazo
        </p>
      </div>

      {/* 30-Day Activity Heatmap */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
              <Calendar size={18} className="text-fox-orange" /> Consistencia de Estudio (Últimos 30 días)
            </h4>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Has estudiado 24 de los últimos 30 días (80% de regularidad)
            </p>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 text-xs text-fox-text-muted">
            <span>Menos</span>
            <div className="w-3.5 h-3.5 rounded-md bg-fox-border/40" />
            <div className="w-3.5 h-3.5 rounded-md bg-fox-primary/30" />
            <div className="w-3.5 h-3.5 rounded-md bg-fox-primary/60" />
            <div className="w-3.5 h-3.5 rounded-md bg-fox-primary" />
            <span>Más</span>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="grid grid-cols-6 sm:grid-cols-10 md:grid-cols-15 gap-2">
          {daysInMonth.map(d => {
            let bgClass = "bg-fox-border/40 text-fox-text-muted/60";
            if (d.intensity === 1) bgClass = "bg-fox-primary/30 text-fox-text-main";
            if (d.intensity === 2) bgClass = "bg-fox-primary/60 text-white font-bold";
            if (d.intensity === 3) bgClass = "bg-fox-primary text-white font-bold shadow-xs";

            return (
              <div
                key={d.day}
                className={`h-11 rounded-xl flex flex-col items-center justify-center text-xs transition-all hover:scale-105 cursor-pointer relative group ${bgClass}`}
              >
                <span>{d.day}</span>
                <span className="text-[9px] opacity-75">{d.minutes > 0 ? `${d.minutes}m` : '0m'}</span>

                {/* Tooltip on hover */}
                <div className="absolute -top-9 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold py-1 px-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-lg">
                  Día {d.day}: {d.minutes} min estudiados
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Cognitive Science & Retention Curve Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Retention Curve Chart (7 cols) */}
        <div className="lg:col-span-7 bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2">
                  <Brain size={18} className="text-fox-purple" /> Curva de Retención de Memoria
                </h4>
                <p className="text-xs text-fox-text-muted mt-0.5">
                  Comparativa: Estudio Pasivo vs Repasos Espaciados con Foxy
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-fox-green/10 text-fox-green border border-fox-green/20">
                +66% retención a 30 días
              </span>
            </div>

            <div className="w-full h-56 mt-4">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={retentionCurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis 
                    dataKey="day" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fill: '#71717a', fontSize: 11, fontWeight: 700 }}
                  />
                  <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fill: '#71717a', fontSize: 11 }} />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="bg-gray-900 text-white text-xs font-bold p-2.5 rounded-xl shadow-lg space-y-1">
                            <div className="text-fox-green">Con Repasos Foxy: {payload[0]?.value}%</div>
                            <div className="text-gray-400">Sin Repaso (Olvido): {payload[1]?.value}%</div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line type="monotone" dataKey="conFoxy" stroke="#52a874" strokeWidth={3} dot={{ r: 4, fill: '#52a874' }} />
                  <Line type="monotone" dataKey="sinRepaso" stroke="#d96c63" strokeWidth={2} strokeDasharray="4 4" dot={{ r: 3, fill: '#d96c63' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-fox-border/50 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-fox-green">
                <span className="w-3 h-1 bg-fox-green rounded-full" /> Con FoxMind Spaced Repetition
              </span>
              <span className="flex items-center gap-1.5 text-fox-text-muted">
                <span className="w-3 h-0.5 bg-fox-red rounded-full" /> Curva del Olvido tradicional
              </span>
            </div>
          </div>
        </div>

        {/* Study Habits Metrics (5 cols) */}
        <div className="lg:col-span-5 bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-5">
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2 mb-1">
              <Clock size={18} className="text-fox-primary" /> Eficiencia del Hábito
            </h4>
            <p className="text-xs text-fox-text-muted mb-4">
              Patrones identificados por la inteligencia de FoxMind
            </p>

            <div className="space-y-4">
              {/* Active vs Passive */}
              <div className="p-3.5 bg-fox-bg/60 border border-fox-border rounded-2xl">
                <div className="flex justify-between items-center text-xs font-bold mb-1.5">
                  <span className="text-fox-text-main">Active Recall vs Lectura Pasiva</span>
                  <span className="text-fox-primary">82% Activo</span>
                </div>
                <div className="w-full bg-fox-border/40 h-2 rounded-full overflow-hidden flex">
                  <div className="bg-fox-primary h-full rounded-l-full" style={{ width: '82%' }} />
                  <div className="bg-gray-300 h-full rounded-r-full" style={{ width: '18%' }} />
                </div>
                <span className="text-[10px] text-fox-text-muted mt-1.5 block">
                  Recomendado: Mayor a 70% para memorización duradera.
                </span>
              </div>

              {/* Best Hour */}
              <div className="p-3.5 bg-fox-bg/60 border border-fox-border rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-fox-text-main">Horario de Mayor Enfoque</div>
                  <div className="text-sm font-heading font-bold text-fox-purple mt-0.5">17:00 a 19:30</div>
                  <span className="text-[10px] text-fox-text-muted">94% de precisión en este rango</span>
                </div>
                <div className="p-2.5 bg-fox-purple/10 text-fox-purple rounded-xl">
                  <Zap size={20} />
                </div>
              </div>

              {/* Avg Session */}
              <div className="p-3.5 bg-fox-bg/60 border border-fox-border rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-fox-text-main">Duración Promedio de Sesión</div>
                  <div className="text-sm font-heading font-bold text-fox-primary mt-0.5">22 minutos</div>
                  <span className="text-[10px] text-fox-text-muted">Óptimo para evitar la fatiga cognitiva</span>
                </div>
                <div className="p-2.5 bg-fox-primary/10 text-fox-primary rounded-xl">
                  <CheckCircle size={20} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-fox-primary/5 border border-fox-primary/20 rounded-2xl flex items-center gap-2.5 text-xs text-fox-text-main">
            <Info size={16} className="text-fox-primary shrink-0" />
            <span>Tus descansos regulares aumentaron tu retención un <strong>+18%</strong> este mes.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
