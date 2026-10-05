import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Trophy, Award, Lock, CheckCircle2, Sparkles, Flame, 
  Brain, Folder, Shield, Star, Crown, Gift 
} from 'lucide-react';
import { AchievementItem } from './progresoTypes';

interface ProgresoLogrosTabProps {
  achievements: AchievementItem[];
  currentXp: number;
}

export function ProgresoLogrosTab({ achievements, currentXp }: ProgresoLogrosTabProps) {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<'all' | 'earned' | 'in_progress'>('all');

  const filteredAchievements = achievements.filter(ach => {
    const matchesCategory = filterCategory === 'all' || ach.category === filterCategory;
    const matchesStatus = 
      filterStatus === 'all' ||
      (filterStatus === 'earned' && ach.earned) ||
      (filterStatus === 'in_progress' && !ach.earned);
    return matchesCategory && matchesStatus;
  });

  const earnedCount = achievements.filter(a => a.earned).length;

  const levelUnlocks = [
    { level: 5, title: 'Insignia de Novato Entusiasta', unlocked: true, icon: '🌱' },
    { level: 10, title: 'Tema Foxy Verde Esmeralda', unlocked: true, icon: '🎨' },
    { level: 15, title: 'Borde de Perfil Dorado & Rango Oro', unlocked: true, icon: '⭐' },
    { level: 16, title: 'Tema de Foxy Astral con Modo Zen', unlocked: false, icon: '🌌' },
    { level: 20, title: 'Corona de Leyenda FoxMind', unlocked: false, icon: '👑' },
  ];

  return (
    <div className="space-y-8">
      {/* Header & Stats Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
      >
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-fox-gold/10 text-fox-gold flex items-center justify-center font-bold text-3xl shadow-sm border border-fox-gold/30 shrink-0">
            <Trophy size={32} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-heading font-bold text-fox-text-main">
                Salón de Logros e Insignias
              </h3>
              <span className="bg-fox-gold/20 text-fox-gold border border-fox-gold/30 px-2.5 py-0.5 rounded-full text-xs font-bold">
                {earnedCount} / {achievements.length} Desbloqueados
              </span>
            </div>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Supera desafíos cognitivos para acumular XP y desbloquear recompensas visuales
            </p>
          </div>
        </div>

        {/* Global Trophy Progress */}
        <div className="w-full md:w-64">
          <div className="flex justify-between text-xs font-bold text-fox-text-muted mb-1.5">
            <span>Progreso Total</span>
            <span className="text-fox-text-main font-mono">
              {Math.round((earnedCount / achievements.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-fox-border/50 h-2.5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-fox-gold to-yellow-400"
              style={{ width: `${(earnedCount / achievements.length) * 100}%` }}
            />
          </div>
        </div>
      </motion.div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        {/* Category Filters */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full">
          {[
            { id: 'all', label: 'Todos los Logros' },
            { id: 'racha', label: '🔥 Rachas' },
            { id: 'dominio', label: '🧠 Dominio' },
            { id: 'habito', label: '📁 Hábitos' },
            { id: 'social', label: '🤝 Comunidad' },
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                filterCategory === cat.id
                  ? 'bg-fox-primary text-white shadow-sm'
                  : 'bg-fox-surface border border-fox-border text-fox-text-muted hover:text-fox-text-main'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Status Switcher */}
        <div className="flex items-center p-1 bg-fox-surface border border-fox-border rounded-xl shrink-0">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filterStatus === 'all'
                ? 'bg-fox-bg text-fox-text-main shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilterStatus('earned')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filterStatus === 'earned'
                ? 'bg-fox-bg text-fox-text-main shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            Obtenidos
          </button>
          <button
            onClick={() => setFilterStatus('in_progress')}
            className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
              filterStatus === 'in_progress'
                ? 'bg-fox-bg text-fox-text-main shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            En Progreso
          </button>
        </div>
      </div>

      {/* Grid of Achievements */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
        {filteredAchievements.map(ach => (
          <motion.div
            key={ach.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`p-5 rounded-3xl border flex flex-col justify-between transition-all relative overflow-hidden ${
              ach.earned
                ? 'bg-fox-surface border-fox-gold/40 shadow-sm hover:shadow-md hover:-translate-y-1'
                : 'bg-fox-bg/70 border-fox-border hover:border-fox-border/80'
            }`}
          >
            {ach.earned && (
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-fox-gold via-yellow-400 to-fox-orange" />
            )}

            <div>
              {/* Icon & Rarity Badge */}
              <div className="flex items-start justify-between mb-3">
                <div className="relative">
                  <div className={`text-4xl p-2 rounded-2xl bg-fox-bg border border-fox-border/60 ${!ach.earned ? 'grayscale opacity-50' : ''}`}>
                    {ach.icon}
                  </div>
                  {!ach.earned && (
                    <div className="absolute -bottom-1 -right-1 bg-fox-surface p-1 rounded-full border border-fox-border text-fox-text-muted shadow-sm">
                      <Lock size={12} />
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    ach.rarity === 'Legendario' 
                      ? 'bg-purple-100 text-purple-700 border border-purple-300'
                      : ach.rarity === 'Épico'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : ach.rarity === 'Raro'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-fox-bg text-fox-text-muted border border-fox-border'
                  }`}>
                    {ach.rarity}
                  </span>
                  <div className="text-xs font-bold text-fox-gold mt-1 flex items-center justify-end gap-1">
                    <Award size={12} /> +{ach.xpReward} XP
                  </div>
                </div>
              </div>

              {/* Title & Description */}
              <h4 className={`font-heading font-bold text-base mb-1 ${ach.earned ? 'text-fox-text-main' : 'text-fox-text-muted'}`}>
                {ach.title}
              </h4>
              <p className="text-xs text-fox-text-muted leading-relaxed mb-4">
                {ach.description}
              </p>
            </div>

            {/* Progress / Status Bar */}
            <div>
              {ach.earned ? (
                <div className="pt-3 border-t border-fox-border/50 flex items-center justify-between text-xs text-fox-green font-bold">
                  <span className="flex items-center gap-1">
                    <CheckCircle2 size={14} /> Desbloqueado
                  </span>
                  <span className="text-[11px] text-fox-text-muted font-medium">{ach.earnedDate}</span>
                </div>
              ) : (
                <div className="pt-3 border-t border-fox-border/50">
                  <div className="flex justify-between text-[11px] font-bold text-fox-text-muted mb-1">
                    <span>Progreso</span>
                    <span>{ach.progress} / {ach.maxProgress}</span>
                  </div>
                  <div className="w-full bg-fox-border/50 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-fox-primary"
                      style={{ width: `${((ach.progress || 0) / (ach.maxProgress || 1)) * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Rewards & Level Perks Tree */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-fox-surface border border-fox-border rounded-3xl p-6 shadow-sm"
      >
        <div className="flex items-center gap-2 mb-4">
          <Gift size={20} className="text-fox-purple" />
          <h4 className="font-heading font-bold text-fox-text-main text-base">
            Árbol de Recompensas por Nivel
          </h4>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {levelUnlocks.map(perk => (
            <div
              key={perk.level}
              className={`p-3.5 rounded-2xl border flex flex-col justify-between ${
                perk.unlocked
                  ? 'bg-fox-bg/60 border-fox-green/30 text-fox-text-main'
                  : 'bg-fox-bg/30 border-fox-border/70 text-fox-text-muted opacity-70'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{perk.icon}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  perk.unlocked ? 'bg-fox-green/15 text-fox-green' : 'bg-fox-border text-fox-text-muted'
                }`}>
                  Nivel {perk.level}
                </span>
              </div>
              <div className="text-xs font-bold leading-tight">{perk.title}</div>
              <div className="text-[10px] mt-2 font-medium">
                {perk.unlocked ? '✓ Desbloqueado' : '🔒 Próximamente'}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
