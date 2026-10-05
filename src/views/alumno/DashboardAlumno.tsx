import React, { useState } from 'react';
import { useAppContext } from '../../context';
import { mockAchievements } from '../../mockData';
import { Brain, Calendar, CheckCircle2, Clock, Flame, Target, BookOpen, ChevronRight, Sparkles, ArrowRight, BarChart2, FileText, Trophy, Circle, MessageSquare } from 'lucide-react';
import { motion, AnimatePresence, Variants } from 'motion/react';

// --- MOCK DATA ---
const METRICS = [
  { id: 1, label: 'Actividades de hoy', value: '2/3', subtext: '¡Casi listo!', icon: CheckCircle2, color: 'text-fox-green', bg: 'bg-fox-green/10' },
  { id: 2, label: 'Tiempo con Foxy', value: '45 min', subtext: '+15 min vs ayer', icon: Clock, color: 'text-fox-purple', bg: 'bg-fox-purple/10' },
  { id: 3, label: 'Precisión global', value: '85%', subtext: 'Excelente nivel', icon: Target, color: 'text-fox-primary', bg: 'bg-fox-primary/10' },
];

const SUBJECTS = [
  { id: 'c1', name: 'Literatura', teacher: 'Profa. Martínez', progress: 75, nextTask: 'Ensayo (Mañana)', color: 'bg-fox-purple', text: 'text-fox-purple' },
  { id: 'c3', name: 'Matemáticas', teacher: 'Prof. Silva', progress: 40, nextTask: 'Quiz (Viernes)', color: 'bg-fox-orange', text: 'text-fox-orange' },
  { id: 'c2', name: 'Historia', teacher: 'Prof. Gómez', progress: 90, nextTask: 'Mapa (Semana próx)', color: 'bg-fox-primary', text: 'text-fox-primary' },
  { id: 'c4', name: 'Ciencias', teacher: 'Profa. Ruiz', progress: 60, nextTask: 'Sin tareas', color: 'bg-fox-green', text: 'text-fox-green' },
];

const UPCOMING_TASKS = [
  { id: 1, title: 'Ensayo Vanguardias', subject: 'Literatura', date: 'Mañana, 23:59', type: 'assignment', urgent: true, aulaId: 'c1' },
  { id: 2, title: 'Quiz Fracciones', subject: 'Matemáticas', date: 'Viernes, 10:00', type: 'quiz', urgent: false, aulaId: 'c3' },
  { id: 3, title: 'Mapa conceptual', subject: 'Historia', date: 'Lun 15, 08:00', type: 'project', urgent: false, aulaId: 'c2' },
];

export function DashboardAlumno() {
  const { setView } = useAppContext();
  const [completedTasks, setCompletedTasks] = useState<number[]>([]);
  const [expandedTask, setExpandedTask] = useState<number | null>(null);

  // Modal State for Express Questions
  const [showExpressModal, setShowExpressModal] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);

  const expressQuestions = [
    { q: "¿Cuál es el resultado de 8 x 7?", options: ["54", "56", "64", "48"], answer: 1 },
    { q: "¿En qué año comenzó la Revolución Francesa?", options: ["1789", "1776", "1812", "1492"], answer: 0 },
    { q: "¿Cuál es el elemento químico con símbolo 'O'?", options: ["Oro", "Osmio", "Oxígeno", "Oganesón"], answer: 2 }
  ];

  const handleOptionClick = (index: number) => {
    setSelectedOption(index);
    setTimeout(() => {
      if (currentQuestion < expressQuestions.length - 1) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setQuizFinished(true);
      }
    }, 800);
  };

  const resetQuiz = () => {
    setShowExpressModal(false);
    setTimeout(() => {
      setCurrentQuestion(0);
      setQuizFinished(false);
      setSelectedOption(null);
    }, 300);
  };

  const toggleTaskCompletion = (taskId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTasks(prev => 
      prev.includes(taskId) ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.05 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 400, damping: 30 } }
  };

  return (
    <>
      {/* Abstract Geometric Background Pattern (Max 5% opacity) */}
      <div 
        className="fixed inset-0 pointer-events-none z-[-1] opacity-[0.03]" 
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M40 0l40 40-40 40L0 40z' fill='%231F3F6D' fill-opacity='1' fill-rule='evenodd'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 80px'
        }}
      />
      
      <motion.div 
        className="max-w-7xl mx-auto space-y-6 pb-20 md:pb-0 relative z-10"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
      {/* HEADER */}
      <motion.header variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
        <div>
          <p className="text-fox-purple font-bold text-xs uppercase tracking-widest mb-1">Panel de Control</p>
          <h1 className="text-3xl font-heading font-bold text-fox-text-main">¡Hola, Valentina! 👋</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-fox-surface px-4 py-2.5 rounded-xl border border-fox-border shadow-sm">
            <Flame className="text-fox-gold" size={20} fill="currentColor" />
            <div>
              <span className="block text-[10px] font-bold text-fox-text-muted uppercase leading-none mb-0.5">Racha</span>
              <span className="block font-bold text-fox-text-main leading-none">7 días</span>
            </div>
          </div>
        </div>
      </motion.header>

      {/* BENTO GRID LAYOUT */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN (Main Content) */}
        <div className="xl:col-span-8 space-y-6">
          
          {/* HERO: Foxy Suggestion */}
          <motion.div variants={itemVariants} className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-fox-purple to-fox-gold rounded-[2rem] blur opacity-30 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="bg-fox-purple rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-sm">
              {/* Abstract Background Elements */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-fox-surface opacity-5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <div className="absolute bottom-0 left-1/4 w-40 h-40 bg-fox-gold opacity-10 rounded-full blur-2xl pointer-events-none"></div>
              
              <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <Sparkles className="text-fox-gold" size={20} />
                    <h2 className="font-heading font-bold text-xl">Foxy te sugiere</h2>
                  </div>
                  <p className="text-purple-100 text-sm md:text-base leading-relaxed max-w-2xl">
                    He notado que tienes un <strong>Quiz de Fracciones</strong> este viernes. He preparado una sesión de repaso interactiva de 15 minutos adaptada a tu estilo de aprendizaje visual.
                  </p>
                </div>
                <button 
                  onClick={() => setView('estudia')}
                  className="whitespace-nowrap px-6 py-3 bg-fox-surface text-fox-purple font-bold rounded-xl hover:bg-fox-bg transition-colors shadow-sm flex items-center gap-2 group min-h-[44px]"
                >
                  <Brain size={18} className="group-hover:scale-110 transition-transform" />
                  Iniciar Repaso
                </button>
              </div>
            </div>
          </motion.div>

          {/* QUICK ACCESS BUTTONS */}
          <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6 px-2 md:px-4">
            <button onClick={() => setView('estudia')} className="relative overflow-hidden bg-fox-purple text-white p-4 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group shadow-md hover:shadow-lg border border-fox-surface/10 aspect-square">
              <div className="absolute -top-8 -left-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
              <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}></div>
              <Brain size={44} className="relative z-10 group-hover:-translate-y-1 transition-transform drop-shadow-md" />
              <span className="relative z-10 font-bold text-sm drop-shadow-md text-center leading-tight">Carpeta de<br/>Estudio</span>
            </button>
            <button onClick={() => setView('aulas')} className="relative overflow-hidden bg-fox-primary text-white p-4 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group shadow-md hover:shadow-lg border border-fox-surface/10 aspect-square">
              <div className="absolute -top-8 -left-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
              <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}></div>
              <BookOpen size={44} className="relative z-10 group-hover:-translate-y-1 transition-transform drop-shadow-md" />
              <span className="relative z-10 font-bold text-sm drop-shadow-md">Mis Aulas</span>
            </button>
            <button onClick={() => setView('progreso')} className="relative overflow-hidden bg-fox-orange text-white p-4 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group shadow-md hover:shadow-lg border border-fox-surface/10 aspect-square">
              <div className="absolute -top-8 -left-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
              <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}></div>
              <Flame size={44} className="relative z-10 group-hover:-translate-y-1 transition-transform drop-shadow-md" />
              <span className="relative z-10 font-bold text-sm drop-shadow-md">Mi progreso</span>
            </button>
            <button onClick={() => setShowExpressModal(true)} className="relative overflow-hidden bg-fox-green text-white p-4 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group shadow-md hover:shadow-lg border border-fox-surface/10 aspect-square">
              <div className="absolute -top-8 -left-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
              <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}></div>
              <Target size={44} className="relative z-10 group-hover:-translate-y-1 transition-transform drop-shadow-md" />
              <span className="relative z-10 font-bold text-sm drop-shadow-md">Desafíos</span>
            </button>
            <button onClick={() => setView('mensajes')} className="relative overflow-hidden bg-[#5AB0F5] text-white p-4 rounded-3xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-105 group shadow-md hover:shadow-lg border border-fox-surface/10 aspect-square">
              <div className="absolute -top-8 -left-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12" style={{ borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' }}></div>
              <div className="absolute -bottom-8 -right-8 w-20 h-20 bg-fox-surface/15 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-12" style={{ borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' }}></div>
              <MessageSquare size={44} className="relative z-10 group-hover:-translate-y-1 transition-transform drop-shadow-md" />
              <span className="relative z-10 font-bold text-sm drop-shadow-md">Mensajes</span>
            </button>
          </motion.div>

          {/* QUICK STATS / GAMIFICATION (Moved and Redesigned) */}
          <motion.div 
            variants={itemVariants} 
            onClick={() => setView('progreso')}
            className="cursor-pointer bg-fox-surface rounded-3xl border border-fox-orange/20 shadow-sm p-6 relative overflow-hidden hover:border-fox-orange/40 hover:shadow-md transition-all group"
          >
            <div className="absolute right-0 top-0 w-32 h-full bg-gradient-to-l from-fox-orange/5 to-transparent pointer-events-none"></div>
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-fox-orange/10 rounded-xl text-fox-orange">
                  <Trophy size={24} />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-fox-text-main text-lg">Resumen Semanal</h3>
                  <p className="text-sm text-fox-text-muted">¡Estás en el top 10% de tu clase!</p>
                </div>
              </div>
              
              <div className="w-full md:w-1/2">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-bold text-fox-text-main/80">Nivel 4</span>
                  <span className="font-bold text-fox-orange">1,250 / 1,500 XP</span>
                </div>
                <div className="w-full bg-fox-border/50 rounded-full h-2.5 overflow-hidden">
                  <motion.div 
                    className="bg-gradient-to-r from-fox-gold to-fox-orange h-2.5 rounded-full" 
                    initial={{ width: 0 }}
                    animate={{ width: '83%' }}
                    transition={{ duration: 1.5, ease: "easeOut", delay: 0.2 }}
                  />
                </div>
                <p className="text-[10px] font-bold text-fox-text-muted/70 mt-1.5 text-right uppercase tracking-wider">Faltan 250 XP para el Nivel 5</p>
              </div>
            </div>
          </motion.div>

          {/* METRICS ROW */}
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {METRICS.map((metric) => (
              <div key={metric.id} className="bg-fox-surface p-5 rounded-3xl border border-fox-border shadow-sm flex items-start gap-4 hover:border-fox-border transition-colors h-full">
                <div className={`p-3 rounded-xl ${metric.bg} ${metric.color} shrink-0`}>
                  <metric.icon size={22} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-0.5 truncate">{metric.label}</p>
                  <div className="flex flex-wrap items-baseline gap-2">
                    <p className="font-bold text-fox-text-main text-3xl leading-none whitespace-nowrap">{metric.value}</p>
                  </div>
                  <p className="text-xs text-fox-text-muted/70 mt-1 whitespace-nowrap truncate">{metric.subtext}</p>
                </div>
              </div>
            ))}
          </motion.div>

          {/* SUBJECTS GRID */}
          <motion.div variants={itemVariants} className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-heading font-bold text-fox-text-main">Mis Materias</h3>
              <button onClick={() => setView('aulas')} className="text-sm font-bold text-fox-purple hover:text-fox-purple/80 flex items-center gap-1 transition-colors">
                Ver todas <ArrowRight size={16} />
              </button>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {SUBJECTS.map((subject) => (
                <div 
                  key={subject.id} 
                  onClick={() => setView('aulas', { aulaId: subject.id })}
                  className="bg-fox-surface p-5 rounded-3xl border border-fox-border shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-bold text-fox-text-main text-base group-hover:text-fox-purple transition-colors">{subject.name}</h4>
                      <p className="text-xs text-fox-text-muted">{subject.teacher}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${subject.color.replace('bg-', 'bg-').replace('fox-', 'fox-')}/10 flex items-center justify-center ${subject.text}`}>
                      <BookOpen size={16} />
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-4">
                    <div className="flex justify-between text-xs mb-1.5">
                      <span className="font-medium text-fox-text-muted">Progreso del curso</span>
                      <span className="font-bold text-fox-text-main">{subject.progress}%</span>
                    </div>
                    <div className="w-full bg-fox-border/50 rounded-full h-1.5 overflow-hidden">
                      <motion.div 
                        className={`h-full rounded-full ${subject.color}`} 
                        initial={{ width: 0 }}
                        animate={{ width: `${subject.progress}%` }}
                        transition={{ duration: 1.5, ease: "easeOut", delay: 0.1 }}
                      />
                    </div>
                  </div>

                  <div className="bg-fox-bg rounded-xl p-3 text-xs border border-fox-border flex items-center justify-between">
                    <span className="text-fox-text-muted font-medium">Próxima tarea:</span>
                    <span className="font-bold text-fox-text-main">{subject.nextTask}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>

        {/* RIGHT COLUMN (Sidebar) */}
        <div className="xl:col-span-4 space-y-6">
          
          {/* UPCOMING TASKS TIMELINE */}
          <motion.div variants={itemVariants} className="bg-fox-surface rounded-3xl border border-fox-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-heading font-bold text-fox-text-main">Agenda</h3>
              <button 
                onClick={() => setView('aulas')}
                className="p-2 hover:bg-fox-bg rounded-lg transition-colors text-fox-text-muted/70 hover:text-fox-purple"
                title="Ver todas las tareas"
              >
                <Calendar size={18} />
              </button>
            </div>

            <div className="space-y-6">
              {UPCOMING_TASKS.length === completedTasks.length ? (
                <motion.div initial={{opacity: 0, scale: 0.9}} animate={{opacity: 1, scale: 1}} className="text-center py-8 bg-fox-bg rounded-2xl border border-fox-border">
                  <div className="w-16 h-16 bg-fox-green/10 text-fox-green rounded-full flex items-center justify-center mx-auto mb-3">
                    <Trophy size={32} />
                  </div>
                  <h4 className="font-bold text-fox-text-main">¡Todo listo!</h4>
                  <p className="text-sm text-fox-text-muted mt-1 px-4">Has completado todas tus tareas pendientes. ¡Excelente trabajo!</p>
                </motion.div>
              ) : (
                UPCOMING_TASKS.map((task, index) => {
                  const isCompleted = completedTasks.includes(task.id);
                  const isExpanded = expandedTask === task.id;

                  return (
                    <div 
                      key={task.id} 
                      className={`relative flex gap-4 cursor-pointer group transition-opacity ${isCompleted ? 'opacity-60' : 'opacity-100'}`}
                      onClick={() => setExpandedTask(isExpanded ? null : task.id)}
                    >
                    {/* Timeline Line */}
                    {index !== UPCOMING_TASKS.length - 1 && (
                      <div className="absolute left-[19px] top-10 bottom-[-24px] w-px bg-fox-border/50"></div>
                    )}
                    
                    {/* Icon / Checkbox */}
                    <button 
                      onClick={(e) => toggleTaskCompletion(task.id, e)}
                      className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-4 border-fox-surface transition-all hover:scale-110 ${
                        isCompleted 
                          ? 'bg-fox-green text-white' 
                          : task.urgent 
                            ? 'bg-fox-orange/10 text-fox-orange hover:bg-fox-orange hover:text-white' 
                            : 'bg-fox-bg text-fox-text-muted/70 hover:bg-fox-primary hover:text-white'
                      }`}
                    >
                      {isCompleted ? <CheckCircle2 size={18} /> : (task.type === 'quiz' ? <Target size={16} /> : <FileText size={16} />)}
                    </button>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`font-bold text-sm transition-colors ${isCompleted ? 'text-fox-text-muted line-through' : 'text-fox-text-main group-hover:text-fox-purple'}`}>
                          {task.title}
                        </h4>
                        {task.urgent && !isCompleted && (
                          <span className="bg-fox-orange/10 text-fox-orange text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">
                            Urgente
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-fox-text-muted mb-2">{task.subject}</p>
                      <div className="flex items-center gap-1.5 text-xs font-medium text-fox-text-muted bg-fox-bg inline-flex px-2.5 py-1 rounded-md">
                        <Clock size={12} />
                        {task.date}
                      </div>

                      {/* Expanded Details */}
                      <AnimatePresence>
                        {isExpanded && !isCompleted && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="flex gap-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setView('aulas', { aulaId: task.aulaId }); }}
                                className="flex-1 bg-fox-bg hover:bg-fox-purple/10 text-fox-text-main/80 hover:text-fox-purple text-xs font-bold py-2 rounded-lg transition-colors border border-fox-border hover:border-fox-purple/30"
                              >
                                Ir al aula
                              </button>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setView('estudia'); }}
                                className="flex-1 bg-fox-purple/10 hover:bg-fox-purple/20 text-fox-purple text-xs font-bold py-2 rounded-lg transition-colors flex items-center justify-center gap-1"
                              >
                                <Brain size={14} /> Foxy
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })
              )}
            </div>

            <button onClick={() => setView('aulas')} className="w-full mt-6 py-2.5 border border-fox-border text-fox-text-muted font-bold text-sm rounded-xl hover:bg-fox-bg transition-colors min-h-[44px]">
              Ver todas las tareas
            </button>
          </motion.div>

          {/* RECENT ACHIEVEMENTS */}
          <motion.div variants={itemVariants} className="bg-fox-surface rounded-3xl border border-fox-border shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-heading font-bold text-fox-text-main">Logros Recientes</h3>
              <button 
                onClick={() => setView('progreso')}
                className="text-sm font-bold text-fox-purple hover:text-fox-purple/80 transition-colors"
              >
                Ver todos
              </button>
            </div>
            <div className="space-y-3">
              {mockAchievements.filter(a => a.earned).slice(0, 3).map(achievement => (
                <div 
                  key={achievement.id} 
                  onClick={() => setView('progreso')}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-fox-bg border border-fox-border hover:border-fox-gold/30 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-full bg-fox-surface shadow-sm flex items-center justify-center text-xl">
                    {achievement.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-fox-text-main text-sm">{achievement.title}</h4>
                    {achievement.description && <p className="text-xs text-fox-text-muted">{achievement.description}</p>}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

        </div>
      </div>

      {/* EXPRESS QUESTIONS MODAL */}
      <AnimatePresence>
        {showExpressModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }} 
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
              onClick={resetQuiz}
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: 20 }} 
              className="relative w-full max-w-md bg-fox-surface rounded-3xl shadow-xl overflow-hidden"
            >
              <div className="bg-fox-green p-6 text-white text-center relative overflow-hidden">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-fox-surface/10 rounded-full blur-2xl"></div>
                <Target size={48} className="mx-auto mb-3 opacity-90" />
                <h2 className="text-2xl font-heading font-bold">Desafío Express</h2>
                <p className="text-fox-green-50 opacity-90 text-sm mt-1">¡Gana puntos extra respondiendo rápido!</p>
              </div>
              
              <div className="p-6">
                {!quizFinished ? (
                  <>
                    <div className="flex justify-between items-center mb-6 text-sm font-bold text-fox-text-muted">
                      <span>Pregunta {currentQuestion + 1} de {expressQuestions.length}</span>
                      <div className="flex gap-1">
                        {expressQuestions.map((_, idx) => (
                          <div key={idx} className={`h-2 w-8 rounded-full ${idx === currentQuestion ? 'bg-fox-green' : idx < currentQuestion ? 'bg-fox-green/30' : 'bg-fox-border'}`} />
                        ))}
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-fox-text-main mb-6 text-center">
                      {expressQuestions[currentQuestion].q}
                    </h3>
                    
                    <div className="space-y-3">
                      {expressQuestions[currentQuestion].options.map((opt, idx) => {
                        const isSelected = selectedOption === idx;
                        const isCorrect = idx === expressQuestions[currentQuestion].answer;
                        const showResult = selectedOption !== null;
                        
                        let btnClass = "w-full p-4 rounded-2xl border-2 text-left font-bold transition-all min-h-[44px] ";
                        
                        if (!showResult) {
                          btnClass += "border-fox-border hover:border-fox-green hover:bg-fox-green/5 text-fox-text-main/80";
                        } else if (isSelected && isCorrect) {
                          btnClass += "border-fox-green bg-fox-green text-white";
                        } else if (isSelected && !isCorrect) {
                          btnClass += "border-red-500 bg-red-500 text-white";
                        } else if (isCorrect) {
                          btnClass += "border-fox-green bg-fox-green/10 text-fox-green";
                        } else {
                          btnClass += "border-fox-border text-fox-text-muted/70 opacity-50";
                        }

                        return (
                          <button 
                            key={idx}
                            disabled={showResult}
                            onClick={() => handleOptionClick(idx)}
                            className={btnClass}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <div className="w-20 h-20 bg-fox-gold/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Trophy size={40} className="text-fox-gold" />
                    </div>
                    <h3 className="text-2xl font-bold text-fox-text-main mb-2">¡Desafío Completado!</h3>
                    <p className="text-fox-text-muted mb-6">Has ganado +15 puntos de experiencia.</p>
                    <button 
                      onClick={resetQuiz}
                      className="w-full bg-fox-green text-white font-bold py-3 rounded-xl hover:bg-fox-green/90 transition-colors min-h-[44px]"
                    >
                      Volver al Inicio
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </motion.div>
    </>
  );
}
