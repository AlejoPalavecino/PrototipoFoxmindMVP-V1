import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, BookOpen, Activity, Trophy, Sparkles, 
  History, ChevronRight, BarChart2, ShieldAlert, Award
} from 'lucide-react';
import { useAppContext } from '../../context';
import { 
  mockTeacherDataByTimeframe, 
  mockTeacherMilestones, 
  mockTeacherHistory 
} from './progreso/progresoDocenteData';
import { 
  Timeframe, 
  ClassroomPerformance, 
  PedagogicalAlert, 
  TeacherMilestone, 
  TeacherHistoryEntry 
} from './progreso/progresoDocenteTypes';
import { ProgresoDocenteOverviewTab } from './progreso/ProgresoDocenteOverviewTab';
import { ProgresoDocenteAulasTab } from './progreso/ProgresoDocenteAulasTab';
import { ProgresoDocenteHabitosTab } from './progreso/ProgresoDocenteHabitosTab';
import { ProgresoDocenteLogrosTab } from './progreso/ProgresoDocenteLogrosTab';
import { IntervencionAsistidaModal } from './progreso/IntervencionAsistidaModal';
import { AulaDetailModal } from './progreso/AulaDetailModal';
import { DocenteHistoryModal } from './progreso/DocenteHistoryModal';
import { QuickIntervencionModal } from './progreso/QuickIntervencionModal';

type DocenteProgressTab = 'resumen' | 'aulas' | 'habitos' | 'logros';

export function ProgresoDocente() {
  const { setView } = useAppContext();

  // Navigation Sub-tabs & Timeframe
  const [activeTab, setActiveTab] = useState<DocenteProgressTab>('resumen');
  const [timeframe, setTimeframe] = useState<Timeframe>('semana');

  // Teacher Experience & Points
  const [currentPoints, setCurrentPoints] = useState(3450);

  // Dynamic Data & Collections
  const [dataByTimeframe, setDataByTimeframe] = useState(mockTeacherDataByTimeframe);
  const [milestones, setMilestones] = useState<TeacherMilestone[]>(mockTeacherMilestones);
  const [history, setHistory] = useState<TeacherHistoryEntry[]>(mockTeacherHistory);

  // Modals state
  const [selectedAlertForIntervention, setSelectedAlertForIntervention] = useState<PedagogicalAlert | null>(null);
  const [selectedAulaDetail, setSelectedAulaDetail] = useState<ClassroomPerformance | null>(null);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isQuickInterventionModalOpen, setIsQuickInterventionModalOpen] = useState(false);
  const [quickTarget, setQuickTarget] = useState<{ subject: string; course: string }>({
    subject: 'Biología',
    course: '4° A'
  });

  // Success Celebration Toast
  const [celebrationToast, setCelebrationToast] = useState<{ message: string; points: number } | null>(null);

  // Current Active Timeframe Data
  const currentData = dataByTimeframe[timeframe];

  // Resolve an alert with AI intervention
  const handleResolveAlert = (alertId: number, outcomeSummary: string, pointsEarned: number) => {
    // 1. Mark alert as resolved in current data
    setDataByTimeframe(prev => {
      const updated = { ...prev };
      const currentAlerts = updated[timeframe].alerts.map(a => 
        a.id === alertId ? { ...a, status: 'resolved' as const } : a
      );
      updated[timeframe] = {
        ...updated[timeframe],
        alerts: currentAlerts,
        stats: {
          ...updated[timeframe].stats,
          alumnosRiesgo: Math.max(0, updated[timeframe].stats.alumnosRiesgo - 1),
          adaptacionesDua: updated[timeframe].stats.adaptacionesDua + 1
        }
      };
      return updated;
    });

    // 2. Award points
    setCurrentPoints(prev => prev + pointsEarned);

    // 3. Add to pedagogical history
    const targetAlert = currentData.alerts.find(a => a.id === alertId);
    const newEntry: TeacherHistoryEntry = {
      id: `act-${Date.now()}`,
      title: 'Intervención Pedagógica Exitosa',
      subject: targetAlert?.subject || 'Aula',
      course: targetAlert?.course || 'General',
      type: 'intervencion',
      date: 'Hoy',
      time: 'Ahora',
      impactScore: '+1.0 pts de retención estimada',
      pointsEarned,
      summary: outcomeSummary
    };
    setHistory(prev => [newEntry, ...prev]);

    // 4. Close modal and show toast
    setSelectedAlertForIntervention(null);
    setCelebrationToast({
      message: '¡Intervención registrada y planificada con éxito!',
      points: pointsEarned
    });

    setTimeout(() => {
      setCelebrationToast(null);
    }, 5000);
  };

  // Quick intervention modal triggered
  const handleOpenQuickIntervention = (subject?: string, course?: string) => {
    setQuickTarget({
      subject: subject || 'Biología',
      course: course || '4° A'
    });
    setIsQuickInterventionModalOpen(true);
  };

  const handleQuickInterventionCompleted = (earnedPoints: number, actionName: string) => {
    setCurrentPoints(prev => prev + earnedPoints);

    const newHistoryItem: TeacherHistoryEntry = {
      id: `act-${Date.now()}`,
      title: actionName,
      subject: quickTarget.subject,
      course: quickTarget.course,
      type: 'dua',
      date: 'Hoy',
      time: 'Ahora',
      impactScore: 'Recurso DUA publicado',
      pointsEarned: earnedPoints,
      summary: `Generación y publicación en el muro de ${quickTarget.subject} (${quickTarget.course}).`
    };
    setHistory(prev => [newHistoryItem, ...prev]);

    setCelebrationToast({
      message: `¡Recurso formativo publicado en ${quickTarget.subject}!`,
      points: earnedPoints
    });

    setTimeout(() => {
      setCelebrationToast(null);
    }, 5000);
  };

  // Intervene student directly from Aula modal
  const handleInterveneStudentFromAula = (studentName: string, issue: string) => {
    const syntheticAlert: PedagogicalAlert = {
      id: Date.now(),
      student: studentName,
      course: selectedAulaDetail ? `${selectedAulaDetail.subject} ${selectedAulaDetail.course}` : 'Aula',
      subject: selectedAulaDetail?.subject || 'Materia',
      issue,
      severity: 'high',
      time: 'Ahora',
      status: 'active',
      suggestedAction: 'Plan de nivelación con micro-tutoría o rúbrica adaptada.'
    };
    setSelectedAulaDetail(null);
    setSelectedAlertForIntervention(syntheticAlert);
  };

  const earnedMilestonesCount = milestones.filter(m => m.earned).length;

  return (
    <div className="space-y-6 pb-20 md:pb-8 px-4 md:px-8 pt-6 max-w-7xl mx-auto w-full">
      {/* Toast Notification Banner */}
      <AnimatePresence>
        {celebrationToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-6 right-6 z-50 bg-fox-surface border border-fox-gold/60 text-fox-text-main px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-fox-gold/20 text-fox-gold flex items-center justify-center font-bold">
              <Sparkles size={16} />
            </div>
            <div>
              <p className="text-xs font-bold">{celebrationToast.message}</p>
              <span className="text-[11px] font-extrabold text-fox-gold">
                +{celebrationToast.points} Puntos de Impacto Acreditados
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Header */}
      <motion.header 
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4 mb-2"
      >
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
              <span className="p-2 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center shrink-0">
                <BarChart2 className="w-6 h-6" />
              </span>
              <span>Progreso y Rendimiento de Clase</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-semibold">
                Analítica FoxMind AI
              </span>
            </h2>
            <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
              Seguimiento de competencias curriculares, detección temprana de rezago y retención a largo plazo con adaptaciones DUA.
            </p>
          </div>

          {/* Header Action Buttons & Timeframe Switcher */}
          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
            {/* Timeframe Switcher */}
            <div className="flex items-center bg-fox-surface border border-fox-border p-1 rounded-2xl shadow-2xs">
              {(['semana', 'mes', 'trimestre'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTimeframe(t)}
                  className={`relative px-3.5 py-1.5 text-xs font-bold capitalize rounded-xl transition-all cursor-pointer ${
                    timeframe === t
                      ? 'bg-fox-primary text-white shadow-xs'
                      : 'text-fox-text-muted hover:text-fox-text-main'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <button 
              onClick={() => setIsHistoryModalOpen(true)}
              className="bg-fox-surface border border-fox-border text-fox-text-main px-4 py-2 rounded-2xl text-xs font-bold hover:bg-fox-bg transition-all shadow-xs flex items-center gap-2 cursor-pointer"
            >
              <History size={15} /> Historial pedagógico
            </button>
          </div>
        </div>
      </motion.header>

      {/* Navigation Sub-Tabs (Matching Student View Tabs Exactly) */}
      <div className="flex items-center gap-2 border-b border-fox-border pb-1 overflow-x-auto">
        {[
          { id: 'resumen', label: 'Resumen General', icon: TrendingUp },
          { id: 'aulas', label: 'Dominio por Aula', icon: BookOpen, badge: `${currentData.aulas.length}` },
          { id: 'habitos', label: 'Hábitos y Retención', icon: Activity },
          { id: 'logros', label: 'Hitos e Insignias', icon: Trophy, badge: `${earnedMilestonesCount}/${milestones.length}` },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as DocenteProgressTab)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 relative cursor-pointer ${
                isActive
                  ? 'bg-fox-primary text-white shadow-sm'
                  : 'bg-transparent text-fox-text-muted hover:text-fox-text-main hover:bg-fox-surface'
              }`}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-fox-border text-fox-text-muted'
                }`}>
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Content Render */}
      <div className="pt-2">
        {activeTab === 'resumen' && (
          <ProgresoDocenteOverviewTab
            stats={currentData.stats}
            aulas={currentData.aulas}
            alerts={currentData.alerts}
            scheduledInterventions={currentData.scheduledInterventions}
            foxySummary={currentData.foxySummary}
            currentPoints={currentPoints}
            timeframe={timeframe}
            onOpenQuickIntervention={handleOpenQuickIntervention}
            onSelectAula={aula => setSelectedAulaDetail(aula)}
            onOpenAlertIntervention={alert => setSelectedAlertForIntervention(alert)}
            onViewAllAulas={() => setActiveTab('aulas')}
            onViewHabits={() => setActiveTab('habitos')}
          />
        )}

        {activeTab === 'aulas' && (
          <ProgresoDocenteAulasTab
            aulas={currentData.aulas}
            onSelectAula={aula => setSelectedAulaDetail(aula)}
            onOpenQuickDua={(subj, crs) => handleOpenQuickIntervention(subj, crs)}
          />
        )}

        {activeTab === 'habitos' && (
          <ProgresoDocenteHabitosTab />
        )}

        {activeTab === 'logros' && (
          <ProgresoDocenteLogrosTab
            milestones={milestones}
            currentPoints={currentPoints}
          />
        )}
      </div>

      {/* Interactive Modals */}
      <IntervencionAsistidaModal
        isOpen={selectedAlertForIntervention !== null}
        alert={selectedAlertForIntervention}
        onClose={() => setSelectedAlertForIntervention(null)}
        onResolve={handleResolveAlert}
      />

      <AulaDetailModal
        isOpen={selectedAulaDetail !== null}
        aula={selectedAulaDetail}
        onClose={() => setSelectedAulaDetail(null)}
        onInterveneStudent={handleInterveneStudentFromAula}
        onOpenQuickDua={(subj, crs) => {
          setSelectedAulaDetail(null);
          handleOpenQuickIntervention(subj, crs);
        }}
      />

      <DocenteHistoryModal
        isOpen={isHistoryModalOpen}
        history={history}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      <QuickIntervencionModal
        isOpen={isQuickInterventionModalOpen}
        initialSubject={quickTarget.subject}
        initialCourse={quickTarget.course}
        onClose={() => setIsQuickInterventionModalOpen(false)}
        onCompleted={handleQuickInterventionCompleted}
      />
    </div>
  );
}
