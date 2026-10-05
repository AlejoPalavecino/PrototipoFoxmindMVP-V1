import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Award, Sparkles, CheckCircle2, Lock, 
  Target, Star, Flame, Zap, Shield, ChevronRight 
} from 'lucide-react';
import { TeacherMilestone } from './progresoDocenteTypes';

interface ProgresoDocenteLogrosTabProps {
  milestones: TeacherMilestone[];
  currentPoints: number;
}

export function ProgresoDocenteLogrosTab({
  milestones,
  currentPoints
}: ProgresoDocenteLogrosTabProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'earned' | 'in_progress'>('all');

  const earnedCount = milestones.filter(m => m.earned).length;
  const totalCount = milestones.length;
  const completionPercentage = Math.round((earnedCount / totalCount) * 100);

  const filteredMilestones = milestones.filter(m => {
    if (selectedCategory !== 'all' && m.category !== selectedCategory) return false;
    if (statusFilter === 'earned' && !m.earned) return false;
    if (statusFilter === 'in_progress' && m.earned) return false;
    return true;
  });

  return (
    <div className="space-y-8">
      {/* Top Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-fox-gold/15 via-amber-500/10 to-fox-surface border border-fox-gold/30 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-fox-gold to-amber-500 text-white flex items-center justify-center font-bold text-3xl shadow-md border-2 border-white/80 shrink-0">
            <Trophy size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-2xl font-heading font-bold text-fox-text-main">
                Salón de Hitos e Insignias Docentes 🏆
              </h3>
            </div>
            <p className="text-xs text-fox-text-muted mt-1 max-w-xl">
              Reconocimiento a tu dedicación pedagógica, adaptabilidad DUA y acompañamiento formativo continuo.
            </p>
          </div>
        </div>

        {/* Global Stats */}
        <div className="bg-fox-surface border border-fox-border rounded-2xl p-4 flex items-center gap-6 shrink-0 self-stretch sm:self-auto justify-around">
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Insignias</span>
            <div className="text-xl font-heading font-extrabold text-fox-text-main mt-0.5">
              {earnedCount} / {totalCount}
            </div>
          </div>
          <div className="w-px h-8 bg-fox-border" />
          <div className="text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-fox-text-muted">Puntaje Total</span>
            <div className="text-xl font-heading font-extrabold text-fox-gold mt-0.5">
              {currentPoints.toLocaleString()} Pts
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filter and Category Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: 'all', label: 'Todos los Hitos' },
            { id: 'seguimiento', label: '🛡️ Seguimiento' },
            { id: 'dua', label: '✨ DUA e Inclusión' },
            { id: 'rendimiento', label: '📈 Rendimiento' },
            { id: 'comunidad', label: '🤝 Comunidad' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                selectedCategory === cat.id
                  ? 'bg-fox-primary text-white shadow-xs'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Switcher */}
        <div className="flex items-center p-1 bg-fox-surface border border-fox-border rounded-xl self-start sm:self-auto">
          {[
            { id: 'all', label: 'Todos' },
            { id: 'earned', label: 'Desbloqueados' },
            { id: 'in_progress', label: 'En Progreso' },
          ].map(st => (
            <button
              key={st.id}
              onClick={() => setStatusFilter(st.id as any)}
              className={`px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                statusFilter === st.id
                  ? 'bg-fox-bg text-fox-text-main shadow-2xs font-extrabold'
                  : 'text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Badges Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredMilestones.map(m => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-5 border transition-all flex flex-col justify-between relative overflow-hidden ${
              m.earned
                ? 'bg-fox-surface border-fox-border hover:border-fox-gold/50 shadow-sm'
                : 'bg-fox-surface/60 border-fox-border/60 opacity-85'
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-inner shrink-0 ${
                  m.earned
                    ? 'bg-fox-gold/15 border border-fox-gold/30'
                    : 'bg-fox-border/30 grayscale opacity-60 border border-fox-border/40'
                }`}>
                  {m.icon}
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    m.rarity === 'Legendario'
                      ? 'bg-amber-500/15 text-amber-600 border border-amber-500/30'
                      : m.rarity === 'Épico'
                      ? 'bg-fox-purple/15 text-fox-purple border border-fox-purple/30'
                      : m.rarity === 'Raro'
                      ? 'bg-fox-primary/15 text-fox-primary border border-fox-primary/30'
                      : 'bg-fox-border/50 text-fox-text-muted'
                  }`}>
                    {m.rarity}
                  </span>
                  <span className="text-xs font-extrabold text-fox-gold">
                    +{m.pointsReward} Pts
                  </span>
                </div>
              </div>

              <h4 className="font-heading font-bold text-fox-text-main text-base mb-1">
                {m.title}
              </h4>
              <p className="text-xs text-fox-text-muted leading-relaxed">
                {m.description}
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-fox-border/60">
              {m.earned ? (
                <div className="flex items-center justify-between text-xs font-bold text-fox-green">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={15} /> Desbloqueado
                  </span>
                  <span className="text-[11px] font-medium text-fox-text-muted">
                    {m.earnedDate}
                  </span>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center text-xs font-bold text-fox-text-muted mb-1.5">
                    <span className="flex items-center gap-1">
                      <Lock size={13} /> Progreso
                    </span>
                    <span className="font-mono">{m.progress} / {m.maxProgress}</span>
                  </div>
                  <div className="w-full bg-fox-border/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-fox-primary h-full rounded-full"
                      style={{ width: `${((m.progress || 0) / (m.maxProgress || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Perks Tree Road */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm">
        <h4 className="font-heading font-bold text-fox-text-main text-base flex items-center gap-2 mb-4">
          <Star size={18} className="text-fox-gold" /> Árbol de Beneficios y Reconocimientos FoxMind
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { level: 'Nivel 5', title: 'Reportes PDF Automáticos', status: 'unlocked', icon: '📄' },
            { level: 'Nivel 10', title: 'Generador de Rúbricas DUA con IA', status: 'unlocked', icon: '✨' },
            { level: 'Nivel 15', title: 'Mentor de Excelencia Institucional', status: 'unlocked', icon: '🌟' },
            { level: 'Nivel 20', title: 'Embajador FoxMind & Masterclasses', status: 'locked', icon: '👑' },
          ].map(perk => (
            <div
              key={perk.level}
              className={`p-4 rounded-2xl border transition-all ${
                perk.status === 'unlocked'
                  ? 'bg-fox-bg/50 border-fox-gold/40'
                  : 'bg-fox-bg/20 border-fox-border/40 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{perk.icon}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  perk.status === 'unlocked'
                    ? 'bg-fox-green/10 text-fox-green border border-fox-green/20'
                    : 'bg-fox-border text-fox-text-muted'
                }`}>
                  {perk.status === 'unlocked' ? 'Activo' : 'Bloqueado'}
                </span>
              </div>
              <span className="text-[10px] font-bold text-fox-gold uppercase tracking-wider">{perk.level}</span>
              <h5 className="font-heading font-bold text-fox-text-main text-xs mt-0.5">{perk.title}</h5>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
