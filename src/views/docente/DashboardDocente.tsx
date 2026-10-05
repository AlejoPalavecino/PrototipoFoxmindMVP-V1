import React, { useState } from 'react';
import { mockStudentsRisk } from '../../mockData';
import { AlertTriangle, BrainCircuit, Calendar, Users, ArrowRight, TrendingUp, BookOpen, Sparkles, BarChart3, MessageSquare, CheckCircle2, Clock, ChevronDown, ChevronUp, AlignLeft, X, Send, Settings, Search, Edit3, Reply, ArrowLeft } from 'lucide-react';
import { useAppContext } from '../../context';
import { motion, AnimatePresence, Variants } from 'motion/react';
import { toast } from '../../components/ui/Toaster';

export function DashboardDocente() {
  const { setView } = useAppContext();
  const [expandedClassId, setExpandedClassId] = useState<number | null>(null);
  
  // Modal states
  const [contactStudent, setContactStudent] = useState<any | null>(null);
  const [profileStudent, setProfileStudent] = useState<any | null>(null);
  const [showAllRisks, setShowAllRisks] = useState(false);

  const today = new Date().toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' });

  const mockPendingTasks = [
    { id: 1, title: 'Ensayo: Vanguardias Literarias', subject: 'Literatura 3°A', pending: 8, total: 28, due: 'Ayer' },
    { id: 2, title: 'Análisis: Cien años de soledad', subject: 'Literatura 3°B', pending: 4, total: 30, due: 'Hace 2 días' }
  ];

  const mockTodaysClasses = [
    { id: 1, subject: 'Literatura 3°A', time: '08:00 - 09:30', room: 'Aula 204', type: 'Teoría', duration: '90 min', description: 'Introducción a las Vanguardias Literarias. Lectura del manifiesto Creacionista.' },
    { id: 2, subject: 'Literatura 3°B', time: '10:00 - 11:30', room: 'Aula 205', type: 'Práctica', duration: '90 min', description: 'Taller de escritura: Aplicación de técnicas del Realismo Mágico en relatos cortos.' },
  ];

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 }
    }
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } }
  };

  return (
    <motion.div 
      className="space-y-6 pb-20 md:pb-0"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* Welcome Banner */}
      <motion.div variants={itemVariants} className="relative overflow-hidden bg-gradient-to-r from-fox-primary to-[#2A528A] rounded-3xl p-8 text-white shadow-md">
        <div className="absolute top-0 right-0 w-64 h-64 bg-fox-surface/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-fox-purple/20 rounded-full blur-2xl translate-y-1/3 -translate-x-1/4"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h2 className="text-3xl font-heading font-bold mb-2">¡Buenos días, Prof. Martínez! 👋</h2>
            <p className="text-blue-100 text-lg capitalize">{today}</p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setView('copiloto')} className="bg-fox-surface text-fox-primary px-5 py-2.5 rounded-xl font-medium flex items-center gap-2 hover:bg-fox-primary/10 transition-colors shadow-sm min-h-[44px]">
              <Sparkles size={18} className="text-fox-orange" />
              Planificar con IA
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Links (Horizontal) */}
      <motion.div variants={itemVariants} className="flex flex-wrap md:flex-nowrap gap-4 overflow-x-auto pb-2 -mx-4 px-4 md:mx-0 md:px-0 md:pb-0 md:overflow-visible scrollbar-hide">
        <QuickLinkButtonHorizontal 
          icon={Calendar} 
          label="Agenda" 
          bgClass="bg-fox-primary" 
          onClick={() => setView('agenda')} 
        />
        <QuickLinkButtonHorizontal 
          icon={Users} 
          label="Mis Aulas" 
          bgClass="bg-fox-orange" 
          onClick={() => setView('aulas')} 
        />
        <QuickLinkButtonHorizontal 
          icon={BarChart3} 
          label="Reportes" 
          bgClass="bg-fox-purple" 
          onClick={() => setView('progreso')} 
        />
        <QuickLinkButtonHorizontal 
          icon={MessageSquare} 
          label="Mensajes" 
          bgClass="bg-fox-green" 
          onClick={() => setView('mensajes')} 
        />
        <QuickLinkButtonHorizontal 
          icon={Settings} 
          label="Configuración" 
          bgClass="bg-slate-700" 
          onClick={() => setView('config')} 
        />
      </motion.div>

      {/* Stats Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Alumnos activos" value="47 / 60" trend="+8%" icon={Users} color="text-fox-green" bg="bg-fox-green/10" />
        <StatCard title="Tareas para revisar" value="12" icon={BookOpen} color="text-fox-orange" bg="bg-fox-orange/10" />
        <StatCard title="Alertas de riesgo" value="3" subtitle="alumnos" icon={AlertTriangle} color="text-fox-red" bg="bg-fox-red/10" />
        <StatCard title="Consultas Foxy" value="89" subtitle="hoy" icon={BrainCircuit} color="text-fox-purple" bg="bg-fox-purple/10" />
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column (2/3) - Risk Dashboard */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <section className="bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
                  Semáforo de Riesgo
                </h3>
                <p className="text-sm text-fox-text-muted mt-1">Alumnos que requieren atención prioritaria</p>
              </div>
              <button 
                onClick={() => setShowAllRisks(true)}
                className="text-sm font-medium text-fox-primary hover:text-fox-primary/80 flex items-center gap-1 min-h-[44px]"
              >
                Ver todos <ArrowRight size={16} />
              </button>
            </div>
            
            {mockStudentsRisk.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs uppercase tracking-wider text-fox-text-muted/70 border-b border-fox-border">
                      <th className="pb-3 font-medium">Alumno</th>
                      <th className="pb-3 font-medium">Nivel de Riesgo</th>
                      <th className="pb-3 font-medium">Motivo Principal</th>
                      <th className="pb-3 font-medium text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {mockStudentsRisk.map(student => (
                      <tr key={student.id} className="group hover:bg-fox-bg/50 transition-colors">
                        <td className="py-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-fox-text-muted shadow-inner">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </div>
                            <div>
                              <p className="font-medium text-fox-text-main group-hover:text-fox-primary transition-colors">{student.name}</p>
                              <p className="text-xs text-fox-text-muted">{student.course}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 pr-4">
                          <div className="flex items-center">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                              student.riskLevel === 'ALTO' ? 'bg-[#E74C3C]/10 text-[#E74C3C] border border-[#E74C3C]/20' : 
                              student.riskLevel === 'MEDIO' ? 'bg-[#F1C40F]/10 text-[#F9A825] border border-[#F1C40F]/20' : 'bg-[#3BB54A]/10 text-[#3BB54A] border border-[#3BB54A]/20'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                student.riskLevel === 'ALTO' ? 'bg-[#E74C3C] animate-pulse' : 
                                student.riskLevel === 'MEDIO' ? 'bg-[#F1C40F]' : 'bg-[#3BB54A]'
                              }`}></div>
                              {student.riskLevel}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 pr-4 text-sm text-fox-text-muted">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={14} className={student.riskLevel === 'ALTO' ? 'text-[#E74C3C]' : student.riskLevel === 'MEDIO' ? 'text-[#F1C40F]' : 'text-[#3BB54A]'} />
                            {student.reason}
                          </div>
                        </td>
                        <td className="py-4 text-right">
                          <button 
                            onClick={() => {
                              if (student.riskLevel === 'ALTO' || student.riskLevel === 'MEDIO') {
                                setContactStudent(student);
                              } else {
                                setProfileStudent(student);
                              }
                            }}
                            className={`text-sm font-bold px-4 py-2 min-h-[44px] rounded-xl transition-colors ${
                              student.riskLevel === 'ALTO' || student.riskLevel === 'MEDIO'
                                ? 'bg-[#1F3F6D] text-white hover:bg-[#1F3F6D]/90 shadow-sm' 
                                : 'bg-fox-border/50 text-fox-text-main/80 hover:bg-fox-border'
                            }`}
                          >
                            {student.riskLevel === 'ALTO' || student.riskLevel === 'MEDIO' ? 'Contactar' : 'Ver perfil'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center bg-fox-bg rounded-2xl border border-fox-border border-dashed">
                <div className="w-16 h-16 bg-fox-green/10 text-fox-green rounded-full flex items-center justify-center mb-4">
                  <CheckCircle2 size={32} />
                </div>
                <h4 className="text-lg font-bold text-fox-text-main mb-1">¡Todo en orden!</h4>
                <p className="text-sm text-fox-text-muted max-w-sm">Actualmente no tienes alumnos con alertas de riesgo. ¡Excelente trabajo de seguimiento!</p>
              </div>
            )}
          </section>

          {/* Tareas por Revisar */}
          <section className="bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6 md:p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
                  Tareas por Revisar
                </h3>
                <p className="text-sm text-fox-text-muted mt-1">Entregas pendientes de corrección</p>
              </div>
              <button onClick={() => { setView('aulas'); }} className="text-sm font-medium text-fox-primary hover:text-fox-primary/80 flex items-center gap-1 min-h-[44px]">
                Ir a correcciones <ArrowRight size={16} />
              </button>
            </div>
            <div className="space-y-4">
              {mockPendingTasks.map(task => (
                <div key={task.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-fox-border rounded-2xl hover:shadow-sm transition-all group">
                  <div className="flex items-start gap-4 mb-3 md:mb-0">
                    <div className="w-12 h-12 rounded-xl bg-fox-orange/10 text-fox-orange flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <BookOpen size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-fox-text-main group-hover:text-fox-primary transition-colors">{task.title}</h4>
                      <p className="text-xs text-fox-text-muted mt-1">{task.subject} • Venció {task.due}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <p className="text-sm font-bold text-fox-text-main">{task.pending} <span className="text-fox-text-muted/70 font-normal">/ {task.total}</span></p>
                      <p className="text-[10px] text-fox-text-muted uppercase tracking-wider">Sin corregir</p>
                    </div>
                    <button 
                      onClick={() => {
                        setView('aulas', { 
                          openTask: true, 
                          subject: task.subject, 
                          taskTitle: task.title 
                        });
                      }}
                      className="px-4 py-2 bg-fox-bg hover:bg-fox-primary hover:text-white text-fox-text-main/80 text-sm font-bold rounded-xl transition-colors shrink-0"
                    >
                      Corregir
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </motion.div>

        {/* Right Column (1/3) - Quick Actions & Mini Copilot */}
        <motion.div variants={itemVariants} className="space-y-6">
          
          {/* Clases de Hoy */}
          <section className="bg-fox-surface rounded-3xl shadow-sm border border-fox-border p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-heading font-bold text-fox-text-main">Clases de Hoy</h3>
              <span className="text-xs font-bold text-fox-primary bg-fox-primary/10 px-2.5 py-1 rounded-lg">{mockTodaysClasses.length} clases</span>
            </div>
            <div className="space-y-3">
              {mockTodaysClasses.map(cls => (
                <div 
                  key={cls.id} 
                  onClick={() => setExpandedClassId(expandedClassId === cls.id ? null : cls.id)}
                  className="p-4 border border-fox-border rounded-2xl hover:border-fox-primary/30 transition-colors flex flex-col gap-3 group cursor-pointer"
                >
                  <div className="flex gap-3">
                    <div className="w-1.5 h-auto bg-fox-primary rounded-full shrink-0 group-hover:bg-fox-orange transition-colors"></div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-sm text-fox-text-main group-hover:text-fox-primary transition-colors">{cls.subject}</h4>
                        {expandedClassId === cls.id ? <ChevronUp size={16} className="text-fox-text-muted/70" /> : <ChevronDown size={16} className="text-fox-text-muted/70" />}
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-fox-text-muted font-medium">
                        <span className="flex items-center gap-1"><Clock size={12} className="text-fox-text-muted/70" /> {cls.time}</span>
                        <span>{cls.room}</span>
                      </div>
                    </div>
                  </div>
                  
                  <AnimatePresence>
                    {expandedClassId === cls.id && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-1 border-t border-gray-50 flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-xs text-fox-text-muted">
                            <span className="bg-fox-border/50 px-2 py-1 rounded-md font-medium">{cls.type}</span>
                            <span className="text-fox-text-muted/70">•</span>
                            <span>{cls.duration}</span>
                          </div>
                          <p className="text-sm text-fox-text-muted flex items-start gap-2 mt-1">
                            <AlignLeft size={14} className="text-fox-text-muted/70 shrink-0 mt-0.5" />
                            {cls.description}
                          </p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))}
            </div>
            <button onClick={() => setView('agenda')} className="w-full mt-4 py-2.5 text-sm font-bold text-fox-text-muted border border-fox-border rounded-xl hover:bg-fox-bg transition-colors">
              Ver agenda completa
            </button>
          </section>

          {/* AI Copilot Mini Widget */}
          <section className="bg-gradient-to-b from-fox-purple/5 to-fox-surface rounded-3xl shadow-sm border border-fox-purple/10 p-6">
            <div className="w-12 h-12 rounded-2xl bg-fox-purple/10 flex items-center justify-center text-fox-purple mb-4">
              <BrainCircuit size={24} />
            </div>
            <h3 className="text-lg font-heading font-bold text-fox-text-main mb-2">Copiloto IA</h3>
            <p className="text-sm text-fox-text-muted mb-6">Tu asistente pedagógico está listo para ayudarte a planificar.</p>
            
            <div className="space-y-3">
              <button onClick={() => setView('copiloto', { initialPrompt: 'Actúa como mi asistente pedagógico. Quiero crear una secuencia didáctica estructurada con enfoque DUA (Diseño Universal para el Aprendizaje) para mi próxima clase.' })} className="w-full text-left px-4 py-3 bg-fox-surface border border-fox-border rounded-xl text-sm font-medium text-fox-text-main/80 hover:border-fox-purple/30 hover:shadow-sm transition-all flex items-center justify-between group min-h-[44px]">
                Crear secuencia didáctica
                <ArrowRight size={16} className="text-fox-text-muted/70 group-hover:text-fox-purple transition-colors" />
              </button>
              <button onClick={() => setView('copiloto', { initialPrompt: 'Tengo un texto que necesito adaptar para mis alumnos. Necesito que apliques Diseño Universal para el Aprendizaje (DUA) generando tres versiones: simplificada (lectura fácil), viñetas, y resumen avanzado.' })} className="w-full text-left px-4 py-3 bg-fox-surface border border-fox-border rounded-xl text-sm font-medium text-fox-text-main/80 hover:border-fox-purple/30 hover:shadow-sm transition-all flex items-center justify-between group min-h-[44px]">
                Adaptar texto con DUA
                <ArrowRight size={16} className="text-fox-text-muted/70 group-hover:text-fox-purple transition-colors" />
              </button>
            </div>
          </section>
        </motion.div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {contactStudent && <ContactStudentModal student={contactStudent} onClose={() => setContactStudent(null)} />}
        {profileStudent && <StudentProfileModal student={profileStudent} onClose={() => setProfileStudent(null)} />}
        {showAllRisks && <AllRisksModal onClose={() => setShowAllRisks(false)} />}
      </AnimatePresence>
    </motion.div>
  );
}

// --- Modals Components ---

function ContactStudentModal({ student, onClose }: { student: any, onClose: () => void }) {
  const [subject, setSubject] = useState(`Seguimiento académico - ${student.name}`);
  const [message, setMessage] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerateAI = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setMessage(`Estimada familia de ${student.name},\n\nMe comunico con ustedes porque he notado que ${student.name} ha estado presentando dificultades recientemente, específicamente: ${student.reason.toLowerCase()}.\n\nMe gustaría que podamos coordinar una breve reunión para conversar sobre cómo podemos apoyar a ${student.name} desde la escuela y desde casa para revertir esta situación.\n\nQuedo a su entera disposición.\n\nSaludos cordiales,\nProf. Martínez`);
      setIsGenerating(false);
    }, 1500);
  };

  const handleSend = () => {
    if (!message.trim()) return;
    toast.show('Informe enviado a la familia y gabinete', 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col border border-fox-border"
      >
        <div className="p-5 border-b border-fox-border bg-fox-bg/50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-fox-primary/10 text-fox-primary flex items-center justify-center">
              <MessageSquare size={20} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-fox-text-main leading-tight">Redactar Mensaje</h3>
              <p className="text-xs text-fox-text-muted">Intervención temprana sugerida</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-5 flex flex-col gap-4">
          {/* Email Headers */}
          <div className="space-y-3 bg-fox-surface border border-fox-border rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
              <span className="text-sm font-medium text-fox-text-muted w-14">Para:</span>
              <div className="flex gap-2">
                <span className="text-xs font-bold bg-[#1F3F6D]/10 text-[#1F3F6D] px-2.5 py-1 rounded-md border border-[#1F3F6D]/20">Tutores ({student.name})</span>
              </div>
            </div>
            <div className="flex items-center gap-3 border-b border-gray-50 pb-2">
              <span className="text-sm font-medium text-fox-text-muted w-14">CC:</span>
              <div className="flex gap-2">
                <span className="text-xs font-medium bg-fox-border/50 text-fox-text-muted px-2.5 py-1 rounded-md">Gabinete Psicopedagógico</span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <span className="text-sm font-medium text-fox-text-muted w-14">Asunto:</span>
              <input 
                type="text" 
                value={subject} 
                onChange={(e) => setSubject(e.target.value)} 
                className="flex-1 bg-transparent text-sm font-bold text-fox-text-main focus:outline-none"
              />
            </div>
          </div>

          <div className="relative">
            <textarea 
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Escribe tu mensaje o usa Foxy para generar un borrador empático..."
              className="w-full h-48 lg:h-56 p-4 pt-14 border border-fox-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-fox-primary/50 text-sm text-fox-text-main/90 bg-fox-surface shadow-inner"
            />
            <div className="absolute top-2 left-2 right-2 flex justify-between">
               <button 
                onClick={handleGenerateAI}
                disabled={isGenerating}
                className="py-1.5 px-3 bg-fox-purple/10 border border-fox-purple/10 text-fox-purple hover:bg-fox-purple/20 rounded-lg font-bold text-xs flex items-center gap-2 transition-all shadow-sm"
              >
                {isGenerating ? (
                  <><div className="w-3.5 h-3.5 border-2 border-fox-purple border-t-transparent rounded-full animate-spin"></div> Redactando...</>
                ) : (
                  <><Sparkles size={14} /> Redactar con tono empático (Foxy)</>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-fox-border flex justify-between items-center bg-fox-bg/50">
          <span className="text-xs flex items-center gap-1 font-medium text-[#E74C3C]">
            <AlertTriangle size={14} /> Motivo: {student.reason}
          </span>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors">
              Descartar
            </button>
            <button onClick={handleSend} className="px-5 py-2.5 text-sm font-bold text-white bg-fox-primary hover:bg-fox-primary/90 rounded-xl transition-colors flex items-center gap-2 shadow-sm hover:shadow-md">
              <Send size={16} /> Enviar Informe
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function StudentProfileModal({ student, onClose }: { student: any, onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface rounded-3xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
      >
        <div className="p-6 border-b border-fox-border flex justify-between items-start bg-fox-bg/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-fox-primary to-fox-purple flex items-center justify-center text-xl font-bold text-white shadow-inner">
              {student.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <h3 className="text-xl font-bold text-fox-text-main">{student.name}</h3>
              <p className="text-sm text-fox-text-muted">{student.course}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-fox-text-muted/70 hover:text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 flex flex-col gap-6">
          <div>
            <h4 className="text-xs font-bold text-fox-text-muted/70 uppercase tracking-wider mb-3">Estado Actual</h4>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                student.riskLevel === 'ALTO' ? 'bg-[#E74C3C]/10 text-[#E74C3C]' : 
                student.riskLevel === 'MEDIO' ? 'bg-[#F1C40F]/10 text-[#F9A825]' : 'bg-[#3BB54A]/10 text-[#3BB54A]'
              }`}>
                <div className={`w-2 h-2 rounded-full ${
                  student.riskLevel === 'ALTO' ? 'bg-[#E74C3C] animate-pulse' : 
                  student.riskLevel === 'MEDIO' ? 'bg-[#F1C40F]' : 'bg-[#3BB54A]'
                }`}></div>
                Riesgo {student.riskLevel}
              </span>
              <span className="text-sm text-fox-text-muted">{student.reason}</span>
            </div>
          </div>
          
          <div>
            <h4 className="text-xs font-bold text-fox-text-muted/70 uppercase tracking-wider mb-3">Rendimiento Reciente</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-fox-bg rounded-xl border border-fox-border">
                <span className="text-sm font-medium text-fox-text-main/80">Asistencia</span>
                <span className="text-sm font-bold text-fox-red">75%</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-fox-bg rounded-xl border border-fox-border">
                <span className="text-sm font-medium text-fox-text-main/80">Promedio Tareas</span>
                <span className="text-sm font-bold text-fox-orange">6.5 / 10</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-fox-bg rounded-xl border border-fox-border">
                <span className="text-sm font-medium text-fox-text-main/80">Uso de Foxy</span>
                <span className="text-sm font-bold text-fox-green">Alto</span>
              </div>
            </div>
          </div>
        </div>
        <div className="p-6 border-t border-fox-border flex justify-end bg-fox-bg/50">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-white bg-fox-primary hover:bg-fox-primary/90 rounded-xl transition-colors w-full">
            Cerrar Perfil
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function AllRisksModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface rounded-3xl shadow-xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-fox-border flex justify-between items-center bg-fox-bg/50">
          <div>
            <h3 className="text-xl font-bold text-fox-text-main">Reporte Completo de Riesgo</h3>
            <p className="text-sm text-fox-text-muted">Todos los alumnos con alertas activas</p>
          </div>
          <button onClick={onClose} className="p-2 text-fox-text-muted/70 hover:text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-fox-text-muted/70 border-b border-fox-border">
                <th className="pb-3 font-medium">Alumno</th>
                <th className="pb-3 font-medium">Nivel de Riesgo</th>
                <th className="pb-3 font-medium">Motivo Principal</th>
                <th className="pb-3 font-medium">Última Conexión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockStudentsRisk.map(student => (
                <tr key={student.id} className="hover:bg-fox-bg/50 transition-colors">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-sm font-bold text-fox-text-muted shadow-inner">
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </div>
                      <div>
                        <p className="font-medium text-fox-text-main">{student.name}</p>
                        <p className="text-xs text-fox-text-muted">{student.course}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 pr-4">
                    <div className="flex items-center">
                      <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
                        student.riskLevel === 'ALTO' ? 'bg-[#E74C3C]/10 text-[#E74C3C] border border-[#E74C3C]/20' : 
                        student.riskLevel === 'MEDIO' ? 'bg-[#F1C40F]/10 text-[#F9A825] border border-[#F1C40F]/20' : 'bg-[#3BB54A]/10 text-[#3BB54A] border border-[#3BB54A]/20'
                      }`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${
                          student.riskLevel === 'ALTO' ? 'bg-[#E74C3C] animate-pulse' : 
                          student.riskLevel === 'MEDIO' ? 'bg-[#F1C40F]' : 'bg-[#3BB54A]'
                        }`}></div>
                        {student.riskLevel}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pr-4 text-sm text-fox-text-muted">
                    <div className="flex items-center gap-2">
                      <AlertTriangle size={14} className={student.riskLevel === 'ALTO' ? 'text-[#E74C3C]' : student.riskLevel === 'MEDIO' ? 'text-[#F1C40F]' : 'text-[#3BB54A]'} />
                      {student.reason}
                    </div>
                  </td>
                  <td className="py-4 text-sm text-fox-text-muted">
                    Hace 2 días
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-6 border-t border-fox-border flex justify-end bg-fox-bg/50">
          <button onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-white bg-fox-primary hover:bg-fox-primary/90 rounded-xl transition-colors">
            Cerrar Reporte
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function StatCard({ title, value, subtitle, trend, icon: Icon, color, bg }: any) {
  return (
    <div className="bg-fox-surface p-6 rounded-3xl shadow-sm border border-fox-border flex items-start gap-4 hover:shadow-md transition-shadow group h-full">
      <div className={`p-4 rounded-2xl ${bg} ${color} group-hover:scale-110 transition-transform duration-300 shrink-0`}>
        <Icon size={24} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-fox-text-muted font-medium mb-1 truncate">{title}</p>
        <div className="flex flex-wrap items-baseline gap-2">
          <h4 className="text-3xl font-bold text-fox-text-main tracking-tight whitespace-nowrap">{value}</h4>
          {subtitle && <span className="text-sm text-fox-text-muted whitespace-nowrap">{subtitle}</span>}
          {trend && (
            <span className="flex items-center text-xs font-bold text-fox-green bg-fox-green/10 px-2 py-0.5 rounded-full whitespace-nowrap">
              <TrendingUp size={12} className="mr-1 shrink-0" /> {trend}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function QuickLinkButtonHorizontal({ icon: Icon, label, bgClass, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={`relative overflow-hidden flex items-center gap-4 px-6 py-4 rounded-2xl ${bgClass} text-white shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 group flex-1 min-w-[160px] border border-fox-surface/10`}
    >
      {/* Elementos decorativos de fondo */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-fox-surface/20 rounded-full blur-2xl group-hover:bg-fox-surface/30 transition-colors duration-500"></div>
      <div className="absolute -left-4 -bottom-4 w-16 h-16 bg-black/10 rounded-full blur-xl"></div>
      
      <div className={`bg-fox-surface/20 p-3 rounded-xl group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 backdrop-blur-sm relative z-10`}>
        <Icon size={22} className="text-white" />
      </div>
      <span className={`text-sm font-bold text-white tracking-wide relative z-10`}>{label}</span>
    </button>
  );
}

function MessagesModal({ onClose }: { onClose: () => void }) {
  const initialMessages = [
    { id: 1, sender: 'Gabinete Psicopedagógico', subject: 'Seguimiento Valentina Rodríguez', time: '10:30 AM', unread: true, preview: 'Hemos analizado el caso de Valentina y sugerimos las siguientes acciones...', content: 'Estimado docente,\n\nHemos analizado el caso de Valentina Rodríguez según los incidentes reportados en las últimas semanas. Sugerimos las siguientes acciones a implementar en clase:\n\n1. Asignar lugar preferencial cerca del escritorio.\n2. Evitar sobrecarga de tareas con instrucciones múltiples.\n3. Segmentar actividades largas en tramos cortos.\n\nQuedamos a disposición por cualquier consulta adicional.\n\nSaludos,\nEquipo de Gabinete Integral' },
    { id: 2, sender: 'Dirección Académica', subject: 'Cronograma Exámenes Trimestrales', time: 'Ayer', unread: true, preview: 'Adjunto enviamos el borrador final para las mesas de examen del mes que viene...', content: 'Estimados Colegas,\n\nAdjunto enviamos el borrador final para las mesas de examen trimestrales del próximo mes. Por favor, verificar fechas y horarios para evitar cruces con otras materias o ausencias previstas.\n\nResponder a este correo con su confirmación de disponibilidad antes del día viernes a las 18:00 hs.\n\nAtentamente,\nDirección Académica' },
    { id: 3, sender: 'Marta (Tutora de Tomás)', subject: 'Ausencia justificada', time: 'Lunes', unread: false, preview: 'Buen día Prof. Martínez, Tomás no podrá asistir hoy a clase debido a que está con reposo médico...', content: 'Buen día Prof. Martínez,\n\nQuería informarle que Tomás no podrá asistir hoy a clase debido a que amaneció con un cuadro febril y el médico le indicó reposo por 48 hs. Estaré adjuntando el certificado médico oficial a través del portal de preceptores el día de mañana.\n\nLe pido por favor si me podría indicar qué temas van a repasar hoy para que él pueda ir leyendo desde casa.\n\nMuchas gracias,\nMarta' },
  ];

  const [messages, setMessages] = useState(initialMessages);
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [isComposing, setIsComposing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [composeForm, setComposeForm] = useState({ to: '', subject: '', body: '' });
  const [replyText, setReplyText] = useState('');
  
  const activeMessage = messages.find(m => m.id === activeMessageId);
  const unreadCount = messages.filter(m => m.unread).length;
  
  const filteredMessages = messages.filter(m => 
    m.sender.toLowerCase().includes(searchQuery.toLowerCase()) || 
    m.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectMessage = (id: number) => {
    setIsComposing(false);
    setActiveMessageId(id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, unread: false } : m));
  };

  const handleSendMessage = () => {
    if (!composeForm.to || !composeForm.subject || !composeForm.body) {
      toast.show("Completa todos los campos para enviar", "error");
      return;
    }
    
    const newMsg = {
      id: Date.now(),
      sender: `Para: ${composeForm.to}`,
      subject: composeForm.subject,
      time: 'Ahora',
      unread: false,
      content: composeForm.body,
      preview: composeForm.body.substring(0, 50) + '...'
    };
    
    setMessages([newMsg, ...messages]);
    setIsComposing(false);
    setComposeForm({ to: '', subject: '', body: '' });
    toast.show("Mensaje enviado con éxito", "success");
  };

  const handleSendReply = () => {
    if (!replyText.trim()) return;
    toast.show("Respuesta enviada", "success");
    setReplyText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-gray-900/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-6xl h-[90vh] md:h-[85vh] overflow-hidden flex flex-col md:flex-row border border-fox-border"
      >
        {/* Sidebar (List View) */}
        <div className={`w-full md:w-[350px] lg:w-[400px] flex overflow-hidden flex-col border-r border-fox-border bg-fox-bg/30 ${activeMessage || isComposing ? 'hidden md:flex' : 'flex'}`}>
          <div className="p-4 sm:p-5 border-b border-fox-border">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-fox-green/10 text-fox-green flex items-center justify-center">
                  <MessageSquare size={20} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-fox-text-main">Mensajería</h3>
                  <p className="text-xs font-bold text-fox-green">{unreadCount} {unreadCount === 1 ? 'nuevo' : 'nuevos'}</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors md:hidden">
                <X size={20} />
              </button>
            </div>
            
            <button 
              onClick={() => { setIsComposing(true); setActiveMessageId(null); }}
              className="w-full py-3 mb-4 text-sm font-bold text-white bg-fox-green hover:bg-fox-green/90 rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <Edit3 size={18} /> Redactar Correo
            </button>

            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted" />
              <input 
                type="text" 
                placeholder="Buscar chats..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-fox-surface border border-fox-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-fox-green/30"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredMessages.map(msg => (
              <div 
                key={msg.id} 
                onClick={() => handleSelectMessage(msg.id)}
                className={`p-4 rounded-2xl cursor-pointer transition-all border ${activeMessageId === msg.id ? 'bg-fox-green/10 border-fox-green/30' : msg.unread ? 'bg-fox-surface border-fox-green/30 shadow-sm' : 'bg-transparent border-transparent hover:bg-fox-surface'}`}
              >
                <div className="flex justify-between items-start mb-1.5">
                  <h4 className={`text-sm ${msg.unread || activeMessageId === msg.id ? 'font-bold text-fox-text-main' : 'font-medium text-fox-text-main/80'}`}>{msg.sender}</h4>
                  <span className={`text-xs ml-2 whitespace-nowrap ${msg.unread ? 'text-fox-green font-bold bg-fox-green/10 px-2 py-0.5 rounded-md' : 'text-fox-text-muted'}`}>{msg.time}</span>
                </div>
                <h5 className={`text-xs mb-1.5 truncate ${msg.unread || activeMessageId === msg.id ? 'font-bold text-fox-text-main/90' : 'font-medium text-fox-text-main/70'}`}>{msg.subject}</h5>
                <p className="text-xs text-fox-text-muted line-clamp-2 leading-relaxed">{msg.preview}</p>
              </div>
            ))}
            {filteredMessages.length === 0 && (
              <div className="p-8 text-center text-fox-text-muted text-sm border border-dashed border-fox-border rounded-2xl m-2">
                No se encontraron mensajes.
              </div>
            )}
          </div>
        </div>

        {/* Main Content Pane */}
        <div className={`flex-1 flex flex-col bg-fox-surface h-full w-full overflow-hidden ${!activeMessage && !isComposing ? 'hidden md:flex' : 'flex'}`}>
          
          {isComposing ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-fox-border flex justify-between items-center bg-fox-bg/30">
                <div className="flex items-center gap-3">
                  <button onClick={() => setIsComposing(false)} className="md:hidden p-2 -ml-2 text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <h3 className="text-xl font-bold text-fox-text-main">Nuevo Mensaje</h3>
                </div>
                <button onClick={onClose} className="p-2 text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors hidden md:flex">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3 border-b border-fox-border pb-3 bg-fox-surface">
                  <span className="text-sm font-medium text-fox-text-muted w-14">Para:</span>
                  <input 
                    type="text" 
                    value={composeForm.to}
                    onChange={e => setComposeForm({...composeForm, to: e.target.value})}
                    placeholder="Ej: Todos los alumnos de 3°A, Tutora Marta..." 
                    className="flex-1 bg-transparent text-sm font-bold text-fox-text-main focus:outline-none min-w-0"
                  />
                </div>
                <div className="flex items-center gap-3 border-b border-fox-border pb-3 bg-fox-surface">
                  <span className="text-sm font-medium text-fox-text-muted w-14">Asunto:</span>
                  <input 
                    type="text" 
                    value={composeForm.subject}
                    onChange={e => setComposeForm({...composeForm, subject: e.target.value})}
                    className="flex-1 bg-transparent text-sm font-bold text-fox-text-main focus:outline-none min-w-0"
                  />
                </div>
                <div className="flex-1 min-h-[300px] relative mt-2 group">
                  <textarea 
                    value={composeForm.body}
                    onChange={e => setComposeForm({...composeForm, body: e.target.value})}
                    placeholder="Escribe tu mensaje aquí..."
                    className="w-full h-full p-5 border border-fox-border rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-fox-green/30 text-base text-fox-text-main/90 bg-fox-bg/30"
                  />
                  <button 
                    onClick={() => {
                      if(!composeForm.subject && !composeForm.to) {
                        toast.show('Escribe un asunto o destinarario para guiar a Foxy', 'error');
                        return;
                      }
                      setComposeForm({...composeForm, body: 'Estimados,\n\nEspero que se encuentren muy bien.\nLes escribo en relación a ' + (composeForm.subject || 'nuestro curso') + '.\n\nPor favor, no duden en contactarme si tienen alguna duda o consulta al respecto.\n\nSaludos cordiales,\nProf. Martínez'});
                      toast.show('Borrador generado por Foxy', 'success');
                    }}
                    className="absolute right-4 bottom-4 py-2 px-3 bg-fox-purple text-white hover:bg-fox-purple/90 rounded-xl font-bold text-xs items-center gap-2 transition-all shadow-md lg:opacity-50 lg:group-hover:opacity-100 flex"
                  >
                    <Sparkles size={14} /> Foxy Draft
                  </button>
                </div>
              </div>
              <div className="p-4 sm:p-5 border-t border-fox-border flex justify-end gap-3 bg-fox-bg/30">
                <button onClick={() => setIsComposing(false)} className="px-5 py-2.5 text-sm font-bold text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors">
                  Descartar
                </button>
                <button onClick={handleSendMessage} className="px-5 py-2.5 text-sm font-bold text-white bg-fox-green hover:bg-fox-green/90 rounded-xl transition-colors flex items-center gap-2">
                  <Send size={16} /> Enviar Mensaje
                </button>
              </div>
            </div>
          ) : activeMessage ? (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <div className="p-4 sm:p-5 border-b border-fox-border flex justify-between items-center bg-fox-bg/30">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveMessageId(null)} className="md:hidden p-2 -ml-2 text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors">
                    <ArrowLeft size={20} />
                  </button>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fox-green to-teal-600 flex items-center justify-center text-white font-bold shadow-inner">
                      {activeMessage.sender.substring(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-fox-text-main line-clamp-1">{activeMessage.sender}</h3>
                      <p className="text-[11px] font-medium text-fox-text-muted">{activeMessage.time}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button className="p-2 text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors md:hidden">
                    <Reply size={20} />
                  </button>
                  <button onClick={onClose} className="p-2 text-fox-text-muted hover:bg-fox-border rounded-xl transition-colors hidden md:flex">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-5 sm:p-8">
                <h2 className="text-2xl font-heading font-bold text-fox-text-main mb-6 pt-2">{activeMessage.subject}</h2>
                <div className="text-[15px] sm:text-base text-fox-text-main/90 leading-relaxed max-w-3xl whitespace-pre-line bg-fox-bg/30 p-6 rounded-2xl border border-fox-border">
                  {activeMessage.content}
                </div>
              </div>
              <div className="p-4 sm:p-5 border-t border-fox-border bg-fox-bg/30">
                <div className="bg-fox-surface border border-fox-border rounded-2xl flex items-end gap-2 p-2 focus-within:ring-2 focus-within:ring-fox-green/30 transition-all shadow-sm">
                  <textarea 
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    placeholder={`Responder a ${activeMessage.sender.split(' ')[0]}...`}
                    className="w-full min-h-[44px] max-h-[150px] p-2 bg-transparent resize-none focus:outline-none text-sm text-fox-text-main"
                  />
                  <button onClick={handleSendReply} className="w-10 h-10 shrink-0 bg-fox-green hover:bg-fox-green/90 text-white rounded-xl flex items-center justify-center transition-colors mb-0.5">
                    <Send size={16} className="-ml-0.5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-gradient-to-br from-fox-surface to-fox-bg/50">
              <div className="w-24 h-24 rounded-full bg-fox-surface border-2 border-fox-border border-dashed flex items-center justify-center text-fox-border mb-6 shadow-sm">
                <MessageSquare size={40} className="text-fox-text-muted/40" />
              </div>
              <h3 className="text-2xl font-heading font-bold text-fox-text-main mb-2">Mensajería Integrada</h3>
              <p className="text-fox-text-muted max-w-sm text-base">Selecciona un mensaje de la lista para leerlo o haz clic en "Redactar" para enviar un nuevo comunicado a familias, alumnos o escuela.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
