import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BrainCircuit, 
  Send, 
  FileText, 
  Sparkles, 
  Wand2, 
  BookOpen, 
  Clock, 
  ChevronRight, 
  Paperclip, 
  X, 
  Save, 
  Download, 
  Mic, 
  Copy, 
  RefreshCw, 
  FolderPlus, 
  Plus, 
  ChevronDown, 
  CalendarDays, 
  Puzzle, 
  ClipboardCheck,
  History,
  Database,
  FolderOpen,
  Lightbulb,
  Maximize2,
  Minimize2,
  Check,
  Share2,
  Presentation,
  Network,
  Users,
  Eye,
  Sliders,
  AlertCircle
} from 'lucide-react';
import { useAppContext } from '../../context';
import { toast } from '../../components/ui/Toaster';
import { 
  CopilotoSession, 
  CopilotoMessage, 
  CopilotoResource, 
  AulaContextKnowledge, 
  CopilotoRecommendation,
  AgentType,
  ToneType
} from './copiloto/copilotoTypes';
import { 
  INITIAL_AULA_CONTEXTS, 
  INITIAL_COPILOTO_SESSIONS, 
  INITIAL_RESOURCES, 
  INITIAL_RECOMMENDATIONS 
} from './copiloto/copilotoData';
import { CopilotoHistoryDrawer } from './copiloto/CopilotoHistoryDrawer';
import { CopilotoContextDrawer } from './copiloto/CopilotoContextDrawer';
import { CopilotoResourceLibrary } from './copiloto/CopilotoResourceLibrary';
import { CopilotoRecommendationsPanel } from './copiloto/CopilotoRecommendationsPanel';
import { CopilotoActivityAssignModal } from './copiloto/CopilotoActivityAssignModal';
import { CopilotoVoiceRecorder } from './copiloto/CopilotoVoiceRecorder';
import { CopilotoConceptMapModal } from './copiloto/CopilotoConceptMapModal';
import { CopilotoPresentationModal } from './copiloto/CopilotoPresentationModal';

// Slash commands helper
const SLASH_COMMANDS = [
  { cmd: '/rubrica', desc: 'Crear matriz o rúbrica analítica' },
  { cmd: '/dua', desc: 'Adaptación para perfiles DUA' },
  { cmd: '/secuencia', desc: 'Secuencia didáctica semanal' },
  { cmd: '/quiz', desc: 'Quiz de 5 preguntas formativas' },
  { cmd: '/mapa', desc: 'Mapa conceptual interactivo' },
  { cmd: '/slides', desc: 'Presentación de diapositivas' },
];

export function CopilotoIADocente() {
  const { setView } = useAppContext();

  // Active top tab: 'chat' | 'library' | 'recommendations'
  const [activeTab, setActiveTab] = useState<'chat' | 'library' | 'recommendations'>('chat');

  // Sessions state
  const [sessions, setSessions] = useState<CopilotoSession[]>(INITIAL_COPILOTO_SESSIONS);
  const [activeSessionId, setActiveSessionId] = useState<string>(INITIAL_COPILOTO_SESSIONS[0].id);

  // Classroom Contexts state
  const [aulaContexts, setAulaContexts] = useState<Record<string, AulaContextKnowledge>>(INITIAL_AULA_CONTEXTS);
  const [selectedAulaId, setSelectedAulaId] = useState<string>('c1');

  // Resources state
  const [resources, setResources] = useState<CopilotoResource[]>(INITIAL_RESOURCES);

  // Recommendations state
  const [recommendations, setRecommendations] = useState<CopilotoRecommendation[]>(INITIAL_RECOMMENDATIONS);

  // Drawers & Modals
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isContextDrawerOpen, setIsContextDrawerOpen] = useState(false);
  const [isActivityAssignOpen, setIsActivityAssignOpen] = useState(false);
  const [activityAssignData, setActivityAssignData] = useState<{
    title: string;
    description: string;
    contentMarkdown?: string;
  } | null>(null);

  // Previews for specialized resources
  const [activeConceptMapModal, setActiveConceptMapModal] = useState<CopilotoResource | null>(null);
  const [activePresentationModal, setActivePresentationModal] = useState<CopilotoResource | null>(null);

  // Chat UI states
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; type: string } | null>(null);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);

  // Right Side Canvas Document Editor state
  const [isCanvasOpen, setIsCanvasOpen] = useState(true);
  const [canvasDocument, setCanvasDocument] = useState<{
    title: string;
    type: string;
    content: string;
  }>({
    title: 'Rúbrica Analítica: Ensayo de Vanguardias',
    type: 'rubric',
    content: INITIAL_RESOURCES[0].contentMarkdown || ''
  });

  const chatScrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Current session object
  const currentSession = sessions.find(s => s.id === activeSessionId) || sessions[0];
  const currentAulaContext = aulaContexts[selectedAulaId] || aulaContexts['c1'];
  const activeFilesCount = currentAulaContext?.files.filter(f => f.activeInContext).length || 0;

  // Auto-scroll chat
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [currentSession?.messages, isThinking]);

  // Handle Switch Session
  const handleSelectSession = (sessionId: string) => {
    setActiveSessionId(sessionId);
    const target = sessions.find(s => s.id === sessionId);
    if (target && target.aulaId && aulaContexts[target.aulaId]) {
      setSelectedAulaId(target.aulaId);
    }
  };

  // Handle Create New Session
  const handleNewSession = () => {
    const newId = `session-${Date.now()}`;
    const newSession: CopilotoSession = {
      id: newId,
      title: 'Nueva Consulta Pedagógica',
      createdAt: 'Ahora',
      updatedAt: 'Ahora',
      aulaId: selectedAulaId,
      aulaName: `${currentAulaContext?.subject} ${currentAulaContext?.course}`,
      agentType: 'general',
      tone: 'academico',
      messagesCount: 1,
      messages: [
        {
          id: `m-init-${Date.now()}`,
          sender: 'ai',
          text: `👋 ¡Hola, Profa. Laura! He cargado la base de conocimiento de **${currentAulaContext?.subject} ${currentAulaContext?.course}** (${activeFilesCount} archivos y ${currentAulaContext?.curriculumUnits.length} unidades curriculares).\n\n¿En qué te gustaría que trabajemos hoy? Puedes pedirme planificaciones, rúbricas analíticas, secuencias didácticas, mapas conceptuales o adaptaciones DUA.`,
          timestamp: 'Ahora',
          suggestedActions: [
            { label: 'Elaborar rúbrica de evaluación', actionPrompt: 'Elabora una rúbrica analítica de 4 niveles para la unidad actual', iconType: 'refine' },
            { label: 'Adaptación DUA para estudiantes', actionPrompt: '¿Qué adaptaciones DUA me sugieres para los estudiantes del curso?', iconType: 'dua' },
            { label: 'Diseñar mapa conceptual didáctico', actionPrompt: 'Genera un mapa conceptual interactivo sobre el tema en curso', iconType: 'refine' }
          ]
        }
      ]
    };

    setSessions([newSession, ...sessions]);
    setActiveSessionId(newId);
    toast.show('Nueva consulta iniciada con contexto del aula activa', 'info');
  };

  // Handle Delete Session
  const handleDeleteSession = (sessionId: string) => {
    const remaining = sessions.filter(s => s.id !== sessionId);
    setSessions(remaining);
    if (activeSessionId === sessionId && remaining.length > 0) {
      setActiveSessionId(remaining[0].id);
    }
  };

  // Handle Rename Session
  const handleRenameSession = (sessionId: string, newTitle: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, title: newTitle } : s));
  };

  // Handle Pin Session
  const handleTogglePinSession = (sessionId: string) => {
    setSessions(sessions.map(s => s.id === sessionId ? { ...s, isPinned: !s.isPinned } : s));
  };

  // Toggle Context File
  const handleToggleContextFile = (fileId: string) => {
    setAulaContexts(prev => {
      const current = prev[selectedAulaId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedAulaId]: {
          ...current,
          files: current.files.map(f => f.id === fileId ? { ...f, activeInContext: !f.activeInContext } : f)
        }
      };
    });
  };

  // Add custom file to context
  const handleAddCustomFileToContext = (file: any) => {
    setAulaContexts(prev => {
      const current = prev[selectedAulaId];
      if (!current) return prev;
      return {
        ...prev,
        [selectedAulaId]: {
          ...current,
          files: [file, ...current.files]
        }
      };
    });
  };

  // Handle File upload attachment
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE'
      });
      toast.show(`Archivo "${file.name}" adjunto al mensaje`, 'info');
    }
  };

  // Handle Drop file
  const handleDropFile = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setAttachedFile({
        name: file.name,
        size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        type: file.name.split('.').pop()?.toUpperCase() || 'FILE'
      });
      toast.show(`Archivo "${file.name}" adjunto al mensaje`, 'info');
    }
  };

  // Send Message
  const handleSendMessage = (textToSend?: string) => {
    const query = (textToSend || inputText).trim();
    if (!query && !attachedFile) return;

    const userMsg: CopilotoMessage = {
      id: `m-user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: 'Ahora',
      attachedFile: attachedFile || undefined
    };

    // Append to current session
    const updatedMessages = [...currentSession.messages, userMsg];
    const updatedSessions = sessions.map(s => 
      s.id === activeSessionId 
        ? { ...s, messages: updatedMessages, messagesCount: updatedMessages.length, updatedAt: 'Ahora' } 
        : s
    );
    setSessions(updatedSessions);
    setInputText('');
    setAttachedFile(null);
    setIsThinking(true);

    // Simulate AI intelligent pedagogical reasoning
    setTimeout(() => {
      setIsThinking(false);

      let aiResponseText = '';
      let generatedArtifact: any = undefined;
      let suggestedActions: any[] = [];

      const lowerQuery = query.toLowerCase();

      if (lowerQuery.includes('mapa') || lowerQuery.includes('red conceptual') || lowerQuery.includes('esquema')) {
        aiResponseText = `🧠 He diseñado un **Mapa Conceptual Interactivo** analizando la currícula de **${currentAulaContext.subject}** y los documentos de biblioteca activos.\n\nEstructuré 9 nodos jerárquicos conectando conceptos primarios, procesos y relaciones ecosistémicas/conceptuales. Puedes proyectarlo en pantalla completa o asignarlo a los estudiantes.`;
        generatedArtifact = {
          id: `res-map-${Date.now()}`,
          title: `Mapa Conceptual: ${currentAulaContext.subject} ${currentAulaContext.course}`,
          type: 'concept_map',
          previewSummary: 'Red conceptual con 9 nodos interactivos.'
        };
        suggestedActions = [
          { label: 'Explorar Mapa Conceptual', actionPrompt: 'Abrir mapa conceptual', iconType: 'refine' },
          { label: 'Asignar como Actividad al Aula', actionPrompt: 'Asignar mapa al aula', iconType: 'activity' }
        ];

        // Also update right canvas
        setCanvasDocument({
          title: `Mapa Conceptual: ${currentAulaContext.subject}`,
          type: 'concept_map',
          content: `# Mapa Conceptual: ${currentAulaContext.subject} ${currentAulaContext.course}\n\nEje Central: Estructura y Dinámica Curricular\n\n- Nodo 1: Fundamentos\n- Nodo 2: Desarrollo Metodológico\n- Nodo 3: Evaluación Formativa y DUA`
        });
      } else if (lowerQuery.includes('diapositiva') || lowerQuery.includes('presentacion') || lowerQuery.includes('slides') || lowerQuery.includes('pptx')) {
        aiResponseText = `📊 He generado una **Presentación de 5 Diapositivas** estructuradas pedagógicamente para tu próxima clase de **${currentAulaContext.subject}**.\n\nIncluye diapositivas introductorias, desarrollo conceptual, cuadros comparativos, notas para el docente y un taller práctico de producción.`;
        generatedArtifact = {
          id: `res-pres-${Date.now()}`,
          title: `Presentación Didáctica: ${currentAulaContext.subject}`,
          type: 'presentation',
          previewSummary: '5 diapositivas con notas docentes y diseño contrastado.'
        };
        suggestedActions = [
          { label: 'Proyectar Presentación', actionPrompt: 'Abrir visor de diapositivas', iconType: 'refine' },
          { label: 'Descargar PowerPoint (.PPTX)', actionPrompt: 'Descargar PPTX', iconType: 'export' }
        ];
      } else if (lowerQuery.includes('dua') || lowerQuery.includes('dislexia') || lowerQuery.includes('tdah')) {
        aiResponseText = `✨ He generado la **Guía Adaptada DUA** considerando a los estudiantes con perfil registrado en **${currentAulaContext.subject} ${currentAulaContext.course}** (Sofía Herrera / Ana Torres).\n\n- **Principio 1 (Representación):** Consignas desglosadas en pasos de 15 minutos, tipografía limpia y apoyo visual.\n- **Principio 2 (Acción y Expresión):** Opción de entrega en formato podcast (audio) o esquema gráfico.\n- **Principio 3 (Implicación):** Guía de autoevaluación con casillas de verificación.`;
        generatedArtifact = {
          id: `res-dua-${Date.now()}`,
          title: `Adaptación DUA: ${currentAulaContext.subject}`,
          type: 'document',
          previewSummary: 'Documento con consignas accesibles y pautas DUA.'
        };
        suggestedActions = [
          { label: 'Asignar como Tarea Accesible', actionPrompt: 'Asignar tarea DUA', iconType: 'activity' },
          { label: 'Exportar Guía en Word / PDF', actionPrompt: 'Descargar Word', iconType: 'export' }
        ];

        setCanvasDocument({
          title: `Adaptación DUA: ${currentAulaContext.subject}`,
          type: 'document',
          content: `# Adaptación Curricular DUA\n\n**Curso:** ${currentAulaContext.subject} ${currentAulaContext.course}\n**Destinatarios:** Sofía Herrera (Dislexia), Ana Torres (TDAH)\n\n---\n\n### 1. Consignas Paso a Paso\n1. Lee el primer párrafo del texto guía.\n2. Subraya con color azul la idea principal.\n3. Responde a la pregunta: *¿Qué cambio propone el autor?*\n\n### 2. Formato de Entrega Flexible\n- Audio de 2 minutos grabado en Foxy, o\n- Mapa conceptual visual en hoja membretada.`
        });
      } else {
        aiResponseText = `📋 He procesado tu solicitud tomando como base los **${activeFilesCount} archivos activos** de **${currentAulaContext.subject} ${currentAulaContext.course}**.\n\nHe elaborado la propuesta pedagógica completa en el editor lateral. Incluye fundamentación didáctica, objetivos de aprendizaje articulados con el diseño curricular provincial, consignas para los alumnos y la rúbrica formativa de 4 niveles.`;
        generatedArtifact = {
          id: `res-doc-${Date.now()}`,
          title: `Planificación y Evaluación: ${currentAulaContext.subject}`,
          type: 'rubric',
          previewSummary: 'Rúbrica analítica y consignas de trabajo formativo.'
        };
        suggestedActions = [
          { label: 'Asignar al Aula Virtual', actionPrompt: 'Asignar al aula', iconType: 'activity' },
          { label: 'Generar versión adaptada DUA', actionPrompt: 'Generar versión DUA', iconType: 'dua' },
          { label: 'Crear Presentación de Diapositivas', actionPrompt: 'Crear slides de este tema', iconType: 'refine' }
        ];

        setCanvasDocument({
          title: `Rúbrica y Consigna: ${currentAulaContext.subject}`,
          type: 'rubric',
          content: `# Rúbrica Analítica de Evaluación\n\n**Materia:** ${currentAulaContext.subject} ${currentAulaContext.course}\n**Ponderación:** 10 Puntos\n\n| Criterio | Nivel 4 (10-9 pts) | Nivel 3 (8-7 pts) | Nivel 2 (6-5 pts) | Nivel 1 (<5 pts) |\n| :--- | :--- | :--- | :--- | :--- |\n| **Comprensión Conceptual** | Domina con profundidad los conceptos clave de la unidad. | Comprensión clara con mínimas omisiones. | Nivel básico; confusiones menores. | No evidencia comprensión. |\n| **Análisis Crítico** | Articula ejemplos sólidos y argumentos fundamentados. | Argumentación adecuada descriptiva. | Argumentación superficial. | Respuestas inconexas. |\n| **Organización y Estilo** | Estructura impecable y vocabulario específico. | Redacción clara con escasos errores. | Redacción confusa. | Dificultad severa de comprensión. |`
        });
      }

      const aiMsg: CopilotoMessage = {
        id: `m-ai-${Date.now()}`,
        sender: 'ai',
        text: aiResponseText,
        timestamp: 'Ahora',
        agentType: currentSession.agentType,
        generatedArtifact,
        suggestedActions
      };

      const finalMessages = [...updatedMessages, aiMsg];
      setSessions(sessions.map(s => 
        s.id === activeSessionId 
          ? { ...s, messages: finalMessages, messagesCount: finalMessages.length, updatedAt: 'Ahora' } 
          : s
      ));
    }, 1000);
  };

  // Quick Action execution from recommendation
  const handleExecuteRecommendation = (rec: CopilotoRecommendation) => {
    setActiveTab('chat');
    if (rec.aulaId && aulaContexts[rec.aulaId]) {
      setSelectedAulaId(rec.aulaId);
    }
    handleSendMessage(rec.promptText);
    toast.show(`Ejecutando sugerencia: "${rec.title}"`, 'info');
  };

  // Launch Activity Assignment flow
  const handleOpenAssignModal = (artifactOrResource?: any) => {
    const title = artifactOrResource?.title || canvasDocument.title || 'Nueva Actividad de Foxy IA';
    const description = artifactOrResource?.previewSummary || 'Consigna y rúbrica formativa creada con Foxy IA.';
    setActivityAssignData({
      title,
      description,
      contentMarkdown: canvasDocument.content
    });
    setIsActivityAssignOpen(true);
  };

  return (
    <div className="h-full flex flex-col space-y-4 pb-6 select-text">
      {/* Top Header / Mode Switcher */}
      <div className="bg-fox-surface border border-fox-border rounded-3xl p-3 sm:p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        
        {/* Brand & Mode Tabs */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fox-primary to-orange-600 text-white flex items-center justify-center font-bold shadow-sm shadow-fox-primary/20 shrink-0">
            <BrainCircuit size={24} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-heading font-extrabold text-fox-text-main text-lg sm:text-xl">
                Foxy IA Copiloto
              </h2>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-fox-primary/10 text-fox-primary border border-fox-primary/20">
                PRO DOCENTE
              </span>
            </div>
            <p className="text-xs text-fox-text-muted hidden sm:block">
              Asistente pedagógico inteligente con contexto curricular, repositorio y asignación de aulas.
            </p>
          </div>
        </div>

        {/* Mode Navigation Tabs */}
        <div className="flex items-center gap-1.5 bg-fox-bg p-1 rounded-2xl border border-fox-border self-start md:self-auto overflow-x-auto w-full md:w-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'chat'
                ? 'bg-fox-surface text-fox-primary shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <BrainCircuit size={16} />
            <span>Chat Pedagógico</span>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'library'
                ? 'bg-fox-surface text-fox-primary shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <FolderOpen size={16} />
            <span>Biblioteca de Recursos</span>
            <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-full bg-fox-primary/15 text-fox-primary">
              {resources.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('recommendations')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'recommendations'
                ? 'bg-fox-surface text-fox-primary shadow-xs'
                : 'text-fox-text-muted hover:text-fox-text-main'
            }`}
          >
            <Sparkles size={16} />
            <span>Recomendaciones</span>
            <span className="w-2 h-2 rounded-full bg-fox-orange animate-ping" />
          </button>
        </div>
      </div>

      {/* VIEW 1: CHAT PEDAGOGICO */}
      {activeTab === 'chat' && (
        <div className="flex-1 flex flex-col lg:flex-row gap-4 min-h-0 overflow-hidden">
          
          {/* Main Chat Column */}
          <div className="flex-1 flex flex-col bg-fox-surface border border-fox-border rounded-3xl shadow-xs overflow-hidden min-h-[500px]">
            
            {/* Top Toolbar in Chat */}
            <div className="p-3.5 sm:p-4 border-b border-fox-border bg-fox-bg/70 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
              
              <div className="flex flex-wrap items-center gap-2">
                {/* History Trigger Button */}
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className="px-3 py-1.5 rounded-xl border border-fox-border hover:border-fox-primary/50 text-fox-text-main bg-fox-surface text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Ver historial de conversaciones"
                >
                  <History size={14} className="text-fox-primary" />
                  <span className="hidden sm:inline">Historial</span>
                  <span className="text-[10px] font-mono font-bold bg-fox-bg px-1.5 py-0.5 rounded-md text-fox-text-muted">
                    {sessions.length}
                  </span>
                </button>

                {/* Classroom Selector */}
                <div className="flex items-center gap-1 bg-fox-surface border border-fox-border rounded-xl px-2.5 py-1 text-xs">
                  <BookOpen size={13} className="text-fox-primary shrink-0" />
                  <select
                    value={selectedAulaId}
                    onChange={(e) => {
                      setSelectedAulaId(e.target.value);
                      toast.show(`Contexto cambiado a ${aulaContexts[e.target.value]?.subject || 'Aula'}`, 'info');
                    }}
                    className="bg-transparent font-bold text-fox-text-main outline-none text-xs cursor-pointer"
                  >
                    <option value="c1">Literatura 3°A</option>
                    <option value="c3">Matemáticas 3°B</option>
                    <option value="c4">Ciencias Naturales 2°A</option>
                  </select>
                </div>

                {/* Active Context Inspector Pill Button */}
                <button
                  onClick={() => setIsContextDrawerOpen(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-fox-purple/10 border border-fox-purple/20 hover:bg-fox-purple/20 text-fox-purple text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                  title="Ver archivos y currícula cargados como base de conocimiento"
                >
                  <Database size={13} />
                  <span className="hidden md:inline">Base de Conocimiento:</span>
                  <span>{activeFilesCount} archivos</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                </button>
              </div>

              {/* Right tools: Tone selector, new chat, toggle canvas */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleNewSession}
                  className="p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 transition-all flex items-center gap-1 shadow-2xs cursor-pointer"
                  title="Iniciar nueva consulta"
                >
                  <Plus size={14} />
                  <span className="hidden sm:inline">Nuevo Chat</span>
                </button>

                <button
                  onClick={() => setIsCanvasOpen(!isCanvasOpen)}
                  className={`p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl border border-fox-border text-xs font-bold transition-colors flex items-center gap-1 ${
                    isCanvasOpen ? 'bg-fox-primary/10 text-fox-primary' : 'bg-fox-surface text-fox-text-muted hover:text-fox-text-main'
                  }`}
                  title={isCanvasOpen ? 'Ocultar panel lateral' : 'Mostrar panel lateral'}
                >
                  <FileText size={14} />
                  <span className="hidden xl:inline">{isCanvasOpen ? 'Ocultar Canvas' : 'Ver Canvas'}</span>
                </button>
              </div>
            </div>

            {/* Chat Thread Messages */}
            <div 
              ref={chatScrollRef}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingFile(true); }}
              onDragLeave={() => setIsDraggingFile(false)}
              onDrop={handleDropFile}
              className={`flex-1 p-4 sm:p-6 overflow-y-auto space-y-5 relative transition-colors ${
                isDraggingFile ? 'bg-fox-primary/5 ring-2 ring-fox-primary ring-inset' : ''
              }`}
            >
              {/* Drag file overlay notice */}
              {isDraggingFile && (
                <div className="absolute inset-0 z-30 bg-fox-primary/10 backdrop-blur-xs flex items-center justify-center border-2 border-dashed border-fox-primary rounded-3xl m-4">
                  <div className="text-center p-4 bg-fox-surface rounded-2xl shadow-lg border border-fox-border">
                    <Paperclip size={32} className="mx-auto text-fox-primary mb-2 animate-bounce" />
                    <p className="font-bold text-fox-text-main text-sm">Suelta tu archivo aquí para adjuntarlo</p>
                    <p className="text-xs text-fox-text-muted">PDF, Word, PPTX o Imagen</p>
                  </div>
                </div>
              )}

              {currentSession.messages.map((msg) => {
                const isAI = msg.sender === 'ai';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex gap-3 ${isAI ? 'justify-start' : 'justify-end'}`}
                  >
                    {isAI && (
                      <div className="w-9 h-9 rounded-2xl bg-gradient-to-br from-fox-primary to-orange-600 text-white flex items-center justify-center shrink-0 shadow-xs font-bold text-xs">
                        <BrainCircuit size={18} />
                      </div>
                    )}

                    <div className={`max-w-[85%] sm:max-w-[78%] space-y-2.5 ${isAI ? 'items-start' : 'items-end'}`}>
                      
                      {/* Attached File Chip if present */}
                      {msg.attachedFile && (
                        <div className="bg-fox-bg border border-fox-border rounded-xl p-2.5 flex items-center gap-2 text-xs shadow-2xs w-fit">
                          <Paperclip size={14} className="text-fox-primary" />
                          <span className="font-bold text-fox-text-main">{msg.attachedFile.name}</span>
                          <span className="text-[10px] text-fox-text-muted">({msg.attachedFile.size})</span>
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`p-4 sm:p-5 rounded-3xl text-xs sm:text-sm leading-relaxed shadow-xs ${
                        isAI 
                          ? 'bg-fox-bg/90 border border-fox-border text-fox-text-main rounded-tl-sm' 
                          : 'bg-fox-primary text-white rounded-tr-sm'
                      }`}>
                        <div className="whitespace-pre-wrap font-sans">
                          {msg.text}
                        </div>

                        <div className={`text-[10px] mt-2 pt-1 border-t flex items-center justify-between ${
                          isAI ? 'border-fox-border/60 text-fox-text-muted' : 'border-white/20 text-white/80'
                        }`}>
                          <span>{msg.timestamp}</span>
                          {isAI && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(msg.text);
                                  toast.show('Texto copiado al portapapeles', 'info');
                                }}
                                className="p-1 hover:text-fox-primary rounded"
                                title="Copiar"
                              >
                                <Copy size={12} />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Generated Artifact Card inside AI Message */}
                      {isAI && msg.generatedArtifact && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.98 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-fox-surface border-2 border-fox-primary/30 rounded-2xl p-4 shadow-sm space-y-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <div className="p-2 rounded-xl bg-fox-primary/10 text-fox-primary">
                                {msg.generatedArtifact.type === 'concept_map' ? <Network size={16} /> :
                                 msg.generatedArtifact.type === 'presentation' ? <Presentation size={16} /> :
                                 <FileText size={16} />}
                              </div>
                              <div>
                                <span className="text-[10px] font-black uppercase tracking-wider text-fox-primary block">
                                  Recurso Generado
                                </span>
                                <h4 className="font-heading font-bold text-xs sm:text-sm text-fox-text-main">
                                  {msg.generatedArtifact.title}
                                </h4>
                              </div>
                            </div>

                            <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-fox-bg border border-fox-border text-fox-text-muted">
                              {msg.generatedArtifact.type}
                            </span>
                          </div>

                          {msg.generatedArtifact.previewSummary && (
                            <p className="text-xs text-fox-text-muted leading-relaxed">
                              {msg.generatedArtifact.previewSummary}
                            </p>
                          )}

                          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-fox-border/60">
                            {msg.generatedArtifact.type === 'concept_map' ? (
                              <button
                                onClick={() => setActiveConceptMapModal(INITIAL_RESOURCES.find(r => r.type === 'concept_map') || INITIAL_RESOURCES[2])}
                                className="px-3 py-1.5 rounded-xl bg-fox-purple text-white text-xs font-bold hover:bg-fox-purple/90 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Network size={13} />
                                <span>Ver Mapa Conceptual</span>
                              </button>
                            ) : msg.generatedArtifact.type === 'presentation' ? (
                              <button
                                onClick={() => setActivePresentationModal(INITIAL_RESOURCES.find(r => r.type === 'presentation') || INITIAL_RESOURCES[1])}
                                className="px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-bold hover:bg-amber-600 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <Presentation size={13} />
                                <span>Proyectar Presentación</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setIsCanvasOpen(true);
                                  toast.show('Documento cargado en el editor lateral', 'info');
                                }}
                                className="px-3 py-1.5 rounded-xl bg-fox-primary text-white text-xs font-bold hover:bg-fox-primary/90 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                              >
                                <FileText size={13} />
                                <span>Abrir en Editor</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenAssignModal(msg.generatedArtifact)}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                              <Send size={13} />
                              <span>Asignar al Aula</span>
                            </button>
                          </div>
                        </motion.div>
                      )}

                      {/* Suggested Action Chips below AI Message */}
                      {isAI && msg.suggestedActions && msg.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {msg.suggestedActions.map((action, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                if (action.actionPrompt.toLowerCase().includes('asignar')) {
                                  handleOpenAssignModal(msg.generatedArtifact);
                                } else if (action.actionPrompt.toLowerCase().includes('mapa')) {
                                  setActiveConceptMapModal(INITIAL_RESOURCES[2]);
                                } else if (action.actionPrompt.toLowerCase().includes('presentación') || action.actionPrompt.toLowerCase().includes('slides')) {
                                  setActivePresentationModal(INITIAL_RESOURCES[1]);
                                } else {
                                  handleSendMessage(action.actionPrompt);
                                }
                              }}
                              className="px-3 py-1.5 rounded-xl bg-fox-surface border border-fox-border hover:border-fox-primary/50 text-fox-text-main hover:text-fox-primary text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer group"
                            >
                              <Sparkles size={12} className="text-fox-primary group-hover:scale-110 transition-transform" />
                              <span>{action.label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                    </div>
                  </motion.div>
                );
              })}

              {/* Thinking Indicator */}
              {isThinking && (
                <div className="flex gap-3 justify-start items-center">
                  <div className="w-9 h-9 rounded-2xl bg-fox-primary/10 text-fox-primary flex items-center justify-center animate-pulse shrink-0">
                    <BrainCircuit size={18} />
                  </div>
                  <div className="bg-fox-bg border border-fox-border rounded-2xl px-4 py-3 text-xs text-fox-text-muted flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-fox-primary animate-bounce" />
                    <div className="w-2 h-2 rounded-full bg-fox-orange animate-bounce [animation-delay:0.2s]" />
                    <div className="w-2 h-2 rounded-full bg-fox-purple animate-bounce [animation-delay:0.4s]" />
                    <span className="font-medium ml-1">Foxy está consultando los documentos del aula y articulando la respuesta...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input Area */}
            <div className="p-3.5 sm:p-4 border-t border-fox-border bg-fox-bg/60 space-y-2.5 shrink-0">
              
              {/* Voice Recorder Animated Widget */}
              <CopilotoVoiceRecorder
                isRecording={isRecordingVoice}
                onStopRecording={(transcript) => {
                  setIsRecordingVoice(false);
                  setInputText(prev => (prev ? `${prev} ${transcript}` : transcript));
                  toast.show('Audio transcrito en el campo de consulta', 'success');
                }}
                onCancelRecording={() => setIsRecordingVoice(false)}
              />

              {/* Attached file indicator in input */}
              {attachedFile && (
                <div className="flex items-center justify-between bg-fox-surface border border-fox-border rounded-xl p-2 px-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Paperclip size={14} className="text-fox-primary" />
                    <span className="font-bold text-fox-text-main">{attachedFile.name}</span>
                    <span className="text-[10px] text-fox-text-muted">({attachedFile.size})</span>
                  </div>
                  <button
                    onClick={() => setAttachedFile(null)}
                    className="text-fox-text-muted hover:text-rose-600 p-0.5"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Slash commands helper row */}
              <div className="flex items-center gap-1.5 overflow-x-auto hide-scrollbar text-[11px]">
                <span className="text-fox-text-muted font-bold text-[10px] uppercase">Comandos rápidos:</span>
                {SLASH_COMMANDS.map((sc, i) => (
                  <button
                    key={i}
                    onClick={() => setInputText(prev => `${sc.cmd} ${prev}`)}
                    className="px-2 py-0.5 rounded-lg bg-fox-surface border border-fox-border hover:border-fox-primary/40 text-fox-text-muted hover:text-fox-primary font-mono font-bold whitespace-nowrap transition-colors"
                  >
                    {sc.cmd}
                  </button>
                ))}
              </div>

              {/* Input Box with Buttons */}
              <div className="bg-fox-surface border border-fox-border focus-within:border-fox-primary rounded-2xl p-2 flex items-end gap-2 shadow-sm transition-all">
                <textarea
                  rows={2}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder={`Pregunta a Foxy IA sobre ${currentAulaContext?.subject} ${currentAulaContext?.course}... (Enter para enviar)`}
                  className="flex-1 bg-transparent p-2 text-xs sm:text-sm text-fox-text-main outline-none resize-none placeholder:text-fox-text-muted/60 max-h-32"
                />

                <div className="flex items-center gap-1 shrink-0 pb-1">
                  {/* File Upload Hidden Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={handleFileSelect}
                  />

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 rounded-xl text-fox-text-muted hover:text-fox-primary hover:bg-fox-bg transition-colors cursor-pointer"
                    title="Adjuntar archivo (PDF, Word, Imagen)"
                  >
                    <Paperclip size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsRecordingVoice(!isRecordingVoice)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      isRecordingVoice ? 'bg-rose-500 text-white animate-pulse' : 'text-fox-text-muted hover:text-rose-500 hover:bg-fox-bg'
                    }`}
                    title="Comunicación por micrófono"
                  >
                    <Mic size={18} />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSendMessage()}
                    disabled={!inputText.trim() && !attachedFile}
                    className="p-2.5 rounded-xl bg-fox-primary hover:bg-fox-primary/90 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                    title="Enviar consulta"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-fox-text-muted px-1">
                <span>Shift + Enter para salto de línea</span>
                <span className="flex items-center gap-1">
                  <Database size={11} className="text-emerald-500" />
                  <span>Base de datos contextual activa: <strong>{currentAulaContext.subject} {currentAulaContext.course}</strong></span>
                </span>
              </div>
            </div>

          </div>

          {/* Right Side Canvas Document Editor Panel */}
          {isCanvasOpen && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              className="w-full lg:w-[420px] xl:w-[480px] bg-fox-surface border border-fox-border rounded-3xl shadow-xs flex flex-col overflow-hidden shrink-0 min-h-[500px]"
            >
              {/* Canvas Header */}
              <div className="p-4 border-b border-fox-border bg-fox-bg/70 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="p-2 rounded-xl bg-fox-primary/10 text-fox-primary font-bold">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-heading font-extrabold text-fox-text-main text-xs sm:text-sm truncate">
                      {canvasDocument.title}
                    </h3>
                    <p className="text-[11px] text-fox-text-muted truncate">
                      Editor y Producción de Documentos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(canvasDocument.content);
                      toast.show('Contenido copiado al portapapeles', 'info');
                    }}
                    className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg"
                    title="Copiar texto"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    onClick={() => toast.show(`Exportando "${canvasDocument.title}.pdf"...`, 'success')}
                    className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg"
                    title="Descargar PDF"
                  >
                    <Download size={15} />
                  </button>
                  <button
                    onClick={() => setIsCanvasOpen(false)}
                    className="p-1.5 text-fox-text-muted hover:text-fox-text-main rounded-lg hover:bg-fox-bg lg:hidden"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Canvas Document Content (Editable textarea) */}
              <div className="flex-1 p-4 overflow-y-auto bg-fox-surface">
                <textarea
                  value={canvasDocument.content}
                  onChange={(e) => setCanvasDocument({ ...canvasDocument, content: e.target.value })}
                  className="w-full h-full min-h-[380px] bg-fox-bg/50 border border-fox-border/60 rounded-2xl p-4 text-xs font-mono text-fox-text-main outline-none focus:border-fox-primary leading-relaxed resize-none"
                  placeholder="Aquí aparecerán las producciones completas de Foxy IA para editar y asignar..."
                />
              </div>

              {/* Canvas Footer Actions */}
              <div className="p-4 border-t border-fox-border bg-fox-bg/70 shrink-0 space-y-2">
                <button
                  onClick={() => handleOpenAssignModal()}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send size={15} />
                  <span>Asignar como Actividad al Aula</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      const newResource: CopilotoResource = {
                        id: `res-saved-${Date.now()}`,
                        title: canvasDocument.title,
                        type: 'document',
                        categoryLabel: 'Documentos',
                        aulaId: selectedAulaId,
                        aulaName: `${currentAulaContext.subject} ${currentAulaContext.course}`,
                        createdAt: 'Hoy',
                        description: 'Documento editado y guardado desde el Canvas de Foxy.',
                        tags: ['Personalizado', currentAulaContext.subject],
                        fileFormat: 'DOCX',
                        fileSize: '650 KB',
                        contentMarkdown: canvasDocument.content
                      };
                      setResources([newResource, ...resources]);
                      toast.show('Guardado en la Biblioteca de Recursos', 'success');
                    }}
                    className="flex-1 py-2 rounded-xl border border-fox-border hover:bg-fox-bg text-xs font-bold text-fox-text-main transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Save size={14} /> Guardar en Biblioteca
                  </button>

                  <button
                    onClick={() => {
                      handleSendMessage('Por favor adapta este documento para estudiantes con dificultades lectoras');
                    }}
                    className="px-3 py-2 rounded-xl bg-fox-purple/10 text-fox-purple hover:bg-fox-purple/20 text-xs font-bold transition-colors flex items-center gap-1"
                    title="Adaptar con DUA"
                  >
                    <Sparkles size={14} /> DUA
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      )}

      {/* VIEW 2: BIBLIOTECA DE RECURSOS */}
      {activeTab === 'library' && (
        <div className="flex-1 overflow-y-auto">
          <CopilotoResourceLibrary
            resources={resources}
            onOpenResourceInEditor={(res) => {
              setCanvasDocument({
                title: res.title,
                type: res.type,
                content: res.contentMarkdown || res.description
              });
              setActiveTab('chat');
              setIsCanvasOpen(true);
              toast.show(`"${res.title}" abierto en el editor`, 'info');
            }}
            onAssignResourceToAula={(res) => handleOpenAssignModal(res)}
          />
        </div>
      )}

      {/* VIEW 3: RECOMENDACIONES INTELIGENTES */}
      {activeTab === 'recommendations' && (
        <div className="flex-1 overflow-y-auto">
          <CopilotoRecommendationsPanel
            recommendations={recommendations}
            onExecuteRecommendation={handleExecuteRecommendation}
            selectedAulaName={`${currentAulaContext.subject} ${currentAulaContext.course}`}
          />
        </div>
      )}

      {/* MODAL / DRAWER: HISTORIAL */}
      <CopilotoHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        sessions={sessions}
        activeSessionId={activeSessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        onDeleteSession={handleDeleteSession}
        onRenameSession={handleRenameSession}
        onTogglePinSession={handleTogglePinSession}
      />

      {/* MODAL / DRAWER: CONTEXT INSPECTOR */}
      <CopilotoContextDrawer
        isOpen={isContextDrawerOpen}
        onClose={() => setIsContextDrawerOpen(false)}
        contextData={currentAulaContext}
        onToggleFile={handleToggleContextFile}
        onAddCustomFile={handleAddCustomFileToContext}
      />

      {/* MODAL: ACTIVITY ASSIGN FLOW */}
      {isActivityAssignOpen && (
        <CopilotoActivityAssignModal
          isOpen={isActivityAssignOpen}
          onClose={() => setIsActivityAssignOpen(false)}
          initialTitle={activityAssignData?.title}
          initialDescription={activityAssignData?.description}
          initialAulaId={selectedAulaId}
          initialContentMarkdown={activityAssignData?.contentMarkdown}
          onSuccessAssigned={(title, aula) => {
            // Also register in current session if desired
          }}
        />
      )}

      {/* MODAL: CONCEPT MAP VISUALIZER */}
      {activeConceptMapModal && activeConceptMapModal.conceptMapData && (
        <CopilotoConceptMapModal
          isOpen={!!activeConceptMapModal}
          onClose={() => setActiveConceptMapModal(null)}
          title={activeConceptMapModal.title}
          centralTopic={activeConceptMapModal.conceptMapData.centralTopic}
          nodes={activeConceptMapModal.conceptMapData.nodes}
          onAssignToAula={() => {
            const res = activeConceptMapModal;
            setActiveConceptMapModal(null);
            handleOpenAssignModal(res);
          }}
        />
      )}

      {/* MODAL: PRESENTATION SLIDES VIEWER */}
      {activePresentationModal && activePresentationModal.slidesData && (
        <CopilotoPresentationModal
          isOpen={!!activePresentationModal}
          onClose={() => setActivePresentationModal(null)}
          title={activePresentationModal.title}
          slides={activePresentationModal.slidesData}
          onAssignToAula={() => {
            const res = activePresentationModal;
            setActivePresentationModal(null);
            handleOpenAssignModal(res);
          }}
        />
      )}

    </div>
  );
}
