import React, { useState, useEffect, useRef } from 'react';
import { mockClassroomsDocente, sharedActivities, sharedSubmissions, updateSharedActivities, updateSharedSubmissions } from '../../mockData';
import { Classroom } from '../../types';
import { messagingStore } from '../../features/messaging/messagingStore';
import { 
  BookOpen, CheckCircle2, AlertCircle, BarChart2, Plus, X, Upload, 
  Users, FileText, LayoutList, BrainCircuit, Search, MoreVertical, 
  Clock, Calendar, CheckSquare, Square, Sparkles, Bell, Eye, Send, MessageSquare, ChevronRight, ChevronLeft, ChevronUp, ChevronDown, ArrowLeft, PenTool, Trash2,
  Library, LayoutGrid, List, Folder, Network, Target, Mail, UserCheck, SendHorizontal, GraduationCap, Copy, Check, KeyRound, Link, Info
} from 'lucide-react';
import { toast } from '../../components/ui/Toaster';
import { motion, AnimatePresence } from 'motion/react';
import { useAppContext } from '../../context';
import { ClassroomHeroHeader } from '../../components/aulas/ClassroomHeroHeader';
import { ClassroomTabsNav, AulaTabId } from '../../components/aulas/ClassroomTabsNav';
import { ClassroomMuroTab } from '../../components/aulas/ClassroomMuroTab';
import { ClassroomCurriculaTab } from '../../components/aulas/ClassroomCurriculaTab';
import { ClassroomBibliotecaTab } from '../../components/aulas/ClassroomBibliotecaTab';
import { ClassroomRendimientoTab } from '../../components/aulas/ClassroomRendimientoTab';
import { CreateActivityModal, CreatedActivityData, LibraryItem } from '../../components/aulas/CreateActivityModal';
import { TeacherActivityDetail } from '../../components/aulas/TeacherActivityDetail';
import { getClassroomColorTheme } from '../alumno/AulasAlumno';


// --- GLOBALS FOR SESSION VOLATILE PERSISTENCE ---

let sessionStudents = [
  { id: 1, name: 'Marcos Pérez', risk: 'ALTO', lastSeen: 'Hace 8 días', dua: [] },
  { id: 2, name: 'Sofía Herrera', risk: 'MEDIO', lastSeen: 'Ayer', dua: ['Dislexia'] },
  { id: 3, name: 'Lucas Díaz', risk: 'BAJO', lastSeen: 'Hoy', dua: [] },
  { id: 4, name: 'Ana Torres', risk: 'BAJO', lastSeen: 'Hoy', dua: ['TDAH'] },
  { id: 5, name: 'Valentina Gómez', risk: 'BAJO', lastSeen: 'Hace 2 horas', dua: [] },
];

let sessionCurriculum = [
  { id: 1, unit: 'Unidad 1: Modernismo', status: 'completed', topics: ['Rubén Darío', 'Características principales', 'Poesía modernista'] },
  { id: 2, unit: 'Unidad 2: Vanguardias', status: 'current', topics: ['Creacionismo', 'Ultraísmo', 'Manifiestos'] },
  { id: 3, unit: 'Unidad 3: Boom Latinoamericano', status: 'pending', topics: ['Realismo Mágico', 'García Márquez', 'Cortázar'] },
  { id: 4, unit: 'Unidad 4: Literatura Contemporánea', status: 'pending', topics: ['Nuevas narrativas', 'Poesía actual'] },
];

export function AulasDocente() {
  const { navigationParams } = useAppContext();
  const [classrooms, setClassrooms] = useState(mockClassroomsDocente);
  const [selectedAula, setSelectedAula] = useState<Classroom | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // New Aula State
  const [creationStep, setCreationStep] = useState<'form' | 'analyzing' | 'review' | 'creating'>('form');
  const [studyPlanFile, setStudyPlanFile] = useState<{ name: string; size: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newAulaForm, setNewAulaForm] = useState({
    subject: '',
    year: '',
    division: '',
    observation: '',
    color: 'blue' as 'blue' | 'orange' | 'purple' | 'green' | 'red' | 'pink' | 'yellow',
    topics: [] as { id: string; name: string; subtopics: string[] }[]
  });

  const aulaColorPalette = [
    { id: 'blue', label: 'Azul', hex: '#2563eb', bgClass: 'bg-blue-500', pillBg: 'bg-blue-500/10', textClass: 'text-blue-600', borderClass: 'border-blue-500' },
    { id: 'orange', label: 'Naranja', hex: '#f97316', bgClass: 'bg-fox-orange', pillBg: 'bg-fox-orange/10', textClass: 'text-fox-orange', borderClass: 'border-fox-orange' },
    { id: 'purple', label: 'Púrpura', hex: '#a855f7', bgClass: 'bg-fox-purple', pillBg: 'bg-fox-purple/10', textClass: 'text-fox-purple', borderClass: 'border-fox-purple' },
    { id: 'green', label: 'Verde', hex: '#22c55e', bgClass: 'bg-fox-green', pillBg: 'bg-fox-green/10', textClass: 'text-fox-green', borderClass: 'border-fox-green' },
    { id: 'red', label: 'Rojo', hex: '#ef4444', bgClass: 'bg-red-500', pillBg: 'bg-red-500/10', textClass: 'text-red-500', borderClass: 'border-red-500' },
    { id: 'pink', label: 'Rosa', hex: '#ec4899', bgClass: 'bg-pink-500', pillBg: 'bg-pink-500/10', textClass: 'text-pink-500', borderClass: 'border-pink-500' },
    { id: 'yellow', label: 'Amarillo', hex: '#eab308', bgClass: 'bg-yellow-500', pillBg: 'bg-yellow-500/10', textClass: 'text-yellow-600', borderClass: 'border-yellow-500' },
  ];

  const handleOpenModal = () => {
    setNewAulaForm({
      subject: '',
      year: '',
      division: '',
      observation: '',
      color: 'blue',
      topics: []
    });
    setStudyPlanFile(null);
    setCreationStep('form');
    setIsModalOpen(true);
  };

  const handleFileUpload = (file: File) => {
    const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
    setStudyPlanFile({
      name: file.name,
      size: `${sizeInMb} MB`
    });
    toast.show(`📄 Archivo "${file.name}" cargado`, 'success');
  };

  const handleFileDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const isFormComplete = Boolean(
    newAulaForm.subject.trim() &&
    newAulaForm.year &&
    newAulaForm.division &&
    studyPlanFile
  );

  const handleAnalyze = () => {
    if (!newAulaForm.subject.trim()) {
      toast.show('Ingresa el nombre de la materia', 'warning');
      return;
    }
    if (!newAulaForm.year || !newAulaForm.division) {
      toast.show('Selecciona año y división del curso', 'warning');
      return;
    }
    if (!studyPlanFile) {
      toast.show('Debes cargar el plan de estudios para que la IA lo analice', 'warning');
      return;
    }
    
    setCreationStep('analyzing');
    // Simulate AI parsing with rich initial domain curriculum structure
    setTimeout(() => {
      const subjectName = newAulaForm.subject.trim();
      setNewAulaForm(prev => ({
        ...prev,
        topics: [
          { 
            id: `u-${Date.now()}-1`, 
            name: `Unidad 1: Fundamentos e Introducción a ${subjectName}`, 
            subtopics: ['Contexto histórico y marco conceptual', 'Objetivos de aprendizaje y metodología', 'Diagnóstico inicial'] 
          },
          { 
            id: `u-${Date.now()}-2`, 
            name: 'Unidad 2: Núcleo temático y desarrollo de habilidades', 
            subtopics: ['Ejes teóricos estructurantes', 'Análisis de fuentes y bibliografía', 'Actividades de fijación'] 
          },
          { 
            id: `u-${Date.now()}-3`, 
            name: 'Unidad 3: Trabajo práctico y producción colaborativa', 
            subtopics: ['Casos de estudio aplicados', 'Metodologías activas y talleres', 'Instancias DUA de diversificación'] 
          },
          { 
            id: `u-${Date.now()}-4`, 
            name: 'Unidad 4: Proyecto integrador y evaluación formativa', 
            subtopics: ['Consigna y rúbrica de evaluación', 'Presentación grupal / individual', 'Autoevaluación y cierre'] 
          }
        ]
      }));
      setCreationStep('review');
    }, 2200);
  };

  const handleCreateClassroom = () => {
    setCreationStep('creating');
    setTimeout(() => {
      const selectedColorObj = aulaColorPalette.find(c => c.id === newAulaForm.color) || aulaColorPalette[0];
      const newClassroom: Classroom = {
        id: `aula-${Date.now()}`,
        subject: newAulaForm.subject.trim(),
        course: `${newAulaForm.year} ${newAulaForm.division}`,
        color: selectedColorObj.bgClass,
        studentsCount: 25,
        activeTasks: 1,
        pendingSubmissions: 0,
        avgGrade: 0,
        progress: 0,
        teacherName: 'Docente a cargo',
        lastActivity: 'Recién creada'
      };

      // Also persist structured curriculum to sessionCurriculum for the new classroom
      sessionCurriculum = newAulaForm.topics.map((t, idx) => ({
        id: idx + 1,
        unit: t.name,
        status: idx === 0 ? 'current' : 'pending',
        topics: t.subtopics
      }));

      setClassrooms([newClassroom, ...classrooms]);
      toast.show(`✨ Aula de ${newClassroom.subject} (${newClassroom.course}) creada con éxito`, 'success');
      setIsModalOpen(false);
    }, 1800);
  };

  useEffect(() => {
    if (navigationParams?.openTask && navigationParams?.subject) {
      const aula = classrooms.find(a => `${a.subject} ${a.course}` === navigationParams.subject);
      if (aula) {
        setSelectedAula(aula);
      }
    } else if (navigationParams?.openAulaId) {
      const aula = classrooms.find(a => a.id === navigationParams.openAulaId);
      if (aula) {
        setSelectedAula(aula);
      }
    }
  }, [navigationParams, classrooms]);

  return (
    <div className={`flex-1 flex flex-col ${!selectedAula ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-8' : ''}`}>
      <AnimatePresence mode="wait">
        {!selectedAula ? (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-7xl mx-auto w-full"
          >
            <header className="flex flex-col gap-4 mb-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
                    <span className="p-2 rounded-2xl bg-fox-primary/10 text-fox-primary border border-fox-primary/20 flex items-center justify-center shrink-0">
                      <BookOpen className="w-6 h-6" />
                    </span>
                    <span>Mis Aulas</span>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-600 border border-blue-500/20 font-sans font-semibold">
                      Gestión Académica
                    </span>
                  </h2>
                  <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
                    Administrá tus cursos, seguí el progreso de la currícula en tiempo real y coordiná actividades con tus estudiantes.
                  </p>
                </div>
                <button 
                  onClick={handleOpenModal}
                  className="bg-fox-primary text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-fox-primary/90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] w-full md:w-auto"
                >
                  <Plus size={18} /> <span>Nueva Aula</span>
                </button>
              </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
              {classrooms.map((aula, idx) => {
                const theme = getClassroomColorTheme(aula.color, aula.subject);
                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={aula.id} 
                    className="group bg-fox-surface rounded-3xl border border-fox-border shadow-sm hover:shadow-xl hover:border-fox-primary/30 transition-all duration-300 flex flex-col h-full hover:-translate-y-1 overflow-hidden relative cursor-pointer"
                    onClick={() => setSelectedAula(aula)}
                  >
                    {/* Decorative Top Line indicator */}
                    <div className={`absolute top-0 left-0 w-full h-1.5 ${theme.bar}`}></div>

                    {/* Header section */}
                    <div className="p-6 pb-5 border-b border-fox-border/50">
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black mb-3 ${theme.badgeBg} ${theme.badgeText} border ${theme.border}`}>
                            <span className={`w-2 h-2 rounded-full ${theme.bullet} shrink-0`}></span>
                            {aula.course}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`w-2.5 h-2.5 rounded-full ${theme.bullet} shrink-0`}></span>
                            <h3 className="text-2xl font-heading font-extrabold text-fox-text-main leading-tight group-hover:text-fox-primary transition-colors line-clamp-1">
                              {aula.subject}
                            </h3>
                          </div>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-fox-bg border border-fox-border flex items-center justify-center text-fox-text-muted group-hover:bg-fox-primary/5 group-hover:text-fox-primary group-hover:border-fox-primary/20 transition-all shrink-0">
                          <BookOpen size={24} />
                        </div>
                      </div>
                      
                      <p className="flex items-center gap-2 mt-4 text-sm font-medium text-fox-text-muted">
                        <Users size={16} className="opacity-70" />
                        <span><strong className="text-fox-text-main">{aula.studentsCount}</strong> alumnos matriculados</span>
                      </p>
                    </div>

                    {/* Main Body - Progress & Stats */}
                    <div className="p-6 pt-5 flex-1 flex flex-col bg-fox-bg/30">
                      <div className="mb-6">
                        <div className="flex justify-between items-baseline mb-2">
                          <span className="text-sm font-bold text-fox-text-main/80">Progreso del plan</span>
                          <span className={`text-xl font-black ${theme.textAccent}`}>
                            {aula.progress}%
                          </span>
                        </div>
                        <div className="w-full bg-fox-border/60 rounded-full h-2.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${aula.progress}%` }}
                            transition={{ duration: 1, delay: 0.2 }}
                            className={`h-full rounded-full ${theme.bar} transition-all`}
                          ></motion.div>
                        </div>
                      </div>

                      {/* Metrics Grid */}
                      <div className="grid grid-cols-3 gap-3 mt-auto">
                        <div className="bg-fox-surface border border-fox-border rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                          <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Activas</span>
                          <div className="flex items-center justify-center gap-1.5 min-w-0 max-w-full">
                            <CheckCircle2 size={16} className="text-fox-green shrink-0" />
                            <span className="text-xl font-black text-fox-text-main leading-none">{aula.activeTasks}</span>
                          </div>
                        </div>
                        <div className="bg-fox-surface border border-fox-border rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                          <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Pendientes</span>
                          <div className="flex items-center justify-center gap-1.5 min-w-0 max-w-full">
                            <AlertCircle size={16} className="text-fox-orange shrink-0" />
                            <span className="text-xl font-black text-fox-text-main leading-none">{aula.pendingSubmissions}</span>
                          </div>
                        </div>
                        <div className="bg-fox-surface border border-fox-border rounded-2xl p-3 flex flex-col items-center justify-center shadow-sm group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                          <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Promedio</span>
                          <div className="flex items-center justify-center gap-1.5 min-w-0 max-w-full">
                            <BarChart2 size={16} className="text-fox-primary shrink-0" />
                            <span className="text-xl font-black text-fox-text-main leading-none">{aula.avgGrade || "-"}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Modal Nueva Aula */}
            <AnimatePresence>
              {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center z-50 p-4">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="bg-fox-surface rounded-3xl shadow-2xl border border-fox-border w-full max-w-xl overflow-hidden max-h-[92vh] flex flex-col"
                  >
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-fox-border flex justify-between items-center bg-fox-bg/50 shrink-0">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-fox-primary/10 text-fox-primary border border-fox-primary/20 flex items-center justify-center shrink-0">
                          {creationStep === 'review' ? <Sparkles size={20} /> : <BookOpen size={20} />}
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-fox-text-main text-lg leading-tight">
                            {creationStep === 'form' && 'Crear Nueva Aula'}
                            {creationStep === 'analyzing' && 'Analizando Plan de Estudios'}
                            {creationStep === 'review' && 'Estructura Curricular Detectada'}
                            {creationStep === 'creating' && 'Configurando Aula'}
                          </h3>
                          <p className="text-xs text-fox-text-muted mt-0.5">
                            {creationStep === 'form' && 'Paso 1 de 2: Información inicial y archivo'}
                            {creationStep === 'analyzing' && 'La IA de Foxy está procesando el contenido'}
                            {creationStep === 'review' && 'Paso 2 de 2: Revisión y ajuste de temas'}
                            {creationStep === 'creating' && 'Guardando aula y vinculando currícula'}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsModalOpen(false)} 
                        className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 shadow-2xs border border-fox-border transition-colors cursor-pointer"
                      >
                        <X size={18} />
                      </button>
                    </div>

                    {/* Modal Body */}
                    <div className="p-6 overflow-y-auto flex-1 h-full max-h-full space-y-6">
                      {creationStep === 'form' && (
                        <div className="space-y-5">
                          {/* 1. Nombre de materia */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                              Nombre de la Materia <span className="text-fox-orange">*</span>
                            </label>
                            <input 
                              type="text" 
                              value={newAulaForm.subject}
                              onChange={e => setNewAulaForm({...newAulaForm, subject: e.target.value})}
                              className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main placeholder:text-fox-text-muted/50 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all" 
                              placeholder="Ej: Biología General, Literatura Latinoamericana, Física II" 
                            />
                          </div>

                          {/* 2. Año y División */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                                Año escolar <span className="text-fox-orange">*</span>
                              </label>
                              <select 
                                value={newAulaForm.year}
                                onChange={e => setNewAulaForm({...newAulaForm, year: e.target.value})}
                                className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all cursor-pointer" 
                              >
                                <option value="" disabled>Seleccione el año</option>
                                <option value="1° Año">1° Año</option>
                                <option value="2° Año">2° Año</option>
                                <option value="3° Año">3° Año</option>
                                <option value="4° Año">4° Año</option>
                                <option value="5° Año">5° Año</option>
                                <option value="6° Año">6° Año</option>
                                <option value="7° Año">7° Año (Técnica)</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                                División / Comisión <span className="text-fox-orange">*</span>
                              </label>
                              <select 
                                value={newAulaForm.division}
                                onChange={e => setNewAulaForm({...newAulaForm, division: e.target.value})}
                                className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all cursor-pointer" 
                              >
                                <option value="" disabled>Seleccione la división</option>
                                <option value="División A">División A</option>
                                <option value="División B">División B</option>
                                <option value="División C">División C</option>
                                <option value="División D">División D</option>
                                <option value="División E">División E</option>
                                <option value="Única">División Única</option>
                              </select>
                            </div>
                          </div>

                          {/* 3. Observación para el aula en general */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2 flex items-center justify-between">
                              <span>Observaciones para el aula (Opcional)</span>
                              <span className="text-[11px] font-normal normal-case text-fox-text-muted/70">Equipamiento, notas o régimen</span>
                            </label>
                            <textarea 
                              value={newAulaForm.observation}
                              onChange={e => setNewAulaForm({...newAulaForm, observation: e.target.value})}
                              className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-2.5 text-sm font-medium text-fox-text-main placeholder:text-fox-text-muted/50 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all resize-none h-20" 
                              placeholder="Ej: Aula 14 con proyector multimedia. Alumnos con perfiles DUA asignados para seguimiento pedagógico..." 
                            />
                          </div>

                          {/* 4. Color de la viñeta (reutilizando estilo Agenda) */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2.5 flex items-center justify-between">
                              <span>Color de identificación</span>
                              <span className="text-xs font-bold text-fox-text-main">
                                {aulaColorPalette.find(c => c.id === newAulaForm.color)?.label}
                              </span>
                            </label>
                            <div className="flex flex-wrap items-center gap-3">
                              {aulaColorPalette.map(c => {
                                const isSelected = newAulaForm.color === c.id;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setNewAulaForm({...newAulaForm, color: c.id as any})}
                                    className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all cursor-pointer ${
                                      isSelected
                                        ? 'scale-110 ring-3 ring-offset-2 ring-fox-text-main/20 shadow-md'
                                        : 'opacity-70 hover:opacity-100 hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: c.hex }}
                                    title={c.label}
                                  >
                                    {isSelected && <CheckCircle2 size={16} className="text-white drop-shadow-sm" />}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* 5. Cargar Plan de Estudios */}
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                              Plan de Estudios <span className="text-fox-orange">*</span>
                            </label>
                            
                            <input 
                              type="file" 
                              ref={fileInputRef}
                              accept=".pdf,.doc,.docx,.txt"
                              onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                  handleFileUpload(e.target.files[0]);
                                }
                              }}
                              className="hidden"
                            />

                            <div 
                              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                              onDragLeave={() => setIsDraggingFile(false)}
                              onDrop={handleFileDrop}
                              onClick={() => fileInputRef.current?.click()}
                              className={`border-2 border-dashed rounded-3xl p-6 text-center transition-all cursor-pointer group ${
                                isDraggingFile
                                  ? 'border-fox-primary bg-fox-primary/10 scale-[1.01]'
                                  : studyPlanFile 
                                    ? 'border-fox-primary/50 bg-fox-primary/5'
                                    : 'border-fox-border bg-fox-bg/40 hover:bg-fox-primary/5 hover:border-fox-primary/40'
                              }`}
                            >
                              {studyPlanFile ? (
                                <div className="flex items-center justify-between p-2">
                                  <div className="flex items-center gap-3 text-left">
                                    <div className="w-12 h-12 bg-fox-primary/10 border border-fox-primary/20 rounded-2xl flex items-center justify-center text-fox-primary shrink-0">
                                      <FileText size={22} />
                                    </div>
                                    <div>
                                      <p className="text-sm font-bold text-fox-text-main line-clamp-1">{studyPlanFile.name}</p>
                                      <p className="text-xs text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                                        <span>{studyPlanFile.size}</span>
                                        <span>•</span>
                                        <span className="text-emerald-600 font-medium flex items-center gap-0.5">
                                          <CheckCircle2 size={12} /> Listo para procesar
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setStudyPlanFile(null);
                                    }}
                                    className="text-xs font-bold text-fox-text-muted hover:text-red-500 bg-fox-surface px-3 py-1.5 rounded-xl border border-fox-border transition-colors cursor-pointer"
                                  >
                                    Cambiar
                                  </button>
                                </div>
                              ) : (
                                <div className="flex flex-col items-center">
                                  <div className="w-12 h-12 bg-fox-bg border border-fox-border group-hover:bg-fox-primary/10 group-hover:border-fox-primary/20 group-hover:text-fox-primary rounded-2xl flex items-center justify-center mx-auto mb-2.5 transition-all text-fox-text-muted">
                                    <Upload size={22} />
                                  </div>
                                  <p className="text-sm font-bold text-fox-text-main">
                                    Arrastrá el archivo del plan de estudios
                                  </p>
                                  <p className="text-xs text-fox-text-muted mt-1">
                                    o hacé clic para explorar en tu equipo (PDF, DOCX o TXT)
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Action Button: Analizar Plan */}
                          <div className="pt-2">
                            <button 
                              type="button"
                              onClick={handleAnalyze}
                              disabled={!isFormComplete}
                              className={`w-full py-3.5 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-sm ${
                                isFormComplete
                                  ? 'bg-fox-primary text-white hover:bg-fox-primary/90 cursor-pointer shadow-fox-primary/20'
                                  : 'bg-fox-border text-fox-text-muted cursor-not-allowed opacity-60'
                              }`}
                            >
                              <BrainCircuit size={18} />
                              <span>Analizar Plan de Estudios con IA</span>
                            </button>
                            {!isFormComplete && (
                              <p className="text-[11px] text-center text-fox-text-muted mt-2">
                                Completa el nombre, año, división y carga el archivo para habilitar el análisis.
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* State: Analyzing with AI */}
                      {creationStep === 'analyzing' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                          <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-fox-orange/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-fox-orange border-t-transparent rounded-full animate-spin"></div>
                            <BrainCircuit size={32} className="absolute inset-0 m-auto text-fox-orange animate-pulse" />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-fox-text-main text-lg mb-1.5">
                              Foxy está analizando el plan de estudios
                            </h4>
                            <p className="text-xs text-fox-text-muted max-w-sm mx-auto leading-relaxed">
                              Extrayendo unidades temáticas, contenidos pedagógicos y sugiriendo subtemas estructurados...
                            </p>
                          </div>
                          <div className="flex items-center gap-2 bg-fox-bg border border-fox-border rounded-xl px-3 py-1.5 text-xs text-fox-text-muted">
                            <FileText size={14} className="text-fox-primary" />
                            <span className="font-medium truncate max-w-[200px]">{studyPlanFile?.name}</span>
                          </div>
                        </div>
                      )}

                      {/* State: Creating Classroom */}
                      {creationStep === 'creating' && (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
                          <div className="relative w-20 h-20">
                            <div className="absolute inset-0 border-4 border-fox-green/20 rounded-full"></div>
                            <div className="absolute inset-0 border-4 border-fox-green border-t-transparent rounded-full animate-spin"></div>
                            <CheckCircle2 size={32} className="absolute inset-0 m-auto text-fox-green animate-pulse" />
                          </div>
                          <div>
                            <h4 className="font-heading font-bold text-fox-text-main text-lg mb-1.5">
                              Creando el Aula y configurando la currícula
                            </h4>
                            <p className="text-xs text-fox-text-muted max-w-sm mx-auto leading-relaxed">
                              Guardando las unidades y subtemas personalizados para {newAulaForm.subject}...
                            </p>
                          </div>
                        </div>
                      )}

                      {/* State: Review and Edit AI-parsed curriculum */}
                      {creationStep === 'review' && (
                        <div className="space-y-5">
                          {/* Banner informativo */}
                          <div className="bg-fox-purple/10 border border-fox-purple/20 rounded-2xl p-4 flex gap-3.5 text-fox-purple items-start">
                            <Sparkles size={22} className="shrink-0 mt-0.5" />
                            <div>
                              <h5 className="text-xs font-bold uppercase tracking-wider text-fox-purple">
                                Plan Curricular Extraído
                              </h5>
                              <p className="text-xs text-fox-purple/90 mt-1 leading-relaxed">
                                Foxy detectó las siguientes unidades y temas. Puedes editar títulos, renombrar, agregar o eliminar según tus necesidades antes de confirmar.
                              </p>
                            </div>
                          </div>

                          {/* Resumen del aula */}
                          <div className="bg-fox-bg/60 border border-fox-border rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-2 text-xs">
                            <div className="flex items-center gap-2">
                              <span className={`w-3 h-3 rounded-full ${aulaColorPalette.find(c => c.id === newAulaForm.color)?.bgClass}`}></span>
                              <strong className="text-fox-text-main font-bold">{newAulaForm.subject}</strong>
                              <span className="text-fox-text-muted font-medium">({newAulaForm.year} - {newAulaForm.division})</span>
                            </div>
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-fox-surface border border-fox-border text-fox-text-muted">
                              {newAulaForm.topics.length} unidades
                            </span>
                          </div>

                          {/* Lista interactiva de Unidades */}
                          <div className="space-y-4">
                            {newAulaForm.topics.map((unit, unitIdx) => (
                              <div key={unit.id || unitIdx} className="bg-fox-surface border border-fox-border rounded-2xl p-4 shadow-2xs hover:border-fox-border/80 transition-all">
                                {/* Header de Unidad */}
                                <div className="flex gap-3 items-center mb-3">
                                  <span className="bg-fox-bg border border-fox-border w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black text-fox-text-main shrink-0">
                                    {unitIdx + 1}
                                  </span>
                                  <input 
                                    type="text" 
                                    value={unit.name}
                                    onChange={e => {
                                      const updated = [...newAulaForm.topics];
                                      updated[unitIdx].name = e.target.value;
                                      setNewAulaForm({...newAulaForm, topics: updated});
                                    }}
                                    placeholder="Nombre de la unidad..."
                                    className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-3 py-1.5 text-xs font-bold text-fox-text-main focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = newAulaForm.topics.filter((_, idx) => idx !== unitIdx);
                                      setNewAulaForm({...newAulaForm, topics: updated});
                                    }}
                                    className="text-fox-text-muted hover:text-red-500 hover:bg-red-500/10 p-1.5 rounded-xl transition-colors cursor-pointer"
                                    title="Eliminar unidad"
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                </div>

                                {/* Subtemas */}
                                <div className="pl-9 pr-1 space-y-2">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-fox-text-muted">
                                    Temas y Subtemas:
                                  </div>
                                  {unit.subtopics.map((subtopic, subIdx) => (
                                    <div key={subIdx} className="flex gap-2 items-center">
                                      <div className="w-1.5 h-1.5 rounded-full bg-fox-primary shrink-0"></div>
                                      <input 
                                        type="text" 
                                        value={subtopic}
                                        onChange={e => {
                                          const updated = [...newAulaForm.topics];
                                          updated[unitIdx].subtopics[subIdx] = e.target.value;
                                          setNewAulaForm({...newAulaForm, topics: updated});
                                        }}
                                        placeholder="Descripción del subtema..."
                                        className="flex-1 bg-fox-bg/50 border border-fox-border/60 hover:border-fox-border focus:border-fox-primary rounded-lg px-2.5 py-1 text-xs text-fox-text-main focus:outline-none transition-all"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updated = [...newAulaForm.topics];
                                          updated[unitIdx].subtopics = updated[unitIdx].subtopics.filter((_, idx) => idx !== subIdx);
                                          setNewAulaForm({...newAulaForm, topics: updated});
                                        }}
                                        className="text-fox-text-muted/50 hover:text-red-500 p-1 transition-colors cursor-pointer"
                                        title="Eliminar subtema"
                                      >
                                        <X size={14} />
                                      </button>
                                    </div>
                                  ))}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updated = [...newAulaForm.topics];
                                      updated[unitIdx].subtopics.push('Nuevo tema de estudio');
                                      setNewAulaForm({...newAulaForm, topics: updated});
                                    }}
                                    className="flex items-center gap-1 text-[11px] font-bold text-fox-primary hover:text-fox-primary/80 transition-colors pt-1 cursor-pointer"
                                  >
                                    <Plus size={12} /> Agregar tema
                                  </button>
                                </div>
                              </div>
                            ))}

                            {/* Botón Añadir Unidad */}
                            <button
                              type="button"
                              onClick={() => {
                                setNewAulaForm({
                                  ...newAulaForm, 
                                  topics: [
                                    ...newAulaForm.topics, 
                                    { 
                                      id: `u-${Date.now()}`, 
                                      name: `Unidad ${newAulaForm.topics.length + 1}: Nueva Unidad Temática`, 
                                      subtopics: ['Tema inicial 1', 'Tema inicial 2'] 
                                    }
                                  ]
                                });
                              }}
                              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-fox-border hover:border-fox-primary hover:bg-fox-primary/5 text-fox-text-muted hover:text-fox-primary rounded-2xl text-xs font-bold transition-all cursor-pointer"
                            >
                              <Plus size={16} /> Añadir otra Unidad
                            </button>
                          </div>

                          {/* Acciones Finales */}
                          <div className="pt-3 flex gap-3">
                            <button 
                              type="button"
                              onClick={() => setCreationStep('form')}
                              className="flex-1 px-4 py-3 border border-fox-border text-fox-text-main rounded-2xl font-bold text-xs hover:bg-fox-bg transition-colors cursor-pointer"
                            >
                              Modificar Datos
                            </button>
                            <button 
                              type="button"
                              onClick={handleCreateClassroom}
                              className="flex-[2] py-3 bg-fox-primary text-white rounded-2xl font-bold text-xs hover:bg-fox-primary/90 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                            >
                              <CheckCircle2 size={16} /> Confirmar y Crear Aula
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div 
            key="detail"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex-1 flex flex-col bg-fox-surface w-full h-full rounded-3xl overflow-hidden shadow-sm border border-fox-border mb-6"
          >
            <AulaDetail aula={selectedAula} onBack={() => setSelectedAula(null)} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- AULA DETAIL COMPONENT ---

function AulaDetail({ aula, onBack }: { aula: Classroom, onBack: () => void }) {
  const { navigationParams, setView } = useAppContext();
  const [tab, setTab] = useState<'alumnos'|'actividades'|'curricula'|'biblioteca'|'rendimiento'|'muro'>('alumnos');
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  
  // Invitation Modal State
  const [isInviteStudentModalOpen, setIsInviteStudentModalOpen] = useState(false);
  const [inviteModalTab, setInviteModalTab] = useState<'email' | 'code'>('email');
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [invitedEmailsList, setInvitedEmailsList] = useState<string[]>([]);
  const [inviteCustomNote, setInviteCustomNote] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [alumnosViewMode, setAlumnosViewMode] = useState<'grid'|'list'>('grid');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedActivity, setSelectedActivity] = useState<any | null>(null);
  const [selectedStudentProfile, setSelectedStudentProfile] = useState<any | null>(null);
  
  const [students, setStudents] = useState(sessionStudents);
  const [activities, setActivities] = useState(sharedActivities);
  const [submissions, setSubmissions] = useState(sharedSubmissions);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  const [libraryFiles, setLibraryFiles] = useState([
    { id: 1, title: "Manual de Biología Celular", type: "PDF", size: "2.4 MB", date: "12 may 2026", color: "text-red-500", bg: "bg-red-100" },
    { id: 2, title: "Diapositivas - Tema 1", type: "PPTX", size: "5.1 MB", date: "10 may 2026", color: "text-orange-500", bg: "bg-orange-100" },
    { id: 3, title: "Guía de Trabajos Prácticos", type: "PDF", size: "1.1 MB", date: "05 may 2026", color: "text-red-500", bg: "bg-red-100" },
  ]);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [newFileTitle, setNewFileTitle] = useState('');
  const [newFileType, setNewFileType] = useState('PDF');
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');

  const [curriculum, setCurriculum] = useState(sessionCurriculum.map(u => ({
    ...u,
    completedTopics: u.status === 'completed' ? [...u.topics] : u.status === 'current' ? [u.topics[0]] : []
  })));
  const [foxySuggestion, setFoxySuggestion] = useState<{topic: string, nextTopic: string | null} | null>(null);

  const handleToggleTopic = (unitId: number, topic: string) => {
    setCurriculum(prev => prev.map(u => {
      if (u.id === unitId) {
        const isCompleted = u.completedTopics.includes(topic);
        const newCompleted = isCompleted 
          ? u.completedTopics.filter(t => t !== topic)
          : [...u.completedTopics, topic];
        
        if (!isCompleted) {
          const topicIndex = u.topics.indexOf(topic);
          const nextTopic = topicIndex < u.topics.length - 1 ? u.topics[topicIndex + 1] : null;
          setFoxySuggestion({ topic, nextTopic });
        } else {
          setFoxySuggestion(null);
        }

        return { ...u, completedTopics: newCompleted };
      }
      return u;
    }));
  };

  const handleGenerateReports = () => {
    setView('copiloto', { initialPrompt: `Redactar reportes mensuales de desempeño académico y actitudinal para los alumnos de ${aula.subject} ${aula.course}. Enfócate en la asistencia, notas, entregas y sugiere recomendaciones para los padres enfocándote en los alumnos en riesgo.` });
  };

  const handleAddInviteEmail = (rawText?: string) => {
    const textToAdd = rawText !== undefined ? rawText : inviteEmailInput;
    if (!textToAdd.trim()) return;
    
    // Support multiple comma/space/semicolon-separated emails
    const candidateEmails = textToAdd
      .split(/[\s,;]+/)
      .map(e => e.trim().toLowerCase())
      .filter(e => e.length > 0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validEmails: string[] = [];
    const invalidEmails: string[] = [];

    candidateEmails.forEach(email => {
      if (emailRegex.test(email)) {
        if (!invitedEmailsList.includes(email) && !validEmails.includes(email)) {
          validEmails.push(email);
        }
      } else {
        invalidEmails.push(email);
      }
    });

    if (validEmails.length > 0) {
      setInvitedEmailsList(prev => [...prev, ...validEmails]);
      setInviteEmailInput('');
      toast.show(validEmails.length === 1 ? `✅ Correo ${validEmails[0]} agregado` : `✅ ${validEmails.length} correos agregados a la lista`, 'success');
    }

    if (invalidEmails.length > 0) {
      toast.show(`⚠️ Formato inválido: ${invalidEmails.join(', ')}`, 'warning');
    }
  };

  const handleRemoveInviteEmail = (emailToRemove: string) => {
    setInvitedEmailsList(prev => prev.filter(e => e !== emailToRemove));
  };

  const handleSendEmailInvitations = () => {
    let allEmails = [...invitedEmailsList];
    if (inviteEmailInput.trim()) {
      const email = inviteEmailInput.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (emailRegex.test(email) && !allEmails.includes(email)) {
        allEmails.push(email);
      }
    }

    if (allEmails.length === 0) {
      toast.show('Ingresa al menos un correo electrónico válido de alumno', 'warning');
      return;
    }

    const classCode = `${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;

    // Send invitations via messagingStore for each student email
    allEmails.forEach(email => {
      messagingStore.sendClassroomInvitation({
        recipientEmail: email,
        senderTeacherId: 'docente-laura',
        senderTeacherName: 'Prof. Laura Martínez',
        classroom: aula,
        code: classCode,
        customNote: inviteCustomNote.trim() || undefined
      });
    });

    toast.show(`📨 Se enviaron ${allEmails.length} invitación(es) a las cuentas de los alumnos.`, 'success');
    setIsInviteStudentModalOpen(false);
    setInviteEmailInput('');
    setInvitedEmailsList([]);
    setInviteCustomNote('');
  };

  const handleUploadFile = () => {
    if (!newFileTitle.trim()) {
      toast.show('Ingresa un título para el material', 'error');
      return;
    }
    const newFile = {
      id: Date.now(),
      title: newFileTitle,
      type: newFileType,
      size: `${(Math.random() * 5 + 0.5).toFixed(1)} MB`,
      date: new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' }),
      color: newFileType === 'PDF' ? "text-red-500" : newFileType === 'PPTX' ? "text-orange-500" : newFileType === 'DOCX' ? "text-blue-500" : "text-green-500",
      bg: newFileType === 'PDF' ? "bg-red-100" : newFileType === 'PPTX' ? "bg-orange-100" : newFileType === 'DOCX' ? "bg-blue-100" : "bg-green-100"
    };
    setLibraryFiles([newFile, ...libraryFiles]);
    setIsUploadModalOpen(false);
    setNewFileTitle('');
    setNewFileType('PDF');
    toast.show('Material subido correctamente a la biblioteca', 'success');
  };

  const handleDeleteFile = (id: number) => {
    setLibraryFiles(libraryFiles.filter(f => f.id !== id));
    toast.show('Material eliminado de la biblioteca', 'info');
  };

  const filteredLibraryFiles = libraryFiles.filter(file => 
    file.title.toLowerCase().includes(librarySearchTerm.toLowerCase()) || 
    file.type.toLowerCase().includes(librarySearchTerm.toLowerCase())
  );

  useEffect(() => {
    if (navigationParams?.openTask && navigationParams?.taskTitle) {
      setTab('actividades');
      const activity = activities.find(a => a.title === navigationParams.taskTitle) || activities[0];
      setSelectedActivity(activity);
      
      // Clear the params so it doesn't re-trigger if we navigate away and back
      setView('aulas', undefined);
    }
  }, [navigationParams, setView]);

  const handleCreateActivityFromModal = (newActivityData: CreatedActivityData) => {
    const newActivity = {
      id: newActivityData.id,
      title: newActivityData.title,
      type: newActivityData.type,
      status: newActivityData.status,
      due: newActivityData.due,
      submissions: newActivityData.submissions,
      description: newActivityData.description,
      longInstructions: newActivityData.longInstructions,
      attachment: newActivityData.attachment,
      rubric: newActivityData.rubric,
      duaAdaptations: newActivityData.duaAdaptations
    };
    setActivities(prev => {
      const next = [newActivity, ...prev];
      updateSharedActivities(next);
      return next;
    });
  };

  const handleAddLibraryFile = (newFile: LibraryItem) => {
    setLibraryFiles(prev => [newFile, ...prev]);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#FBFDFF]">
      {/* Unified Classroom Hero Header */}
      <ClassroomHeroHeader
        role="docente"
        subject={aula.subject}
        course={aula.course}
        color={aula.color}
        studentsCount={aula.studentsCount}
        onBack={onBack}
        activeTab={tab as AulaTabId}
        onNewActivity={() => setIsActivityModalOpen(true)}
        onViewPlan={() => setIsPlanModalOpen(true)}
      />

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Unified Tabs Nav */}
        <ClassroomTabsNav
          role="docente"
          activeTab={tab as AulaTabId}
          onTabChange={(newTab) => {
            setTab(newTab as any);
            setSelectedActivity(null);
          }}
          studentsCount={aula.studentsCount}
          activeTasksCount={activities.length}
        />

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto h-full">
          
          {/* TAB: ALUMNOS */}
          {tab === 'alumnos' && (
            <div className="space-y-6 animate-in fade-in">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div className="relative w-full max-w-md">
                  <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-fox-text-muted/70" />
                  <input 
                    type="text" 
                    value={studentSearchTerm}
                    onChange={(e) => setStudentSearchTerm(e.target.value)}
                    placeholder="Buscar alumno por nombre..." 
                    className="w-full bg-fox-bg border border-fox-border rounded-xl pl-10 pr-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all" 
                  />
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="flex bg-fox-bg p-1 rounded-xl border border-fox-border">
                    <button
                      onClick={() => setAlumnosViewMode('grid')}
                      className={`p-1.5 rounded-lg transition-colors ${alumnosViewMode === 'grid' ? 'bg-fox-surface shadow-sm text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'}`}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setAlumnosViewMode('list')}
                      className={`p-1.5 rounded-lg transition-colors ${alumnosViewMode === 'list' ? 'bg-fox-surface shadow-sm text-fox-primary' : 'text-fox-text-muted hover:text-fox-text-main'}`}
                    >
                      <List size={18} />
                    </button>
                  </div>
                    <button 
                      onClick={handleGenerateReports}
                      className="flex-1 sm:flex-none justify-center bg-fox-purple text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                      <FileText size={18} /> Reportes
                    </button>
                    <button 
                      onClick={() => setIsInviteStudentModalOpen(true)}
                      className="flex-1 sm:flex-none justify-center bg-fox-primary text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-fox-primary/90 transition-colors shadow-sm flex items-center gap-2 whitespace-nowrap"
                    >
                      <Plus size={18} /> Invitar
                    </button>
                  </div>
                </div>
              
              {alumnosViewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {students
                    .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                    .map(student => (
                    <div 
                      key={student.id} 
                      className="bg-fox-surface border border-fox-border rounded-3xl p-5 hover:shadow-lg hover:border-fox-primary/30 transition-all duration-300 cursor-pointer group flex flex-col hover:-translate-y-1 relative overflow-hidden"
                      onClick={() => setSelectedStudentProfile(student)}
                    >
                      {/* Decorative gradient background */}
                      <div className="absolute top-0 right-0 w-32 h-32 bg-fox-primary/5 rounded-full blur-2xl transform translate-x-8 -translate-y-8 group-hover:bg-fox-primary/10 transition-colors pointer-events-none"></div>
  
                      <div className="flex justify-between items-start mb-5 relative z-10">
                        <div className="flex gap-3 items-center">
                          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-fox-primary/10 to-fox-purple/10 flex items-center justify-center font-extrabold text-fox-primary shadow-sm border border-fox-primary/10">
                            {student.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <h4 className="font-bold text-fox-text-main group-hover:text-fox-primary transition-colors line-clamp-1">{student.name}</h4>
                            <p className="text-xs text-fox-text-muted font-medium flex items-center gap-1 mt-0.5"><Clock size={12} className="opacity-70"/> {student.lastSeen}</p>
                          </div>
                        </div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider font-extrabold shadow-sm ${
                          student.risk === 'ALTO' ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30' : 
                          student.risk === 'MEDIO' ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-500/30' : 
                          'bg-green-50 text-green-600 ring-1 ring-green-500/30'
                        }`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            student.risk === 'ALTO' ? 'bg-red-500 animate-pulse' : 
                            student.risk === 'MEDIO' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}></div>
                          {student.risk}
                        </span>
                      </div>
                      
                      <div className="bg-fox-bg rounded-2xl p-3 border border-fox-border/60 mt-auto relative z-10 group-hover:bg-white transition-colors">
                        <p className="text-[9px] font-extrabold text-fox-text-muted uppercase tracking-widest mb-2">Perfil de Aprendizaje (DUA)</p>
                        {student.dua.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {student.dua.map(d => (
                              <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 hover:border-fox-green/40 hover:bg-fox-green/20 transition-colors text-[10px] font-bold px-2 py-1 rounded-lg">{d}</span>
                            ))}
                          </div>
                        ) : <span className="text-fox-text-muted/50 text-xs italic font-medium">Sin perfil específico</span>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="border border-fox-border rounded-2xl overflow-hidden shadow-sm bg-fox-surface">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-fox-bg border-b border-fox-border text-xs uppercase tracking-wider text-fox-text-muted font-bold">
                        <th className="p-4 pl-6">Alumno</th>
                        <th className="p-4">Riesgo</th>
                        <th className="p-4">Perfil DUA</th>
                        <th className="p-4">Última Actividad</th>
                        <th className="p-4 text-right pr-6">Acciones</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-fox-border/50">
                      {students
                        .filter(s => s.name.toLowerCase().includes(studentSearchTerm.toLowerCase()))
                        .map(student => (
                        <tr key={student.id} className="hover:bg-fox-bg/50 transition-colors cursor-pointer" onClick={() => setSelectedStudentProfile(student)}>
                          <td className="p-4 pl-6">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fox-primary/5 to-fox-purple/5 border border-fox-primary/10 flex items-center justify-center font-bold text-fox-primary shadow-sm">
                                {student.name.split(' ').map(n => n[0]).join('')}
                              </div>
                              <span className="font-bold text-fox-text-main">{student.name}</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase font-extrabold ${
                              student.risk === 'ALTO' ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30' : 
                              student.risk === 'MEDIO' ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-500/30' : 
                              'bg-green-50 text-green-600 ring-1 ring-green-500/30'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                student.risk === 'ALTO' ? 'bg-red-500 animate-pulse' : 
                                student.risk === 'MEDIO' ? 'bg-yellow-500' : 'bg-green-500'
                              }`}></div>
                              {student.risk}
                            </span>
                          </td>
                          <td className="p-4">
                            {student.dua.length > 0 ? (
                              <div className="flex gap-1.5 flex-wrap">
                                {student.dua.map(d => (
                                  <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-[10px] font-bold px-2 py-1 rounded-md">{d}</span>
                                ))}
                              </div>
                            ) : <span className="text-fox-text-muted/70 text-sm">-</span>}
                          </td>
                          <td className="p-4 text-xs font-medium text-fox-text-muted">{student.lastSeen}</td>
                          <td className="p-4 text-right pr-6">
                            <button 
                              onClick={(e) => { e.stopPropagation(); setSelectedStudentProfile(student); }}
                              className="p-2 text-fox-text-muted/70 hover:text-fox-primary hover:bg-fox-primary/10 rounded-lg transition-colors inline-flex"
                            >
                              <Eye size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACTIVIDADES */}
          {tab === 'actividades' && (
            <div className="animate-in fade-in h-full">
              {selectedActivity ? (
                <TeacherActivityDetail 
                  activity={selectedActivity} 
                  submissions={submissions}
                  setSubmissions={setSubmissions}
                  onBack={() => setSelectedActivity(null)} 
                  subjectName={aula.subject}
                  courseName={aula.course}
                />
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-2">
                    <div>
                      <h3 className="font-heading font-bold text-fox-text-main text-lg">Actividades y Evaluaciones</h3>
                      <p className="text-xs text-fox-text-muted">Gestiona las consignas asignadas, rúbricas y adaptaciones DUA.</p>
                    </div>
                    <button 
                      onClick={() => setIsActivityModalOpen(true)}
                      className="bg-fox-primary hover:bg-fox-primary/90 text-white font-bold text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-2"
                    >
                      <Plus size={16} />
                      <span>Nueva Actividad</span>
                    </button>
                  </div>

                  {activities.map(act => (
                    <div key={act.id} onClick={() => setSelectedActivity(act)} className="p-5 border border-fox-border rounded-2xl hover:border-fox-primary/30 hover:shadow-md transition-all bg-fox-surface group cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className={`p-3 rounded-xl ${act.status === 'Activa' ? 'bg-fox-primary/10 text-fox-primary' : 'bg-fox-border/50 text-fox-text-muted'}`}>
                          <FileText size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <h4 className="font-bold text-fox-text-main text-lg group-hover:text-fox-primary transition-colors">{act.title}</h4>
                            <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full ${act.status === 'Activa' ? 'bg-fox-green/10 text-fox-green' : 'bg-fox-border/50 text-fox-text-muted'}`}>
                              {act.status}
                            </span>
                            {(act as any).duaAdaptations && (act as any).duaAdaptations.length > 0 && (
                              <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-full bg-fox-orange/10 text-fox-orange border border-fox-orange/20 flex items-center gap-1">
                                <Sparkles size={10} /> DUA ({(act as any).duaAdaptations.length})
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-sm text-fox-text-muted font-medium">
                            <span className="flex items-center gap-1"><LayoutList size={14}/> {act.type}</span>
                            <span className="flex items-center gap-1"><Clock size={14}/> Vence: {act.due}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 md:border-l md:border-fox-border md:pl-6">
                        <div className="text-center">
                          <p className="text-xs font-bold text-fox-text-muted/70 uppercase tracking-wider mb-1">Entregas</p>
                          <p className="font-bold text-fox-text-main text-lg">{act.submissions}</p>
                        </div>
                        <button className="bg-fox-bg hover:bg-fox-border/50 text-fox-text-main/80 px-4 py-2 rounded-xl font-bold text-sm transition-colors flex items-center gap-2">
                          Ver detalle <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: CURRICULA */}
          {tab === 'curricula' && (
            <ClassroomCurriculaTab
              role="docente"
              subjectName={aula.subject}
              curriculum={curriculum}
              onToggleTopic={handleToggleTopic}
            />
          )}

          {/* TAB: BIBLIOTECA */}
          {tab === 'biblioteca' && (
            <ClassroomBibliotecaTab
              role="docente"
              subjectName={aula.subject}
            />
          )}

          {/* TAB: RENDIMIENTO */}
          {tab === 'rendimiento' && (
            <ClassroomRendimientoTab
              role="docente"
              subjectName={aula.subject}
              students={students}
              onSelectStudentProfile={(st) => setSelectedStudentProfile(st)}
            />
          )}

          {/* TAB: MURO */}
          {tab === 'muro' && (
            <ClassroomMuroTab
              role="docente"
              aulaId={aula.id}
              subjectName={aula.subject}
              courseName={aula.course}
            />
          )}
          </div>
        </div>
      </div>

      {/* Modal Nueva Actividad (Flujo Crear con IA / Subir Archivo + DUA) */}
      <CreateActivityModal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        subjectName={aula.subject}
        courseName={aula.course}
        curriculum={curriculum}
        libraryFiles={libraryFiles}
        students={students}
        onCreateActivity={handleCreateActivityFromModal}
        onAddLibraryFile={handleAddLibraryFile}
      />

      {/* Plan de Estudios PDF Modal */}
      <AnimatePresence>
        {isPlanModalOpen && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col h-[85vh]"
            >
              <div className="p-5 border-b border-fox-border flex justify-between items-center bg-fox-bg/80 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 text-red-600 rounded-lg">
                    <FileText size={20} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-fox-text-main text-lg">plan_de_estudios_anual.pdf</h3>
                    <p className="text-xs text-fox-text-muted font-medium">Cargado el 12 de Mayo, 2026</p>
                  </div>
                </div>
                <button onClick={() => setIsPlanModalOpen(false)} className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 shadow-sm border border-fox-border transition-colors"><X size={20} /></button>
              </div>
              
              <div className="flex-1 bg-gray-100/50 p-6 overflow-y-auto flex items-center justify-center">
                <div className="w-full max-w-3xl bg-white shadow-md rounded-xl aspect-[1/1.4] border border-gray-200 p-12 flex items-center justify-center text-center">
                  <div>
                    <FileText size={64} className="mx-auto text-gray-300 mb-4" />
                    <h3 className="text-2xl font-heading font-bold text-gray-400 mb-2">Visor PDF Original</h3>
                    <p className="text-gray-400 max-w-sm mx-auto font-medium">Aquí se mostraría el archivo PDF original subido por el docente con el plan de estudios, sin la interpretación de la IA.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Upload Library Modal */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#FBFDFF] w-full max-w-md rounded-3xl shadow-2xl p-6 flex flex-col"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                  <Upload size={24} className="text-fox-primary" /> Subir Material
                </h3>
                <button onClick={() => setIsUploadModalOpen(false)} className="text-fox-text-muted hover:text-fox-text-main transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Título del Material</label>
                <input 
                  type="text"
                  placeholder="Ej. Guía de Estudio Completa"
                  value={newFileTitle}
                  onChange={(e) => setNewFileTitle(e.target.value)}
                  className="w-full p-3 border border-fox-border rounded-xl text-sm focus:outline-none focus:border-fox-primary focus:ring-1 focus:ring-fox-primary transition-all text-fox-text-main font-medium"
                />
              </div>

              <div className="mb-6">
                <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Tipo de Archivo</label>
                <div className="grid grid-cols-3 gap-3">
                  {['PDF', 'PPTX', 'DOCX', 'LINK'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewFileType(type)}
                      className={`py-2 px-3 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-2 ${newFileType === type ? 'border-fox-primary text-fox-primary bg-fox-primary/5' : 'border-fox-border text-fox-text-muted hover:border-fox-primary/30'}`}
                    >
                      {type === 'PDF' && <FileText size={16} />}
                      {type === 'PPTX' && <LayoutList size={16} />}
                      {type === 'DOCX' && <FileText size={16} />}
                      {type === 'LINK' && <Upload size={16} />}
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-2 border-dashed border-fox-border rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-fox-bg/50 mb-6 group cursor-pointer hover:border-fox-primary/50 transition-colors">
                 <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-fox-border flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                   <Upload size={20} className="text-fox-primary" />
                 </div>
                 <span className="text-sm font-bold text-fox-text-main group-hover:text-fox-primary transition-colors">Arrastra tu archivo aquí</span>
                 <span className="text-xs font-medium text-fox-text-muted mt-1">o haz clic para buscar en tu PC</span>
                 <span className="text-[10px] font-bold text-fox-text-muted/60 uppercase tracking-widest mt-3">Max 50 MB</span>
              </div>

              <div className="flex justify-end gap-3">
                <button 
                  onClick={() => setIsUploadModalOpen(false)} 
                  className="px-5 py-2.5 rounded-xl font-bold text-sm text-fox-text-muted hover:bg-fox-bg transition-colors"
                 >
                  Cancelar
                </button>
                <button 
                  onClick={handleUploadFile} 
                  className="flex items-center gap-2 bg-fox-primary hover:bg-fox-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
                >
                  Subir Archivo
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Profile Panel */}
      <AnimatePresence>
        {selectedStudentProfile && (
          <StudentProfilePanel 
            student={selectedStudentProfile} 
            onClose={() => setSelectedStudentProfile(null)} 
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isInviteStudentModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-fox-border flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-fox-border bg-fox-surface flex justify-between items-center relative shrink-0">
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-fox-primary via-fox-purple to-fox-orange"></div>
                <div>
                  <h3 className="text-xl font-heading font-bold text-fox-text-main flex items-center gap-2">
                    <GraduationCap size={24} className="text-fox-primary" /> Invitar Alumnos al Aula
                  </h3>
                  <p className="text-xs text-fox-text-muted mt-0.5">
                    {aula.subject} • {aula.course}
                  </p>
                </div>
                <button 
                  onClick={() => {
                    setIsInviteStudentModalOpen(false);
                    setInviteEmailInput('');
                    setInvitedEmailsList([]);
                    setInviteCustomNote('');
                  }} 
                  className="p-2 text-fox-text-muted hover:bg-fox-border/50 rounded-full transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Navigation Tabs */}
              <div className="px-6 pt-4 pb-2 bg-fox-bg/40 border-b border-fox-border shrink-0">
                <div className="grid grid-cols-2 p-1 bg-fox-surface rounded-2xl border border-fox-border shadow-xs gap-1">
                  <button
                    type="button"
                    onClick={() => setInviteModalTab('email')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inviteModalTab === 'email'
                        ? 'bg-fox-primary text-white shadow-sm'
                        : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg/60'
                    }`}
                  >
                    <Mail size={15} /> Por Correo de Plataforma
                  </button>
                  <button
                    type="button"
                    onClick={() => setInviteModalTab('code')}
                    className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                      inviteModalTab === 'code'
                        ? 'bg-fox-primary text-white shadow-sm'
                        : 'text-fox-text-muted hover:text-fox-text-main hover:bg-fox-bg/60'
                    }`}
                  >
                    <KeyRound size={15} /> Código de Acceso
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="p-6 space-y-5 bg-fox-bg/40 overflow-y-auto flex-1">
                {inviteModalTab === 'email' ? (
                  /* TAB 1: EMAIL INVITATION */
                  <div className="space-y-4">
                    {/* Method Info Banner */}
                    <div className="p-3.5 rounded-2xl bg-fox-primary/10 border border-fox-primary/20 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-fox-primary/15 text-fox-primary shrink-0 mt-0.5">
                        <Mail size={16} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-fox-text-main">Invitación directa por correo institucional</h4>
                        <p className="text-fox-text-muted mt-0.5 leading-relaxed text-[11px]">
                          Ingresa el correo de los alumnos registrados en la plataforma. Recibirán una tarjeta interactiva en su bandeja de mensajes de FoxMind para unirse con 1 clic.
                        </p>
                      </div>
                    </div>

                    {/* Email Input with Add Button */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted block">
                        Correo electrónico del alumno
                      </label>
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
                          <input 
                            type="email" 
                            value={inviteEmailInput}
                            onChange={(e) => setInviteEmailInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ',') {
                                e.preventDefault();
                                handleAddInviteEmail();
                              }
                            }}
                            placeholder="ej: alumno@escuela.edu.ar (o varios separados por coma)"
                            className="w-full bg-fox-surface border border-fox-border rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary outline-none transition-all text-xs font-medium text-fox-text-main shadow-xs"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddInviteEmail()}
                          disabled={!inviteEmailInput.trim()}
                          className="px-3.5 py-2.5 bg-fox-primary/10 hover:bg-fox-primary/20 text-fox-primary font-bold text-xs rounded-xl border border-fox-primary/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer flex items-center gap-1 shrink-0"
                        >
                          <Plus size={15} /> Agregar
                        </button>
                      </div>
                      <p className="text-[11px] text-fox-text-muted">
                        Presiona <span className="font-mono font-bold bg-fox-surface px-1 py-0.5 rounded border border-fox-border">Enter</span> o <span className="font-mono font-bold bg-fox-surface px-1 py-0.5 rounded border border-fox-border">,</span> para añadir varios destinatarios.
                      </p>
                    </div>

                    {/* Invited Emails Chips Container */}
                    {invitedEmailsList.length > 0 && (
                      <div className="bg-fox-surface p-3.5 rounded-2xl border border-fox-border space-y-2.5 shadow-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-fox-text-main flex items-center gap-1.5">
                            <UserCheck size={14} className="text-fox-primary" />
                            Alumnos a invitar ({invitedEmailsList.length})
                          </span>
                          <button
                            type="button"
                            onClick={() => setInvitedEmailsList([])}
                            className="text-[11px] font-bold text-red-500 hover:underline cursor-pointer"
                          >
                            Limpiar lista
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-1">
                          {invitedEmailsList.map(email => (
                            <span
                              key={email}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-fox-primary/10 border border-fox-primary/20 text-fox-primary font-medium text-xs shadow-2xs"
                            >
                              <span className="truncate max-w-[200px]">{email}</span>
                              <button
                                type="button"
                                onClick={() => handleRemoveInviteEmail(email)}
                                className="hover:bg-fox-primary/20 rounded p-0.5 transition-colors cursor-pointer text-fox-primary/70 hover:text-fox-primary"
                                title="Eliminar"
                              >
                                <X size={12} />
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Custom Message */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted block">
                        Mensaje personalizado (opcional)
                      </label>
                      <textarea
                        value={inviteCustomNote}
                        onChange={e => setInviteCustomNote(e.target.value)}
                        placeholder={`Hola, te invito a sumarte a nuestra aula virtual de ${aula.subject} (${aula.course}) para acceder a las consignas, materiales y seguimiento pedagógico...`}
                        rows={2}
                        className="w-full bg-fox-surface border border-fox-border rounded-xl p-3 text-xs text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:ring-2 focus:ring-fox-primary/20 focus:border-fox-primary resize-none font-medium shadow-xs"
                      />
                    </div>
                  </div>
                ) : (
                  /* TAB 2: ACCESS CODE */
                  <div className="space-y-4">
                    {/* Method Info Banner */}
                    <div className="p-3.5 rounded-2xl bg-fox-purple/10 border border-fox-purple/20 flex items-start gap-3">
                      <div className="p-2 rounded-xl bg-fox-purple/15 text-fox-purple shrink-0 mt-0.5">
                        <KeyRound size={16} />
                      </div>
                      <div className="text-xs">
                        <h4 className="font-bold text-fox-text-main">Matriculación particular del alumno</h4>
                        <p className="text-fox-text-muted mt-0.5 leading-relaxed text-[11px]">
                          Comparte este código o enlace con tus estudiantes para que ellos mismos se unan de forma autónoma desde su cuenta.
                        </p>
                      </div>
                    </div>

                    {/* Class Code Card */}
                    <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border shadow-xs space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted">
                          Código de Inscripción al Aula
                        </label>
                        <span className="text-[11px] text-fox-primary font-bold">Ciclo lectivo 2026</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-4 py-3 font-mono font-black text-center text-fox-primary text-lg tracking-widest shadow-inner">
                          {`${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`}
                        </div>
                        <button 
                          onClick={() => {
                            const code = `${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;
                            navigator.clipboard.writeText(code);
                            setCopiedCode(true);
                            toast.show('📋 Código copiado al portapapeles', 'info');
                            setTimeout(() => setCopiedCode(false), 2000);
                          }}
                          className="px-4 py-3 bg-fox-primary text-white font-bold text-xs rounded-xl hover:bg-fox-primary/90 transition-all flex items-center gap-1.5 shadow-sm cursor-pointer shrink-0"
                        >
                          {copiedCode ? <Check size={16} /> : <Copy size={16} />}
                          <span>{copiedCode ? 'Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Direct URL Card */}
                    <div className="bg-fox-surface p-4 rounded-2xl border border-fox-border shadow-xs space-y-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-fox-text-muted flex items-center gap-1.5">
                        <Link size={13} className="text-fox-text-muted" /> Enlace directo de invitación
                      </label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="text" 
                          readOnly 
                          value={`https://foxmind.app/unirse?code=${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`}
                          className="flex-1 bg-fox-bg border border-fox-border rounded-xl px-3.5 py-2.5 text-xs text-fox-text-muted font-mono select-all outline-none"
                        />
                        <button 
                          onClick={() => {
                            const url = `https://foxmind.app/unirse?code=${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;
                            navigator.clipboard.writeText(url);
                            setCopiedLink(true);
                            toast.show('🔗 Enlace copiado al portapapeles', 'info');
                            setTimeout(() => setCopiedLink(false), 2000);
                          }}
                          className="px-3.5 py-2.5 bg-fox-purple/10 hover:bg-fox-purple/20 text-fox-purple font-bold text-xs rounded-xl border border-fox-purple/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                        >
                          {copiedLink ? <Check size={15} /> : <Copy size={15} />}
                          <span>{copiedLink ? 'Copiado' : 'Copiar Enlace'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Step by step guide */}
                    <div className="bg-fox-surface/80 p-4 rounded-2xl border border-fox-border space-y-2">
                      <h5 className="text-xs font-bold text-fox-text-main flex items-center gap-1.5">
                        <Info size={14} className="text-fox-primary" /> ¿Cómo se suma el alumno?
                      </h5>
                      <ol className="text-xs text-fox-text-muted space-y-1.5 list-decimal list-inside leading-relaxed">
                        <li>El alumno ingresa a FoxMind con su cuenta personal.</li>
                        <li>En el menú lateral abre <strong>Mis Aulas</strong> y presiona <strong>"Unirse a un Aula"</strong>.</li>
                        <li>Ingresa este código de acceso y queda matriculado automáticamente.</li>
                      </ol>
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-fox-border bg-fox-surface flex justify-between items-center shrink-0">
                <span className="text-xs text-fox-text-muted font-medium">
                  {inviteModalTab === 'email'
                    ? `${invitedEmailsList.length + (inviteEmailInput.trim() ? 1 : 0)} destinatario(s) preparado(s)`
                    : 'Código válido para el ciclo 2026'}
                </span>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setIsInviteStudentModalOpen(false);
                      setInviteEmailInput('');
                      setInvitedEmailsList([]);
                      setInviteCustomNote('');
                    }} 
                    className="px-4 py-2.5 font-bold text-xs text-fox-text-muted hover:bg-fox-border/50 rounded-xl transition-colors cursor-pointer"
                  >
                    {inviteModalTab === 'email' ? 'Cancelar' : 'Cerrar'}
                  </button>

                  {inviteModalTab === 'email' ? (
                    <button 
                      onClick={handleSendEmailInvitations}
                      disabled={invitedEmailsList.length === 0 && !inviteEmailInput.trim()}
                      className={`px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 transition-all shadow-md cursor-pointer ${
                        invitedEmailsList.length > 0 || inviteEmailInput.trim()
                          ? 'bg-fox-primary text-white hover:bg-fox-primary/90 active:scale-98'
                          : 'bg-fox-border text-fox-text-muted/40 cursor-not-allowed'
                      }`}
                    >
                      <SendHorizontal size={14} /> Enviar Invitación{invitedEmailsList.length > 1 ? 'es' : ''}
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        const code = `${aula.course.substring(0,3).toUpperCase()}-2026-${aula.id.toUpperCase()}`;
                        navigator.clipboard.writeText(code);
                        toast.show('📋 Código copiado al portapapeles', 'success');
                        setIsInviteStudentModalOpen(false);
                      }}
                      className="px-5 py-2.5 font-bold rounded-xl text-xs flex items-center gap-2 bg-fox-primary text-white hover:bg-fox-primary/90 transition-all shadow-md cursor-pointer"
                    >
                      <Copy size={14} /> Copiar y Cerrar
                    </button>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- ACTIVITY DETAIL VIEW COMPONENT ---

function ActivityDetailView({ activity, submissions, setSubmissions, onBack }: { activity: any, submissions: any[], setSubmissions: (subs: any[]) => void, onBack: () => void }) {
  const [isAdaptModalOpen, setIsAdaptModalOpen] = useState(false);
  const [studentToAdapt, setStudentToAdapt] = useState<any>(null);
  const [isAdapting, setIsAdapting] = useState(false);
  const [adaptedContent, setAdaptedContent] = useState<string | null>(null);
  const [adaptedSummary, setAdaptedSummary] = useState<string | null>(null);
  const [selectedSubmissionToGrade, setSelectedSubmissionToGrade] = useState<any>(null);
  const [selectedSubmissionIds, setSelectedSubmissionIds] = useState<number[]>([]);

  const handleNotify = () => {
    toast.show('🔔 Recordatorio enviado a los alumnos pendientes', 'success');
  };

  const handleAdaptClick = (student: any) => {
    setStudentToAdapt(student);
    setIsAdaptModalOpen(true);
    setIsAdapting(true);
    setAdaptedContent(null);
    setAdaptedSummary(null);
    setTimeout(() => {
      setIsAdapting(false);
      setAdaptedSummary(`Adaptaciones sugeridas por Foxy para el perfil [${student.dua.join(', ')}]:\n• Instrucciones simplificadas y divididas en pasos.\n• Opción de entrega en formato multimedia (audio/video).\n• Tiempo extendido implícito.\n• Foco en la síntesis personal (qué te llamó la atención).`);
      setAdaptedContent(`Paso 1: Lee o escucha los materiales sobre Vicente Huidobro y Guillermo de Torre. (Puedes usar el audio-resumen adjunto).\n\nPaso 2: A partir de lo visto, graba un audio de 2 minutos o escribe un breve texto respondiendo:\n- ¿Qué es lo que más te llamó la atención del Creacionismo?\n- ¿En qué se diferencia del Ultraísmo de forma sencilla?`);
    }, 2500);
  };

  const handleConfirmAdapt = () => {
    toast.show(`✅ Actividad adaptada enviada a ${studentToAdapt.name}`, 'success');
    setIsAdaptModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#FBFDFF] overflow-y-auto animate-in slide-in-from-right-4 flex flex-col">
      {/* Fixed Header */}
      <div className="bg-white border-b border-fox-border sticky top-0 z-20 shadow-sm px-4 md:px-8 h-20 flex items-center justify-between shrink-0">
        <div className="flex-1 flex items-center justify-start">
          <button onClick={onBack} className="flex items-center gap-2 text-fox-text-muted hover:text-fox-primary transition-colors font-bold group" title="Volver al Aula">
            <div className="w-10 h-10 bg-fox-bg group-hover:bg-fox-primary/10 rounded-xl flex items-center justify-center transition-colors">
               <ChevronLeft size={20} className="group-hover:text-fox-primary transition-colors" />
            </div>
            <span className="hidden sm:inline text-sm">Volver al Aula</span>
          </button>
        </div>
        
        <div className="flex-[2] flex flex-col items-center justify-center min-w-0 px-4">
           <h1 className="text-xl md:text-2xl font-heading font-black text-fox-text-main truncate max-w-full">
             {activity.title}
           </h1>
        </div>
        
        <div className="flex-1 flex items-center justify-end gap-3 shrink-0">
           <span className={`hidden md:inline-flex text-xs uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg border ${activity.status === 'Activa' ? 'bg-fox-green/10 text-fox-green border-fox-green/20' : 'bg-fox-border/50 text-fox-text-muted border-fox-border'}`}>
             {activity.status}
           </span>
          <button onClick={handleNotify} className="bg-fox-orange/10 text-fox-orange border border-fox-orange/20 hover:bg-fox-orange hover:text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-all flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-fox-orange/50">
            <Bell size={18} />
            <span className="hidden sm:inline">Notificar</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-8 flex-1">
        
        {/* Activity Details Card */}
        <div className="bg-fox-surface border border-fox-border rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
            <div>
               <div className="flex items-center gap-2 mb-3">
                 <span className="text-[10px] uppercase tracking-wider font-bold px-3 py-1 rounded-md bg-fox-primary/10 text-fox-primary">
                  {activity.type}
                 </span>
                 <span className="text-xs text-fox-text-muted font-bold flex items-center gap-1.5 border border-fox-border rounded-md px-3 py-1 bg-fox-bg">
                   <Clock size={14} className="text-fox-orange"/> Vence: {activity.due}
                 </span>
               </div>
              <h1 className="text-3xl font-heading font-bold text-fox-text-main">{activity.title}</h1>
            </div>
          </div>
          
          <div className="bg-fox-bg rounded-2xl p-6 text-sm text-fox-text-main/80 border border-fox-border shadow-inner">
            <p className="font-bold mb-3 text-fox-text-main/60 uppercase tracking-wider flex items-center gap-2">
              <FileText size={16} /> Consigna General
            </p>
            <p className="whitespace-pre-wrap leading-relaxed text-fox-text-main text-base">{activity.description}</p>
            
            {activity.attachment && (
               <div className="mt-6 pt-6 border-t border-fox-border">
                  <h4 className="font-bold text-fox-text-main text-sm mb-3">Archivo Adjunto</h4>
                  <div className="bg-fox-surface border border-fox-border p-3 rounded-xl flex items-center justify-between gap-3 group mb-2 hover:border-fox-primary/30 transition-colors w-full md:w-1/2">
                     <div className="flex items-center gap-3 min-w-0">
                       <div className="p-2 bg-red-100 text-red-500 rounded-lg shrink-0">
                          <FileText size={16} />
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-bold text-fox-text-main truncate max-w-[120px] lg:max-w-[200px]">{activity.attachment.name}</p>
                         <p className="text-[10px] text-fox-text-muted mt-0.5">{activity.attachment.size}</p>
                       </div>
                     </div>
                     <div className="flex items-center gap-1 shrink-0">
                       <button 
                         onClick={() => window.open(activity.attachment.url, '_blank')}
                         className="p-1.5 text-fox-text-muted hover:text-fox-primary hover:bg-fox-primary/10 rounded-md transition-colors tooltip-trigger"
                         title="Vista previa"
                       >
                         <Eye size={16} />
                       </button>
                       <button 
                         onClick={() => {
                           toast.show('Descargando archivo...', 'success');
                           setTimeout(() => window.open(activity.attachment.url, '_blank'), 1000);
                         }}
                         className="p-1.5 text-fox-text-muted hover:text-fox-primary hover:bg-fox-primary/10 rounded-md transition-colors tooltip-trigger"
                         title="Descargar"
                       >
                         <Trash2 size={16} className="hidden" />
                         <Upload size={16} className="hidden" />
                         <span className="sr-only">Descargar</span>
                         <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-download"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                       </button>
                     </div>
                  </div>
               </div>
            )}

            {/* Rubric View */}
            {activity.rubric && activity.rubric.length > 0 && (
              <div className="mt-6 pt-6 border-t border-fox-border">
                <h4 className="font-bold text-fox-text-main text-sm mb-3">Rúbrica de Evaluación</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {activity.rubric.map((r: any, idx: number) => (
                    <div key={idx} className="bg-fox-surface border border-fox-border rounded-xl p-3 flex justify-between items-center">
                      <span className="text-xs font-semibold text-fox-text-main">{r.criteria}</span>
                      <span className="text-xs font-bold text-fox-primary bg-fox-primary/10 px-2 py-0.5 rounded-md">{r.points} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* DUA Adaptations View */}
            {activity.duaAdaptations && activity.duaAdaptations.length > 0 && (
              <div className="mt-6 pt-6 border-t border-fox-border">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles size={16} className="text-fox-orange" />
                  <h4 className="font-bold text-fox-text-main text-sm">Adaptaciones DUA Asignadas</h4>
                  <span className="bg-fox-orange/10 text-fox-orange text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                    {activity.duaAdaptations.length} alumnos
                  </span>
                </div>
                <div className="space-y-3">
                  {activity.duaAdaptations.map((adapt: any, idx: number) => (
                    <div key={idx} className="bg-fox-surface border border-fox-orange/20 rounded-xl p-4">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-xs font-bold text-fox-text-main">{adapt.student}</span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-fox-orange/10 text-fox-orange border border-fox-orange/20">
                          {adapt.type}
                        </span>
                      </div>
                      <p className="text-xs text-fox-text-muted leading-relaxed whitespace-pre-wrap">{adapt.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submissions Section */}
        <div className="bg-fox-surface border border-fox-border rounded-3xl shadow-sm overflow-hidden">
          <div className="p-6 border-b border-fox-border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-fox-bg/50">
            <div>
              <h2 className="font-heading font-bold text-fox-text-main text-xl">Estado de Entregas</h2>
              <p className="text-sm text-fox-text-muted font-medium mt-1">{activity.submissions} alumnos han entregado esta actividad</p>
            </div>
            {selectedSubmissionIds.length > 0 && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4">
                <span className="text-sm font-bold text-fox-primary px-3">{selectedSubmissionIds.length} seleccionados</span>
                <button 
                  onClick={() => {
                    const hasMissing = submissions.some(s => selectedSubmissionIds.includes(s.studentId) && s.status === 'missing');
                    if (hasMissing) {
                      toast.show(`Recordatorio enviado a ${selectedSubmissionIds.length} alumnos`, 'success');
                    } else {
                      // Mark as graded with an average bulk grade or simply graded
                      const newSubs = submissions.map(sub => 
                        selectedSubmissionIds.includes(sub.studentId) && sub.status === 'submitted'
                          ? { ...sub, status: 'graded', grade: 10 } 
                          : sub
                      );
                      setSubmissions(newSubs);
                      updateSharedSubmissions(newSubs);
                      toast.show(`Calificación máxima aplicada a los seleccionados`, 'success');
                    }
                    setSelectedSubmissionIds([]);
                  }}
                  className="bg-fox-primary text-white hover:bg-fox-primary/90 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-2 text-xs font-bold shadow-sm"
                >
                  <CheckSquare size={16} /> Acción en lote
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="bg-fox-surface/50 border-b border-fox-border text-xs uppercase tracking-wider text-fox-text-muted/80 font-bold">
                  <th className="p-5 w-12">
                    <button 
                      onClick={() => {
                        if (selectedSubmissionIds.length === submissions.length) {
                          setSelectedSubmissionIds([]);
                        } else {
                          setSelectedSubmissionIds(submissions.map(s => s.studentId));
                        }
                      }}
                      className="text-fox-text-muted hover:text-fox-primary transition-colors flex items-center"
                    >
                      {selectedSubmissionIds.length === submissions.length ? <CheckSquare size={18} className="text-fox-primary" /> : <Square size={18} />}
                    </button>
                  </th>
                  <th className="p-5">Alumno</th>
                  <th className="p-5">Estado</th>
                  <th className="p-5">Fecha de Entrega</th>
                  <th className="p-5 text-right w-64">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {submissions.map(sub => {
                  const isSelected = selectedSubmissionIds.includes(sub.studentId);
                  return (
                  <tr key={sub.studentId} className={`transition-colors group ${isSelected ? 'bg-fox-primary/5' : 'hover:bg-fox-bg'}`}>
                    <td className="p-5">
                      <button 
                        onClick={() => {
                          if (isSelected) {
                            setSelectedSubmissionIds(selectedSubmissionIds.filter(id => id !== sub.studentId));
                          } else {
                            setSelectedSubmissionIds([...selectedSubmissionIds, sub.studentId]);
                          }
                        }}
                        className="text-fox-text-muted/60 hover:text-fox-primary transition-colors flex items-center"
                      >
                        {isSelected ? <CheckSquare size={18} className="text-fox-primary" /> : <Square size={18} />}
                      </button>
                    </td>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full bg-gradient-to-br border flex items-center justify-center font-bold text-sm shadow-sm shrink-0 group-hover:scale-105 transition-transform ${isSelected ? 'from-fox-primary/20 to-fox-primary/30 border-fox-primary/40 text-fox-primary' : 'from-fox-primary/5 to-fox-primary/10 border-fox-primary/20 text-fox-primary'}`}>
                          {sub.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="font-bold text-fox-text-main text-[15px] whitespace-nowrap">{sub.name}</span>
                      </div>
                    </td>
                    <td className="p-5">
                      {sub.status === 'missing' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 border border-red-100 shadow-sm"><AlertCircle size={14}/> Sin entregar</span>}
                      {sub.status === 'submitted' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-yellow-50 text-yellow-600 border border-yellow-100 shadow-sm"><Clock size={14}/> Para corregir</span>}
                      {sub.status === 'graded' && <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-fox-green/10 text-fox-green border border-fox-green/20 shadow-sm"><CheckCircle2 size={14}/> Calificado ({sub.grade})</span>}
                    </td>
                    <td className="p-5 text-sm text-fox-text-muted font-medium">
                      {sub.date || <span className="text-fox-text-muted/50 font-bold">Pendiente</span>}
                    </td>
                    <td className="p-5 text-right flex items-center justify-end gap-3 h-full">
                      {sub.dua && sub.dua.length > 0 && (
                        <button 
                          onClick={() => handleAdaptClick(sub)}
                          className="text-fox-purple hover:bg-fox-purple/10 hover:border-fox-purple/40 px-3 py-2 rounded-xl transition-all inline-flex items-center gap-1.5 text-xs font-bold border border-fox-purple/20 shadow-sm"
                        >
                          <BrainCircuit size={16} /> DUA
                        </button>
                      )}
                      {sub.status === 'missing' ? (
                        <button onClick={() => toast.show(`Recordatorio individual enviado a ${sub.name}`, 'success')} className="text-fox-orange hover:bg-fox-orange/10 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 text-xs font-bold bg-fox-surface border border-fox-orange/20 shadow-sm">
                          <Send size={14} /> Recordar
                        </button>
                      ) : (
                        <button onClick={() => setSelectedSubmissionToGrade(sub)} className="text-white bg-fox-primary hover:bg-fox-primary/90 px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 text-xs font-bold shadow-sm">
                          <Eye size={14} /> Evaluar
                        </button>
                      )}
                    </td>
                  </tr>
                )})}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal Adaptar con IA */}
      <AnimatePresence>
        {isAdaptModalOpen && studentToAdapt && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-fox-surface rounded-3xl shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-fox-border flex justify-between items-center bg-fox-purple/5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center">
                    <BrainCircuit size={24} />
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-fox-text-main text-xl">Adaptador Foxy (DUA)</h3>
                    <p className="text-sm text-fox-purple font-bold mt-0.5">Asistente de Inclusión Educativa</p>
                  </div>
                </div>
                <button onClick={() => setIsAdaptModalOpen(false)} className="text-fox-text-muted/70 hover:text-fox-text-muted bg-fox-surface rounded-full p-2 shadow-sm border border-fox-border"><X size={20} /></button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                <div className="mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-fox-bg p-5 rounded-2xl border border-fox-border">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-fox-primary/10 to-fox-primary/20 flex items-center justify-center font-bold text-fox-primary text-lg shadow-inner shrink-0">
                      {studentToAdapt.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div>
                      <p className="font-bold text-fox-text-main text-lg">{studentToAdapt.name}</p>
                      <div className="flex gap-2 mt-1">
                        {studentToAdapt.dua.map((d: string) => (
                          <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-[11px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider">{d}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {isAdapting ? (
                  <div className="flex flex-col items-center justify-center py-16 text-fox-text-muted space-y-6">
                    <div className="relative w-20 h-20">
                      <div className="absolute inset-0 border-4 border-fox-purple/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-fox-purple border-t-transparent rounded-full animate-spin"></div>
                      <BrainCircuit size={32} className="absolute inset-0 m-auto text-fox-purple animate-pulse" />
                    </div>
                    <div className="text-center">
                      <h4 className="font-bold text-fox-text-main text-xl mb-2">Construyendo adaptación...</h4>
                      <p className="text-fox-text-muted animate-pulse font-medium">Aplicando lineamientos DUA para el perfil del alumno</p>
                    </div>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="grid grid-cols-1 md:grid-cols-2 gap-6"
                  >
                    {/* Left Column: AI Reasoning and Original */}
                    <div className="space-y-6">
                      <div className="bg-fox-purple/5 border border-fox-purple/20 rounded-2xl p-5 shadow-sm">
                        <div className="flex items-center gap-2 mb-3 text-fox-purple">
                          <Sparkles size={18} />
                          <h4 className="font-bold text-sm uppercase tracking-wider">Estrategia Aplicada</h4>
                        </div>
                        <p className="text-sm font-medium leading-relaxed text-fox-text-main/90 whitespace-pre-wrap">
                          {adaptedSummary}
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2 px-1">Consigna Original de la Clase</label>
                        <div className="bg-fox-bg border border-fox-border rounded-xl p-5 text-sm text-fox-text-muted line-through opacity-70">
                          {activity.description}
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Adapted Content Editor */}
                    <div className="flex flex-col h-full space-y-2">
                       <label className="block text-xs font-bold text-fox-purple uppercase tracking-wider mb-1 px-1 flex justify-between items-end">
                        <span>Consigna Adaptada para {studentToAdapt.name.split(' ')[0]}</span>
                        <span className="text-[10px] bg-fox-purple/10 text-fox-purple px-2 py-0.5 rounded-md">Editable</span>
                      </label>
                      <textarea 
                        className="w-full flex-1 bg-white border-2 border-fox-purple/30 rounded-2xl p-5 text-[15px] text-fox-text-main focus:ring-4 focus:ring-fox-purple/20 focus:border-fox-purple outline-none min-h-[300px] font-medium leading-relaxed shadow-sm resize-none"
                        defaultValue={adaptedContent || ''}
                      />
                    </div>
                  </motion.div>
                )}
              </div>
              
              {!isAdapting && (
                <div className="p-5 border-t border-fox-border bg-fox-surface flex justify-end gap-3 shrink-0">
                  <button onClick={() => setIsAdaptModalOpen(false)} className="px-6 py-3 border border-fox-border text-fox-text-main/80 rounded-xl font-bold hover:bg-fox-bg transition-colors">
                    Cancelar
                  </button>
                  <button onClick={handleConfirmAdapt} className="bg-fox-purple text-white px-8 py-3 rounded-xl font-bold hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center justify-center gap-2">
                    <Send size={18} /> Confirmar y Asignar
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Grading Panel */}
      <AnimatePresence>
        {selectedSubmissionToGrade && (
          <GradingPanel 
            submission={selectedSubmissionToGrade} 
            activity={activity}
            onClose={() => setSelectedSubmissionToGrade(null)} 
            onSave={(grade) => {
              const updatedSubs = submissions.map(sub => 
                sub.studentId === selectedSubmissionToGrade.studentId 
                  ? { ...sub, status: 'graded', grade: parseFloat(grade) } 
                  : sub
              );
              setSubmissions(updatedSubs);
              updateSharedSubmissions(updatedSubs);
              toast.show(`Calificación (${grade}) guardada para ${selectedSubmissionToGrade.name}`, 'success');
              setSelectedSubmissionToGrade(null);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- STUDENT PROFILE PANEL COMPONENT ---

function StudentProfilePanel({ student, onClose }: { student: any, onClose: () => void }) {
  const isHighRisk = student.risk === 'ALTO';
  const isMediumRisk = student.risk === 'MEDIO';
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState<string | null>(null);
  const [planStatus, setPlanStatus] = useState<'none' | 'draft' | 'active'>('none');
  const [planEditedText, setPlanEditedText] = useState('');
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageDraft, setMessageDraft] = useState('');

  const foxyInsight = isHighRisk 
    ? `${student.name} ha bajado su rendimiento en las últimas dos semanas y tiene entregas pendientes. Sugiero una tutoría sobre el tema actual y adaptar los próximos materiales.`
    : isMediumRisk
    ? `${student.name} tiene un rendimiento fluctuante. Entregó la última tarea fuera de término. Un recordatorio amigable podría ayudar.`
    : `${student.name} mantiene un excelente progreso. Participa activamente y sus entregas están al día. ¡Sigue así!`;

  const cognitiveProfile = {
    learningStyle: isHighRisk ? 'Visual y Práctico. Requiere que la información se divida en pasos cortos.' : 'Reflexivo y Analítico. Conecta muy bien los conceptos teóricos.',
    aiUsage: isHighRisk ? 'Usa a Foxy principalmente para resumir textos y pedir explicaciones más simples de consignas.' : 'Utiliza a Foxy para profundizar en temas específicos y generar debates.',
    thoughtProcess: isHighRisk ? 'Tiende a perder la concentración en tareas largas. Piensa de forma intuitiva pero a veces le cuesta estructurar sus respuestas.' : 'Construye argumentos sólidos y piensa de manera lógica y secuencial.',
    strengths: isHighRisk ? ['Creatividad visual', 'Resolución práctica', 'Participación en grupo'] : ['Pensamiento crítico', 'Expresión escrita', 'Autonomía'],
    weaknesses: isHighRisk ? ['Lectura sostenida', 'Cumplimiento de plazos', 'Atención a detalles'] : ['Trabajo en equipo', 'Sintetizar respuestas', 'Aceptación de críticas']
  };

  const chartData = isHighRisk 
    ? [8, 7.5, 6, 5.5, 4] 
    : isMediumRisk 
    ? [6, 7, 6.5, 5.5, 6] 
    : [8, 8.5, 9, 8.5, 9.5];

  const handleGeneratePlan = () => {
    setIsGeneratingPlan(true);
    setTimeout(() => {
      setIsGeneratingPlan(false);
      const initialPlan = `1. Tutoría Extra: 30 mins los viernes para revisar Vanguardias.\n2. Adaptación DUA: Facilitar formato audio para las próximas lecturas.\n3. Plazos Flexibles: Extender 2 días la próxima entrega de ensayo.\n4. Meta Semanal: Completar las 2 actividades pendientes antes del martes.`;
      setGeneratedPlan(initialPlan);
      setPlanEditedText(initialPlan);
      setPlanStatus('draft');
      setIsEditingPlan(false);
    }, 2000);
  };

  const handleSendPlan = () => {
    setPlanStatus('active');
    setGeneratedPlan(planEditedText); // Confirm edits
    setIsEditingPlan(false);
    toast.show('Plan de refuerzo activado y notificado al alumno y tutores', 'success');
  };

  const handleDiscardPlan = () => {
    setGeneratedPlan(null);
    setPlanStatus('none');
    setPlanEditedText('');
    setIsEditingPlan(false);
  };

  const handleDeactivatePlan = () => {
    setPlanStatus('none');
    setGeneratedPlan(null);
    toast.show('El plan de refuerzo ha sido marcado como completado', 'success');
  };

  const handleContact = () => {
    let defaultMsg = '';
    if (isHighRisk) {
      defaultMsg = `Hola ${student.name},\n\nHe notado que has tenido algunas dificultades con las últimas entregas y tu rendimiento ha bajado un poco. Me gustaría que nos reunamos brevemente para ver cómo puedo ayudarte y organizarnos mejor con las tareas pendientes.\n\nPor favor, confirmame qué día de esta semana te viene bien para una tutoría corta.\n\nSaludos,\nProf. Laura Martínez`;
    } else if (isMediumRisk) {
      defaultMsg = `Hola ${student.name},\n\nQuería recordarte que tu última tarea fue entregada fuera de plazo. Estás haciendo un buen trabajo en general, pero es importante organizarnos mejor con las fechas.\n\nSi necesitas ayuda con algún tema, no dudes en consultarme.\n\nSaludos,\nProf. Laura Martínez`;
    } else {
      defaultMsg = `Hola ${student.name},\n\nQuiero felicitarte por tu excelente progreso y tu participación activa en las clases. ¡Sigue así!\n\nSaludos,\nProf. Laura Martínez`;
    }
    setMessageDraft(defaultMsg);
    setIsMessageModalOpen(true);
  };

  const handleSendMessage = () => {
    toast.show(`Mensaje enviado a ${student.name}`, 'success');
    setIsMessageModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#FBFDFF] w-full max-w-5xl max-h-[90vh] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 md:p-8 border-b border-fox-border bg-fox-surface shrink-0 flex justify-between items-start relative">
          <div className="flex items-center gap-5 md:gap-6">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-fox-primary/10 to-fox-purple/10 border-2 border-fox-primary/10 flex items-center justify-center font-extrabold text-fox-primary text-2xl shadow-sm shrink-0">
              {student.name.split(' ').map((n: string) => n[0]).join('')}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl sm:text-2xl font-heading font-extrabold text-fox-text-main leading-tight">{student.name}</h2>
                <button onClick={handleContact} className="px-4 py-2 bg-fox-primary/10 text-fox-primary font-bold text-xs hover:bg-fox-primary/20 rounded-xl transition-colors flex items-center gap-2 shadow-sm" title="Enviar Mensaje">
                  <MessageSquare size={16} /> Enviar Mensaje
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-wider font-extrabold shadow-sm ${
                  isHighRisk ? 'bg-red-50 text-red-600 ring-1 ring-red-500/30' : 
                  isMediumRisk ? 'bg-yellow-50 text-yellow-600 ring-1 ring-yellow-500/30' : 
                  'bg-green-50 text-green-600 ring-1 ring-green-500/30'
                }`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    isHighRisk ? 'bg-red-500 animate-pulse' : 
                    isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  Riesgo {student.risk}
                </span>
                {student.dua.map((d: string) => (
                  <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-[10px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-md">{d}</span>
                ))}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-fox-text-muted/70 hover:text-fox-text-main bg-fox-bg hover:bg-fox-border/50 border border-transparent hover:border-fox-border rounded-full p-2.5 transition-all shadow-sm">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 md:p-8 bg-fox-bg/30">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Informe Cognitivo AI - Full Width */}
            <div className="col-span-1 lg:col-span-3 bg-gradient-to-br from-fox-purple/5 to-white border border-fox-purple/20 rounded-3xl p-5 md:p-7 relative overflow-hidden shadow-sm group">
              <div className="absolute top-0 right-0 w-64 h-64 bg-fox-purple/10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/4 pointer-events-none transition-transform duration-1000 group-hover:scale-110"></div>
              
              <div className="flex flex-col relative z-10">
                {/* Cabecera del informe */}
                <div className="flex flex-col md:flex-row items-start lg:items-center justify-between gap-4 border-b border-fox-purple/10 pb-5 mb-5 md:mb-6">
                  <div className="flex items-center gap-3">
                    <div className="bg-white p-3 rounded-2xl shadow-sm text-fox-purple border border-fox-purple/10 shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-3 group-hover:shadow-md">
                      <BrainCircuit size={24} />
                    </div>
                    <div>
                      <h4 className="font-extrabold text-fox-purple/90 text-sm md:text-base uppercase tracking-wider">Informe Cognitivo de Foxy</h4>
                      <p className="text-xs font-bold text-fox-text-muted mt-0.5">Visión global impulsada por IA para {student.name}</p>
                    </div>
                  </div>
                  {isHighRisk && planStatus === 'none' && !isGeneratingPlan && (
                    <button onClick={handleGeneratePlan} className="text-[11px] font-bold bg-fox-purple text-white px-4 py-2.5 rounded-xl hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center gap-2 w-full md:w-auto justify-center">
                      <Sparkles size={14} /> Sugerir Plan de Refuerzo
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 md:gap-6 mb-2">
                  <div className="space-y-4">
                    {/* Estilo de Aprendizaje */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-fox-purple/10">
                      <h5 className="text-[10px] uppercase font-extrabold text-fox-purple/80 mb-2 flex items-center gap-1.5"><BookOpen size={14} /> Estilo de Aprendizaje</h5>
                      <p className="text-sm font-medium text-fox-text-main/80 leading-relaxed">{cognitiveProfile.learningStyle}</p>
                    </div>

                    {/* Forma de pensar y lógica */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-fox-purple/10">
                      <h5 className="text-[10px] uppercase font-extrabold text-fox-purple/80 mb-2 flex items-center gap-1.5"><Network size={14} /> Forma de Pensar</h5>
                      <p className="text-sm font-medium text-fox-text-main/80 leading-relaxed">{cognitiveProfile.thoughtProcess}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {/* Interacción con Foxy */}
                    <div className="bg-white/60 p-4 rounded-2xl border border-fox-purple/10">
                      <h5 className="text-[10px] uppercase font-extrabold text-fox-purple/80 mb-2 flex items-center gap-1.5"><MessageSquare size={14} /> Uso de la I.A.</h5>
                      <p className="text-sm font-medium text-fox-text-main/80 leading-relaxed">{cognitiveProfile.aiUsage}</p>
                    </div>

                    {/* Fortalezas y Debilidades */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-green-50/50 p-4 rounded-2xl border border-green-100/50">
                        <h5 className="text-[10px] uppercase font-extrabold text-green-700/80 mb-3 flex items-center gap-1.5"><Target size={14} /> Puntos Fuertes</h5>
                        <ul className="space-y-2">
                          {cognitiveProfile.strengths.map(s => (
                            <li key={s} className="text-xs font-bold text-green-800 flex items-start gap-1"><span className="text-green-500 mt-0.5">•</span> {s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="bg-red-50/50 p-4 rounded-2xl border border-red-100/50">
                        <h5 className="text-[10px] uppercase font-extrabold text-red-700/80 mb-3 flex items-center gap-1.5"><AlertCircle size={14} /> A Mejorar</h5>
                        <ul className="space-y-2">
                          {cognitiveProfile.weaknesses.map(w => (
                            <li key={w} className="text-xs font-bold text-red-800 flex items-start gap-1"><span className="text-red-400 mt-0.5">•</span> {w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {isGeneratingPlan && (
                  <div className="mt-5 bg-white rounded-2xl p-5 border border-fox-purple/20 shadow-sm flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full border-[3px] border-fox-purple/20 border-t-fox-purple animate-spin"></div>
                    <p className="text-sm font-bold text-fox-purple animate-pulse">Analizando perfil y generando plan adaptado para {student.name}...</p>
                  </div>
                )}

                {planStatus !== 'none' && generatedPlan && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                    className="mt-6 bg-white border border-fox-purple/30 rounded-3xl p-5 md:p-6 shadow-sm"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <h5 className="text-[11px] font-extrabold text-fox-purple uppercase tracking-wider flex items-center gap-2">
                          <Sparkles size={14} />
                          {planStatus === 'active' ? 'Plan de Refuerzo Activo' : 'Plan de Refuerzo Sugerido'}
                        </h5>
                        {planStatus === 'active' && (
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                          </span>
                        )}
                      </div>
                      {planStatus === 'draft' && !isEditingPlan && (
                        <button onClick={() => setIsEditingPlan(true)} className="text-[10px] uppercase font-bold text-fox-primary hover:text-fox-primary/80 transition-colors flex items-center gap-1 bg-fox-primary/10 px-3 py-1.5 rounded-lg border border-transparent hover:border-fox-primary/20">
                          <PenTool size={12} /> Editar
                        </button>
                      )}
                    </div>

                    {isEditingPlan ? (
                      <textarea 
                        value={planEditedText}
                        onChange={(e) => setPlanEditedText(e.target.value)}
                        className="w-full h-32 p-4 text-sm text-fox-text-main font-medium border border-fox-primary/40 rounded-2xl bg-fox-bg/50 focus:outline-none focus:border-fox-primary focus:ring-2 focus:ring-fox-primary/20 transition-all resize-none"
                      />
                    ) : (
                      <div className="text-sm text-fox-text-main/80 space-y-2 whitespace-pre-line font-medium bg-fox-bg/30 p-5 rounded-2xl border border-fox-purple/10 leading-relaxed relative">
                        {planStatus === 'draft' ? planEditedText : generatedPlan}
                      </div>
                    )}
                    
                    <div className="mt-5 flex flex-wrap items-center gap-3">
                      {planStatus === 'draft' ? (
                        <>
                          <button onClick={handleSendPlan} className="text-xs font-bold bg-fox-primary text-white px-5 py-2.5 rounded-xl hover:bg-fox-primary/90 transition-all shadow-sm shadow-fox-primary/20 flex items-center gap-2 hover:-translate-y-0.5">
                            <Send size={16} /> Activar y Notificar a Alumno/Tutores
                          </button>
                          <button onClick={handleDiscardPlan} className="text-xs font-bold text-fox-text-muted hover:text-fox-text-main bg-fox-bg hover:bg-fox-border/50 border border-fox-border hover:border-fox-text-muted/30 px-5 py-2.5 rounded-xl transition-all">
                            Descartar
                          </button>
                        </>
                      ) : (
                        <button onClick={handleDeactivatePlan} className="text-xs font-bold bg-green-50 text-green-700 border border-green-200 px-5 py-2.5 rounded-xl hover:bg-green-100 transition-all shadow-sm flex items-center gap-2 hover:-translate-y-0.5">
                          <CheckCircle2 size={16} /> Marcar como completado
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4 col-span-1">
              {/* Asistencia */}
              <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-fox-border/80">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Asistencia</span>
                  {isHighRisk ? <AlertCircle size={14} className="text-red-500" /> : <CheckCircle2 size={14} className="text-green-500" />}
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-black ${isHighRisk ? 'text-red-500' : 'text-fox-text-main'}`}>
                    {isHighRisk ? '75' : isMediumRisk ? '88' : '96'}
                  </span>
                  <span className="text-xs font-bold text-fox-text-muted">%</span>
                </div>
                <div className="w-full bg-fox-bg rounded-full h-1.5 mt-4 overflow-hidden">
                   <div className={`h-full rounded-full transition-all duration-1000 ${isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ width: `${isHighRisk ? 75 : isMediumRisk ? 88 : 96}%` }}></div>
                </div>
              </div>
              
              {/* Promedio */}
              <div className="bg-fox-surface border border-fox-border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all hover:shadow-md hover:border-fox-border/80">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider">Promedio</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${isHighRisk ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                    {isHighRisk ? '↓ 1.2' : '↑ 0.5'}
                  </span>
                </div>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className={`text-3xl font-black ${isHighRisk ? 'text-red-500' : 'text-fox-primary'}`}>
                    {chartData[4].toFixed(1)}
                  </span>
                </div>
                <p className="text-[10px] text-fox-text-muted font-medium mt-3">Sobre un total de 10 pts</p>
              </div>
              
              {/* Entregas a tiempo (Col-span-2) */}
              <div className="col-span-2 bg-fox-surface border border-fox-border rounded-3xl p-5 shadow-sm flex flex-col transition-all overflow-hidden group hover:shadow-md hover:border-fox-border/80">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="block text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1">Entregas a tiempo</span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <span className="text-2xl font-black text-fox-text-main leading-none">{isHighRisk ? '4' : '8'}</span>
                      <span className="text-xs font-bold text-fox-text-muted">/ 8 Tareas</span>
                    </div>
                  </div>
                  <div className={`px-2.5 py-1 rounded-lg text-[9px] md:text-[10px] uppercase tracking-wider font-extrabold flex items-center gap-1.5 ${isHighRisk ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                     {isHighRisk ? 'Atención Requerida' : 'Excelente Estado'}
                  </div>
                </div>
                
                {/* Visual Progress Bar instead of circle */}
                <div className="flex gap-1.5 h-3 mt-2">
                   {[1,2,3,4,5,6,7,8].map(task => (
                      <div key={task} className={`flex-1 rounded-full transition-all duration-500 ${task <= (isHighRisk ? 4 : 8) ? (isHighRisk ? 'bg-red-400 group-hover:bg-red-500' : 'bg-green-400 group-hover:bg-green-500') : 'bg-fox-bg border border-fox-border'}`}></div>
                   ))}
                </div>
              </div>
            </div>

            {/* Performance Chart */}
            <div className="bg-fox-surface border border-fox-border rounded-3xl p-6 lg:p-7 shadow-sm col-span-1 flex flex-col transition-all hover:shadow-md hover:border-fox-border/80">
              <h4 className="font-extrabold text-fox-text-muted text-[10px] uppercase tracking-wider">Evolución (Últimas 5 tareas)</h4>
              <div className="flex-1 relative flex items-end justify-between pt-6 pb-2 min-h-[140px] mt-2 ml-5">
                 
                 {/* Grid Lines */}
                 <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-2">
                   {[10, 8, 6, 4, 2].map(mark => (
                     <div key={mark} className="w-full border-t border-dashed border-fox-border/50 relative flex-1">
                       <span className="absolute -left-6 -top-2.5 text-[9px] font-bold text-fox-text-muted/60 w-4 text-right">{mark}</span>
                     </div>
                   ))}
                   <div className="w-full border-t border-fox-border relative h-0">
                     <span className="absolute -left-6 -top-2.5 text-[9px] font-bold text-fox-text-muted/60 w-4 text-right">0</span>
                   </div>
                 </div>

                 {/* SVG Data Lines */}
                 <svg className="absolute inset-0 w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 100 100">
                    <defs>
                      <linearGradient id="gradient-high" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ef4444" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#ef4444" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="gradient-medium" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#eab308" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#eab308" stopOpacity="0"/>
                      </linearGradient>
                      <linearGradient id="gradient-good" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22c55e" stopOpacity="0.2"/>
                        <stop offset="100%" stopColor="#22c55e" stopOpacity="0"/>
                      </linearGradient>
                    </defs>
                    <motion.path 
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ duration: 1.2, ease: "easeInOut" }}
                      d={`M 0,${100 - chartData[0]*10} L 25,${100 - chartData[1]*10} L 50,${100 - chartData[2]*10} L 75,${100 - chartData[3]*10} L 100,${100 - chartData[4]*10}`}
                      fill="none" 
                      stroke={isHighRisk ? '#ef4444' : isMediumRisk ? '#eab308' : '#22c55e'} 
                      strokeWidth="3.5" 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      className="drop-shadow-sm"
                    />
                    <motion.path 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6, duration: 1 }}
                      d={`M 0,100 L 0,${100 - chartData[0]*10} L 25,${100 - chartData[1]*10} L 50,${100 - chartData[2]*10} L 75,${100 - chartData[3]*10} L 100,${100 - chartData[4]*10} L 100,100 Z`}
                      fill={`url(#${isHighRisk ? 'gradient-high' : isMediumRisk ? 'gradient-medium' : 'gradient-good'})`}
                    />
                  </svg>
                  {chartData.map((val, i) => (
                    <div key={i} className="absolute z-10 flex flex-col items-center justify-end h-full group cursor-pointer bottom-0" style={{ left: `${(i/4)*100}%`, transform: 'translateX(-50%)' }}>
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-4 bg-fox-text-main text-white text-[11px] font-bold py-1.5 px-2.5 rounded-lg transition-all duration-200 shadow-xl z-20 pointer-events-none transform group-hover:-translate-y-1">
                        {val.toFixed(1)}
                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 border-[4px] border-transparent border-t-fox-text-main"></div>
                      </div>
                      <div className={`w-4 h-4 rounded-full border-[3.5px] border-fox-surface shadow-sm transition-transform duration-200 group-hover:scale-[1.5] ${isHighRisk ? 'bg-red-500' : isMediumRisk ? 'bg-yellow-500' : 'bg-green-500'}`} style={{ marginBottom: `${val*10}%` }}></div>
                    </div>
                  ))}
              </div>
              <div className="relative mt-4 ml-5 h-6 text-[10px] font-extrabold text-fox-text-muted/60 tracking-wider pt-3 border-t border-fox-border/50">
                {['T1', 'T2', 'T3', 'T4', 'T5'].map((label, i) => (
                  <span key={label} className="absolute hover:text-fox-text-main transition-colors cursor-default" style={{ left: `${(i/4)*100}%`, transform: 'translateX(-50%)' }}>
                    {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Submissions */}
            <div className="col-span-1 mt-2 lg:mt-0 flex flex-col">
              <div className="flex justify-between items-center mb-4 lg:mb-5">
                <h4 className="font-extrabold text-fox-text-main text-[10px] uppercase tracking-wider">Actividad Reciente</h4>
                <button className="text-[10px] font-bold text-fox-primary hover:text-fox-primary/80 transition-colors uppercase tracking-wider bg-fox-primary/10 px-3 py-1.5 rounded-lg">Ver historial</button>
              </div>
              <div className="flex-1 bg-fox-surface border border-fox-border rounded-3xl p-2 md:p-3 shadow-sm flex flex-col justify-center">
                <ul className="flex flex-col w-full divide-y divide-fox-border/40">
                  
                  {/* Item 1 */}
                  <li className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-fox-bg/40 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className={`shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center transition-all group-hover:scale-105 group-hover:shadow-sm ${isHighRisk ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'}`}>
                      {isHighRisk ? <AlertCircle size={20} /> : <PenTool size={20} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm shadow-sm opacity-0 absolute -z-10">Hidden</h5> {/* A11y / spacing trick avoiding real space if text very long */}
                      <h5 className="text-sm font-bold text-fox-text-main truncate group-hover:text-fox-primary transition-colors">Ensayo: Vanguardias</h5>
                      <p className="text-[10px] md:text-[11px] font-medium text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> Hace 2 días
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {isHighRisk ? (
                        <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1.5 rounded-lg uppercase tracking-wider">
                           Faltante
                        </span>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[8px] md:text-[9px] text-fox-text-muted font-bold uppercase tracking-wider mb-0.5">Nota</span>
                          <span className="text-sm md:text-base font-black text-fox-text-main leading-none">{chartData[4].toFixed(1)}</span>
                        </div>
                      )}
                    </div>
                  </li>
                  
                  {/* Item 2 */}
                  <li className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-fox-bg/40 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-green-50 text-green-500 transition-all group-hover:scale-105 group-hover:shadow-sm">
                      <BrainCircuit size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-fox-text-main truncate group-hover:text-fox-primary transition-colors">Cuest. Modernismo</h5>
                      <p className="text-[10px] md:text-[11px] font-medium text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> Hace 1 semana
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[8px] md:text-[9px] text-fox-text-muted font-bold uppercase tracking-wider mb-0.5">Nota</span>
                      <span className="text-sm md:text-base font-black text-fox-text-main leading-none">{chartData[3].toFixed(1)}</span>
                    </div>
                  </li>

                  {/* Item 3 */}
                  <li className="relative flex items-center gap-3 md:gap-4 p-3 md:p-4 hover:bg-fox-bg/40 transition-colors cursor-pointer group first:rounded-t-2xl last:rounded-b-2xl">
                    <div className="shrink-0 w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center bg-green-50 text-green-500 transition-all group-hover:scale-105 group-hover:shadow-sm">
                      <MessageSquare size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h5 className="text-sm font-bold text-fox-text-main truncate group-hover:text-fox-primary transition-colors">Foro: Generación del 98</h5>
                      <p className="text-[10px] md:text-[11px] font-medium text-fox-text-muted flex items-center gap-1.5 mt-0.5">
                        <Clock size={12} /> Hace 2 semanas
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end">
                      <span className="text-[8px] md:text-[9px] text-fox-text-muted font-bold uppercase tracking-wider mb-0.5">Nota</span>
                      <span className="text-sm md:text-base font-black text-fox-text-main leading-none">{chartData[2].toFixed(1)}</span>
                    </div>
                  </li>

                </ul>
              </div>
            </div>

          </div>
        </div>
      </motion.div>

      {/* Message Modal */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 z-[60] flex justify-center items-center bg-black/40 backdrop-blur-sm p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-[#FBFDFF] w-full max-w-lg rounded-3xl shadow-2xl p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-heading font-extrabold text-fox-text-main flex items-center gap-2">
                <MessageSquare size={24} className="text-fox-primary" /> Nuevo Mensaje
              </h3>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-fox-text-muted hover:text-fox-text-main transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-4">
               <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Para</label>
               <div className="flex items-center gap-3 p-3 bg-fox-bg border border-fox-border rounded-xl">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-br from-fox-primary/20 to-fox-purple/20 flex items-center justify-center font-extrabold text-fox-primary text-xs">
                    {student.name.split(' ').map((n: string) => n[0]).join('')}
                 </div>
                 <span className="text-sm font-bold text-fox-text-main">{student.name}</span>
               </div>
            </div>

            <div className="flex-1 mb-6">
              <label className="block text-[11px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-2">Mensaje Sugerido por Foxy</label>
              <textarea 
                value={messageDraft}
                onChange={(e) => setMessageDraft(e.target.value)}
                className="w-full h-48 p-4 text-sm text-fox-text-main font-medium border border-fox-border rounded-2xl bg-white focus:outline-none focus:border-fox-primary focus:ring-2 focus:ring-fox-primary/20 transition-all resize-none"
              />
              <p className="text-[10px] font-medium text-fox-text-muted mt-2 flex items-center gap-1"><Sparkles size={12} className="text-fox-purple"/> Mensaje autogenerado basado en el rendimiento</p>
            </div>

            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setIsMessageModalOpen(false)} 
                className="px-5 py-2.5 rounded-xl font-bold text-sm text-fox-text-muted hover:bg-fox-bg transition-colors"
               >
                Cancelar
              </button>
              <button 
                onClick={handleSendMessage} 
                className="flex items-center gap-2 bg-fox-primary hover:bg-fox-primary/90 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all"
              >
                <Send size={16} /> Enviar Mensaje
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

// --- GRADING PANEL COMPONENT ---

function GradingPanel({ submission, activity, onClose, onSave }: { submission: any, activity: any, onClose: () => void, onSave: (grade: string) => void }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [suggestedGrade, setSuggestedGrade] = useState<string | null>(null);
  const [finalGrade, setFinalGrade] = useState('');
  const [finalFeedback, setFinalFeedback] = useState('');
  const [rubricScores, setRubricScores] = useState<{criteria: string, max: number, earned: number}[]>([]);

  const handleAnalyze = () => {
    setIsAnalyzing(true);
    setTimeout(() => {
      setIsAnalyzing(false);
      const isDua = submission.dua && submission.dua.length > 0;
      
      const mockRubricScores = [
        { criteria: 'Comprensión del tema (4 pts)', max: 4, earned: 4 },
        { criteria: 'Análisis crítico (4 pts)', max: 4, earned: isDua ? 3 : 3.5 },
        { criteria: 'Redacción y ortografía (2 pts)', max: 2, earned: isDua ? 2 : 1 }
      ];
      setRubricScores(mockRubricScores);
      
      const totalEarned = mockRubricScores.reduce((acc, curr) => acc + curr.earned, 0);
      setSuggestedGrade(totalEarned.toString());
      setAiFeedback(`Evaluación basada en la rúbrica:\n- Excelente comprensión de los conceptos clave.\n- El análisis fue bueno, pero faltó un poco de profundidad.\n- Algunos errores menores de ortografía encontrados.`);
      setFinalGrade(totalEarned.toString());
      setFinalFeedback(isDua 
        ? `¡Excelente trabajo, ${submission.name.split(' ')[0]}! Has logrado captar la esencia del tema cumpliendo con tus objetivos de aprendizaje.`
        : `Buen trabajo, ${submission.name.split(' ')[0]}. Identificaste bien los puntos clave. Revisa las áreas de mejora según la rúbrica.`);
    }, 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm p-0 sm:p-4">
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="bg-[#FBFDFF] w-full h-full sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="p-5 border-b border-fox-border flex justify-between items-center bg-fox-surface shrink-0">
          <div>
            <h3 className="font-heading font-bold text-fox-text-main text-lg flex items-center gap-2">
              Calificando a {submission.name}
              {submission.dua && submission.dua.map((d: string) => (
                <span key={d} className="bg-fox-green/10 text-fox-green border border-fox-green/20 text-xs font-bold px-2 py-0.5 rounded-md ml-2">{d}</span>
              ))}
            </h3>
            <p className="text-sm text-fox-text-muted mt-1">{activity.title}</p>
          </div>
          <button onClick={onClose} className="text-fox-text-muted/70 hover:text-fox-text-muted bg-fox-bg hover:bg-fox-border/50 rounded-full p-2 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left Column: Student Submission */}
          <div className="w-full md:w-1/2 border-r border-fox-border p-6 overflow-y-auto bg-fox-bg/30">
            <h4 className="font-bold text-fox-text-main text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <FileText size={16} className="text-fox-primary" /> Entrega del Alumno
            </h4>
            <div className="bg-fox-surface border border-fox-border rounded-2xl p-6 shadow-sm min-h-[400px]">
              <p className="text-fox-text-main/90 leading-relaxed whitespace-pre-wrap">
                {submission.content || 'El alumno no ha adjuntado texto en su entrega.'}
              </p>
            </div>
          </div>

          {/* Right Column: Grading & AI */}
          <div className="w-full md:w-1/2 p-6 overflow-y-auto flex flex-col">
            <h4 className="font-bold text-fox-text-main text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <PenTool size={16} className="text-fox-orange" /> Evaluación
            </h4>

            {/* AI Assistant Box */}
            <div className="bg-gradient-to-br from-fox-purple/5 to-transparent border border-fox-purple/20 rounded-2xl p-5 mb-6 relative overflow-hidden shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-fox-purple/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-fox-surface p-2 rounded-xl shadow-sm text-fox-purple">
                    <BrainCircuit size={20} />
                  </div>
                  <h5 className="font-bold text-fox-text-main">Asistente Foxy</h5>
                </div>
                
                {!aiFeedback && !isAnalyzing && (
                  <div>
                    <p className="text-sm text-fox-text-main/80 mb-4">Foxy evaluará esta entrega detalladamente utilizando la rúbrica de la actividad.</p>
                    <button onClick={handleAnalyze} className="w-full bg-fox-purple text-white py-2.5 rounded-xl font-bold hover:bg-fox-purple/90 transition-colors shadow-sm flex items-center justify-center gap-2">
                      <Sparkles size={16} /> Evaluar con Rúbrica Integradora
                    </button>
                  </div>
                )}

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-4 space-y-3">
                    <div className="relative w-12 h-12">
                      <div className="absolute inset-0 border-4 border-fox-purple/20 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-fox-purple border-t-transparent rounded-full animate-spin"></div>
                      <BrainCircuit size={18} className="absolute inset-0 m-auto text-fox-purple animate-pulse" />
                    </div>
                    <p className="text-sm font-bold text-fox-purple animate-pulse">Analizando rúbricas y entrega...</p>
                  </div>
                )}

                {aiFeedback && !isAnalyzing && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {rubricScores.length > 0 && (
                      <div className="bg-white/80 border border-fox-purple/10 rounded-xl p-3 shadow-sm">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-fox-purple/20 text-left text-fox-purple/90">
                              <th className="pb-2 font-bold px-2">Criterio evaluado</th>
                              <th className="pb-2 font-bold text-right px-2">Puntaje</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rubricScores.map((score, i) => (
                              <tr key={i} className="border-b border-fox-purple/5 last:border-none">
                                <td className="py-2.5 px-2 text-fox-text-main font-medium">{score.criteria}</td>
                                <td className="py-2.5 px-2 text-right">
                                  <span className="font-bold text-fox-purple">{score.earned}</span>
                                  <span className="text-fox-text-muted/60 text-xs"> / {score.max}</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                    <div className="bg-fox-surface/80 rounded-xl p-3 text-sm text-fox-text-main/90 border border-fox-purple/10 whitespace-pre-line leading-relaxed">
                      <p className="font-bold text-fox-purple mb-1 text-xs uppercase">Conclusión</p>
                      {aiFeedback}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-fox-text-main/80">Nota sugerida:</span>
                      <span className="bg-fox-green/10 text-fox-green border border-fox-green/20 font-bold px-3 py-1 rounded-lg">{suggestedGrade}</span>
                    </div>
                  </motion.div>
                )}
              </div>
            </div>

            {/* Manual Grading Form */}
            <div className="flex-1 flex flex-col space-y-4">
              <div>
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2">Calificación Final</label>
                <input 
                  type="text" 
                  value={finalGrade}
                  onChange={(e) => setFinalGrade(e.target.value)}
                  placeholder="Ej: 8.5"
                  className="w-32 bg-fox-surface border border-fox-border rounded-xl p-3 text-fox-text-main font-bold focus:ring-2 focus:ring-fox-primary/30 focus:border-fox-primary outline-none"
                />
              </div>
              <div className="flex-1 flex flex-col">
                <label className="block text-xs font-bold text-fox-text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
                  <MessageSquare size={14} /> Devolución para el alumno
                </label>
                <textarea 
                  value={finalFeedback}
                  onChange={(e) => setFinalFeedback(e.target.value)}
                  placeholder="Escribe aquí los comentarios para el alumno..."
                  className="flex-1 w-full bg-fox-surface border border-fox-border rounded-xl p-4 text-sm text-fox-text-main/90 focus:ring-2 focus:ring-fox-primary/30 focus:border-fox-primary outline-none resize-none"
                />
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-6 mt-6 border-t border-fox-border flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className="px-6 py-2.5 border border-fox-border text-fox-text-main/80 rounded-xl font-bold hover:bg-fox-bg transition-colors">
                Cancelar
              </button>
              <button 
                onClick={() => onSave(finalGrade)}
                disabled={!finalGrade}
                className="bg-fox-primary text-white px-8 py-2.5 rounded-xl font-bold hover:bg-fox-primary/90 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <CheckCircle2 size={18} /> Publicar
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}