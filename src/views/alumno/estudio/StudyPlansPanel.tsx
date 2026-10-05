import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target, 
  Calendar, 
  CheckCircle2, 
  Circle, 
  Plus, 
  Sparkles, 
  Clock, 
  ChevronRight, 
  Flame, 
  Layers, 
  Brain, 
  FileText, 
  Network, 
  X, 
  Check,
  Edit3,
  Award
} from 'lucide-react';
import { toast } from '../../../components/ui/Toaster';
import { StudyPlan, StudyPlanMilestone } from './estudioTypes';

interface StudyPlansPanelProps {
  plans: StudyPlan[];
  folderId?: string;
  folderName?: string;
  onUpdatePlan: (updatedPlan: StudyPlan) => void;
  onCreateNewPlan: () => void;
  onExecuteMilestonePrompt?: (prompt: string) => void;
}

export const StudyPlansPanel: React.FC<StudyPlansPanelProps> = ({
  plans,
  folderId,
  folderName,
  onUpdatePlan,
  onCreateNewPlan,
  onExecuteMilestonePrompt
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<string>(plans[0]?.id || '');
  const [isCreatingModal, setIsCreatingModal] = useState(false);

  // New Plan form state
  const [newPlanForm, setNewPlanForm] = useState({
    title: '',
    targetGoal: '',
    examDate: '',
    intensity: 'moderado' as 'ligero' | 'moderado' | 'intensivo',
    hoursPerWeek: 4
  });

  const activePlan = plans.find(p => p.id === selectedPlanId) || plans[0];

  const handleToggleMilestone = (milestoneId: string) => {
    if (!activePlan) return;
    const updatedMilestones = activePlan.milestones.map(m => 
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    const completedCount = updatedMilestones.filter(m => m.completed).length;
    const progressPercentage = Math.round((completedCount / updatedMilestones.length) * 100);

    const updatedPlan: StudyPlan = {
      ...activePlan,
      milestones: updatedMilestones,
      progressPercentage
    };

    onUpdatePlan(updatedPlan);

    const toggled = updatedMilestones.find(m => m.id === milestoneId);
    if (toggled?.completed) {
      toast.show('🏆 ¡Hito completado! Progreso actualizado', 'success');
    } else {
      toast.show('Hito marcado como pendiente', 'info');
    }
  };

  const handleCreatePlan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanForm.title.trim() || !newPlanForm.targetGoal.trim()) {
      toast.show('Por favor completa el título y tu meta', 'error');
      return;
    }

    const generatedMilestones: StudyPlanMilestone[] = [
      {
        id: `m-gen-1`,
        title: 'Lectura y subrayado de conceptos clave',
        description: 'Revisar el material de estudio y apuntes.',
        dueDate: 'Semana 1',
        completed: false,
        estimatedMinutes: 30,
        activityType: 'lectura'
      },
      {
        id: `m-gen-2`,
        title: 'Práctica de Active Recall con Flashcards',
        description: 'Repasar 15 flashcards generadas por Foxy.',
        dueDate: 'Semana 1',
        completed: false,
        estimatedMinutes: 20,
        activityType: 'flashcards'
      },
      {
        id: `m-gen-3`,
        title: 'Mapa conceptual de relaciones temáticas',
        description: 'Interconectar ideas y validar jerarquía con Foxy.',
        dueDate: 'Semana 2',
        completed: false,
        estimatedMinutes: 25,
        activityType: 'mapa'
      },
      {
        id: `m-gen-4`,
        title: 'Simulacro de Examen con Foxy en Modo Riguroso',
        description: 'Evaluar dominio global antes de la fecha final.',
        dueDate: newPlanForm.examDate || 'Semana 2',
        completed: false,
        estimatedMinutes: 40,
        activityType: 'simulacro'
      }
    ];

    const newPlan: StudyPlan = {
      id: `plan-${Date.now()}`,
      title: newPlanForm.title,
      folderId: folderId || '1',
      folderName: folderName || 'Estudio Personal',
      targetGoal: newPlanForm.targetGoal,
      examDate: newPlanForm.examDate ? `Fecha objetivo: ${newPlanForm.examDate}` : 'Próximamente',
      intensity: newPlanForm.intensity,
      createdAt: 'Ahora',
      progressPercentage: 0,
      milestones: generatedMilestones,
      tips: [
        'Estudiá en bloques de 25 minutos con pausas cortas (Técnica Pomodoro).',
        'Pedile a Foxy que te tome un mini-quiz cada 3 días para consolidar la memoria.',
        'Enfocate primero en los temas donde hayas tenido más errores.'
      ]
    };

    onUpdatePlan(newPlan);
    setSelectedPlanId(newPlan.id);
    setIsCreatingModal(false);
    toast.show('✨ ¡Plan de estudio personalizado creado con éxito!', 'success');
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'flashcards': return <Layers size={14} className="text-fox-purple" />;
      case 'quiz': return <Brain size={14} className="text-fox-orange" />;
      case 'mapa': return <Network size={14} className="text-blue-600" />;
      case 'simulacro': return <Award size={14} className="text-rose-500" />;
      default: return <FileText size={14} className="text-emerald-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto py-2">
      {/* Top Banner */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-fox-orange/10 text-fox-orange border border-fox-orange/20 flex items-center justify-center font-bold">
            <Target size={24} />
          </div>
          <div>
            <h2 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
              Planes de Estudio y Metas de Exámenes
            </h2>
            <p className="text-xs text-fox-text-muted mt-0.5">
              Planificá tus parciales con metas estructuradas, hitos semanales y acompañamiento de Foxy
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsCreatingModal(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-fox-orange text-white hover:bg-fox-orange/90 font-bold text-xs shadow-sm hover:shadow-md transition-all cursor-pointer"
        >
          <Plus size={16} />
          <span>Crear Plan de Estudio</span>
        </button>
      </div>

      {plans.length === 0 ? (
        <div className="bg-fox-surface border border-dashed border-fox-border rounded-3xl p-12 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-fox-orange/10 text-fox-orange flex items-center justify-center mx-auto">
            <Target size={26} />
          </div>
          <div>
            <h4 className="font-heading font-bold text-fox-text-main text-base">
              Aún no creaste un plan de estudio
            </h4>
            <p className="text-xs text-fox-text-muted max-w-md mx-auto mt-1">
              Ponete una meta para tu próximo parcial, examen de regularización o repaso intensivo. Foxy generará los hitos por vos.
            </p>
          </div>
          <button
            onClick={() => setIsCreatingModal(true)}
            className="px-5 py-2.5 bg-fox-orange text-white font-bold text-xs rounded-2xl shadow-xs hover:bg-fox-orange/90 transition-all cursor-pointer"
          >
            Crear mi primer plan de estudio
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Plans List Selector */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-fox-text-muted px-1">
              Tus Planes Activos ({plans.length})
            </h3>
            {plans.map(p => {
              const isSelected = p.id === activePlan?.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlanId(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                    isSelected
                      ? 'bg-fox-surface border-fox-orange ring-2 ring-fox-orange/20 shadow-sm'
                      : 'bg-fox-surface border-fox-border hover:border-fox-orange/40 text-fox-text-main'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-fox-orange/10 text-fox-orange">
                      {p.intensity}
                    </span>
                    <span className="text-xs font-bold text-fox-text-muted">
                      {p.examDate}
                    </span>
                  </div>

                  <div>
                    <h4 className="font-heading font-bold text-sm text-fox-text-main line-clamp-1">
                      {p.title}
                    </h4>
                    <p className="text-xs text-fox-text-muted line-clamp-1 mt-0.5">
                      {p.targetGoal}
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-bold text-fox-text-muted">
                      <span>Progreso</span>
                      <span className="text-fox-orange">{p.progressPercentage}%</span>
                    </div>
                    <div className="w-full bg-fox-bg border border-fox-border h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-fox-orange h-full rounded-full transition-all"
                        style={{ width: `${p.progressPercentage}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Main Plan Detail & Interactive Checklist */}
          {activePlan && (
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 sm:p-6 shadow-xs space-y-5">
                {/* Plan Header Details */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-fox-border">
                  <div>
                    <span className="text-[11px] font-bold text-fox-orange uppercase tracking-wider">
                      {activePlan.folderName} • Plan de Estudio Activo
                    </span>
                    <h3 className="font-heading font-extrabold text-lg sm:text-xl text-fox-text-main mt-0.5">
                      {activePlan.title}
                    </h3>
                    <p className="text-xs text-fox-text-muted mt-1 leading-relaxed">
                      🎯 <strong>Meta:</strong> {activePlan.targetGoal}
                    </p>
                  </div>
                  <div className="bg-fox-bg border border-fox-border rounded-2xl p-3 text-center shrink-0">
                    <p className="text-[10px] uppercase font-bold text-fox-text-muted">Dominio Meta</p>
                    <p className="text-2xl font-black text-fox-orange mt-0.5">{activePlan.progressPercentage}%</p>
                  </div>
                </div>

                {/* Milestones / Checklist */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-heading font-bold text-xs uppercase tracking-wider text-fox-text-muted">
                      Hitos y Actividades del Plan ({activePlan.milestones.filter(m => m.completed).length}/{activePlan.milestones.length})
                    </h4>
                    <span className="text-xs text-fox-text-muted">
                      Tildá los hitos a medida que avances
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {activePlan.milestones.map((milestone) => (
                      <div
                        key={milestone.id}
                        onClick={() => handleToggleMilestone(milestone.id)}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3.5 group ${
                          milestone.completed
                            ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-950 opacity-80'
                            : 'bg-fox-bg/50 border-fox-border hover:border-fox-orange/50 hover:bg-fox-orange/5 text-fox-text-main'
                        }`}
                      >
                        <button
                          type="button"
                          className="mt-0.5 text-fox-text-muted group-hover:text-fox-orange transition-colors"
                        >
                          {milestone.completed ? (
                            <CheckCircle2 size={20} className="text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle size={20} />
                          )}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`font-heading font-bold text-sm ${milestone.completed ? 'line-through text-fox-text-muted' : 'text-fox-text-main'}`}>
                              {milestone.title}
                            </span>
                            <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-fox-surface border border-fox-border text-fox-text-muted">
                              {getActivityIcon(milestone.activityType)}
                              <span className="capitalize">{milestone.activityType}</span>
                            </span>
                          </div>
                          <p className="text-xs text-fox-text-muted mt-1 leading-relaxed">
                            {milestone.description}
                          </p>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-[11px] font-bold block ${milestone.completed ? 'text-emerald-600' : 'text-fox-orange'}`}>
                            {milestone.dueDate}
                          </span>
                          <span className="text-[10px] text-fox-text-muted font-medium flex items-center gap-1 justify-end mt-0.5">
                            <Clock size={10} /> {milestone.estimatedMinutes} min
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* AI Advice & Tips Box */}
                {activePlan.tips && activePlan.tips.length > 0 && (
                  <div className="bg-fox-orange/10 border border-fox-orange/20 rounded-2xl p-4 space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-fox-orange uppercase tracking-wider">
                      <Sparkles size={14} />
                      <span>Consejos de Foxy para este Plan</span>
                    </div>
                    <ul className="space-y-1.5 pl-4 text-xs text-fox-text-main list-disc marker:text-fox-orange">
                      {activePlan.tips.map((tip, idx) => (
                        <li key={idx} className="leading-relaxed">{tip}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Crear Plan */}
      <AnimatePresence>
        {isCreatingModal && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-fox-surface border border-fox-border rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-5 border-b border-fox-border bg-fox-bg/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-fox-orange/10 text-fox-orange flex items-center justify-center font-bold">
                    <Target size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg">
                      Nuevo Plan de Estudio con IA
                    </h3>
                    <p className="text-xs text-fox-text-muted">
                      Configurá tu meta y Foxy organizará el cronograma de estudio
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsCreatingModal(false)}
                  className="p-2 text-fox-text-muted hover:text-fox-text-main rounded-xl border border-fox-border hover:bg-fox-bg"
                >
                  <X size={18} />
                </button>
              </div>

              <form onSubmit={handleCreatePlan} className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                    Título del Plan de Estudio *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPlanForm.title}
                    onChange={(e) => setNewPlanForm({...newPlanForm, title: e.target.value})}
                    placeholder="Ej. Preparación Parcial de Historia, Repaso Final de Biología"
                    className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:ring-2 focus:ring-fox-orange/20 focus:border-fox-orange outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                    Meta u Objetivo Concreto *
                  </label>
                  <textarea
                    required
                    value={newPlanForm.targetGoal}
                    onChange={(e) => setNewPlanForm({...newPlanForm, targetGoal: e.target.value})}
                    placeholder="Ej. Aprobar con más de 8/10 y dominar la Revolución Francesa y el Imperio Napoleónico..."
                    rows={2}
                    className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:ring-2 focus:ring-fox-orange/20 focus:border-fox-orange outline-none resize-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                      Fecha del Examen / Límite
                    </label>
                    <input
                      type="text"
                      value={newPlanForm.examDate}
                      onChange={(e) => setNewPlanForm({...newPlanForm, examDate: e.target.value})}
                      placeholder="Ej. En 10 días (15 Nov)"
                      className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:ring-2 focus:ring-fox-orange/20 focus:border-fox-orange outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-1.5">
                      Nivel de Intensidad
                    </label>
                    <select
                      value={newPlanForm.intensity}
                      onChange={(e) => setNewPlanForm({...newPlanForm, intensity: e.target.value as any})}
                      className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-xs text-fox-text-main focus:ring-2 focus:ring-fox-orange/20 focus:border-fox-orange outline-none cursor-pointer"
                    >
                      <option value="ligero">Ligero (1-2 h / semana)</option>
                      <option value="moderado">Moderado (3-4 h / semana)</option>
                      <option value="intensivo">Intensivo (5+ h / semana)</option>
                    </select>
                  </div>
                </div>

                <div className="pt-3 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setIsCreatingModal(false)}
                    className="flex-1 py-3 rounded-2xl border border-fox-border text-fox-text-muted hover:text-fox-text-main font-bold text-xs transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-[2] py-3 rounded-2xl bg-fox-orange text-white hover:bg-fox-orange/90 font-bold text-xs shadow-sm flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Sparkles size={15} />
                    <span>Generar Plan con Foxy</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
