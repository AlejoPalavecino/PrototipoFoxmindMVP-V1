import React, { useState, useRef, useEffect } from 'react';
import { mockStudyFolders } from '../../mockData';
import { StudyFolder, StudyFolderTopic } from '../../types';
import { 
  Brain, 
  Folder, 
  Mic, 
  Plus, 
  Send, 
  X, 
  Upload, 
  Calendar, 
  Layers, 
  Sparkles, 
  ChevronRight, 
  ChevronDown, 
  BookOpen, 
  Clock, 
  Target, 
  ArrowLeft, 
  MoreVertical, 
  FileText, 
  Edit3, 
  Download, 
  MessageSquare, 
  BrainCircuit, 
  Network, 
  Lightbulb, 
  Image, 
  Camera, 
  Paperclip, 
  Users, 
  Trash2, 
  Maximize2, 
  Save, 
  CheckCircle2,
  Check,
  Search,
  Filter,
  History,
  FolderOpen
} from 'lucide-react';
import { toast } from '../../components/ui/Toaster';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';

// Modals & Panels for Student Study Copilot
import { 
  StudyGeneratedResource, 
  StudyPlan, 
  StudentFoxyReminder, 
  StudentStudySession, 
  StudyToolType 
} from './estudio/estudioTypes';
import { 
  INITIAL_STUDENT_RESOURCES, 
  INITIAL_STUDENT_PLANS, 
  INITIAL_STUDENT_REMINDERS, 
  INITIAL_STUDENT_SESSIONS 
} from './estudio/estudioData';
import { StudyChatWorkspace } from './estudio/StudyChatWorkspace';
import { StudyResourceLibrary } from './estudio/StudyResourceLibrary';
import { StudyPlansPanel } from './estudio/StudyPlansPanel';
import { StudyRemindersPanel } from './estudio/StudyRemindersPanel';
import { StudyContextDrawer } from './estudio/StudyContextDrawer';
import { StudyHistoryDrawer } from './estudio/StudyHistoryDrawer';
import { StudyFlashcardModal } from './estudio/StudyFlashcardModal';
import { StudyQuizModal } from './estudio/StudyQuizModal';
import { StudyConceptMapModal } from './estudio/StudyConceptMapModal';
import { StudyToolGenerateModal } from './estudio/StudyToolGenerateModal';
import { calculateFolderQuizProgress } from '../../features/study/application/quizProgress';

// Color Palette matching Teacher Classroom design
const folderColorPalette = [
  { id: 'purple', label: 'Púrpura', hex: '#a855f7', bgClass: 'bg-fox-purple' },
  { id: 'blue', label: 'Azul', hex: '#2563eb', bgClass: 'bg-blue-600' },
  { id: 'orange', label: 'Naranja', hex: '#f97316', bgClass: 'bg-fox-orange' },
  { id: 'green', label: 'Verde', hex: '#22c55e', bgClass: 'bg-fox-green' },
  { id: 'red', label: 'Rojo', hex: '#ef4444', bgClass: 'bg-red-500' },
  { id: 'pink', label: 'Rosa', hex: '#ec4899', bgClass: 'bg-pink-500' },
  { id: 'yellow', label: 'Amarillo', hex: '#eab308', bgClass: 'bg-yellow-500' },
];

export const getFolderColorStyle = (color?: string, name?: string) => {
  const c = (color || '').toLowerCase();
  const n = (name || '').toLowerCase();
  if (c === 'purple' || n.includes('literatura')) {
    return {
      bar: 'bg-fox-purple',
      badgeBg: 'bg-fox-purple/10',
      badgeText: 'text-fox-purple',
      badge: 'bg-fox-purple/10 text-fox-purple',
      bullet: 'bg-fox-purple',
      border: 'border-fox-purple/20',
      textAccent: 'text-fox-purple',
      progress: 'bg-fox-purple',
      text: 'text-fox-purple',
      bgLight: 'bg-fox-purple/5',
      borderLight: 'border-fox-purple/20',
      fill: '#827397',
      hex: '#827397'
    };
  }
  if (c === 'blue' || n.includes('historia')) {
    return {
      bar: 'bg-fox-blue',
      badgeBg: 'bg-fox-blue/10',
      badgeText: 'text-fox-blue',
      badge: 'bg-fox-blue/10 text-fox-blue',
      bullet: 'bg-fox-blue',
      border: 'border-fox-blue/20',
      textAccent: 'text-fox-blue',
      progress: 'bg-fox-blue',
      text: 'text-fox-blue',
      bgLight: 'bg-fox-blue/5',
      borderLight: 'border-fox-blue/20',
      fill: '#2563eb',
      hex: '#2563eb'
    };
  }
  if (c === 'orange' || n.includes('matemática') || n.includes('matematica') || n.includes('fraccion')) {
    return {
      bar: 'bg-fox-orange',
      badgeBg: 'bg-fox-orange/10',
      badgeText: 'text-fox-orange',
      badge: 'bg-fox-orange/10 text-fox-orange',
      bullet: 'bg-fox-orange',
      border: 'border-fox-orange/20',
      textAccent: 'text-fox-orange',
      progress: 'bg-fox-orange',
      text: 'text-fox-orange',
      bgLight: 'bg-fox-orange/5',
      borderLight: 'border-fox-orange/20',
      fill: '#f68d2c',
      hex: '#f68d2c'
    };
  }
  if (c === 'green' || n.includes('ciencia') || n.includes('biolog') || n.includes('personal')) {
    return {
      bar: 'bg-fox-green',
      badgeBg: 'bg-fox-green/10',
      badgeText: 'text-fox-green',
      badge: 'bg-fox-green/10 text-fox-green',
      bullet: 'bg-fox-green',
      border: 'border-fox-green/20',
      textAccent: 'text-fox-green',
      progress: 'bg-fox-green',
      text: 'text-fox-green',
      bgLight: 'bg-fox-green/5',
      borderLight: 'border-fox-green/20',
      fill: '#52a874',
      hex: '#52a874'
    };
  }
  if (c === 'red') {
    return {
      bar: 'bg-red-500',
      badgeBg: 'bg-red-500/10',
      badgeText: 'text-red-500',
      badge: 'bg-red-500/10 text-red-500',
      bullet: 'bg-red-500',
      border: 'border-red-500/20',
      textAccent: 'text-red-500',
      progress: 'bg-red-500',
      text: 'text-red-500',
      bgLight: 'bg-red-500/5',
      borderLight: 'border-red-500/20',
      fill: '#ef4444',
      hex: '#ef4444'
    };
  }
  if (c === 'pink') {
    return {
      bar: 'bg-pink-500',
      badgeBg: 'bg-pink-500/10',
      badgeText: 'text-pink-500',
      badge: 'bg-pink-500/10 text-pink-500',
      bullet: 'bg-pink-500',
      border: 'border-pink-500/20',
      textAccent: 'text-pink-500',
      progress: 'bg-pink-500',
      text: 'text-pink-500',
      bgLight: 'bg-pink-500/5',
      borderLight: 'border-pink-500/20',
      fill: '#ec4899',
      hex: '#ec4899'
    };
  }
  if (c === 'yellow') {
    return {
      bar: 'bg-yellow-500',
      badgeBg: 'bg-yellow-500/10',
      badgeText: 'text-yellow-600',
      badge: 'bg-yellow-500/10 text-yellow-600',
      bullet: 'bg-yellow-500',
      border: 'border-yellow-500/20',
      textAccent: 'text-yellow-600',
      progress: 'bg-yellow-500',
      text: 'text-yellow-600',
      bgLight: 'bg-yellow-500/5',
      borderLight: 'border-yellow-500/20',
      fill: '#eab308',
      hex: '#eab308'
    };
  }
  return {
    bar: 'bg-fox-primary',
    badgeBg: 'bg-fox-primary/10',
    badgeText: 'text-fox-primary',
    badge: 'bg-fox-primary/10 text-fox-primary',
    bullet: 'bg-fox-primary',
    border: 'border-fox-primary/20',
    textAccent: 'text-fox-primary',
    progress: 'bg-fox-primary',
    text: 'text-fox-primary',
    bgLight: 'bg-fox-primary/5',
    borderLight: 'border-fox-primary/20',
    fill: '#489980',
    hex: '#489980'
  };
};

export function EstudiaAlumno() {
  // Folders State
  const [folders, setFolders] = useState<StudyFolder[]>(mockStudyFolders);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'classrooms' | 'personal'>('all');

  // Active Folder Tabs: 'chat' | 'library' | 'plans' | 'reminders'
  const [activeFolderTab, setActiveFolderTab] = useState<'chat' | 'library' | 'plans' | 'reminders'>('chat');

  // Copilot State: Resources, Sessions, Plans, Reminders
  const [resources, setResources] = useState<StudyGeneratedResource[]>(INITIAL_STUDENT_RESOURCES);
  const [sessions, setSessions] = useState<StudentStudySession[]>(INITIAL_STUDENT_SESSIONS);
  const [studyPlans, setStudyPlans] = useState<StudyPlan[]>(INITIAL_STUDENT_PLANS);
  const [reminders, setReminders] = useState<StudentFoxyReminder[]>(INITIAL_STUDENT_REMINDERS);

  // Active Study Session ID
  const [activeSessionId, setActiveSessionId] = useState<string>(INITIAL_STUDENT_SESSIONS[0].id);

  // Drawers & Modals State
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [generateModalInitialType, setGenerateModalInitialType] = useState<StudyToolType | undefined>(undefined);

  // Interactive Modals for Practice
  const [activeFlashcardDeck, setActiveFlashcardDeck] = useState<any | null>(null);
  const [activeQuizResource, setActiveQuizResource] = useState<any | null>(null);
  const [activeConceptMapResource, setActiveConceptMapResource] = useState<any | null>(null);

  // Creation Modal (identical UX/UI flow to Teacher Classroom Creation)
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [creationStep, setCreationStep] = useState<'form' | 'analyzing' | 'review' | 'creating'>('form');
  const [newFolderForm, setNewFolderForm] = useState({
    name: '',
    classroom: 'personal',
    focusArea: 'Preparación de Examen / Parcial',
    observation: '',
    color: 'purple',
    topics: [] as StudyFolderTopic[]
  });
  const [studyPlanFile, setStudyPlanFile] = useState<{ name: string; size: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derive Current Active Folder
  const activeFolder = folders.find(f => f.id === activeFolderId);
  const activeStyle = getFolderColorStyle(activeFolder?.color, activeFolder?.name);

  // Get or Create Session for Active Folder
  const currentSession = sessions.find(s => s.id === activeSessionId && s.folderId === activeFolderId) 
    || sessions.find(s => s.folderId === activeFolderId)
    || {
      id: `sess-${activeFolderId}-${Date.now()}`,
      folderId: activeFolderId || '1',
      folderName: activeFolder?.name || 'Carpeta de Estudio',
      title: `Sesión de Estudio: ${activeFolder?.name || 'Foxy'}`,
      createdAt: 'Ahora',
      updatedAt: 'Ahora',
      mode: 'socratico' as const,
      isPinned: false,
      messages: [
        {
          id: `msg-init-${Date.now()}`,
          sender: 'ai' as const,
          text: `¡Hola! 🦊 Estoy listo para ayudarte con tu carpeta de **${activeFolder?.name || 'Estudio'}**.\n\nTengo presentes las unidades temáticas y el cronograma de estudio. ¿Qué deseas practicar hoy?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            { label: '🃏 Practicar Flashcards', actionPrompt: 'Genera un mazo de flashcards de este tema', iconType: 'flashcards' },
            { label: '⚡ Tomar Quiz Rápido', actionPrompt: 'Tomemos un quiz formativo de 5 preguntas', iconType: 'quiz' },
            { label: '🧠 Ver Mapa Conceptual', actionPrompt: 'Diseña el mapa conceptual del tema', iconType: 'mapa' },
            { label: '📝 Crear Resumen', actionPrompt: 'Haz un resumen con puntos clave', iconType: 'resumen' }
          ]
        }
      ]
    };

  // Filtered folders for dashboard
  const filteredFolders = folders.filter(folder => {
    const matchesSearch = folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (folder.linkedClassroom && folder.linkedClassroom.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (folder.focusArea && folder.focusArea.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;
    if (selectedFilter === 'classrooms') return !folder.isPersonal;
    if (selectedFilter === 'personal') return folder.isPersonal;
    return true;
  });

  // Handle open resource in practice modal
  const handleOpenResource = (resource: StudyGeneratedResource) => {
    if (resource.type === 'flashcards' && resource.data?.flashcardDeck) {
      setActiveFlashcardDeck(resource.data.flashcardDeck);
    } else if (resource.type === 'quiz' && resource.data?.quiz) {
      setActiveQuizResource(resource.data.quiz);
    } else if (resource.type === 'mapa' && resource.data?.conceptMap) {
      setActiveConceptMapResource(resource.data.conceptMap);
    } else if (resource.type === 'resumen') {
      toast.show(`Abriendo "${resource.title}" en el panel de lectura`, 'info');
      setActiveFolderTab('chat');
    }
  };

  // Open Tool Generator
  const handleRequestCreateTool = (toolType?: StudyToolType) => {
    setGenerateModalInitialType(toolType);
    setIsGenerateModalOpen(true);
  };

  // Save new generated resource to library
  const handleSaveResourceToLibrary = (newResource: StudyGeneratedResource) => {
    setResources(prev => [newResource, ...prev]);
    toast.show(`✨ "${newResource.title}" guardado en la Biblioteca`, 'success');
  };

  // Update session
  const handleUpdateSession = (updatedSession: StudentStudySession) => {
    setSessions(prev => {
      const idx = prev.findIndex(s => s.id === updatedSession.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = updatedSession;
        return next;
      }
      return [updatedSession, ...prev];
    });
  };

  // Create new session
  const handleNewSession = (folderId: string) => {
    const targetFolder = folders.find(f => f.id === folderId);
    const newSess: StudentStudySession = {
      id: `sess-${folderId}-${Date.now()}`,
      folderId,
      folderName: targetFolder?.name || 'Carpeta',
      title: `Nueva sesión: ${new Date().toLocaleDateString([], { day: '2-digit', month: 'short' })}`,
      createdAt: 'Ahora',
      updatedAt: 'Ahora',
      mode: 'socratico',
      isPinned: false,
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender: 'ai',
          text: `¡Comenzamos una nueva sesión de estudio para **${targetFolder?.name}**! 🦊\n\n¿En qué objetivo nos enfocamos hoy?`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [
            { label: '🃏 Flashcards de Repaso', actionPrompt: 'Repasemos con flashcards', iconType: 'flashcards' },
            { label: '⚡ Quiz Rápido', actionPrompt: 'Tomame un quiz formativo', iconType: 'quiz' }
          ]
        }
      ]
    };
    setSessions(prev => [newSess, ...prev]);
    setActiveSessionId(newSess.id);
    setIsHistoryDrawerOpen(false);
    toast.show('Nueva sesión de estudio iniciada', 'success');
  };

  // Execute reminder action
  const handleExecuteReminder = (rem: StudentFoxyReminder) => {
    if (rem.folderId && rem.folderId !== activeFolderId) {
      setActiveFolderId(rem.folderId);
    }
    setActiveFolderTab('chat');

    if (rem.actionType === 'start_flashcards') {
      const targetDeck = resources.find(r => r.folderId === rem.folderId && r.type === 'flashcards');
      if (targetDeck?.data?.flashcardDeck) {
        setActiveFlashcardDeck(targetDeck.data.flashcardDeck);
        return;
      }
    } else if (rem.actionType === 'start_quiz') {
      const targetQuiz = resources.find(r => r.folderId === rem.folderId && r.type === 'quiz');
      if (targetQuiz?.data?.quiz) {
        setActiveQuizResource(targetQuiz.data.quiz);
        return;
      }
    }

    // Default: send prompt in chat
    toast.show(`Iniciando: "${rem.title}"`, 'info');
  };

  // Folder creation flow handlers
  const handleOpenCreateModal = () => {
    setCreationStep('form');
    setNewFolderForm({
      name: '',
      classroom: 'personal',
      focusArea: 'Preparación de Examen / Parcial',
      observation: '',
      color: 'purple',
      topics: []
    });
    setStudyPlanFile(null);
    setIsCreateFolderModalOpen(true);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setStudyPlanFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      });
      toast.show(`Archivo "${file.name}" cargado`, 'info');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setStudyPlanFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`
      });
      toast.show(`Archivo "${file.name}" cargado`, 'info');
    }
  };

  const handleAnalyzeStudyMaterial = () => {
    if (!newFolderForm.name.trim()) {
      toast.show('Ingresa un nombre para la carpeta de estudio', 'error');
      return;
    }

    setCreationStep('analyzing');
    setTimeout(() => {
      let detectedTopics: StudyFolderTopic[] = [];
      const lowerName = newFolderForm.name.toLowerCase();

      if (lowerName.includes('historia') || lowerName.includes('revoluci') || lowerName.includes('social')) {
        detectedTopics = [
          {
            id: 'top-1',
            name: 'Unidad 1: Crisis del Antiguo Régimen y Estados Generales',
            subtopics: ['Monarquía absoluta y privilegios', 'Toma de la Bastilla (1789)', 'Declaración de Derechos del Hombre'],
            selected: true
          },
          {
            id: 'top-2',
            name: 'Unidad 2: La Convención Nacional y el Terror',
            subtopics: ['Girondinos vs Jacobinos', 'Robespierre y el Comité de Salvación Pública', 'Constitución de 1793'],
            selected: true
          },
          {
            id: 'top-3',
            name: 'Unidad 3: Directorio y Ascenso Napoleónico',
            subtopics: ['Reacción termidoriana', 'Golpe del 18 de Brumario', 'Código Civil y expansión europea'],
            selected: true
          }
        ];
      } else if (lowerName.includes('biolog') || lowerName.includes('cienc') || lowerName.includes('celul')) {
        detectedTopics = [
          {
            id: 'top-1',
            name: 'Unidad 1: Estructura y Función Celular',
            subtopics: ['Células procariotas y eucariotas', 'Membrana plasmática y transporte', 'Organelas y metabolismo'],
            selected: true
          },
          {
            id: 'top-2',
            name: 'Unidad 2: Genética y Ciclo Celular',
            subtopics: ['Mitosis y Meiosis', 'Leyes de Mendel', 'Estructura del ADN y replicación'],
            selected: true
          },
          {
            id: 'top-3',
            name: 'Unidad 3: Ecosistemas y Dinámica Poblacional',
            subtopics: ['Cadenas tróficas', 'Ciclos biogeoquímicos', 'Impacto antropogénico'],
            selected: true
          }
        ];
      } else {
        detectedTopics = [
          {
            id: 'top-1',
            name: `Unidad 1: Fundamentos y Conceptos Clave de ${newFolderForm.name}`,
            subtopics: ['Definición y principios rectores', 'Evolución histórica y contexto', 'Axiomas y postulados básicos'],
            selected: true
          },
          {
            id: 'top-2',
            name: 'Unidad 2: Desarrollo Analítico y Aplicación Práctica',
            subtopics: ['Metodología de resolución', 'Estudio de casos tipo parcial', 'Errores conceptuales frecuentes'],
            selected: true
          },
          {
            id: 'top-3',
            name: 'Unidad 3: Síntesis e Integración para Exámenes',
            subtopics: ['Cuadros comparativos clave', 'Simulacro de preguntas socráticas', 'Esquema de repaso espaciado'],
            selected: true
          }
        ];
      }

      setNewFolderForm(prev => ({ ...prev, topics: detectedTopics }));
      setCreationStep('review');
    }, 2000);
  };

  const handleFinalizeFolderCreation = () => {
    setCreationStep('creating');
    setTimeout(() => {
      const selectedTopics = newFolderForm.topics.filter(t => t.selected);
      const isPersonal = newFolderForm.classroom === 'personal';
      const createdFolderId = Date.now().toString();

      const createdFolder: StudyFolder = {
        id: createdFolderId,
        name: newFolderForm.name,
        linkedClassroom: isPersonal ? undefined : newFolderForm.classroom,
        isPersonal: isPersonal,
        focusArea: newFolderForm.focusArea,
        color: newFolderForm.color,
        progress: 0,
        nextReview: 'Hoy',
        topicsCount: selectedTopics.length,
        topics: selectedTopics,
        observation: newFolderForm.observation || undefined
      };

      setFolders(prev => [createdFolder, ...prev]);
      setActiveFolderId(createdFolderId);
      setActiveFolderTab('chat');
      setIsCreateFolderModalOpen(false);
      toast.show('🎉 ¡Carpeta de estudio creada exitosamente con Foxy!', 'success');
    }, 1200);
  };

  return (
    <div className={`flex-1 flex flex-col ${!activeFolderId ? 'overflow-y-auto pb-20 md:pb-8 px-4 md:px-8 pt-6' : 'h-full pb-6'} select-text`}>
      {/* Dynamic View: Top Dashboard (Folder List) vs In-Folder Copilot Workspace */}
      <LayoutGroup>
        <AnimatePresence mode="wait">
          {!activeFolderId ? (
            /* ========================================================================= */
            /* 1. ROOT FOLDER DASHBOARD VIEW (Matching Mis Aulas & Mi Progreso Design)   */
            /* ========================================================================= */
            <motion.div
              key="folder-dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
              className="max-w-7xl mx-auto w-full space-y-6"
            >
              {/* Main Section Header */}
              <header className="flex flex-col gap-4 mb-2">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h2 className="text-2xl md:text-3xl font-heading font-bold text-fox-text-main flex items-center gap-3 flex-wrap">
                      <span className="p-2 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6" />
                      </span>
                      <span>Mis Carpetas de Estudio</span>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-sans font-semibold">
                        Tutor IA Socrático
                      </span>
                    </h2>
                    <p className="text-fox-text-muted mt-1.5 text-sm max-w-2xl leading-relaxed">
                      Organizá tus materias, generá flashcards, realizá quizzes formativos y prepará tus exámenes con el acompañamiento personalizado de Foxy.
                    </p>
                  </div>
                  <button 
                    onClick={handleOpenCreateModal}
                    className="bg-fox-purple text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-fox-purple/90 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md hover:scale-[1.02] cursor-pointer w-full md:w-auto"
                  >
                    <Plus size={18} /> <span>Nueva Carpeta</span>
                  </button>
                </div>
              </header>

              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-fox-surface border border-fox-border rounded-2xl p-3 shadow-2xs">
                <div className="relative flex-1 max-w-md">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fox-text-muted" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por materia, tema o examen..."
                    className="w-full pl-9 pr-4 py-2 text-xs bg-fox-bg border border-fox-border rounded-xl text-fox-text-main placeholder:text-fox-text-muted/60 focus:outline-none focus:border-fox-purple transition-colors"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-fox-text-muted hover:text-fox-text-main cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                  <button
                    onClick={() => setSelectedFilter('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedFilter === 'all'
                        ? 'bg-fox-purple text-white shadow-2xs'
                        : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    Todas ({folders.length})
                  </button>
                  <button
                    onClick={() => setSelectedFilter('classrooms')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedFilter === 'classrooms'
                        ? 'bg-fox-purple text-white shadow-2xs'
                        : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    Aulas Vinculadas
                  </button>
                  <button
                    onClick={() => setSelectedFilter('personal')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      selectedFilter === 'personal'
                        ? 'bg-fox-purple text-white shadow-2xs'
                        : 'bg-fox-bg border border-fox-border text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    Estudio Personal
                  </button>
                </div>
              </div>

              {/* Student Study Folder Cards Grid - Matching Mis Aulas Design Standards */}
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
                {filteredFolders.map((folder, idx) => {
                  const theme = getFolderColorStyle(folder.color, folder.name);
                  const folderResourcesCount = resources.filter(r => r.folderId === folder.id).length;
                  const unitsCount = folder.topics?.length || folder.topicsCount || 3;

                  return (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      key={folder.id} 
                      className="group bg-fox-surface rounded-3xl border border-fox-border shadow-xs hover:shadow-xl hover:border-fox-purple/30 transition-all duration-300 flex flex-col h-full hover:-translate-y-1 overflow-hidden relative cursor-pointer"
                      onClick={() => {
                        setActiveFolderId(folder.id);
                        setActiveFolderTab('chat');
                      }}
                    >
                      {/* Decorative Top Line indicator */}
                      <div className={`absolute top-0 left-0 w-full h-1.5 ${theme.bar}`} />

                      {/* Header section */}
                      <div className="p-6 pb-5 border-b border-fox-border/50">
                        <div className="flex justify-between items-start gap-4">
                          <div>
                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black mb-3 ${theme.badgeBg} ${theme.badgeText} border ${theme.border}`}>
                              <span className={`w-2 h-2 rounded-full ${theme.bullet} shrink-0`} />
                              {folder.linkedClassroom || (folder.isPersonal ? 'Estudio Personal' : 'Materia Vinculada')}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className={`w-2.5 h-2.5 rounded-full ${theme.bullet} shrink-0`} />
                              <h3 className="text-2xl font-heading font-extrabold text-fox-text-main leading-tight group-hover:text-fox-purple transition-colors line-clamp-1">
                                {folder.name}
                              </h3>
                            </div>
                          </div>
                          <div className="w-12 h-12 rounded-2xl bg-fox-bg border border-fox-border flex items-center justify-center text-fox-text-muted group-hover:bg-fox-purple/5 group-hover:text-fox-purple group-hover:border-fox-purple/20 transition-all shrink-0">
                            <BookOpen size={24} />
                          </div>
                        </div>
                        
                        <p className="flex items-center gap-2 mt-4 text-sm font-medium text-fox-text-muted">
                          <Target size={16} className="opacity-70 shrink-0" />
                          <span className="line-clamp-1">Enfoque: <strong className="text-fox-text-main">{folder.focusArea || 'Preparación Integral y Repaso'}</strong></span>
                        </p>
                      </div>

                      {/* Main Body - Progress & Stats */}
                      <div className="p-6 pt-5 flex-1 flex flex-col bg-fox-bg/30">
                        <div className="mb-6">
                          <div className="flex justify-between items-baseline mb-2">
                            <span className="text-sm font-bold text-fox-text-main/80">Tu dominio del contenido</span>
                            <span className={`text-xl font-black ${theme.textAccent}`}>
                              {folder.progress || 0}%
                            </span>
                          </div>
                          <div className="w-full bg-fox-border/60 rounded-full h-2.5 overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${folder.progress || 0}%` }}
                              transition={{ duration: 1, delay: 0.2 }}
                              className={`h-full rounded-full ${theme.bar} transition-all`}
                            />
                          </div>
                        </div>

                        {/* Metrics Grid */}
                        <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-auto">
                          {/* Unidades */}
                          <div className="bg-fox-surface border border-fox-border rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center shadow-2xs group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                            <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Unidades</span>
                            <div className="flex items-center justify-center gap-1.5 min-w-0 max-w-full">
                              <Layers size={14} className="text-fox-purple shrink-0" />
                              <span className="text-base sm:text-lg font-black text-fox-text-main leading-none">
                                {unitsCount}
                              </span>
                            </div>
                          </div>

                          {/* Próximo Repaso */}
                          <div 
                            className="bg-fox-surface border border-fox-border rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center shadow-2xs group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center"
                            title={`Próximo repaso: ${folder.nextReview || 'Hoy'}`}
                          >
                            <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Repaso</span>
                            <div className="flex items-center justify-center gap-1 min-w-0 max-w-full w-full px-0.5">
                              <Calendar size={13} className="text-fox-primary shrink-0" />
                              <span className="text-[11px] sm:text-xs font-black text-fox-text-main truncate text-center block">
                                {folder.nextReview || 'Hoy'}
                              </span>
                            </div>
                          </div>

                          {/* Recursos IA */}
                          <div className="bg-fox-surface border border-fox-border rounded-2xl p-2.5 sm:p-3 flex flex-col items-center justify-center shadow-2xs group-hover:border-fox-border/80 transition-colors min-w-0 overflow-hidden text-center">
                            <span className="text-[10px] font-extrabold text-fox-text-muted uppercase tracking-wider mb-1 truncate w-full text-center">Recursos</span>
                            <div className="flex items-center justify-center gap-1 min-w-0 max-w-full">
                              <Sparkles size={14} className="text-amber-500 shrink-0" />
                              <span className="text-xs sm:text-sm font-black text-fox-text-main">
                                {folderResourcesCount > 0 ? `${folderResourcesCount} IA` : '3 IA'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-4 px-6 border-t border-fox-border bg-fox-surface flex items-center justify-between group-hover:bg-fox-bg/50 transition-colors">
                        <span className="text-xs font-bold text-fox-text-muted flex items-center gap-1.5">
                          <Clock size={13} /> {folder.nextReview ? `Activa: ${folder.nextReview}` : 'Lista para estudiar'}
                        </span>
                        <div className="flex items-center gap-1 text-fox-purple font-bold text-xs group-hover:translate-x-1 transition-transform">
                          <span>Ingresar</span>
                          <ChevronRight size={15} />
                        </div>
                      </div>
                    </motion.div>
                  );
                })}

                {/* Add New Folder Card Button */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -3 }}
                  onClick={handleOpenCreateModal}
                  className="bg-fox-surface/40 hover:bg-fox-surface border-2 border-dashed border-fox-border hover:border-fox-purple/50 rounded-3xl p-6 flex flex-col items-center justify-center text-center cursor-pointer min-h-[340px] group transition-all duration-300 shadow-2xs hover:shadow-lg"
                >
                  <div className="w-14 h-14 rounded-2xl bg-fox-purple/10 border border-fox-purple/20 text-fox-purple flex items-center justify-center font-bold mb-4 group-hover:scale-110 group-hover:bg-fox-purple group-hover:text-white transition-all shadow-xs">
                    <Plus size={26} />
                  </div>
                  <h3 className="font-heading font-extrabold text-lg text-fox-text-main mb-1.5 group-hover:text-fox-purple transition-colors">
                    Crear Nueva Carpeta
                  </h3>
                  <p className="text-xs text-fox-text-muted max-w-[220px] leading-relaxed">
                    Cargá tus apuntes, detectá unidades curriculares con IA y generá planes de estudio socráticos.
                  </p>
                  <span className="mt-4 px-3.5 py-1.5 rounded-xl bg-fox-bg border border-fox-border text-xs font-bold text-fox-text-muted group-hover:text-fox-purple group-hover:border-fox-purple/30 transition-all flex items-center gap-1.5">
                    <Sparkles size={13} className="text-fox-purple" /> Iniciar con Foxy
                  </span>
                </motion.div>
              </div>
            </motion.div>
          ) : (
            /* ========================================================================= */
            /* 2. IN-FOLDER ACTIVE COPILOT WORKSPACE (Teacher Foxy AI UX for Students)    */
            /* ========================================================================= */
            <motion.div
              key="active-folder-workspace"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="flex-1 flex flex-col space-y-4 min-h-0 h-full"
            >
              {/* Top Study Copilot Navigation Header */}
              <div className="bg-fox-surface border border-fox-border rounded-3xl p-3.5 sm:p-4 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shrink-0 relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${activeStyle.bar}`} />

                {/* Folder Identity & Back Button */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setActiveFolderId(null)}
                    className="p-2 rounded-xl border border-fox-border bg-fox-bg text-fox-text-muted hover:text-fox-text-main hover:bg-fox-border/40 transition-colors shrink-0"
                    title="Volver a mis carpetas"
                  >
                    <ArrowLeft size={18} />
                  </button>

                  <div className={`w-11 h-11 rounded-2xl ${activeStyle.badge} flex items-center justify-center font-bold shadow-2xs shrink-0`}>
                    <BookOpen size={22} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="font-heading font-extrabold text-fox-text-main text-base sm:text-lg truncate">
                        {activeFolder?.name}
                      </h2>
                      <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full ${activeStyle.badge} border ${activeStyle.borderLight}`}>
                        {activeFolder?.linkedClassroom || 'Estudio Personal'}
                      </span>
                    </div>
                    <p className="text-xs text-fox-text-muted truncate mt-0.5">
                      {activeFolder?.focusArea || 'Estudio Integral con Foxy Tutor'} • Dominio: <strong className={activeStyle.text}>{activeFolder?.progress || 0}%</strong>
                    </p>
                  </div>
                </div>

                {/* Copilot Mode Tabs (Chat, Library, Plans, Reminders) */}
                <div className="flex items-center gap-1.5 bg-fox-bg p-1 rounded-2xl border border-fox-border overflow-x-auto self-start lg:self-auto w-full lg:w-auto">
                  <button
                    onClick={() => setActiveFolderTab('chat')}
                    className={`flex-1 lg:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeFolderTab === 'chat'
                        ? 'bg-fox-surface text-fox-purple shadow-2xs'
                        : 'text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    <BrainCircuit size={15} />
                    <span>Tutor IA</span>
                  </button>

                  <button
                    onClick={() => setActiveFolderTab('library')}
                    className={`flex-1 lg:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeFolderTab === 'library'
                        ? 'bg-fox-surface text-fox-purple shadow-2xs'
                        : 'text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    <FolderOpen size={15} />
                    <span>Biblioteca ({resources.filter(r => r.folderId === activeFolderId).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveFolderTab('plans')}
                    className={`flex-1 lg:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeFolderTab === 'plans'
                        ? 'bg-fox-surface text-fox-purple shadow-2xs'
                        : 'text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    <Target size={15} />
                    <span>Planes ({studyPlans.filter(p => p.folderId === activeFolderId).length})</span>
                  </button>

                  <button
                    onClick={() => setActiveFolderTab('reminders')}
                    className={`flex-1 lg:flex-initial px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                      activeFolderTab === 'reminders'
                        ? 'bg-fox-surface text-fox-purple shadow-2xs'
                        : 'text-fox-text-muted hover:text-fox-text-main'
                    }`}
                  >
                    <Lightbulb size={15} />
                    <span>Recordatorios ({reminders.filter(r => r.folderId === activeFolderId).length})</span>
                  </button>
                </div>

                {/* Right Action Drawers Triggers */}
                <div className="flex items-center gap-2 self-end lg:self-auto">
                  <button
                    onClick={() => setIsContextDrawerOpen(true)}
                    className="p-2 rounded-xl border border-fox-border bg-fox-surface text-fox-text-muted hover:text-fox-purple hover:bg-fox-bg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Ver contexto, unidades y archivos indexados"
                  >
                    <BookOpen size={15} />
                    <span className="hidden sm:inline">Contexto</span>
                  </button>

                  <button
                    onClick={() => setIsHistoryDrawerOpen(true)}
                    className="p-2 rounded-xl border border-fox-border bg-fox-surface text-fox-text-muted hover:text-fox-purple hover:bg-fox-bg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    title="Historial de sesiones de estudio"
                  >
                    <History size={15} />
                    <span className="hidden sm:inline">Historial</span>
                  </button>

                  <button
                    onClick={() => handleRequestCreateTool()}
                    className="px-3 py-2 bg-fox-purple hover:bg-fox-purple/90 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Sparkles size={14} />
                    <span>Crear Herramienta</span>
                  </button>
                </div>
              </div>

              {/* Main Tab Subview */}
              <div className="flex-1 min-h-0 h-full">
                {activeFolder && activeFolderTab === 'chat' && (
                  <StudyChatWorkspace
                    folder={activeFolder}
                    session={currentSession}
                    onUpdateSession={handleUpdateSession}
                    onOpenResource={handleOpenResource}
                    onRequestCreateTool={handleRequestCreateTool}
                    onSaveResourceToLibrary={handleSaveResourceToLibrary}
                  />
                )}

                {activeFolder && activeFolderTab === 'library' && (
                  <StudyResourceLibrary
                    resources={resources}
                    folderId={activeFolderId}
                    folderName={activeFolder.name}
                    onOpenResource={handleOpenResource}
                    onRequestCreateTool={handleRequestCreateTool}
                  />
                )}

                {activeFolder && activeFolderTab === 'plans' && (
                  <StudyPlansPanel
                    plans={studyPlans}
                    folderId={activeFolderId}
                    folderName={activeFolder.name}
                    onCreateNewPlan={() => handleRequestCreateTool('plan')}
                    onUpdatePlan={(updatedPlan) => {
                      setStudyPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
                    }}
                  />
                )}

                {activeFolder && activeFolderTab === 'reminders' && (
                  <StudyRemindersPanel
                    reminders={reminders}
                    folderId={activeFolderId}
                    folderName={activeFolder.name}
                    onExecuteReminderAction={handleExecuteReminder}
                  />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </LayoutGroup>

      {/* ========================================================================= */}
      {/* 3. DRAWERS & MODALS                                                       */}
      {/* ========================================================================= */}

      {/* Context Knowledge Base Drawer */}
      {activeFolder && (
        <StudyContextDrawer
          folder={activeFolder}
          isOpen={isContextDrawerOpen}
          onClose={() => setIsContextDrawerOpen(false)}
        />
      )}

      {/* History Drawer */}
      {activeFolder && (
        <StudyHistoryDrawer
          sessions={sessions}
          activeSessionId={activeSessionId}
          onSelectSession={(sessId) => {
            setActiveSessionId(sessId);
            setIsHistoryDrawerOpen(false);
          }}
          onNewSession={() => handleNewSession(activeFolderId)}
          isOpen={isHistoryDrawerOpen}
          onClose={() => setIsHistoryDrawerOpen(false)}
        />
      )}

      {/* Study Tool Generate Modal */}
      {activeFolder && (
        <StudyToolGenerateModal
          isOpen={isGenerateModalOpen}
          folderName={activeFolder.name}
          topics={activeFolder.topics}
          defaultToolType={generateModalInitialType}
          onClose={() => setIsGenerateModalOpen(false)}
          onGenerate={(config) => {
            const newRes: StudyGeneratedResource = {
              id: `res-gen-${Date.now()}`,
              title: `${config.toolType.toUpperCase()}: ${config.topic}`,
              type: config.toolType,
              folderId: activeFolder.id,
              folderName: activeFolder.name,
              topic: config.topic,
              description: config.instructions || `Generado con IA para ${config.topic}`,
              createdAt: 'Justo ahora',
              fileSize: `${config.count} elementos`,
              fileFormat: config.toolType === 'flashcards' ? 'FLASHCARDS' : config.toolType === 'quiz' ? 'QUIZ' : config.toolType === 'mapa' ? 'CONCEPT_MAP' : 'MARKDOWN',
              data: {}
            };
            handleSaveResourceToLibrary(newRes);
            setIsGenerateModalOpen(false);
            toast.show(`✨ Herramienta generada correctamente`, 'success');
          }}
        />
      )}

      {/* Interactive 3D Flashcard Modal */}
      {activeFlashcardDeck && (
        <StudyFlashcardModal
          isOpen={!!activeFlashcardDeck}
          deck={activeFlashcardDeck}
          onClose={() => setActiveFlashcardDeck(null)}
          onUpdateDeck={(updatedDeck) => {
            setResources(prev => prev.map(r => {
              if (r.data?.flashcardDeck?.id === updatedDeck.id) {
                return {
                  ...r,
                  data: {
                    ...r.data,
                    flashcardDeck: updatedDeck
                  }
                };
              }
              return r;
            }));
          }}
        />
      )}

      {/* Interactive Quiz Modal */}
      {activeQuizResource && (
        <StudyQuizModal
          isOpen={!!activeQuizResource}
          quiz={activeQuizResource}
          onClose={() => setActiveQuizResource(null)}
          onComplete={(score, total) => {
            if (activeFolderId) {
              setFolders(prev => prev.map(f => {
                if (f.id === activeFolderId) {
                  const newProgress = calculateFolderQuizProgress(f.progress, score, total);
                  return { ...f, progress: newProgress };
                }
                return f;
              }));
            }
          }}
        />
      )}

      {/* Interactive Concept Map Modal */}
      {activeConceptMapResource && (
        <StudyConceptMapModal
          isOpen={!!activeConceptMapResource}
          conceptMap={activeConceptMapResource}
          onClose={() => setActiveConceptMapResource(null)}
        />
      )}

      {/* ========================================================================= */}
      {/* 4. CREAR NUEVA CARPETA DE ESTUDIO (Modal 4 Pasos idéntico a Aulas)       */}
      {/* ========================================================================= */}
      <AnimatePresence>
        {isCreateFolderModalOpen && (
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
                  <div className="w-10 h-10 rounded-2xl bg-fox-purple/10 text-fox-purple border border-fox-purple/20 flex items-center justify-center shrink-0">
                    {creationStep === 'review' ? <Sparkles size={20} /> : <BookOpen size={20} />}
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-fox-text-main text-lg leading-tight">
                      {creationStep === 'form' && 'Crear Nueva Carpeta de Estudio'}
                      {creationStep === 'analyzing' && 'Analizando Material de Estudio'}
                      {creationStep === 'review' && 'Estructura de Estudio Detectada'}
                      {creationStep === 'creating' && 'Configurando Carpeta de Estudio'}
                    </h3>
                    <p className="text-xs text-fox-text-muted mt-0.5">
                      {creationStep === 'form' && 'Paso 1 de 2: Información inicial y material de estudio'}
                      {creationStep === 'analyzing' && 'La IA de Foxy está procesando el contenido'}
                      {creationStep === 'review' && 'Paso 2 de 2: Revisión y ajuste de temas'}
                      {creationStep === 'creating' && 'Guardando carpeta y vinculando cronograma de estudio'}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsCreateFolderModalOpen(false)} 
                  className="text-fox-text-muted hover:text-fox-text-main bg-fox-surface rounded-full p-2 shadow-2xs border border-fox-border transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto flex-1 h-full max-h-full space-y-6">
                {creationStep === 'form' && (
                  <div className="space-y-5">
                    {/* 1. Nombre de la carpeta de estudio */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                        Nombre de la Carpeta de Estudio <span className="text-fox-orange">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={newFolderForm.name}
                        onChange={e => setNewFolderForm({...newFolderForm, name: e.target.value})}
                        className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main placeholder:text-fox-text-muted/50 focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all" 
                        placeholder="Ej: Examen Final de Biología, Revolución Francesa, Análisis Matemático" 
                      />
                    </div>

                    {/* 2. Aula Vinculada y Enfoque */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                          Vincular a un Aula Virtual <span className="text-fox-orange">*</span>
                        </label>
                        <select 
                          value={newFolderForm.classroom}
                          onChange={e => setNewFolderForm({...newFolderForm, classroom: e.target.value})}
                          className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all cursor-pointer" 
                        >
                          <option value="personal">Sin vincular (Estudio Personal)</option>
                          <option value="Literatura 3°A">Literatura 3°A</option>
                          <option value="Historia 3°A">Historia 3°A</option>
                          <option value="Matemáticas 3°A">Matemáticas 3°A</option>
                          <option value="Ciencias Naturales 3°A">Ciencias Naturales 3°A</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                          Objetivo / Enfoque <span className="text-fox-orange">*</span>
                        </label>
                        <select 
                          value={newFolderForm.focusArea}
                          onChange={e => setNewFolderForm({...newFolderForm, focusArea: e.target.value})}
                          className="w-full bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-sm font-medium text-fox-text-main focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all cursor-pointer" 
                        >
                          <option value="Preparación de Examen / Parcial">Preparación de Examen / Parcial</option>
                          <option value="Repaso Semanal de Clases">Repaso Semanal de Clases</option>
                          <option value="Lectura y Resúmenes">Lectura y Resúmenes</option>
                          <option value="Proyecto / Trabajo Práctico">Proyecto / Trabajo Práctico</option>
                          <option value="Refuerzo y Regularización">Refuerzo y Regularización</option>
                        </select>
                      </div>
                    </div>

                    {/* 3. Selección de Color */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                        Color Distintivo de la Carpeta
                      </label>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {folderColorPalette.map(color => (
                          <button
                            key={color.id}
                            type="button"
                            onClick={() => setNewFolderForm({...newFolderForm, color: color.id})}
                            className={`w-9 h-9 rounded-2xl ${color.bgClass} flex items-center justify-center text-white transition-all ${
                              newFolderForm.color === color.id ? 'ring-4 ring-fox-purple/20 scale-110 shadow-sm' : 'opacity-80 hover:opacity-100 hover:scale-105'
                            }`}
                            title={color.label}
                          >
                            {newFolderForm.color === color.id && <Check size={16} className="stroke-[3]" />}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* 4. Subir Programa / Apuntes */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                        Subir Programa / Apuntes Guía (Opcional)
                      </label>
                      
                      <div 
                        onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
                        onDragLeave={() => setIsDraggingFile(false)}
                        onDrop={handleFileDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                          isDraggingFile 
                            ? 'border-fox-purple bg-fox-purple/5 scale-[0.99]' 
                            : studyPlanFile 
                              ? 'border-fox-purple/40 bg-fox-purple/5' 
                              : 'border-fox-border hover:border-fox-purple/40 hover:bg-fox-bg/50'
                        }`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          onChange={handleFileSelect} 
                          className="hidden" 
                          accept=".pdf,.doc,.docx,.txt"
                        />
                        
                        {studyPlanFile ? (
                          <div className="flex items-center justify-between bg-fox-surface p-3.5 rounded-xl border border-fox-purple/20 shadow-xs">
                            <div className="flex items-center gap-3 text-left">
                              <div className="w-10 h-10 rounded-xl bg-fox-purple/10 text-fox-purple flex items-center justify-center shrink-0">
                                <FileText size={20} />
                              </div>
                              <div>
                                <p className="text-sm font-bold text-fox-text-main line-clamp-1">{studyPlanFile.name}</p>
                                <p className="text-xs text-fox-text-muted">{studyPlanFile.size} • Listo para ser analizado por Foxy</p>
                              </div>
                            </div>
                            <button 
                              type="button" 
                              onClick={(e) => { e.stopPropagation(); setStudyPlanFile(null); }}
                              className="text-fox-text-muted hover:text-fox-red p-1.5 rounded-lg hover:bg-fox-bg transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <div className="w-12 h-12 rounded-2xl bg-fox-purple/10 text-fox-purple flex items-center justify-center mb-3">
                              <Upload size={22} />
                            </div>
                            <p className="text-sm font-bold text-fox-text-main mb-1">
                              Arrastra el programa de la materia o apunte aquí
                            </p>
                            <p className="text-xs text-fox-text-muted">
                              PDF, Word o TXT (Máx 25 MB). Foxy detectará automáticamente los temas.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 5. Notas Adicionales */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-fox-text-muted mb-2">
                        Notas de Estudio / Observaciones del Parcial (Opcional)
                      </label>
                      <textarea 
                        value={newFolderForm.observation}
                        onChange={e => setNewFolderForm({...newFolderForm, observation: e.target.value})}
                        rows={2}
                        className="w-full bg-fox-bg border border-fox-border rounded-2xl p-3 text-sm font-medium text-fox-text-main placeholder:text-fox-text-muted/50 focus:ring-2 focus:ring-fox-purple/20 focus:border-fox-purple outline-none transition-all resize-none"
                        placeholder="Ej: Entran las unidades 1 a 4. Énfasis en preguntas teóricas y cuadros comparativos..."
                      />
                    </div>
                  </div>
                )}

                {/* STEP 2: ANALYZING */}
                {creationStep === 'analyzing' && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-5">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-3xl bg-fox-purple/10 text-fox-purple flex items-center justify-center border border-fox-purple/20 shadow-inner">
                        <BrainCircuit size={40} className="animate-pulse" />
                      </div>
                      <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-gradient-to-tr from-fox-purple to-fox-primary text-white flex items-center justify-center shadow-sm">
                        <Sparkles size={14} className="animate-spin" />
                      </div>
                    </div>
                    <div>
                      <h4 className="font-heading font-extrabold text-fox-text-main text-lg">
                        Foxy está estructurando tu plan de estudio...
                      </h4>
                      <p className="text-xs text-fox-text-muted max-w-sm mx-auto mt-1">
                        Analizando conceptos clave, correlación con la currícula oficial y configurando tus unidades de Active Recall.
                      </p>
                    </div>
                    <div className="w-48 bg-fox-bg rounded-full h-2 overflow-hidden border border-fox-border">
                      <div className="h-full bg-gradient-to-r from-fox-purple to-fox-primary rounded-full animate-pulse w-3/4"></div>
                    </div>
                  </div>
                )}

                {/* STEP 3: REVIEW TOPICS */}
                {creationStep === 'review' && (
                  <div className="space-y-4">
                    <div className="bg-fox-purple/5 border border-fox-purple/20 p-4 rounded-2xl flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-fox-purple text-white flex items-center justify-center shrink-0">
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h4 className="font-bold text-xs text-fox-text-main uppercase tracking-wider">
                          Estructura sugerida por Foxy IA
                        </h4>
                        <p className="text-xs text-fox-text-muted">
                          Desmarca los temas que ya dominas o añade nuevos contenidos para personalizar tu repaso.
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {newFolderForm.topics.map((topic, tIdx) => (
                        <div key={topic.id} className="bg-fox-bg border border-fox-border rounded-2xl p-4 transition-all">
                          <div className="flex items-start justify-between gap-3">
                            <label className="flex items-start gap-3 cursor-pointer select-none">
                              <input 
                                type="checkbox" 
                                checked={topic.selected}
                                onChange={(e) => {
                                  const updated = [...newFolderForm.topics];
                                  updated[tIdx].selected = e.target.checked;
                                  setNewFolderForm({ ...newFolderForm, topics: updated });
                                }}
                                className="mt-1 w-4 h-4 rounded text-fox-purple focus:ring-fox-purple"
                              />
                              <div>
                                <span className="font-bold text-sm text-fox-text-main block">
                                  {topic.name}
                                </span>
                                {topic.subtopics && topic.subtopics.length > 0 && (
                                  <div className="mt-2 space-y-1 pl-1">
                                    {topic.subtopics.map((sub, sIdx) => (
                                      <p key={sIdx} className="text-xs text-fox-text-muted flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-fox-purple/60"></span>
                                        {sub}
                                      </p>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </label>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* STEP 4: FINALIZING */}
                {creationStep === 'creating' && (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 rounded-2xl bg-fox-green/10 text-fox-green flex items-center justify-center">
                      <CheckCircle2 size={36} className="animate-bounce" />
                    </div>
                    <h4 className="font-heading font-extrabold text-fox-text-main text-lg">
                      ¡Guardando Carpeta de Estudio!
                    </h4>
                    <p className="text-xs text-fox-text-muted">
                      Generando mazo de flashcards inicial y vinculando tu cronograma...
                    </p>
                  </div>
                )}
              </div>

              {/* Modal Footer Buttons */}
              <div className="p-4 sm:p-5 border-t border-fox-border bg-fox-bg/50 flex justify-between items-center shrink-0">
                {creationStep === 'form' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsCreateFolderModalOpen(false)}
                      className="px-4 py-2.5 rounded-xl border border-fox-border bg-fox-surface hover:bg-fox-bg text-xs font-bold text-fox-text-muted hover:text-fox-text-main transition-colors cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleAnalyzeStudyMaterial}
                      className="px-5 py-2.5 rounded-xl bg-fox-purple hover:bg-fox-purple/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Siguiente: Analizar con IA</span>
                      <ChevronRight size={16} />
                    </button>
                  </>
                )}

                {creationStep === 'review' && (
                  <>
                    <button
                      type="button"
                      onClick={() => setCreationStep('form')}
                      className="px-4 py-2.5 rounded-xl border border-fox-border bg-fox-surface hover:bg-fox-bg text-xs font-bold text-fox-text-muted hover:text-fox-text-main transition-colors cursor-pointer"
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      onClick={handleFinalizeFolderCreation}
                      className="px-5 py-2.5 rounded-xl bg-fox-purple hover:bg-fox-purple/90 text-white text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
                    >
                      <span>Crear Carpeta de Estudio</span>
                      <Check size={16} />
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
